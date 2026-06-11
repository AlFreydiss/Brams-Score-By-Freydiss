// ── Message perso pour Amel à sa connexion 💛 ────────────────────────────────
// Affiché une fois par session quand son compte se connecte, partout sur le site.
import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext.jsx'
import { AMEL_ID, AMEL_MESSAGE } from '../lib/vip.js'

export default function AmelWelcome() {
  const { discordId } = useAuth()
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (String(discordId || '') !== AMEL_ID) return
    try {
      if (sessionStorage.getItem('amel_welcome_shown')) return
      sessionStorage.setItem('amel_welcome_shown', '1')
    } catch {}
    setShow(true)
    const t = setTimeout(() => setShow(false), 7000)
    return () => clearTimeout(t)
  }, [discordId])

  if (!show) return null
  return (
    <div role="status" style={{
      position: 'fixed', top: 86, left: '50%', transform: 'translateX(-50%)', zIndex: 10070,
      display: 'flex', alignItems: 'center', gap: 13,
      padding: '15px 26px', borderRadius: 18, maxWidth: 'min(92vw, 480px)',
      background: 'linear-gradient(135deg, rgba(24,16,20,0.97), rgba(32,22,16,0.97))',
      border: '1px solid rgba(255,179,199,0.45)',
      boxShadow: '0 18px 60px rgba(0,0,0,0.6), 0 0 40px rgba(255,179,199,0.18)',
      backdropFilter: 'blur(14px)',
      animation: 'amelIn .5s cubic-bezier(.22,1,.36,1) both',
    }}>
      <style>{`
        @keyframes amelIn { from { opacity: 0; transform: translateX(-50%) translateY(-16px) scale(.96) } to { opacity: 1; transform: translateX(-50%) translateY(0) scale(1) } }
        @keyframes amelBeat { 0%,100% { transform: scale(1) } 25% { transform: scale(1.18) } 40% { transform: scale(1) } 55% { transform: scale(1.12) } }
      `}</style>
      <span style={{ fontSize: 30, display: 'inline-block', animation: 'amelBeat 1.6s ease-in-out infinite' }}>💛</span>
      <div>
        <div style={{ fontSize: 16.5, fontWeight: 900, color: '#ffd9e4', letterSpacing: '.01em' }}>{AMEL_MESSAGE}</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>— le Capitaine 🏴‍☠️</div>
      </div>
    </div>
  )
}
