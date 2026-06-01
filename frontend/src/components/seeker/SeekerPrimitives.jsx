// Visual primitives shared across the JobSeeker dashboard + AI pages. We
// re-export the recruiter ScoreRing/ScoreBar to keep both halves of the
// platform numerically and visually consistent (a 70% match means the same
// thing on the recruiter side as it does on the seeker side).

import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

export { ScoreRing, ScoreBar, AiBadge, AiSection, scoreTone } from '@/components/recruiter/ai/AiPrimitives';

/**
 * Big stat card with optional icon and tone.
 * Used across the dashboard hero strip.
 */
export const StatTile = ({ icon: Icon, label, value, hint, tone, action, className }) => {
  const t = tone || { soft: 'bg-accent/10', text: 'text-accent' };
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:shadow-md',
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
          {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
        </div>
        {Icon && (
          <div className={cn('flex h-9 w-9 items-center justify-center rounded-md', t.soft, t.text)}>
            <Icon className="h-4 w-4" />
          </div>
        )}
      </div>
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
};

/**
 * Decorative gradient-edged card used to highlight AI-only surfaces. Keeps
 * the "AI-powered" feel consistent on the dashboard.
 */
export const AiCard = ({ title, subtitle, icon: Icon = Sparkles, action, className, children }) => (
  <section
    className={cn(
      'relative overflow-hidden rounded-xl border border-accent/20 bg-gradient-to-br from-accent/5 via-card to-fuchsia-500/5 p-5 shadow-sm',
      className
    )}
  >
    <header className="mb-4 flex flex-wrap items-start justify-between gap-2">
      <div className="flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/15 text-accent">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold">{title}</h3>
            <span className="rounded-full bg-accent/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-accent">
              AI
            </span>
          </div>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
      {action}
    </header>
    {children}
  </section>
);

/**
 * Vertical timeline used for application status / activity. The connectors
 * between dots are pure CSS, no extra deps.
 */
export const VerticalTimeline = ({ items = [] }) => (
  <ol className="relative ml-2 space-y-4">
    {items.map((it, idx) => {
      const isLast = idx === items.length - 1;
      return (
        <li key={it.id || idx} className="relative pl-6">
          {!isLast && (
            <span
              aria-hidden
              className="absolute left-[7px] top-4 h-full w-px bg-border"
            />
          )}
          <span
            aria-hidden
            className={cn(
              'absolute left-0 top-1 inline-flex h-4 w-4 items-center justify-center rounded-full ring-4 ring-background',
              it.tone || 'bg-accent text-accent-foreground'
            )}
          >
            {it.icon ? <it.icon className="h-2.5 w-2.5" /> : null}
          </span>
          <div className="rounded-md border border-border bg-card p-3 shadow-sm">
            {it.heading && (
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium">{it.heading}</p>
                {it.meta && <span className="text-[11px] text-muted-foreground">{it.meta}</span>}
              </div>
            )}
            {it.body && <div className="mt-1 text-xs text-muted-foreground">{it.body}</div>}
          </div>
        </li>
      );
    })}
  </ol>
);
