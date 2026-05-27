# JobHunt – Online Job Portal

## 📌 Project Overview

JobHunt is a full-stack web application designed to connect job seekers with recruiters. The platform allows companies to post job openings and enables candidates to search and apply for jobs easily.

The goal of this project is to build a scalable job portal that simplifies the recruitment process while giving users an intuitive and efficient experience.

---

## 🚀 Tech Stack

### Frontend

* React 18 + Vite
* Tailwind CSS + shadcn/ui (Radix primitives)
* TanStack Query (server state)
* react-hook-form + Zod (forms & validation)
* react-router-dom v6 (nested routing)
* lucide-react (icons), sonner (toasts)
* Web Speech API (voice mock interview)
* Axios (with `withCredentials`)

### Backend

* Node.js + Express.js
* BullMQ (background workers, single shared queue)
* Multer + ClamAV + Cloudinary (secure uploads)
* `@xenova/transformers` (local MiniLM embeddings)

### Database

* MongoDB
* Mongoose

### Authentication

* JSON Web Token (JWT)
* bcrypt

### Caching & Optimization

* Redis (via Docker)
* Trie (for autocomplete search)
* MongoDB Indexing

### Other Tools

* dotenv
* Git & GitHub
* Postman

---

## 💡 Core Idea of the Platform

JobHunt focuses on creating a streamlined hiring ecosystem where job seekers can easily explore opportunities while recruiters can efficiently manage applications.

Instead of complex recruitment systems, the platform aims to keep the process straightforward, organized, and transparent for both sides.

The application is designed with scalability in mind so that additional features such as job recommendations, applicant tracking, and real-time notifications can be integrated in the future.

---

## ✨ Key Functionalities

### For Job Seekers

* Personalized **dashboard** at `/` with quick links to every seeker workflow
* Profile management with PDF resume upload + photo
* Browse, prefix-autocomplete, and **semantic-search** job listings
* One-click apply with daily-limit awareness (FREE tier)
* Track applications and statuses
* AI workflows: resume analysis, cover letter, interview prep, recommendations
* **Voice mock interview** with live transcription and AI scoring

### For Recruiters

* Dedicated **/admin/\*** dashboard area with sidebar + topbar layout
* Statistics cards, recent jobs, **AI Tools quick-actions** on `/admin/dashboard`
* `/admin/post-job` — react-hook-form + Zod, inline company creation, **inline "Optimize with AI"** for the description
* `/admin/jobs` — search, filter, paginate posted jobs
* `/admin/jobs/:id/applicants` — **AI-ranked candidate list** with match-score rings, semantic / skill / resume sub-scores, matching vs missing skill chips, **AI candidate summary**, **smart auto-shortlist**, **AI email generator**, plus shortlist / accept / reject
* `/admin/jobs/:id/analytics` — per-job AI analytics: avg match, score distribution, top / missing skills, strongest / weakest candidate
* `/admin/jd-optimizer` — paste a rough JD, get an ATS-friendly rewrite (description + responsibilities + requirements + change notes)
* `/admin/email-composer` — generate invite / shortlist / rejection / follow-up emails (editable subject + body + copy)
* `/admin/profile` — name, bio, profile photo, default company
* Company registration (inline create from PostJob and Profile)

### General Features

* Secure authentication system
* Role-based access (Candidate / Recruiter)
* RESTful API architecture
* Responsive user interface

### AI Features

* Hybrid LLM support: **OpenRouter** (primary) → **Ollama local** (fallback) with retries and JSON mode for analyze-resume / interview-prep / recruiter AI endpoints
* Resume text extraction and storage for AI workflows
* Local semantic search embeddings (MiniLM via `@xenova/transformers`)
* **Job-seeker AI**: resume analysis, cover letter generation, interview preparation, job recommendations, and **mock-interview evaluation**
* **Recruiter AI suite**:
  * **Match scoring** — every applicant scored 0-100% per job (cosine on precomputed embeddings + skill-token alignment + resume-quality signal)
  * **AI candidate summary** — strengths, gaps, role suitability, experience snapshot
  * **Smart auto-shortlist** — top-N candidates with reason + confidence (no extra LLM call; deterministic from scores)
  * **JD optimizer** — rewrites rough job descriptions into ATS-friendly copy with structured responsibilities, requirements, and change notes
  * **Email generator** — invite / shortlist / rejection / follow-up drafts (subject + body)
  * **Per-job analytics** — totals, avg match, score buckets, top vs missing skills, strongest / weakest candidate
