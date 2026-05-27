import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Briefcase, Users, CheckCircle2, ListChecks, ArrowRight, PlusCircle, Wand2, Mail, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useMyJobs } from '@/hooks/recruiter/useRecruiterQueries';
import { StatCard, SkeletonRows, EmptyState } from '@/components/recruiter/primitives';
import { AiBadge } from '@/components/recruiter/ai/AiPrimitives';

const formatDate = (s) => {
  if (!s) return '';
  try {
    return new Date(s).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return '';
  }
};

export default function AdminDashboardPage() {
  const { data: jobs = [], isLoading, isError } = useMyJobs();

  const stats = useMemo(() => {
    const totalJobs = jobs.length;
    const totalApps = jobs.reduce((s, j) => s + (j.applications?.length || 0), 0);
    // "Active" jobs: posted within the last 30 days.
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const active = jobs.filter((j) => new Date(j.createdAt).getTime() >= cutoff).length;
    // Shortlisted: requires per-application status data which `getAdminJobs` doesn't include
    // (it only includes the applications-id array). We display total apps as a proxy and
    // expose the exact count once the recruiter opens the per-job applicants page.
    // The applicants page itself updates this count on demand via its own query cache.
    return { totalJobs, totalApps, active };
  }, [jobs]);

  const recentJobs = jobs.slice(0, 5);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Overview of your hiring pipeline.</p>
        </div>
        <Link to="/admin/post-job">
          <Button variant="accent" size="sm">
            <PlusCircle className="h-4 w-4" /> Post job
          </Button>
        </Link>
      </header>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          <>
            <SkeletonRows rows={1} />
            <SkeletonRows rows={1} />
            <SkeletonRows rows={1} />
            <SkeletonRows rows={1} />
          </>
        ) : (
          <>
            <StatCard icon={Briefcase} label="Total jobs" value={stats.totalJobs} />
            <StatCard icon={Users} label="Total applications" value={stats.totalApps} tone="positive" />
            <StatCard icon={CheckCircle2} label="Active jobs (30d)" value={stats.active} tone="positive" />
            <StatCard icon={ListChecks} label="Open postings" value={stats.totalJobs} hint="All currently listed" />
          </>
        )}
      </div>

      {/* AI Quick actions */}
      <Card className="border-accent/30 bg-gradient-to-br from-accent/5 via-background to-fuchsia-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            AI Tools <AiBadge>Recruiter AI</AiBadge>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          <Link to="/admin/jd-optimizer" className="group rounded-lg border border-border bg-background p-4 transition hover:border-accent/50 hover:shadow-sm">
            <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-md bg-accent/10 text-accent">
              <Wand2 className="h-4 w-4" />
            </div>
            <p className="text-sm font-semibold">JD Optimizer</p>
            <p className="text-xs text-muted-foreground">Rewrite rough JDs into ATS-friendly copy.</p>
          </Link>
          <Link to="/admin/email-composer" className="group rounded-lg border border-border bg-background p-4 transition hover:border-accent/50 hover:shadow-sm">
            <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-md bg-accent/10 text-accent">
              <Mail className="h-4 w-4" />
            </div>
            <p className="text-sm font-semibold">AI Emails</p>
            <p className="text-xs text-muted-foreground">Generate invite, shortlist, reject, follow-up.</p>
          </Link>
          <Link to="/admin/jobs" className="group rounded-lg border border-border bg-background p-4 transition hover:border-accent/50 hover:shadow-sm">
            <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-md bg-accent/10 text-accent">
              <BarChart3 className="h-4 w-4" />
            </div>
            <p className="text-sm font-semibold">Match scoring & analytics</p>
            <p className="text-xs text-muted-foreground">Pick a job to see ranked candidates.</p>
          </Link>
        </CardContent>
      </Card>

      {/* Recent jobs */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Recent jobs</CardTitle>
          <Link to="/admin/jobs" className="text-xs text-accent hover:underline">
            View all <ArrowRight className="ml-0.5 inline h-3 w-3" />
          </Link>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <SkeletonRows rows={4} />
          ) : isError ? (
            <p className="text-sm text-destructive">Failed to load jobs.</p>
          ) : recentJobs.length === 0 ? (
            <EmptyState
              icon={Briefcase}
              title="No jobs yet"
              message="Post your first job to start receiving applications."
              action={
                <Link to="/admin/post-job">
                  <Button variant="accent" size="sm">
                    <PlusCircle className="h-4 w-4" /> Post a job
                  </Button>
                </Link>
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="pb-2 font-medium">Title</th>
                    <th className="pb-2 font-medium">Company</th>
                    <th className="pb-2 font-medium">Location</th>
                    <th className="pb-2 font-medium">Applications</th>
                    <th className="pb-2 font-medium">Posted</th>
                    <th className="pb-2 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {recentJobs.map((j) => (
                    <tr key={j._id} className="border-t border-border">
                      <td className="py-3 font-medium">{j.title}</td>
                      <td className="py-3 text-muted-foreground">{j.company?.name || '—'}</td>
                      <td className="py-3 text-muted-foreground">{j.location}</td>
                      <td className="py-3">
                        <Badge variant="outline">{j.applications?.length || 0}</Badge>
                      </td>
                      <td className="py-3 text-muted-foreground">{formatDate(j.createdAt)}</td>
                      <td className="py-3 text-right">
                        <Link
                          to={`/admin/jobs/${j._id}/applicants`}
                          className="text-xs font-medium text-accent hover:underline"
                        >
                          View applicants →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
