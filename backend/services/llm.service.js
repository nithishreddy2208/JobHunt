import { geminiService } from './gemini.service.js';

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3';
const TIMEOUT_MS = Number(process.env.LLM_TIMEOUT_MS) || 30000;

const withTimeout = async (promise, ms) => {
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error('LLM request timed out')), ms);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timeoutId);
  }
};

const tryOllama = async (prompt) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt,
        stream: false
      }),
      signal: controller.signal
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`Ollama failed: ${res.status} ${errText}`);
    }

    const json = await res.json();
    const text = json?.response;
    if (!text) throw new Error('Ollama returned empty response');

    return text;
  } catch (err) {
    if (err?.name === 'AbortError') {
      throw new Error(`Ollama request aborted (timeout after ${TIMEOUT_MS}ms). Increase LLM_TIMEOUT_MS.`);
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
};

export class LlmService {
  async generateResponse(prompt) {
    const p = String(prompt || '').trim();
    if (!p) {
      return { success: false, message: 'AI service unavailable' };
    }

    let ollamaError = null;
    let geminiError = null;

    try {
      console.log('Using Ollama');
      const text = await tryOllama(p);
      return { success: true, provider: 'ollama', text };
    } catch (err) {
      ollamaError = err?.message || String(err);
      const hasGeminiKey = Boolean(process.env.GEMINI_API_KEY);

      if (!hasGeminiKey) {
        console.log('Using fallback');
        return {
          success: false,
          message: 'AI service unavailable',
          details: { ollamaError }
        };
      }

      try {
        console.log('Using Gemini');
        const res = await withTimeout(geminiService.generateJson({ system: '', user: p }), TIMEOUT_MS);
        if (!res?.ok) {
          throw new Error(res?.data?.error || res?.data?.message || 'Gemini request failed');
        }

        const text = res?.data?.text || '';
        if (!text) throw new Error('Gemini returned empty response');

        return { success: true, provider: 'gemini', text };
      } catch (err2) {
        geminiError = err2?.message || String(err2);
        console.log('Using fallback');
        return {
          success: false,
          message: 'AI service unavailable',
          details: { ollamaError, geminiError }
        };
      }
    }
  }
}

export const llmService = new LlmService();
