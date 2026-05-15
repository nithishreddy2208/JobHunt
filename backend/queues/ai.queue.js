import { tasksQueue } from './tasks.queue.js';

export const AI_QUEUE_NAME = 'tasks';
export const aiQueue = tasksQueue;

export const enqueueAiTask = async (name, data = {}) => {
  const job = await tasksQueue.add(name, data);
  console.log(`[queue] added id=${job.id} name=${name}`);
  return job.id;
};