* Pre-computed caching: BullMQ workers warm resume-analysis and interview-prep results, and every recruiter AI output is Redis-cached on success only — failed / empty LLM responses are **never cached**

---

## ⚡ Performance & Optimization Enhancements

### 🔴 Redis (Caching Layer)

Redis is used to cache frequently accessed data such as job search results, reducing database load and improving response time.

#### 🛠️ Setup & Usage

##### Option 1: Redis via Docker (Local)

1️⃣ Install Docker

2️⃣ Run Redis container

```bash
docker run --name jobhunt-redis -p 6379:6379 -d redis:7-alpine
```

3️⃣ Verify Redis is running

```bash
docker exec -it jobhunt-redis redis-cli ping
```

Expected output:

```
PONG
```

4️⃣ Open Redis CLI

```bash
docker exec -it jobhunt-redis redis-cli
```

---

##### Option 2: Upstash Redis (Cloud)

1️⃣ Create an Upstash account

Go to:

```text
https://console.upstash.com/
```

2️⃣ Create a Redis database

In Upstash Console:

* Redis
* Create Database

3️⃣ Copy the Redis connection string

In your Upstash Redis database page, copy the Redis URL (TLS) that looks like:

```text
rediss://:PASSWORD@xxxxx.upstash.io:6379
```

4️⃣ Add it to backend environment variables

Add this to `backend/.env`:

```bash
REDIS_URL=rediss://:PASSWORD@xxxxx.upstash.io:6379
JOB_CACHE_TTL_SECONDS=300
```

5️⃣ Restart backend

```bash
npm run dev
```

---

#### 🔍 Useful Redis Commands (Testing)

```bash
SCAN 0 MATCH jobhunt:jobs:search:* COUNT 100
```

```bash
GET "jobhunt:jobs:search:keyword=dev:location=:jobType=:page=1:limit=10"
```

```bash
TTL "jobhunt:jobs:search:keyword=dev:location=:jobType=:page=1:limit=10"
```

---

#### 💡 How Redis is Used

* Caches job search results
* Reduces repeated database queries
* Improves API response time
* Uses Cache-Aside Pattern

---

### 🌳 Trie (Search Optimization)

Trie (Prefix Tree) is used for efficient prefix-based searching (autocomplete).

#### 🎯 Purpose

* Fast autocomplete suggestions
* Efficient prefix matching
* Better search experience

#### 🧠 How it Works

1. Job titles are loaded into a Trie

2. User types a query (e.g., "dev")

3. Trie returns matching prefixes:

   * developer
   * devops
   * device

4. Final job data is fetched from MongoDB

---

#### 🔄 Trie Refresh (Optional)

On server start, job titles are loaded into the Trie from MongoDB.

* If `JOB_TRIE_REFRESH_MS` is **not set**, the Trie is loaded **once** at startup.
* If `JOB_TRIE_REFRESH_MS` **is set** (in milliseconds), the Trie will periodically refresh from MongoDB.

Example (`backend/.env`):

```bash
JOB_TRIE_REFRESH_MS=600000
```

---

#### ⚡ Benefits

* O(n) prefix search
* Faster than regex-based search
* Scalable for large datasets

---

### 📊 MongoDB Indexing (Query Optimization)

Indexes are used to speed up database queries and avoid full collection scans.

#### 🧩 Example Indexes

```js
jobSchema.index({ title: 1, location: 1 });
userSchema.index({ email: 1 }, { unique: true });
applicationSchema.index({ jobId: 1 });
applicationSchema.index({ userId: 1 });
```

---

#### 🧠 How Indexing Helps

Without indexing:

* MongoDB scans entire collection

With indexing:

* Direct lookup using indexed fields

---

#### ⚡ Benefits

* Faster queries
* Reduced database load
* Better scalability

---

### 🔗 Combined Optimization Flow

