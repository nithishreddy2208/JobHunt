// Pure helper functions used by the JobSeeker dashboard to derive UI-only
// "insight" numbers from the data the backend already returns. We deliberately
// avoid adding new endpoints — every score/percentage in this file is a
// client-side aggregation of the auth user, the resume analysis payload, and
// the recommendation payload.
//
// Heuristics here are tuned for *display*, not decision-making; the goal is to
// give the seeker a single visually coherent dashboard.

const clampPct = (n) => Math.max(0, Math.min(100, Math.round(Number(n) || 0)));

/**
 * Profile completion: 0..100 based on which profile fields are populated.
 * Each field has a fixed weight so the bar moves predictably as the user
 * fills in their profile.
 */
export const computeProfileCompletion = (user) => {
  if (!user) return { percent: 0, missing: ['everything'] };

  const checks = [
    { key: 'name', ok: !!(user.name && user.name.trim()), weight: 10 },
    { key: 'email', ok: !!(user.email && user.email.trim()), weight: 10 },
    { key: 'photo', ok: !!user?.profile?.photo, weight: 15 },
    { key: 'bio', ok: !!(user?.profile?.bio && user.profile.bio.trim().length >= 20), weight: 15 },
    { key: 'skills', ok: Array.isArray(user?.profile?.skills) && user.profile.skills.length >= 3, weight: 20 },
    { key: 'resume', ok: !!user?.profile?.resume, weight: 20 },
    { key: 'resumeText', ok: !!(user?.profile?.resumeText && user.profile.resumeText.length > 100), weight: 10 }
  ];

  const total = checks.reduce((s, c) => s + c.weight, 0);
  const earned = checks.reduce((s, c) => s + (c.ok ? c.weight : 0), 0);
  const percent = clampPct((earned / total) * 100);

  const labelFor = {
    name: 'Add your name',
    email: 'Add an email',
    photo: 'Upload a profile photo',
    bio: 'Write a short bio (20+ chars)',
    skills: 'List 3+ skills',
    resume: 'Upload a resume',
    resumeText: 'Resume text not extracted yet'
  };

  return {
    percent,
    missing: checks.filter((c) => !c.ok).map((c) => labelFor[c.key])
  };
};

/**
 * Derives a single "ATS-readiness" score from the resume analysis output.
 * The backend doesn't compute one explicitly; this collapses the three
 * existing signals (skills extracted, missing skills, suggestions) into a
 * 0..100 score the UI can show on a circular ring.
 */
export const computeAtsScore = ({ analysis, profileCompletion }) => {
  if (!analysis) {
    // Without a resume analysis we still want to show *something* useful
    // tied to profile health.
    return clampPct((profileCompletion?.percent || 0) * 0.6);
  }

  const skills = Array.isArray(analysis.extractedSkills) ? analysis.extractedSkills : [];
  const missing = Array.isArray(analysis.missingSkills) ? analysis.missingSkills : [];
  const suggestions = Array.isArray(analysis.suggestions) ? analysis.suggestions : [];

  // 0..50: skill density. 8 extracted skills = full credit.
  const skillScore = Math.min(50, (skills.length / 8) * 50);
  // 0..30: low number of missing skills boosts the score.
  // 0 missing = 30, 7+ missing = 0.
  const missingPenalty = Math.max(0, 30 - missing.length * 4);
  // 0..20: profile completion contribution so a clean profile is rewarded
  // even before AI analysis runs again.
  const profileBoost = (profileCompletion?.percent || 0) * 0.2;
  // Each suggestion is a flag the recruiter ATS system might surface, so we
  // soft-penalize them (capped) — a fully clean resume returns zero.
  const suggestionPenalty = Math.min(10, suggestions.length * 2);

  return clampPct(skillScore + missingPenalty + profileBoost - suggestionPenalty);
};

/**
 * Match insights derived from the recommendation payload. The recommend-jobs
 * endpoint already returns each job with a cosine `score` (0..1). We turn
 * that into a friendlier 0..100 % and aggregate.
 */
export const cosineToMatchPct = (s) => {
  const v = Number(s);
  if (!Number.isFinite(v)) return 0;
  const clamped = Math.max(0, Math.min(1, v));
  // Same stretched window the recruiter side uses (utils/cosine.js) so the
  // two halves of the platform feel numerically consistent.
  const stretched = (clamped - 0.2) / (0.85 - 0.2);
  return clampPct(Math.max(0, Math.min(1, stretched)) * 100);
};

