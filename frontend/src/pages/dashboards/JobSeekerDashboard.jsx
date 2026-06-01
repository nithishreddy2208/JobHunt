import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Sparkles,
  Briefcase,
  FileText,
  MessageSquare,
  Mic,
  FileSignature,
  Search,
  TrendingUp,
  Target,
  Send,
  Star,
  Loader2,
  CheckCircle2,
  Clock,
  Wand2,
  Lightbulb,
  Trophy,
  AlertCircle,
  Brain,
  Compass
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useSeekerDashboard } from '@/hooks/useSeekerDashboard';
import {
  computeProfileCompletion,
  computeAtsScore,
  summarizeRecommendations,
  summarizeApplications,
  APPLICATION_STAGES,
  stageIndexFor
} from '@/lib/seekerInsights';
import {
  ScoreRing,
  ScoreBar,
  AiBadge,
  scoreTone,
  StatTile,
  AiCard
} from '@/components/seeker/SeekerPrimitives';
import { cn, formatDateRelative } from '@/lib/utils';

// AI shortcut tiles surfaced on the dashboard. The "to" routes already exist
// in App.jsx; this is a curated set, not the full sidebar.
const AI_SHORTCUTS = [
  { to: '/ai/recommendations', icon: Sparkles, title: 'Job recommendations', desc: 'Personalized matches from your resume' },
  { to: '/ai/analyze-resume', icon: Wand2, title: 'Resume analysis', desc: 'Skills, gaps, and improvement tips' },
  { to: '/ai/interview-prep', icon: MessageSquare, title: 'Interview prep', desc: 'Tailored questions for any role' },
  { to: '/mock-interview', icon: Mic, title: 'Voice mock interview', desc: 'Practice and get instant AI scoring' },
  { to: '/ai/cover-letter', icon: FileSignature, title: 'Cover letter', desc: 'Generate from any job description' },
  { to: '/ai/search', icon: Search, title: 'Semantic search', desc: 'Describe what you want in plain English' }
];

const STATUS_BADGE = {
  pending: { label: 'Under review', variant: 'warning' },
  shortlisted: { label: 'Shortlisted', variant: 'accent' },
  accepted: { label: 'Accepted', variant: 'success' },
  declined: { label: 'Declined', variant: 'destructive' }
};

