import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, PlusCircle, Building2, Sparkles, Wand2 } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  useCompanies,
  useCreateCompany,
  useCreateJob
} from '@/hooks/recruiter/useRecruiterQueries';
import { useOptimizeJd } from '@/hooks/recruiter/useRecruiterAi';
import { AiBadge } from '@/components/recruiter/ai/AiPrimitives';

// ─── Validation schema ──────────────────────────────────────────────────────
const jobSchema = z.object({
  title: z.string().min(2, 'Title is required').max(120),
  description: z.string().min(20, 'Description must be at least 20 characters'),
  requirements: z.string().min(2, 'Add at least one requirement'),
  salary: z.coerce.number({ invalid_type_error: 'Salary must be a number' }).positive('Must be positive'),
  experienceLevel: z.string().min(1, 'Pick an experience level'),
  location: z.string().min(2, 'Location is required'),
  jobType: z.string().min(1, 'Pick a job type'),
  positions: z.coerce.number({ invalid_type_error: 'Must be a number' }).int().positive('Must be at least 1'),
  companyId: z.string().min(1, 'Pick a company')
});

const JOB_TYPES = ['Full-time', 'Part-time', 'Contract', 'Internship', 'Remote'];
const EXPERIENCE_LEVELS = ['Entry', 'Junior', 'Mid', 'Senior', 'Lead'];

