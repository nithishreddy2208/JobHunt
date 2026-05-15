import { Link, Navigate } from 'react-router-dom';
import { ArrowRight, Briefcase, Search, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import JobSeekerDashboard from '@/pages/dashboards/JobSeekerDashboard';

const features = [
  {
    icon: Search,
    title: 'Smart search',
    body: 'Trie-based autocomplete and semantic search find the right job, even when keywords differ.'
  },
  {
    icon: Sparkles,
    title: 'AI-powered prep',
    body: 'Resume analysis, cover letters, and interview questions tailored to each job posting.'
  },
  {
    icon: Briefcase,
    title: 'For recruiters too',
    body: 'Post jobs, track applicants, and let candidates come to you.'
  }
];

export default function HomePage() {
  const { isAuthenticated, user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center text-sm text-muted-foreground">
        Loading...
      </div>
    );
  }

  if (isAuthenticated) {
    if (user?.role === 'recruiter') {
      return <Navigate to="/admin/dashboard" replace />;
    }
    return <JobSeekerDashboard />;
  }

  return (
    <div className="container py-16">
      <section className="mx-auto max-w-3xl text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Find your next role with <span className="text-accent">JobHunt</span>
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          A modern job portal with AI-assisted applications, semantic search, and instant interview prep.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link to="/register">
            <Button variant="accent" size="lg">
              Get started <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link to="/login">
            <Button variant="outline" size="lg">Log in</Button>
          </Link>
        </div>
      </section>

      <section className="mt-20 grid gap-6 md:grid-cols-3">
        {features.map(({ icon: Icon, title, body }) => (
          <Card key={title}>
            <CardContent className="space-y-3 p-6">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-accent/10 text-accent">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold">{title}</h3>
              <p className="text-sm text-muted-foreground">{body}</p>
            </CardContent>
          </Card>
        ))}
      </section>
    </div>
  );
}
