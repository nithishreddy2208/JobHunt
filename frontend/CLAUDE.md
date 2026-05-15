# JobHunt Frontend — Cascade Context

Living notes for myself. Update when patterns change.

---

## Stack

- **Vite + React 18** (JSX, no TypeScript)
- **Tailwind CSS v3** (pinned; v4 changed config significantly)
- **shadcn-style UI primitives** in `src/components/ui/` — hand-rolled, NOT auto-generated. Theme tokens defined in `tailwind.config.js`.
- **React Router v6**
- **TanStack Query (React Query)** — source of truth for server state. Don't reach for Redux.
- **axios** with `withCredentials: true` (cookie auth)
- **react-hook-form + zod** for forms
- **sonner** for toasts
- **lucide-react** for icons
- `clsx` + `tailwind-merge` via `cn()` in `src/lib/utils.js`

---

## Folder map

```
frontend/src/
├── api/              # axios instance + per-resource endpoints
│   ├── client.js     # global interceptors: 429 → upgrade toast, 401 silent on auth probes
│   ├── auth.api.js
│   └── (job, application, ai... to be added)
├── components/
│   ├── ui/           # button, input, label, card (shadcn-style)
│   └── layout/       # Navbar (role-aware)
├── hooks/            # useAuth (the big one)
├── lib/              # utils.js (cn helper)
├── pages/
│   ├── Home.jsx              # routes to dashboard if authed, else landing
│   ├── Login.jsx, Register.jsx
│   └── dashboards/
│       ├── JobSeekerDashboard.jsx
│       └── RecruiterDashboard.jsx
├── routes/           # ProtectedRoute
├── App.jsx           # Routes table
└── main.jsx          # QueryClientProvider + BrowserRouter + Toaster
```

---

## Important configs

### Vite proxy (`vite.config.js`)
- `/api` → `http://localhost:8000` so the browser sees the API as **same-origin** in dev.
- Cookies "just work" in dev because of the proxy. CORS is the prod fallback.
- Path alias `@/` → `src/`.

### `axios` baseURL
- Defaults to `/api` (relative; uses Vite proxy).
- Override with `VITE_API_BASE_URL` for prod.
- `withCredentials: true` is non-negotiable.

### Tailwind
- `darkMode: 'class'` (toggle by adding `dark` to `<html>`).
- Theme uses HSL tokens: `background`, `foreground`, `muted`, `primary`, `accent`, `destructive`, `border`. Reference these via `bg-accent`, `text-muted-foreground`, etc. — don't hardcode hex.
- The "Unknown at rule @tailwind" warnings in CSS LSP are **false positives**. The Tailwind CSS IntelliSense extension fixes them.

---

## Auth pattern (`hooks/useAuth.js`)

- Single source of truth for "am I logged in?".
- On mount, calls `GET /api/user/subscription`. If 200 → authenticated; 401 → guest.
- Cached under React Query key `['auth', 'me']`.
- Exposes: `user`, `isAuthenticated`, `isLoading`, `isPro`, `subscription`, `login`, `register`, `logout`, plus pending flags.
- After login, `setQueryData(['auth','me'], …)` — saves a refetch.
- After logout, `queryClient.clear()` — wipe ALL cached server state.

### Role values (CRITICAL)
Backend `User.role` enum is `['recruiter', 'jobSeeker']`. **Forms MUST send `'jobSeeker'` (camelCase).** Burned an hour on this.

---

## Routing

- `/` (`Home`):
  - Guest → marketing landing
  - `user.role === 'recruiter'` → `RecruiterDashboard`
  - else → `JobSeekerDashboard`
- `ProtectedRoute` redirects guests to `/login` (preserves `from` in location state).
- All dashboard target routes (`/jobs`, `/applications`, `/recruiter/jobs`, etc.) currently render placeholders. Swap them in piecewise.

---

## Conventions

- Use `@/...` imports — never relative deep paths.
- Co-locate API calls in `src/api/<resource>.api.js`. Each function returns the `data` payload directly (`.then(r => r.data)`), so consumers don't unwrap axios responses.
- React Query keys are arrays: `['jobs', filters, page]`, `['applications']`, `['auth', 'me']`. Invalidate on related mutations.
- Toasts via `sonner`. Don't `alert()`. The axios interceptor already handles 429 (with Upgrade CTA) and 5xx globally.
- Forms: `react-hook-form` + `zodResolver`. Show `errors.field.message` in a `<p className="text-xs text-destructive">`.
- Buttons: use the `Button` variant prop (`default | accent | outline | ghost | destructive | link`). Don't restyle from scratch.
- Compose pages from `Card / CardHeader / CardTitle / CardDescription / CardContent` — keeps spacing consistent.

---

## API map (frontend perspective)

```
authApi.register(payload)   POST /user/register
authApi.login(payload)      POST /user/login
authApi.logout()            GET  /user/logout
authApi.me()                GET  /user/subscription   # used as session probe
```

(More to add as Phase 2+ progresses: jobApi, applicationApi, aiApi, companyApi.)

---

## Phase plan (where we are)

- ✅ **Phase 1**: scaffold, auth, login/register/logout, route guards
- ✅ **Phase 1.5**: role-based dashboards (jobSeeker / recruiter), navbar awareness, role bug fix
- ⏳ **Phase 2 — Jobseeker**: `/jobs` (list + Trie autocomplete + filters + pagination), `/jobs/:id`, apply flow, `/applications`
- ⏳ **Phase 2 — Recruiter**: `/recruiter/companies` (CRUD), `/recruiter/jobs/new`, `/recruiter/jobs`, `/recruiter/applicants`
- ⏳ **Phase 3**: Profile + resume upload, AI features (recommendations, resume analysis, cover letter, interview prep)
- ⏳ **Phase 4**: Upgrade page, dark mode, polish, error boundaries

---

## Things I've already burned time on (don't repeat)

1. **Role string casing** — backend wants `'jobSeeker'`. The lowercase `'jobseeker'` looks fine but breaks login with "Invalid role" and silently corrupts registration.
2. **Vite default `App.css` and `index.css`** had Vite-template CSS that fought Tailwind. Wiped them clean.
3. **Cookie-based auth** needs `withCredentials: true` on every request — that's why we use a single `api` axios instance.
4. **Tailwind v4** is NOT a drop-in upgrade. Stay on v3 unless ready to migrate.
5. **CSS lint warnings** for `@tailwind` and `@apply` are false positives unless the user installs the Tailwind CSS IntelliSense extension. Don't try to "fix" them.
6. **shadcn install** wasn't run; the `ui/*` components are hand-written but follow shadcn API. Safe to add real shadcn components alongside.
