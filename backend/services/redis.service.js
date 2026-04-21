import { createClient } from 'redis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

class RedisService {
  constructor() {
    this.client = createClient({ url: REDIS_URL });
    this.connected = false;

    this.client.on('error', (err) => {
      console.error('Redis Client Error:', err);
    });
    
    this.client.on('connect', () => {
      console.log("Redis connected");
    });

    this.client.on('reconnecting', () => {
      console.log("Redis reconnecting...");
    });
  }

  async connect() {
    if (this.connected) return;
    await this.client.connect();
    this.connected = true;
  }

  async getJson(key) {
    if (!this.connected) await this.connect();
    const raw = await this.client.get(key);
    if (!raw) return null;

    try {
      return JSON.parse(raw);
    } catch (err) {
      console.error("Redis JSON parse error:", err);
      return null;
    }
  }

  async setJson(key, value, { ttlSeconds } = {}) {
    const payload = JSON.stringify(value);

    if (ttlSeconds && Number(ttlSeconds) > 0) {
      await this.client.set(key, payload, { EX: Number(ttlSeconds) });
      return;
    }

    await this.client.set(key, payload);
  }

  async del(key) {
    await this.client.del(key);
  }

  async delByPrefix(prefix) {
    const keysToDelete = [];
    for await (const key of this.client.scanIterator({ MATCH: `${prefix}*`, COUNT: 200 })) {
      keysToDelete.push(key);
      if (keysToDelete.length >= 500) {
        await this.client.del(keysToDelete);
        keysToDelete.length = 0;
      }
    }

    if (keysToDelete.length > 0) {
      await this.client.del(keysToDelete);
    }
  }

  async disconnect() {
    if (this.client && this.connected) {
      await this.client.quit();
      this.connected = false;
    }
  }
}



export const redisService = new RedisService();