```
User Search →
   Redis Cache (fast)
      ↓ (miss)
   MongoDB (optimized with indexes)
      ↓
   Store in Redis
```

* Trie improves search input experience
* Redis improves response time
* Indexing optimizes database queries

---

## 🗄️ MongoDB Replica-set Architecture (Read/Write Split)

JobHunt uses a **MongoDB Atlas replica set** (one primary + N secondaries) and splits traffic between two Mongoose connections to scale reads independently of writes.

### Two-connection model

| Connection | Read preference | Used for |
|---|---|---|
| **Primary** (`db/primaryConnection.js`) | `primary` | All writes; reads that need read-your-write consistency (auth, existence pre-checks, post-write reads) |
| **Read replica** (`db/readReplicaConnection.js`) | `secondaryPreferred` | Browse jobs, recruiter analytics, applicants list, applied-jobs list, AI candidate ranking, semantic search embedding scan |

Both connections target the **same Atlas cluster** — Atlas exposes the entire replica set via the SRV URI; the driver discovers all nodes and routes per-connection based on the configured read preference.

### Module layout

```
backend/db/
├── primaryConnection.js     # mongoose.connect() + readPreference: 'primary'
├── readReplicaConnection.js # mongoose.createConnection() + readPreference: 'secondaryPreferred'
├── models.js                # registers schemas on read conn; exports ReadModels proxy
└── index.js                 # connectAll(), getDbHealth(), re-exports ReadModels
```

Existing models in `backend/models/*.js` continue to work unchanged — they live on the primary connection, just like before. Read-heavy controllers opt in by importing `ReadModels`:

```js
import { ReadModels } from '../db/index.js';

// Browse jobs -> replica
const jobs = await ReadModels.Job.find(query).lean();

// Recruiter analytics -> replica
const myJobs = await ReadModels.Job.find({ created_by: req.userId }).lean();

// Embedding scan (heaviest read) -> replica
const docs = await ReadModels.Job.find({ embedding: { $type: 'array' } }).lean();
```

### Automatic fallback

`ReadModels` is a Proxy that checks the read connection's `readyState` on every access. If the replica is disconnected (or the initial connect failed), reads transparently fall back to the primary connection's models. **No API ever crashes because the replica is unavailable** — the worst case is reads served by the primary.

### Failover handling

Mongoose's underlying driver runs SDAM (Server Discovery and Monitoring) on both connections. If the Atlas primary steps down (planned maintenance, election, or outage), the driver detects the new primary within seconds and re-routes writes automatically. `serverSelectionTimeoutMS` (default 10s) caps how long the driver waits for a suitable server during a failover.

### Connection pooling

Each Mongoose connection maintains its own pool of TCP connections to MongoDB. The two pools are independent, so heavy analytics reads can't starve writes:

```bash
DB_POOL_SIZE_MAX=20      # writes
DB_POOL_SIZE_MIN=2
DB_READ_POOL_SIZE_MAX=20 # reads (defaults to DB_POOL_SIZE_MAX)
DB_READ_POOL_SIZE_MIN=2
```

### Logging

Both connections log connect / disconnect / reconnect / error events with prefixes:

```
[db:primary] connected host=ac-xxxxx-shard-00-00.mongodb.net db=jobhunt readPreference=primary
[db:replica] connected host=ac-xxxxx-shard-00-01.mongodb.net readPreference=secondaryPreferred
[db:replica] disconnected (reads will fall back to primary)
```

### Health endpoint

```
GET /api/health/db
```

Returns the live state of both connections:

```json
{
  "success": true,
  "primary": {
    "ok": true,
    "readyState": 1,
    "host": "ac-xxxxx-shard-00-00.mongodb.net",
    "db": "jobhunt",
    "readPreference": "primary"
  },
  "replica": {
    "ok": true,
    "readyState": 1,
    "host": "ac-xxxxx-shard-00-01.mongodb.net",
    "readPreference": "secondaryPreferred",
    "fallbackActive": false
  }
}
```

When `replica.ok` is false, `fallbackActive` flips to true — useful for dashboards, alerts, and load-balancer health probes. The endpoint returns 503 only if the **primary** is down (replica being down is a soft degradation, not an outage).

