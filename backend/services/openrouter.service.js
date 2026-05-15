const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_MODEL = process.env.OPEN_ROUTER_MODEL_NAME || 'openrouter/auto';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * OpenRouter LLM client.
 *
 * Kept API-compatible with the previous GeminiService:
 *   generateJson({ system, user }) -> { ok, data: { text } | { message, error } }
 *
 * Same single-attempt + one retry pattern as Gemini, same prompt shaping
 * (SYSTEM/USER blocks concatenated), so callers in llm.service.js behave
 * identically.
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

  async generateJson({ system, user }) {
    const apiKey = process.env.OPEN_ROUTER_API_KEY;
    if (!apiKey) {
      return { ok: false, data: { message: 'OpenRouter disabled (no OPEN_ROUTER_API_KEY)' } };
    }

    // Same prompt shape Gemini used, preserved for behavior parity.
    const mergedUserContent = [
      system ? `SYSTEM:\n${system}` : '',
      `USER:\n${user}`
    ].filter(Boolean).join('\n\n');

    const body = {
      model: OPENROUTER_MODEL,
      messages: [{ role: 'user', content: mergedUserContent }]
    };

    const attempt = async () => {
      const res = await fetch(OPENROUTER_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          // Optional but recommended by OpenRouter for attribution/ranking.
          'HTTP-Referer': process.env.OPEN_ROUTER_REFERER || 'http://localhost',
          'X-Title': process.env.OPEN_ROUTER_APP_TITLE || 'JobHunt'
        },
        body: JSON.stringify(body)
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        throw new Error(`OpenRouter HTTP ${res.status}: ${errText}`);
      }

      const json = await res.json();
      const text = json?.choices?.[0]?.message?.content || '';
      return text;
    };

    try {
      const text = await attempt();
      return { ok: true, data: { text } };
    } catch (err) {
      try {
        await sleep(250);
        const text = await attempt();
        return { ok: true, data: { text } };
      } catch (err2) {
        return {
          ok: false,
          data: {
            message: 'OpenRouter request failed',
            error: err2?.message || String(err2)
          }
        };
      }
    }
  }
}

export const openRouterService = new OpenRouterService();
