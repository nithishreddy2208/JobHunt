import { Queue } from 'bullmq';
import { getBullConnection, defaultJobOptions } from '../config/queue.js';

/**
 * Single shared queue for ALL background tasks.
 *
 * Why one queue: each BullMQ Worker keeps a blocking Redis connection open
 * 24/7 (BZPOPMIN). On Upstash that polling traffic is billed. Three queues
 * meant three workers polling = 3x command usage. One queue = one worker.
 *
 * Different task types are dispatched by `job.name` inside the worker.
 */
export const TASKS_QUEUE_NAME = 'tasks';

export const tasksQueue = new Queue(TASKS_QUEUE_NAME, {
  connection: getBullConnection(),
  defaultJobOptions
});
