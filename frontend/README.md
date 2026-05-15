# JobHunt – Frontend

React + Vite client for the JobHunt job-portal platform. The UI is built with Tailwind CSS, shadcn/ui (Radix primitives), and TanStack Query, and ships two role-aware areas: a job-seeker dashboard at `/` and a recruiter dashboard at `/admin/*`.

For the full product overview, backend, and infrastructure docs, see the [root README](../README.md).

---

## 🚀 Tech Stack

- **React 18 + Vite** — fast dev server with HMR
- **Tailwind CSS** + **shadcn/ui** — design system
- **TanStack Query** — server state, caching, mutations
- **react-hook-form + Zod** — forms & validation
- **react-router-dom v6** — nested routing with role-gated layouts
- **Axios** — HTTP client with `withCredentials: true`
- **lucide-react** — icons
- **sonner** — toast notifications
- **Web Speech API** — voice mock interview (no extra deps)

---

## 🏁 Getting Started

```bash
cd frontend
npm install
npm run dev
```

The dev server runs on `http://localhost:5173` and proxies `/api` to the backend (default `http://localhost:8000`).

### Environment variables

Optional `frontend/.env`:

```bash
VITE_API_BASE_URL=/api    # default; override only if not using the dev proxy
```

---

## 📂 Project Structure

```
frontend/
├── src/
│   ├── api/                     # Axios clients per domain (job, application, user, company, ai)
│   ├── components/
│   │   ├── layout/              # Global navbar
│   │   ├── recruiter/           # RecruiterLayout + reusable primitives
│   │   └── ui/                  # shadcn/ui primitives
│   ├── hooks/
│   │   ├── useAuth.js
│   │   ├── useSpeechRecognition.js
│   │   └── recruiter/
│   │       └── useRecruiterQueries.js
│   ├── pages/
│   │   ├── Home.jsx             # Landing → seeker dashboard or redirect to /admin/dashboard
│   │   ├── Login.jsx / Register.jsx
│   │   ├── jobs/                # Browse & detail
│   │   ├── ai/                  # Recommendations, AnalyzeResume, InterviewPrep, CoverLetter, SemanticSearch, MockInterview
│   │   ├── dashboards/
│   │   │   └── JobSeekerDashboard.jsx
│   │   └── admin/               # Recruiter pages
│   │       ├── AdminDashboard.jsx
│   │       ├── PostJob.jsx
│   │       ├── ManageJobs.jsx
│   │       ├── Applicants.jsx
│   │       └── AdminProfile.jsx
│   ├── routes/
│   │   ├── ProtectedRoute.jsx
│   │   └── RecruiterProtectedRoute.jsx
│   ├── lib/utils.js
│   ├── App.jsx
│   └── main.jsx
├── jsconfig.json                # `@/*` → `src/*`
├── tailwind.config.js
└── vite.config.js
```

---

## 🧭 Routing

| Path | Access | Page |
|---|---|---|
| `/` | public | Landing → JobSeekerDashboard (seeker) → redirect `/admin/dashboard` (recruiter) |
| `/login` · `/register` | public | Auth |
| `/jobs` · `/jobs/:id` | seeker | Browse + detail |
| `/applications` | seeker | Applied jobs |
| `/profile` | seeker | Profile + resume |
| `/ai/recommendations` · `/ai/analyze-resume` · `/ai/interview-prep` · `/ai/cover-letter` · `/ai/search` | seeker | AI workflows |
| `/mock-interview` | seeker | Voice mock interview |
| `/upgrade` | any auth | Pro upgrade |
| `/admin/dashboard` | recruiter | Stats + recent jobs |
| `/admin/post-job` | recruiter | Create job (RHF + Zod) |
| `/admin/jobs` | recruiter | Manage posted jobs |
| `/admin/jobs/:id/applicants` | recruiter | View & action applicants |
| `/admin/profile` | recruiter | Profile, photo, default company |

The global navbar is hidden on `/admin/*` (the recruiter layout has its own topbar). Legacy `/recruiter/*` paths redirect to their `/admin/*` equivalents.

---

## 🧑‍💼 Recruiter Dashboard

A self-contained, role-gated area:

- **`RecruiterProtectedRoute`** — anon → `/login`, seeker → `/`, recruiter → render
- **`RecruiterLayout`** — responsive collapsible sidebar + topbar with `<Outlet />`
- **`hooks/recruiter/useRecruiterQueries.js`** — centralized TanStack Query hooks (`useMyJobs`, `useCreateJob`, `useApplicants`, `useUpdateApplicationStatus`, `useCompanies`, `useCreateCompany`, `useUpdateRecruiterProfile`) with a shared `recruiterKeys` map for consistent cache invalidation
- **Reusable primitives** in `components/recruiter/primitives.jsx`: `StatCard`, `Skeleton`, `SkeletonRows`, `EmptyState`, `ConfirmDialog`

Each list page handles loading, empty, and error states explicitly.

---

## 🎙️ Voice Mock Interview

`pages/ai/MockInterview.jsx` + `hooks/useSpeechRecognition.js`.

- Uses the **Web Speech API** for continuous recognition with interim results
- `SpeechSynthesis` reads questions aloud
- Sends every answer in one `POST /api/ai/mock-interview/evaluate` request
- Renders a per-question score + strengths/improvements dashboard

No extra dependencies required — works in Chromium-based browsers.

---

## 📄 Resume PDF Viewing

Resume links go through backend proxies that bypass Cloudinary's free-tier PDF restriction:

- Profile page → `GET /api/user/resume` (own resume)
- Applicants page → `GET /api/application/:id/resume` (recruiter-scoped)

PDFs render in a viewer tab. See the root README's **Resume PDF Delivery** section for the full story.

---

## 🔌 Server State & API Layer

- All HTTP calls go through `src/api/client.js` (Axios with `withCredentials: true` and a base URL of `import.meta.env.VITE_API_BASE_URL || '/api'`).
- One client module per domain: `job.api`, `application.api`, `user.api`, `company.api`, `ai.api`.
- Mutations invalidate the relevant TanStack Query keys (e.g. `recruiterKeys.myJobs`, applicants-by-job) so views refresh without manual reloads.
- Toast notifications via `sonner` for success/error feedback.

---

## 🔐 Auth

- Cookie-based JWT issued by the backend.
- `useAuth()` exposes `{ user, isAuthenticated, isLoading, isPro, logout }`.
- `ProtectedRoute` and `RecruiterProtectedRoute` wrap gated routes.

---

## 🛠️ Path Aliases

`jsconfig.json` and `vite.config.js` map `@/*` → `src/*`:

```js
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
```

---

## 📦 Scripts

```bash
npm run dev       # Vite dev server (HMR)
npm run build     # production build
npm run preview   # preview the production build locally
npm run lint      # ESLint
```
