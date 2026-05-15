import { Link } from 'react-router-dom';
import { ArrowRight, FileText, Search, Sparkles, Briefcase, MessageSquare, Wand2, Send, FileSignature, Mic } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';

const primaryActions = [
  {
    to: '/jobs',
    icon: Search,
    title: 'Browse jobs',
    desc: 'Search and filter open roles. Use semantic search for nuanced queries.'
  },
  {
    to: '/applications',
    icon: Send,
    title: 'My applications',
    desc: 'Track every job you have applied for and its current status.'
  },
  {
    to: '/profile',
    icon: FileText,
    title: 'Profile & resume',
    desc: 'Upload your resume and let AI pre-process it for instant analysis.'
  }
];

const aiTools = [
  {
    to: '/ai/recommendations',
    icon: Sparkles,
    title: 'Job recommendations',
    desc: 'Personalized matches based on your resume.'
  },
  {
    to: '/ai/analyze-resume',
    icon: Wand2,
    title: 'Resume analysis',
    desc: 'See extracted skills, gaps, and improvement suggestions.'
  },
  {
    to: '/ai/interview-prep',
    icon: MessageSquare,
    title: 'Interview prep',
    desc: 'Get tailored questions for any role or specific job.'
  },
  {
    to: '/ai/cover-letter',
    icon: FileSignature,
    title: 'Cover letter',
    desc: 'Generate a tailored cover letter from any job description.'
  },
  {
    to: '/ai/search',
    icon: Sparkles,
    title: 'Semantic search',
    desc: 'Describe what you want in plain English; we rank by meaning.'
  },
  {
    to: '/mock-interview',
    icon: Mic,
    title: 'Voice mock interview',
    desc: 'Practice with AI-generated questions, answer by voice, get instant scoring.'
  }
];

export default function JobSeekerDashboard() {
  const { user, isPro } = useAuth();

  return (
    <div className="container py-10">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Hi, {user?.name?.split(' ')[0] || 'there'} 👋
          </h1>
          <p className="mt-1 text-muted-foreground">
            {isPro ? 'You are on the Pro plan — unlimited AI access.' : 'You are on the Free plan. 3 AI calls / 5 applications per day.'}
          </p>
        </div>
        {!isPro && (
          <Link to="/upgrade">
            <Button variant="accent">
              <Sparkles className="h-4 w-4" />
              Upgrade to Pro
            </Button>
          </Link>
        )}
      </header>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Get started</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {primaryActions.map(({ to, icon: Icon, title, desc }) => (
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
                  <span className="inline-flex items-center gap-1 text-sm text-accent group-hover:gap-2 transition-all">
                    Open <ArrowRight className="h-4 w-4" />
                  </span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">AI Tools</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {aiTools.map(({ to, icon: Icon, title, desc }) => (
            <Link key={to} to={to} className="group">
              <Card className="h-full transition-colors hover:border-accent">
                <CardHeader>
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-accent/10 text-accent">
                    <Icon className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-lg">{title}</CardTitle>
                  <CardDescription>{desc}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
