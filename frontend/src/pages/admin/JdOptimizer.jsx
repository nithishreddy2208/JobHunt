import { useState } from 'react';
import { Loader2, Wand2, Copy, Check, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AiBadge } from '@/components/recruiter/ai/AiPrimitives';
import { useOptimizeJd } from '@/hooks/recruiter/useRecruiterAi';

export default function JdOptimizerPage() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [requirements, setRequirements] = useState('');
  const [copied, setCopied] = useState(false);
  const optimize = useOptimizeJd();

  const result = optimize.data;
  const opt = result?.optimized;

  const responsibilitiesList = Array.isArray(opt?.responsibilities)
    ? opt.responsibilities
    : opt?.responsibilities
      ? [opt.responsibilities]
      : [];

  const requirementsList = Array.isArray(opt?.requirements)
    ? opt.requirements
    : opt?.requirements
      ? [opt.requirements]
      : [];

  const improvementsList = Array.isArray(opt?.improvements)
    ? opt.improvements
    : opt?.improvements
      ? [opt.improvements]
      : [];

  const handleOptimize = () => {
    if (description.trim().length < 20) {
      toast.error('Please add at least 20 characters of description.');
      return;
    }
    optimize.mutate({
      title,
      description,
      requirements: requirements
        .split(',')
        .map((r) => r.trim())
        .filter(Boolean)
    });
  };

  const handleCopy = async () => {
    if (!opt?.optimizedDescription) return;
    try {
      const text = [
        opt.optimizedDescription,
        '',
        'Responsibilities:',
        ...responsibilitiesList.map((r) => `- ${r}`),
        '',
        'Requirements:',
        ...requirementsList.map((r) => `- ${r}`)
      ].join('\n');
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success('Optimized JD copied');
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('Could not copy');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          JD Optimizer <AiBadge>AI</AiBadge>
        </h1>
        <p className="text-sm text-muted-foreground">
          Paste a rough job description. AI will rewrite it to be more professional and ATS-friendly.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Draft</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-1.5">
              <Label htmlFor="title">Job title</Label>
              <Input id="title" placeholder="e.g. Senior React Engineer" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="reqs">Existing requirements (comma-separated)</Label>
              <Input id="reqs" placeholder="React, Node.js, Redis" value={requirements} onChange={(e) => setRequirements(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="desc">Rough description</Label>
              <textarea
                id="desc"
                rows={14}
                placeholder="Paste your initial JD here — even messy bullet points work."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <Button variant="accent" onClick={handleOptimize} disabled={optimize.isPending}>
              {optimize.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
              Optimize with AI
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-accent" /> Optimized output
            </CardTitle>
            {opt?.optimizedDescription && (
              <Button variant="outline" size="sm" onClick={handleCopy}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} Copy
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {optimize.isPending ? (
              <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin text-accent" /> Optimizing your JD…
              </div>
            ) : !opt ? (
              <p className="py-12 text-center text-sm text-muted-foreground">
                Optimized output will appear here.
              </p>
            ) : (
              <div className="space-y-4 text-sm">
                <div>
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Optimized description
                  </p>
                  <p className="whitespace-pre-wrap leading-relaxed">{opt.optimizedDescription}</p>
                </div>

                {!!responsibilitiesList.length && (
                  <div>
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Responsibilities
                    </p>
                    <ul className="space-y-1">
                      {responsibilitiesList.map((r, i) => (
                        <li key={i} className="flex gap-2">
                          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                          <span>{r}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {!!requirementsList.length && (
                  <div>
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Requirements
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {requirementsList.map((r, i) => (
                        <Badge key={i} variant="outline">{r}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {!!improvementsList.length && (
                  <div className="rounded-md border border-border bg-muted/30 p-3">
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-accent">
                      What changed
                    </p>
                    <ul className="space-y-1 text-xs text-muted-foreground">
                      {improvementsList.map((r, i) => (
                        <li key={i}>• {r}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
