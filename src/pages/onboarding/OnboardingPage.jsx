import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import LanguageSwitcher from '../../components/ui/LanguageSwitcher'
import ProgressBar from '../../components/ui/ProgressBar'
import StepIndicator from '../../components/ui/StepIndicator'
import Button from '../../components/ui/Button'
import BasicProfileStep from './steps/BasicProfileStep'
import RehabConcernsStep from './steps/RehabConcernsStep'
import LifestyleStep from './steps/LifestyleStep'
import GoalsStep from './steps/GoalsStep'
import '../../components/layout/layouts.css'

const TOTAL_STEPS = 4

const slideVariants = {
  enter: (direction) => ({
    x: direction > 0 ? 80 : -80,
    opacity: 0
  }),
  center: {
    x: 0,
    opacity: 1
  },
  exit: (direction) => ({
    x: direction < 0 ? 80 : -80,
    opacity: 0
  })
}

export default function OnboardingPage() {
  const { t } = useTranslation(['onboarding', 'common'])
  const { user, updateProfile, refreshProfile } = useAuth()
  const navigate = useNavigate()

  const [currentStep, setCurrentStep] = useState(1)
  const [direction, setDirection] = useState(1)
  const [saving, setSaving] = useState(false)

  const [formData, setFormData] = useState({
    dateOfBirth: '',
    gender: '',
    concerns: [],
    sleepHours: 7,
    activityLevel: '',
    stressLevel: '',
    painFrequency: '',
    goals: []
  })

  function updateFormData(updates) {
    setFormData((prev) => ({ ...prev, ...updates }))
  }

  function goNext() {
    if (currentStep < TOTAL_STEPS) {
      setDirection(1)
      setCurrentStep((s) => s + 1)
    }
  }

  function goBack() {
    if (currentStep > 1) {
      setDirection(-1)
      setCurrentStep((s) => s - 1)
    }
  }

  async function handleFinish() {
    setSaving(true)

    try {
      // Update profile
      await updateProfile({
        date_of_birth: formData.dateOfBirth || null,
        gender: formData.gender || null,
        onboarding_completed: true
      })

      // Save health concerns
      if (formData.concerns.length > 0) {
        const concernRows = formData.concerns.map((c) => ({
          user_id: user.id,
          concern_key: c.key,
          severity: c.severity || 'moderate'
        }))

        await supabase.from('health_concerns').insert(concernRows)
      }

      // Save lifestyle data
      if (formData.activityLevel || formData.stressLevel) {
        await supabase.from('lifestyle_data').insert({
          user_id: user.id,
          sleep_hours_avg: formData.sleepHours,
          activity_level: formData.activityLevel || null,
          stress_level: formData.stressLevel || null
        })
      }

      // Save goals
      if (formData.goals.length > 0) {
        const goalRows = formData.goals.map((g) => ({
          user_id: user.id,
          goal_key: g
        }))

        await supabase.from('user_goals').insert(goalRows)
      }

      await refreshProfile()
      navigate('/dashboard')
    } catch (err) {
      console.error('Onboarding save error:', err)
      // Still navigate — data can be re-entered via profile
      await refreshProfile()
      navigate('/dashboard')
    } finally {
      setSaving(false)
    }
  }

  function renderStep() {
    switch (currentStep) {
      case 1:
        return <BasicProfileStep data={formData} onChange={updateFormData} />
      case 2:
        return <RehabConcernsStep data={formData} onChange={updateFormData} />
      case 3:
        return <LifestyleStep data={formData} onChange={updateFormData} />
      case 4:
        return <GoalsStep data={formData} onChange={updateFormData} />
      default:
        return null
    }
  }

  return (
    <div className="onboarding-layout">
      <div className="onboarding-header">
        <div className="onboarding-header__top">
          <h1 className="onboarding-header__wordmark">NEUROVA</h1>
          <LanguageSwitcher />
        </div>
        <ProgressBar current={currentStep} total={TOTAL_STEPS} />
        <StepIndicator current={currentStep} total={TOTAL_STEPS} />
      </div>

      <div className="onboarding-body">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentStep}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.25, ease: 'easeInOut' }}
          >
            {renderStep()}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="onboarding-footer">
        {currentStep > 1 && (
          <Button variant="secondary" size="lg" onClick={goBack}>
            {t('common:buttons.back')}
          </Button>
        )}

        {currentStep < TOTAL_STEPS ? (
          <Button variant="primary" size="lg" onClick={goNext}>
            {t('common:buttons.continue')}
          </Button>
        ) : (
          <Button
            variant="primary"
            size="lg"
            loading={saving}
            onClick={handleFinish}
          >
            {t('onboarding:step4.finish')}
          </Button>
        )}
      </div>
    </div>
  )
}
