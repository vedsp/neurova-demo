import { useTranslation } from 'react-i18next'
import { useAuth } from '../../../contexts/AuthContext'

export default function BasicProfileStep({ data, onChange }) {
  const { t } = useTranslation('onboarding')
  const { profile } = useAuth()

  const genderOptions = [
    { value: 'male', label: t('step1.gender_male') },
    { value: 'female', label: t('step1.gender_female') },
    { value: 'other', label: t('step1.gender_other') },
    { value: 'prefer_not_to_say', label: t('step1.gender_prefer_not') }
  ]

  return (
    <div className="step-content">
      <div className="step-content__header">
        <h2 className="step-content__title">{t('step1.title')}</h2>
        <p className="step-content__subtitle">{t('step1.subtitle')}</p>
      </div>

      <div className="step-content__fields">
        {profile?.full_name && (
          <div className="input-group">
            <label className="input-group__label" style={{ color: 'var(--clr-slate)' }}>
              {profile.full_name}
            </label>
          </div>
        )}

        <div className="input-group">
          <label htmlFor="dob-input" className="input-group__label">
            {t('step1.dob_label')}
          </label>
          <input
            id="dob-input"
            type="date"
            className="input-group__input"
            value={data.dateOfBirth}
            onChange={(e) => onChange({ dateOfBirth: e.target.value })}
            max={new Date().toISOString().split('T')[0]}
          />
        </div>

        <div className="input-group">
          <label className="input-group__label">{t('step1.gender_label')}</label>
          <div className="segmented-control">
            {genderOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={`segmented-control__btn ${data.gender === opt.value ? 'segmented-control__btn--active' : ''}`}
                onClick={() => onChange({ gender: opt.value })}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
