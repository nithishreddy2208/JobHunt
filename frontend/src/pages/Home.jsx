import { lazy, Suspense } from 'react';
import { Link, Navigate } from 'react-router-dom';
import {
  ArrowRight,
  Briefcase,
  Search,
  Sparkles,
  Bot,
  FileText,
  Target,
  ShieldCheck,
  BarChart3,
  Users,
  Star,
  Quote,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';

// Logged-in seekers see the dashboard, which pulls in AI primitives + charts.
// Lazy-load it so anonymous visitors (the landing page) never download that code.
const JobSeekerDashboard = lazy(() => import('@/pages/dashboards/JobSeekerDashboard'));

const FEATURES = [
  {
    icon: Bot,
    title: 'AI Application Assistant',
    body: 'A guided pre-screening chat captures experience, CTC, notice period and skills before every apply — so recruiters get qualified candidates, not just resumes.'
  },
  {
    icon: Target,
    title: 'AI match scoring',
    body: 'Every applicant is ranked against the role using semantic embeddings and skill alignment, surfacing the best fits instantly.'
  },
  {
    icon: Search,
    title: 'Semantic + smart search',
    body: 'Trie-based autocomplete and natural-language search find the right job even when the keywords differ.'
  },
  {
    icon: FileText,
    title: 'Resume intelligence',
    body: 'Instant resume analysis, tailored cover letters, and interview questions generated for each posting.'
  },
  {
    icon: BarChart3,
    title: 'Recruiter analytics',
    body: 'Hiring funnel metrics, auto-shortlisting, and candidate insights built for talent acquisition teams.'
  },
  {
    icon: ShieldCheck,
    title: 'Resilient by design',
    body: 'Multi-model AI fallback keeps the platform responsive even when a provider is rate-limited or down.'
  }
];

const STATS = [
  { value: 'AI-first', label: 'Screening & matching' },
  { value: '6+', label: 'AI hiring tools' },
  { value: '<1s', label: 'Match ranking' },
  { value: '24/7', label: 'Always available' }
];

const SEEKER_STEPS = [
  'Build your profile and upload a resume once',
  'Chat with the AI assistant when you apply',
  'Get instant resume analysis and interview prep',
  'Track every application in one place'
];

const RECRUITER_STEPS = [
  'Post a role in minutes with AI-assisted JDs',
  'Receive pre-screened, structured candidate profiles',
  'Auto-shortlist with AI match scores',
  'Move candidates through your hiring funnel'
];

const TESTIMONIALS = [
  {
    quote: 'The pre-screening chat means we only review candidates who actually fit — it has cut our shortlisting time dramatically.',
    name: 'Talent Acquisition Lead',
    role: 'ZapCom'
  },
  {
    quote: 'Applying felt like a conversation, not a form. The AI even helped me prep for the interview the same day.',
    name: 'Software Engineer',
    role: 'Candidate'
  },
  {
    quote: 'AI match scores and auto-shortlist let a small team hire like a large one.',
    name: 'Engineering Manager',
    role: 'Hiring Team'
  }
];

export default function HomePage() {
  const { isAuthenticated, user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading…
      </div>
    );
  }

  if (isAuthenticated) {
    if (user?.role === 'recruiter') {
      return <Navigate to="/admin/dashboard" replace />;
    }
    return (
      <Suspense
        fallback={
          <div className="flex h-[60vh] items-center justify-center text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading your dashboard…
          </div>
        }
      >
        <JobSeekerDashboard />
      </Suspense>
    );
  }

  return <Landing />;
}

