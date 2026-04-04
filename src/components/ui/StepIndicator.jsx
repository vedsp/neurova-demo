import { useTranslation } from 'react-i18next'
import './ui.css'

export default function StepIndicator({ current, total }) {
  const { t } = useTranslation('onboarding')

  return (
    <p className="step-indicator">
      {t('progress', { current, total })}
    </p>
  )
}
