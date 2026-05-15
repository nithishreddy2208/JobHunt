import { Link, NavLink } from 'react-router-dom';
import { Briefcase, LogOut, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

const navItem = ({ isActive }) =>
  cn(
    'rounded-md px-3 py-2 text-sm font-medium transition-colors',
    isActive ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'
  );

const seekerLinks = [
  { to: '/jobs', label: 'Browse jobs' },
  { to: '/ai/search', label: 'AI search' },
  { to: '/applications', label: 'My applications' },
  { to: '/profile', label: 'Profile' }
];

const recruiterLinks = [
  { to: '/admin/dashboard', label: 'Dashboard' },
  { to: '/admin/jobs', label: 'My jobs' },
  { to: '/admin/post-job', label: 'Post job' },
  { to: '/admin/profile', label: 'Profile' }
];

export const Navbar = () => {
  const { user, isAuthenticated, isPro, logout } = useAuth();
  const isRecruiter = user?.role === 'recruiter';
  const links = isAuthenticated ? (isRecruiter ? recruiterLinks : seekerLinks) : [];

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur">
      <div className="container flex h-14 items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-semibold">
          <Briefcase className="h-5 w-5 text-accent" />
          <span>JobHunt</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          <NavLink to="/" className={navItem} end>
            {isAuthenticated ? 'Dashboard' : 'Home'}
          </NavLink>
          {links.map(({ to, label }) => (
            <NavLink key={to} to={to} className={navItem}>
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {isAuthenticated ? (
            <>
              {isPro ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2.5 py-1 text-xs font-semibold text-accent">
                  <Sparkles className="h-3 w-3" /> PRO
                </span>
              ) : (
                !isRecruiter && (
                  <Link to="/upgrade" className="text-xs text-accent hover:underline">
                    Upgrade
                  </Link>
                )
              )}
              <span className="hidden text-sm text-muted-foreground sm:inline">{user?.name}</span>
              <Button variant="ghost" size="sm" onClick={() => logout()}>
                <LogOut className="h-4 w-4" />
                Logout
              </Button>
            </>
          ) : (
            <>
              <Link to="/login">
                <Button variant="ghost" size="sm">Login</Button>
              </Link>
              <Link to="/register">
                <Button variant="accent" size="sm">Sign up</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
