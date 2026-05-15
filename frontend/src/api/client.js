import axios from 'axios';
import { toast } from 'sonner';

// Use relative baseURL so Vite's dev proxy forwards to backend (same-origin = cookie works).
// In prod, set VITE_API_BASE_URL to your absolute API origin.
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  withCredentials: true
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err.response?.status;
    const message = err.response?.data?.message || err.message || 'Request failed';

    if (status === 429) {
      toast.error(message, {
        description: 'Upgrade to Pro to remove daily limits.',
        action: {
          label: 'Upgrade',
          onClick: () => window.location.assign('/upgrade')
        }
      });
    } else if (status === 401) {
      // Don't toast on the auth probe; let the page handle it.
      const url = err.config?.url || '';
      if (!url.includes('/user/subscription') && !url.includes('/user/login')) {
        toast.error('Please log in to continue.');
      }
    } else if (status >= 500) {
      toast.error('Server error. Please try again.');
    }

    return Promise.reject(err);
  }
);
