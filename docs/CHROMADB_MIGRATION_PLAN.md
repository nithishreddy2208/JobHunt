# ChromaDB Migration Plan — JobHunt Vector Search

> Architecture review + migration plan for moving from **MongoDB-stored embeddings + in-process cosine similarity** to a dedicated **ChromaDB** vector store.

---

## A. Current Architecture (as-is)

| Concern | Current implementation |
| --- | --- |
| Embedding model | `@xenova/transformers` `all-MiniLM-L6-v2` (384-dim, normalized) — runs **in-process** in the Node backend (`backend/utils/embedding.js`). |
| Storage | Vectors stored as `Number[]` arrays directly on documents: `job.embedding`, `user.profile.embedding`. |
| Generation | Async via BullMQ `tasks.worker.js` (`generateEmbedding`, `processResume`). |
| Query | `aiService.searchJobsByEmbedding()` loads **every** job with an embedding into Node memory, computes `cosineSimilarity()` per doc (`utils/cosine.js`), sorts, slices `topK`. **O(N) full scan per query.** |
| Caching | Redis caches query embeddings + search/recommendation results (TTL ~15 min). |
| Consumers | Semantic job search, job recommendations, recruiter applicant match-scoring / auto-shortlist. |

### Pain points
- **O(N) scan**: every search pulls all job vectors over the wire from Mongo (read replica) and scores them in Node. Fine at hundreds of jobs; degrades linearly and inflates memory + replica I/O as the corpus grows.
- **No ANN index**: no approximate-nearest-neighbour structure; latency grows with corpus size.
- **Coupling**: vector data bloats Mongo documents (384 floats ≈ 3 KB/doc) and every `Job.find` that forgets to project `embedding:0` ships it around.
- **Recruiter scoring** re-derives cosine per applicant per page load.

---

## B. Target Architecture (ChromaDB)

```
                 ┌────────────────────────┐
   write path    │  BullMQ tasks.worker   │  getEmbedding() (MiniLM, unchanged)
 (job/resume) ─► │  generateEmbedding /   │ ─────────────────────────┐
                 │  processResume         │                          ▼
                 └────────────────────────┘                 ┌──────────────────┐
                                                             │   ChromaDB       │
   read path     ┌────────────────────────┐   query(vec)    │  collections:    │
  search / recs  │  vectorService (new)   │ ───────────────►│   - jobs         │
  recruiter score│  (Chroma client)       │ ◄─────────────── │   - resumes      │
                 └────────────────────────┘   ids+distances └──────────────────┘
                          │
                          ▼  hydrate by _id
                 ┌────────────────────────┐
                 │  MongoDB (source of    │  (vectors removed from docs)
                 │  truth for job/user)   │
                 └────────────────────────┘
```

- **Chroma stores vectors + minimal metadata; Mongo remains the source of truth** for job/user documents. Query Chroma → get IDs + distances → hydrate full docs from Mongo (replica).
- Embedding **model stays the same** (MiniLM) — we still produce the vector ourselves and pass it to Chroma (`add`/`query` with explicit embeddings), so no behavioral change in match quality and no dependency on Chroma's embedding functions.

---

## C. Storage Strategy

Two Chroma collections:

| Collection | id | embedding | metadata |
| --- | --- | --- | --- |
| `jobs` | `job._id` (string) | 384-dim MiniLM | `{ companyId, jobType, location, createdAt, active }` |
| `resumes` | `user._id` (string) | 384-dim MiniLM | `{ role: 'jobSeeker', updatedAt }` |

- **Distance metric:** cosine (`hnsw:space: cosine`) to match current behaviour. (Vectors are already L2-normalized, so cosine ≈ dot.)
- **Metadata filtering** lets us push pre-filters (e.g. `jobType`, `location`, `active=true`) into Chroma instead of post-filtering in Node.
- Keep `job.embedding` / `user.profile.embedding` in Mongo **during migration only** (dual-write), then drop them in a later release to reclaim space.

---

## D. Embedding Sync Strategy

Reuse the existing BullMQ workers — only the **sink** changes (Mongo `$set` → Chroma `upsert`).

- **Create/Update job** → `generateEmbedding` worker → `vectorService.upsertJob(id, vector, metadata)`.
- **Resume upload/update** → `processResume` worker → `vectorService.upsertResume(id, vector, metadata)`.
- **Delete job / deactivate** → new step to `vectorService.deleteJob(id)` (or set `active:false` metadata).
- **Idempotency:** Chroma `upsert` is id-keyed, so re-running a worker is safe.
- **Backfill:** one-off script iterates existing docs that have `embedding` and upserts them into Chroma (no re-embedding needed — reuse stored vectors).
- **Dual-write window:** during rollout, write to both Mongo array and Chroma; read from Chroma behind a feature flag (`VECTOR_BACKEND=chroma|mongo`).

---

## E. Query Flow (to-be)

