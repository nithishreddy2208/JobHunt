import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Loader2, FileSearch, FileText, Lightbulb, AlertTriangle } from 'lucide-react';
import { aiApi } from '@/api/ai.api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

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

  return (
    <div className="container max-w-4xl py-8">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
            <FileSearch className="h-7 w-7 text-accent" /> Resume analysis
          </h1>
          <p className="mt-1 text-muted-foreground">
            AI-extracted skills, gaps and improvements from your latest resume.
          </p>
        </div>
        {data?.aiMeta?.provider && (
          <Badge variant="outline" className="capitalize">
            {data.aiMeta.provider}
          </Badge>
        )}
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
          <CardContent className="p-10 text-center text-destructive">
            Failed to analyze resume.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Extracted skills</CardTitle>
            </CardHeader>
            <CardContent>
              {analysis?.extractedSkills?.length ? (
                <div className="flex flex-wrap gap-2">
                  {analysis.extractedSkills.map((s) => (
                    <Badge key={s} variant="default">{s}</Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No skills detected.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <AlertTriangle className="h-4 w-4 text-amber-500" /> Missing / suggested skills
              </CardTitle>
            </CardHeader>
            <CardContent>
              {analysis?.missingSkills?.length ? (
                <div className="flex flex-wrap gap-2">
                  {analysis.missingSkills.map((s) => (
                    <Badge key={s} variant="warning">{s}</Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Nothing flagged.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Lightbulb className="h-4 w-4 text-accent" /> Suggestions
              </CardTitle>
            </CardHeader>
            <CardContent>
              {analysis?.suggestions?.length ? (
                <ul className="space-y-2 text-sm">
                  {analysis.suggestions.map((s, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-muted-foreground">{i + 1}.</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No suggestions.</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
