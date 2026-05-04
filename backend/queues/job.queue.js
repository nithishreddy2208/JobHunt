import { Queue } from 'bullmq';
import { getBullConnection, defaultJobOptions } from '../config/queue.js';

export const JOB_QUEUE_NAME = 'job';

export const jobQueue = new Queue(JOB_QUEUE_NAME, {
  connection: getBullConnection(),
  defaultJobOptions
});

export const enqueueJobEmbedding = async (jobId) => {
  const job = await jobQueue.add('generateEmbedding', { jobId: String(jobId) });
  console.log(`[queue:job] added id=${job.id} name=generateEmbedding jobId=${jobId}`);
  return job.id;
};
