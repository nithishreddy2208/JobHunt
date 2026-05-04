import { Worker } from 'bullmq';
import { getBullConnection } from '../config/queue.js';
import { JOB_QUEUE_NAME } from '../queues/job.queue.js';
import { Job as JobModel } from '../models/job.model.js';
import { getEmbedding } from '../utils/embedding.js';
import { redisService } from '../services/redis.service.js';
import { enqueueAiTask } from '../queues/ai.queue.js';

const handlers = {
  generateEmbedding: async ({ jobId }) => {
    const job = await JobModel.findById(jobId).lean();
    if (!job) throw new Error(`Job not found: ${jobId}`);

    const embeddingText = [
      `Title: ${job.title}`,
      `Description: ${job.description}`,
      `Requirements: ${(job.requirements || []).join(', ')}`,
      `Location: ${job.location}`,
      `Job Type: ${job.jobType}`
    ].join('\n');

    const embedding = await getEmbedding(embeddingText);
    await JobModel.updateOne({ _id: jobId }, { $set: { embedding } });

    // Recommendations may have been computed without this job's embedding
    await redisService.delByPrefix('jobhunt:ai:recommendation:');

    // Pre-compute interview prep tailored to this job so users get instant responses
    try {
      await enqueueAiTask('prewarmJobInterviewPrep', { jobId: String(jobId) });
    } catch (err) {
      console.error('[worker:job] interview-prep enqueue failed:', err?.message || err);
    }

    return { jobId, dims: Array.isArray(embedding) ? embedding.length : 0 };
  }
};

export const startJobWorker = () => {
  const worker = new Worker(
    JOB_QUEUE_NAME,
    async (job) => {
      const handler = handlers[job.name];
      if (!handler) throw new Error(`Unknown job name: ${job.name}`);
      return handler(job.data);
    },
    {
      connection: getBullConnection(),
      concurrency: Number(process.env.JOB_WORKER_CONCURRENCY) || 2
    }
  );

  worker.on('active', (job) => {
    console.log(`[worker:job] start id=${job.id} name=${job.name}`);
  });

  worker.on('completed', (job, result) => {
    console.log(`[worker:job] done  id=${job.id} name=${job.name} result=${JSON.stringify(result)}`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[worker:job] fail  id=${job?.id} name=${job?.name} attempt=${job?.attemptsMade} err=${err?.message}`);
  });

  return worker;
};
