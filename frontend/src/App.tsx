import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import AdminLayout from './layouts/AdminLayout';
import PublicLayout from './layouts/PublicLayout';

// Public pages
import LandingPage from './pages/public/LandingPage';
import SurveyPage from './pages/survey/SurveyPage';
import SurveyComplete from './pages/survey/SurveyComplete';

// Auth pages
import LoginPage from './pages/auth/LoginPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';

// Admin pages
import DashboardPage from './pages/admin/DashboardPage';
import SurveysListPage from './pages/admin/SurveysListPage';
import SurveyBuilderPage from './pages/admin/SurveyBuilderPage';
import ResponsesPage from './pages/admin/ResponsesPage';
import ResponseDetailPage from './pages/admin/ResponseDetailPage';
import AnalyticsPage from './pages/admin/AnalyticsPage';
import UsersPage from './pages/admin/UsersPage';
import SettingsPage from './pages/admin/SettingsPage';
import QuestionBankPage from './pages/admin/QuestionBankPage';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public routes */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={<LandingPage />} />
          </Route>

          {/* Survey routes (no layout) */}
          <Route path="/survey/:slug" element={<SurveyPage />} />
          <Route path="/survey/:slug/complete" element={<SurveyComplete />} />

          {/* Auth routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          {/* Admin routes */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute roles={['ADMIN', 'RESEARCHER']}>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="surveys" element={<SurveysListPage />} />
            <Route path="surveys/new" element={<SurveyBuilderPage />} />
            <Route path="surveys/:id/edit" element={<SurveyBuilderPage />} />
            <Route path="responses" element={<ResponsesPage />} />
            <Route path="responses/:id" element={<ResponseDetailPage />} />
            <Route path="analytics/:surveyId" element={<AnalyticsPage />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="question-bank" element={<QuestionBankPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
