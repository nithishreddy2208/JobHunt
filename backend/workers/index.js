import { startJobWorker } from './job.worker.js';
import { startResumeWorker } from './resume.worker.js';
import { startAiWorker } from './ai.worker.js';

let workers = [];

export const startAllWorkers = () => {
  if (workers.length > 0) return workers;
  workers = [startJobWorker(), startResumeWorker(), startAiWorker()];
  console.log('[workers] started job, resume, ai');
  return workers;
};

export const stopAllWorkers = async () => {
  await Promise.all(
    workers.map((w) =>
      w.close().catch((err) => console.error('[workers] close error:', err?.message || err))
    )
  );
  workers = [];
};