export default function JobSeekerDashboard() {
  const { user, isPro } = useAuth();
  const { recommendations, resumeAnalysis, applications } = useSeekerDashboard();

  const completion = useMemo(() => computeProfileCompletion(user), [user]);
  const recsSummary = useMemo(
    () => summarizeRecommendations(recommendations.data),
    [recommendations.data]
  );
  const appsSummary = useMemo(
    () => summarizeApplications(applications.data?.applications),
    [applications.data]
  );
  const atsScore = useMemo(
    () =>
      computeAtsScore({
        analysis: resumeAnalysis.data?.analysis,
        profileCompletion: completion
      }),
    [resumeAnalysis.data, completion]
  );

  const firstName = user?.name?.split(' ')[0] || 'there';
  const hasResume = !!user?.profile?.resume;
  const recs = recommendations.data;
  const recsNeedResume = recs && recs.success === false;

  return (
    <div className="container space-y-8 py-8">
      {/* ───────── HERO ───────── */}
      <section className="relative overflow-hidden rounded-2xl border border-accent/20 bg-gradient-to-br from-accent/10 via-fuchsia-500/5 to-sky-500/10 p-6 shadow-sm sm:p-8">
        {/* Decorative blobs */}
        <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-accent/20 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-20 -left-10 h-48 w-48 rounded-full bg-fuchsia-500/15 blur-3xl" />

        <div className="relative grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <AiBadge>AI-powered hub</AiBadge>
              {isPro ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-600">
                  <Sparkles className="h-3 w-3" /> Pro
                </span>
              ) : (
                <span className="rounded-full border border-border bg-background/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Free plan
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Hi, {firstName} — let&apos;s land your next role.
            </h1>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">
              {isPro
                ? 'Unlimited AI access. Your match insights, ATS score and interview prep are below.'
                : '3 AI calls / 5 applications per day on Free. Upgrade for unlimited access to all AI tools.'}
            </p>

            {/* Profile completion */}
            <div className="mt-5 max-w-md">
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="font-semibold uppercase tracking-wider text-muted-foreground">
                  Profile strength
                </span>
                <span className={cn('font-bold tabular-nums', scoreTone(completion.percent).text)}>
                  {completion.percent}%
                </span>
              </div>
              <ScoreBar value={completion.percent} />
              {completion.missing.length > 0 && (
                <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
                  Next step: <span className="text-foreground">{completion.missing[0]}</span>
                  {completion.missing.length > 1 && ` · +${completion.missing.length - 1} more`}
                </p>
              )}
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <Link to="/jobs">
                <Button variant="accent" size="sm">
                  <Search className="h-4 w-4" /> Browse jobs
                </Button>
              </Link>
              <Link to="/ai/recommendations">
                <Button variant="outline" size="sm">
                  <Sparkles className="h-4 w-4" /> AI matches
                </Button>
              </Link>
              {!isPro && (
                <Link to="/upgrade">
                  <Button variant="ghost" size="sm">
                    <Sparkles className="h-4 w-4" /> Upgrade to Pro
                  </Button>
                </Link>
              )}
            </div>
          </div>

          {/* ATS Ring */}
          <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-background/70 px-6 py-4 backdrop-blur">
            <div className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              <Target className="h-3 w-3" /> Resume ATS Score
            </div>
            <ScoreRing value={atsScore} size={108} stroke={9} />
            <p className={cn('mt-1 text-xs font-semibold', scoreTone(atsScore).text)}>
              {scoreTone(atsScore).label}
            </p>
            {!resumeAnalysis.data && hasResume && (
              <Link to="/ai/analyze-resume" className="mt-2 inline-flex items-center gap-1 text-[11px] text-accent hover:underline">
                Run full AI analysis <ArrowRight className="h-3 w-3" />
              </Link>
            )}
            {!hasResume && (
              <Link to="/profile" className="mt-2 inline-flex items-center gap-1 text-[11px] text-accent hover:underline">
                Upload a resume <ArrowRight className="h-3 w-3" />
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* ───────── KPI STRIP ───────── */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          icon={Send}
          label="Applications sent"
          value={appsSummary.totals.total}
          hint={`${appsSummary.totals.pending} under review`}
        />
        <StatTile
          icon={Star}
          label="Shortlisted"
          value={appsSummary.totals.shortlisted}
          hint={
            appsSummary.totals.total
              ? `${appsSummary.responseRate}% recruiter response rate`
              : 'Apply to start tracking'
          }
          tone={scoreTone(appsSummary.totals.shortlisted ? 80 : 30)}
        />
        <StatTile
          icon={Sparkles}
          label="AI matches"
          value={recsSummary.count}
          hint={
            recsSummary.count
              ? `Top match ${recsSummary.topMatch}%`
              : recsNeedResume
              ? 'Upload resume to unlock'
              : 'Generating…'
          }
          tone={scoreTone(recsSummary.topMatch || 0)}
        />
        <StatTile
          icon={TrendingUp}
          label="Avg job match"
          value={`${recsSummary.avgMatch}%`}
          hint="Across your top recommendations"
          tone={scoreTone(recsSummary.avgMatch || 0)}
        />
      </section>

      {/* ───────── MIDDLE: AI insights row ───────── */}
      <section className="grid gap-4 lg:grid-cols-3">
        {/* AI Resume Analysis Summary */}
        <AiCard
          title="Resume insights"
          subtitle="What recruiters see when they scan your resume"
          icon={Brain}
          action={
            <Link to="/ai/analyze-resume">
              <Button variant="ghost" size="sm">
                Open <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          }
        >
          <ResumeInsights
            isLoading={resumeAnalysis.isLoading || resumeAnalysis.isFetching}
            error={resumeAnalysis.error}
            analysis={resumeAnalysis.data?.analysis}
            hasResume={hasResume}
          />
        </AiCard>

        {/* AI Job Match Insights */}
        <AiCard
          title="Match insights"
          subtitle="Roles the AI thinks you align with most"
          icon={Compass}
          action={
            <Link to="/ai/recommendations">
              <Button variant="ghost" size="sm">
                See all <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          }
        >
          <MatchInsights
            isLoading={recommendations.isLoading}
            data={recsSummary}
            needsResume={recsNeedResume}
          />
        </AiCard>

        {/* Skills to learn */}
        <AiCard
          title="Skills to learn"
          subtitle="Boost your match score by adding these"
          icon={Lightbulb}
        >
          <SkillsToLearn
            analysis={resumeAnalysis.data?.analysis}
            hasResume={hasResume}
          />
        </AiCard>
      </section>

      {/* ───────── BOTTOM ROW: pipeline + AI tools ───────── */}
      <section className="grid gap-4 lg:grid-cols-3">
        {/* Pipeline / recent applications */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm lg:col-span-2">
          <header className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <Briefcase className="h-4 w-4 text-accent" /> Application pipeline
              </h3>
              <p className="text-xs text-muted-foreground">Where you stand on each role you applied to.</p>
            </div>
            <Link to="/applications" className="text-xs text-accent hover:underline">
              View all <ArrowRight className="ml-0.5 inline h-3 w-3" />
            </Link>
          </header>

          <PipelineList
            isLoading={applications.isLoading}
            applications={applications.data?.applications || []}
          />
        </div>

        {/* AI Tools quick-launch */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <header className="mb-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <Sparkles className="h-4 w-4 text-accent" /> AI Tools
              <span className="rounded-full bg-accent/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-accent">AI</span>
            </h3>
            <p className="text-xs text-muted-foreground">Jump into any AI workflow.</p>
          </header>
          <div className="grid gap-2">
            {AI_SHORTCUTS.map(({ to, icon: Icon, title, desc }) => (
              <Link
                key={to}
                to={to}
                className="group flex items-start gap-3 rounded-lg border border-border bg-background p-3 transition-colors hover:border-accent/50 hover:bg-muted/40"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-accent/10 text-accent">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{title}</p>
                  <p className="truncate text-xs text-muted-foreground">{desc}</p>
                </div>
                <ArrowRight className="h-4 w-4 self-center text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-accent" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ───────── TOP RECOMMENDED JOBS ───────── */}
      {recsSummary.jobs && recsSummary.jobs.length > 0 && (
        <section>
          <header className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-accent" /> Top picks for you
            </h2>
            <Link to="/ai/recommendations" className="text-xs text-accent hover:underline">
              See all matches <ArrowRight className="ml-0.5 inline h-3 w-3" />
            </Link>
          </header>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {recsSummary.jobs.slice(0, 3).map((job) => (
              <RecommendedJobCard key={job._id} job={job} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
function ResumeInsights({ isLoading, error, analysis, hasResume }) {
  if (!hasResume) {
    return (
      <EmptyHint
        icon={FileText}
        message="Upload a resume to unlock AI insights."
        cta={{ to: '/profile', label: 'Go to profile' }}
      />
    );
  }
  if (isLoading) return <PanelSpinner label="Analyzing resume…" />;
  if (error) return <PanelError />;
  if (!analysis) {
    return (
      <EmptyHint
        icon={Wand2}
        message="Run AI analysis to extract your skills and gaps."
        cta={{ to: '/ai/analyze-resume', label: 'Run analysis' }}
      />
    );
  }

  const skills = Array.isArray(analysis.extractedSkills) ? analysis.extractedSkills : [];
  const missing = Array.isArray(analysis.missingSkills) ? analysis.missingSkills : [];
  const suggestions = Array.isArray(analysis.suggestions) ? analysis.suggestions : [];

  return (
    <div className="space-y-3">
      <div>
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-600">Strengths</p>
        <div className="flex flex-wrap gap-1">
          {skills.slice(0, 6).map((s) => (
            <Badge key={s} variant="success">{s}</Badge>
          ))}
          {skills.length === 0 && <span className="text-xs text-muted-foreground">No skills extracted yet.</span>}
        </div>
      </div>
      <div>
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-rose-600">Watch-outs</p>
        <div className="flex flex-wrap gap-1">
          {missing.slice(0, 5).map((s) => (
            <Badge key={s} variant="destructive">{s}</Badge>
          ))}
          {missing.length === 0 && <span className="text-xs text-muted-foreground">No major gaps detected.</span>}
        </div>
      </div>
      {suggestions[0] && (
        <div className="rounded-md border border-border bg-muted/30 p-2 text-xs">
          <span className="font-semibold text-accent">Tip:</span>{' '}
          <span className="text-foreground/80">{suggestions[0]}</span>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
function MatchInsights({ isLoading, data, needsResume }) {
  if (needsResume) {
    return (
      <EmptyHint
        icon={FileText}
        message="Upload a resume so we can match you semantically."
        cta={{ to: '/profile', label: 'Upload resume' }}
      />
    );
  }
  if (isLoading) return <PanelSpinner label="Finding matches…" />;
  if (!data || data.count === 0) {
    return (
      <EmptyHint
        icon={Sparkles}
        message="No strong matches yet. Try refining your resume."
        cta={{ to: '/ai/recommendations', label: 'Open' }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 text-center">
        <div>
          <p className="text-2xl font-bold tabular-nums text-accent">{data.topMatch}%</p>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Top match</p>
        </div>
        <div>
          <p className="text-2xl font-bold tabular-nums">{data.avgMatch}%</p>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Avg match</p>
        </div>
      </div>
      {data.topJob && (
        <Link
          to={`/jobs/${data.topJob._id}`}
          className="block rounded-md border border-border bg-muted/30 p-2 transition-colors hover:border-accent/50"
        >
          <p className="truncate text-xs font-semibold">{data.topJob.title}</p>
          <p className="truncate text-[11px] text-muted-foreground">
            {data.topJob.company?.name || 'Company'} · {data.topJob.location || '—'}
          </p>
        </Link>
      )}
      {data.domains.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Top domains</p>
          {data.domains.map((d) => (
            <div key={d.name}>
              <div className="flex items-center justify-between text-xs">
                <span>{d.name}</span>
                <span className="text-muted-foreground">{d.count}</span>
              </div>
              <ScoreBar value={d.share} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
function SkillsToLearn({ analysis, hasResume }) {
  if (!hasResume) {
    return (
      <EmptyHint
        icon={FileText}
        message="Upload a resume to see skill gap suggestions."
        cta={{ to: '/profile', label: 'Upload' }}
      />
    );
  }
  const missing = Array.isArray(analysis?.missingSkills) ? analysis.missingSkills : [];
  if (!missing.length) {
    return (
      <EmptyHint
        icon={Trophy}
        message="No major skill gaps. Your resume covers your target roles well."
      />
    );
  }
  return (
    <div className="grid gap-2">
      {missing.slice(0, 6).map((s) => (
        <div
          key={s}
          className="flex items-center gap-3 rounded-md border border-border bg-card p-2.5 transition-colors hover:border-accent/40"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-accent/10 text-accent">
            <Lightbulb className="h-3.5 w-3.5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{s}</p>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Recommended skill
            </p>
          </div>
          <Badge variant="outline" className="text-[10px]">+match</Badge>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
function PipelineList({ isLoading, applications }) {
  if (isLoading) return <PanelSpinner label="Loading applications…" />;
  if (applications.length === 0) {
    return (
      <EmptyHint
        icon={Send}
        message="No applications yet. Browse jobs and apply with one click."
        cta={{ to: '/jobs', label: 'Browse jobs' }}
      />
    );
  }
  return (
    <div className="space-y-3">
      {applications.slice(0, 4).map((app) => (
        <PipelineRow key={app._id} app={app} />
      ))}
    </div>
  );
}

function PipelineRow({ app }) {
  const job = app.job;
  const status = (app.status || 'pending').toLowerCase();
  const meta = STATUS_BADGE[status] || STATUS_BADGE.pending;
  const stageIdx = stageIndexFor(status);
  const isDeclined = status === 'declined';

  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <Link
            to={job?._id ? `/jobs/${job._id}` : '#'}
            className="truncate text-sm font-semibold hover:text-accent"
          >
            {job?.title || 'Job no longer available'}
          </Link>
          <p className="truncate text-[11px] text-muted-foreground">
            {job?.company?.name || '—'} · Applied {formatDateRelative(app.createdAt)}
          </p>
        </div>
        <Badge variant={meta.variant}>{meta.label}</Badge>
      </div>
      <div className="mt-3 flex items-center gap-1">
        {APPLICATION_STAGES.map((stage, i) => {
          const reached = !isDeclined && i <= stageIdx;
          const tone = isDeclined ? 'bg-rose-500' : reached ? 'bg-accent' : 'bg-muted';
          return (
            <div key={stage.key} className="flex flex-1 items-center gap-1">
              <span
                className={cn(
                  'flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-background',
                  tone
                )}
                title={stage.label}
              >
                {reached ? <CheckCircle2 className="h-3 w-3" /> : i + 1}
              </span>
              {i < APPLICATION_STAGES.length - 1 && (
                <div className={cn('h-1 flex-1 rounded-full', i < stageIdx && !isDeclined ? 'bg-accent' : 'bg-muted')} />
              )}
            </div>
          );
        })}
      </div>
      {isDeclined && (
        <p className="mt-2 inline-flex items-center gap-1 text-[11px] text-rose-600">
          <AlertCircle className="h-3 w-3" /> Declined — keep applying, your match volume stays high.
        </p>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
function RecommendedJobCard({ job }) {
  const tone = scoreTone(job.matchPct);
  return (
    <Link
      to={`/jobs/${job._id}`}
      className="group block rounded-xl border border-border bg-card p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-accent/50 hover:shadow-md"
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold group-hover:text-accent">{job.title}</p>
          <p className="truncate text-[11px] text-muted-foreground">
            {job.company?.name || 'Company'} · {job.location || '—'}
          </p>
        </div>
        <ScoreRing value={job.matchPct} size={46} stroke={4} />
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {job.jobType && <Badge variant="outline">{job.jobType}</Badge>}
        {Array.isArray(job.requirements) &&
          job.requirements.slice(0, 2).map((r) => (
            <Badge key={r} variant="default" className="text-[10px]">{r}</Badge>
          ))}
      </div>
      <p className={cn('mt-3 text-[11px] font-semibold', tone.text)}>{tone.label} match</p>
    </Link>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
function PanelSpinner({ label }) {
  return (
    <div className="flex items-center justify-center gap-2 py-6 text-xs text-muted-foreground">
      <Loader2 className="h-3.5 w-3.5 animate-spin text-accent" /> {label}
    </div>
  );
}
function PanelError() {
  return (
    <p className="py-4 text-center text-xs text-destructive">Couldn&apos;t load this section.</p>
  );
}
function EmptyHint({ icon: Icon = Clock, message, cta }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-md border border-dashed border-border bg-muted/20 p-4 text-center">
      <Icon className="h-5 w-5 text-muted-foreground" />
      <p className="text-xs text-muted-foreground">{message}</p>
      {cta && (
        <Link to={cta.to}>
          <Button size="sm" variant="outline">{cta.label}</Button>
        </Link>
      )}
    </div>
  );
}
