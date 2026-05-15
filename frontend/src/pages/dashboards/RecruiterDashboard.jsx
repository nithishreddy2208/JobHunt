import { Link } from 'react-router-dom';
import { ArrowRight, Briefcase, Building2, PlusCircle, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';

const primaryActions = [
  {
    to: '/recruiter/jobs/new',
    icon: PlusCircle,
    title: 'Post a new job',
    desc: 'Create a job opening. Embeddings and interview prep are generated automatically.',
    cta: 'Create job'
  },
  {
    to: '/recruiter/jobs',
    icon: Briefcase,
    title: 'My job postings',
    desc: 'View, edit, and track every role you have posted.',
    cta: 'View jobs'
  },
  {
    to: '/recruiter/companies',
    icon: Building2,
    title: 'My companies',
    desc: 'Register and manage the companies you hire for.',
    cta: 'Manage companies'
  },
  {
    to: '/recruiter/applicants',
    icon: Users,
    title: 'Applicants',
    desc: 'Review candidates across all your postings and update statuses.',
    cta: 'Review applicants'
  }
];

export default function RecruiterDashboard() {
  const { user } = useAuth();

  return (
    <div className="container py-10">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Welcome, {user?.name?.split(' ')[0] || 'recruiter'} 👋
          </h1>
          <p className="mt-1 text-muted-foreground">
            Manage your hiring pipeline — from posting jobs to reviewing applicants.
          </p>
        </div>
        <Link to="/recruiter/jobs/new">
          <Button variant="accent">
            <PlusCircle className="h-4 w-4" />
            Post a job
          </Button>
        </Link>
      </header>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Your tools</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {primaryActions.map(({ to, icon: Icon, title, desc, cta }) => (
            <Link key={to} to={to} className="group">
              <Card className="h-full transition-colors hover:border-accent">
                <CardHeader>
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-accent/10 text-accent">
                    <Icon className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-lg">{title}</CardTitle>
                  <CardDescription>{desc}</CardDescription>
                </CardHeader>
                <CardContent>
                  <span className="inline-flex items-center gap-1 text-sm font-medium text-accent group-hover:gap-2 transition-all">
                    {cta} <ArrowRight className="h-4 w-4" />
                  </span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <Card className="bg-muted/50">
          <CardHeader>
            <CardTitle className="text-lg">First time here?</CardTitle>
            <CardDescription>
              Start by registering your company, then post a job under it. Applicants will appear in the Applicants tab as they apply.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/recruiter/companies">
              <Button variant="outline" size="sm">
                Register a company <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
