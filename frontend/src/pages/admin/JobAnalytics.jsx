import { Link, useParams } from 'react-router-dom';
import {
  ChevronLeft,
  Users,
  Star,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Trophy,
  AlertTriangle,
  BarChart3
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SkeletonRows, EmptyState } from '@/components/recruiter/primitives';
import { AiBadge, ScoreBar, scoreTone } from '@/components/recruiter/ai/AiPrimitives';
import { useAnalytics } from '@/hooks/recruiter/useRecruiterAi';
import { cn } from '@/lib/utils';

const StatCard = ({ icon: Icon, label, value, tone }) => {
  const t = tone || { soft: 'bg-accent/10', text: 'text-accent' };
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-5">
        <div className={cn('flex h-10 w-10 items-center justify-center rounded-md', t.soft, t.text)}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold tabular-nums">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
};

const Heatmap = ({ buckets, max }) => (
  <div className="grid grid-cols-5 gap-2">
    {buckets.map((b) => {
      const intensity = max ? b.count / max : 0;
      const tone = scoreTone(b.min === 0 ? 10 : (b.min + b.max) / 2);
      return (
        <div
          key={b.label}
          className="rounded-md border border-border p-3 text-center"
          style={{
            background: `color-mix(in oklab, var(--accent-color, currentColor) ${Math.round(intensity * 28)}%, transparent)`
          }}
        >
          <p className={cn('text-xs font-semibold uppercase', tone.text)}>{b.label}%</p>
          <p className="text-2xl font-bold tabular-nums">{b.count}</p>
        </div>
      );
    })}
  </div>
);

export default function JobAnalyticsPage() {
  const { id: jobId } = useParams();
  const { data, isLoading, isError } = useAnalytics(jobId);

  return (
    <div className="space-y-6">
      <div>
        <Link
          to={`/admin/jobs/${jobId}/applicants`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" /> Back to applicants
        </Link>
        <h1 className="mt-2 flex items-center gap-2 text-2xl font-bold tracking-tight">
          Applicant Analytics <AiBadge>AI</AiBadge>
        </h1>
        <p className="text-sm text-muted-foreground">
          AI-driven breakdown of the candidate pool for this job.
        </p>
      </div>

      {isLoading ? (
        <Card><CardContent className="p-5"><SkeletonRows rows={6} /></CardContent></Card>
      ) : isError || !data?.success ? (
        <Card><CardContent className="p-6 text-sm text-destructive">Failed to load analytics.</CardContent></Card>
      ) : data.totals.total === 0 ? (
        <EmptyState
          icon={Users}
          title="No applicants yet"
          message="Analytics will populate the moment candidates start applying."
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard icon={Users} label="Total applicants" value={data.totals.total} />
            <StatCard
              icon={TrendingUp}
              label="Avg match score"
              value={`${data.averageMatchScore}%`}
              tone={scoreTone(data.averageMatchScore)}
            />
            <StatCard icon={Star} label="Shortlisted" value={data.totals.shortlisted || 0} />
            <StatCard icon={CheckCircle2} label="Accepted" value={data.totals.accepted || 0} />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {/* Score distribution */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <BarChart3 className="h-4 w-4 text-accent" /> Match-score distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Heatmap
                  buckets={data.scoreBuckets || []}
                  max={Math.max(1, ...(data.scoreBuckets || []).map((b) => b.count))}
                />
              </CardContent>
            </Card>

            {/* Strongest / weakest */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Highlights</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.strongest ? (
                  <div className="rounded-md border border-border bg-emerald-50/40 p-3 dark:bg-emerald-500/5">
                    <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-600">
                      <Trophy className="h-3.5 w-3.5" /> Strongest candidate
                    </div>
                    <p className="text-sm font-semibold">{data.strongest.name}</p>
                    <p className="text-xs text-muted-foreground">{data.strongest.email}</p>
                    <p className="mt-1 text-xs">
                      <span className="font-bold text-emerald-600">{data.strongest.matchScore}%</span> match
                    </p>
                  </div>
                ) : null}
                {data.weakest && data.weakest.applicationId !== data.strongest?.applicationId ? (
                  <div className="rounded-md border border-border bg-rose-50/40 p-3 dark:bg-rose-500/5">
                    <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-rose-600">
                      <AlertTriangle className="h-3.5 w-3.5" /> Weakest candidate
                    </div>
                    <p className="text-sm font-semibold">{data.weakest.name}</p>
                    <p className="text-xs text-muted-foreground">{data.weakest.email}</p>
                    <p className="mt-1 text-xs">
                      <span className="font-bold text-rose-600">{data.weakest.matchScore}%</span> match
                    </p>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Top matching skills</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(data.topSkills || []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">No matching skills detected yet.</p>
                ) : (
                  data.topSkills.map((s) => (
                    <div key={s.skill} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <Badge variant="success">{s.skill}</Badge>
                        <span className="text-muted-foreground">
                          {s.count} of {data.totals.total} ({s.share}%)
                        </span>
                      </div>
                      <ScoreBar value={s.share} />
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Most missing skills</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(data.missingSkills || []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">No major skill gaps in this pool.</p>
                ) : (
                  data.missingSkills.map((s) => (
                    <div key={s.skill} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <Badge variant="destructive">{s.skill}</Badge>
                        <span className="text-muted-foreground">
                          {s.count} of {data.totals.total} ({s.share}%)
                        </span>
                      </div>
                      <ScoreBar value={s.share} />
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
