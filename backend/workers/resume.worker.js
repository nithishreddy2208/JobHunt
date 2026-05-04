import { Worker } from 'bullmq';
import { getBullConnection } from '../config/queue.js';
import { RESUME_QUEUE_NAME } from '../queues/resume.queue.js';
import { User } from '../models/user.model.js';
import { getEmbedding } from '../utils/embedding.js';
import { enqueueAiTask } from '../queues/ai.queue.js';
import { redisService } from '../services/redis.service.js';

const handlers = {
  /**
   * Generate (or refresh) the user's resume embedding from the
   * resumeText already persisted by the controller at upload time.
   */
  processResume: async ({ userId }) => {
    const user = await User.findById(userId);
    if (!user) throw new Error(`User not found: ${userId}`);

    const resumeText = (user.profile?.resumeText || '').trim();
    if (!resumeText) {
      return { userId, skipped: true, reason: 'empty resume text' };
    }

    const embedding = await getEmbedding(resumeText);
    await User.updateOne(
      { _id: userId },
      { $set: { 'profile.embedding': embedding } }
    );

    // Resume changed -> stale analysis must go, then prewarm a fresh one
    try {
      await redisService.del(`jobhunt:ai:resume_analysis:${userId}`);
      await enqueueAiTask('prewarmResumeAnalysis', { userId });
    } catch (err) {
      console.error('[worker:resume] prewarm enqueue failed:', err?.message || err);
    }

    return {
      userId,
      textLen: resumeText.length,
      dims: Array.isArray(embedding) ? embedding.length : 0
    };
  }
};

export const startResumeWorker = () => {
  const worker = new Worker(
    RESUME_QUEUE_NAME,
    async (job) => {
      const handler = handlers[job.name];
      if (!handler) throw new Error(`Unknown resume job: ${job.name}`);
      return handler(job.data);
    },
    {
      connection: getBullConnection(),
      concurrency: Number(process.env.RESUME_WORKER_CONCURRENCY) || 2
    }
  );

  worker.on('active', (job) => {
    console.log(`[worker:resume] start id=${job.id} name=${job.name}`);
  });

  worker.on('completed', (job, result) => {
    console.log(`[worker:resume] done  id=${job.id} name=${job.name} result=${JSON.stringify(result)}`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[worker:resume] fail  id=${job?.id} name=${job?.name} attempt=${job?.attemptsMade} err=${err?.message}`);
  });

  return worker;
};
