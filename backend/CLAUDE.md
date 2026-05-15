# JobHunt Backend — Cascade Context

Living notes for myself. Update when patterns change.

---

## Stack

- **Node.js** (ESM, `"type": "module"`) + **Express 5**
- **MongoDB** + Mongoose
- **Redis** via `redis` npm pkg (RedisService) — also reused by **BullMQ** through `ioredis` (`config/queue.js`)
- **JWT** in **httpOnly cookie** named `token` (NOT localStorage on the frontend)
- **bcrypt**, **multer** (memory storage), **ClamAV** (file scanning), **Cloudinary** (storage)
- **LLM**: hybrid `llm.service.js` → Ollama (local) → Gemini → graceful fallback. Uses Ollama JSON `format: 'json'` mode for structured outputs.
- **Embeddings**: local MiniLM via `@xenova/transformers` (`utils/embedding.js`)
- **Trie**: in-memory autocomplete loaded at boot (`services/jobSearch.service.js`)

---

## Folder map

```
backend/
├── config/         db.js, queue.js (BullMQ ioredis connection)
├── controllers/    user, company, job, application, ai
├── middleware/     auth (verifies cookie JWT), subscription (rate limits), multer
├── models/         user, company, job, application
├── queues/         job.queue, resume.queue, ai.queue   (producers + queue defs)
├── workers/        job.worker, resume.worker, ai.worker, index.js (start/stop)
├── routes/
├── services/       redis, llm, ai, subscription, jobSearch
├── utils/          embedding, pdfText, datauri, cloudinary, clamav
├── scripts/        test-ai-queue.js (smoke test)
└── index.js        server bootstrap
```

---

## Env vars (the important ones)

```
PORT=8000
MONGO_URI=...
SECRET_KEY=...                  # JWT secret
REDIS_URL=redis://localhost:6379

# AI / LLM
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama3
GEMINI_API_KEY=
GEMINI_MODEL=gemini-1.5-flash-latest
LLM_TIMEOUT_MS=60000
AI_CACHE_TTL_SECONDS=900

# Freemium (FREE tier; PRO bypasses)
AI_FREE_DAILY_LIMIT=3
APPLICATION_FREE_DAILY_LIMIT=5

# Workers
WORKERS_INLINE=true             # set to false in prod to run worker.js separately
JOB_WORKER_CONCURRENCY=2
RESUME_WORKER_CONCURRENCY=2
AI_WORKER_CONCURRENCY=1

# CORS for frontend
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```

---

## Auth (gotchas!)

- Cookie name: **`token`**, httpOnly.
- Login/logout cookie flags are **env-aware**:
  - dev (`NODE_ENV !== 'production'`): `secure: false`, `sameSite: 'lax'`
  - prod: `secure: true`, `sameSite: 'none'` (requires HTTPS)
- `req.userId` and `req.userRole` are set by `middleware/auth.js` after JWT decode.
- **Login requires `role` in the body** and matches against `user.role` exactly.

### Role enum (CRITICAL)
`User.role` enum is `['recruiter', 'jobSeeker']` — **camelCase `jobSeeker`**, not `jobseeker`. Frontend forms must send the exact string.

---

## Subscription / Freemium

- `User` has `subscription` (`'FREE'|'PRO'`), `isPro`, `proSince`.
- Endpoints: `POST /api/user/upgrade`, `GET /api/user/subscription`.
- Middleware:
  - `aiUsageLimit` → wraps AI routes; INCRs `jobhunt:ai:usage:userId:<id>:date:YYYY-MM-DD`
  - `applicationLimit` → wraps application apply route
- **Fail-open** if Redis is down (never block users on infra).
- Response headers on rate-limited routes: `X-RateLimit-Limit`, `X-RateLimit-Remaining`.
- **Semantic search (`POST /api/ai/search`) is intentionally free and unrestricted.**

---

## BullMQ Queues / Workers

| Queue | Producer | Worker handles |
|---|---|---|
| `job`    | `postJob` controller         | `generateEmbedding` → after embed, enqueues `prewarmJobInterviewPrep` on AI queue |
| `resume` | profile update controller    | `generateResumeEmbedding` → enqueues `prewarmResumeAnalysis` |
| `ai`     | other workers                | `prewarmResumeAnalysis`, `prewarmJobInterviewPrep` |

- Shared ioredis connection (`config/queue.js`).
- 3 retries, exponential backoff (2s, 4s, 8s).
- Inline-in-process by default (`WORKERS_INLINE=true`); standalone via `worker.js` for prod.
- All queues + workers log `[queue:X]` / `[worker:X]` with `added/start/done/fail`.

### Pre-computed cache keys (workers populate, controllers read)
```
jobhunt:ai:resume_analysis:<userId>
jobhunt:ai:interview_prep:job:<jobId>      # job-scoped, shared across users
```

### Known race condition (deferred)
If a user calls `/api/ai/interview-prep` while the worker is still generating, both compute. Acceptable for current scale. Lock pattern (`<key>:lock`) noted for later.

---

## Key conventions

- **Controllers always wrap in try/catch** and return `{ success: bool, message?, ... }`.
- **Cache pattern**: read Redis → MISS → compute → write Redis (TTL from env). `services/redis.service.js` exposes `getJson`, `setJson`, `delByPrefix` (uses SCAN, not KEYS).
- **`logCache(key, hit)`** helper used in AI controller for visibility.
- **LLM JSON mode**: pass `format: 'json'` to `llmService.generateResponse` to force valid JSON (no truncation). Use `safeParseJson` helper.
- Prefer **enqueueing** over `setImmediate` for any heavy work after responding.
- `delByPrefix` is invoked when underlying data changes (e.g. new job posted invalidates `jobhunt:ai:recommendation:*`).

---

## API surface (high-level)

```
/api/user        register, login, logout, update, upgrade, subscription
/api/company     register, get (mine), getbyid, update
/api/job         post (recruiter), get (search+filter+page), :id, getadminjobs, suggest, count
/api/application  apply/:id, get (mine), :id/applicants, status/:id/update
/api/ai          analyze-resume, generate-cover-letter, interview-prep, recommend-jobs, search
```

All `/api/ai/*` (except `search`) and `/api/application/apply/:id` are subject to freemium daily limits.

---

## Things I've already burned time on (don't repeat)

1. Hard-coded `secure: true` on cookies broke local login silently — now env-aware.
2. CORS wasn't enabled at all originally; needs `credentials: true` + explicit origin allowlist (no wildcard with credentials).
3. Role enum `jobSeeker` (camelCase) tripped the frontend.
4. `redisService.del(...keysToDelete)` — uses spread; OK with current `redis` v4 client.
5. AI prompts that ask for JSON should use Ollama's native `format: 'json'` to avoid truncated output.