### Read-your-write consistency

Secondaries lag the primary by a small replication delay (typically <100ms on Atlas). Endpoints that need to read the freshest possible data — duplicate-email checks during register, existence checks before a write, loading the actor right after their own write — deliberately stay on the primary connection (the default `Job.find(...)` etc.). Only latency-tolerant analytics-style reads are routed to `ReadModels`.

### Indexing

Pre-existing indexes accelerate the queries we now run on the replica:

```js
jobSchema.index({ createdAt: -1 });
jobSchema.index({ created_by: 1, createdAt: -1 });   // recruiter "my jobs"
jobSchema.index({ jobType: 1, createdAt: -1 });
jobSchema.index({ location: 1, jobType: 1, createdAt: -1 });
jobSchema.index({ title: 'text', description: 'text' });
```

Indexes are replicated to all secondaries automatically.

---

## �️ Secure Resume Upload (Multer + ClamAV + Cloudinary)

To keep uploads safe and production-ready, the backend uses:

* **Multer**: receives uploaded files (configured to use **memory storage**).
* **ClamAV**: scans the uploaded file for malware before it is stored.
* **Cloudinary**: stores the final (safe) file and returns a CDN URL.

### 🐳 ClamAV Setup (Docker Desktop)

1️⃣ Install Docker Desktop

2️⃣ Pull ClamAV image

```bash
docker pull clamav/clamav:latest
```

3️⃣ Run ClamAV container

```bash
docker run --name jobhunt-clamav -p 3310:3310 -d clamav/clamav:latest
```

4️⃣ Verify container is running

```bash
docker ps
```

You should see `jobhunt-clamav` running and port `3310` exposed.

### 🔄 Working Flow

```
Upload →
   Multer (memory) →
      Save temp file →
         ClamAV scan →
            Safe? →
               YES → Cloudinary →
                      Save URL + originalName
               NO → Reject
```

### ✅ Why this flow

* **Security**: prevents infected files from being stored or served.
* **Performance**: memory upload avoids unnecessary disk I/O until needed.
* **Scalability**: Cloudinary offloads file storage + delivery.

---

## �📂 Project Structure (Backend)

```
backend
│
├── config
│   └── db.js                        # back-compat shim -> db/index.js
│
├── db
│   ├── primaryConnection.js         # writes + read-your-write reads
│   ├── readReplicaConnection.js     # secondaryPreferred reads
│   ├── models.js                    # ReadModels proxy with auto-fallback
│   └── index.js                     # connectAll(), getDbHealth()
│
├── controllers
│
├── models                           # schemas (used by both connections)
│
├── routes                           # incl. health.routes.js -> /api/health/db
│
├── middleware
│
├── services
│
├── queues / workers                 # BullMQ
│
├── utils
│
├── .env
├── index.js
└── package.json
```

---

## ⚙️ Installation & Setup

### 1️⃣ Clone the repository

```bash
git clone https://github.com/nithishreddy2208/jobhunt.git
```

### 2️⃣ Navigate to the project folder

```bash
cd jobhunt
```

### 3️⃣ Install dependencies

This project contains a backend Node.js app under `backend/`.

```bash
cd backend
npm install
```

### 4️⃣ Create a `.env` file

```
PORT=8000
MONGO_URI=your_mongodb_connection_string   # Atlas SRV URI: mongodb+srv://...
SECRET_KEY=your_secret_key
REDIS_URL=redis://localhost:6379
JOB_CACHE_TTL_SECONDS=300
JOB_TRIE_REFRESH_MS=600000

# MongoDB replica-set tuning (see "Replica-set Architecture" below)
READ_PREFERENCE=secondaryPreferred
DB_POOL_SIZE_MAX=20
DB_POOL_SIZE_MIN=2
DB_TIMEOUT_MS=10000
DB_SOCKET_TIMEOUT_MS=45000
# Optional: dedicated pool size for the read connection
# DB_READ_POOL_SIZE_MAX=20
# DB_READ_POOL_SIZE_MIN=2

# AI / LLM (OpenRouter primary, Ollama fallback)
OPENROUTER_API_KEY=
OPENROUTER_MODEL=meta-llama/llama-3.1-8b-instruct
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=phi
LLM_TIMEOUT_MS=60000
AI_CACHE_TTL_SECONDS=900
# Recruiter AI cache TTLs (optional overrides)
AI_SUMMARY_TTL_SECONDS=86400
AI_SHORTLIST_TTL_SECONDS=1800

# Cloudinary (resume + photo uploads)
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# Freemium limits (FREE tier only; PRO users bypass)
AI_FREE_DAILY_LIMIT=3
APPLICATION_FREE_DAILY_LIMIT=5

# BullMQ workers (single consolidated tasks worker)
WORKERS_INLINE=true
TASKS_WORKER_CONCURRENCY=2

```

