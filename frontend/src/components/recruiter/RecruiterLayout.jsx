import { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  PlusCircle,
  Briefcase,
  Users,
  UserCircle,
  LogOut,
  Menu,
  X,
  Sparkles,
  Wand2,
  Mail
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { cn } from '@/lib/utils';

// `match` decides when a sidebar item is highlighted. We do this manually instead
// of using <NavLink end> because two items historically pointed at /admin/jobs,
// so NavLink would light both up at the same time. With explicit predicates,
// every pathname maps to exactly one active item.
const NAV_ITEMS = [
  {
    to: '/admin/dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    match: (p) => p === '/admin' || p === '/admin/' || p.startsWith('/admin/dashboard')
  },
  {
    to: '/admin/post-job',
    label: 'Post Job',
    icon: PlusCircle,
    match: (p) => p.startsWith('/admin/post-job')
  },
  {
    to: '/admin/jobs',
    label: 'Manage Jobs',
    icon: Briefcase,
    // Active only on the bare jobs list — NOT on per-job sub-routes.
    match: (p) => p === '/admin/jobs' || p === '/admin/jobs/'
  },
  {
    to: '/admin/jobs',
    label: 'Applicants',
    icon: Users,
    hint: 'Pick a job to view',
    // Active when looking at a specific job's applicants/analytics.
    match: (p) => /^\/admin\/jobs\/[^/]+\/(applicants|analytics)/.test(p)
  },
  {
    to: '/admin/jd-optimizer',
    label: 'JD Optimizer',
    icon: Wand2,
    ai: true,
    match: (p) => p.startsWith('/admin/jd-optimizer')
  },
  {
    to: '/admin/email-composer',
    label: 'AI Emails',
    icon: Mail,
    ai: true,
    match: (p) => p.startsWith('/admin/email-composer')
  },
  {
    to: '/admin/profile',
    label: 'Profile',
    icon: UserCircle,
    match: (p) => p.startsWith('/admin/profile')
  }
];

const Avatar = ({ name, photo }) => {
  if (photo) {
    return (
      <img
        src={photo}
        alt={name || 'Recruiter'}
        className="h-9 w-9 rounded-full border border-border object-cover"
      />
    );
  }
  return <Initials name={name} />;
};

const Initials = ({ name }) => {
  const initials = (name || '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('') || 'R';
  return (
    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/15 text-sm font-semibold text-accent">
      {initials}
    </div>
  );
};

const SidebarLink = ({ to, label, icon: Icon, ai, isActive, onClick }) => (
  <Link
    to={to}
    onClick={onClick}
    aria-current={isActive ? 'page' : undefined}
    className={cn(
      'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
      isActive
        ? 'bg-accent/10 text-accent'
        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
    )}
  >
    <Icon className="h-4 w-4" />
    <span className="flex-1">{label}</span>
    {ai && (
      <span className="rounded-full bg-accent/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-accent">
        AI
      </span>
    )}
  </Link>
);

/**
 * Recruiter-side layout: collapsible sidebar (off-canvas on mobile, persistent on lg+)
 * + topbar with user info. The global Navbar is suppressed for /admin/* (App.jsx
 * decides whether to render it).
 */
export default function RecruiterLayout() {
  const { user, isPro, logout } = useAuth();
  const [open, setOpen] = useState(false); // mobile drawer
  const { pathname } = useLocation();

  const closeDrawer = () => setOpen(false);

  return (
    <div className="flex min-h-screen bg-muted/30">
      {/* ───────── Mobile overlay ───────── */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-foreground/40 lg:hidden"
          onClick={closeDrawer}
          aria-hidden
        />
      )}

      {/* ───────── Sidebar ───────── */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border bg-card transition-transform lg:static lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Brand */}
        <div className="flex h-14 items-center justify-between border-b border-border px-4">
          <Link to="/admin/dashboard" className="flex items-center gap-2 font-semibold" onClick={closeDrawer}>
            <Briefcase className="h-5 w-5 text-accent" />
            <span>JobHunt</span>
            <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-accent">
              Admin
            </span>
          </Link>
          <button
            type="button"
            className="rounded-md p-1.5 hover:bg-muted lg:hidden"
            onClick={closeDrawer}
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {NAV_ITEMS.map(({ to, label, icon, ai, match }) => (
            <SidebarLink
              key={label}
              to={to}
              label={label}
              icon={icon}
              ai={ai}
              isActive={match ? match(pathname) : false}
              onClick={closeDrawer}
            />
          ))}
        </nav>

        {/* User block */}
        <div className="border-t border-border p-3">
          <div className="mb-2 flex items-center gap-3 rounded-md p-2">
            <Avatar name={user?.name} photo={user?.profile?.photo} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{user?.name || 'Recruiter'}</p>
              <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
            </div>
            {isPro && (
              <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-semibold text-accent">
                <Sparkles className="h-3 w-3" /> PRO
              </span>
            )}
          </div>
          <Button variant="ghost" size="sm" className="w-full justify-start" onClick={() => logout()}>
            <LogOut className="h-4 w-4" /> Logout
          </Button>
        </div>
      </aside>

      {/* ───────── Main column ───────── */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-card/80 px-4 backdrop-blur lg:px-6">
          <button
            type="button"
            className="rounded-md p-1.5 hover:bg-muted lg:hidden"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="flex-1" />

          <ThemeToggle />
          <Link to="/admin/post-job">
            <Button variant="accent" size="sm">
              <PlusCircle className="h-4 w-4" /> Post job
            </Button>
          </Link>
        </header>

        {/* Content */}
        <main className="flex-1 px-4 py-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
