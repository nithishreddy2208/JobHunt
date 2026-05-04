import IORedis from 'ioredis';

let connection = null;

/**
 * Returns a singleton ioredis connection suitable for BullMQ Queues/Workers.
 *
 * Works with:
 *   - local Redis (redis://localhost:6379)
 *   - Upstash Redis (rediss://...)
 *
 * BullMQ requires `maxRetriesPerRequest: null` for blocking commands.
 */
export const getBullConnection = () => {
  if (connection) return connection;

  const url = process.env.REDIS_URL;
  if (!url) {
    throw new Error('REDIS_URL is required for BullMQ');
  }

  connection = new IORedis(url, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    lazyConnect: false
  });

  connection.on('error', (err) => {
    console.error('[bullmq] redis error:', err?.message || err);
  });

  connection.on('connect', () => {
    console.log('[bullmq] redis connected');
  });

  return connection;
};

export const closeBullConnection = async () => {
  if (connection) {
    try {
      await connection.quit();
    } catch (err) {
      console.error('[bullmq] redis quit failed:', err?.message || err);
    } finally {
      connection = null;
    }
  }
};

export const defaultJobOptions = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 2000 },
  removeOnComplete: { age: 3600, count: 1000 },
  removeOnFail: { age: 24 * 3600, count: 1000 }
};
