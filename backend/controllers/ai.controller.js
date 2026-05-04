import { aiService } from '../services/ai.service.js';
import { User } from '../models/user.model.js';
import { Job } from '../models/job.model.js';
import { redisService } from '../services/redis.service.js';
import { getEmbedding } from '../utils/embedding.js';

const TTL = Number(process.env.AI_CACHE_TTL_SECONDS) || 900;

const logCache = (key, hit) => {
  console.log(`[redis] ${hit ? 'HIT' : 'MISS'} ${key}`);
};

export const semanticJobSearch = async (req, res) => {
  try {
    const { query } = req.body;

    if (!query || !String(query).trim()) {
      return res.status(400).json({ success: false, message: 'query is required' });
    }

    const cacheKey = `jobhunt:ai:search:${query}`;
    const cached = await redisService.getJson(cacheKey);
    if (cached) {
      logCache(cacheKey, true);
      return res.json(cached);
    }
    logCache(cacheKey, false);

    const queryEmbeddingKey = `jobhunt:ai:query_embedding:${query}`;
    let queryEmbedding = await redisService.getJson(queryEmbeddingKey);
    if (queryEmbedding) {
      logCache(queryEmbeddingKey, true);
    } else {
      logCache(queryEmbeddingKey, false);
      queryEmbedding = await getEmbedding(query);
      await redisService.setJson(queryEmbeddingKey, queryEmbedding, TTL);
    }

    const jobs = await aiService.searchJobsByEmbedding(queryEmbedding, { topK: 10 });

    const payload = { jobs, success: true };
    await redisService.setJson(cacheKey, payload, TTL);

    res.json(payload);
  } catch(error) {
    console.log(error);
    res.json({ success: false });
  }
};

export const recommendJobs = async (req, res) => {
  try {
    const userId = req.userId;
    const cacheKey = `jobhunt:ai:recommendation:${userId}`;
    const cached = await redisService.getJson(cacheKey);
    if (cached) {
      logCache(cacheKey, true);
      return res.json(cached);
    }
    logCache(cacheKey, false);

    const user = await User.findById(userId).lean();

    let embedding = user?.profile?.embedding;

    if (!Array.isArray(embedding) || embedding.length === 0) {
      const payload = {
        success: false,
        message: 'Resume embedding not found. Upload/update resume to generate embedding.'
      };
      await redisService.setJson(cacheKey, payload, TTL);
      return res.json(payload);
    }

    const jobs = await aiService.searchJobsByEmbedding(embedding);

    const payload = {
      jobs,
      ai: null,
      aiMeta: { provider: 'llm', ok: true, skipped: true },
      success: true
    };
    await redisService.setJson(cacheKey, payload, TTL);
    res.json(payload);

  } catch (error) {
    console.log(error);
    res.json({ success: false });
  }
};

export const analyzeResume = async (req, res) => {
  try {
    const user = await User.findById(req.userId).lean();

    const resumeText = String(user?.profile?.resumeText || '').trim();

    if (!resumeText) {
      return res.status(400).json({
        success: false,
        message: 'Resume text not found. Upload a resume (or pass resumeText) to analyze.'
      });
    }

    const cacheKey = `jobhunt:ai:resume_analysis:${req.userId}`;
    const cached = await redisService.getJson(cacheKey);
    if (cached) {
      logCache(cacheKey, true);
      return res.json(cached);
    }
    logCache(cacheKey, false);

    const llm = await aiService.generateWithLlm({
      system: 'You are an expert resume reviewer. Output ONLY a single JSON object with keys extractedSkills (array of strings), missingSkills (array of strings), suggestions (array of strings). Include 5-10 extractedSkills taken from the resume, 3-7 missingSkills typical for the role, and 3-5 short actionable suggestions. Do not include any keys outside the schema. Do not include markdown or prose.',
      user: `Resume:\n${resumeText}`,
      fallback: { extractedSkills: [], missingSkills: [], suggestions: [] },
      numPredict: 800,
      temperature: 0.2,
      timeoutMs: 45000,
      format: 'json'
    });

    const payload = {
      analysis: llm.value,
      aiMeta: llm.ok ? { provider: llm.provider || 'llm', ok: true } : { provider: 'llm', ok: false, error: llm.error },
      success: true
    };
    await redisService.setJson(cacheKey, payload, TTL);
    res.json(payload);
  } catch (error) {
    console.log(error);
    res.json({ success: false });
  }
};

