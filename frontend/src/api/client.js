import axios from 'axios';
import { toast } from 'sonner';

// Use relative baseURL so Vite's dev proxy forwards to backend (same-origin = cookie works).
// In prod, set VITE_API_BASE_URL to your absolute API origin.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true
});

/**
 * Build an absolute API URL for resources opened OUTSIDE axios — e.g. a resume
 * PDF rendered via `<a href>` or `window.open`. Anchor/window navigations do
 * NOT respect axios' baseURL, so a bare `/api/...` string resolves against the
 * *frontend* origin (Vercel) and 404s in production. This pins those links to
 * the configured backend origin.
 *
 * @param {string} path API path, with or without a leading `/api`.
 */
export const apiUrl = (path = '') => {
  const clean = String(path).replace(/^\/+/, '');
  // VITE_API_BASE_URL already ends in `/api` (e.g. https://backend.onrender.com/api).
  // When it's the dev default ('/api'), keep the relative form so the proxy works.
  const base = API_BASE_URL.replace(/\/+$/, '');
  const withoutApiPrefix = clean.replace(/^api\//, '');
  return `${base}/${withoutApiPrefix}`;
};

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
