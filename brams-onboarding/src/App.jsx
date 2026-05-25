import { useEffect, useState } from 'react'
import { validateToken } from './lib/supabase.js'
import MosaicBackground from './components/MosaicBackground.jsx'
import OnboardingFlow from './components/OnboardingFlow.jsx'
import StatusScreen from './components/StatusScreen.jsx'

const DEV_BYPASS = import.meta.env.DEV // en mode dev, on saute la validation Supabase

export default function App() {
  const [status, setStatus] = useState('loading') // loading | ready | <error>
  const [token, setToken] = useState(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const t = params.get('token') || params.get('t')

    if (!t) {
      setStatus(DEV_BYPASS ? 'ready' : 'no_token')
      setToken(t)
      return
    }
    setToken(t)

    if (DEV_BYPASS) {
      setStatus('ready')
      return
    }

    let cancelled = false
    validateToken(t).then((res) => {
      if (cancelled) return
      if (res && res.valid) setStatus('ready')
      else if (res && res.error === 'used') setStatus('used')
      else if (res && res.error === 'expired') setStatus('expired')
      else setStatus('invalid')
    })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <main className="page">
      <MosaicBackground />

      <div className="stage">
        <div className="brand">
          <span className="brand-dot" />
          <span className="brand-name">Brams Community</span>
        </div>

        <div className="card">
          {status === 'loading' && <StatusScreen kind="loading" />}
          {status === 'ready' && <OnboardingFlow token={token} />}
          {status !== 'loading' && status !== 'ready' && <StatusScreen kind={status} />}
        </div>

        <p className="footnote">
          Tes réponses servent uniquement à attribuer tes rôles sur le serveur.
        </p>
      </div>

      <style>{`
        .page {
          position: relative;
          min-height: 100%;
          height: 100%;
          overflow-y: auto;
          z-index: 1;
        }
        .stage {
          position: relative;
          z-index: 2;
          max-width: 680px;
          margin: 0 auto;
          padding: 36px 22px 60px;
          min-height: 100%;
          display: flex;
          flex-direction: column;
        }
        .brand {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 36px;
          align-self: center;
          opacity: 0;
          animation: riseIn 0.7s ease-out 0.1s forwards;
        }
        .brand-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--accent);
          box-shadow: 0 0 12px var(--accent);
        }
        .brand-name {
          font-family: var(--display);
          font-size: 14px;
          font-weight: 600;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.85);
        }
        .card {
          background: var(--bg-card);
          border: 0.5px solid var(--border);
          border-radius: 14px;
          padding: 30px 32px;
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
          opacity: 0;
          animation: riseIn 0.7s ease-out 0.25s forwards;
        }
        .footnote {
          margin-top: 22px;
          font-size: 11.5px;
          letter-spacing: 0.04em;
          color: var(--text-dim);
          text-align: center;
          opacity: 0;
          animation: fadeIn 0.6s ease-out 0.6s forwards;
        }

        @media (max-width: 600px) {
          .stage { padding: 26px 16px 40px; }
          .card { padding: 24px 20px; border-radius: 12px; }
          .brand { margin-bottom: 24px; }
        }
      `}</style>
    </main>
  )
}