export const summarizeRecommendations = (recommendations) => {
  const jobs = Array.isArray(recommendations?.jobs) ? recommendations.jobs : [];
  if (jobs.length === 0) {
    return { count: 0, avgMatch: 0, topMatch: 0, topJob: null, domains: [] };
  }
  const scored = jobs.map((j) => ({ ...j, matchPct: cosineToMatchPct(j.score) }));
  const avg = scored.reduce((s, j) => s + j.matchPct, 0) / scored.length;
  const top = [...scored].sort((a, b) => b.matchPct - a.matchPct)[0];

  // Domains: derive from jobType buckets so the user sees where the AI
  // is steering them most.
  const counts = new Map();
  for (const j of scored) {
    const k = (j.jobType || 'Other').toString();
    counts.set(k, (counts.get(k) || 0) + 1);
  }
  const domains = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([name, count]) => ({ name, count, share: clampPct((count / scored.length) * 100) }));

  return {
    count: scored.length,
    avgMatch: clampPct(avg),
    topMatch: top?.matchPct ?? 0,
    topJob: top || null,
    domains,
    jobs: scored
  };
};

/**
 * Compares a job's required skills against the candidate's listed skills +
 * resume tokens (normalized) and returns matching/missing skills + a
 * percentage. Used on the recommendations page.
 */
const normalize = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9+#.]+/g, ' ').trim();

const buildCandidateBag = (user) => {
  const bag = new Set();
  const skills = Array.isArray(user?.profile?.skills) ? user.profile.skills : [];
  for (const s of skills) bag.add(normalize(s));
  const text = String(user?.profile?.resumeText || '');
  if (text) {
    text
      .toLowerCase()
      .split(/[^a-z0-9+#.]+/)
      .filter((t) => t.length > 1)
      .forEach((t) => bag.add(t));
  }
  return bag;
};

export const compareJobSkillsToUser = (job, user) => {
  const reqs = Array.isArray(job?.requirements) ? job.requirements : [];
  const expanded = [];
  for (const r of reqs) {
    String(r)
      .split(/[,\/|]/)
      .map((p) => p.trim())
      .filter(Boolean)
      .forEach((p) => expanded.push(p));
  }
  const unique = [...new Set(expanded)];

  const bag = buildCandidateBag(user);
  const matched = [];
  const missing = [];
  for (const skill of unique) {
    if (bag.has(normalize(skill))) matched.push(skill);
    else missing.push(skill);
  }
  const skillRatio = unique.length ? matched.length / unique.length : 0;
  return { matched, missing, skillScorePct: clampPct(skillRatio * 100) };
};

/**
 * Application stats derived from the seeker's own application list. Used to
 * power the "interview readiness" / pipeline mini-stats on the dashboard.
 */
export const summarizeApplications = (applications) => {
  const list = Array.isArray(applications) ? applications : [];
  const totals = list.reduce(
    (acc, a) => {
      const s = (a.status || 'pending').toLowerCase();
      acc.total += 1;
      acc[s] = (acc[s] || 0) + 1;
      return acc;
    },
    { total: 0, pending: 0, shortlisted: 0, accepted: 0, declined: 0 }
  );
  const responseRate =
    totals.total === 0
      ? 0
      : clampPct(((totals.shortlisted + totals.accepted + totals.declined) / totals.total) * 100);
  return { totals, responseRate };
};

/**
 * Application stages for the timeline UI. Order matters — earlier stages are
 * always considered "completed" once a later stage is reached, so the bar
 * fills naturally.
 */
export const APPLICATION_STAGES = [
  { key: 'applied', label: 'Applied' },
  { key: 'pending', label: 'Under Review' },
  { key: 'shortlisted', label: 'Shortlisted' },
  { key: 'accepted', label: 'Accepted' }
];

export const stageIndexFor = (status) => {
  const s = (status || 'pending').toLowerCase();
  if (s === 'declined') return -1; // special-cased in the UI
  if (s === 'accepted') return 3;
  if (s === 'shortlisted') return 2;
  if (s === 'pending') return 1;
  return 0;
};
