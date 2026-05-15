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
  backoff: { type: 'exponential', delay: 5000 },
  // Aggressive cleanup keeps job hashes small => smaller LRANGE on stalled checks
  removeOnComplete: { age: 3600, count: 50 },
  removeOnFail: { age: 24 * 3600, count: 100 }
};

/**
 * Worker options tuned for Upstash (per-command billing).
 *
 * Defaults (BAD for Upstash):
 *   drainDelay: 5      -> blocking BZPOPMIN re-issued every 5s when idle
 *   stalledInterval: 30000 -> stalled-check every 30s (3 commands each)
 *   lockDuration: 30000    -> lock renew every 15s for in-flight jobs
 *
 * Tuned (~30x fewer commands while idle):
 *   drainDelay: 60     -> 1 blocking poll/min instead of 12/min
 *   stalledInterval: 300000 -> stalled-check every 5min
 *   lockDuration: 300000    -> lock renew every 2.5min (jobs must finish in <5min,
 *                              fine for our embedding + LLM tasks at 45s timeout)
 *   concurrency: 1     -> minimize parallel lock-renewal streams
 *
 * Override per-worker only if a job genuinely runs longer than lockDuration/2.
 */
export const lowTrafficWorkerOptions = {
  concurrency: 1,
  drainDelay: 60,
  stalledInterval: 300_000,
  lockDuration: 300_000,
  // Keep maxStalledCount low so we don't keep re-running broken jobs
  maxStalledCount: 1
};
