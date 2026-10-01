// Guess Who — briques d'interface (vies, avatar, lecteur de son, carte d'imitation), style manga.
import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { C, FONT_BODY, FONT_DISPLAY, SPRING_POP } from './manga.jsx'

export function Lives({ lives, max = 2 }) {
  return (
    <span aria-label={`${lives} vie${lives > 1 ? 's' : ''}`} style={{ display: 'inline-flex', gap: 4 }}>
      {Array.from({ length: max }, (_, i) => (
        <motion.span key={i} initial={false}
          animate={{ scale: i < lives ? 1 : 0.85, rotate: i < lives ? 0 : -12, opacity: i < lives ? 1 : 0.35 }}
          transition={SPRING_POP} style={{ fontSize: 20, lineHeight: 1, filter: `drop-shadow(2px 2px 0 ${C.ink})` }}>
          {i < lives ? '❤️' : '💔'}
        </motion.span>
      ))}
    </span>
  )
}

export function AvatarName({ player, size = 44 }) {
  const name = player?.display_name || 'Invité'
  const avatar = player?.avatar_url || `https://api.dicebear.com/8.x/thumbs/svg?seed=${encodeURIComponent(name)}`
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
      <img src={avatar} alt="" width={size} height={size} style={{
        width: size, height: size, borderRadius: '50%', objectFit: 'cover', flex: '0 0 auto',
        border: `3px solid ${C.ink}`, background: C.paper,
      }} />
      <span style={{ fontFamily: FONT_DISPLAY, fontSize: 18, color: C.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
    </span>
  )
}

// Lecteur : gros bouton rouge encré + barre de progression en trame.
export function ClipPlayer({ url, label, autoPlay = false, onError, big = false }) {
  const ref = useRef(null)
  const [playing, setPlaying] = useState(false)
  const [pct, setPct] = useState(0)
  // Lecture auto refusée par le navigateur (fréquent sur téléphone) : on le dit
  // clairement au lieu de laisser un écran muet.
  const [blocked, setBlocked] = useState(false)
  useEffect(() => {
    if (!autoPlay) return
    const a = ref.current
    if (!a) return
    a.play().then(() => setBlocked(false)).catch(() => setBlocked(true))
  }, [autoPlay, url])
  const toggle = () => {
    const a = ref.current
    if (!a) return
    setBlocked(false)
    if (a.paused) { if (a.ended) a.currentTime = 0; a.play().catch(() => {}) } else a.pause()
  }
  const s = big ? 84 : 50
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, width: '100%', flexWrap: 'wrap' }}>
      {blocked && (
        <button type="button" className="gw-btn" onClick={toggle} style={{
          width: '100%', minHeight: 56, cursor: 'pointer', background: C.yellow, color: C.ink,
          border: `3px solid ${C.ink}`, boxShadow: `4px 4px 0 ${C.ink}`, fontFamily: FONT_DISPLAY, fontSize: 18,
        }}>🔊 Appuie pour écouter le son</button>
      )}
      <audio ref={ref} src={url} preload="auto"
        onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => { setPlaying(false); setPct(1) }}
        onTimeUpdate={(e) => setPct(e.currentTarget.duration ? e.currentTarget.currentTime / e.currentTarget.duration : 0)}
        onError={onError} />
      <motion.button type="button" className="gw-btn" onClick={toggle} whileTap={{ scale: 0.9 }}
        aria-label={playing ? 'Pause' : `Écouter ${label || ''}`}
        style={{
          width: s, height: s, borderRadius: '50%', cursor: 'pointer', flex: '0 0 auto',
          background: playing ? C.yellow : C.red, color: playing ? C.ink : '#fff',
          border: `3px solid ${C.ink}`, boxShadow: `3px 3px 0 ${C.ink}`,
          fontFamily: FONT_DISPLAY, fontSize: big ? 30 : 18,
        }}>
        {playing ? '❚❚' : '▶'}
      </motion.button>
      <div style={{ flex: 1, height: 14, border: `3px solid ${C.ink}`, background: C.paper, overflow: 'hidden' }}>
        <div style={{
          width: `${pct * 100}%`, height: '100%', transition: 'width .2s linear',
          background: `repeating-linear-gradient(-45deg, ${C.ink} 0 4px, ${C.red} 4px 9px)`,
        }} />
      </div>
    </div>
  )
}

export function TakeCard({ player, url, selected, onVote, disabled, voteLabel = 'Voter' }) {
  return (
    <motion.div
      animate={{ rotate: selected ? -1.5 : 0, y: selected ? -4 : 0 }}
      transition={SPRING_POP}
      style={{
        display: 'flex', flexDirection: 'column', gap: 12, padding: 14, background: selected ? C.yellow : C.paper,
        border: `3px solid ${C.ink}`, boxShadow: `${selected ? 7 : 4}px ${selected ? 7 : 4}px 0 ${C.ink}`,
      }}>
      <AvatarName player={player} />
      <ClipPlayer url={url} label={player?.display_name} />
      {onVote && (
        <button type="button" className="gw-btn" disabled={disabled} onClick={onVote}
          style={{
            minHeight: 44, cursor: disabled ? 'default' : 'pointer', fontFamily: FONT_DISPLAY, fontSize: 15,
            border: `3px solid ${C.ink}`, background: selected ? C.ink : C.paper, color: selected ? C.yellow : C.ink,
          }}>
          {selected ? 'Ton vote ✓' : voteLabel}
        </button>
      )}
      {!onVote && <span style={{ fontFamily: FONT_BODY, fontWeight: 700, fontSize: 13, color: C.textMut }}>{voteLabel === 'Toi' ? 'Ton imitation' : ''}</span>}
    </motion.div>
  )
}
