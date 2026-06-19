import { useEffect, useMemo, useRef, useState } from 'react';
import { Bot, Loader2, Send, X, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  CANDIDATE_TYPE_QUESTION,
  getQuestionsFor
} from '@/lib/screeningQuestions';

/**
 * AI Application Assistant — a chatbot-style pre-screening flow shown when a
 * candidate clicks "Apply". Walks fresher/experienced question sets one at a
 * time, then submits a structured screening profile via `onSubmit`.
 */
export default function ApplyScreeningModal({ open, onClose, jobTitle, isSubmitting, onSubmit }) {
  const [candidateType, setCandidateType] = useState(null);
  const [stepIndex, setStepIndex] = useState(0); // index into branch questions
  const [answers, setAnswers] = useState({});
  const [transcript, setTranscript] = useState([]); // { role, text }
  const [textValue, setTextValue] = useState('');
  const [tagValue, setTagValue] = useState('');
  const [tags, setTags] = useState([]);

  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  const questions = useMemo(() => getQuestionsFor(candidateType), [candidateType]);
  const current = candidateType ? questions[stepIndex] : CANDIDATE_TYPE_QUESTION;
  const finished = Boolean(candidateType) && stepIndex >= questions.length;

  // Reset everything whenever the modal is (re)opened.
  useEffect(() => {
    if (open) {
      setCandidateType(null);
      setStepIndex(0);
      setAnswers({});
      setTextValue('');
      setTagValue('');
      setTags([]);
      setTranscript([{ role: 'bot', text: CANDIDATE_TYPE_QUESTION.label }]);
    }
  }, [open]);

  // Auto-scroll to newest message + focus input on each new question.
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    if (open && current && current.type !== 'choice' && current.type !== 'yesno') {
      const t = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [transcript, open, current]);

  if (!open) return null;

  const pushBotQuestion = (q) => {
    if (q) setTranscript((t) => [...t, { role: 'bot', text: q.label }]);
  };

  const advance = (displayAnswer, value) => {
    const q = current;
    setTranscript((t) => [...t, { role: 'user', text: displayAnswer }]);
    setAnswers((a) => ({
      ...a,
      [q.key]: value,
      __log: [...(a.__log || []), { question: q.label, answer: displayAnswer }]
    }));

    const nextIndex = stepIndex + 1;
    setStepIndex(nextIndex);
    setTextValue('');
    setTags([]);
    setTagValue('');

    if (nextIndex < questions.length) {
      pushBotQuestion(questions[nextIndex]);
    } else {
      setTranscript((t) => [
        ...t,
        { role: 'bot', text: 'Thanks! Review and submit your application below.' }
      ]);
    }
  };

  const chooseType = (value, label) => {
    setCandidateType(value);
    setStepIndex(0);
    const qs = getQuestionsFor(value);
    setTranscript((t) => [...t, { role: 'user', text: label }]);
    setAnswers({ candidateType: value, __log: [{ question: CANDIDATE_TYPE_QUESTION.label, answer: label }] });
    setTimeout(() => pushBotQuestion(qs[0]), 0);
  };

  const submitText = () => {
    const val = textValue.trim();
    if (!val) {
      if (current.optional) advance('Skipped', '');
      return;
    }
    advance(val, val);
  };

  const submitTags = () => {
    const all = tagValue.trim() ? [...tags, tagValue.trim()] : tags;
    if (all.length === 0) {
      if (current.optional) advance('Skipped', []);
      return;
    }
    advance(all.join(', '), all);
  };

  const addTag = () => {
    const v = tagValue.trim();
    if (v && !tags.includes(v)) setTags((t) => [...t, v]);
    setTagValue('');
  };

  const buildScreening = () => {
    const { __log, ...fields } = answers;
    return { ...fields, answers: __log || [] };
  };

  const handleFinalSubmit = () => onSubmit(buildScreening());

  const progress = candidateType
    ? Math.round((Math.min(stepIndex, questions.length) / questions.length) * 100)
    : 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="flex h-[88vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-border bg-background shadow-xl sm:h-[80vh] sm:rounded-2xl">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-border bg-muted/40 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/15 text-accent">
              <Bot className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">Application Assistant</p>
              <p className="truncate text-xs text-muted-foreground">{jobTitle || 'Pre-screening'}</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Progress */}
        {candidateType && (
          <div className="h-1 w-full bg-muted">
            <div className="h-full bg-accent transition-all" style={{ width: `${progress}%` }} />
          </div>
        )}

        {/* Transcript */}
        <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
          {transcript.map((m, i) => (
            <div key={i} className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
              <div
                className={cn(
                  'max-w-[80%] rounded-2xl px-3.5 py-2 text-sm',
                  m.role === 'user'
                    ? 'rounded-br-sm bg-accent text-accent-foreground'
                    : 'rounded-bl-sm bg-muted text-foreground'
                )}
              >
                {m.text}
              </div>
            </div>
          ))}
        </div>

        {/* Input area */}
        <div className="border-t border-border bg-background px-4 py-3">
          {/* Candidate type choice */}
          {!candidateType && (
            <div className="flex gap-2">
              {CANDIDATE_TYPE_QUESTION.options.map((o) => (
                <Button key={o.value} variant="outline" className="flex-1" onClick={() => chooseType(o.value, o.label)}>
                  {o.label}
                </Button>
              ))}
            </div>
          )}

          {/* Branch questions */}
          {candidateType && !finished && current && (
            <>
              {current.type === 'yesno' && (
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => advance('Yes', true)}>Yes</Button>
                  <Button variant="outline" className="flex-1" onClick={() => advance('No', false)}>No</Button>
                </div>
              )}

              {current.type === 'tags' && (
                <div className="space-y-2">
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {tags.map((t) => (
                        <Badge key={t} variant="accent" className="cursor-pointer" onClick={() => setTags((arr) => arr.filter((x) => x !== t))}>
                          {t} ×
                        </Badge>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Input
                      ref={inputRef}
                      value={tagValue}
                      placeholder={current.placeholder}
                      onChange={(e) => setTagValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') { e.preventDefault(); addTag(); }
                      }}
                    />
                    <Button type="button" variant="outline" onClick={addTag}>Add</Button>
                    <Button type="button" variant="accent" onClick={submitTags}>
                      {current.optional && tags.length === 0 && !tagValue.trim() ? 'Skip' : 'Next'}
                    </Button>
                  </div>
                </div>
              )}

              {(current.type === 'text' || current.type === 'number' || current.type === 'textarea') && (
                <div className="flex items-end gap-2">
                  {current.type === 'textarea' ? (
                    <textarea
                      ref={inputRef}
                      value={textValue}
                      placeholder={current.placeholder}
                      rows={2}
                      onChange={(e) => setTextValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); submitText(); }
                      }}
                      className="flex-1 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                    />
                  ) : (
                    <Input
                      ref={inputRef}
                      type={current.type === 'number' ? 'number' : 'text'}
                      value={textValue}
                      placeholder={current.placeholder}
                      onChange={(e) => setTextValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') { e.preventDefault(); submitText(); }
                      }}
                    />
                  )}
                  <Button type="button" variant="accent" onClick={submitText}>
                    {current.optional && !textValue.trim() ? 'Skip' : <Send className="h-4 w-4" />}
                  </Button>
                </div>
              )}
            </>
          )}

          {/* Finished -> submit */}
          {finished && (
            <Button variant="accent" className="w-full" onClick={handleFinalSubmit} disabled={isSubmitting}>
              {isSubmitting ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Submitting…</>
              ) : (
                <><CheckCircle2 className="h-4 w-4" /> Submit application</>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}