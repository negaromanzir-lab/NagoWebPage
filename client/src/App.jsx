import './App.css';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

// ── Public pages ───────────────────────────────────────────────────────────────
import HomePage           from './pages/HomePage';
import LoginPage          from './pages/LoginPage';
import RegisterPage       from './pages/RegisterPage';
import ManualPaymentPage  from './pages/ManualPaymentPage';
import ProjectsPage       from './pages/ProjectsPage';
import ProjectDetailsPage from './pages/ProjectDetailsPage';
import CoursesPage        from './pages/CoursesPage';
import CourseDetailsPage  from './pages/CourseDetailsPage';
import ExamPreparationPage from './pages/ExamPreparationPage';
import UniversityExitExamPage from './pages/UniversityExitExamPage';
import HighSchoolEntranceExamPage from './pages/HighSchoolEntranceExamPage';
import StreamSubjectsPage from './pages/StreamSubjectsPage';
import SubjectYearsPage from './pages/SubjectYearsPage';

// ── User dashboard ─────────────────────────────────────────────────────────────
import {
  DashboardLayout,
  DashboardOverview,
  DashboardProjects,
  DashboardDownloads,
  DashboardPayments,
  DashboardProfile,
  DashboardChangePassword,
} from './pages/DashboardPage';

// ── Admin ──────────────────────────────────────────────────────────────────────
import AdminLayout          from './pages/admin/AdminLayout';
import AdminOverview        from './pages/admin/AdminOverview';
import AdminUsers           from './pages/admin/AdminUsers';
import AdminProjects        from './pages/admin/AdminProjects';
import AdminOrders          from './pages/admin/AdminOrders';
import AdminFiles           from './pages/admin/AdminFiles';
import AdminReviews         from './pages/admin/AdminReviews';
import AdminUpload          from './pages/admin/AdminUpload';
import AdminManualPayments  from './pages/admin/AdminManualPayments';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* ── Public ──────────────────────────────────────────────────────── */}
          <Route path="/"         element={<HomePage />} />
          <Route path="/login"    element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/pay"      element={<ManualPaymentPage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/projects/:id" element={<ProjectDetailsPage />} />
          <Route path="/courses"  element={<CoursesPage />} />
          <Route path="/courses/:id" element={<CourseDetailsPage />} />
          <Route path="/exam-preparation" element={<ExamPreparationPage />} />
          <Route path="/exam-preparation/university-exit" element={<UniversityExitExamPage />} />
          <Route path="/exam-preparation/highschool-entrance" element={<HighSchoolEntranceExamPage />} />
          <Route path="/exam-preparation/highschool-entrance/:stream" element={<StreamSubjectsPage />} />
          <Route path="/exam-preparation/highschool-entrance/:stream/:subject" element={<SubjectYearsPage />} />

          {/* ── User dashboard (nested) ──────────────────────────────────────── */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index                  element={<DashboardOverview />} />
            <Route path="projects"        element={<DashboardProjects />} />
            <Route path="downloads"       element={<DashboardDownloads />} />
            <Route path="payments"        element={<DashboardPayments />} />
            <Route path="profile"         element={<DashboardProfile />} />
            <Route path="change-password" element={<DashboardChangePassword />} />
          </Route>

          {/* ── Admin (nested, role=admin) ───────────────────────────────────── */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute roles={['admin']}>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index                  element={<AdminOverview />} />
            <Route path="users"           element={<AdminUsers />} />
            <Route path="projects"        element={<AdminProjects />} />
            <Route path="orders"          element={<AdminOrders />} />
            <Route path="files"           element={<AdminFiles />} />
            <Route path="reviews"         element={<AdminReviews />} />
            <Route path="upload"          element={<AdminUpload />} />
            <Route path="manual-payments" element={<AdminManualPayments />} />
          </Route>

          {/* ── Fallback ─────────────────────────────────────────────────────── */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
