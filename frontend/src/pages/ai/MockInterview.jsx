import { useEffect, useMemo, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  Mic,
  MicOff,
  Volume2,
  Loader2,
  Sparkles,
  ChevronRight,
  RotateCcw,
  Trophy,
  AlertTriangle,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { aiApi } from '@/api/ai.api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { useSpeechRecognition, speak } from '@/hooks/useSpeechRecognition';

// Roles offered in the dropdown. Free-form role can be added later if needed.
const ROLES = [
  'Frontend Developer',
  'Backend Developer',
  'Full Stack Developer',
  'Data Engineer',
  'Data Scientist',
  'Machine Learning Engineer',
  'DevOps Engineer',
  'Mobile Developer',
  'QA Engineer',
  'Product Manager'
];

// ─── tiny inline Progress component (avoids adding a new dep) ────────────────
const Progress = ({ value = 0 }) => (
  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
    <div
      className="h-full rounded-full bg-accent transition-all"
      style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
    />
  </div>
);

// ─── tiny inline Textarea ────────────────────────────────────────────────────
const Textarea = ({ className = '', ...props }) => (
  <textarea
    className={
      'flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ' +
      className
    }
    {...props}
  />
);

export default function MockInterviewPage() {
  // ─── flow state ────────────────────────────────────────────────────────────
  const [role, setRole] = useState(ROLES[0]);
  const [interviewStarted, setInterviewStarted] = useState(false);
  const [questions, setQuestions] = useState([]); // string[]
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState([]); // string[]
  const [finalResult, setFinalResult] = useState(null);

  // ─── speech recognition ────────────────────────────────────────────────────
  const {
    supported: speechSupported,
    listening,
    transcript,
    interim,
    error: speechError,
    start: startListening,
    stop: stopListening,
    reset: resetSpeech
  } = useSpeechRecognition({ lang: 'en-US' });

  // Keep the editable textarea in sync with what the mic hears, but allow the
  // user to manually correct typos.
  const [draftAnswer, setDraftAnswer] = useState('');
  useEffect(() => {
    // When new speech arrives, append it to the draft (only if speech changed).
    if (transcript) setDraftAnswer(transcript);
  }, [transcript]);

  // ─── mutations ─────────────────────────────────────────────────────────────
  const startMutation = useMutation({
    mutationFn: (r) => aiApi.interviewPrep({ role: r }),
    retry: false,
    onSuccess: (data) => {
      const list = (data?.prep?.questions || [])
        .map((q) => (typeof q === 'string' ? q : q?.question || ''))
        .filter(Boolean);
      if (list.length === 0) {
        toast.error('No questions generated. Try a different role.');
        return;
      }
      setQuestions(list);
      setAnswers(new Array(list.length).fill(''));
      setCurrentIndex(0);
      setDraftAnswer('');
      resetSpeech();
      setFinalResult(null);
      setInterviewStarted(true);
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to start interview.');
    }
  });

  const submitMutation = useMutation({
    mutationFn: ({ role, qa }) => aiApi.evaluateMockInterview({ role, qa }),
    retry: false,
    onSuccess: (data) => {
      setFinalResult(data?.evaluation || null);
      if (!data?.evaluation) toast.error('Empty evaluation returned.');
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Evaluation failed.');
    }
  });

  // ─── handlers ──────────────────────────────────────────────────────────────
  const handleStart = () => startMutation.mutate(role);

  const persistCurrentAnswer = () => {
    setAnswers((prev) => {
      const next = [...prev];
      next[currentIndex] = draftAnswer.trim();
      return next;
    });
  };

  const goNext = () => {
    if (listening) stopListening();
    persistCurrentAnswer();
    setCurrentIndex((i) => Math.min(i + 1, questions.length - 1));
    setDraftAnswer('');
    resetSpeech();
  };

  const handleSubmit = () => {
    if (listening) stopListening();
    // Persist the last answer synchronously before building the payload.
    const finalAnswers = [...answers];
    finalAnswers[currentIndex] = draftAnswer.trim();
    setAnswers(finalAnswers);

    const qa = questions.map((q, i) => ({ question: q, answer: finalAnswers[i] || '' }));
    submitMutation.mutate({ role, qa });
  };

  const handleRestart = () => {
    if (listening) stopListening();
    setInterviewStarted(false);
    setQuestions([]);
    setAnswers([]);
    setCurrentIndex(0);
    setDraftAnswer('');
    resetSpeech();
    setFinalResult(null);
    startMutation.reset();
    submitMutation.reset();
  };

  const handleReadQuestion = () => {
    if (questions[currentIndex]) speak(questions[currentIndex]);
  };

  // ─── derived ───────────────────────────────────────────────────────────────
  const progressPct = useMemo(() => {
    if (!questions.length) return 0;
    return ((currentIndex + (finalResult ? 1 : 0)) / questions.length) * 100;
  }, [currentIndex, questions.length, finalResult]);

  const isLastQuestion = questions.length > 0 && currentIndex === questions.length - 1;

  // ════════════════════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════════════════════

  // ── 1) Final result screen ─────────────────────────────────────────────────
  if (finalResult) {
    return (
      <div className="container max-w-3xl py-8">
        <ResultDashboard
          result={finalResult}
          role={role}
          questions={questions}
          answers={answers}
          onRestart={handleRestart}
        />
      </div>
    );
  }

  // ── 2) Setup screen ────────────────────────────────────────────────────────
  if (!interviewStarted) {
    return (
      <div className="container max-w-2xl py-10">
        <header className="mb-8 text-center">
          <h1 className="flex items-center justify-center gap-2 text-3xl font-bold tracking-tight">
            <Mic className="h-7 w-7 text-accent" /> Voice mock interview
          </h1>
          <p className="mt-2 text-muted-foreground">
            Practice with 5 AI-generated questions. Answer using your voice and get instant feedback.
          </p>
        </header>

        <Card>
          <CardContent className="space-y-5 p-6">
            <div className="grid gap-2">
              <Label htmlFor="role">Target role</Label>
              <select
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            {!speechSupported && (
              <div className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
                <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-500" />
                <div>
                  <p className="font-medium">Speech recognition unavailable</p>
                  <p className="text-muted-foreground">
                    Your browser doesn&apos;t support the Web Speech API. Use Chrome or Edge for voice input. You can still type your answers.
                  </p>
                </div>
              </div>
            )}

            <Button
              type="button"
              variant="accent"
              className="w-full"
              onClick={handleStart}
              disabled={startMutation.isPending}
            >
              {startMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Generating questions…
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" /> Start interview
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── 3) Interview screen ────────────────────────────────────────────────────
  const currentQuestion = questions[currentIndex] || '';

  return (
    <div className="container max-w-3xl py-8">
      {/* Top bar */}
      <header className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">{role}</p>
          <h1 className="text-2xl font-bold tracking-tight">
            Question {currentIndex + 1} <span className="text-muted-foreground">/ {questions.length}</span>
          </h1>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={handleRestart}>
          <RotateCcw className="h-4 w-4" /> Restart
        </Button>
      </header>

      <Progress value={progressPct} />

      {/* Question card */}
      <Card className="mt-6">
        <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pb-2">
          <CardTitle className="text-lg leading-snug">{currentQuestion}</CardTitle>
          <Button type="button" variant="outline" size="sm" onClick={handleReadQuestion}>
            <Volume2 className="h-4 w-4" /> Read
          </Button>
        </CardHeader>
        <CardContent>
          {/* Mic controls */}
          <div className="mb-3 flex flex-wrap items-center gap-2">
            {!listening ? (
              <Button
                type="button"
                variant="accent"
                onClick={startListening}
                disabled={!speechSupported}
              >
                <Mic className="h-4 w-4" /> Start recording
              </Button>
            ) : (
              <Button type="button" variant="destructive" onClick={stopListening}>
                <MicOff className="h-4 w-4" /> Stop recording
              </Button>
            )}
            {listening && (
              <span className="inline-flex items-center gap-1.5 text-xs text-accent">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
                </span>
                Listening…
              </span>
            )}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                resetSpeech();
                setDraftAnswer('');
              }}
              className="ml-auto"
            >
              Clear
            </Button>
          </div>

          {speechError && (
            <p className="mb-3 flex items-start gap-1.5 text-xs text-destructive">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5" /> {speechError}
            </p>
          )}

          {/* Live transcript / editable answer */}
          <div className="grid gap-2">
            <Label htmlFor="answer">Your answer {listening && interim && <span className="text-muted-foreground">(live…)</span>}</Label>
            <Textarea
              id="answer"
              rows={6}
              placeholder="Speak into the mic, or type your answer here…"
              value={listening && interim ? `${draftAnswer} ${interim}`.trim() : draftAnswer}
              onChange={(e) => setDraftAnswer(e.target.value)}
            />
          </div>

          {/* Navigation */}
          <div className="mt-5 flex flex-wrap items-center justify-end gap-2">
            {!isLastQuestion ? (
              <Button type="button" variant="accent" onClick={goNext} disabled={!draftAnswer.trim()}>
                Next question <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                type="button"
                variant="accent"
                onClick={handleSubmit}
                disabled={submitMutation.isPending}
              >
                {submitMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Evaluating…
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" /> Submit interview
                  </>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Submission loader overlay */}
      {submitMutation.isPending && (
        <Card className="mt-4">
          <CardContent className="flex items-center justify-center gap-2 p-6 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" /> Scoring all answers in one AI call…
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Result dashboard ────────────────────────────────────────────────────────
function ResultDashboard({ result, role, questions, answers, onRestart }) {
  const overall = Number(result?.overallScore ?? 0);
  const strengths = Array.isArray(result?.strengths) ? result.strengths : [];
  const weaknesses = Array.isArray(result?.weaknesses) ? result.weaknesses : [];
  const improvements = Array.isArray(result?.improvements) ? result.improvements : [];
  const perQ = Array.isArray(result?.results) ? result.results : [];

  const scoreColor =
    overall >= 8 ? 'text-emerald-500' : overall >= 5 ? 'text-amber-500' : 'text-destructive';

  return (
    <>
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
            <Trophy className="h-7 w-7 text-accent" /> Interview results
          </h1>
          <p className="mt-1 text-muted-foreground">Role: {role}</p>
        </div>
        <Button type="button" variant="outline" onClick={onRestart}>
          <RotateCcw className="h-4 w-4" /> New interview
        </Button>
      </header>

      <Card>
        <CardContent className="flex flex-col items-center gap-2 p-8 text-center">
          <p className="text-sm uppercase tracking-wider text-muted-foreground">Overall score</p>
          <p className={`text-6xl font-bold tabular-nums ${scoreColor}`}>
            {overall}
            <span className="text-2xl text-muted-foreground">/10</span>
          </p>
        </CardContent>
      </Card>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <BulletCard title="Strengths" icon={CheckCircle2} tone="positive" items={strengths} />
        <BulletCard title="Weaknesses" icon={XCircle} tone="negative" items={weaknesses} />
      </div>

      {improvements.length > 0 && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="text-base">Improvement suggestions</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {improvements.map((s, i) => (
                <li key={i} className="flex gap-2">
                  <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <h2 className="mb-3 mt-8 text-lg font-semibold">Per-question feedback</h2>
      <div className="grid gap-3">
        {questions.map((q, i) => {
          const r = perQ[i] || {};
          const s = Number(r.score ?? 0);
          const variant = s >= 8 ? 'default' : s >= 5 ? 'outline' : 'destructive';
          return (
            <Card key={i}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-3">
                  <CardTitle className="text-base leading-snug">
                    <span className="mr-2 text-muted-foreground">Q{i + 1}.</span>
                    {q}
                  </CardTitle>
                  <Badge variant={variant}>{s}/10</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">Your answer</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm">
                    {answers[i]?.trim() || <span className="italic text-muted-foreground">No answer provided</span>}
                  </p>
                </div>
                {r.feedback && (
                  <div>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">Feedback</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-foreground/90">{r.feedback}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </>
  );
}

function BulletCard({ title, icon: Icon, tone, items }) {
  const color =
    tone === 'positive' ? 'text-emerald-500' : tone === 'negative' ? 'text-destructive' : 'text-accent';
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className={`h-4 w-4 ${color}`} /> {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">None highlighted.</p>
        ) : (
          <ul className="space-y-1.5 text-sm">
            {items.map((it, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-muted-foreground">•</span>
                <span>{it}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
