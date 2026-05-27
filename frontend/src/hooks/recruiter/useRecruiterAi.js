import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { recruiterAiApi } from '@/api/recruiterAi.api';

export const recruiterAiKeys = {
  matchScores: (jobId) => ['recruiter', 'ai', 'match', jobId],
  shortlist: (jobId, top) => ['recruiter', 'ai', 'shortlist', jobId, top],
  analytics: (jobId) => ['recruiter', 'ai', 'analytics', jobId],
  summary: (applicationId) => ['recruiter', 'ai', 'summary', applicationId]
};

export const useMatchScores = (jobId) =>
  useQuery({
    queryKey: recruiterAiKeys.matchScores(jobId),
    queryFn: () => recruiterAiApi.matchScores(jobId),
    enabled: !!jobId,
    staleTime: 60_000
  });

export const useShortlist = (jobId, top = 5, enabled = false) =>
  useQuery({
    queryKey: recruiterAiKeys.shortlist(jobId, top),
    queryFn: () => recruiterAiApi.shortlist(jobId, top),
    enabled: !!jobId && enabled,
    staleTime: 30_000
  });

export const useAnalytics = (jobId) =>
  useQuery({
    queryKey: recruiterAiKeys.analytics(jobId),
    queryFn: () => recruiterAiApi.analytics(jobId),
    enabled: !!jobId,
    staleTime: 60_000
  });

export const useCandidateSummary = () =>
  useMutation({
    mutationFn: (applicationId) => recruiterAiApi.candidateSummary(applicationId),
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to generate summary');
    }
  });

export const useOptimizeJd = () =>
  useMutation({
    mutationFn: (payload) => recruiterAiApi.optimizeJd(payload),
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to optimize JD');
    }
  });

export const useGenerateEmail = () =>
  useMutation({
    mutationFn: (payload) => recruiterAiApi.generateEmail(payload),
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to generate email');
    }
  });
