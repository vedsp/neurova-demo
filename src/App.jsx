import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import ProtectedRoute from './components/guards/ProtectedRoute'
import OnboardingGuard from './components/guards/OnboardingGuard'
import AuthLayout from './components/layout/AuthLayout'
import AppLayout from './components/layout/AppLayout'
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import OnboardingPage from './pages/onboarding/OnboardingPage'
import DashboardPage from './pages/dashboard/DashboardPage'
import ProfilePage from './pages/profile/ProfilePage'
import NotFoundPage from './pages/NotFoundPage'
import Spinner from './components/ui/Spinner'

function RootRedirect() {
  const { user, profile, loading } = useAuth()

  if (loading) {
    return (
      <div className="route-loading">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />
  if (profile && !profile.onboarding_completed) return <Navigate to="/onboarding" replace />
  return <Navigate to="/dashboard" replace />
}

function AuthRedirect({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="route-loading">
        <Spinner size="lg" />
      </div>
    )
  }

  if (user) return <Navigate to="/dashboard" replace />
  return children
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Root redirect */}
          <Route path="/" element={<RootRedirect />} />

          {/* Auth routes */}
          <Route element={
            <AuthRedirect>
              <AuthLayout />
            </AuthRedirect>
          }>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
          </Route>

          {/* Onboarding */}
          <Route
            path="/onboarding"
            element={
              <ProtectedRoute>
                <OnboardingPage />
              </ProtectedRoute>
            }
          />

          {/* Main app routes */}
          <Route element={
            <ProtectedRoute>
              <OnboardingGuard>
                <AppLayout />
              </OnboardingGuard>
            </ProtectedRoute>
          }>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Route>

          {/* 404 */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
