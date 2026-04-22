import { createClient } from 'redis';

class RedisService {
  constructor() {
    this.client = null;
    this.connected = false;
    this.connecting = false;
  }

  async connect() {
    if (this.connected || this.connecting) return;

    const redisUrl = process.env.REDIS_URL;

    if (!redisUrl) {
      console.warn('REDIS_URL is not set. Continuing without cache.');
      return;
    }

    this.connecting = true;

    try {
      const useTls = redisUrl.startsWith('rediss://');

      this.client = createClient({
        url: redisUrl,
        socket: useTls ? { tls: true } : undefined
      });

      this.client.on('error', (err) => {
        console.error('Redis Client Error:', err);
      });

      this.client.on('connect', () => {
        console.log('Redis connected');
      });

      this.client.on('reconnecting', () => {
        console.log('Redis reconnecting...');
      });

      await this.client.connect();
      this.connected = true;
    } catch (err) {
      console.error('Redis connection failed (continuing without cache):', err);
      this.client = null;
      this.connected = false;
    } finally {
      this.connecting = false;
    }
  }

  async ensureConnection() {
    if (!this.connected) {
      await this.connect();
    }
  }

  async getJson(key) {
    try {
      await this.ensureConnection();
      if (!this.connected) return null;

      const raw = await this.client.get(key);
      if (!raw) return null;

      try {
        return JSON.parse(raw);
      } catch (err) {
        console.error('Redis JSON parse error:', err);
        return null;
      }
    } catch (err) {
      console.error('Redis getJson failed:', err);
      return null;
    }
  }

  async setJson(key, value, ttlSeconds) {
    try {
      await this.ensureConnection();
      if (!this.connected) return;

      const payload = JSON.stringify(value);
      const ttl = Number(ttlSeconds);

      if (!isNaN(ttl) && ttl > 0) {
        await this.client.set(key, payload, { EX: ttl });
        return;
      }

      await this.client.set(key, payload);
    } catch (err) {
      console.error('Redis setJson failed:', err);
    }
  }

  async del(key) {
    try {
      await this.ensureConnection();
      if (!this.connected) return;

      await this.client.del(key);
    } catch (err) {
      console.error('Redis del failed:', err);
    }
  }

  async delByPrefix(prefix) {
    try {
      await this.ensureConnection();
      if (!this.connected) return;

      const keysToDelete = [];

      for await (const key of this.client.scanIterator({
        MATCH: `${prefix}*`,
        COUNT: 200
      })) {
        keysToDelete.push(key);

        if (keysToDelete.length >= 500) {
          await this.client.del(...keysToDelete);
          keysToDelete.length = 0;
        }
      }

      if (keysToDelete.length > 0) {
        await this.client.del(...keysToDelete);
      }
    } catch (err) {
      console.error('Redis delByPrefix failed:', err);
    }
  }

  async disconnect() {
    try {
      if (this.client) {
        await this.client.quit();
        this.connected = false;
        console.log('Redis disconnected');
      }
    } catch (err) {
      console.error('Redis disconnect failed:', err);
    }
  }
}

export const redisService = new RedisService();