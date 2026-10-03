// Guess Who — effets ponctuels : paillettes champagne, compteur qui monte, bouton son.
// Tout est one-shot (CSS transform/opacity) et coupé par prefers-reduced-motion.
import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useReducedMotion } from 'framer-motion'
import { T, pill } from './theme.js'
import { isMuted, onMuteChange, play, setMuted } from './sfx.js'

const COLORS = [T.accent, T.accentLit, T.medal.silver, T.accentHi]

// Fine pluie de paillettes champagne, rare et courte, une seule fois.
export function Confetti({ count = 42, duration = 2600 }) {
  const reduce = useReducedMotion()
  const [alive, setAlive] = useState(true)
  const pieces = useMemo(() => Array.from({ length: Math.ceil(count / 2) }, (_, i) => ({
    i, left: Math.random() * 100, w: 4 + Math.random() * 2, h: 4 + Math.random() * 2,
    color: COLORS[i % COLORS.length], delay: Math.random() * 0.5, dur: 1.6 + Math.random() * 1.1,
    dx: `${-40 + Math.random() * 80}px`, rot: `${-180 + Math.random() * 360}deg`,
  })), [count])
  useEffect(() => { const t = setTimeout(() => setAlive(false), duration + 600); return () => clearTimeout(t) }, [duration])
  if (reduce || !alive) return null
  // portail vers <body> : un parent animé (transform) piégerait le position: fixed
  return createPortal(
    <div aria-hidden style={{ position: 'fixed', inset: 0, zIndex: 58, pointerEvents: 'none', overflow: 'hidden' }}>
      {pieces.map((p) => (
        <span key={p.i} className="gw-anim gw-keep" style={{
          position: 'absolute', top: 0, left: `${p.left}%`, width: p.w, height: p.h, background: p.color,
          borderRadius: '50%', opacity: 0.85, boxShadow: `0 0 6px ${T.glow}`, '--dx': p.dx, '--rot': p.rot, willChange: 'transform',
          '--gw-d': `${p.dur}s`,
          animation: `gw-confetti ${p.dur}s cubic-bezier(.25,.6,.45,1) ${p.delay}s both`,
        }} />
      ))}
    </div>
  , document.body)
}

// Nombre qui monte de 0 à `to` après `delay` ms (petit clic à chaque pas).
export function CountUp({ to, delay = 0, step = 120, sound = true, onDone }) {
  const reduce = useReducedMotion()
  const [n, setN] = useState(reduce ? to : 0)
  useEffect(() => {
    if (reduce) { setN(to); onDone?.(); return }
    setN(0)
    let i = 0
    let iv = null
    const start = setTimeout(() => {
      if (to <= 0) { onDone?.(); return }
      iv = setInterval(() => {
        i += 1
        setN(i)
        if (sound) play('count')
        if (i >= to) { clearInterval(iv); onDone?.() }
      }, step)
    }, delay)
    return () => { clearTimeout(start); clearInterval(iv) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [to, delay, step, reduce])
  return <>{n}</>
}

export function useMuted() {
  const [m, setM] = useState(isMuted)
  useEffect(() => onMuteChange(setM), [])
  return [m, (v) => setMuted(v)]
}

// Bouton son on/off (effets du jeu, pas les imitations).
export function SoundToggle({ style }) {
  const [muted, setM] = useMuted()
  return (
    <button type="button" className="gw-btn" onClick={() => { setM(!muted); if (muted) play('pop') }}
      aria-pressed={!muted} aria-label={muted ? 'Activer les effets sonores' : 'Couper les effets sonores'}
      title={muted ? 'Effets sonores coupés' : 'Effets sonores activés'}
      style={{
        ...pill('ghost'), width: 44, height: 44, display: 'grid', placeItems: 'center', cursor: 'pointer', fontSize: 18, lineHeight: 1,
        background: muted ? T.raised : 'transparent', opacity: muted ? 0.7 : 1,
        WebkitTapHighlightColor: 'transparent', ...style,
      }}>{muted ? '🔇' : '🔊'}</button>
  )
}
