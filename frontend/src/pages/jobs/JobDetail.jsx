import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Building2, MapPin, Briefcase, Wallet, Users, Loader2, MessageSquare, CheckCircle2, FileSignature } from 'lucide-react';
import { toast } from 'sonner';
import { jobApi } from '@/api/job.api';
import { applicationApi } from '@/api/application.api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { formatSalary, formatDateRelative } from '@/lib/utils';

export default function JobDetailPage() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  // Show seeker-only UI for everyone except confirmed recruiters (covers null while auth probe is in flight).
  const isRecruiter = user?.role === 'recruiter';
  const showSeekerUi = !isRecruiter;

  const jobQuery = useQuery({
    queryKey: ['job', id],
    queryFn: () => jobApi.byId(id),
    enabled: !!id
  });

  // Fetch the user's applications so we can flag jobs already applied to.
  // Reused as a single page; cached cross-component because the queryKey matches Applications page.
  const applicationsQuery = useQuery({
    queryKey: ['applications', { page: 1 }],
    queryFn: () => applicationApi.mine({ page: 1, limit: 100 }),
    enabled: showSeekerUi,
    staleTime: 60_000
  });

  const alreadyApplied = (applicationsQuery.data?.applications || []).some(
    (a) => (a.job?._id || a.job) === id
  );

  const applyMutation = useMutation({
    mutationFn: () => applicationApi.apply(id),
    onSuccess: () => {
      toast.success('Application submitted!');
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      queryClient.invalidateQueries({ queryKey: ['job', id] });
    },
    onError: (err) => {
      // 429 already handled by axios interceptor
      if (err.response?.status !== 429) {
        toast.error(err.response?.data?.message || 'Failed to apply');
      }
    }
  });

  if (jobQuery.isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading job…
      </div>
    );
  }

  if (jobQuery.isError || !jobQuery.data?.job) {
    return (
      <div className="container py-16 text-center">
        <p className="text-destructive">Job not found.</p>
        <Link to="/jobs" className="mt-4 inline-block text-accent hover:underline">
          ← Back to jobs
        </Link>
      </div>
    );
  }

  const job = jobQuery.data.job;

  return (
    <div className="container max-w-4xl py-8">
      <Link to="/jobs" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="mr-1 h-4 w-4" /> Back to jobs
      </Link>

      <Card className="mt-4">
        <CardContent className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-2xl font-bold tracking-tight">{job.title}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                {job.company?.name && (
                  <span className="inline-flex items-center gap-1">
                    <Building2 className="h-4 w-4" /> {job.company.name}
                  </span>
                )}
                {job.location && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-4 w-4" /> {job.location}
                  </span>
                )}
                <span>Posted {formatDateRelative(job.createdAt)}</span>
              </div>
            </div>

            {showSeekerUi && (
              alreadyApplied ? (
                <Button variant="outline" size="lg" disabled>
                  <CheckCircle2 className="h-4 w-4 text-accent" /> Applied
                </Button>
              ) : (
                <Button
                  variant="accent"
                  size="lg"
                  disabled={applyMutation.isPending}
                  onClick={() => applyMutation.mutate()}
                >
                  {applyMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Applying…
                    </>
                  ) : (
                    'Apply now'
                  )}
                </Button>
              )
            )}
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
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
            {job.position && (
              <Badge variant="outline" className="gap-1">
                <Users className="h-3 w-3" /> {job.position} {job.position === 1 ? 'opening' : 'openings'}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {Array.isArray(job.requirements) && job.requirements.length > 0 && (
        <Card className="mt-6">
          <CardContent className="p-6">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Requirements</h2>
            <div className="flex flex-wrap gap-2">
              {job.requirements.map((r) => (
                <Badge key={r} variant="default">{r}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="mt-6">
        <CardContent className="p-6">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Description</h2>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
            {job.description || 'No description provided.'}
          </p>
        </CardContent>
      </Card>

      {showSeekerUi && (
        <Card className="mt-6 bg-muted/50">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-6">
            <div>
              <h3 className="font-semibold">AI tools for this job</h3>
              <p className="text-sm text-muted-foreground">
                Generate tailored interview questions or a cover letter.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link to={`/ai/interview-prep?jobId=${job._id}`}>
                <Button variant="outline">
                  <MessageSquare className="h-4 w-4" />
                  Interview prep
                </Button>
              </Link>
              <Link to={`/ai/cover-letter?jobId=${job._id}`}>
                <Button variant="outline">
                  <FileSignature className="h-4 w-4" />
                  Cover letter
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
