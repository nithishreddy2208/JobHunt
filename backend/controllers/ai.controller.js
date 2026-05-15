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
  } catch (error) {
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
      system: `You are an expert resume reviewer and career assistant.

                IMPORTANT RULES:
                - Return ONLY valid JSON
                - Do NOT return markdown
                - Do NOT return explanations
                - Do NOT return code blocks
                - Do NOT return any text before or after JSON
                - Response must be short, fast, and schema-compliant

                STRICT JSON SCHEMA:
                {
                  "extractedSkills": ["skill1", "skill2"],
                  "missingSkills": ["skill1", "skill2"],
                  "suggestions": ["suggestion1", "suggestion2"]
                }

                TASK:
                1. Extract 5-10 important skills directly from the resume
                2. Identify 3-7 commonly expected missing skills for the candidate's target role
                3. Provide 3-5 short actionable resume improvement suggestions

                RULES:
                - Keep every suggestion under 15 words
                - Keep skill names short
                - Avoid duplicate skills
                - Avoid long sentences
                - Use concise output for faster generation
                - Ensure JSON is always syntactically valid
                - Never include extra keys
                - Never leave arrays empty`,
      user: `Resume:\n${resumeText}`,
      fallback: { extractedSkills: [], missingSkills: [], suggestions: [] },
      numPredict: 800,
      temperature: 0.2,
      // timeoutMs intentionally omitted -> falls through to LLM_TIMEOUT_MS env in llm.service
      format: 'json'
    });

    const payload = {
      analysis: llm.value,
      aiMeta: llm.ok ? { provider: llm.provider || 'llm', ok: true } : { provider: 'llm', ok: false, error: llm.error },
      success: true
    };
    // Only cache on success. Caching a fallback (empty arrays) would poison future
    // requests for the full TTL — every later call would return empty without retrying.
    if (llm.ok) {
      await redisService.setJson(cacheKey, payload, TTL);
    }
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
      system: `You are a professional career assistant.

                Task:
                Write a professional and personalized cover letter between 200 and 300 words based on the provided job description and candidate information.

                Instructions:
                - Keep the tone professional, confident, and natural
                - Mention relevant skills, technologies, experience, and projects
                - Explain why the candidate is a good fit for the role
                - Show enthusiasm for joining the company/team
                - Keep the structure simple:
                  1. Short introduction
                  2. Relevant skills and experience
                  3. Why the candidate fits the role
                  4. Professional closing
                - Avoid generic or repetitive wording
                - Do not use placeholders unless information is missing
                - Do not add explanations, notes, or markdown
                - Return only the final cover letter text`,
      user: `${jobTitle ? `Job Title: ${jobTitle}\n\n` : ''}Job Description:\n${jobDescription}\n\nResume:\n${resumeText} `,
      fallback: 'Cover letter generation is unavailable right now.',
      parseJson: false
    });

    const payload = {
      coverLetter: llm.value,
      aiMeta: llm.ok ? { provider: llm.provider || 'llm', ok: true } : { provider: 'llm', ok: false, error: llm.error },
      success: true
    };
    // Only cache on success.
    if (llm.ok) {
      await redisService.setJson(cacheKey, payload, TTL);
    }
    res.json(payload);
  } catch (error) {
    console.log(error);
    res.json({ success: false });
  }
};

export const evaluateMockInterview = async (req, res) => {
  try {
    const { role: roleRaw, qa } = req.body || {};
    const role = String(roleRaw || '').trim();

    if (!Array.isArray(qa) || qa.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'qa (array of { question, answer }) is required'
      });
    }

    // Sanitize: keep only entries with non-empty question; allow empty answers (LLM will score 0).
    const sanitized = qa
      .map((item) => ({
        question: String(item?.question || '').trim(),
        answer: String(item?.answer || '').trim()
      }))
      .filter((item) => item.question);

    if (sanitized.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'qa must contain at least one valid question'
      });
    }

    // SINGLE LLM call evaluates all answers at once (per spec — keeps Ollama latency low).
    const qaBlock = sanitized
      .map((item, i) => `Q${i + 1}: ${item.question}\nA${i + 1}: ${item.answer || '(no answer given)'}`)
      .join('\n\n');

    const system =
      'You are an expert technical interviewer. Evaluate the candidate\'s answers and output ONLY a single JSON object with this exact schema: ' +
      '{ "overallScore": number (0-10), "strengths": string[] (3-5 short bullets), "weaknesses": string[] (3-5 short bullets), ' +
      '"improvements": string[] (3-5 short actionable suggestions), ' +
      '"results": [ { "question": string, "score": number (0-10), "feedback": string (1-2 sentences) } ] }. ' +
      'The results array MUST have one entry per question in the same order. Score 0 if the candidate did not answer. ' +
      'No markdown, no prose outside the JSON.';

    const user = `Role: ${role || 'General'}\n\nInterview transcript:\n\n${qaBlock}`;

    const llm = await aiService.generateWithLlm({
      system,
      user,
      fallback: {
        overallScore: 0,
        strengths: [],
        weaknesses: [],
        improvements: [],
        results: sanitized.map((item) => ({ question: item.question, score: 0, feedback: '' }))
      },
      numPredict: 1200,
      temperature: 0.3,
      format: 'json'
    });

    return res.json({
      success: true,
      evaluation: llm.value,
      aiMeta: llm.ok
        ? { provider: llm.provider || 'llm', ok: true }
        : { provider: 'llm', ok: false, error: llm.error }
    });
  } catch (error) {
    console.log('evaluateMockInterview error:', error?.message || error);
    return res.status(500).json({ success: false, message: 'Evaluation failed' });
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
      system: `You are an expert technical interview coach.

                IMPORTANT RULES:
                - Return ONLY valid JSON
                - Do NOT return markdown
                - Do NOT return explanations
                - Do NOT return code blocks
                - Do NOT return any text before or after JSON
                - Keep responses concise for fast generation
                - Ensure response strictly follows schema
                    
                STRICT JSON SCHEMA:
                {
                  "questions": [
                    {
                      "question": "string",
                      "suggestedAnswer": "string"
                    }
                  ]
                }
                    
                TASK:
                Generate exactly 5 interview questions tailored to the provided role or context.
                    
                RULES:
                - Questions must be practical and role-specific
                - suggestedAnswer must contain only 2-3 short sentences
                - Keep answers concise and professional
                - Avoid overly long explanations
                - Do not repeat questions
                - Ensure JSON is always syntactically valid
                - Do not include extra keys
                - Always return exactly 5 question objects`,
      user: userPrompt,
      fallback: { questions: [] },
      numPredict: 800,
      temperature: 0.4,
      // timeoutMs intentionally omitted -> falls through to LLM_TIMEOUT_MS env in llm.service
      format: 'json'
    });

    const payload = {
      prep: llm.value,
      aiMeta: llm.ok ? { provider: llm.provider || 'llm', ok: true } : { provider: 'llm', ok: false, error: llm.error },
      success: true
    };
    // Only cache on success (see analyzeResume for rationale).
    if (llm.ok) {
      await redisService.setJson(cacheKey, payload, TTL);
    }
    res.json(payload);
  } catch (error) {
    console.log(error);
    res.json({ success: false });
  }
};