### 5️⃣ Run the server

```bash
cd backend
npm run dev
```

---

## 🤖 AI Endpoints (Backend)

All AI endpoints are mounted under `/api/ai`.

* `POST /api/ai/analyze-resume` (auth, daily-limited for FREE)
* `POST /api/ai/generate-cover-letter` (auth, daily-limited for FREE)
* `POST /api/ai/interview-prep` (auth, daily-limited for FREE) — accepts `{ jobId }` for job-tailored questions or `{ role }` for free-form
* `POST /api/ai/mock-interview/evaluate` (auth, daily-limited for FREE) — single-call scoring of all answers (per-answer score, strengths, improvements, overall summary)
* `POST /api/ai/recommend-jobs` (auth, daily-limited for FREE)
* `POST /api/ai/search` — semantic job search, **always free and unrestricted**

### Recruiter AI endpoints

All mounted under `/api/ai/recruiter/*` and gated by `authentication + recruiterOnly`. Job-scoped endpoints additionally enforce ownership (`job.created_by === req.userId`).

* `GET  /api/ai/recruiter/match-score/:jobId` — per-applicant scores (semantic + skills + resume) with matched/missing skill lists, sorted desc
* `POST /api/ai/recruiter/candidate-summary/:applicationId` — LLM-generated summary, strengths, weaknesses, role-suitability, experience
* `GET  /api/ai/recruiter/shortlist/:jobId?top=N` — ranked top-N with reason + confidence
* `GET  /api/ai/recruiter/analytics/:jobId` — totals, avg match, score buckets, top / missing skills, strongest / weakest
* `POST /api/ai/recruiter/optimize-jd` — `{ title, description, requirements }` → `{ optimizedDescription, responsibilities[], requirements[], improvements[] }`
* `POST /api/ai/recruiter/generate-email` — `{ type: invitation|shortlist|rejection|followup, candidateName, jobTitle, companyName?, recruiterName?, notes? }` → `{ subject, body }`

Caching keys + TTLs:

```
jobhunt:ai:recruiter:match:<jobId>          # AI_CACHE_TTL_SECONDS         (default 900s)
jobhunt:ai:recruiter:summary:<appId>        # AI_SUMMARY_TTL_SECONDS       (default 24h)
jobhunt:ai:recruiter:shortlist:<jobId>:<N>  # AI_SHORTLIST_TTL_SECONDS     (default 1800s)
jobhunt:ai:recruiter:analytics:<jobId>      # AI_CACHE_TTL_SECONDS
jobhunt:ai:recruiter:optimize-jd:<hash>     # AI_CACHE_TTL_SECONDS
jobhunt:ai:recruiter:email:<hash>           # AI_CACHE_TTL_SECONDS
```

Match scoring uses precomputed `job.embedding` and `user.profile.embedding` so listing 100s of applicants is sub-second; no embedding work happens at request time.

### LLM provider configuration

The LLM service tries **OpenRouter first**, then falls back to a local **Ollama** model. Configure either or both:

```bash
# Primary
OPENROUTER_API_KEY=sk-or-...
OPENROUTER_MODEL=meta-llama/llama-3.1-8b-instruct

# Fallback
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=phi

LLM_TIMEOUT_MS=60000
AI_CACHE_TTL_SECONDS=900
```

Failed/empty LLM responses are **never cached**, so transient provider errors won't poison the cache.

---

## 💳 Pro Subscription (Freemium)

Freemium access control with a future-payment-ready architecture. No payment gateway is wired yet — the upgrade endpoint simulates a purchase; swapping in Razorpay/Stripe later only touches `services/subscription.service.js`.

