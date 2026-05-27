import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ChevronLeft,
  Users,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Star,
  Mail,
  Sparkles,
  Brain,
  Wand2,
  Filter,
  BarChart3,
  TrendingUp,
  Loader2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useApplicants, useUpdateApplicationStatus } from '@/hooks/recruiter/useRecruiterQueries';
import {
  useMatchScores,
  useShortlist,
  useCandidateSummary,
  useAnalytics
} from '@/hooks/recruiter/useRecruiterAi';
import { SkeletonRows, EmptyState } from '@/components/recruiter/primitives';
import { ScoreRing, ScoreBar, AiBadge, AiSection, scoreTone } from '@/components/recruiter/ai/AiPrimitives';
import CandidateSummaryDialog from '@/components/recruiter/ai/CandidateSummaryDialog';
import EmailGeneratorDialog from '@/components/recruiter/ai/EmailGeneratorDialog';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

const STATUS_META = {
  pending: { label: 'Pending', variant: 'default' },
  shortlisted: { label: 'Shortlisted', variant: 'accent' },
  accepted: { label: 'Accepted', variant: 'success' },
  declined: { label: 'Declined', variant: 'destructive' }
};

const formatDate = (s) => {
  if (!s) return '';
  try {
    return new Date(s).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return '';
  }
};

const Initials = ({ name }) => {
  const initials =
    (name || '')
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join('') || '?';
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/15 text-sm font-semibold text-accent">
      {initials}
    </div>
  );
};

const MATCH_FILTERS = [
  { value: 'all', label: 'All' },
  { value: '80', label: '80%+' },
  { value: '60', label: '60%+' },
  { value: '40', label: '40%+' }
];

