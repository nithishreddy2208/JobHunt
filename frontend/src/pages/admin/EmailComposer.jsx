import { useState } from 'react';
import { Mail, Sparkles } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AiBadge } from '@/components/recruiter/ai/AiPrimitives';
import EmailGeneratorDialog from '@/components/recruiter/ai/EmailGeneratorDialog';
import { useAuth } from '@/hooks/useAuth';

export default function EmailComposerPage() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          AI Email Generator <AiBadge>AI</AiBadge>
        </h1>
        <p className="text-sm text-muted-foreground">
          Quickly draft professional interview, shortlist, rejection, and follow-up emails.
        </p>
      </div>

      <Card>
        <CardContent className="flex flex-col items-start gap-4 p-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent/10 text-accent">
            <Mail className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Compose with AI</h2>
            <p className="text-sm text-muted-foreground">
              Pick a template, fill in the candidate, role, and any extra context. AI returns a polished
              draft you can edit and copy.
            </p>
          </div>
          <Button variant="accent" onClick={() => setOpen(true)}>
            <Sparkles className="h-4 w-4" /> Open composer
          </Button>
        </CardContent>
      </Card>

      <EmailGeneratorDialog
        open={open}
        onClose={() => setOpen(false)}
        initialRecruiterName={user?.name || ''}
        initialCompanyName={user?.profile?.company?.name || ''}
      />
    </div>
  );
}
