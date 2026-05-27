// Shared cosine-similarity helper used across the AI stack.
// Kept tiny + branch-light so it can run inside hot loops (e.g. ranking
// every applicant of a job against a job embedding).

export const cosineSimilarity = (a, b) => {
  if (!Array.isArray(a) || !Array.isArray(b)) return 0;
  if (a.length === 0 || b.length === 0) return 0;
  if (a.length !== b.length) return 0;

  let dot = 0;
  let na = 0;
  let nb = 0;

  for (let i = 0; i < a.length; i++) {
    const x = Number(a[i]);
    const y = Number(b[i]);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return 0;
    dot += x * y;
    na += x * x;
    nb += y * y;
  }

  const denom = Math.sqrt(na) * Math.sqrt(nb);
  if (!denom) return 0;
  return dot / denom;
};

// Map cosine score (typically 0.0-0.8 for MiniLM) into a recruiter-friendly
// 0-100 percent. We clamp + linearly stretch the 0.2..0.85 window because
// that's where genuine candidate<->JD matches sit in practice; below 0.2 is
// "off-topic", above 0.85 is essentially identical text.
export const cosineToMatchPercent = (score) => {
  const s = Number(score);
  if (!Number.isFinite(s)) return 0;
  const clamped = Math.max(0, Math.min(1, s));
  const stretched = (clamped - 0.2) / (0.85 - 0.2);
  return Math.round(Math.max(0, Math.min(1, stretched)) * 100);
};
