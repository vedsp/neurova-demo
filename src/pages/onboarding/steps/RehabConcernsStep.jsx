import { useTranslation } from 'react-i18next'

const CONCERN_KEYS = [
  'joint_pain',
  'mobility',
  'post_surgery',
  'muscle_weakness',
  'balance',
  'memory',
  'cognitive_decline',
  'attention',
  'speech',
  'fine_motor',
  'chronic_pain',
  'other'
]

export default function RehabConcernsStep({ data, onChange }) {
  const { t } = useTranslation(['onboarding', 'common'])

  function toggleConcern(key) {
    const existing = data.concerns.find((c) => c.key === key)
    if (existing) {
      onChange({ concerns: data.concerns.filter((c) => c.key !== key) })
    } else {
      onChange({ concerns: [...data.concerns, { key, severity: 'moderate' }] })
    }
  }

  function setSeverity(key, severity) {
    onChange({
      concerns: data.concerns.map((c) =>
        c.key === key ? { ...c, severity } : c
      )
    })
  }

  function isSelected(key) {
    return data.concerns.some((c) => c.key === key)
  }

  function getSelectedConcern(key) {
    return data.concerns.find((c) => c.key === key)
  }

  const severities = [
    { value: 'mild', label: t('onboarding:step2.severity_mild') },
    { value: 'moderate', label: t('onboarding:step2.severity_moderate') },
    { value: 'severe', label: t('onboarding:step2.severity_severe') }
  ]

  return (
    <div className="step-content">
      <div className="step-content__header">
        <h2 className="step-content__title">{t('onboarding:step2.title')}</h2>
        <p className="step-content__subtitle">{t('onboarding:step2.subtitle')}</p>
      </div>

      <div className="selectable-grid">
        {CONCERN_KEYS.map((key) => (
          <button
            key={key}
            type="button"
            className={`selectable-card ${isSelected(key) ? 'selectable-card--selected' : ''}`}
            onClick={() => toggleConcern(key)}
            aria-pressed={isSelected(key)}
          >
            {t(`onboarding:step2.categories.${key}`)}
          </button>
        ))}
      </div>

      {data.concerns.length > 0 && (
        <div className="step-content__fields" style={{ marginTop: '8px' }}>
          {data.concerns.map((concern) => (
            <div key={concern.key} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span className="input-group__label">
                {t(`onboarding:step2.categories.${concern.key}`)} — {t('onboarding:step2.severity_label')}
              </span>
              <div className="segmented-control">
                {severities.map((sev) => (
                  <button
                    key={sev.value}
                    type="button"
                    className={`segmented-control__btn ${concern.severity === sev.value ? 'segmented-control__btn--active' : ''}`}
                    onClick={() => setSeverity(concern.key, sev.value)}
                  >
                    {sev.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        className="btn btn--ghost btn--sm"
        onClick={() => onChange({ concerns: [] })}
        style={{ alignSelf: 'center', marginTop: '4px' }}
      >
        {t('common:buttons.skip')}
      </button>
    </div>
  )
}
