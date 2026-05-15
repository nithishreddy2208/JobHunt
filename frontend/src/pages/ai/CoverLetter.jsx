import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Loader2, FileSignature, Sparkles, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import { aiApi } from '@/api/ai.api';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function CoverLetterPage() {
  const [searchParams] = useSearchParams();
  const jobId = searchParams.get('jobId');

  const [jobDescription, setJobDescription] = useState('');
  const [copied, setCopied] = useState(false);

  // ======== jobId mode: useQuery (idempotent across StrictMode unmount/remount) ========
  const jobQuery = useQuery({
    queryKey: ['ai', 'cover-letter', 'job', jobId],
    queryFn: () => aiApi.generateCoverLetter({ jobId }),
    enabled: !!jobId,
    retry: false,
    staleTime: 5 * 60_000
  });

  // ======== JD-paste mode: form submit ========
  const jdMutation = useMutation({
    mutationFn: (jd) => aiApi.generateCoverLetter({ jobDescription: jd }),
    retry: false
  });

  const onSubmit = (e) => {
    e.preventDefault();
    const jd = jobDescription.trim();
    if (!jd) return;
    jdMutation.mutate(jd);
  };

  const isLoading = jobId ? jobQuery.isLoading || jobQuery.isFetching : jdMutation.isPending;
  const isError = jobId ? jobQuery.isError : jdMutation.isError;
  const errorMsg = jobId
    ? jobQuery.error?.response?.data?.message || 'Failed to load cover letter.'
    : jdMutation.error?.response?.data?.message || 'Failed to generate cover letter.';
  const data = jobId ? jobQuery.data : jdMutation.data;
  const text = data?.coverLetter || '';

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success('Copied to clipboard');
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('Could not copy');
    }
  };

  return (
    <div className="container max-w-4xl py-8">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
            <FileSignature className="h-7 w-7 text-accent" /> Cover letter
          </h1>
          <p className="mt-1 text-muted-foreground">
            {jobId ? 'Generated for the job posting you opened.' : 'Paste a job description and generate a tailored cover letter.'}
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
            <form onSubmit={onSubmit} className="grid gap-3">
              <Label htmlFor="jd">Job description</Label>
              <textarea
                id="jd"
                rows={8}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                placeholder="Paste the job description here…"
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
              />
              <div className="flex justify-end">
                <Button type="submit" variant="accent" disabled={isLoading || !jobDescription.trim()}>
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
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Writing your cover letter…
        </div>
      ) : isError ? (
        <Card>
          <CardContent className="p-10 text-center text-destructive">{errorMsg}</CardContent>
        </Card>
      ) : text ? (
        <Card>
          <CardContent className="space-y-4 p-6">
            <div className="flex items-center justify-end">
              <Button type="button" variant="outline" size="sm" onClick={onCopy}>
                {copied ? <Check className="h-4 w-4 text-accent" /> : <Copy className="h-4 w-4" />}
                {copied ? 'Copied' : 'Copy'}
              </Button>
            </div>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">{text}</p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
