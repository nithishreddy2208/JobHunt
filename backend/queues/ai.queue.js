import { Queue } from 'bullmq';
import { getBullConnection, defaultJobOptions } from '../config/queue.js';

export const AI_QUEUE_NAME = 'ai';

export const aiQueue = new Queue(AI_QUEUE_NAME, {
  connection: getBullConnection(),
  defaultJobOptions
});

/**
 * Generic AI task enqueuer.
 * Future use: pre-warm caches, async resume analysis, etc.
 */
export const enqueueAiTask = async (name, data = {}) => {
  const job = await aiQueue.add(name, data);
  console.log(`[queue:ai] added id=${job.id} name=${name}`);
  return job.id;
};
