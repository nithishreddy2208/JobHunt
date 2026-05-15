import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import { lowTrafficWorkerOptions } from '../config/queue.js';
import { TASKS_QUEUE_NAME } from '../queues/tasks.queue.js';

import { Job as JobModel } from '../models/job.model.js';
import { User } from '../models/user.model.js';
import { getEmbedding } from '../utils/embedding.js';
import { llmService } from '../services/llm.service.js';
import { redisService } from '../services/redis.service.js';
import { enqueueAiTask } from '../queues/ai.queue.js';

const RESUME_ANALYSIS_TTL = Number(process.env.AI_CACHE_TTL_SECONDS) || 900;

const safeParseJson = (text) => {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};

/**
 * All background task handlers, dispatched by job.name.
 * Single Worker => single blocking Redis connection => minimal Upstash usage.
 */
const handlers = {
  // ---------- Job embedding ----------
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

    await redisService.delByPrefix('jobhunt:ai:recommendation:');

    try {
      await enqueueAiTask('prewarmJobInterviewPrep', { jobId: String(jobId) });
    } catch (err) {
      console.error('[worker] interview-prep enqueue failed:', err?.message || err);
    }

    return { jobId, dims: Array.isArray(embedding) ? embedding.length : 0 };
  },

  // ---------- Resume embedding ----------
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

    try {
      await redisService.del(`jobhunt:ai:resume_analysis:${userId}`);
      await enqueueAiTask('prewarmResumeAnalysis', { userId });
    } catch (err) {
      console.error('[worker] prewarm enqueue failed:', err?.message || err);
    }

    return { userId, textLen: resumeText.length, dims: Array.isArray(embedding) ? embedding.length : 0 };
  },

  // ---------- AI prewarm: resume analysis ----------
  prewarmResumeAnalysis: async ({ userId }) => {
    const user = await User.findById(userId).select('profile.resumeText').lean();
    const resumeText = user?.profile?.resumeText?.trim();
    if (!resumeText) return { userId, skipped: true, reason: 'no resume text' };

    const system = 'You are an expert resume reviewer. Output ONLY a single JSON object with keys extractedSkills (array of strings), missingSkills (array of strings), suggestions (array of strings). Include 5-10 extractedSkills taken from the resume, 3-7 missingSkills typical for the role, and 3-5 short actionable suggestions. Do not include any keys outside the schema. Do not include markdown or prose.';
    const prompt = `SYSTEM:\n${system}\n\nUSER:\nResume:\n${resumeText}`;

    const res = await llmService.generateResponse(prompt, {
      numPredict: 800,
      temperature: 0.2,
      timeoutMs: 45000,
      format: 'json'
    });

    if (!res?.success) throw new Error(`LLM failed: ${res?.message || 'unknown'}`);

    const parsed = safeParseJson(res.text || '') || {
      extractedSkills: [],
      missingSkills: [],
      suggestions: []
    };

    await redisService.setJson(
      `jobhunt:ai:resume_analysis:${userId}`,
      { analysis: parsed, aiMeta: { provider: res.provider || 'llm', ok: true, prewarmed: true }, success: true },
      RESUME_ANALYSIS_TTL
    );

    return { userId, cached: true };
  },

  // ---------- AI prewarm: per-job interview prep ----------
  prewarmJobInterviewPrep: async ({ jobId }) => {
    const job = await JobModel.findById(jobId).lean();
    if (!job) throw new Error(`Job not found: ${jobId}`);

    const jobContext = [
      `Title: ${job.title}`,
      `Description: ${job.description}`,
      `Requirements: ${(job.requirements || []).join(', ')}`,
      `Job Type: ${job.jobType}`,
      `Experience: ${job.experienceLevel}`
    ].join('\n');

    const system = 'You are an interview coach. Output ONLY a single JSON object with key questions, an array of exactly 5 objects each with keys question (string) and suggestedAnswer (string, 2-3 sentences). Tailor the questions to the given job posting (use its requirements and description). No keys outside the schema, no markdown, no prose.';
    const prompt = `SYSTEM:\n${system}\n\nUSER:\nJob posting:\n${jobContext}`;

    const res = await llmService.generateResponse(prompt, {
      numPredict: 800,
      temperature: 0.4,
      timeoutMs: 45000,
      format: 'json'
    });

    if (!res?.success) throw new Error(`LLM failed: ${res?.message || 'unknown'}`);

    const parsed = safeParseJson(res.text || '') || { questions: [] };

    await redisService.setJson(
      `jobhunt:ai:interview_prep:job:${jobId}`,
      { prep: parsed, aiMeta: { provider: res.provider || 'llm', ok: true, prewarmed: true, jobId: String(jobId) }, success: true },
      RESUME_ANALYSIS_TTL
    );

    return { jobId: String(jobId), cached: true };
  },

  noop: async (data) => ({ ok: true, data })
};

/**
 * BullMQ requires the Worker to use a DEDICATED ioredis connection
 * (it issues blocking commands; the connection cannot be shared with the
 * Queue's command connection). We create exactly one such connection here.
 */
const buildWorkerConnection = () => {
  const url = process.env.REDIS_URL;
  if (!url) throw new Error('REDIS_URL is required');
  return new IORedis(url, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    lazyConnect: false
  });
};

let workerInstance = null;

export const startTasksWorker = () => {
  if (workerInstance) return workerInstance;

  workerInstance = new Worker(
    TASKS_QUEUE_NAME,
    async (job) => {
      const handler = handlers[job.name];
      if (!handler) throw new Error(`Unknown task: ${job.name}`);
      return handler(job.data);
    },
    {
      connection: buildWorkerConnection(),
      ...lowTrafficWorkerOptions
    }
  );

  workerInstance.on('active', (job) => {
    console.log(`[worker] start id=${job.id} name=${job.name}`);
  });
  workerInstance.on('completed', (job, result) => {
    console.log(`[worker] done  id=${job.id} name=${job.name} result=${JSON.stringify(result)}`);
  });
  workerInstance.on('failed', (job, err) => {
    console.error(`[worker] fail  id=${job?.id} name=${job?.name} attempt=${job?.attemptsMade} err=${err?.message}`);
  });

  return workerInstance;
};

export const stopTasksWorker = async () => {
  if (!workerInstance) return;
  try {
    await workerInstance.close();
  } catch (err) {
    console.error('[worker] close error:', err?.message || err);
  } finally {
    workerInstance = null;
  }
};
