import { useEffect, useState } from 'react';
import { Loader2, X, Copy, RefreshCw, Mail, Check } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AiBadge } from './AiPrimitives';
import { useGenerateEmail } from '@/hooks/recruiter/useRecruiterAi';

const TYPES = [
  { value: 'invitation', label: 'Interview Invite' },
  { value: 'shortlist', label: 'Shortlist' },
  { value: 'rejection', label: 'Rejection' },
  { value: 'followup', label: 'Follow-up' }
];

export default function EmailGeneratorDialog({
  open,
  onClose,
  initialCandidateName = '',
  initialJobTitle = '',
  initialCompanyName = '',
  initialRecruiterName = ''
}) {
  const [type, setType] = useState('invitation');
  const [candidateName, setCandidateName] = useState(initialCandidateName);
  const [jobTitle, setJobTitle] = useState(initialJobTitle);
  const [companyName, setCompanyName] = useState(initialCompanyName);
  const [recruiterName, setRecruiterName] = useState(initialRecruiterName);
  const [notes, setNotes] = useState('');
  const [editableSubject, setEditableSubject] = useState('');
  const [editableBody, setEditableBody] = useState('');
  const [copied, setCopied] = useState(false);

  const generate = useGenerateEmail();

  useEffect(() => {
    if (!open) return;
    setCandidateName(initialCandidateName);
    setJobTitle(initialJobTitle);
    setCompanyName(initialCompanyName);
    setRecruiterName(initialRecruiterName);
  }, [open, initialCandidateName, initialJobTitle, initialCompanyName, initialRecruiterName]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && !generate.isPending && onClose?.();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose, generate.isPending]);

  if (!open) return null;

  const handleGenerate = () => {
    if (!candidateName.trim() || !jobTitle.trim()) {
      toast.error('Candidate name and job title are required');
      return;
    }
    generate.mutate(
      { type, candidateName, jobTitle, companyName, recruiterName, notes },
      {
        onSuccess: (res) => {
          setEditableSubject(res?.email?.subject || '');
          setEditableBody(res?.email?.body || '');
        }
      }
    );
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(`Subject: ${editableSubject}\n\n${editableBody}`);
      setCopied(true);
      toast.success('Email copied to clipboard');
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('Could not copy');
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-foreground/50" onClick={!generate.isPending ? onClose : undefined} />
      <div role="dialog" aria-modal="true" className="relative w-full max-w-2xl overflow-hidden rounded-xl border border-border bg-background shadow-xl">
        <header className="flex items-start justify-between gap-3 border-b border-border bg-gradient-to-r from-accent/10 via-fuchsia-500/5 to-sky-500/10 px-5 py-4">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <AiBadge icon={Mail}>AI Email</AiBadge>
            </div>
            <h2 className="text-lg font-semibold">Generate recruiter email</h2>
            <p className="text-xs text-muted-foreground">Pick a template, fill the inputs, edit & copy.</p>
          </div>
          <button onClick={onClose} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted" aria-label="Close" disabled={generate.isPending}>
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="max-h-[70vh] overflow-y-auto px-5 py-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label className="mb-1.5 block">Email type</Label>
              <div className="flex flex-wrap gap-2">
                {TYPES.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setType(t.value)}
                    className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                      type === t.value
                        ? 'border-accent bg-accent/10 text-accent'
                        : 'border-border text-muted-foreground hover:border-accent/40'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="cn" className="mb-1.5 block">Candidate name</Label>
              <Input id="cn" value={candidateName} onChange={(e) => setCandidateName(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="jt" className="mb-1.5 block">Job title</Label>
              <Input id="jt" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="co" className="mb-1.5 block">Company name</Label>
              <Input id="co" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="rn" className="mb-1.5 block">Recruiter name</Label>
              <Input id="rn" value={recruiterName} onChange={(e) => setRecruiterName(e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="notes" className="mb-1.5 block">Notes (optional)</Label>
              <textarea
                id="notes"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Interview on Friday 4pm IST, with our backend lead."
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <Button variant="accent" size="sm" onClick={handleGenerate} disabled={generate.isPending}>
              {generate.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              {editableBody ? 'Regenerate' : 'Generate'}
            </Button>
          </div>

          {(editableBody || generate.isPending) && (
            <div className="mt-4 space-y-3 rounded-lg border border-border bg-muted/20 p-3">
              <div>
                <Label className="mb-1 block text-xs uppercase tracking-wider">Subject</Label>
                <Input value={editableSubject} onChange={(e) => setEditableSubject(e.target.value)} disabled={generate.isPending} />
              </div>
              <div>
                <Label className="mb-1 block text-xs uppercase tracking-wider">Body</Label>
                <textarea
                  rows={10}
                  value={editableBody}
                  onChange={(e) => setEditableBody(e.target.value)}
                  disabled={generate.isPending}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-xs leading-relaxed placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
            </div>
          )}
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-border bg-muted/30 px-5 py-3">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={generate.isPending}>Close</Button>
          <Button variant="outline" size="sm" onClick={handleCopy} disabled={!editableBody || generate.isPending}>
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            Copy
          </Button>
        </footer>
      </div>
    </div>
  );
}
