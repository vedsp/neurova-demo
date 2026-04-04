import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useForm } from 'react-hook-form'
import { useAuth } from '../../contexts/AuthContext'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'

export default function LoginPage() {
  const { t } = useTranslation('auth')
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [serverError, setServerError] = useState('')
  const [loading, setLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm()

  async function onSubmit(data) {
    setServerError('')
    setLoading(true)

    try {
      await signIn({ email: data.email, password: data.password })
      navigate('/dashboard')
    } catch (err) {
      if (err.message) {
        setServerError(err.message === 'Invalid login credentials' ? t('login.error_invalid') : err.message)
      } else {
        setServerError(t('login.error_invalid'))
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="auth-form__header">
        <h2 className="auth-form__title">{t('login.title')}</h2>
        <p className="auth-form__subtitle">{t('login.subtitle')}</p>
      </div>

      {serverError && (
        <p className="auth-form__error" role="alert">{serverError}</p>
      )}

      <div className="auth-form__fields">
        <Input
          label={t('login.email_label')}
          type="email"
          id="login-email"
          autoComplete="email"
          error={errors.email?.message}
          {...register('email', {
            required: t('login.error_email_required'),
            pattern: {
              value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
              message: t('login.error_email_format')
            }
          })}
        />

        <Input
          label={t('login.password_label')}
          type="password"
          id="login-password"
          autoComplete="current-password"
          error={errors.password?.message}
          {...register('password', {
            required: t('login.error_password_required')
          })}
        />
      </div>

      <Button
        type="submit"
        variant="primary"
        size="lg"
        fullWidth
        loading={loading}
      >
        {t('login.submit')}
      </Button>

      <p className="auth-form__footer">
        {t('login.no_account')}{' '}
        <Link to="/register">{t('login.register_link')}</Link>
      </p>
    </form>
  )
}
