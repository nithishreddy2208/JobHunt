/**
 * Recruiter-facing AI controllers.
 * ----------------------------------------------------------------------------
 * All endpoints here are mounted under `/api/ai/recruiter/*` and require an
 * authenticated recruiter. They reuse the existing AI infrastructure:
 *   - precomputed job + candidate embeddings  (no live embedding generation)
 *   - cosineSimilarity from utils/cosine
 *   - llmService via aiService.generateWithLlm  (OpenRouter -> Ollama fallback)
 *   - redisService for caching every expensive output
 *
 * Ownership: every job-scoped endpoint verifies that `job.created_by` matches
 * `req.userId` so a recruiter can only inspect candidates for their own jobs.
 */

import { Job } from '../models/job.model.js';
import { Application } from '../models/application.model.js';
import { ReadModels } from '../db/index.js';
import { redisService } from '../services/redis.service.js';
import { aiService } from '../services/ai.service.js';
import { cosineSimilarity, cosineToMatchPercent } from '../utils/cosine.js';

const TTL = Number(process.env.AI_CACHE_TTL_SECONDS) || 900;
const SUMMARY_TTL = Number(process.env.AI_SUMMARY_TTL_SECONDS) || 60 * 60 * 24; // 24h
const SHORTLIST_TTL = Number(process.env.AI_SHORTLIST_TTL_SECONDS) || 60 * 30; // 30m

const log = (key, hit) => {
  console.log(`[redis] ${hit ? 'HIT' : 'MISS'} ${key}`);
};

// ─── helpers ───────────────────────────────────────────────────────────────

const normalize = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9+#.]+/g, ' ').trim();

const tokenize = (text) =>
  new Set(
    normalize(text)
      .split(/\s+/)
      .filter((t) => t.length > 1)
  );

/**
 * Extract candidate skill set from profile.skills plus tokens in resumeText.
 * We use a permissive token set because the goal is "does this candidate
 * mention X anywhere?" — false positives are cheap (they only inflate the
 * matched-skills list slightly); false negatives hurt match quality.
 */
const buildCandidateBag = (user) => {
  const bag = new Set();
  const skills = Array.isArray(user?.profile?.skills) ? user.profile.skills : [];
  for (const s of skills) bag.add(normalize(s));
  const resumeText = String(user?.profile?.resumeText || '');
  if (resumeText) {
    for (const t of tokenize(resumeText)) bag.add(t);
  }
  return bag;
};

const buildJobSkillList = (job) => {
  const reqs = Array.isArray(job?.requirements) ? job.requirements : [];
  // Split on commas/slashes so "React, Node.js" expands to two skills.
  const out = [];
  for (const r of reqs) {
    String(r)
      .split(/[,\/|]/)
      .map((p) => p.trim())
      .filter(Boolean)
      .forEach((p) => out.push(p));
  }
  return Array.from(new Set(out));
};

/**
 * Compares one job's skills against a candidate bag and returns
 * { matched, missing } using exact-token containment in the bag.
 */
const compareSkills = (jobSkills, candidateBag) => {
  const matched = [];
  const missing = [];
  for (const skill of jobSkills) {
    const tok = normalize(skill);
    const present = tok && candidateBag.has(tok);
    if (present) matched.push(skill);
    else missing.push(skill);
  }
  return { matched, missing };
};

const verifyJobOwnership = async (jobId, recruiterId) => {
  if (!jobId) return { error: { status: 400, message: 'jobId is required' } };
  const job = await Job.findById(jobId).lean();
  if (!job) return { error: { status: 404, message: 'Job not found' } };
  if (String(job.created_by) !== String(recruiterId)) {
    return { error: { status: 403, message: 'Not authorized for this job' } };
  }
  return { job };
};

/**
 * Pulls applicants for a job, joined with their profile fields we need for
 * scoring + display. Read-routed.
 */
const loadApplicantsForJob = async (jobId) => {
  return ReadModels.Application.find({ job: jobId })
    .populate({
      path: 'applicant',
      select: 'name email profile.skills profile.bio profile.embedding profile.resumeText profile.resume profile.resumeName'
    })
    .lean();
};

