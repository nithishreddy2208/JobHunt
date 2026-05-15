import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Sparkles, Loader2, FileText } from 'lucide-react';
import { aiApi } from '@/api/ai.api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { JobCard } from '@/components/jobs/JobCard';

export default function RecommendationsPage() {
  const query = useQuery({
    queryKey: ['ai', 'recommendations'],
    queryFn: aiApi.recommendJobs,
    staleTime: 5 * 60_000,
    retry: false
  });

  const data = query.data;
  const jobs = data?.jobs || [];
  const needsResume = data && data.success === false && /resume/i.test(data.message || '');

  return (
    <div className="container max-w-5xl py-8">
      <header className="mb-6">
        <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
          <Sparkles className="h-7 w-7 text-accent" /> Recommended for you
        </h1>
        <p className="mt-1 text-muted-foreground">
          Jobs ranked by similarity to your resume embedding.
        </p>
      </header>

      {query.isLoading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Computing recommendations…
        </div>
      ) : query.isError ? (
        <Card>
          <CardContent className="p-10 text-center text-destructive">
            Failed to load recommendations.
          </CardContent>
        </Card>
      ) : needsResume ? (
        <Card>
          <CardContent className="space-y-3 p-10 text-center">
            <FileText className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="font-medium">Upload your resume to get personalized matches.</p>
            <p className="text-sm text-muted-foreground">{data.message}</p>
            <Link to="/profile">
              <Button variant="accent">Go to profile</Button>
            </Link>
          </CardContent>
        </Card>
      ) : jobs.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center text-muted-foreground">
            No matches found yet. Try refining your resume.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {jobs.map((job) => (
            <JobCard key={job._id} job={job} />
          ))}
        </div>
      )}
    </div>
  );
}
