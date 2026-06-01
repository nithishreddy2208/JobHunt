import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Loader2,
  FileSearch,
  FileText,
  Lightbulb,
  AlertTriangle,
  CheckCircle2,
  Target,
  Brain,
  RefreshCw
} from 'lucide-react';
import { aiApi } from '@/api/ai.api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScoreRing, AiBadge, AiCard, scoreTone } from '@/components/seeker/SeekerPrimitives';
import { computeAtsScore } from '@/lib/seekerInsights';
import { cn } from '@/lib/utils';

export default function AnalyzeResumePage() {
  const query = useQuery({
    queryKey: ['ai', 'analyze-resume'],
    queryFn: aiApi.analyzeResume,
    staleTime: 5 * 60_000,
    retry: false
  });

  const data = query.data;
  const analysis = data?.analysis;
  const isMissingResume = query.error?.response?.status === 400 || (data && data.success === false);

  const atsScore = useMemo(() => computeAtsScore({ analysis }), [analysis]);
  const tone = scoreTone(atsScore);

  const skills = Array.isArray(analysis?.extractedSkills) ? analysis.extractedSkills : [];
  const missing = Array.isArray(analysis?.missingSkills) ? analysis.missingSkills : [];
  const suggestions = Array.isArray(analysis?.suggestions) ? analysis.suggestions : [];

  return (
    <div className="container max-w-5xl space-y-6 py-8">
      {/* Hero */}
      <header className="relative overflow-hidden rounded-2xl border border-accent/20 bg-gradient-to-br from-accent/10 via-card to-fuchsia-500/5 p-6 shadow-sm">
        <div aria-hidden className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-accent/15 blur-3xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="mb-2"><AiBadge>Resume intelligence</AiBadge></div>
            <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight sm:text-3xl">
              <FileSearch className="h-6 w-6 text-accent" /> Resume analysis
            </h1>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">
              AI-extracted skills, gaps and improvements from your latest resume.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {data?.aiMeta?.provider && (
                <Badge variant="outline" className="capitalize">{data.aiMeta.provider}</Badge>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => query.refetch()}
                disabled={query.isFetching}
              >
                <RefreshCw className={cn('h-3.5 w-3.5', query.isFetching && 'animate-spin')} /> Re-run
              </Button>
            </div>
          </div>
          {!isMissingResume && !query.isLoading && (
            <div className="flex flex-col items-center rounded-xl border border-border bg-background/70 px-6 py-4 backdrop-blur">
              <span className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                <Target className="h-3 w-3" /> ATS readiness
              </span>
              <ScoreRing value={atsScore} size={104} stroke={9} />
              <span className={cn('mt-1 text-xs font-semibold', tone.text)}>{tone.label}</span>
            </div>
          )}
        </div>
      </header>

      {query.isLoading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Analyzing your resume…
        </div>
      ) : isMissingResume ? (
        <Card>
          <CardContent className="space-y-3 p-10 text-center">
            <FileText className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="font-medium">No resume on file.</p>
            <p className="text-sm text-muted-foreground">
              {query.error?.response?.data?.message || data?.message || 'Upload a resume to get an analysis.'}
            </p>
            <Link to="/profile">
              <Button variant="accent">Upload resume</Button>
            </Link>
          </CardContent>
        </Card>
      ) : query.isError ? (
        <Card>
          <CardContent className="p-10 text-center text-destructive">Failed to analyze resume.</CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Strengths */}
          <AiCard title="Your strengths" subtitle="Skills recruiters will spot instantly" icon={CheckCircle2}>
            {skills.length ? (
              <div className="flex flex-wrap gap-1.5">
                {skills.map((s) => (
                  <Badge key={s} variant="success">{s}</Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No skills detected.</p>
            )}
          </AiCard>

          {/* Gaps */}
          <AiCard title="Skill gaps" subtitle="Add these to widen your match" icon={AlertTriangle}>
            {missing.length ? (
              <div className="flex flex-wrap gap-1.5">
                {missing.map((s) => (
                  <Badge key={s} variant="warning">{s}</Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Nothing flagged — strong coverage.</p>
            )}
          </AiCard>

          {/* Suggestions full width */}
          <div className="lg:col-span-2">
            <AiCard title="Improvement suggestions" subtitle="Actionable edits to lift your ATS score" icon={Lightbulb}>
              {suggestions.length ? (
                <ul className="space-y-2">
                  {suggestions.map((s, i) => (
                    <li key={i} className="flex items-start gap-3 rounded-md border border-border bg-card p-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/10 text-xs font-bold text-accent">
                        {i + 1}
                      </span>
                      <span className="text-sm text-foreground/90">{s}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No suggestions.</p>
              )}
            </AiCard>
          </div>

          {/* Next steps */}
          <div className="lg:col-span-2 flex flex-wrap gap-2">
            <Link to="/ai/recommendations">
              <Button variant="accent" size="sm"><Brain className="h-4 w-4" /> See matching jobs</Button>
            </Link>
            <Link to="/profile">
              <Button variant="outline" size="sm">Update resume</Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
