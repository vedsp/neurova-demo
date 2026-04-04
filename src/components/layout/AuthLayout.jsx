import { Outlet } from 'react-router-dom'
import { motion } from 'framer-motion'
import LanguageSwitcher from '../ui/LanguageSwitcher'
import './layouts.css'

export default function AuthLayout() {
  return (
    <div className="auth-layout">
      <div className="auth-layout__header">
        <LanguageSwitcher />
      </div>

      <motion.div
        className="auth-layout__content"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        <div className="auth-layout__logo">
          <h1 className="auth-layout__wordmark">NEUROVA</h1>
          <div className="auth-layout__tagline-bar" />
        </div>

        <div className="auth-layout__card">
          <Outlet />
        </div>
      </motion.div>
    </div>
  )
}