const scoreCandidate = (job, jobSkills, application) => {
  const user = application?.applicant || {};
  const candidateBag = buildCandidateBag(user);
  const { matched, missing } = compareSkills(jobSkills, candidateBag);

  const cosine = cosineSimilarity(job.embedding, user?.profile?.embedding);
  const semanticScore = cosineToMatchPercent(cosine);

  // Skill-match contributes alongside semantic similarity. We weight semantic
  // 65/skills 35 because the embedding already captures synonyms (e.g.
  // "Node" vs "Node.js") that the exact-token skill check misses.
  const skillRatio = jobSkills.length ? matched.length / jobSkills.length : 0;
  const skillScore = Math.round(skillRatio * 100);

  const matchScore = Math.round(0.65 * semanticScore + 0.35 * skillScore);
  const resumeQuality = Math.min(100, Math.round((String(user?.profile?.resumeText || '').length / 1500) * 100));

  return {
    applicationId: String(application._id),
    applicantId: String(user._id || ''),
    name: user.name || 'Unknown',
    email: user.email || '',
    status: application.status,
    matchScore,
    semanticScore,
    skillScore,
    resumeQuality,
    matchedSkills: matched.slice(0, 8),
    missingSkills: missing.slice(0, 8),
    hasEmbedding: Array.isArray(user?.profile?.embedding) && user.profile.embedding.length > 0
  };
};

// ─── 1) Match scores for every applicant of a job ──────────────────────────
export const matchScoresForJob = async (req, res) => {
  try {
    const jobId = req.params.jobId;
    const { job, error } = await verifyJobOwnership(jobId, req.userId);
    if (error) return res.status(error.status).json({ success: false, message: error.message });

    const cacheKey = `jobhunt:ai:recruiter:match:${jobId}`;
    const cached = await redisService.getJson(cacheKey);
    if (cached) {
      log(cacheKey, true);
      return res.json(cached);
    }
    log(cacheKey, false);

    if (!Array.isArray(job.embedding) || job.embedding.length === 0) {
      return res.json({
        success: true,
        message: 'Job embedding not ready yet. Try again in a moment.',
        scores: [],
        ready: false
      });
    }

    const jobSkills = buildJobSkillList(job);
    const applications = await loadApplicantsForJob(jobId);

    const scores = applications
      .map((app) => scoreCandidate(job, jobSkills, app))
      .sort((a, b) => b.matchScore - a.matchScore);

    const payload = {
      success: true,
      ready: true,
      jobId,
      jobSkills,
      scores
    };
    await redisService.setJson(cacheKey, payload, TTL);
    res.json(payload);
  } catch (err) {
    console.log('matchScoresForJob error:', err?.message || err);
    res.status(500).json({ success: false, message: 'Failed to compute match scores' });
  }
};

// ─── 2) AI candidate summary ───────────────────────────────────────────────
export const candidateSummary = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const application = await Application.findById(applicationId)
      .populate({ path: 'job', select: 'title description requirements created_by experienceLevel' })
      .populate({ path: 'applicant', select: 'name profile.bio profile.skills profile.resumeText' });

    if (!application || !application.job) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }
    if (String(application.job.created_by) !== String(req.userId)) {
      return res.status(403).json({ success: false, message: 'Not authorized for this application' });
    }

    const user = application.applicant || {};
    const resumeText = String(user?.profile?.resumeText || '').trim();
    if (!resumeText && !(user?.profile?.skills || []).length) {
      return res.json({
        success: true,
        summary: {
          summary: 'No resume text or skills available for this candidate.',
          strengths: [],
          weaknesses: [],
          roleSuitability: 'unknown',
          experience: ''
        },
        aiMeta: { provider: 'llm', ok: false, skipped: true }
      });
    }

    const cacheKey = `jobhunt:ai:recruiter:summary:${applicationId}`;
    const cached = await redisService.getJson(cacheKey);
    if (cached) {
      log(cacheKey, true);
      return res.json(cached);
    }
    log(cacheKey, false);

    const job = application.job;
    const llm = await aiService.generateWithLlm({
      system: `You are an experienced technical recruiter assistant.

IMPORTANT RULES:
- Return ONLY valid JSON, no markdown, no code fences, no preamble.
- Be concise and recruiter-friendly.
- Output must strictly match the schema.

STRICT JSON SCHEMA:
{
  "summary": "string (1-2 sentences, recruiter-facing)",
  "strengths": ["string", "string", "string"],
  "weaknesses": ["string", "string"],
  "roleSuitability": "Strong fit" | "Moderate fit" | "Weak fit",
  "experience": "string (1 short sentence summarising seniority)"
}

RULES:
- strengths: 2-4 short bullets, each under 12 words.
- weaknesses: 1-3 short bullets, each under 12 words.
- Focus on evidence from the resume and how it aligns with the target role.
- Never invent facts not present in the inputs.`,
      user: `Target role: ${job.title}
Required experience: ${job.experienceLevel || 'unspecified'}
Job requirements: ${(job.requirements || []).join(', ') || 'n/a'}

Candidate name: ${user.name || 'Candidate'}
Candidate listed skills: ${(user?.profile?.skills || []).join(', ') || 'n/a'}
Candidate resume:
${resumeText.slice(0, 6000)}`,
      fallback: {
        summary: 'AI summary unavailable.',
        strengths: [],
        weaknesses: [],
        roleSuitability: 'unknown',
        experience: ''
      },
      numPredict: 500,
      temperature: 0.2,
      format: 'json'
    });

    const payload = {
      success: true,
      summary: llm.value,
      aiMeta: llm.ok
        ? { provider: llm.provider || 'llm', ok: true }
        : { provider: 'llm', ok: false, error: llm.error }
    };
    if (llm.ok) await redisService.setJson(cacheKey, payload, SUMMARY_TTL);
    res.json(payload);
  } catch (err) {
    console.log('candidateSummary error:', err?.message || err);
    res.status(500).json({ success: false, message: 'Failed to generate summary' });
  }
};

