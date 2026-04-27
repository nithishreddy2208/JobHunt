import { Job } from '../models/job.model.js';
import { llmService } from './llm.service.js';

const cosineSimilarity = (a, b) => {
  if (!Array.isArray(a) || !Array.isArray(b)) return 0;
  if (a.length === 0 || b.length === 0) return 0;
  if (a.length !== b.length) return 0;

  let dot = 0;
  let na = 0;
  let nb = 0;

  for (let i = 0; i < a.length; i++) {
    const x = Number(a[i]);
    const y = Number(b[i]);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return 0;
    dot += x * y;
    na += x * x;
    nb += y * y;
  }

  const denom = Math.sqrt(na) * Math.sqrt(nb);
  if (!denom) return 0;
  return dot / denom;
};

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
  async searchJobsByEmbedding(queryEmbedding, { topK = 10 } = {}) {
    if (!Array.isArray(queryEmbedding) || queryEmbedding.length === 0) return [];

    const docs = await Job.find(
      { embedding: { $type: 'array' } },
      { embedding: 1, title: 1, description: 1, location: 1, jobType: 1, company: 1 }
    ).populate('company').lean();

    return docs
      .map((j) => ({ ...j, score: cosineSimilarity(queryEmbedding, j.embedding) }))
      .filter((j) => Number.isFinite(j.score) && j.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }

  async generateWithLlm({ system, user, fallback, parseJson = true }) {
    const prompt = [system ? `SYSTEM:\n${system}` : '', `USER:\n${user}`]
      .filter(Boolean)
      .join('\n\n');

    const res = await llmService.generateResponse(prompt);
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