import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-flash-latest';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export class GeminiService {
  constructor() {
    this.client = null;
  }

  getClient() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return null;

    if (!this.client) {
      this.client = new GoogleGenerativeAI(apiKey);
    }

    return this.client;
  }

  async generateJson({ system, user }) {
    const client = this.getClient();
    if (!client) {
      return { ok: false, data: { message: 'Gemini disabled (no GEMINI_API_KEY)' } };
    }

    const model = client.getGenerativeModel({ model: GEMINI_MODEL });

    const prompt = [
      system ? `SYSTEM:\n${system}` : '',
      `USER:\n${user}`
    ].filter(Boolean).join('\n\n');

    const attempt = async () => {
      const result = await model.generateContent(prompt);
      const text = result?.response?.text?.() || '';
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
            message: 'Gemini request failed',
            error: err2?.message || String(err2)
          }
        };
      }
    }
  }
}

export const geminiService = new GeminiService();
