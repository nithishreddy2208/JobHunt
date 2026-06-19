# ZapCom Internal-Readiness Roadmap — JobHunt

> Recommendations to evolve JobHunt from a generic job portal into an internal recruitment platform the **ZapCom Talent Acquisition (TA)** team can run day-to-day. Prioritized by business value vs. implementation effort.

---

## What already ships (foundation)

- AI **pre-screening chatbot** capturing structured candidate profiles (experience, CTC, notice, skills, education) — *implemented*.
- **AI match scoring** + auto-shortlist (embedding + skill alignment).
- Recruiter **applicant card view** with screening data, resume proxy, AI summary, email generator.
- **Resume-mandatory** apply gate (frontend + backend).
- Job analytics, hiring funnel basics, JD optimizer.

This is already well beyond a generic portal. The gaps below are about **workflow** (tracking candidates through a pipeline) and **collaboration** (notes, scheduling, team visibility).

---

## Prioritized backlog

### Tier 1 — Highest value, low/medium effort (do first)

#### 1. Candidate Status / Pipeline Tracking (Kanban)
**Why:** TA's core daily job is moving candidates through stages. Status already exists (`pending/shortlisted/accepted/declined`) but there's no pipeline view.
**Build:**
- Extend `application.status` enum → `applied → screened → shortlisted → interview → offer → hired → rejected`.
- Add `statusHistory: [{ status, by, at, note }]` to `application.model.js` for an audit trail.
- Recruiter **Kanban board** (drag between columns) reusing existing `updateStatus` endpoint.
**Effort:** Medium. **Value:** Very high.

#### 2. Recruiter Notes & Collaboration
**Why:** Hiring is a team sport; notes prevent repeated screening and enable handoffs.
**Build:**
- `notes: [{ author, body, createdAt }]` subdoc on `Application` (or a `Note` collection).
- `POST /application/:id/notes`, render in the applicant card (already have the card UI).
- @mention / visibility scoped to the job's recruiters.
**Effort:** Low–Medium. **Value:** High.

#### 3. Resume / Talent Search & Skill Filtering
**Why:** TA needs to *find* candidates across all applications, not just per-job.
**Build:**
- Reuse existing embedding search to add a recruiter "Search talent pool" page (`vectorService`/`aiService` already supports query-by-embedding).
- Faceted filters: skills, candidateType, CTC range, notice period, location — all already captured in `screening`.
**Effort:** Medium. **Value:** High (leverages existing vectors + screening data).

---

### Tier 2 — High value, medium effort

#### 4. Interview Scheduling
**Why:** Closes the loop between shortlist and decision.
**Build:**
- `Interview` collection: `{ application, scheduledAt, mode, interviewers[], status, feedback }`.
- Calendar integration optional v1 (start with manual slots + email via existing email generator).
- Trigger status → `interview` automatically when scheduled.
**Effort:** Medium–High. **Value:** High.

#### 5. Recruiter Analytics Dashboard & Hiring Funnel Metrics
**Why:** Leadership visibility; already have per-job analytics — aggregate it.
**Build:**
- Org-level dashboard: time-to-hire, funnel conversion per stage, source/role breakdowns, avg AI match score, offer-acceptance rate.
- Aggregate from `application.statusHistory` (Tier 1 #1 enables this).
**Effort:** Medium. **Value:** High (depends on #1).

#### 6. Candidate Shortlisting Workspaces / Tags
**Why:** Let recruiters group candidates ("Frontend pool", "2025 grads").
**Build:** `tags: [String]` on Application + saved filters. Lightweight.
**Effort:** Low. **Value:** Medium–High.

---

### Tier 3 — Strategic, higher effort

#### 7. Internal Referrals
**Why:** Referrals are a top-quality source for internal hiring.
**Build:** Referral link per job, `referredBy` on Application, referral leaderboard.
**Effort:** Medium. **Value:** Medium (high for internal ZapCom use).

#### 8. Talent Pool / Re-engagement
**Why:** Past applicants are a free pipeline.
**Build:** Mark "good but not now" candidates; re-surface on new matching roles using existing embeddings.
**Effort:** Medium. **Value:** Medium.

#### 9. Role-Based Access & Team Management
**Why:** Multiple recruiters per org; hiring managers vs. TA vs. admin.
**Build:** Org/team model, role granularity beyond `recruiter/jobSeeker` (e.g. `admin`, `hiring_manager`, `interviewer`), per-job recruiter assignment.
**Effort:** High. **Value:** High once team grows (prerequisite for true internal rollout).

---

## Recommended sequencing

```
Sprint 1:  Pipeline tracking (#1) + Recruiter notes (#2)
Sprint 2:  Talent search & skill filtering (#3) + shortlisting tags (#6)
Sprint 3:  Analytics dashboard & funnel (#5)
Sprint 4:  Interview scheduling (#4)
Later:     Referrals (#7), Talent pool (#8), RBAC/teams (#9)
```

**Rationale:** #1 unlocks #5 (funnel metrics need stage history). #2 and #3 are immediate daily-use wins that leverage data already captured by the screening bot. RBAC (#9) is deferred until multiple TA users actually share the system, since it's the heaviest lift.

---

## Cross-cutting production hardening (parallel track)

- **Notifications**: email/in-app on status changes (reuse email generator + a queue job).
- **Audit log**: who changed what (partially covered by `statusHistory`).
- **Data export**: CSV export of candidates/screening for offline review and compliance.
- **GDPR/consent**: candidate data retention policy + delete-my-data endpoint.
- **AI cost controls**: per-org rate limits on AI tools (subscription tiers already exist).
- **Observability**: structured logs already exist for AI provider/model; add request tracing + dashboards.