1. `getEmbedding(query)` (unchanged; Redis-cached).
2. `vectorService.queryJobs(vector, { topK, where })` → Chroma returns `[{ id, distance }]`.
3. Convert distance→score (`score = 1 - distance` for cosine), apply threshold.
4. Hydrate: `ReadModels.Job.find({ _id: { $in: ids } }).populate('company')`, re-order by Chroma rank.
5. Cache final payload in Redis (unchanged).

Recruiter scoring: query the `resumes`/`jobs` collection by the job vector with `where: { /* applicants */ }`, or fetch applicant vectors by id and score — eliminates the per-applicant full scan.

---

## F. Code Touch Points

| File | Change |
| --- | --- |
| `backend/services/vector.service.js` | **New.** Wraps Chroma JS client: `upsertJob/Resume`, `deleteJob`, `queryJobs`, `queryResumes`, `getById`. Lazy-connect + graceful errors. |
| `backend/utils/embedding.js` | Unchanged (still produces vectors). |
| `backend/services/ai.service.js` | `searchJobsByEmbedding()` → delegate to `vectorService.queryJobs()` + Mongo hydrate (behind `VECTOR_BACKEND` flag). |
| `backend/workers/tasks.worker.js` | `generateEmbedding`/`processResume` → also `vectorService.upsert*` (dual-write). |
| `backend/controllers/job.controller.js` | On job delete/close → `vectorService.deleteJob()`. |
| Recruiter match-score service | Replace per-applicant cosine scan with Chroma query / batched id lookups. |
| `backend/models/job.model.js`, `user.model.js` | Phase 2: remove `embedding` field after cutover. |
| `backend/.env.example` | Add `VECTOR_BACKEND`, `CHROMA_URL`, `CHROMA_API_KEY`/tenant. |
| `scripts/backfillChroma.js` | **New.** One-off backfill from existing Mongo vectors. |

---

## G. Deployment Implications

- **Chroma is a stateful service** — it needs a persistent host. On Render this means a separate **private service with a persistent disk** (or **Chroma Cloud**). It is **not** serverless-friendly; a Vercel function cannot embed it.
- Backend (Render) talks to Chroma over the private network via `CHROMA_URL`.
- **Disk sizing:** 384 floats × 4 B ≈ 1.5 KB/vector + HNSW index overhead (~2–3×). 100k vectors ≈ ~0.5 GB. Small now, plan disk growth.
- **Backup/DR:** Chroma data must be backed up independently (disk snapshot). Mongo remains recoverable source of truth, so worst case we re-backfill Chroma from Mongo.
- **Cold start / availability:** add health checks; `vectorService` must **fail gracefully** (fall back to Mongo scan or return cached results) so search never hard-crashes — consistent with the app's existing AI-resilience posture.
- **Extra moving part:** one more service to monitor, secure, and pay for.

---

## H. Comparison

| Dimension | MongoDB + in-process cosine (current) | ChromaDB |
| --- | --- | --- |
| Query complexity | O(N) full scan, scored in Node | ANN (HNSW), sublinear |
| Latency at 100s–1k docs | Fine (tens of ms) | Fine (slightly better) |
| Latency at 50k–1M docs | Degrades linearly, memory pressure | Stays low |
| Metadata pre-filtering | Manual in Node | Native `where` |
| Ops complexity | None (uses existing Mongo) | New stateful service + disk + backups |
| Cost | $0 extra | Extra Render service / Chroma Cloud |
| Doc bloat | 384 floats/doc in Mongo | Vectors offloaded |
| Infra fit (Vercel+Render) | Perfect | Needs persistent Render service |
| Failure blast radius | Within existing DB | New dependency to harden |

### Alternative worth noting
**MongoDB Atlas Vector Search** ($vectorSearch) keeps everything in the existing Atlas cluster, adds a real ANN index, and requires **zero new infrastructure** — only an index definition and swapping the `find`+cosine for a `$vectorSearch` aggregation. For a team already on Atlas, this captures ~80% of Chroma's benefit at ~20% of the operational cost.

---

## I. Recommendation

**Postpone the ChromaDB migration.** At JobHunt's current scale (hundreds–low-thousands of jobs), the in-process cosine scan is not a bottleneck, and the Redis caching layer already absorbs repeat queries. Introducing a stateful vector service adds real cost, ops burden, and a new failure mode for marginal latency gains today.

**Recommended sequence:**
1. **Now (cheap win):** ensure every non-AI `Job.find` projects `embedding: 0`; cap the scan by pre-filtering active jobs. Add a `where`-style pre-filter in `searchJobsByEmbedding`.
2. **When corpus > ~10k vectors or p95 search latency > ~300 ms:** adopt **MongoDB Atlas Vector Search** first (no new infra). The code already structures search behind `aiService`, so this is a localized change.
3. **Only if** multi-tenant scale, advanced metadata filtering, or >1M vectors arrive: migrate to ChromaDB using the dual-write + feature-flag plan above.

Keeping the read path behind `aiService.searchJobsByEmbedding` (already true) means any of these backends is a swap-in, so this decision is reversible and low-risk to defer.
