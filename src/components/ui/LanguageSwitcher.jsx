import { useTranslation } from 'react-i18next'
import './ui.css'

const LANGUAGES = [
  { code: 'en', label: 'EN' },
  { code: 'hi', label: '\u0939\u093f\u0902' },
  { code: 'mr', label: '\u092e\u0930\u093e' }
]

export default function LanguageSwitcher() {
  const { i18n, t } = useTranslation()

  function handleChange(langCode) {
    i18n.changeLanguage(langCode)
  }

  return (
    <div className="lang-switcher" role="group" aria-label={t('language.label')}>
      {LANGUAGES.map((lang) => (
        <button
          key={lang.code}
          type="button"
          className={`lang-switcher__btn ${i18n.language === lang.code ? 'lang-switcher__btn--active' : ''}`}
          onClick={() => handleChange(lang.code)}
          aria-pressed={i18n.language === lang.code}
        >
          {lang.label}
        </button>
      ))}
    </div>
  )
}
