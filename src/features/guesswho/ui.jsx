// Guess Who — petites briques d'interface (vies, avatar, lecteur de son, carte d'imitation).
import { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { type } from '../../styles/typography.js'
import { C, alpha, SPRING_POP } from '../garticphone/theme.js'

export function Lives({ lives, max = 2 }) {
  return (
    <span aria-label={`${lives} vie${lives > 1 ? 's' : ''}`} style={{ display: 'inline-flex', gap: 3 }}>
      {Array.from({ length: max }, (_, i) => (
        <motion.span key={i} initial={false} animate={{ scale: i < lives ? 1 : 0.8, opacity: i < lives ? 1 : 0.25 }}
          transition={SPRING_POP} style={{ fontSize: 15 }}>{i < lives ? '❤️' : '💔'}</motion.span>
      ))}
    </span>
  )
}

export function AvatarName({ player, size = 32 }) {
  const name = player?.display_name || 'Invité'
  const avatar = player?.avatar_url || `https://api.dicebear.com/8.x/thumbs/svg?seed=${encodeURIComponent(name)}`
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
      <img src={avatar} alt="" width={size} height={size} style={{ borderRadius: '50%', objectFit: 'cover', flex: '0 0 auto' }} />
      <span style={{ ...type.body, color: C.text, fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
    </span>
  )
}

// Lecteur minimal : gros bouton lecture/pause + barre de progression.
export function ClipPlayer({ url, label, autoPlay = false, onError, big = false }) {
  const ref = useRef(null)
  const [playing, setPlaying] = useState(false)
  const [pct, setPct] = useState(0)
  const toggle = () => {
    const a = ref.current
    if (!a) return
    if (a.paused) { a.currentTime = a.ended ? 0 : a.currentTime; a.play().catch(() => {}) } else a.pause()
  }
  const s = big ? 72 : 44
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%' }}>
      <audio ref={ref} src={url} autoPlay={autoPlay} preload="auto"
        onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => { setPlaying(false); setPct(1) }}
        onTimeUpdate={(e) => setPct(e.currentTarget.duration ? e.currentTarget.currentTime / e.currentTarget.duration : 0)}
        onError={onError} />
      <motion.button type="button" onClick={toggle} whileTap={{ scale: 0.92 }} aria-label={playing ? 'Pause' : `Écouter ${label || ''}`}
        style={{ width: s, height: s, borderRadius: '50%', border: 'none', cursor: 'pointer', flex: '0 0 auto',
          background: C.gold, color: '#1b1305', fontSize: big ? 28 : 17, fontWeight: 900 }}>
        {playing ? '❚❚' : '▶'}
      </motion.button>
      <div style={{ flex: 1, height: 6, borderRadius: 999, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
        <div style={{ width: `${pct * 100}%`, height: '100%', background: C.gold, transition: 'width .2s linear' }} />
      </div>
    </div>
  )
}

export function TakeCard({ player, url, selected, onVote, disabled, voteLabel = 'Voter' }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 14, borderRadius: 16,
      background: selected ? alpha(C.gold, 0.12) : 'rgba(255,255,255,0.04)',
      border: `1px solid ${selected ? alpha(C.gold, 0.5) : 'rgba(255,255,255,0.08)'}` }}>
      <AvatarName player={player} />
      <ClipPlayer url={url} label={player?.display_name} />
      {onVote && (
        <button type="button" disabled={disabled} onClick={onVote}
          style={{ minHeight: 42, borderRadius: 12, cursor: disabled ? 'default' : 'pointer', fontWeight: 800,
            border: 'none', background: selected ? C.gold : 'rgba(255,255,255,0.08)', color: selected ? '#1b1305' : C.text }}>
          {selected ? '✓ Ton vote' : voteLabel}
        </button>
      )}
    </div>
  )
}