export default function ApplicantsPage() {
  const { id: jobId } = useParams();
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [filterMin, setFilterMin] = useState('all');
  const [autoShortlistOpen, setAutoShortlistOpen] = useState(false);

  const { data, isLoading, isError, error } = useApplicants(jobId, page, 20);
  const applicants = data?.applicants || [];
  const totalPages = data?.totalPages || 1;
  const total = data?.totalApplicants || 0;

  const matchScoresQ = useMatchScores(jobId);
  const analyticsQ = useAnalytics(jobId);
  const shortlistQ = useShortlist(jobId, 5, autoShortlistOpen);

  const updateStatus = useUpdateApplicationStatus(jobId);

  const [summaryFor, setSummaryFor] = useState(null);
  const summaryMut = useCandidateSummary();

  const [emailTarget, setEmailTarget] = useState(null);

  const scoresMap = useMemo(() => {
    const map = new Map();
    for (const s of matchScoresQ.data?.scores || []) {
      map.set(s.applicationId, s);
    }
    return map;
  }, [matchScoresQ.data]);

  const filteredApplicants = useMemo(() => {
    const min = filterMin === 'all' ? 0 : Number(filterMin);
    return applicants
      .map((a) => ({ app: a, score: scoresMap.get(a._id) }))
      .filter((row) => !min || (row.score?.matchScore ?? -1) >= min)
      .sort((a, b) => (b.score?.matchScore || 0) - (a.score?.matchScore || 0));
  }, [applicants, scoresMap, filterMin]);

  const openSummary = (application) => {
    const candidateName = application.applicant?.name || 'Candidate';
    setSummaryFor({ applicationId: application._id, candidateName, data: null });
    summaryMut.mutate(application._id, {
      onSuccess: (res) => {
        setSummaryFor((cur) => (cur && cur.applicationId === application._id ? { ...cur, data: res } : cur));
      }
    });
  };

  const regenerateSummary = () => {
    if (!summaryFor?.applicationId) return;
    const id = summaryFor.applicationId;
    summaryMut.reset();
    setSummaryFor((cur) => cur && { ...cur, data: null });
    summaryMut.mutate(id, {
      onSuccess: (res) => {
        setSummaryFor((cur) => (cur && cur.applicationId === id ? { ...cur, data: res } : cur));
      }
    });
  };

  const analytics = analyticsQ.data;
  const ready = matchScoresQ.data?.ready;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          to="/admin/jobs"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" /> Back to jobs
        </Link>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
              Applicants <AiBadge>AI-ranked</AiBadge>
            </h1>
            <p className="text-sm text-muted-foreground">
              {isLoading ? 'Loading…' : `${total} total applicant${total === 1 ? '' : 's'}`}
              {ready === false && ' · embeddings still indexing'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to={`/admin/jobs/${jobId}/analytics`}>
              <Button variant="outline" size="sm">
                <BarChart3 className="h-4 w-4" /> Analytics
              </Button>
            </Link>
            <Button
              variant="accent"
              size="sm"
              onClick={() => setAutoShortlistOpen((v) => !v)}
              disabled={!ready}
            >
              <Wand2 className="h-4 w-4" /> Auto-shortlist
            </Button>
          </div>
        </div>
      </div>

      {/* Analytics quick strip */}
      {analytics && analytics.totals?.total > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MiniStat
            icon={TrendingUp}
            label="Avg match"
            value={`${analytics.averageMatchScore || 0}%`}
            tone={scoreTone(analytics.averageMatchScore || 0)}
          />
          <MiniStat icon={Users} label="Applicants" value={analytics.totals.total} />
          <MiniStat icon={Star} label="Shortlisted" value={analytics.totals.shortlisted || 0} />
          <MiniStat icon={CheckCircle2} label="Accepted" value={analytics.totals.accepted || 0} />
        </div>
      )}

      {/* Auto-shortlist panel */}
      {autoShortlistOpen && (
        <AiSection
          title="Smart shortlist"
          subtitle="Top candidates ranked by embedding + skill alignment + resume quality."
          icon={Wand2}
          action={<Button size="sm" variant="ghost" onClick={() => setAutoShortlistOpen(false)}>Hide</Button>}
        >
          {shortlistQ.isLoading ? (
            <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin text-accent" /> Ranking candidates…
            </div>
          ) : shortlistQ.data?.shortlist?.length ? (
            <div className="grid gap-2">
              {shortlistQ.data.shortlist.map((c, idx) => (
                <div
                  key={c.applicationId}
                  className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-background p-3"
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-accent/15 text-xs font-bold text-accent">
                    #{idx + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{c.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{c.reason}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className={cn('text-sm font-bold tabular-nums', scoreTone(c.matchScore).text)}>
                        {c.matchScore}%
                      </p>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        conf {c.confidence}%
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateStatus.mutate({ applicationId: c.applicationId, status: 'shortlisted' })}
                      disabled={updateStatus.isPending}
                    >
                      <Star className="h-3.5 w-3.5" /> Shortlist
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No ranked candidates yet.</p>
          )}
        </AiSection>
      )}

      {/* Filter row */}
      {!isLoading && applicants.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-muted/30 p-2">
          <div className="flex items-center gap-2 px-2 text-xs text-muted-foreground">
            <Filter className="h-3.5 w-3.5" /> Match filter:
          </div>
          <div className="flex flex-wrap gap-1">
            {MATCH_FILTERS.map((f) => (
              <button
                key={f.value}
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
        </div>
      )}

      {/* List */}
      {isLoading ? (
        <Card><CardContent className="p-5"><SkeletonRows rows={5} /></CardContent></Card>
      ) : isError ? (
        <Card>
          <CardContent className="p-6 text-sm text-destructive">
            {error?.response?.data?.message || 'Failed to load applicants.'}
          </CardContent>
        </Card>
      ) : applicants.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No applicants yet"
          message="As candidates apply, they will appear here. AI ranking activates automatically."
        />
      ) : (
        <div className="grid gap-3">
          {filteredApplicants.map(({ app, score }) => (
            <ApplicantCard
              key={app._id}
              app={app}
              score={score}
              isUpdating={updateStatus.isPending}
              onStatusChange={(status) => updateStatus.mutate({ applicationId: app._id, status })}
              onSummary={() => openSummary(app)}
              onEmail={() => setEmailTarget({ app })}
            />
          ))}
          {filteredApplicants.length === 0 && (
            <EmptyState
              icon={Filter}
              title="No applicants match this filter"
              message="Lower the match threshold to see more candidates."
            />
          )}
        </div>
      )}

      {/* Pagination */}
      {applicants.length > 0 && totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <p className="text-muted-foreground">
            Page <span className="font-medium text-foreground">{page}</span> of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
              Previous
            </Button>
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Modals */}
      <CandidateSummaryDialog
        open={!!summaryFor}
        onClose={() => setSummaryFor(null)}
        candidateName={summaryFor?.candidateName}
        data={summaryFor?.data}
        isLoading={summaryMut.isPending}
        error={summaryMut.error}
        onRegenerate={regenerateSummary}
      />

      <EmailGeneratorDialog
        open={!!emailTarget}
        onClose={() => setEmailTarget(null)}
        initialCandidateName={emailTarget?.app?.applicant?.name || ''}
        initialJobTitle={analytics?.jobTitle || ''}
        initialCompanyName={user?.profile?.company?.name || ''}
        initialRecruiterName={user?.name || ''}
      />
    </div>
  );
}

function MiniStat({ icon: Icon, label, value, tone }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className={cn('flex h-9 w-9 items-center justify-center rounded-md', tone?.soft || 'bg-accent/10', tone?.text || 'text-accent')}>
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="text-lg font-bold tabular-nums">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function ApplicantCard({ app, score, onStatusChange, isUpdating, onSummary, onEmail }) {
  const user = app.applicant || {};
  const skills = Array.isArray(user.profile?.skills) ? user.profile.skills : [];
  const hasResume = Boolean(user.profile?.resume);
  const resume = hasResume ? `/api/application/${app._id}/resume` : null;
  const meta = STATUS_META[app.status] || STATUS_META.pending;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pb-3">
        <div className="flex min-w-0 items-start gap-3">
          <Initials name={user.name} />
          <div className="min-w-0">
            <CardTitle className="truncate text-base">{user.name || 'Unknown'}</CardTitle>
            <a
              href={`mailto:${user.email}`}
              className="mt-0.5 inline-flex items-center gap-1 truncate text-xs text-muted-foreground hover:text-accent"
            >
              <Mail className="h-3 w-3" /> {user.email}
            </a>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {score && <ScoreRing value={score.matchScore} size={52} stroke={5} />}
          <Badge variant={meta.variant}>{meta.label}</Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {score && (
          <div className="grid gap-3 rounded-md border border-border bg-muted/20 p-3 sm:grid-cols-3">
            <ScoreBar label="Semantic" value={score.semanticScore} />
            <ScoreBar label="Skills" value={score.skillScore} />
            <ScoreBar label="Resume" value={score.resumeQuality} />
          </div>
        )}

        {score && (score.matchedSkills.length > 0 || score.missingSkills.length > 0) && (
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-600">Matching</p>
              <div className="flex flex-wrap gap-1">
                {score.matchedSkills.length === 0 && (
                  <span className="text-xs text-muted-foreground">None detected</span>
                )}
                {score.matchedSkills.map((s) => (
                  <Badge key={s} variant="success">{s}</Badge>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-rose-600">Missing</p>
              <div className="flex flex-wrap gap-1">
                {score.missingSkills.length === 0 && (
                  <span className="text-xs text-muted-foreground">No gaps</span>
                )}
                {score.missingSkills.map((s) => (
                  <Badge key={s} variant="destructive">{s}</Badge>
                ))}
              </div>
            </div>
          </div>
        )}

        {skills.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {skills.slice(0, 8).map((s) => (
              <Badge key={s} variant="outline">{s}</Badge>
            ))}
            {skills.length > 8 && (
              <span className="text-xs text-muted-foreground">+{skills.length - 8} more</span>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>Applied {formatDate(app.createdAt)}</span>
            {resume ? (
              <a href={resume} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-accent hover:underline">
                Resume <ExternalLink className="h-3 w-3" />
              </a>
            ) : (
              <span className="italic">No resume</span>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" size="sm" onClick={onSummary}>
              <Brain className="h-4 w-4" /> AI Summary
            </Button>
            <Button variant="ghost" size="sm" onClick={onEmail}>
              <Sparkles className="h-4 w-4" /> Email
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onStatusChange('shortlisted')}
              disabled={isUpdating || app.status === 'shortlisted'}
            >
              <Star className="h-4 w-4" /> Shortlist
            </Button>
            <Button
              variant="accent"
              size="sm"
              onClick={() => onStatusChange('accepted')}
              disabled={isUpdating || app.status === 'accepted'}
            >
              <CheckCircle2 className="h-4 w-4" /> Accept
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => onStatusChange('declined')}
              disabled={isUpdating || app.status === 'declined'}
            >
              <XCircle className="h-4 w-4" /> Reject
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
