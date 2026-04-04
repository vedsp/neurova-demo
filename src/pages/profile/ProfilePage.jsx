import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { useAuth } from '../../contexts/AuthContext'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'

export default function ProfilePage() {
  const { t } = useTranslation()
  const { profile, user, signOut } = useAuth()

  const displayGender = profile?.gender
    ? profile.gender.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    : '—'

  const displayDob = profile?.date_of_birth || '—'

  return (
    <motion.div
      className="profile-page"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <h2 className="profile-page__title">{t('nav.profile')}</h2>

      <Card padding="md">
        <div className="profile-info">
          <div className="profile-info__row">
            <span className="profile-info__label">Name</span>
            <span className="profile-info__value">{profile?.full_name || '—'}</span>
          </div>
          <div className="profile-info__row">
            <span className="profile-info__label">Email</span>
            <span className="profile-info__value">{user?.email || '—'}</span>
          </div>
          <div className="profile-info__row">
            <span className="profile-info__label">Date of Birth</span>
            <span className="profile-info__value">{displayDob}</span>
          </div>
          <div className="profile-info__row">
            <span className="profile-info__label">Gender</span>
            <span className="profile-info__value">{displayGender}</span>
          </div>
          <div className="profile-info__row">
            <span className="profile-info__label">Member Since</span>
            <span className="profile-info__value">
              {profile?.created_at
                ? new Date(profile.created_at).toLocaleDateString()
                : '—'}
            </span>
          </div>
        </div>
      </Card>

      <Button
        variant="secondary"
        size="md"
        fullWidth
        onClick={signOut}
      >
        {t('buttons.sign_out')}
      </Button>
    </motion.div>
  )
}