// ─── 3) Smart shortlist ────────────────────────────────────────────────────
export const autoShortlist = async (req, res) => {
  try {
    const { jobId } = req.params;
    const topN = Math.max(1, Math.min(50, Number(req.query.top) || 5));
    const { job, error } = await verifyJobOwnership(jobId, req.userId);
    if (error) return res.status(error.status).json({ success: false, message: error.message });

    const cacheKey = `jobhunt:ai:recruiter:shortlist:${jobId}:${topN}`;
    const cached = await redisService.getJson(cacheKey);
    if (cached) {
      log(cacheKey, true);
      return res.json(cached);
    }
    log(cacheKey, false);

    if (!Array.isArray(job.embedding) || job.embedding.length === 0) {
      return res.json({
        success: true,
        ready: false,
        message: 'Job embedding not ready yet.',
        shortlist: []
      });
    }

    const jobSkills = buildJobSkillList(job);
    const applications = await loadApplicantsForJob(jobId);
    const scored = applications.map((app) => scoreCandidate(job, jobSkills, app));

    const ranked = scored
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, topN)
      .map((s) => {
        // Build a deterministic, recruiter-readable shortlist reason locally
        // (no LLM call here — keeps the dashboard fast and avoids quota use).
        const reasons = [];
        if (s.matchedSkills.length) {
          reasons.push(`strong ${s.matchedSkills.slice(0, 3).join(' + ')} alignment`);
        }
        if (s.semanticScore >= 60) reasons.push('high semantic fit with the JD');
        if (s.resumeQuality >= 60) reasons.push('detailed resume');
        if (!reasons.length) reasons.push('above-threshold overall match');

        const confidence = Math.min(99, Math.max(40, Math.round(s.matchScore * 0.9 + s.resumeQuality * 0.1)));

        return {
          ...s,
          confidence,
          reason: `Selected because of ${reasons.join(', ')}.`
        };
      });

    const payload = { success: true, ready: true, jobId, shortlist: ranked };
    await redisService.setJson(cacheKey, payload, SHORTLIST_TTL);
    res.json(payload);
  } catch (err) {
    console.log('autoShortlist error:', err?.message || err);
    res.status(500).json({ success: false, message: 'Failed to shortlist candidates' });
  }
};

