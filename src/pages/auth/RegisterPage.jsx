import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useForm } from 'react-hook-form'
import { useAuth } from '../../contexts/AuthContext'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'

function getPasswordStrength(password) {
  if (!password) return 0
  let score = 0
  if (password.length >= 6) score++
  if (password.length >= 8) score++
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++
  if (/[0-9]/.test(password) || /[^A-Za-z0-9]/.test(password)) score++
  return score
}

export default function RegisterPage() {
  const { t } = useTranslation('auth')
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [serverError, setServerError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors }
  } = useForm()

  const watchPassword = watch('password', '')
  const strength = getPasswordStrength(watchPassword)

  async function onSubmit(data) {
    setServerError('')
    setLoading(true)

    try {
      const result = await signUp({
        email: data.email,
        password: data.password,
        fullName: data.fullName
      })

      if (result.user && !result.user.identities?.length) {
        setServerError(t('register.error_email_taken'))
        return
      }

      if (result.session) {
        navigate('/onboarding')
      } else {
        setSuccess(true)
      }
    } catch (err) {
      if (err.message?.includes('already registered')) {
        setServerError(t('register.error_email_taken'))
      } else {
        setServerError(err.message || t('register.error_email_taken'))
      }
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="auth-form__success">
        <h3>{t('register.success_title')}</h3>
        <p>{t('register.success_message')}</p>
        <Button
          variant="primary"
          size="lg"
          fullWidth
          onClick={() => navigate('/login')}
        >
          {t('register.login_link')}
        </Button>
      </div>
    )
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="auth-form__header">
        <h2 className="auth-form__title">{t('register.title')}</h2>
        <p className="auth-form__subtitle">{t('register.subtitle')}</p>
      </div>

      {serverError && (
        <p className="auth-form__error" role="alert">{serverError}</p>
      )}

      <div className="auth-form__fields">
        <Input
          label={t('register.name_label')}
          type="text"
          id="register-name"
          autoComplete="name"
          error={errors.fullName?.message}
          {...register('fullName', {
            required: t('register.error_name_required')
          })}
        />

        <Input
          label={t('register.email_label')}
          type="email"
          id="register-email"
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

        <div>
          <Input
            label={t('register.password_label')}
            type="password"
            id="register-password"
            autoComplete="new-password"
            error={errors.password?.message}
            {...register('password', {
              required: t('login.error_password_required'),
              minLength: {
                value: 6,
                message: t('register.error_password_length')
              }
            })}
          />
          {watchPassword && (
            <div className="password-strength">
              {[1, 2, 3, 4].map((level) => (
                <div
                  key={level}
                  className={`password-strength__bar ${strength >= level ? `password-strength__bar--filled-${level}` : ''}`}
                />
              ))}
            </div>
          )}
        </div>

        <Input
          label={t('register.confirm_password_label')}
          type="password"
          id="register-confirm-password"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword', {
            required: t('login.error_password_required'),
            validate: (value) =>
              value === watchPassword || t('register.error_mismatch')
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
        {t('register.submit')}
      </Button>

      <p className="auth-form__footer">
        {t('register.has_account')}{' '}
        <Link to="/login">{t('register.login_link')}</Link>
      </p>
    </form>
  )
}
