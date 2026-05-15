import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Briefcase, PlusCircle, Search, Users, MapPin, Filter } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useMyJobs } from '@/hooks/recruiter/useRecruiterQueries';
import { SkeletonRows, EmptyState } from '@/components/recruiter/primitives';

const JOB_TYPES = ['Full-time', 'Part-time', 'Contract', 'Internship', 'Remote'];
const PAGE_SIZE = 10;

const formatDate = (s) => {
  if (!s) return '';
  try {
    return new Date(s).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return '';
  }
};

const statusForJob = (j) => {
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
  return new Date(j.createdAt).getTime() >= cutoff ? 'Active' : 'Archived';
};

const selectClass =
  'h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

export default function ManageJobsPage() {
  const { data: jobs = [], isLoading, isError } = useMyJobs();

  const [search, setSearch] = useState('');
  const [location, setLocation] = useState('');
  const [jobType, setJobType] = useState('');
  const [page, setPage] = useState(1);

  // Apply client-side filters; recruiter usually owns <100 jobs so this is cheap.
  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    const loc = location.trim().toLowerCase();
    return jobs.filter((j) => {
      if (s && !j.title?.toLowerCase().includes(s)) return false;
      if (loc && !j.location?.toLowerCase().includes(loc)) return false;
      if (jobType && j.jobType !== jobType) return false;
      return true;
    });
  }, [jobs, search, location, jobType]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageJobs = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Reset to page 1 if filters change such that current page is empty
  if (page > totalPages) setPage(1);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Manage jobs</h1>
          <p className="text-sm text-muted-foreground">All roles you have posted.</p>
        </div>
        <Link to="/admin/post-job">
          <Button variant="accent" size="sm">
            <PlusCircle className="h-4 w-4" /> Post job
          </Button>
        </Link>
      </header>

      {/* Filters */}
      <Card>
        <CardContent className="grid gap-3 p-4 md:grid-cols-[1fr_1fr_180px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search by title…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <div className="relative">
            <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Location…"
              value={location}
              onChange={(e) => {
                setLocation(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <div className="relative">
            <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <select
              className={`${selectClass} pl-9`}
              value={jobType}
              onChange={(e) => {
                setJobType(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All types</option>
              {JOB_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-5">
              <SkeletonRows rows={6} />
            </div>
          ) : isError ? (
            <p className="p-6 text-sm text-destructive">Failed to load jobs.</p>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={Briefcase}
              title={jobs.length === 0 ? 'No jobs yet' : 'No jobs match your filters'}
              message={
                jobs.length === 0
                  ? 'Post your first job to start receiving applications.'
                  : 'Adjust your filters to see more results.'
              }
              action={
                jobs.length === 0 && (
                  <Link to="/admin/post-job">
                    <Button variant="accent" size="sm">
                      <PlusCircle className="h-4 w-4" /> Post a job
                    </Button>
                  </Link>
                )
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Title</th>
                    <th className="px-4 py-3 font-medium">Type</th>
                    <th className="px-4 py-3 font-medium">Location</th>
                    <th className="px-4 py-3 font-medium">Applications</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Posted</th>
                    <th className="px-4 py-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pageJobs.map((j) => {
                    const status = statusForJob(j);
                    return (
                      <tr key={j._id} className="border-t border-border hover:bg-muted/30">
                        <td className="px-4 py-3">
                          <div className="font-medium">{j.title}</div>
                          <div className="text-xs text-muted-foreground">{j.company?.name || '—'}</div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{j.jobType}</td>
                        <td className="px-4 py-3 text-muted-foreground">{j.location}</td>
                        <td className="px-4 py-3">
                          <Badge variant="outline">{j.applications?.length || 0}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={status === 'Active' ? 'success' : 'default'}>{status}</Badge>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{formatDate(j.createdAt)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <Link to={`/admin/jobs/${j._id}/applicants`}>
                              <Button variant="outline" size="sm">
                                <Users className="h-4 w-4" /> Applicants
                              </Button>
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {filtered.length > 0 && totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <p className="text-muted-foreground">
            Showing <span className="font-medium text-foreground">{(page - 1) * PAGE_SIZE + 1}</span>–
            <span className="font-medium text-foreground">
              {Math.min(page * PAGE_SIZE, filtered.length)}
            </span>{' '}
            of <span className="font-medium text-foreground">{filtered.length}</span>
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
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
