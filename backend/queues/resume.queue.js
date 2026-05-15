import { tasksQueue } from './tasks.queue.js';

export const RESUME_QUEUE_NAME = 'tasks';
export const resumeQueue = tasksQueue;

export const enqueueResumeProcessing = async ({ userId, resumeUrl }) => {
  const job = await tasksQueue.add('processResume', {
    userId: String(userId),
    resumeUrl: resumeUrl || null
  });
  console.log(`[queue] added id=${job.id} name=processResume userId=${userId}`);
  return job.id;
};
