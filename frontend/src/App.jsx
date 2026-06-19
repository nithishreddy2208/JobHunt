import { lazy, Suspense, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { ProtectedRoute } from '@/routes/ProtectedRoute';
import { RecruiterProtectedRoute } from '@/routes/RecruiterProtectedRoute';

// Route-level code splitting: each page is a separate chunk so the initial
// bundle (and the homepage) only downloads what it needs. Anonymous visitors
// never fetch the seeker dashboard / AI / recruiter code.
const HomePage = lazy(() => import('@/pages/Home'));
const LoginPage = lazy(() => import('@/pages/Login'));
const RegisterPage = lazy(() => import('@/pages/Register'));
const JobsListPage = lazy(() => import('@/pages/jobs/JobsList'));
const JobDetailPage = lazy(() => import('@/pages/jobs/JobDetail'));
const ApplicationsPage = lazy(() => import('@/pages/Applications'));
const ProfilePage = lazy(() => import('@/pages/Profile'));
const UpgradePage = lazy(() => import('@/pages/Upgrade'));
const RecommendationsPage = lazy(() => import('@/pages/ai/Recommendations'));
const AnalyzeResumePage = lazy(() => import('@/pages/ai/AnalyzeResume'));
const InterviewPrepPage = lazy(() => import('@/pages/ai/InterviewPrep'));
const SemanticSearchPage = lazy(() => import('@/pages/ai/SemanticSearch'));
const CoverLetterPage = lazy(() => import('@/pages/ai/CoverLetter'));
const MockInterviewPage = lazy(() => import('@/pages/ai/MockInterview'));

// Recruiter (admin) feature
const RecruiterLayout = lazy(() => import('@/components/recruiter/RecruiterLayout'));
const AdminDashboardPage = lazy(() => import('@/pages/admin/AdminDashboard'));
const PostJobPage = lazy(() => import('@/pages/admin/PostJob'));
const ManageJobsPage = lazy(() => import('@/pages/admin/ManageJobs'));
const ApplicantsPage = lazy(() => import('@/pages/admin/Applicants'));
const AdminProfilePage = lazy(() => import('@/pages/admin/AdminProfile'));
const JobAnalyticsPage = lazy(() => import('@/pages/admin/JobAnalytics'));
const JdOptimizerPage = lazy(() => import('@/pages/admin/JdOptimizer'));
const EmailComposerPage = lazy(() => import('@/pages/admin/EmailComposer'));

function RouteFallback() {
  return (
    <div className="flex h-[60vh] items-center justify-center text-muted-foreground">
      <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading…
    </div>
  );
}

export default function App() {
  const location = useLocation();
  // RecruiterLayout has its own top bar + sidebar, so the global Navbar
  // is suppressed for every /admin/* route to avoid a double-header.
  const hideGlobalNavbar = location.pathname.startsWith('/admin');

  useEffect(() => {
    if (location.hash) {
      const id = location.hash.replace('#', '');
      const element = document.getElementById(id);
      if (element) {
        const timer = setTimeout(() => {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 150);
        return () => clearTimeout(timer);
      }
    }
  }, [location.hash, location.pathname]);

  return (
    <div className="min-h-full bg-background">
      {!hideGlobalNavbar && <Navbar />}
      <main>
        <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Job seeker */}
          <Route path="/jobs" element={<ProtectedRoute><JobsListPage /></ProtectedRoute>} />
          <Route path="/jobs/:id" element={<ProtectedRoute><JobDetailPage /></ProtectedRoute>} />
          <Route path="/applications" element={<ProtectedRoute><ApplicationsPage /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
          <Route path="/ai/recommendations" element={<ProtectedRoute><RecommendationsPage /></ProtectedRoute>} />
          <Route path="/ai/analyze-resume" element={<ProtectedRoute><AnalyzeResumePage /></ProtectedRoute>} />
          <Route path="/ai/interview-prep" element={<ProtectedRoute><InterviewPrepPage /></ProtectedRoute>} />
          <Route path="/ai/cover-letter" element={<ProtectedRoute><CoverLetterPage /></ProtectedRoute>} />
          <Route path="/ai/search" element={<ProtectedRoute><SemanticSearchPage /></ProtectedRoute>} />
          <Route path="/mock-interview" element={<ProtectedRoute><MockInterviewPage /></ProtectedRoute>} />
          <Route path="/upgrade" element={<ProtectedRoute><UpgradePage /></ProtectedRoute>} />

          {/* Recruiter — gated + layout-wrapped */}
          <Route
            path="/admin"
            element={
              <RecruiterProtectedRoute>
                <RecruiterLayout />
              </RecruiterProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboardPage />} />
            <Route path="post-job" element={<PostJobPage />} />
            <Route path="jobs" element={<ManageJobsPage />} />
            <Route path="jobs/:id/applicants" element={<ApplicantsPage />} />
            <Route path="jobs/:id/analytics" element={<JobAnalyticsPage />} />
            <Route path="jd-optimizer" element={<JdOptimizerPage />} />
            <Route path="email-composer" element={<EmailComposerPage />} />
            <Route path="profile" element={<AdminProfilePage />} />
          </Route>

          {/* Back-compat: old /recruiter/* links now point into the new dashboard */}
          <Route path="/recruiter/jobs" element={<Navigate to="/admin/jobs" replace />} />
          <Route path="/recruiter/jobs/new" element={<Navigate to="/admin/post-job" replace />} />
          <Route path="/recruiter/applicants" element={<Navigate to="/admin/jobs" replace />} />
          <Route path="/recruiter/companies" element={<Navigate to="/admin/profile" replace />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </Suspense>
      </main>
    </div>
  );
}
