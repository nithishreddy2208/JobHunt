import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Navbar } from '@/components/layout/Navbar';
import { ProtectedRoute } from '@/routes/ProtectedRoute';
import { RecruiterProtectedRoute } from '@/routes/RecruiterProtectedRoute';
import HomePage from '@/pages/Home';
import LoginPage from '@/pages/Login';
import RegisterPage from '@/pages/Register';
import JobsListPage from '@/pages/jobs/JobsList';
import JobDetailPage from '@/pages/jobs/JobDetail';
import ApplicationsPage from '@/pages/Applications';
import ProfilePage from '@/pages/Profile';
import UpgradePage from '@/pages/Upgrade';
import RecommendationsPage from '@/pages/ai/Recommendations';
import AnalyzeResumePage from '@/pages/ai/AnalyzeResume';
import InterviewPrepPage from '@/pages/ai/InterviewPrep';
import SemanticSearchPage from '@/pages/ai/SemanticSearch';
import CoverLetterPage from '@/pages/ai/CoverLetter';
import MockInterviewPage from '@/pages/ai/MockInterview';

// Recruiter (admin) feature
import RecruiterLayout from '@/components/recruiter/RecruiterLayout';
import AdminDashboardPage from '@/pages/admin/AdminDashboard';
import PostJobPage from '@/pages/admin/PostJob';
import ManageJobsPage from '@/pages/admin/ManageJobs';
import ApplicantsPage from '@/pages/admin/Applicants';
import AdminProfilePage from '@/pages/admin/AdminProfile';

export default function App() {
  const location = useLocation();
  // RecruiterLayout has its own top bar + sidebar, so the global Navbar
  // is suppressed for every /admin/* route to avoid a double-header.
  const hideGlobalNavbar = location.pathname.startsWith('/admin');

  return (
    <div className="min-h-full bg-background">
      {!hideGlobalNavbar && <Navbar />}
      <main>
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
            <Route path="profile" element={<AdminProfilePage />} />
          </Route>

          {/* Back-compat: old /recruiter/* links now point into the new dashboard */}
          <Route path="/recruiter/jobs" element={<Navigate to="/admin/jobs" replace />} />
          <Route path="/recruiter/jobs/new" element={<Navigate to="/admin/post-job" replace />} />
          <Route path="/recruiter/applicants" element={<Navigate to="/admin/jobs" replace />} />
          <Route path="/recruiter/companies" element={<Navigate to="/admin/profile" replace />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
