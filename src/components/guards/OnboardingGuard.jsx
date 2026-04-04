import { Navigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import Spinner from '../ui/Spinner'

export default function OnboardingGuard({ children }) {
  const { profile, loading } = useAuth()

  if (loading) {
    return (
      <div className="route-loading">
        <Spinner size="lg" />
      </div>
    )
  }

  if (profile && !profile.onboarding_completed) {
    return <Navigate to="/onboarding" replace />
  }

  return children
}
