import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Loader2, MessageSquare, Sparkles, Mic, HelpCircle, Lightbulb } from 'lucide-react';
import { aiApi } from '@/api/ai.api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AiBadge } from '@/components/seeker/SeekerPrimitives';

export default function InterviewPrepPage() {
  const [searchParams] = useSearchParams();
  const jobId = searchParams.get('jobId');

  const [role, setRole] = useState('');

  // jobId mode: useQuery (idempotent across StrictMode unmount/remount).
  const jobQuery = useQuery({
    queryKey: ['ai', 'interview-prep', 'job', jobId],
    queryFn: () => aiApi.interviewPrep({ jobId }),
    enabled: !!jobId,
    retry: false,
    staleTime: 5 * 60_000
  });

  const roleMutation = useMutation({
    mutationFn: (r) => aiApi.interviewPrep({ role: r }),
    retry: false
  });

  const onSubmit = (e) => {
    e.preventDefault();
    if (!role.trim()) return;
    roleMutation.mutate(role.trim());
  };

  const isLoading = jobId ? jobQuery.isLoading || jobQuery.isFetching : roleMutation.isPending;
  const isError = jobId ? jobQuery.isError : roleMutation.isError;
  const errorMsg = jobId
    ? jobQuery.error?.response?.data?.message || 'Failed to load interview prep.'
    : roleMutation.error?.response?.data?.message || 'Failed to generate interview prep.';
  const data = jobId ? jobQuery.data : roleMutation.data;
  const questions = data?.prep?.questions || [];
  const hasResult = !!data;

  return (
    <div className="container max-w-4xl space-y-6 py-8">
      {/* Hero */}
      <header className="relative overflow-hidden rounded-2xl border border-accent/20 bg-gradient-to-br from-accent/10 via-card to-sky-500/5 p-6 shadow-sm">
        <div aria-hidden className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-accent/15 blur-3xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="mb-2"><AiBadge>Interview coach</AiBadge></div>
            <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight sm:text-3xl">
              <MessageSquare className="h-6 w-6 text-accent" /> Interview prep
            </h1>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">
              {jobId ? 'Questions tailored to the job posting you opened.' : 'Get likely questions and model answers for any role.'}
            </p>
          </div>
          <Link to="/mock-interview">
            <Button variant="outline" size="sm"><Mic className="h-4 w-4" /> Practice by voice</Button>
          </Link>
        </div>

        {!jobId && (
          <form onSubmit={onSubmit} className="relative mt-5 flex flex-wrap items-end gap-3">
            <div className="grid min-w-[220px] flex-1 gap-2">
              <Label htmlFor="role">Role / job title</Label>
              <Input
                id="role"
                placeholder="e.g. Senior React Engineer"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              />
            </div>
            <Button type="submit" variant="accent" disabled={isLoading || !role.trim()}>
              {isLoading ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Generating…</>
              ) : (
                <><Sparkles className="h-4 w-4" /> Generate</>
              )}
            </Button>
          </form>
        )}
      </header>

      {data?.aiMeta?.provider && (
        <div className="flex justify-end">
          <Badge variant="outline" className="capitalize">{data.aiMeta.provider}</Badge>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Preparing questions…
        </div>
      ) : isError ? (
        <Card>
          <CardContent className="p-10 text-center text-destructive">{errorMsg}</CardContent>
        </Card>
      ) : hasResult && questions.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center text-muted-foreground">
            No questions returned. Try again or set a more specific role.
          </CardContent>
        </Card>
      ) : hasResult ? (
        <div className="grid gap-4">
          {questions.map((q, i) => (
            <Card key={i} className="overflow-hidden">
              <CardContent className="p-0">
                <div className="flex items-start gap-3 border-b border-border bg-muted/30 p-4">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/15 text-xs font-bold text-accent">
                    {i + 1}
                  </span>
                  <div className="flex items-start gap-2">
                    <HelpCircle className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                    <p className="font-semibold leading-snug">{q.question}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2 p-4">
                  <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                  <div>
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Suggested answer
                    </p>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                      {q.suggestedAnswer}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          <div className="flex flex-wrap gap-2">
            <Link to="/mock-interview">
              <Button variant="accent" size="sm"><Mic className="h-4 w-4" /> Rehearse out loud</Button>
            </Link>
          </div>
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 p-10 text-center">
            <MessageSquare className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Enter a role above to generate tailored interview questions.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
