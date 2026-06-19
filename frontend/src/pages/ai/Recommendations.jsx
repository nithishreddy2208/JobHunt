import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Sparkles,
  Loader2,
  FileText,
  Building2,
  MapPin,
  Briefcase,
  Wallet,
  Filter,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  ArrowRight,
  Compass,
  ChevronLeft
} from 'lucide-react';
import { aiApi } from '@/api/ai.api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import {
  ScoreRing,
  ScoreBar,
  AiBadge,
  scoreTone,
  StatTile
} from '@/components/seeker/SeekerPrimitives';
import {
  cosineToMatchPct,
  compareJobSkillsToUser,
  summarizeRecommendations
} from '@/lib/seekerInsights';
import { cn, formatSalary, formatDateRelative } from '@/lib/utils';

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 80, label: '80%+' },
  { value: 60, label: '60%+' },
  { value: 40, label: '40%+' }
];

export default function RecommendationsPage() {
  const { user } = useAuth();
  const [filterMin, setFilterMin] = useState('all');

  const query = useQuery({
    queryKey: ['ai', 'recommendations'],
    queryFn: aiApi.recommendJobs,
    staleTime: 5 * 60_000,
    retry: false
  });

  const data = query.data;
  const needsResume = data && data.success === false && /resume/i.test(data.message || '');

  const enriched = useMemo(() => {
    const jobs = Array.isArray(data?.jobs) ? data.jobs : [];
    return jobs
      .map((job) => {
        const matchPct = cosineToMatchPct(job.score);
        const { matched, missing, skillScorePct } = compareJobSkillsToUser(job, user);
        return { ...job, matchPct, matchedSkills: matched, missingSkills: missing, skillScorePct };
      })
      .sort((a, b) => b.matchPct - a.matchPct);
  }, [data, user]);

  const summary = useMemo(() => summarizeRecommendations(data), [data]);

  const filtered = useMemo(() => {
    const min = filterMin === 'all' ? 0 : Number(filterMin);
    return enriched.filter((j) => (min ? j.matchPct >= min : true));
  }, [enriched, filterMin]);

  return (
    <div className="container max-w-6xl space-y-6 py-8">
      <Link
        to="/"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-1"
      >
        <ChevronLeft className="h-4 w-4" /> Back to dashboard
      </Link>

      {/* Hero */}
      <header className="relative overflow-hidden rounded-2xl border border-accent/20 bg-gradient-to-br from-accent/10 via-fuchsia-500/5 to-sky-500/10 p-6 shadow-sm">
        <div aria-hidden className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-accent/15 blur-3xl" />
        <div className="relative flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <AiBadge>Semantic match</AiBadge>
            </div>
            <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight sm:text-3xl">
              <Sparkles className="h-6 w-6 text-accent" /> Recommended for you
            </h1>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">
              Jobs ranked by similarity to your resume embedding, with per-job
              skill alignment computed from your profile.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/jobs">
              <Button variant="outline" size="sm">
                Browse all jobs
              </Button>
            </Link>
            <Link to="/profile">
              <Button variant="ghost" size="sm">
                Improve resume <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Stats */}
      {!query.isLoading && summary.count > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile
            icon={Sparkles}
            label="Total matches"
            value={summary.count}
            hint="Jobs above the AI threshold"
          />
          <StatTile
            icon={TrendingUp}
            label="Top match"
            value={`${summary.topMatch}%`}
            hint={summary.topJob?.title || ''}
            tone={scoreTone(summary.topMatch)}
          />
          <StatTile
            icon={Compass}
            label="Avg match"
            value={`${summary.avgMatch}%`}
            tone={scoreTone(summary.avgMatch)}
          />
          <StatTile
            icon={Briefcase}
            label="Top domain"
            value={summary.domains[0]?.name || '—'}
            hint={summary.domains[0] ? `${summary.domains[0].count} role${summary.domains[0].count === 1 ? '' : 's'}` : ''}
          />
        </div>
      )}

      {/* Filters */}
      {!query.isLoading && summary.count > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/30 p-2">
          <span className="inline-flex items-center gap-1 px-2 text-xs text-muted-foreground">
            <Filter className="h-3.5 w-3.5" /> Match filter:
          </span>
          {FILTERS.map((f) => (
            <button
              key={String(f.value)}
              type="button"
              onClick={() => setFilterMin(f.value)}
              className={cn(
                'rounded-full border px-3 py-1 text-xs transition-colors',
                filterMin === f.value
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

      {/* Body */}
      {query.isLoading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Computing recommendations…
        </div>
      ) : query.isError ? (
        <Card>
          <CardContent className="p-10 text-center text-destructive">
            Failed to load recommendations.
          </CardContent>
        </Card>
      ) : needsResume ? (
        <Card>
          <CardContent className="space-y-3 p-10 text-center">
            <FileText className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="font-medium">Upload your resume to get personalized matches.</p>
            <p className="text-sm text-muted-foreground">{data.message}</p>
            <Link to="/profile">
              <Button variant="accent">Go to profile</Button>
            </Link>
          </CardContent>
        </Card>
      ) : enriched.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center text-muted-foreground">
            No matches found yet. Try refining your resume.
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center text-sm text-muted-foreground">
            No matches above {filterMin}%. Lower the threshold to see more roles.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filtered.map((job) => (
            <RecommendationCard key={job._id} job={job} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
function RecommendationCard({ job }) {
  const tone = scoreTone(job.matchPct);
  const reasons = buildReasons(job);

  return (
    <Card className="overflow-hidden transition-all hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-md">
      <CardContent className="p-5">
        {/* Top bar: title + ring */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <Link to={`/jobs/${job._id}`} className="block">
              <h3 className="truncate text-lg font-semibold hover:text-accent">{job.title}</h3>
            </Link>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
              {job.company?.name && (
                <span className="inline-flex items-center gap-1">
                  <Building2 className="h-3.5 w-3.5" /> {job.company.name}
                </span>
              )}
              {job.location && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" /> {job.location}
                </span>
              )}
              <span className="text-xs">{formatDateRelative(job.createdAt)}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ScoreRing value={job.matchPct} size={64} stroke={6} />
            <div className="text-center">
              <p className={cn('text-sm font-semibold', tone.text)}>{tone.label}</p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">match</p>
            </div>
          </div>
        </div>

        {/* Sub-scores */}
        <div className="mt-4 grid gap-3 rounded-md border border-border bg-muted/20 p-3 sm:grid-cols-2">
          <ScoreBar label="Semantic similarity" value={job.matchPct} />
          <ScoreBar label="Skill alignment" value={job.skillScorePct} />
        </div>

        {/* Why this matches */}
        {reasons.length > 0 && (
          <div className="mt-3 rounded-md border border-accent/20 bg-accent/5 p-3">
            <p className="mb-1 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-accent">
              <Sparkles className="h-3 w-3" /> Why this matches
            </p>
            <ul className="space-y-0.5 text-xs text-foreground/80">
              {reasons.map((r, i) => (
                <li key={i} className="flex gap-2">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-accent" />
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Skill chips */}
        {(job.matchedSkills.length > 0 || job.missingSkills.length > 0) && (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <p className="mb-1 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-600">
                <CheckCircle2 className="h-3 w-3" /> You have
              </p>
              <div className="flex flex-wrap gap-1">
                {job.matchedSkills.length === 0 ? (
                  <span className="text-xs text-muted-foreground">None of the listed skills detected.</span>
                ) : (
                  job.matchedSkills.slice(0, 6).map((s) => (
                    <Badge key={s} variant="success">{s}</Badge>
                  ))
                )}
              </div>
            </div>
            <div>
              <p className="mb-1 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-rose-600">
                <AlertTriangle className="h-3 w-3" /> You&apos;re missing
              </p>
              <div className="flex flex-wrap gap-1">
                {job.missingSkills.length === 0 ? (
                  <span className="text-xs text-muted-foreground">No gaps. Strong fit.</span>
                ) : (
                  job.missingSkills.slice(0, 6).map((s) => (
                    <Badge key={s} variant="destructive">{s}</Badge>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {job.jobType && (
              <Badge variant="outline" className="gap-1">
                <Briefcase className="h-3 w-3" /> {job.jobType}
              </Badge>
            )}
            {job.experienceLevel && <Badge variant="outline">{job.experienceLevel}</Badge>}
            {(job.salary || job.salary === 0) && (
              <Badge variant="accent" className="gap-1">
                <Wallet className="h-3 w-3" /> {formatSalary(job.salary)}
              </Badge>
            )}
          </div>
          <Link to={`/jobs/${job._id}`}>
            <Button variant="accent" size="sm">
              View role <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

const buildReasons = (job) => {
  const reasons = [];
  if (job.matchPct >= 70) reasons.push(`Strong semantic similarity to your resume (${job.matchPct}%)`);
  else if (job.matchPct >= 50) reasons.push(`Moderate semantic alignment (${job.matchPct}%)`);
  if (job.matchedSkills.length >= 3) {
    reasons.push(`Covers ${job.matchedSkills.slice(0, 3).join(', ')} from your skills`);
  } else if (job.matchedSkills.length > 0) {
    reasons.push(`Matches ${job.matchedSkills.length} of your listed skills`);
  }
  if (job.missingSkills.length === 0 && Array.isArray(job.requirements) && job.requirements.length > 0) {
    reasons.push('Every required skill on the JD is on your profile');
  }
  return reasons.slice(0, 3);
};
