import { useQuery } from '@tanstack/react-query';
import { aiApi } from '@/api/ai.api';
import { applicationApi } from '@/api/application.api';

// Tunable: keep dashboard reads cached longer than the per-page reads so the
// homepage stays snappy while the user clicks around.
const STALE_MS = 5 * 60_000;

export const useSeekerDashboard = ({ enabled = true } = {}) => {
  // `enabled` is wired to the auth state by the caller so none of these
  // protected reads fire before the session probe resolves (prevents 401 spam
  // during startup and across independent browser sessions).
  const recommendations = useQuery({
    queryKey: ['ai', 'recommendations'],
    queryFn: aiApi.recommendJobs,
    enabled,
    staleTime: STALE_MS,
    retry: false
  });

  // analyze-resume is daily-rate-limited for FREE tier. We deliberately do
  // not auto-trigger here. The dashboard reads it from cache only — if a
  // fresh value is needed the user clicks "Run AI analysis".
  const resumeAnalysis = useQuery({
    queryKey: ['ai', 'analyze-resume'],
    queryFn: aiApi.analyzeResume,
    enabled: false,
    staleTime: STALE_MS,
    retry: false
  });

  const applications = useQuery({
    queryKey: ['applications', 'seeker', 'recent'],
    queryFn: () => applicationApi.mine({ page: 1, limit: 20 }),
    enabled,
    staleTime: STALE_MS,
    retry: false
  });

  return { recommendations, resumeAnalysis, applications };
};
