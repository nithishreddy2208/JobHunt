import { useEffect, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Pencil,
  FileText,
  Upload,
  Loader2,
  ExternalLink,
  Mail,
  Phone,
  Sparkles,
  X,
  Check,
  User as UserIcon,
  Briefcase,
  Target,
  CheckCircle2,
  Circle,
  Lightbulb,
  ArrowRight
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { userApi } from '@/api/user.api';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScoreRing, scoreTone } from '@/components/seeker/SeekerPrimitives';
import { computeProfileCompletion } from '@/lib/seekerInsights';
import { cn } from '@/lib/utils';

const initialsOf = (name = '') =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() || '')
    .join('') || 'U';

export default function ProfilePage() {
  const { user, isPro } = useAuth();
  const queryClient = useQueryClient();
  const fileRef = useRef(null);

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phoneNumber: '',
    bio: '',
    skills: ''
  });
  const [resumeFile, setResumeFile] = useState(null);

  // Hydrate form from auth user whenever it becomes available
  useEffect(() => {
    if (!user) return;
    setForm({
      name: user.name || '',
      email: user.email || '',
      phoneNumber: user.phoneNumber ? String(user.phoneNumber) : '',
      bio: user.profile?.bio || '',
      skills: Array.isArray(user.profile?.skills) ? user.profile.skills.join(', ') : ''
    });
  }, [user]);

  const updateMutation = useMutation({
    mutationFn: (payload) => userApi.updateProfile(payload),
    onSuccess: (data) => {
      toast.success(data?.message || 'Profile updated');
      // Merge the fresh user into the auth cache. We intentionally do NOT invalidate
      // ['auth','me'] — the response we just got already has the latest user, and
      // refetching would briefly toggle user back to a stale shape and flash the loader.
      queryClient.setQueryData(['auth', 'me'], (prev) =>
        prev ? { ...prev, user: data.user || prev.user } : prev
      );
      setResumeFile(null);
      if (fileRef.current) fileRef.current.value = '';
      setEditing(false);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Update failed');
    }
  });

  const onSubmit = (e) => {
    e.preventDefault();
    const fd = new FormData();
    if (form.name) fd.append('name', form.name);
    if (form.email) fd.append('email', form.email);
    if (form.phoneNumber) fd.append('phoneNumber', form.phoneNumber);
    fd.append('bio', form.bio);
    form.skills
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .forEach((s) => fd.append('skills', s));
    if (resumeFile) fd.append('file', resumeFile);
    updateMutation.mutate(fd);
  };

  const onCancel = () => {
    if (!user) return;
    setForm({
      name: user.name || '',
      email: user.email || '',
      phoneNumber: user.phoneNumber ? String(user.phoneNumber) : '',
      bio: user.profile?.bio || '',
      skills: Array.isArray(user.profile?.skills) ? user.profile.skills.join(', ') : ''
    });
    setResumeFile(null);
    if (fileRef.current) fileRef.current.value = '';
    setEditing(false);
  };

  if (!user) {
    return (
      <div className="flex h-[60vh] items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading profile…
      </div>
    );
  }

  const skills = Array.isArray(user.profile?.skills) ? user.profile.skills : [];
  const completion = computeProfileCompletion(user);
  const hasResume = Boolean(user.profile?.resume);
  // Always open via the backend proxy: it bypasses Cloudinary's free-tier PDF restriction
  // and serves the file with `Content-Disposition: inline` so it renders in-browser.
  const resumeViewUrl = '/api/user/resume';
  const resumeName = user.profile?.resumeName;
  const photo = user.profile?.photo;

  return (
    <div className={cn('container py-8', editing ? 'max-w-3xl' : 'max-w-5xl')}>
      {/* ============== VIEW MODE ============== */}
      {!editing && (
        <div className="grid gap-4 lg:grid-cols-3 lg:items-start">
          <div className="space-y-4 lg:col-span-2">
          {/* Hero card */}
          <Card className="overflow-hidden">
            <div className="h-24 bg-gradient-to-r from-accent/30 via-accent/15 to-background" />
            <CardContent className="-mt-12 space-y-4 p-6">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div className="flex items-end gap-4">
                  <div className="relative">
                    {photo ? (
                      <img
                        src={photo}
                        alt={user.name}
                        className="h-24 w-24 rounded-full border-4 border-background object-cover shadow"
                      />
                    ) : (
                      <div className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-background bg-accent text-2xl font-bold text-accent-foreground shadow">
                        {initialsOf(user.name)}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={isPro ? 'accent' : 'outline'}>{isPro ? 'PRO' : 'FREE'}</Badge>
                  <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                    <Pencil className="h-4 w-4" /> Edit profile
                  </Button>
                </div>
              </div>

              <div>
                <h1 className="text-2xl font-bold tracking-tight">{user.name}</h1>
                <p className="text-sm capitalize text-muted-foreground">
                  <Briefcase className="mr-1 inline h-3.5 w-3.5" />
                  {user.role === 'jobSeeker' ? 'Job seeker' : 'Recruiter'}
                </p>
              </div>

              <div className="grid gap-2 text-sm sm:grid-cols-2">
                <div className="inline-flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-4 w-4" /> {user.email}
                </div>
                {user.phoneNumber && (
                  <div className="inline-flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-4 w-4" /> {user.phoneNumber}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* About */}
          <Section title="About" icon={UserIcon}>
            {user.profile?.bio ? (
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                {user.profile.bio}
              </p>
            ) : (
              <EmptyHint label="Add a short bio so AI tools can tailor recommendations to your target role." />
            )}
          </Section>

          {/* Skills */}
          <Section title="Skills" icon={Sparkles}>
            {skills.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {skills.map((s) => (
                  <Badge key={s} variant="default">
                    {s}
                  </Badge>
                ))}
              </div>
            ) : (
              <EmptyHint label="Add your top skills (comma-separated) to improve job matching." />
            )}
          </Section>

          {/* Resume */}
          <Section title="Resume" icon={FileText}>
            {hasResume ? (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/40 p-3">
                <div className="flex items-center gap-2 text-sm">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{resumeName || 'resume.pdf'}</span>
                </div>
                <a
                  href={resumeViewUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-accent hover:underline"
                >
                  Open <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            ) : (
              <EmptyHint label="Upload a PDF resume to unlock AI recommendations and resume analysis." />
            )}
          </Section>
          </div>

          {/* ── Profile strength aside ── */}
          <aside className="space-y-4 lg:sticky lg:top-20">
            <ProfileStrength completion={completion} skills={skills} onEdit={() => setEditing(true)} />
          </aside>
        </div>
      )}

      {/* ============== EDIT MODE ============== */}
      {editing && (
        <form onSubmit={onSubmit} className="grid gap-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Edit profile</h1>
              <p className="text-sm text-muted-foreground">Update your details and resume.</p>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={onCancel} disabled={updateMutation.isPending}>
                <X className="h-4 w-4" /> Cancel
              </Button>
              <Button type="submit" variant="accent" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Saving…
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" /> Save
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Resume */}
          <Card>
            <CardContent className="space-y-4 p-5">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Resume
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Upload a PDF. Resume changes trigger background re-analysis.
                </p>
              </div>

              {hasResume ? (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/40 p-3">
                  <div className="flex items-center gap-2 text-sm">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{resumeName || 'resume.pdf'}</span>
                  </div>
                  <a
                    href={resumeViewUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-accent hover:underline"
                  >
                    Open <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              ) : null}

              <div className="grid gap-2">
                <Label htmlFor="resume">{hasResume ? 'Replace resume' : 'Upload resume'} (PDF)</Label>
                <Input
                  id="resume"
                  type="file"
                  accept="application/pdf"
                  ref={fileRef}
                  onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
                />
                {resumeFile && (
                  <p className="text-xs text-muted-foreground">
                    Selected: <span className="font-medium">{resumeFile.name}</span>
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Account */}
          <Card>
            <CardContent className="grid gap-4 p-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Account
                </h2>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
              <div className="grid gap-2 sm:col-span-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={form.phoneNumber}
                  onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>

          {/* About */}
          <Card>
            <CardContent className="space-y-4 p-5">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  About
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Used by AI tools to tailor recommendations.
                </p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="bio">Bio / target role</Label>
                <textarea
                  id="bio"
                  rows={3}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  placeholder="e.g. Frontend engineer focused on React and TypeScript"
                  value={form.bio}
                  onChange={(e) => setForm({ ...form, bio: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="skills">Skills (comma-separated)</Label>
                <Input
                  id="skills"
                  placeholder="React, TypeScript, Node.js"
                  value={form.skills}
                  onChange={(e) => setForm({ ...form, skills: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>

          <p className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
            <Upload className="h-3.5 w-3.5" />
            Changes save instantly when you click Save.
          </p>
        </form>
      )}
    </div>
  );
}

const Section = ({ title, icon: Icon, children }) => (
  <Card className="mt-4">
    <CardContent className="space-y-3 p-6">
      <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        {Icon && <Icon className="h-4 w-4" />} {title}
      </div>
      {children}
    </CardContent>
  </Card>
);

const EmptyHint = ({ label }) => (
  <p className="rounded-md border border-dashed bg-muted/30 p-3 text-sm text-muted-foreground">
    {label}
  </p>
);

// Profile-strength panel: completion ring, AI-style improvement checklist, and
// a skills visualization. `completion` comes from computeProfileCompletion.
const ProfileStrength = ({ completion, skills, onEdit }) => {
  const tone = scoreTone(completion.percent);
  const complete = completion.missing.length === 0;

  return (
    <>
      <Card className="overflow-hidden">
        <div className="border-b border-border bg-gradient-to-br from-accent/10 via-card to-fuchsia-500/5 p-5">
          <div className="flex items-center gap-4">
            <ScoreRing value={completion.percent} size={72} stroke={7} />
            <div>
              <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                <Target className="h-3 w-3" /> Profile strength
              </p>
              <p className={cn('text-lg font-bold', tone.text)}>{tone.label}</p>
              <p className="text-xs text-muted-foreground">
                {complete ? 'Your profile is fully optimized.' : `${completion.missing.length} item${completion.missing.length === 1 ? '' : 's'} left`}
              </p>
            </div>
          </div>
        </div>
        <CardContent className="space-y-2 p-5">
          <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-accent">
            <Sparkles className="h-3 w-3" /> AI suggestions
          </p>
          {complete ? (
            <div className="flex items-center gap-2 rounded-md border border-emerald-500/20 bg-emerald-500/10 p-2.5 text-xs text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4" /> Everything looks great. Keep your resume fresh.
            </div>
          ) : (
            <ul className="space-y-1.5">
              {completion.missing.map((m) => (
                <li key={m} className="flex items-start gap-2 text-xs">
                  <Circle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="text-foreground/80">{m}</span>
                </li>
              ))}
            </ul>
          )}
          <Button variant="accent" size="sm" className="mt-2 w-full" onClick={onEdit}>
            <Pencil className="h-3.5 w-3.5" /> Improve profile
          </Button>
        </CardContent>
      </Card>

      {/* Skills visualization */}
      <Card>
        <CardContent className="space-y-3 p-5">
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              <Sparkles className="h-3 w-3" /> Skills
            </p>
            <span className="text-xs text-muted-foreground">{skills.length}</span>
          </div>
          {skills.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {skills.map((s, i) => (
                <span
                  key={s}
                  className={cn(
                    'rounded-full px-2.5 py-1 text-xs font-medium',
                    i % 3 === 0
                      ? 'bg-accent/10 text-accent'
                      : i % 3 === 1
                      ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                      : 'bg-fuchsia-500/10 text-fuchsia-700 dark:text-fuchsia-400'
                  )}
                >
                  {s}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No skills yet — add some to boost matching.</p>
          )}
          <Link
            to="/ai/recommendations"
            className="inline-flex items-center gap-1 text-xs text-accent hover:underline"
          >
            See AI job matches <ArrowRight className="h-3 w-3" />
          </Link>
        </CardContent>
      </Card>
    </>
  );
};
