import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { jobApi } from '@/api/job.api';
import { applicationApi } from '@/api/application.api';
import { companyApi } from '@/api/company.api';
import { userApi } from '@/api/user.api';

// ─── Keys (centralized so invalidations stay consistent) ─────────────────────
export const recruiterKeys = {
  myJobs: ['recruiter', 'jobs', 'mine'],
  jobDetail: (id) => ['recruiter', 'jobs', 'detail', id],
  applicants: (jobId, page) => ['recruiter', 'jobs', jobId, 'applicants', page],
  companies: ['recruiter', 'companies']
};

// ─── Jobs ───────────────────────────────────────────────────────────────────
/**
 * GET /api/job/getadminjobs
 * Returns { jobs, success } | { success:false } on 404 (no jobs yet).
 * The hook normalises both shapes so callers always get an array.
 */
export const useMyJobs = () =>
  useQuery({
    queryKey: recruiterKeys.myJobs,
    queryFn: async () => {
      try {
        const data = await jobApi.myJobs();
        return Array.isArray(data?.jobs) ? data.jobs : [];
      } catch (err) {
        // Backend returns 404 with `{ success:false, message:"Jobs not found" }` when empty.
        if (err?.response?.status === 404) return [];
        throw err;
      }
    },
    staleTime: 30_000
  });

export const useCreateJob = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => jobApi.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: recruiterKeys.myJobs });
      toast.success('Job posted successfully');
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to post job');
    }
  });
};

// ─── Applicants ─────────────────────────────────────────────────────────────
export const useApplicants = (jobId, page = 1, limit = 20) =>
  useQuery({
    queryKey: recruiterKeys.applicants(jobId, page),
    queryFn: () => applicationApi.applicants(jobId, { page, limit }),
    enabled: !!jobId,
    keepPreviousData: true,
    staleTime: 10_000
  });

export const useUpdateApplicationStatus = (jobId) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ applicationId, status }) =>
      applicationApi.updateStatus(applicationId, status),
    onSuccess: (_, vars) => {
      // Refetch applicants for the relevant job (any page).
      qc.invalidateQueries({ queryKey: ['recruiter', 'jobs', jobId, 'applicants'] });
      toast.success(`Marked as ${vars.status}`);
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to update status');
    }
  });
};

// ─── Companies ──────────────────────────────────────────────────────────────
export const useCompanies = () =>
  useQuery({
    queryKey: recruiterKeys.companies,
    queryFn: async () => {
      try {
        const data = await companyApi.list();
        return Array.isArray(data?.companies) ? data.companies : [];
      } catch (err) {
        if (err?.response?.status === 404) return [];
        throw err;
      }
    },
    staleTime: 60_000
  });

export const useCreateCompany = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => companyApi.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: recruiterKeys.companies });
      toast.success('Company created');
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to create company');
    }
  });
};

// ─── Profile ────────────────────────────────────────────────────────────────
export const useUpdateRecruiterProfile = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => userApi.updateProfile(payload),
    onSuccess: (data) => {
      qc.setQueryData(['auth', 'me'], (prev) =>
        prev ? { ...prev, user: data.user || prev.user } : prev
      );
      toast.success(data?.message || 'Profile updated');
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Update failed');
    }
  });
};
