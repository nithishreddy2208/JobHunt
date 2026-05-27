import { Job } from '../models/job.model.js';
import { ReadModels } from '../db/index.js';
import { llmService } from './llm.service.js';
import { cosineSimilarity } from '../utils/cosine.js';


const safeJsonParse = (text) => {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {}
    }
    return null;
  }
};

export class AiService {
  async searchJobsByEmbedding(queryEmbedding, { topK = 10, minScore } = {}) {
    if (!Array.isArray(queryEmbedding) || queryEmbedding.length === 0) return [];

    // Cosine threshold below which a match is considered too weak to surface.
    // MiniLM-L6-v2 + short queries against longer job docs typically yield 0.35-0.55
    // for genuine matches and 0.0-0.2 for unrelated. 0.3 is the sweet spot that filters
    // nonsense queries while keeping legitimate matches. Tune via AI_SEARCH_MIN_SCORE.
    const envFloor = Number(process.env.AI_SEARCH_MIN_SCORE);
    const threshold = Number.isFinite(minScore)
      ? minScore
      : (Number.isFinite(envFloor) ? envFloor : 0.3);

    // Embedding scan is the heaviest read in the system. Route to the
    // read replica so it never contends with primary write load.
    const docs = await ReadModels.Job.find(
      { embedding: { $type: 'array' } },
      { embedding: 1, title: 1, description: 1, location: 1, jobType: 1, company: 1 }
    ).populate('company').lean();

    return docs
      .map((j) => ({ ...j, score: cosineSimilarity(queryEmbedding, j.embedding) }))
      .filter((j) => Number.isFinite(j.score) && j.score >= threshold)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }

  async generateWithLlm({ system, user, fallback, parseJson = true, numPredict, temperature, timeoutMs, format }) {
    const prompt = [system ? `SYSTEM:\n${system}` : '', `USER:\n${user}`]
      .filter(Boolean)
      .join('\n\n');

    const res = await llmService.generateResponse(prompt, { numPredict, temperature, timeoutMs, format });
    if (!res?.success) {
      return {
        ok: false,
        value: fallback,
        error: res
      };
    }

    const text = res.text || '';

    if (!parseJson) {
      return {
        ok: true,
        value: text,
        error: null,
        provider: res.provider
      };
    }

    return {
      ok: true,
      value: this.parseLLM(text),
      error: null,
      provider: res.provider
    };
  }

  parseLLM(text) {
    return safeJsonParse(text) || { raw: text };
  }
}

export const aiService = new AiService();