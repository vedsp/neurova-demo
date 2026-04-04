import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../contexts/AuthContext'
import LanguageSwitcher from '../ui/LanguageSwitcher'
import './layouts.css'

export default function AppLayout() {
  const { t } = useTranslation()
  const { signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const isExercisePage = location.pathname === '/exercise'

  async function handleSignOut() {
    try {
      await signOut()
      navigate('/login')
    } catch (err) {
      console.error('Sign out error:', err)
    }
  }

  return (
    <div className="app-layout">
      {!isExercisePage && (
        <header className="app-header">
          <h1 className="app-header__wordmark">NEUROVA</h1>
          <div className="app-header__actions">
            <LanguageSwitcher />
          </div>
        </header>
      )}

      <main className="app-main" style={{ paddingBottom: isExercisePage ? 0 : 'var(--bottom-nav-height)' }}>
        <Outlet />
      </main>

      {!isExercisePage && (
        <nav className="app-bottom-nav" aria-label="Main navigation">
        <NavLink
          to="/dashboard"
          className={({ isActive }) => `app-bottom-nav__item ${isActive ? 'app-bottom-nav__item--active' : ''}`}
        >
          <span className="app-bottom-nav__label">{t('nav.home')}</span>
        </NavLink>
        <NavLink
          to="/profile"
          className={({ isActive }) => `app-bottom-nav__item ${isActive ? 'app-bottom-nav__item--active' : ''}`}
        >
          <span className="app-bottom-nav__label">{t('nav.profile')}</span>
        </NavLink>
        <button
          type="button"
          className="app-bottom-nav__item"
          onClick={handleSignOut}
        >
          <span className="app-bottom-nav__label">{t('buttons.sign_out')}</span>
        </button>
      </nav>
      )}
    </div>
  )
}
