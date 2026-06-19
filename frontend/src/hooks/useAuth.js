import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { authApi } from '@/api/auth.api';

const ME_KEY = ['auth', 'me'];

/**
 * Source of truth for "is the user logged in?".
 * Calls GET /api/user/subscription on mount; 401 means anonymous.
 */
export const useAuth = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const hasLoginFlag = typeof window !== 'undefined' && localStorage.getItem('jobhunt_logged_in') === 'true';

  const meQuery = useQuery({
    queryKey: ME_KEY,
    queryFn: authApi.me,
    enabled: hasLoginFlag,
    retry: false,
    staleTime: 60_000,
    refetchOnWindowFocus: false
  });

  const loginMutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: (data) => {
      localStorage.setItem('jobhunt_logged_in', 'true');
      // Backend returns full user; cache it as the session
      queryClient.setQueryData(ME_KEY, {
        success: true,
        subscription: data.user?.subscription || 'FREE',
        isPro: !!data.user?.isPro,
        proSince: data.user?.proSince || null,
        user: data.user
      });
      toast.success(`Welcome back, ${data.user?.name || ''}`);
      navigate('/');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Login failed');
    }
  });

  const registerMutation = useMutation({
    mutationFn: authApi.register,
    onSuccess: () => {
      toast.success('Account created. Please log in.');
      navigate('/login');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Registration failed');
    }
  });

  const logoutMutation = useMutation({
    mutationFn: authApi.logout,
    onSuccess: () => {
      localStorage.removeItem('jobhunt_logged_in');
      queryClient.setQueryData(ME_KEY, null);
      queryClient.clear();
      toast.success('Logged out');
      navigate('/login');
    }
  });

  const sessionData = meQuery.data && meQuery.data.success ? meQuery.data : null;

  return {
    user: sessionData?.user || null,
    subscription: sessionData?.subscription || 'FREE',
    isPro: !!sessionData?.isPro,
    isAuthenticated: !!sessionData,
    isLoading: meQuery.isLoading,
    login: loginMutation.mutate,
    loginPending: loginMutation.isPending,
    register: registerMutation.mutate,
    registerPending: registerMutation.isPending,
    logout: logoutMutation.mutate
  };
};
