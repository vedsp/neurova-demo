import { useTranslation } from 'react-i18next'

const GOAL_KEYS = [
  'track_recovery',
  'reduce_pain',
  'improve_mobility',
  'strengthen_memory',
  'build_strength',
  'improve_balance',
  'daily_exercises',
  'monitor_cognitive',
  'connect_specialist'
]

export default function GoalsStep({ data, onChange }) {
  const { t } = useTranslation('onboarding')

  function toggleGoal(key) {
    if (data.goals.includes(key)) {
      onChange({ goals: data.goals.filter((g) => g !== key) })
    } else {
      onChange({ goals: [...data.goals, key] })
    }
  }

  return (
    <div className="step-content">
      <div className="step-content__header">
        <h2 className="step-content__title">{t('step4.title')}</h2>
        <p className="step-content__subtitle">{t('step4.subtitle')}</p>
      </div>

      <div className="pill-grid">
        {GOAL_KEYS.map((key) => (
          <button
            key={key}
            type="button"
            className={`pill-btn ${data.goals.includes(key) ? 'pill-btn--selected' : ''}`}
            onClick={() => toggleGoal(key)}
            aria-pressed={data.goals.includes(key)}
          >
            {t(`step4.goals.${key}`)}
          </button>
        ))}
      </div>
    </div>
  )
}
