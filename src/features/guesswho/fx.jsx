// Guess Who — effets ponctuels : confettis encrés, compteur qui monte, bouton son.
// Tout est one-shot (CSS transform/opacity) et coupé par prefers-reduced-motion.
import { useEffect, useMemo, useState } from 'react'
import { useReducedMotion } from 'framer-motion'
import { C, FONT_DISPLAY } from './manga.jsx'
import { isMuted, onMuteChange, play, setMuted } from './sfx.js'

const COLORS = [C.red, C.yellow, C.cyan, C.ink, '#FFFFFF']

// Pluie de confettis (rectangles et bandes encrées), une seule fois.
export function Confetti({ count = 42, duration = 2600 }) {
  const reduce = useReducedMotion()
  const [alive, setAlive] = useState(true)
  const pieces = useMemo(() => Array.from({ length: count }, (_, i) => ({
    i, left: Math.random() * 100, w: 7 + Math.random() * 9, h: 10 + Math.random() * 14,
    color: COLORS[i % COLORS.length], delay: Math.random() * 0.5, dur: 1.6 + Math.random() * 1.1,
    dx: `${-80 + Math.random() * 160}px`, rot: `${-540 + Math.random() * 1080}deg`,
  })), [count])
  useEffect(() => { const t = setTimeout(() => setAlive(false), duration + 600); return () => clearTimeout(t) }, [duration])
  if (reduce || !alive) return null
  return (
    <div aria-hidden style={{ position: 'fixed', inset: 0, zIndex: 58, pointerEvents: 'none', overflow: 'hidden' }}>
      {pieces.map((p) => (
        <span key={p.i} className="gw-anim" style={{
          position: 'absolute', top: 0, left: `${p.left}%`, width: p.w, height: p.h, background: p.color,
          border: `2px solid ${C.ink}`, '--dx': p.dx, '--rot': p.rot, willChange: 'transform',
          animation: `gw-confetti ${p.dur}s cubic-bezier(.25,.6,.45,1) ${p.delay}s both`,
        }} />
      ))}
    </div>
  )
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
        width: 46, height: 46, display: 'grid', placeItems: 'center', cursor: 'pointer', fontSize: 20, lineHeight: 1,
        background: muted ? C.tone : C.paper, border: `2px solid ${C.ink}`, fontFamily: FONT_DISPLAY,
        WebkitTapHighlightColor: 'transparent', ...style,
      }}>{muted ? '🔇' : '🔊'}</button>
  )
}
