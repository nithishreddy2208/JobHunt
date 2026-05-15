import { openRouterService } from './openrouter.service.js';

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'phi';
const TIMEOUT_MS = Number(process.env.LLM_TIMEOUT_MS) || 200000;
const NUM_PREDICT = Number(process.env.OLLAMA_NUM_PREDICT) || 100;
const TEMPERATURE = Number.isFinite(Number(process.env.OLLAMA_TEMPERATURE))
  ? Number(process.env.OLLAMA_TEMPERATURE)
  : 0.4;

const buildOllamaBody = (prompt, { stream = false, numPredict, temperature, format } = {}) => {
  const body = {
    model: OLLAMA_MODEL,
    prompt,
    stream,
    options: {
      num_predict: Number.isFinite(numPredict) ? numPredict : NUM_PREDICT,
      temperature: Number.isFinite(temperature) ? temperature : TEMPERATURE
    }
  };
  if (format) body.format = format;
  return body;
};

const normalizeOllamaError = (err, timeoutMs) => {
  if (err?.name === 'AbortError') {
    return new Error(`Ollama timeout after ${timeoutMs}ms`);
  }
  const msg = err?.message || String(err);
  if (err?.cause?.code === 'ECONNREFUSED' || /ECONNREFUSED/i.test(msg)) {
    return new Error('Ollama not running (connection refused)');
  }
  return err instanceof Error ? err : new Error(msg);
};

const callOllamaNonStream = async (prompt, { timeoutMs = TIMEOUT_MS, numPredict, temperature, format } = {}) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildOllamaBody(prompt, { stream: false, numPredict, temperature, format })),
      signal: controller.signal
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`Ollama HTTP ${res.status}: ${errText}`);
    }

    const json = await res.json();
    const text = json?.response;
    if (!text) throw new Error('Ollama returned empty response');
    return text;
  } catch (err) {
    throw normalizeOllamaError(err, timeoutMs);
  } finally {
    clearTimeout(timer);
  }
};

const callOllamaStream = async (prompt, onToken, { timeoutMs = TIMEOUT_MS, numPredict, temperature, format } = {}) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildOllamaBody(prompt, { stream: true, numPredict, temperature, format })),
      signal: controller.signal
    });

    if (!res.ok || !res.body) {
      const errText = await res.text().catch(() => '');
      throw new Error(`Ollama HTTP ${res.status}: ${errText}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffered = '';
    let full = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffered += decoder.decode(value, { stream: true });
      const lines = buffered.split('\n');
      buffered = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          const evt = JSON.parse(trimmed);
          if (evt?.response) {
            full += evt.response;
            if (typeof onToken === 'function') onToken(evt.response);
          }
          if (evt?.done) {
            return full;
          }
        } catch {
          // ignore malformed JSON line in stream
        }
      }
    }

    if (!full) throw new Error('Ollama stream returned empty response');
    return full;
  } catch (err) {
    throw normalizeOllamaError(err, timeoutMs);
  } finally {
    clearTimeout(timer);
  }
};

export class LlmService {
  constructor() {
    this.warmedUp = false;
  }

  async warmup() {
    const start = Date.now();
    try {
      await callOllamaNonStream('ping', { timeoutMs: 30000 });
      this.warmedUp = true;
      console.log(`[llm] warmup ok model=${OLLAMA_MODEL} ms=${Date.now() - start}`);
    } catch (err) {
      console.log(`[llm] warmup failed model=${OLLAMA_MODEL} ms=${Date.now() - start} err=${err?.message || err}`);
    }
  }

  async generateResponse(prompt, { stream = false, onToken, numPredict, temperature, timeoutMs, format } = {}) {
    const p = String(prompt || '').trim();
    if (!p) {
      return { success: false, message: 'AI response unavailable' };
    }

    const opts = { numPredict, temperature, timeoutMs, format };
    let openRouterError = null;
    let ollamaError = null;

    // -------- 1) Primary: OpenRouter --------
    if (process.env.OPEN_ROUTER_API_KEY) {
      const orStart = Date.now();
      try {
        const res = await openRouterService.generateJson({ system: '', user: p });
        if (!res?.ok) throw new Error(res?.data?.error || res?.data?.message || 'OpenRouter request failed');
        const text = res?.data?.text || '';
        if (!text) throw new Error('OpenRouter returned empty response');

        // OpenRouter call is non-streaming here; if caller asked for stream,
        // emit the full text once so downstream code that consumes onToken still works.
        if (stream && typeof onToken === 'function') onToken(text);

        console.log(`[llm] provider=openrouter ms=${Date.now() - orStart} ok=true`);
        return { success: true, provider: 'openrouter', text };
      } catch (err) {
        openRouterError = err?.message || String(err);
        console.log(`[llm] provider=openrouter ms=${Date.now() - orStart} ok=false err=${openRouterError}`);
      }
    } else {
      openRouterError = 'OPEN_ROUTER_API_KEY not set';
    }

    // -------- 2) Fallback: Ollama --------
    const ollamaStart = Date.now();
    try {
      const text = stream
        ? await callOllamaStream(p, onToken, opts)
        : await callOllamaNonStream(p, opts);

      console.log(`[llm] provider=ollama model=${OLLAMA_MODEL} ms=${Date.now() - ollamaStart} ok=true`);
      return { success: true, provider: 'ollama', model: OLLAMA_MODEL, text };
    } catch (err) {
      ollamaError = err?.message || String(err);
      console.log(`[llm] provider=ollama model=${OLLAMA_MODEL} ms=${Date.now() - ollamaStart} ok=false err=${ollamaError}`);

      // If streaming attempt failed mid-flight, retry without streaming once.
      if (stream) {
        try {
          const text = await callOllamaNonStream(p, opts);
          if (typeof onToken === 'function') onToken(text);
          console.log(`[llm] provider=ollama-nonstream-fallback model=${OLLAMA_MODEL} ms=${Date.now() - ollamaStart} ok=true`);
          return { success: true, provider: 'ollama', model: OLLAMA_MODEL, text };
        } catch (err2) {
          ollamaError = err2?.message || String(err2);
        }
      }
    }

    return {
      success: false,
      message: 'AI response unavailable',
      details: { openRouterError, ollamaError }
    };
  }
}

export const llmService = new LlmService();
