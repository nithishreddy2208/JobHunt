import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Loader2, MessageSquare, Sparkles } from 'lucide-react';
import { aiApi } from '@/api/ai.api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function InterviewPrepPage() {
  const [searchParams] = useSearchParams();
  const jobId = searchParams.get('jobId');

  const [role, setRole] = useState('');

  // ======== jobId mode: useQuery (idempotent across StrictMode unmount/remount) ========
  // useMutation + auto-fire fired twice in dev StrictMode and the second pending call kept
  // the page on a loader even after the first resolved. useQuery dedupes by key, so even if
  // the component remounts, only one network request runs.
  const jobQuery = useQuery({
    queryKey: ['ai', 'interview-prep', 'job', jobId],
    queryFn: () => aiApi.interviewPrep({ jobId }),
    enabled: !!jobId,
    retry: false,
    staleTime: 5 * 60_000
  });

  // ======== role mode: form submit ========
  const roleMutation = useMutation({
    mutationFn: (r) => aiApi.interviewPrep({ role: r }),
    retry: false
  });

  const onSubmit = (e) => {
    e.preventDefault();
    if (!role.trim()) return;
    roleMutation.mutate(role.trim());
  };

  // Pick the active source based on mode.
  const isLoading = jobId ? jobQuery.isLoading || jobQuery.isFetching : roleMutation.isPending;
  const isError = jobId ? jobQuery.isError : roleMutation.isError;
  const errorMsg = jobId
    ? jobQuery.error?.response?.data?.message || 'Failed to load interview prep.'
    : roleMutation.error?.response?.data?.message || 'Failed to generate interview prep.';
  const data = jobId ? jobQuery.data : roleMutation.data;
  const questions = data?.prep?.questions || [];
  const hasResult = !!data;

  return (
    <div className="container max-w-4xl py-8">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
            <MessageSquare className="h-7 w-7 text-accent" /> Interview prep
          </h1>
          <p className="mt-1 text-muted-foreground">
            {jobId ? 'Questions tailored to the job posting you opened.' : 'Get 5 likely questions for any role.'}
          </p>
        </div>
        {data?.aiMeta?.provider && (
          <Badge variant="outline" className="capitalize">
            {data.aiMeta.provider}
          </Badge>
        )}
      </header>

      {!jobId && (
        <Card className="mb-6">
          <CardContent className="p-5">
            <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-3">
              <div className="grid flex-1 gap-2 min-w-[200px]">
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
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Generating…
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" /> Generate
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
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
      ) : (
        <div className="grid gap-3">
          {questions.map((q, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  <span className="mr-2 text-muted-foreground">Q{i + 1}.</span>
                  {q.question}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap">
                  {q.suggestedAnswer}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
