import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

/**
 * Gate that allows ONLY authenticated recruiters through.
 *  - anon          → /login (carries the attempted path in `state.from`)
 *  - job-seeker    → /        (their own dashboard)
 *  - recruiter     → render children
 */
export const RecruiterProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center text-sm text-muted-foreground">
        Loading...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (user?.role !== 'recruiter') {
    return <Navigate to="/" replace />;
  }

  return children;
};