### Tiers

| Feature | FREE | PRO |
|---|---|---|
| Semantic job search | ✅ unrestricted | ✅ unrestricted |
| AI endpoints (resume/cover letter/interview/recommend) | 3 calls / day | Unlimited |
| Job applications | 5 / day | Unlimited |

### Endpoints

* `POST /api/user/upgrade` (auth) — flips the user to PRO (accepts optional `{ paymentRef }` for future payment integration)
* `GET /api/user/subscription` (auth) — returns `{ subscription, isPro, proSince }`

### Data model

`User` has three new fields:

```js
subscription: { type: String, enum: ['FREE', 'PRO'], default: 'FREE' }
isPro:        { type: Boolean, default: false }
proSince:     { type: Date, default: null }
```

### How limiting works

Daily counters live in Redis with a 24h TTL (per user, per UTC day):

```
jobhunt:ai:usage:userId:<id>:date:YYYY-MM-DD
jobhunt:application:count:userId:<id>:date:YYYY-MM-DD
```

Middleware `aiUsageLimit` and `applicationLimit` (in `middleware/subscription.js`) use `INCR` atomically and return `429` when exceeded. PRO users bypass both. If Redis is unreachable, the middleware **fails open** (never blocks a user due to infra issues).

### Response headers

On every throttled AI / application call:

```
X-RateLimit-Limit: 3
X-RateLimit-Remaining: 2
```

---

## ⚙️ Background Jobs (BullMQ)

