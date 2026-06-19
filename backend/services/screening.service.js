import { llmService } from './llm.service.js';

/**
 * ScreeningService
 *
 * Turns a candidate's pre-screening answers into a recruiter-facing AI match
 * score + short summary, scored against the job they applied for.
 *
 * Design goals:
 *   - NEVER throw. Application submission must succeed even if AI is down.
 *   - AI-first (OpenRouter via llmService), deterministic heuristic fallback.
 */

const clampScore = (n) => {
    const v = Math.round(Number(n));
    if (!Number.isFinite(v)) return null;
    return Math.max(0, Math.min(100, v));
};

const normalizeSkill = (s) => String(s || '').trim().toLowerCase();

/**
 * Deterministic baseline: overlap between candidate skills and job
 * requirements, lightly blended with whether key fields were provided.
 * Always returns a number so the recruiter view never shows a blank score.
 */
const heuristicScore = (job, screening) => {
    const jobSkills = new Set(
        [
            ...(Array.isArray(job?.requirements) ? job.requirements : []),
            ...String(job?.title || '').split(/[\s,/]+/)
        ].map(normalizeSkill).filter(Boolean)
    );

    const candSkills = [
        ...(screening?.skills || []),
        ...(screening?.secondarySkills || [])
    ].map(normalizeSkill).filter(Boolean);

    let overlap = 0;
    if (jobSkills.size && candSkills.length) {
        const matched = candSkills.filter((s) =>
            [...jobSkills].some((j) => j.includes(s) || s.includes(j))
        );
        overlap = matched.length / jobSkills.size;
    }

    // Completeness signal: reward candidates who answered substantive fields.
    const richFields = [
        screening?.experienceSummary,
        screening?.whyHire,
        screening?.largestProject,
        screening?.relevantExperience
    ].filter((v) => String(v || '').trim().length > 20).length;

    const base = overlap * 70 + Math.min(richFields, 4) * 7.5;
    return clampScore(base || 35);
};

const buildPrompt = (job, screening) => {
    const jobBlock = [
        `Title: ${job?.title || 'N/A'}`,
        `Location: ${job?.location || 'N/A'}`,
        `Experience level: ${job?.experienceLevel || 'N/A'}`,
        `Requirements: ${(job?.requirements || []).join(', ') || 'N/A'}`,
        `Description: ${String(job?.description || '').slice(0, 800)}`
    ].join('\n');

    const candBlock = JSON.stringify(
        {
            candidateType: screening?.candidateType,
            experienceYears: screening?.experienceYears,
            relevantExperience: screening?.relevantExperience,
            skills: screening?.skills,
            secondarySkills: screening?.secondarySkills,
            currentCTC: screening?.currentCTC,
            expectedCTC: screening?.expectedCTC,
            noticePeriod: screening?.noticePeriod,
            preferredLocation: screening?.preferredLocation,
            relocation: screening?.relocation,
            experienceSummary: screening?.experienceSummary,
            education: {
                degree: screening?.degree,
                college: screening?.college,
                graduationYear: screening?.graduationYear,
                cgpa: screening?.cgpa
            },
            whyHire: screening?.whyHire
        },
        null,
        2
    );

    return [
        'You are a senior technical recruiter for ZapCom.',
        'Assess how well the candidate fits the job using their pre-screening answers.',
        'Return STRICT JSON only, no markdown, in this exact shape:',
        '{"score": <integer 0-100>, "summary": "<max 40 words>"}',
        '',
        '=== JOB ===',
        jobBlock,
        '',
        '=== CANDIDATE ===',
        candBlock
    ].join('\n');
};

const parseAiJson = (text) => {
    if (!text) return null;
    try {
        const match = String(text).match(/\{[\s\S]*\}/);
        if (!match) return null;
        const obj = JSON.parse(match[0]);
        const score = clampScore(obj.score);
        if (score === null) return null;
        return { score, summary: String(obj.summary || '').slice(0, 280) };
    } catch {
        return null;
    }
};

/**
 * Score a candidate's screening answers against a job.
 * @returns {Promise<{ aiMatchScore: number|null, aiMatchSummary: string }>}
 */
export const scoreScreening = async (job, screening) => {
    const fallbackScore = heuristicScore(job, screening);

    if (!screening || !screening.candidateType) {
        return { aiMatchScore: fallbackScore, aiMatchSummary: '' };
    }

    try {
        const prompt = buildPrompt(job, screening);
        const res = await llmService.generateResponse(prompt, {
            numPredict: 200,
            temperature: 0.2,
            format: 'json'
        });

        if (res?.success && res.text) {
            const parsed = parseAiJson(res.text);
            if (parsed) {
                return {
                    aiMatchScore: parsed.score,
                    aiMatchSummary: parsed.summary
                };
            }
        }
        // AI returned but unparsable: keep the deterministic score.
        return { aiMatchScore: fallbackScore, aiMatchSummary: '' };
    } catch (err) {
        console.log('[screening] scoring failed, using heuristic:', err?.message || err);
        return { aiMatchScore: fallbackScore, aiMatchSummary: '' };
    }
};
