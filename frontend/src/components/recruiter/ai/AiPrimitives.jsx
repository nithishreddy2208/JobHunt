import { Sparkles, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

// Compact "AI" badge used to highlight AI-driven UI surfaces.
export const AiBadge = ({ className, children = 'AI', icon = Sparkles }) => {
  const Icon = icon;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-accent/20 via-fuchsia-500/15 to-sky-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-accent ring-1 ring-inset ring-accent/30',
        className
      )}
    >
      <Icon className="h-3 w-3" />
      {children}
    </span>
  );
};

// Tone helper used by every score-coloured surface so colour signalling is
// consistent across the dashboard.
export const scoreTone = (score) => {
  const n = Number(score) || 0;
  if (n >= 80) return { text: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500', soft: 'bg-emerald-500/10', ring: 'ring-emerald-500/30', label: 'Excellent' };
  if (n >= 60) return { text: 'text-sky-600 dark:text-sky-400', bg: 'bg-sky-500', soft: 'bg-sky-500/10', ring: 'ring-sky-500/30', label: 'Strong' };
  if (n >= 40) return { text: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500', soft: 'bg-amber-500/10', ring: 'ring-amber-500/30', label: 'Moderate' };
  return { text: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-500', soft: 'bg-rose-500/10', ring: 'ring-rose-500/30', label: 'Weak' };
};

// Circular score ring (no external chart lib — just SVG).
export const ScoreRing = ({ value = 0, size = 56, stroke = 6, label }) => {
  const v = Math.max(0, Math.min(100, Number(value) || 0));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (v / 100) * circumference;
  const tone = scoreTone(v);

  return (
    <div className="relative inline-flex flex-col items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={stroke}
          fill="transparent"
          className="text-muted"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={stroke}
          fill="transparent"
          strokeLinecap="round"
          stroke="currentColor"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={cn('transition-all duration-700', tone.text)}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className={cn('text-sm font-bold tabular-nums', tone.text)}>{v}%</span>
      </div>
      {label && <span className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>}
    </div>
  );
};

// Linear progress bar (used for skill % / resume quality).
export const ScoreBar = ({ value = 0, label }) => {
  const v = Math.max(0, Math.min(100, Number(value) || 0));
  const tone = scoreTone(v);
  return (
    <div className="w-full">
      {label && (
        <div className="mb-0.5 flex items-center justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
          <span>{label}</span>
          <span className={cn('font-semibold tabular-nums', tone.text)}>{v}%</span>
        </div>
      )}
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div className={cn('h-full transition-all duration-700', tone.bg)} style={{ width: `${v}%` }} />
      </div>
    </div>
  );
};

export const AiSection = ({ title, subtitle, action, children, icon = Zap, className }) => {
  const Icon = icon;
  return (
    <section className={cn('rounded-xl border border-border bg-gradient-to-br from-background to-muted/30 p-5 shadow-sm', className)}>
      <header className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10 text-accent">
            <Icon className="h-4 w-4" />
          </div>
          <div>
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              {title}
              <AiBadge>AI</AiBadge>
            </h3>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
        </div>
        {action}
      </header>
      {children}
    </section>
  );
};
