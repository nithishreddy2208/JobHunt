import { Queue } from 'bullmq';
import { getBullConnection, defaultJobOptions } from '../config/queue.js';

export const RESUME_QUEUE_NAME = 'resume';

export const resumeQueue = new Queue(RESUME_QUEUE_NAME, {
  connection: getBullConnection(),
  defaultJobOptions
});

/**
 * Enqueue a resume processing job.
 * Worker will fetch the file by URL, extract text and generate embedding.
 */
export const enqueueResumeProcessing = async ({ userId, resumeUrl }) => {
  const job = await resumeQueue.add('processResume', {
    userId: String(userId),
    resumeUrl: resumeUrl || null
  });
  console.log(`[queue:resume] added id=${job.id} name=processResume userId=${userId}`);
  return job.id;
};