// ─── 4) Recruiter analytics for a job ──────────────────────────────────────
export const jobAnalytics = async (req, res) => {
  try {
    const { jobId } = req.params;
    const { job, error } = await verifyJobOwnership(jobId, req.userId);
    if (error) return res.status(error.status).json({ success: false, message: error.message });

    const cacheKey = `jobhunt:ai:recruiter:analytics:${jobId}`;
    const cached = await redisService.getJson(cacheKey);
    if (cached) {
      log(cacheKey, true);
      return res.json(cached);
    }
    log(cacheKey, false);

    const jobSkills = buildJobSkillList(job);
    const applications = await loadApplicantsForJob(jobId);
    const total = applications.length;

    if (total === 0) {
      const empty = {
        success: true,
        jobId,
        totals: { total: 0, shortlisted: 0, accepted: 0, declined: 0, pending: 0 },
        averageMatchScore: 0,
        topSkills: [],
        missingSkills: [],
        strongest: null,
        weakest: null,
        scoreBuckets: []
      };
      await redisService.setJson(cacheKey, empty, TTL);
      return res.json(empty);
    }

    const hasJobEmbedding = Array.isArray(job.embedding) && job.embedding.length > 0;
    const scored = hasJobEmbedding
      ? applications.map((app) => scoreCandidate(job, jobSkills, app))
      : [];

    const totals = applications.reduce(
      (acc, a) => {
        const s = a.status || 'pending';
        acc.total += 1;
        acc[s] = (acc[s] || 0) + 1;
        return acc;
      },
      { total: 0, shortlisted: 0, accepted: 0, declined: 0, pending: 0 }
    );

    // Skill frequency across applicants (top mentioned among job's required skills).
    const matchedFreq = new Map();
    const missingFreq = new Map();
    for (const s of scored) {
      for (const k of s.matchedSkills) matchedFreq.set(k, (matchedFreq.get(k) || 0) + 1);
      for (const k of s.missingSkills) missingFreq.set(k, (missingFreq.get(k) || 0) + 1);
    }

    const topSkills = [...matchedFreq.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([skill, count]) => ({ skill, count, share: Math.round((count / total) * 100) }));

    const missingSkills = [...missingFreq.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([skill, count]) => ({ skill, count, share: Math.round((count / total) * 100) }));

    const sortedByScore = [...scored].sort((a, b) => b.matchScore - a.matchScore);
    const averageMatchScore =
      scored.length === 0
        ? 0
        : Math.round(scored.reduce((s, c) => s + c.matchScore, 0) / scored.length);

    // Bucketed distribution for the heatmap / histogram on the FE.
    const buckets = [
      { label: '0-20', min: 0, max: 20, count: 0 },
      { label: '21-40', min: 21, max: 40, count: 0 },
      { label: '41-60', min: 41, max: 60, count: 0 },
      { label: '61-80', min: 61, max: 80, count: 0 },
      { label: '81-100', min: 81, max: 100, count: 0 }
    ];
    for (const s of scored) {
      const b = buckets.find((b) => s.matchScore >= b.min && s.matchScore <= b.max);
      if (b) b.count += 1;
    }

    const payload = {
      success: true,
      jobId,
      ready: hasJobEmbedding,
      totals,
      averageMatchScore,
      topSkills,
      missingSkills,
      strongest: sortedByScore[0] || null,
      weakest: sortedByScore[sortedByScore.length - 1] || null,
      scoreBuckets: buckets
    };
    await redisService.setJson(cacheKey, payload, TTL);
    res.json(payload);
  } catch (err) {
    console.log('jobAnalytics error:', err?.message || err);
    res.status(500).json({ success: false, message: 'Failed to compute analytics' });
  }
};

// ─── 5) JD optimizer ───────────────────────────────────────────────────────
export const optimizeJobDescription = async (req, res) => {
  try {
    const { description, title, requirements } = req.body || {};
    const draft = String(description || '').trim();
    if (!draft || draft.length < 20) {
      return res.status(400).json({
        success: false,
        message: 'description (>= 20 chars) is required'
      });
    }

    // Hash the input so we don't repeatedly call the LLM for the same draft.
    const hash = Buffer.from(`${title || ''}::${draft}`).toString('base64').slice(0, 64);
    const cacheKey = `jobhunt:ai:recruiter:optimize-jd:${hash}`;
    const cached = await redisService.getJson(cacheKey);
    if (cached) {
      log(cacheKey, true);
      return res.json(cached);
    }
    log(cacheKey, false);

    const llm = await aiService.generateWithLlm({
      system: `You are a professional job-description writer and ATS expert.

IMPORTANT RULES:
- Return ONLY valid JSON. No markdown, no commentary, no code fences.
- Keep output production-ready and concise.

STRICT JSON SCHEMA:
{
  "optimizedDescription": "string (3-6 short paragraphs)",
  "responsibilities": ["string", "string", "string", "string", "string"],
  "requirements": ["string", "string", "string", "string", "string"],
  "improvements": ["string", "string", "string"]
}

RULES:
- optimizedDescription: improve clarity, tone, ATS keyword coverage, and structure.
- responsibilities: 4-7 short bullets, action-verb-first.
- requirements: 4-7 short bullets, evaluable criteria.
- improvements: 2-4 short notes describing what you changed and why.
- Never fabricate company-specific perks that weren't in the input.`,
      user: `Job title: ${title || 'Unspecified'}
Existing requirements (comma-separated): ${Array.isArray(requirements) ? requirements.join(', ') : String(requirements || '')}

Draft description:
${draft}`,
      fallback: {
        optimizedDescription: draft,
        responsibilities: [],
        requirements: [],
        improvements: []
      },
      numPredict: 1200,
      temperature: 0.3,
      format: 'json'
    });

    const payload = {
      success: true,
      original: draft,
      optimized: llm.value,
      aiMeta: llm.ok
        ? { provider: llm.provider || 'llm', ok: true }
        : { provider: 'llm', ok: false, error: llm.error }
    };
    if (llm.ok) await redisService.setJson(cacheKey, payload, TTL);
    res.json(payload);
  } catch (err) {
    console.log('optimizeJobDescription error:', err?.message || err);
    res.status(500).json({ success: false, message: 'Failed to optimize JD' });
  }
};

