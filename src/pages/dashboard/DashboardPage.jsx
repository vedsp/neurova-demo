import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../../contexts/AuthContext'
import Card from '../../components/ui/Card'

function getGreeting(t) {
  const hour = new Date().getHours()
  if (hour < 12) return t('greeting.morning')
  if (hour < 17) return t('greeting.afternoon')
  return t('greeting.evening')
}

// Inline SVGs for Premium Look
const CalendarIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
)

const CheckCircleIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
)

const ActivityIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
)

const BrainIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z"></path><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z"></path></svg>
)

export default function DashboardPage() {
  const { t } = useTranslation()
  const { profile } = useAuth()

  const greeting = getGreeting(t)
  const firstName = profile?.full_name?.split(' ')[0] || ''

  const daysSinceJoining = profile?.created_at
    ? Math.max(1, Math.floor((Date.now() - new Date(profile.created_at).getTime()) / 86400000))
    : 1

  // Mock Progress Math
  const circumference = 2 * Math.PI * 34
  const progressPercent = 35 // Just for visual demo
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference

  return (
    <motion.div
      className="dashboard"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <div className="dashboard-hero">
        <h2 className="dashboard__greeting">
          {greeting}{firstName ? `, ${firstName}` : ''}
        </h2>
        <p className="dashboard__subtext">
          {t('nav.home')} — Welcome to your healing space.
        </p>
      </div>

      <div className="stats-grid">
        <Card padding="md" className="stat-card stat-card-premium">
          <div className="stat-icon"><CalendarIcon /></div>
          <p className="stat-card__value">{daysSinceJoining}</p>
          <p className="stat-card__label">
            {daysSinceJoining === 1 ? 'Day' : 'Days'} Active
          </p>
        </Card>

        <Card padding="md" className="stat-card stat-card-premium">
          <div className="stat-icon"><CheckCircleIcon /></div>
          <p className="stat-card__value">0</p>
          <p className="stat-card__label">Sessions Logged</p>
        </Card>

        <a href="#" style={{ textDecoration: 'none', display: 'block' }}>
          <Card padding="md" className="stat-card stat-card-premium" style={{ height: '100%' }}>
            <div className="stat-icon"><ActivityIcon /></div>
            <p className="stat-card__value" style={{ fontSize: 'var(--fs-xl)' }}>Physical</p>
            <p className="stat-card__label">Therapy</p>
          </Card>
        </a>

        <a href="/mental-app/index.html" style={{ textDecoration: 'none', display: 'block' }}>
          <Card padding="md" className="stat-card stat-card-premium" style={{ height: '100%' }}>
            <div className="stat-icon"><BrainIcon /></div>
            <p className="stat-card__value" style={{ fontSize: 'var(--fs-xl)' }}>Cognitive</p>
            <p className="stat-card__label">Training</p>
          </Card>
        </a>
      </div>

      <div className="dashboard-section">
        <div className="dashboard-section__header">
          <h3 className="dashboard-section__title">Recovery Journey</h3>
        </div>
        
        <div className="progress-banner">
          <div className="progress-banner__text">
            <h4 className="progress-banner__title">Level 1: Foundation</h4>
            <p className="progress-banner__desc">
              Your rehabilitation journey has begun. As you log sessions and track progress, 
              personalized insights and real-time feedback will guide you.
            </p>
          </div>
          <div className="progress-ring">
            <svg className="progress-ring__circle" width="80" height="80">
              <circle className="progress-ring__track" cx="40" cy="40" r="34"></circle>
              <circle 
                className="progress-ring__fill" 
                cx="40" cy="40" r="34"
                style={{ strokeDasharray: circumference, strokeDashoffset }}
              ></circle>
            </svg>
            <div className="progress-ring__text">{progressPercent}%</div>
          </div>
        </div>
      </div>

      <div className="dashboard-section">
        <h3 className="dashboard-section__title">Quick Actions</h3>
        <div className="quick-actions">
          <Link to="/profile" className="quick-action">
            <span className="quick-action__text">View & Manage Profile</span>
            <span className="quick-action__arrow">&rarr;</span>
          </Link>
        </div>
      </div>
    </motion.div>
  )
}
