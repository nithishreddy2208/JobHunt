import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Loader2, FileSignature, Sparkles, Copy, Check, Download } from 'lucide-react';
import { toast } from 'sonner';
import { aiApi } from '@/api/ai.api';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AiBadge } from '@/components/seeker/SeekerPrimitives';

export default function CoverLetterPage() {
  const [searchParams] = useSearchParams();
  const jobId = searchParams.get('jobId');

  const [jobDescription, setJobDescription] = useState('');
  const [copied, setCopied] = useState(false);

  const jobQuery = useQuery({
    queryKey: ['ai', 'cover-letter', 'job', jobId],
    queryFn: () => aiApi.generateCoverLetter({ jobId }),
    enabled: !!jobId,
    retry: false,
    staleTime: 5 * 60_000
  });

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

  const onDownload = () => {
    try {
      const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'cover-letter.txt';
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Could not download');
    }
  };

  return (
    <div className="container max-w-4xl space-y-6 py-8">
      {/* Hero */}
      <header className="relative overflow-hidden rounded-2xl border border-accent/20 bg-gradient-to-br from-accent/10 via-card to-fuchsia-500/5 p-6 shadow-sm">
        <div aria-hidden className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-accent/15 blur-3xl" />
        <div className="relative">
          <div className="mb-2"><AiBadge>Cover letter writer</AiBadge></div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight sm:text-3xl">
            <FileSignature className="h-6 w-6 text-accent" /> Cover letter
          </h1>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            {jobId ? 'Generated for the job posting you opened.' : 'Paste a job description and generate a tailored cover letter.'}
          </p>

          {!jobId && (
            <form onSubmit={onSubmit} className="mt-5 grid gap-3">
              <Label htmlFor="jd">Job description</Label>
              <textarea
                id="jd"
                rows={7}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                placeholder="Paste the job description here…"
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
              />
              <div className="flex justify-end">
                <Button type="submit" variant="accent" disabled={isLoading || !jobDescription.trim()}>
                  {isLoading ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Generating…</>
                  ) : (
                    <><Sparkles className="h-4 w-4" /> Generate</>
                  )}
                </Button>
              </div>
            </form>
          )}
        </div>
      </header>

      {data?.aiMeta?.provider && (
        <div className="flex justify-end">
          <Badge variant="outline" className="capitalize">{data.aiMeta.provider}</Badge>
        </div>
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
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-border bg-muted/30 px-5 py-3">
            <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-accent" /> Your cover letter
            </span>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={onDownload}>
                <Download className="h-4 w-4" /> Download
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={onCopy}>
                {copied ? <Check className="h-4 w-4 text-accent" /> : <Copy className="h-4 w-4" />}
                {copied ? 'Copied' : 'Copy'}
              </Button>
            </div>
          </div>
          <CardContent className="p-6">
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">{text}</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 p-10 text-center">
            <FileSignature className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {jobId ? 'Generating your tailored cover letter…' : 'Paste a job description above to generate a cover letter.'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
