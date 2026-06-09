// ── Petits composants partagés de la page profil ────────────────────────────
import { useEffect, useRef, useState } from 'react'

// Compteur animé (ease-out cubic). Respecte prefers-reduced-motion.
export function CountUp({ value, decimals = 0, suffix = '' }) {
  const [current, setCurrent] = useState(0)
  const raf = useRef(0)
  useEffect(() => {
    const target = Number(value || 0)
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) { setCurrent(target); return }
    let frame = 0; const total = 50
    const tick = () => {
      frame++
      setCurrent(target * (1 - Math.pow(1 - frame / total, 3)))
      if (frame < total) raf.current = requestAnimationFrame(tick)
    }
    setCurrent(0); raf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf.current)
  }, [value])
  return `${current.toFixed(decimals)}${suffix}`
}

// Une barre de facteur d'aura. --fc colore le remplissage (lu par .pfx-factor-fill).
export function AuraFactor({ label, value, max, color }) {
  const pct = Math.min(100, Math.round((Number(value) / max) * 100))
  return (
    <div style={{ '--fc': color }}>
      <div className="pfx-factor-hd">
        <span>{label}</span>
        <span className="pfx-factor-val">{Math.round(value)}<em>/{max}</em></span>
      </div>
      <div className="pfx-factor-track">
        <div className="pfx-factor-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export function EmptyState({ icon = '✦', title, sub }) {
  return (
    <div className="pfx-empty">
      <span className="pfx-empty-ic">{icon}</span>
      <strong>{title}</strong>
      {sub && <p>{sub}</p>}
    </div>
  )
}

export function ErrorState({ title = 'Pirate introuvable', sub = "Ce membre n'est pas dans le classement.", onRetry }) {
  return (
    <div className="pfx-error">
      <span className="pfx-error-ic">☠</span>
      <strong>{title}</strong>
      <p>{sub}</p>
      {onRetry && <button className="pfx-btn pfx-btn-ghost" type="button" onClick={onRetry}>↻ Réessayer</button>}
    </div>
  )
}

// Squelette pendant le chargement (hero + barres).
export function ProfileSkeleton() {
  // Spinner sobre au lieu des gros blocs gris (jugés "horribles" sur le profil).
  return (
    <div style={{ minHeight: '46vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '70px 0' }}>
      <div style={{ width: 34, height: 34, border: '3px solid rgba(212,160,23,0.18)', borderTopColor: '#d4a017', borderRadius: '50%', animation: 'pfx-spin 0.75s linear infinite' }} />
      <style>{`@keyframes pfx-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
