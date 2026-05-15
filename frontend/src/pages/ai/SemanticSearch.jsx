import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Sparkles, Search, Loader2 } from 'lucide-react';
import { aiApi } from '@/api/ai.api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { JobCard } from '@/components/jobs/JobCard';

export default function SemanticSearchPage() {
  const [query, setQuery] = useState('');

  const mutation = useMutation({
    mutationFn: (q) => aiApi.semanticSearch(q),
    retry: false
  });

  const onSubmit = (e) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    mutation.mutate(q);
  };

  const data = mutation.data;
  const jobs = data?.jobs || [];

  return (
    <div className="container max-w-5xl py-8">
      <header className="mb-6">
        <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
          <Sparkles className="h-7 w-7 text-accent" /> Semantic search
        </h1>
        <p className="mt-1 text-muted-foreground">
          Describe what you want in plain English. We rank jobs by meaning, not just keywords.
        </p>
      </header>

      <Card className="mb-6">
        <CardContent className="p-4">
          <form onSubmit={onSubmit} className="grid items-center gap-3 md:grid-cols-[1fr_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder='e.g. "remote backend role with strong async/queues experience"'
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <Button type="submit" variant="accent" disabled={mutation.isPending || !query.trim()}>
              {mutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Searching…
                </>
              ) : (
                <>
                  <Search className="h-4 w-4" /> Search
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {mutation.isPending ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Computing matches…
        </div>
      ) : mutation.isError ? (
        <Card>
          <CardContent className="p-10 text-center text-destructive">Search failed. Try again.</CardContent>
        </Card>
      ) : data && jobs.length === 0 ? (
        <Card>
          <CardContent className="space-y-2 p-10 text-center">
            <p className="font-medium">No relevant jobs found.</p>
            <p className="text-sm text-muted-foreground">
              We only return matches above a quality threshold. Try a more job-specific
              query like <em>"backend engineer with kafka"</em> or <em>"remote react frontend"</em>.
            </p>
          </CardContent>
        </Card>
      ) : jobs.length > 0 ? (
        <div className="grid gap-3">
          {jobs.map((job) => (
            <JobCard key={job._id} job={job} />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-10 text-center text-muted-foreground">
            Type a query above and hit Search.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
