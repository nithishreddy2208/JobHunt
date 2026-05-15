import { useEffect, useRef, useState } from 'react';
import { Camera, Loader2, Save, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import {
  useCompanies,
  useCreateCompany,
  useUpdateRecruiterProfile
} from '@/hooks/recruiter/useRecruiterQueries';

const Initials = ({ name }) => {
  const initials =
    (name || '')
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join('') || 'R';
  return (
    <div className="flex h-24 w-24 items-center justify-center rounded-full bg-accent/15 text-2xl font-semibold text-accent">
      {initials}
    </div>
  );
};

const selectClass =
  'h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

export default function AdminProfilePage() {
  const { user } = useAuth();
  const { data: companies = [], isLoading: companiesLoading } = useCompanies();
  const createCompany = useCreateCompany();
  const updateProfile = useUpdateRecruiterProfile();

  const [form, setForm] = useState({
    name: '',
    email: '',
    phoneNumber: '',
    bio: '',
    company: ''
  });
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const photoRef = useRef(null);

  const [newCompanyName, setNewCompanyName] = useState('');

  // Hydrate the form once user data is available (or after server update).
  useEffect(() => {
    if (!user) return;
    setForm({
      name: user.name || '',
      email: user.email || '',
      phoneNumber: user.phoneNumber ? String(user.phoneNumber) : '',
      bio: user.profile?.bio || '',
      company: user.profile?.company || ''
    });
  }, [user]);

  const handleFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith('image/')) {
      toast.error('Please pick an image file');
      return;
    }
    setPhotoFile(f);
    setPhotoPreview(URL.createObjectURL(f));
  };

  // Cleanup the preview URL when it changes / on unmount.
  useEffect(() => {
    return () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview);
    };
  }, [photoPreview]);

  const onSaveText = (e) => {
    e.preventDefault();
    const fd = new FormData();
    fd.append('name', form.name);
    fd.append('email', form.email);
    if (form.phoneNumber) fd.append('phoneNumber', form.phoneNumber);
    if (form.bio) fd.append('bio', form.bio);
    if (form.company) fd.append('company', form.company);
    updateProfile.mutate(fd);
  };

  const onSavePhoto = () => {
    if (!photoFile) return;
    const fd = new FormData();
    fd.append('kind', 'photo');
    fd.append('file', photoFile);
    updateProfile.mutate(fd, {
      onSuccess: () => {
        setPhotoFile(null);
        setPhotoPreview('');
        if (photoRef.current) photoRef.current.value = '';
      }
    });
  };

  const onQuickCreateCompany = async () => {
    const name = newCompanyName.trim();
    if (!name) return;
    try {
      const res = await createCompany.mutateAsync({ name });
      if (res?.company?._id) setForm((f) => ({ ...f, company: res.company._id }));
      setNewCompanyName('');
    } catch {
      /* toast handled in hook */
    }
  };

  const photoUrl = photoPreview || user?.profile?.photo;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
        <p className="text-sm text-muted-foreground">Manage your recruiter account.</p>
      </header>

      {/* Photo card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Profile photo</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-5">
          <div className="relative">
            {photoUrl ? (
              <img
                src={photoUrl}
                alt="Profile"
                className="h-24 w-24 rounded-full object-cover"
              />
            ) : (
              <Initials name={user?.name} />
            )}
          </div>

          <div className="flex flex-1 flex-col gap-2 min-w-[200px]">
            <Label htmlFor="photo">Choose a new image</Label>
            <Input id="photo" type="file" accept="image/*" ref={photoRef} onChange={handleFile} />
            <div className="flex gap-2">
              <Button
                type="button"
                variant="accent"
                size="sm"
                onClick={onSavePhoto}
                disabled={!photoFile || updateProfile.isPending}
              >
                {updateProfile.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Camera className="h-4 w-4" />
                )}
                Upload photo
              </Button>
              {photoFile && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setPhotoFile(null);
                    setPhotoPreview('');
                    if (photoRef.current) photoRef.current.value = '';
                  }}
                >
                  Cancel
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Account info */}
      <form onSubmit={onSaveText}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Account information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="name">Full name</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="phoneNumber">Phone</Label>
                <Input
                  id="phoneNumber"
                  type="tel"
                  value={form.phoneNumber}
                  onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="company">Default company</Label>
                <select
                  id="company"
                  className={selectClass}
                  value={form.company}
                  onChange={(e) => setForm({ ...form, company: e.target.value })}
                  disabled={companiesLoading}
                >
                  <option value="">{companiesLoading ? 'Loading…' : 'No default'}</option>
                  {companies.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="bio">Bio</Label>
              <textarea
                id="bio"
                rows={4}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="Short bio shown on your job postings (optional)"
                value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
              />
            </div>

            <div className="flex justify-end">
              <Button type="submit" variant="accent" disabled={updateProfile.isPending}>
                {updateProfile.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Save changes
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>

      {/* Add company */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add a company</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Input
              placeholder="New company name"
              value={newCompanyName}
              onChange={(e) => setNewCompanyName(e.target.value)}
              className="flex-1 min-w-[200px]"
            />
            <Button
              type="button"
              variant="outline"
              onClick={onQuickCreateCompany}
              disabled={!newCompanyName.trim() || createCompany.isPending}
            >
              {createCompany.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Building2 className="h-4 w-4" />
              )}
              Create
            </Button>
          </div>
          {companies.length > 0 && (
            <p className="mt-3 text-xs text-muted-foreground">
              Existing: {companies.map((c) => c.name).join(', ')}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
