const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Default fallback chain of free models, tried in priority order. Each is
// attempted only if the previous one is rate limited / unavailable. The final
// `openrouter/auto` lets OpenRouter pick any available model as a last resort.
const DEFAULT_MODELS = [
  'moonshotai/kimi-k2.6:free',
  'deepseek/deepseek-chat-v3:free',
  'qwen/qwen3-32b:free',
  'openrouter/auto'
];

// HTTP statuses that mean "this model is busy/unavailable — try the next one"
// rather than "the request itself is bad".
const FAILOVER_STATUSES = new Set([408, 429, 500, 502, 503, 504]);

/**
 * Resolve the ordered model list:
 *  - OPEN_ROUTER_MODELS: comma-separated explicit chain (highest precedence)
 *  - OPEN_ROUTER_MODEL_NAME: single legacy model, prepended to the defaults
 *  - otherwise the built-in DEFAULT_MODELS chain
 * Duplicates are removed while preserving order.
 */
const resolveModels = () => {
  const fromList = (process.env.OPEN_ROUTER_MODELS || '')
    .split(',')
    .map((m) => m.trim())
    .filter(Boolean);

  if (fromList.length > 0) return [...new Set(fromList)];

  const legacy = (process.env.OPEN_ROUTER_MODEL_NAME || '').trim();
  const chain = legacy ? [legacy, ...DEFAULT_MODELS] : DEFAULT_MODELS;
  return [...new Set(chain)];
};

/**
 * OpenRouter LLM client with automatic multi-model failover.
 *
 * API-compatible with callers in llm.service.js:
 *   generateJson({ system, user }) -> { ok, data: { text, model } | { message, error } }
 *
 * On a rate-limit / unavailable response it transparently advances to the next
 * model in the chain and logs the switch.
 */
export class OpenRouterService {
  constructor() {
    this.enabled = null;
  }

  isEnabled() {
    if (this.enabled !== null) return this.enabled;
    this.enabled = Boolean(process.env.OPEN_ROUTER_API_KEY);
    return this.enabled;
  }

  async generateJson({ system, user, format }) {
    const apiKey = process.env.OPEN_ROUTER_API_KEY;
    if (!apiKey) {
      return { ok: false, data: { message: 'OpenRouter disabled (no OPEN_ROUTER_API_KEY)' } };
    }

    const mergedUserContent = [
      system ? `SYSTEM:\n${system}` : '',
      `USER:\n${user}`
    ].filter(Boolean).join('\n\n');

    const models = resolveModels();
    const errors = [];

    for (let i = 0; i < models.length; i++) {
      const model = models[i];
      console.log(`[AI] Trying ${model}`);

      const result = await this.callModel({ apiKey, model, content: mergedUserContent, format });

      if (result.ok) {
        console.log(`[AI] Success (${model})`);
        return { ok: true, data: { text: result.text, model } };
      }

      errors.push(`${model}: ${result.error}`);

      const hasNext = i < models.length - 1;
      if (result.failover && hasNext) {
        console.log(`[AI] Rate limited / unavailable on ${model}, switching...`);
        continue;
      }

      if (!result.failover) {
        // Non-retryable error (bad request, auth, etc.) — switching models
        // won't help, so stop early.
        console.log(`[AI] Non-retryable error on ${model}: ${result.error}`);
        break;
      }
    }

    return {
      ok: false,
      data: {
        message: 'All OpenRouter models failed',
        error: errors.join(' | ')
      }
    };
  }

  /**
   * Single model call with one retry on transient network failure.
   * Returns { ok, text } or { ok:false, failover, error }.
   *  - failover=true  -> caller should try the next model
   *  - failover=false -> non-retryable (e.g. 400/401), stop the chain
   */
  async callModel({ apiKey, model, content, format, _retried = false }) {
    const body = {
      model,
      messages: [{ role: 'user', content }]
    };
    if (format === 'json') {
      body.response_format = { type: 'json_object' };
    }

    try {
      const res = await fetch(OPENROUTER_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          'HTTP-Referer': process.env.OPEN_ROUTER_REFERER || 'http://localhost',
          'X-Title': process.env.OPEN_ROUTER_APP_TITLE || 'JobHunt'
        },
        body: JSON.stringify(body)
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        const failover = FAILOVER_STATUSES.has(res.status);
        return { ok: false, failover, error: `HTTP ${res.status}: ${errText.slice(0, 200)}` };
      }

      const json = await res.json();
      const text = json?.choices?.[0]?.message?.content || '';
      if (!text) {
        // Empty completion — treat as a model hiccup and allow failover.
        return { ok: false, failover: true, error: 'empty response' };
      }
      return { ok: true, text };
    } catch (err) {
      // Network/abort error: retry once on the same model, then failover.
      if (!_retried) {
        await sleep(250);
        return this.callModel({ apiKey, model, content, format, _retried: true });
      }
      return { ok: false, failover: true, error: err?.message || String(err) };
    }
  }
}

export const openRouterService = new OpenRouterService();
