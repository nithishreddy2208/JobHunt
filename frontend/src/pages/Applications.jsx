import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import {
  Building2,
  MapPin,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Send,
  CheckCircle2,
  Clock,
  Star,
  XCircle,
  Filter,
  Briefcase,
  Trophy,
  AlertCircle
} from 'lucide-react';
import { applicationApi } from '@/api/application.api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatTile } from '@/components/seeker/SeekerPrimitives';
import {
  APPLICATION_STAGES,
  stageIndexFor,
  summarizeApplications
} from '@/lib/seekerInsights';
import { cn, formatDateRelative } from '@/lib/utils';

const PAGE_SIZE = 10;

const STATUS_META = {
  pending: { label: 'Under review', variant: 'warning', icon: Clock },
  shortlisted: { label: 'Shortlisted', variant: 'accent', icon: Star },
  accepted: { label: 'Accepted', variant: 'success', icon: Trophy },
  declined: { label: 'Declined', variant: 'destructive', icon: XCircle }
};

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Under review' },
  { key: 'shortlisted', label: 'Shortlisted' },
  { key: 'accepted', label: 'Accepted' },
  { key: 'declined', label: 'Declined' }
];

export default function ApplicationsPage() {
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState('all');

  const query = useQuery({
    queryKey: ['applications', { page }],
    queryFn: () => applicationApi.mine({ page, limit: PAGE_SIZE }),
    placeholderData: keepPreviousData
  });

  const applications = query.data?.applications || [];
  const totalPages = query.data?.totalPages || 1;
  const total = query.data?.totalApplications ?? 0;
  const summary = useMemo(() => summarizeApplications(applications), [applications]);

  const filtered = useMemo(() => {
    if (filter === 'all') return applications;
    return applications.filter((a) => (a.status || 'pending').toLowerCase() === filter);
  }, [applications, filter]);

  return (
    <div className="container space-y-6 py-8">
      {/* Header */}
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight sm:text-3xl">
            <Briefcase className="h-6 w-6 text-accent" /> My applications
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {query.isLoading
              ? 'Loading…'
              : `${total} application${total === 1 ? '' : 's'} · ${summary.responseRate}% recruiter response rate`}
          </p>
        </div>
        <Link to="/jobs">
          <Button variant="accent" size="sm">
            <Send className="h-4 w-4" /> Apply to more jobs
          </Button>
        </Link>
      </header>

      {/* Stats */}
      {!query.isLoading && total > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile icon={Send} label="Sent" value={summary.totals.total} />
          <StatTile icon={Clock} label="Under review" value={summary.totals.pending} />
          <StatTile icon={Star} label="Shortlisted" value={summary.totals.shortlisted} />
          <StatTile icon={CheckCircle2} label="Accepted" value={summary.totals.accepted} />
        </div>
      )}

      {/* Filters */}
      {!query.isLoading && total > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/30 p-2">
          <span className="inline-flex items-center gap-1 px-2 text-xs text-muted-foreground">
            <Filter className="h-3.5 w-3.5" /> Filter:
          </span>
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={cn(
                'rounded-full border px-3 py-1 text-xs transition-colors',
                filter === f.key
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
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading…
        </div>
      ) : query.isError ? (
        <Card>
          <CardContent className="p-10 text-center text-destructive">
            Failed to load applications.
          </CardContent>
        </Card>
      ) : applications.length === 0 ? (
        <Card>
          <CardContent className="space-y-3 p-10 text-center">
            <Send className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="text-muted-foreground">You haven&apos;t applied to any jobs yet.</p>
            <Link to="/jobs">
              <Button variant="accent">Browse jobs</Button>
            </Link>
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center text-sm text-muted-foreground">
            No applications match this filter.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {filtered.map((app) => (
            <ApplicationRow key={app._id} app={app} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-2 flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1 || query.isFetching}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            <ChevronLeft className="h-4 w-4" /> Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages || query.isFetching}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Next <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
function ApplicationRow({ app }) {
  const job = app.job;
  const status = (app.status || 'pending').toLowerCase();
  const meta = STATUS_META[status] || STATUS_META.pending;
  const StatusIcon = meta.icon;
  const stageIdx = stageIndexFor(status);
  const isDeclined = status === 'declined';

  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        {/* Top row: title + meta + status */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <Link
              to={job?._id ? `/jobs/${job._id}` : '#'}
              className="block truncate text-base font-semibold hover:text-accent"
            >
              {job?.title || 'Job no longer available'}
            </Link>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              {job?.company?.name && (
                <span className="inline-flex items-center gap-1">
                  <Building2 className="h-3.5 w-3.5" /> {job.company.name}
                </span>
              )}
              {job?.location && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" /> {job.location}
                </span>
              )}
              <span>Applied {formatDateRelative(app.createdAt)}</span>
            </div>
          </div>
          <Badge variant={meta.variant} className="gap-1">
            <StatusIcon className="h-3 w-3" /> {meta.label}
          </Badge>
        </div>

        {/* Stage timeline */}
        <StageTimeline stageIdx={stageIdx} isDeclined={isDeclined} />

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          {isDeclined ? (
            <p className="inline-flex items-center gap-1 text-xs text-rose-600">
              <AlertCircle className="h-3.5 w-3.5" /> This role didn&apos;t move forward. Keep applying.
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              {STAGE_HINT[stageIdx] || ''}
            </p>
          )}
          {job?._id && (
            <Link to={`/jobs/${job._id}`}>
              <Button variant="outline" size="sm">View job</Button>
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

const STAGE_HINT = {
  0: 'Application submitted — waiting for the recruiter to open it.',
  1: 'The recruiter is reviewing your application.',
  2: 'You made the shortlist — interview likely next.',
  3: 'Offer extended. Congrats!'
};

function StageTimeline({ stageIdx, isDeclined }) {
  return (
    <ol className="flex items-center gap-1">
      {APPLICATION_STAGES.map((stage, i) => {
        const reached = !isDeclined && i <= stageIdx;
        const isLast = i === APPLICATION_STAGES.length - 1;
        const dotTone = isDeclined
          ? 'bg-rose-500 text-white'
          : reached
          ? 'bg-accent text-accent-foreground'
          : 'bg-muted text-muted-foreground';
        const lineTone = !isDeclined && i < stageIdx ? 'bg-accent' : 'bg-muted';
        return (
          <li key={stage.key} className="flex flex-1 items-center">
            <div className="flex flex-col items-center gap-1">
              <span
                className={cn(
                  'flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold ring-4 ring-background transition-colors',
                  dotTone
                )}
              >
                {reached ? <CheckCircle2 className="h-3.5 w-3.5" /> : i + 1}
              </span>
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                {stage.label}
              </span>
            </div>
            {!isLast && <div className={cn('mb-4 h-1 flex-1 rounded-full', lineTone)} />}
          </li>
        );
      })}
    </ol>
  );
}
