import { useState, useCallback } from 'react'
import { QUESTIONS } from '../data/questions.js'
import { submitOnboarding } from '../lib/supabase.js'
import QuestionStep from './QuestionStep.jsx'
import ProgressBar from './ProgressBar.jsx'
import DoneScreen from './DoneScreen.jsx'
import StatusScreen from './StatusScreen.jsx'
import Icon from './Icon.jsx'

export default function OnboardingFlow({ token }) {
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState(() =>
    QUESTIONS.reduce((acc, q) => {
      acc[q.id] = q.multi ? [] : null
      return acc
    }, {})
  )
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState(null)

  const total = QUESTIONS.length
  const q = QUESTIONS[step]
  const currentValue = answers[q.id]
  const canNext = q.multi ? (currentValue || []).length > 0 : currentValue != null

  const handleChange = useCallback(
    (value) => {
      setAnswers((prev) => ({ ...prev, [q.id]: value }))
    },
    [q.id]
  )

  const handleNext = async () => {
    if (step < total - 1) {
      setStep(step + 1)
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const res = await submitOnboarding(token, answers)
      if (res && res.ok) {
        setDone(true)
      } else {
        setError(res && res.error ? res.error : 'unknown')
      }
    } catch (e) {
      setError('network')
    } finally {
      setSubmitting(false)
    }
  }

  const handleBack = () => {
    if (step > 0) setStep(step - 1)
  }

  if (error === 'token_used') return <StatusScreen kind="used" />
  if (error === 'token_expired') return <StatusScreen kind="expired" />
  if (error === 'invalid_token') return <StatusScreen kind="invalid" />
  if (error === 'network' || error === 'rpc_error') return <StatusScreen kind="network" />
  if (done) return <DoneScreen />

  return (
    <>
      <ProgressBar current={step} total={total} />
      <QuestionStep
        step={step}
        total={total}
        question={q}
        value={currentValue}
        onChange={handleChange}
      />

      <div className="flow-foot">
        <div className="flow-left">
          {step > 0 ? (
            <button type="button" className="flow-back" onClick={handleBack}>
              <Icon name="arrow-left" size={16} />
              <span>Retour</span>
            </button>
          ) : (
            <span className="flow-hint">{q.hint}</span>
          )}
        </div>
        <button
          type="button"
          className="flow-next"
          onClick={handleNext}
          disabled={!canNext || submitting}
        >
          {submitting ? (
            <>
              <Icon name="loader" size={16} className="spin" />
              <span>Envoi…</span>
            </>
          ) : (
            <>
              <span>{step === total - 1 ? 'Terminer' : 'Suivant'}</span>
              <Icon name="arrow-right" size={16} />
            </>
          )}
        </button>
      </div>

      <style>{`
        .flow-foot {
          margin-top: 28px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
        }
        .flow-left {
          min-width: 0;
        }
        .flow-hint {
          font-size: 12.5px;
          color: var(--text-dim);
        }
        .flow-back {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 13px;
          color: var(--text-muted);
          padding: 6px 8px 6px 4px;
          border-radius: 8px;
          transition: color 0.15s ease;
        }
        .flow-back:hover { color: #fff; }
        .flow-next {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 10px 18px;
          background: var(--accent);
          color: #fff;
          font-size: 13.5px;
          font-weight: 600;
          letter-spacing: 0.02em;
          border-radius: 8px;
          transition: background 0.15s ease, transform 0.1s ease;
        }
        .flow-next:hover:not(:disabled) { background: var(--accent-hover); }
        .flow-next:active:not(:disabled) { transform: scale(0.98); }
        .flow-next:disabled {
          background: rgba(255, 255, 255, 0.06);
          color: var(--text-dim);
          cursor: not-allowed;
        }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </>
  )
}