// ─── 6) Email generator ────────────────────────────────────────────────────
const EMAIL_TYPES = new Set(['invitation', 'shortlist', 'rejection', 'followup']);

export const generateEmail = async (req, res) => {
  try {
    const {
      type,
      candidateName,
      jobTitle,
      companyName,
      recruiterName,
      notes
    } = req.body || {};

    const t = String(type || '').toLowerCase();
    if (!EMAIL_TYPES.has(t)) {
      return res.status(400).json({
        success: false,
        message: `type must be one of: ${[...EMAIL_TYPES].join(', ')}`
      });
    }
    if (!candidateName || !jobTitle) {
      return res.status(400).json({
        success: false,
        message: 'candidateName and jobTitle are required'
      });
    }

    const hash = Buffer.from(
      `${t}|${candidateName}|${jobTitle}|${companyName || ''}|${recruiterName || ''}|${notes || ''}`
    )
      .toString('base64')
      .slice(0, 80);
    const cacheKey = `jobhunt:ai:recruiter:email:${hash}`;
    const cached = await redisService.getJson(cacheKey);
    if (cached) {
      log(cacheKey, true);
      return res.json(cached);
    }
    log(cacheKey, false);

    const intent = {
      invitation: 'Invite the candidate to a first-round interview. Ask for a few time slots.',
      shortlist: 'Tell the candidate they have been shortlisted and outline next steps.',
      rejection: 'Politely decline the candidate. Keep it respectful, brief, and encouraging.',
      followup: 'Follow up after silence: re-engage the candidate and ask if they are still interested.'
    }[t];

    const llm = await aiService.generateWithLlm({
      system: `You are an executive recruiter writing professional, warm but concise emails.

IMPORTANT RULES:
- Return ONLY valid JSON. No markdown, no commentary, no code fences.

STRICT JSON SCHEMA:
{
  "subject": "string (under 80 chars)",
  "body": "string (plain text, 4-8 short paragraphs, uses \\n for line breaks)"
}

RULES:
- Tone: professional, friendly, never robotic.
- Address the candidate by name.
- Reference the role title.
- Sign off with the recruiter / company name when provided.
- Body length under 180 words.
- Never invent salary numbers, dates, or interview panels unless given in notes.`,
      user: `Email purpose: ${intent}

Candidate name: ${candidateName}
Job title: ${jobTitle}
Company name: ${companyName || 'Our company'}
Recruiter name: ${recruiterName || 'The hiring team'}
Extra notes from recruiter: ${notes || 'none'}`,
      fallback: {
        subject: `${jobTitle} — update from ${companyName || 'the hiring team'}`,
        body: `Hi ${candidateName},\n\nAI-generated content is currently unavailable. Please try again shortly.\n\nBest regards,\n${recruiterName || 'The hiring team'}`
      },
      numPredict: 700,
      temperature: 0.5,
      format: 'json'
    });

    const payload = {
      success: true,
      type: t,
      email: llm.value,
      aiMeta: llm.ok
        ? { provider: llm.provider || 'llm', ok: true }
        : { provider: 'llm', ok: false, error: llm.error }
    };
    if (llm.ok) await redisService.setJson(cacheKey, payload, TTL);
    res.json(payload);
  } catch (err) {
    console.log('generateEmail error:', err?.message || err);
    res.status(500).json({ success: false, message: 'Failed to generate email' });
  }
};
