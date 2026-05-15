import { startTasksWorker, stopTasksWorker } from './tasks.worker.js';

/**
 * Single worker for the single shared queue.
 *
 * Why: each BullMQ Worker holds an open Redis connection that runs blocking
 * BZPOPMIN polls. On Upstash (per-command billing) every extra worker
 * multiplies idle command usage. One worker dispatches by job.name.
 */
export const startAllWorkers = () => {
  startTasksWorker();
  console.log('[workers] tasks worker started');
};

export const stopAllWorkers = async () => {
  await stopTasksWorker();
};
