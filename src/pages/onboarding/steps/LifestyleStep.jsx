import { useTranslation } from 'react-i18next'

export default function LifestyleStep({ data, onChange }) {
  const { t } = useTranslation(['onboarding', 'common'])

  const activityOptions = [
    { value: 'sedentary', label: t('onboarding:step3.activity_sedentary') },
    { value: 'light', label: t('onboarding:step3.activity_light') },
    { value: 'moderate', label: t('onboarding:step3.activity_moderate') },
    { value: 'active', label: t('onboarding:step3.activity_active') }
  ]

  const stressOptions = [
    { value: 'low', label: t('onboarding:step3.stress_low') },
    { value: 'moderate', label: t('onboarding:step3.stress_moderate') },
    { value: 'high', label: t('onboarding:step3.stress_high') },
    { value: 'very_high', label: t('onboarding:step3.stress_very_high') }
  ]

  const painOptions = [
    { value: 'rarely', label: t('onboarding:step3.pain_rarely') },
    { value: 'sometimes', label: t('onboarding:step3.pain_sometimes') },
    { value: 'often', label: t('onboarding:step3.pain_often') },
    { value: 'daily', label: t('onboarding:step3.pain_daily') }
  ]

  return (
    <div className="step-content">
      <div className="step-content__header">
        <h2 className="step-content__title">{t('onboarding:step3.title')}</h2>
        <p className="step-content__subtitle">{t('onboarding:step3.subtitle')}</p>
      </div>

      <div className="step-content__fields">
        <div className="slider-group">
          <div className="slider-group__header">
            <span className="slider-group__label">{t('onboarding:step3.sleep_label')}</span>
            <span className="slider-group__value">{data.sleepHours}h</span>
          </div>
          <input
            type="range"
            className="slider-group__input"
            min="3"
            max="12"
            step="0.5"
            value={data.sleepHours}
            onChange={(e) => onChange({ sleepHours: parseFloat(e.target.value) })}
          />
        </div>

        <div className="input-group">
          <label className="input-group__label">{t('onboarding:step3.activity_label')}</label>
          <div className="segmented-control">
            {activityOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={`segmented-control__btn ${data.activityLevel === opt.value ? 'segmented-control__btn--active' : ''}`}
                onClick={() => onChange({ activityLevel: opt.value })}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="input-group">
          <label className="input-group__label">{t('onboarding:step3.stress_label')}</label>
          <div className="segmented-control">
            {stressOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={`segmented-control__btn ${data.stressLevel === opt.value ? 'segmented-control__btn--active' : ''}`}
                onClick={() => onChange({ stressLevel: opt.value })}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="input-group">
          <label className="input-group__label">{t('onboarding:step3.pain_frequency_label')}</label>
          <div className="segmented-control">
            {painOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={`segmented-control__btn ${data.painFrequency === opt.value ? 'segmented-control__btn--active' : ''}`}
                onClick={() => onChange({ painFrequency: opt.value })}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <button
        type="button"
        className="btn btn--ghost btn--sm"
        onClick={() => onChange({ activityLevel: '', stressLevel: '', painFrequency: '' })}
        style={{ alignSelf: 'center', marginTop: '4px' }}
      >
        {t('common:buttons.skip')}
      </button>
    </div>
  )
}
