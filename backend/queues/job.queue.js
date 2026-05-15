import { tasksQueue } from './tasks.queue.js';

// Kept for backwards compat with existing imports.
export const JOB_QUEUE_NAME = 'tasks';
export const jobQueue = tasksQueue;

export const enqueueJobEmbedding = async (jobId) => {
  const job = await tasksQueue.add('generateEmbedding', { jobId: String(jobId) });
  console.log(`[queue] added id=${job.id} name=generateEmbedding jobId=${jobId}`);
  return job.id;
};
