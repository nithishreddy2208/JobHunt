import { Worker } from 'bullmq';
import { getBullConnection } from '../config/queue.js';
import { AI_QUEUE_NAME } from '../queues/ai.queue.js';
import { User } from '../models/user.model.js';
import { Job } from '../models/job.model.js';
import { llmService } from '../services/llm.service.js';
import { redisService } from '../services/redis.service.js';

const RESUME_ANALYSIS_TTL = Number(process.env.AI_CACHE_TTL_SECONDS) || 900;

const safeParseJson = (text) => {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};

const handlers = {
  noop: async (data) => {
    return { ok: true, data };
  },

  /**
   * Pre-compute resume analysis right after resume embedding finishes,
   * so when the user opens the Analyze Resume page, the result is instant.
   * Stores under the same Redis key the analyzeResume controller reads from.
   */
  prewarmResumeAnalysis: async ({ userId }) => {
    const user = await User.findById(userId).select('profile.resumeText').lean();
    const resumeText = user?.profile?.resumeText?.trim();
    if (!resumeText) {
      return { userId, skipped: true, reason: 'no resume text' };
    }

    const system = 'You are an expert resume reviewer. Output ONLY a single JSON object with keys extractedSkills (array of strings), missingSkills (array of strings), suggestions (array of strings). Include 5-10 extractedSkills taken from the resume, 3-7 missingSkills typical for the role, and 3-5 short actionable suggestions. Do not include any keys outside the schema. Do not include markdown or prose.';
    const prompt = `SYSTEM:\n${system}\n\nUSER:\nResume:\n${resumeText}`;

    const res = await llmService.generateResponse(prompt, {
      numPredict: 800,
      temperature: 0.2,
      timeoutMs: 45000,
      format: 'json'
    });

    if (!res?.success) {
      throw new Error(`LLM failed: ${res?.details?.ollamaError || res?.message || 'unknown'}`);
    }

    const parsed = safeParseJson(res.text || '') || {
      extractedSkills: [],
      missingSkills: [],
      suggestions: []
    };

    const payload = {
      analysis: parsed,
      aiMeta: { provider: res.provider || 'llm', ok: true, prewarmed: true },
      success: true
    };

    await redisService.setJson(`jobhunt:ai:resume_analysis:${userId}`, payload, RESUME_ANALYSIS_TTL);

    return {
      userId,
      cached: true,
      skills: Array.isArray(parsed.extractedSkills) ? parsed.extractedSkills.length : 0
    };
  },

  /**
   * Pre-compute interview prep tailored to a specific job posting.
   * Cached under a job-scoped key and shared across all users who ask about that job.
   */
  prewarmJobInterviewPrep: async ({ jobId }) => {
    const job = await Job.findById(jobId).lean();
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

    if (!res?.success) {
      throw new Error(`LLM failed: ${res?.message || 'unknown'}`);
    }

    const parsed = safeParseJson(res.text || '') || { questions: [] };

    const payload = {
      prep: parsed,
      aiMeta: { provider: res.provider || 'llm', ok: true, prewarmed: true, jobId: String(jobId) },
      success: true
    };

    await redisService.setJson(
      `jobhunt:ai:interview_prep:job:${jobId}`,
      payload,
      RESUME_ANALYSIS_TTL
    );

    return {
      jobId: String(jobId),
      cached: true,
      questions: Array.isArray(parsed.questions) ? parsed.questions.length : 0
    };
  }
};

export const startAiWorker = () => {
  const worker = new Worker(
    AI_QUEUE_NAME,
    async (job) => {
      const handler = handlers[job.name];
      if (!handler) throw new Error(`Unknown AI job: ${job.name}`);
      return handler(job.data);
    },
    {
      connection: getBullConnection(),
      concurrency: Number(process.env.AI_WORKER_CONCURRENCY) || 1
    }
  );

  worker.on('active', (job) => {
    console.log(`[worker:ai] start id=${job.id} name=${job.name}`);
  });

  worker.on('completed', (job, result) => {
    console.log(`[worker:ai] done  id=${job.id} name=${job.name} result=${JSON.stringify(result)}`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[worker:ai] fail  id=${job?.id} name=${job?.name} attempt=${job?.attemptsMade} err=${err?.message}`);
  });

  return worker;
};