Heavy work (embeddings, LLM calls) runs asynchronously in BullMQ so API responses stay fast. **All background tasks share a single queue and a single worker** to minimize Redis command usage (important on Upstash's command-metered free tier). Backed by the same Redis instance used for caching.

### Single shared queue / worker

| Queue | Worker | Job names | What it does |
|---|---|---|---|
| `tasks` | `workers/tasks.worker.js` | `job-embedding`, `resume-processing`, `prewarm-resume-analysis`, `prewarm-interview-prep` | Generates embeddings, invalidates stale caches, runs LLM prewarms, populates result caches |

The legacy `queues/{job,resume,ai}.queue.js` files re-export their `enqueue*` helpers from the shared `tasks.queue` so existing call sites keep working unchanged.

### Pre-computed caches

Once a worker finishes, these keys are populated so subsequent HTTP requests return instantly:

```
jobhunt:ai:resume_analysis:<userId>
jobhunt:ai:interview_prep:job:<jobId>
```

### Reliability

* **Retries:** 3 attempts with exponential backoff (2s, 4s, 8s)
* **Auto-cleanup:** completed jobs removed after 1h, failed after 24h
* **Logging:** every queue and worker logs `added`, `start`, `done`, `fail` with attempt number
* **Crash safety:** jobs stay in Redis if a worker dies and are picked up when it restarts

### Running workers

**Development (default):** inline workers are **disabled by default** in dev to prevent Upstash command explosion from nodemon hot-reloads leaking BullMQ connections. Set `WORKERS_INLINE=true` if you want them in-process.

```bash
npm run dev          # API only, no inline workers
# or, in a second terminal, run the worker explicitly:
npm run worker
```

**Production:** keep `WORKERS_INLINE=false` and run the worker as its own process.

```bash
# terminal 1 – API
npm start

# terminal 2+ – one or more worker processes
npm run worker
```

---

## 🧑‍💼 Recruiter Dashboard (`/admin/*`)

A dedicated, role-gated area for recruiters with its own layout (collapsible sidebar + topbar). The global navbar is suppressed on `/admin/*` to avoid a double header. Authenticated recruiters who land on `/` are auto-redirected to `/admin/dashboard`.

### Routes

| Path | Page |
|---|---|
| `/admin/dashboard` | Stats cards, recent jobs, **AI Tools quick-actions** |
| `/admin/post-job` | Create a new job (react-hook-form + Zod) with **inline AI JD optimize** |
| `/admin/jobs` | Manage posted jobs (search / filter / paginate) |
| `/admin/jobs/:id/applicants` | **AI-ranked applicants** with match scores, AI summary modal, auto-shortlist, AI email generator |
| `/admin/jobs/:id/analytics` | **Per-job AI analytics** (heatmap, top/missing skills, highlights) |
| `/admin/jd-optimizer` | Paste a rough JD, get an ATS-friendly AI rewrite |
| `/admin/email-composer` | AI-generated recruiter emails (invite / shortlist / reject / follow-up) |
| `/admin/profile` | Recruiter profile, photo, default company |

### Architecture

* **`RecruiterProtectedRoute`** — anon → `/login`, job-seeker → `/`, recruiter → render
* **`RecruiterLayout`** — responsive sidebar + topbar with `<Outlet />`; AI-tagged sidebar entries for AI-only pages
* **`hooks/recruiter/useRecruiterQueries.js`** — TanStack Query hooks for CRUD (`useMyJobs`, `useCreateJob`, `useApplicants`, `useUpdateApplicationStatus`, `useCompanies`, `useCreateCompany`, `useUpdateRecruiterProfile`)
* **`hooks/recruiter/useRecruiterAi.js`** — TanStack Query hooks for the AI suite (`useMatchScores`, `useShortlist`, `useAnalytics`, `useCandidateSummary`, `useOptimizeJd`, `useGenerateEmail`)
* **`api/recruiterAi.api.js`** — thin Axios wrappers for `/api/ai/recruiter/*`
* **`components/recruiter/ai/`** — reusable AI primitives (`AiBadge`, `ScoreRing`, `ScoreBar`, `AiSection`), `CandidateSummaryDialog`, `EmailGeneratorDialog`
* **Reusable primitives** — `StatCard`, `Skeleton`, `EmptyState`, `ConfirmDialog`

### Backend tweaks for the dashboard

* `application.model` — added `'shortlisted'` to the status enum
* `application.controller.updateStatus` — accepts `'shortlisted'`
* `user.controller.update` — handles profile photo uploads via a `kind=photo` body flag (uploads to `jobhunt/avatars`, sets `profile.photo`) without touching the existing resume-upload flow
* `controllers/recruiterAi.controller.js` — match scoring, summary, shortlist, analytics, JD optimize, email generate (auth + recruiterOnly + ownership-checked)
* `utils/cosine.js` — shared cosine similarity + 0..100% mapping used by every ranking surface

---

## 🎙️ Voice Mock Interview

A voice-driven interview practice flow at `/mock-interview`.

### How it works

1. User picks a role.
2. The frontend uses the **Web Speech API** (`useSpeechRecognition` hook) for continuous recognition with interim results, plus `SpeechSynthesis` to read the question aloud.
3. The user records each answer; the live transcript is captured.
4. On submit, all answers are sent to **`POST /api/ai/mock-interview/evaluate`** in a single request.
5. The backend scores every answer in **one LLM call** and returns per-answer score + strengths + improvements + an overall summary.
6. The result dashboard renders the breakdown.

The `LLM_TIMEOUT_MS` env var is honored (no hardcoded timeout), and failed/empty LLM responses are never cached.

---

## 📄 Resume PDF Delivery (Cloudinary free-tier workaround)

Cloudinary's free tier blocks **inline** PDF delivery from `/image/upload/`. To make resume links open reliably:

1. **Recommended:** in Cloudinary Console → **Settings → Security**, uncheck **"Restricted media types: PDF and ZIP files"**. One-click fix for all existing files.
2. The backend also ships a **proxy** with a defensive workaround:
   * `GET /api/user/resume` — streams the requesting user's own resume
   * `GET /api/application/:id/resume` — recruiter-scoped, gated by "this recruiter owns the parent job"
   * Both rewrite the URL to `…/image/upload/fl_attachment/…`, buffer the bytes, validate the `%PDF-` magic header, and re-stamp the response as `Content-Type: application/pdf` with `Content-Disposition: inline`.

The frontend Profile and Applicants pages link through the proxy, so PDFs render in a viewer tab regardless of whether you've flipped the Cloudinary setting.

---

## 🔮 Future Enhancements

* Email notifications
* Real-time chat between recruiter and candidate
* Advanced job filtering

---

## 👨‍💻 Author

**Nithish Reddy**

---
