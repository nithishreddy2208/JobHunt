import { useEffect } from 'react';
import { Loader2, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// ─────────────────────────────────────────────────────────────────────────────
// StatCard — used on the dashboard
// ─────────────────────────────────────────────────────────────────────────────
export const StatCard = ({ icon: Icon, label, value, hint, tone = 'default' }) => {
  const toneClass =
    tone === 'positive'
      ? 'bg-emerald-500/10 text-emerald-500'
      : tone === 'warning'
      ? 'bg-amber-500/10 text-amber-500'
      : 'bg-accent/10 text-accent';

  return (
    <Card>
      <CardContent className="flex items-start gap-4 p-5">
        <div className={cn('flex h-10 w-10 items-center justify-center rounded-md', toneClass)}>
          {Icon ? <Icon className="h-5 w-5" /> : null}
        </div>
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold tabular-nums">{value}</p>
          {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        </div>
      </CardContent>
    </Card>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Skeleton — single animated placeholder bar
// ─────────────────────────────────────────────────────────────────────────────
export const Skeleton = ({ className }) => (
  <div className={cn('animate-pulse rounded-md bg-muted', className)} />
);

export const SkeletonRows = ({ rows = 4, className }) => (
  <div className={cn('space-y-2', className)}>
    {Array.from({ length: rows }).map((_, i) => (
      <Skeleton key={i} className="h-10 w-full" />
    ))}
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// EmptyState
// ─────────────────────────────────────────────────────────────────────────────
export const EmptyState = ({ icon: Icon, title, message, action }) => (
  <Card>
    <CardContent className="flex flex-col items-center justify-center gap-3 p-10 text-center">
      {Icon ? (
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Icon className="h-6 w-6" />
        </div>
      ) : null}
      <h3 className="text-base font-semibold">{title}</h3>
      {message && <p className="max-w-md text-sm text-muted-foreground">{message}</p>}
      {action}
    </CardContent>
  </Card>
);

// ─────────────────────────────────────────────────────────────────────────────
// ConfirmDialog — minimal accessible modal
// ─────────────────────────────────────────────────────────────────────────────
export const ConfirmDialog = ({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  loading = false,
  onConfirm,
  onCancel
}) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape' && !loading) onCancel?.();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, loading, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-foreground/50" onClick={!loading ? onCancel : undefined} />
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-md rounded-lg border border-border bg-background p-6 shadow-lg"
      >
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="absolute right-3 top-3 rounded-md p-1.5 text-muted-foreground hover:bg-muted disabled:opacity-50"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
        <h2 className="text-lg font-semibold">{title}</h2>
        {description && <p className="mt-2 text-sm text-muted-foreground">{description}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            variant={destructive ? 'destructive' : 'accent'}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
};