// ─── Field wrapper for consistent error rendering ───────────────────────────
const Field = ({ label, htmlFor, error, hint, children }) => (
  <div className="grid gap-1.5">
    <Label htmlFor={htmlFor}>{label}</Label>
    {children}
    {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
    {error && <p className="text-xs text-destructive">{error}</p>}
  </div>
);

// Plain styled select (matches Input look-and-feel)
const selectClass =
  'h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

export default function PostJobPage() {
  const navigate = useNavigate();
  const { data: companies = [], isLoading: companiesLoading } = useCompanies();
  const createCompany = useCreateCompany();
  const createJob = useCreateJob();

  const [companyDialogOpen, setCompanyDialogOpen] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState('');

  const optimizeJd = useOptimizeJd();

  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    formState: { errors, isSubmitting }
  } = useForm({
    resolver: zodResolver(jobSchema),
    defaultValues: {
      title: '',
      description: '',
      requirements: '',
      salary: '',
      experienceLevel: '',
      location: '',
      jobType: '',
      positions: 1,
      companyId: ''
    }
  });

  const onSubmit = (values) => {
    const payload = {
      ...values,
      requirements: values.requirements
        .split(',')
        .map((r) => r.trim())
        .filter(Boolean)
    };

    createJob.mutate(payload, {
      onSuccess: () => navigate('/admin/jobs')
    });
  };

  const handleCreateCompany = async () => {
    const name = newCompanyName.trim();
    if (!name) return;
    try {
      const res = await createCompany.mutateAsync({ name });
      const created = res?.company;
      if (created?._id) setValue('companyId', created._id, { shouldValidate: true });
      setCompanyDialogOpen(false);
      setNewCompanyName('');
    } catch {
      /* toast already shown in hook */
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Post a new job</h1>
        <p className="text-sm text-muted-foreground">
          Fill the form below. Embeddings are generated automatically so the role becomes searchable.
        </p>
      </header>

      <form onSubmit={handleSubmit(onSubmit)}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Job details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <Field label="Title" htmlFor="title" error={errors.title?.message}>
              <Input id="title" placeholder="e.g. Senior React Engineer" {...register('title')} />
            </Field>

            <Field
              label={
                <span className="flex items-center gap-2">
                  Description <AiBadge>AI optimize</AiBadge>
                </span>
              }
              htmlFor="description"
              error={errors.description?.message}
              hint="Describe responsibilities, team, and any unique perks. Click 'Optimize with AI' to rewrite professionally."
            >
              <textarea
                id="description"
                rows={6}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="What will the candidate be doing?"
                {...register('description')}
              />
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={optimizeJd.isPending}
                  onClick={async () => {
                    const { title, description, requirements } = getValues();
                    if (!description || description.trim().length < 20) {
                      toast.error('Add at least 20 characters of description first.');
                      return;
                    }
                    try {
                      const res = await optimizeJd.mutateAsync({
                        title,
                        description,
                        requirements: (requirements || '')
                          .split(',')
                          .map((r) => r.trim())
                          .filter(Boolean)
                      });
                      const opt = res?.optimized;
                      if (opt?.optimizedDescription) {
                        setValue('description', opt.optimizedDescription, { shouldValidate: true });
                        if (Array.isArray(opt.requirements) && opt.requirements.length) {
                          setValue('requirements', opt.requirements.join(', '), { shouldValidate: true });
                        }
                        toast.success('JD optimized');
                      }
                    } catch {}
                  }}
                >
                  {optimizeJd.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                  Optimize with AI
                </Button>
              </div>
            </Field>

            <Field
              label="Requirements"
              htmlFor="requirements"
              error={errors.requirements?.message}
              hint="Comma-separated. e.g. React, TypeScript, 3+ years experience"
            >
              <Input id="requirements" placeholder="React, TypeScript, REST APIs" {...register('requirements')} />
            </Field>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Salary (annual)" htmlFor="salary" error={errors.salary?.message}>
                <Input id="salary" type="number" min={0} placeholder="120000" {...register('salary')} />
              </Field>

              <Field label="Number of positions" htmlFor="positions" error={errors.positions?.message}>
                <Input id="positions" type="number" min={1} placeholder="1" {...register('positions')} />
              </Field>

              <Field label="Experience level" htmlFor="experienceLevel" error={errors.experienceLevel?.message}>
                <select id="experienceLevel" className={selectClass} {...register('experienceLevel')}>
                  <option value="">Select…</option>
                  {EXPERIENCE_LEVELS.map((lvl) => (
                    <option key={lvl} value={lvl}>
                      {lvl}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Job type" htmlFor="jobType" error={errors.jobType?.message}>
                <select id="jobType" className={selectClass} {...register('jobType')}>
                  <option value="">Select…</option>
                  {JOB_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Location" htmlFor="location" error={errors.location?.message}>
                <Input id="location" placeholder="Remote / Bengaluru / NYC" {...register('location')} />
              </Field>

              <Field label="Company" htmlFor="companyId" error={errors.companyId?.message}>
                <div className="flex gap-2">
                  <select
                    id="companyId"
                    className={selectClass}
                    disabled={companiesLoading}
                    {...register('companyId')}
                  >
                    <option value="">{companiesLoading ? 'Loading…' : 'Select a company…'}</option>
                    {companies.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <Button type="button" variant="outline" onClick={() => setCompanyDialogOpen(true)}>
                    <Building2 className="h-4 w-4" /> New
                  </Button>
                </div>
              </Field>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => navigate('/admin/jobs')}>
                Cancel
              </Button>
              <Button type="submit" variant="accent" disabled={isSubmitting || createJob.isPending}>
                {createJob.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Posting…
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" /> Post job
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>

      {/* Inline company-create dialog (custom because ConfirmDialog has no children slot) */}
      {companyDialogOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-foreground/50"
            onClick={() => {
              if (!createCompany.isPending) {
                setCompanyDialogOpen(false);
                setNewCompanyName('');
              }
            }}
          />
          <div className="relative w-full max-w-md rounded-lg border border-border bg-background p-6 shadow-lg">
            <h2 className="text-lg font-semibold">Create a company</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              You can edit details (logo, website, etc.) later.
            </p>
            <div className="mt-4 grid gap-2">
              <Label htmlFor="newCompany">Company name</Label>
              <Input
                id="newCompany"
                autoFocus
                placeholder="Acme Corp"
                value={newCompanyName}
                onChange={(e) => setNewCompanyName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleCreateCompany();
                  }
                }}
              />
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setCompanyDialogOpen(false);
                  setNewCompanyName('');
                }}
                disabled={createCompany.isPending}
              >
                Cancel
              </Button>
              <Button variant="accent" onClick={handleCreateCompany} disabled={createCompany.isPending || !newCompanyName.trim()}>
                {createCompany.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlusCircle className="h-4 w-4" />}
                Create
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