function Landing() {
  return (
    <div className="overflow-hidden">
      {/* ===== HERO ===== */}
      <section className="relative">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-accent/10 via-background to-background"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 left-1/2 -z-10 h-[28rem] w-[28rem] -translate-x-1/2 rounded-full bg-accent/20 blur-[120px]"
        />
        <div className="container flex flex-col items-center py-20 text-center sm:py-28">
          <span className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
            <Sparkles className="h-3.5 w-3.5" /> AI-powered recruitment platform
          </span>
          <h1 className="mt-6 max-w-4xl text-4xl font-bold tracking-tight sm:text-6xl">
            Hire smarter. Apply smarter.
            <br />
            <span className="bg-gradient-to-r from-accent to-sky-400 bg-clip-text text-transparent">
              Powered by AI.
            </span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
            JobHunt screens every candidate with an AI assistant, ranks applicants
            by real fit, and gives job seekers instant resume and interview tools —
            built for modern talent acquisition teams.
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <Link to="/register">
              <Button variant="accent" size="lg">
                Get started free <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/login">
              <Button variant="outline" size="lg">
                Log in
              </Button>
            </Link>
          </div>

          {/* Stat strip */}
          <div className="mt-16 grid w-full max-w-3xl grid-cols-2 gap-4 sm:grid-cols-4">
            {STATS.map((s) => (
              <div
                key={s.label}
                className="rounded-xl border border-border bg-card/60 p-4 backdrop-blur"
              >
                <p className="text-2xl font-bold text-foreground">{s.value}</p>
                <p className="mt-1 text-xs text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FEATURES ===== */}
      <section id="features" className="container py-16 sm:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Everything you need to hire and get hired
          </h2>
          <p className="mt-4 text-muted-foreground">
            One platform that combines structured screening, AI matching, and a
            delightful candidate experience.
          </p>
        </div>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="group rounded-2xl border border-border bg-card p-6 transition-all hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-lg"
            >
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-accent/10 text-accent transition-colors group-hover:bg-accent group-hover:text-accent-foreground">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ===== DUAL JOURNEYS ===== */}
      <section className="container py-16 sm:py-20">
        <div className="grid gap-6 lg:grid-cols-2">
          <JourneyCard
            icon={Users}
            tone="accent"
            eyebrow="For job seekers"
            title="Apply with confidence"
            steps={SEEKER_STEPS}
            ctaLabel="Find jobs"
            ctaTo="/register"
          />
          <JourneyCard
            id="recruiters"
            icon={Briefcase}
            tone="sky"
            eyebrow="For recruiters"
            title="Hire the right people, faster"
            steps={RECRUITER_STEPS}
            ctaLabel="Start hiring"
            ctaTo="/register"
          />
        </div>
      </section>

      {/* ===== TESTIMONIALS ===== */}
      <section id="about" className="container py-16 sm:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <div className="flex items-center justify-center gap-1 text-accent">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className="h-4 w-4 fill-current" />
            ))}
          </div>
          <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
            Loved by candidates and hiring teams
          </h2>
        </div>
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {TESTIMONIALS.map((t) => (
            <div key={t.quote} className="rounded-2xl border border-border bg-card p-6">
              <Quote className="h-6 w-6 text-accent/50" />
              <p className="mt-3 text-sm leading-relaxed text-foreground/90">{t.quote}</p>
              <div className="mt-5">
                <p className="text-sm font-semibold">{t.name}</p>
                <p className="text-xs text-muted-foreground">{t.role}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ===== FINAL CTA ===== */}
      <section className="container pb-24">
        <div className="relative overflow-hidden rounded-3xl border border-accent/20 bg-gradient-to-br from-accent/15 via-accent/5 to-sky-500/10 p-10 text-center sm:p-16">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-accent/20 blur-3xl"
          />
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Ready to transform your hiring?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            Join JobHunt and experience AI-powered recruitment from both sides of
            the table.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link to="/register">
              <Button variant="accent" size="lg">
                Create your account <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/login">
              <Button variant="outline" size="lg">
                Log in
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function JourneyCard({ id, icon: Icon, eyebrow, title, steps, ctaLabel, ctaTo, tone }) {
  const toneClasses =
    tone === 'sky'
      ? 'bg-sky-500/10 text-sky-500'
      : 'bg-accent/10 text-accent';
  return (
    <div id={id} className="flex flex-col rounded-2xl border border-border bg-card p-8">
      <div className={`inline-flex h-12 w-12 items-center justify-center rounded-xl ${toneClasses}`}>
        <Icon className="h-6 w-6" />
      </div>
      <p className="mt-5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {eyebrow}
      </p>
      <h3 className="mt-1 text-2xl font-bold tracking-tight">{title}</h3>
      <ul className="mt-5 space-y-3">
        {steps.map((s) => (
          <li key={s} className="flex items-start gap-2 text-sm text-foreground/90">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
            <span>{s}</span>
          </li>
        ))}
      </ul>
      <div className="mt-7">
        <Link to={ctaTo}>
          <Button variant="outline">
            {ctaLabel} <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
