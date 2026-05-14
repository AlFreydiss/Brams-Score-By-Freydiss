import { useEffect, useState } from 'react'

export default function Gear5Easter() {
  const [active, setActive] = useState(false)
  const [buffer, setBuffer] = useState('')

  useEffect(() => {
    const onKey = (e) => {
      const next = (buffer + e.key).slice(-5)
      setBuffer(next)
      if (next === 'gear5') {
        setActive(true)
        setTimeout(() => setActive(false), 10000)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [buffer])

  useEffect(() => {
    const root = document.documentElement
    if (active) {
      root.style.setProperty('--bg', '#ffffff')
      root.style.setProperty('--surface', '#fff5f5')
      root.style.setProperty('--card', '#fff0f0')
      root.style.setProperty('--text', '#1a0000')
      root.style.setProperty('--muted', '#8b0000')
      root.style.setProperty('--accent', '#ff0000')
      root.style.setProperty('--border', 'rgba(255,0,0,0.2)')
      document.body.style.fontFamily = "'Comic Sans MS', cursive"
    } else {
      root.style.setProperty('--bg', '#111214')
      root.style.setProperty('--surface', '#18191c')
      root.style.setProperty('--card', '#1e2024')
      root.style.setProperty('--text', '#e8e9ea')
      root.style.setProperty('--muted', '#7c7f8a')
      root.style.setProperty('--accent', '#e0524a')
      root.style.setProperty('--border', 'rgba(255,255,255,0.06)')
      document.body.style.fontFamily = ''
    }
  }, [active])

  if (!active) return null

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999, pointerEvents: 'none',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        fontSize: 'clamp(60px, 15vw, 140px)',
        animation: 'gear5spin 0.5s ease-out',
        filter: 'drop-shadow(0 0 40px rgba(255,200,0,0.8))',
        userSelect: 'none',
      }}>☀️</div>
      <div style={{
        position: 'absolute', top: '15%', left: '50%', transform: 'translateX(-50%)',
        fontFamily: "'Comic Sans MS', cursive",
        fontSize: 'clamp(20px, 4vw, 40px)',
        color: '#ff0000',
        fontWeight: 900,
        textShadow: '3px 3px 0 #ffcc00, 6px 6px 0 rgba(0,0,0,0.1)',
        animation: 'gear5text 0.5s ease-out',
        whiteSpace: 'nowrap',
      }}>
        GEAR 5 — NIKA LIBÉRÉ !
      </div>
      <style>{`
        @keyframes gear5spin {
          0% { transform: scale(0) rotate(-180deg); opacity: 0; }
          60% { transform: scale(1.3) rotate(10deg); }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        @keyframes gear5text {
          0% { opacity: 0; transform: translateX(-50%) translateY(-20px); }
          100% { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </div>
  )
}
