import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { Building2, MapPin, Loader2, ChevronLeft, ChevronRight, Send } from 'lucide-react';
import { applicationApi } from '@/api/application.api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDateRelative } from '@/lib/utils';

const PAGE_SIZE = 10;

const statusVariant = (status) => {
  switch ((status || '').toLowerCase()) {
    case 'accepted':
      return 'success';
    case 'declined':
      return 'destructive';
    default:
      return 'warning';
  }
};

export default function ApplicationsPage() {
  const [page, setPage] = useState(1);

  const query = useQuery({
    queryKey: ['applications', { page }],
    queryFn: () => applicationApi.mine({ page, limit: PAGE_SIZE }),
    placeholderData: keepPreviousData
  });

  const applications = query.data?.applications || [];
  const totalPages = query.data?.totalPages || 1;
  const total = query.data?.totalApplications ?? 0;

  return (
    <div className="container py-8">
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">My applications</h1>
        <p className="mt-1 text-muted-foreground">
          {query.isLoading ? 'Loading…' : `${total} application${total === 1 ? '' : 's'}`}
        </p>
      </header>

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
      ) : (
        <div className="grid gap-3">
          {applications.map((app) => {
            const job = app.job;
            return (
              <Card key={app._id}>
                <CardContent className="flex flex-wrap items-center justify-between gap-3 p-5">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        to={job?._id ? `/jobs/${job._id}` : '#'}
                        className="truncate text-base font-semibold hover:text-accent"
                      >
                        {job?.title || 'Job no longer available'}
                      </Link>
                      <Badge variant={statusVariant(app.status)} className="capitalize">
                        {app.status || 'pending'}
                      </Badge>
                    </div>
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
                  {job?._id && (
                    <Link to={`/jobs/${job._id}`}>
                      <Button variant="outline" size="sm">View job</Button>
                    </Link>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-2">
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
