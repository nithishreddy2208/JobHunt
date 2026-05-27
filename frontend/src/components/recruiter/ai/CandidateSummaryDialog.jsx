import { useEffect } from 'react';
import { Loader2, Sparkles, X, CheckCircle2, AlertTriangle, BriefcaseBusiness, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AiBadge } from './AiPrimitives';

const suitabilityTone = (label) => {
  const v = String(label || '').toLowerCase();
  if (v.includes('strong')) return 'success';
  if (v.includes('moderate')) return 'warning';
  if (v.includes('weak')) return 'destructive';
  return 'default';
};

export default function CandidateSummaryDialog({ open, onClose, candidateName, data, isLoading, error, onRegenerate }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const summary = data?.summary || {};

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-foreground/50" onClick={onClose} />
      <div role="dialog" aria-modal="true" className="relative w-full max-w-lg overflow-hidden rounded-xl border border-border bg-background shadow-xl">
        <header className="flex items-start justify-between gap-3 border-b border-border bg-gradient-to-r from-accent/10 via-fuchsia-500/5 to-sky-500/10 px-5 py-4">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <AiBadge>AI Summary</AiBadge>
              {data?.aiMeta?.provider && (
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  via {data.aiMeta.provider}
                </span>
              )}
            </div>
            <h2 className="text-lg font-semibold">{candidateName || 'Candidate'}</h2>
            <p className="text-xs text-muted-foreground">AI-generated overview based on resume + role context.</p>
          </div>
          <button onClick={onClose} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="max-h-[60vh] overflow-y-auto px-5 py-4">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin text-accent" /> Generating AI summary…
            </div>
          )
           : error ? (
            <p className="py-8 text-center text-sm text-destructive">
              {error?.response?.data?.message || 'Failed to load summary.'}
            </p>
          ) : (
            <div className="space-y-4">
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <Sparkles className="h-3.5 w-3.5 text-accent" />
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Overview</h3>
                  {summary.roleSuitability && (
                    <Badge variant={suitabilityTone(summary.roleSuitability)}>{summary.roleSuitability}</Badge>
                  )}
                </div>
                <p className="text-sm leading-relaxed">{summary.summary || '—'}</p>
              </div>

              {summary.experience && (
                <div className="rounded-md border border-border bg-muted/30 p-3 text-sm">
                  <div className="mb-1 flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
                    <BriefcaseBusiness className="h-3 w-3" /> Experience
                  </div>
                  <p>{summary.experience}</p>
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-600">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Strengths
                  </div>
                  {Array.isArray(summary.strengths) && summary.strengths.length ? (
                    <ul className="space-y-1 text-sm">
                      {summary.strengths.map((s, i) => (
                        <li key={i} className="flex gap-2">
                          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-muted-foreground">No strengths returned.</p>
                  )}
                </div>
                <div>
                  <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-rose-600">
                    <AlertTriangle className="h-3.5 w-3.5" /> Gaps
                  </div>
                  {Array.isArray(summary.weaknesses) && summary.weaknesses.length ? (
                    <ul className="space-y-1 text-sm">
                      {summary.weaknesses.map((s, i) => (
                        <li key={i} className="flex gap-2">
                          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-500" />
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-muted-foreground">No weaknesses returned.</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-border bg-muted/30 px-5 py-3">
          {onRegenerate && (
            <Button variant="ghost" size="sm" onClick={onRegenerate} disabled={isLoading}>
              <RefreshCw className="h-4 w-4" /> Regenerate
            </Button>
          )}
          <Button variant="accent" size="sm" onClick={onClose}>
            Done
          </Button>
        </footer>
      </div>
    </div>
  );
}