export const generateCoverLetter = async (req, res) => {
  try {
    const { jobId, jobDescription: jobDescriptionFromBody, resumeText: resumeTextFromBody } = req.body || {};

    const user = await User.findById(req.userId).lean();
    const resumeText = String(resumeTextFromBody || user?.profile?.resumeText || '').trim();

    let jobDescription = String(jobDescriptionFromBody || '').trim();
    let jobTitle = '';
    if (!jobDescription) {
      if (!jobId) {
        return res.status(400).json({
          success: false,
          message: 'jobId (preferred) or jobDescription is required'
        });
      }
      const job = await Job.findById(jobId).lean();
      if (!job) {
        return res.status(404).json({ success: false, message: 'Job not found' });
      }
      jobTitle = String(job?.title || '').trim();
      jobDescription = String(job?.description || '').trim();
    }

    if (!resumeText) {
      return res.status(400).json({
        success: false,
        message: 'Resume text not found. Upload a resume (or pass resumeText) to generate a cover letter.'
      });
    }

    const cacheKey = `jobhunt:ai:cover_letter:${req.userId}:${jobId || 'adhoc'}`;
    const cached = await redisService.getJson(cacheKey);
    if (cached) {
      logCache(cacheKey, true);
      return res.json(cached);
    }
    logCache(cacheKey, false);

    const llm = await aiService.generateWithLlm({
      system: 'Write a concise professional cover letter (200-300 words).',
      user: `${jobTitle ? `Job Title: ${jobTitle}\n\n` : ''}Job Description:\n${jobDescription}\n\nResume:\n${resumeText}`,
      fallback: 'Cover letter generation is unavailable right now.',
      parseJson: false
    });

    const payload = {
      coverLetter: llm.value,
      aiMeta: llm.ok ? { provider: llm.provider || 'llm', ok: true } : { provider: 'llm', ok: false, error: llm.error },
      success: true
    };
    await redisService.setJson(cacheKey, payload, TTL);
    res.json(payload);
  } catch (error) {
    console.log(error);
    res.json({ success: false });
  }
};

export const interviewPrep = async (req, res) => {
  try {
    const { role: roleFromBody, jobId } = req.body || {};
    let role = String(roleFromBody || '').trim();
    let job = null;

    if (jobId) {
      job = await Job.findById(jobId).lean();
      if (!role) role = String(job?.title || '').trim();
    }

    if (!role) {
      const user = await User.findById(req.userId).lean();
      role = String(user?.profile?.bio || '').trim();
    }

    if (!role && !job) {
      return res.status(400).json({
        success: false,
        message: 'role is required (or pass jobId, or set profile.bio to your target role)'
      });
    }

    // Prefer job-scoped cache (populated by the prewarm worker) when jobId is given.
    // Falls back to a per-user+role key for free-form role queries.
    const cacheKey = jobId
      ? `jobhunt:ai:interview_prep:job:${jobId}`
      : `jobhunt:ai:interview_prep:${req.userId}:${role}`;

    const cached = await redisService.getJson(cacheKey);
    if (cached) {
      logCache(cacheKey, true);
      return res.json(cached);
    }
    logCache(cacheKey, false);

    // Live compute. Use richer job context if we have a job; else use role string.
    const userPrompt = job
      ? `Job posting:\nTitle: ${job.title}\nDescription: ${job.description}\nRequirements: ${(job.requirements || []).join(', ')}\nJob Type: ${job.jobType}\nExperience: ${job.experienceLevel}`
      : `Role: ${role}`;

    const llm = await aiService.generateWithLlm({
      system: 'You are an interview coach. Output ONLY a single JSON object with key questions, an array of exactly 5 objects each with keys question (string) and suggestedAnswer (string, 2-3 sentences). Tailor the questions to the given context. No keys outside the schema, no markdown, no prose.',
      user: userPrompt,
      fallback: { questions: [] },
      numPredict: 800,
      temperature: 0.4,
      timeoutMs: 45000,
      format: 'json'
    });

    const payload = {
      prep: llm.value,
      aiMeta: llm.ok ? { provider: llm.provider || 'llm', ok: true } : { provider: 'llm', ok: false, error: llm.error },
      success: true
    };
    await redisService.setJson(cacheKey, payload, TTL);
    res.json(payload);
  } catch (error) {
    console.log(error);
    res.json({ success: false });
  }
};