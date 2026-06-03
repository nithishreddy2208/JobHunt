import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';

import './index.css';
import App from './App.jsx';
import { ThemeProvider } from '@/components/theme/ThemeProvider';

// Never retry auth/permission/rate-limit failures — retrying a 401/403/429 just
// produces duplicate "subscription -> 401" spam in the network log and never
// succeeds. Only transient (5xx / network) errors are worth a single retry.
const NON_RETRYABLE_STATUSES = new Set([400, 401, 403, 404, 422, 429]);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        const status = error?.response?.status;
        if (status && NON_RETRYABLE_STATUSES.has(status)) return false;
        return failureCount < 1;
      },
      refetchOnWindowFocus: false,
      staleTime: 30_000
    }
  }
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
          <Toaster richColors position="top-right" theme="system" />
        </BrowserRouter>
      </QueryClientProvider>
    </ThemeProvider>
  </StrictMode>
);
