import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ChevronLeft,
  Users,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Star,
  Mail
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useApplicants, useUpdateApplicationStatus } from '@/hooks/recruiter/useRecruiterQueries';
import { SkeletonRows, EmptyState } from '@/components/recruiter/primitives';

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

export default function ApplicantsPage() {
  const { id: jobId } = useParams();
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, error } = useApplicants(jobId, page, 20);
  const applicants = data?.applicants || [];
  const totalPages = data?.totalPages || 1;
  const total = data?.totalApplicants || 0;

  const updateStatus = useUpdateApplicationStatus(jobId);

  return (
    <div className="space-y-6">
      {/* Back link + header */}
      <div>
        <Link
          to="/admin/jobs"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" /> Back to jobs
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">Applicants</h1>
        <p className="text-sm text-muted-foreground">
          {isLoading ? 'Loading…' : `${total} total applicant${total === 1 ? '' : 's'}`}
        </p>
      </div>

      {/* List */}
      {isLoading ? (
        <Card>
          <CardContent className="p-5">
            <SkeletonRows rows={5} />
          </CardContent>
        </Card>
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
          message="As candidates apply, they will appear here. Updates are real-time after refresh."
        />
      ) : (
        <div className="grid gap-3">
          {applicants.map((app) => (
            <ApplicantCard
              key={app._id}
              app={app}
              isUpdating={updateStatus.isPending}
              onStatusChange={(status) =>
                updateStatus.mutate({ applicationId: app._id, status })
              }
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {applicants.length > 0 && totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <p className="text-muted-foreground">
            Page <span className="font-medium text-foreground">{page}</span> of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
function ApplicantCard({ app, onStatusChange, isUpdating }) {
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
        <Badge variant={meta.variant}>{meta.label}</Badge>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Skills */}
        {skills.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {skills.slice(0, 8).map((s) => (
              <Badge key={s} variant="outline">
                {s}
              </Badge>
            ))}
            {skills.length > 8 && (
              <span className="text-xs text-muted-foreground">+{skills.length - 8} more</span>
            )}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">No skills listed.</p>
        )}

        {/* Footer row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>Applied {formatDate(app.createdAt)}</span>
            {resume ? (
              <a
                href={resume}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-accent hover:underline"
              >
                Resume <ExternalLink className="h-3 w-3" />
              </a>
            ) : (
              <span className="italic">No resume</span>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
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
