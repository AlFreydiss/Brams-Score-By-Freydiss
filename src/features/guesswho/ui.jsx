// Guess Who — briques d'interface (vies, avatar, lecteur de son, carte d'imitation), style manga.
import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { C, FONT_BODY, FONT_DISPLAY, SPRING_POP } from './manga.jsx'

// Cœurs : un cœur qui se perd « éclate » (gonfle puis se fend).
export function Lives({ lives, max = 2, size = 20 }) {
  return (
    <span aria-label={`${lives} vie${lives > 1 ? 's' : ''}`} style={{ display: 'inline-flex', gap: 4, flex: '0 0 auto' }}>
      {Array.from({ length: max }, (_, i) => {
        const full = i < lives
        return (
          <motion.span key={i} initial={false}
            animate={full
              ? { scale: 1, rotate: 0, opacity: 1 }
              : { scale: [1, 1.8, 0.85], rotate: [0, 18, -12], opacity: [1, 1, 0.45] }}
            transition={full ? SPRING_POP : { duration: 0.6, times: [0, 0.35, 1] }}
            style={{ fontSize: size, lineHeight: 1, filter: `drop-shadow(2px 2px 0 ${C.ink})` }}>
            {full ? '❤️' : '💔'}
          </motion.span>
        )
      })}
    </span>
  )
}

export const avatarUrl = (p) => p?.avatar_url || `https://api.dicebear.com/8.x/thumbs/svg?seed=${encodeURIComponent(p?.display_name || 'Invité')}`

export function AvatarName({ player, size = 44, sub }) {
  const name = player?.display_name || 'Invité'
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, minWidth: 0, maxWidth: '100%' }}>
      <img src={avatarUrl(player)} alt="" width={size} height={size} style={{
        width: size, height: size, borderRadius: '50%', objectFit: 'cover', flex: '0 0 auto',
        border: `3px solid ${C.ink}`, background: C.paper,
      }} />
      <span style={{ display: 'grid', minWidth: 0 }}>
        <span style={{ fontFamily: FONT_DISPLAY, fontSize: size > 50 ? 22 : 18, color: C.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
        {sub && <span style={{ fontFamily: FONT_BODY, fontWeight: 800, fontSize: 12.5, color: C.textMut }}>{sub}</span>}
      </span>
    </span>
  )
}

// Un seul son à la fois sur la page : lancer un lecteur met les autres en pause.
export const PLAY_EVT = 'gw-audio-play'

// Lecteur : gros bouton rouge encré + barre de progression en trame.
export function ClipPlayer({ url, label, autoPlay = false, onError, big = false, onEnded }) {
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
  useEffect(() => {
    const other = (e) => { if (e.detail !== ref.current && ref.current && !ref.current.paused) ref.current.pause() }
    window.addEventListener(PLAY_EVT, other)
    return () => window.removeEventListener(PLAY_EVT, other)
  }, [])
  const toggle = () => {
    const a = ref.current
    if (!a) return
    setBlocked(false)
    if (a.paused) { if (a.ended) a.currentTime = 0; a.play().catch(() => {}) } else a.pause()
  }
  const s = big ? 84 : 52
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, width: '100%', flexWrap: 'wrap' }}>
      {blocked && (
        <button type="button" className="gw-btn" onClick={toggle} style={{
          width: '100%', minHeight: 56, cursor: 'pointer', background: C.yellow, color: C.ink,
          border: `3px solid ${C.ink}`, boxShadow: `4px 4px 0 ${C.ink}`, fontFamily: FONT_DISPLAY, fontSize: 18,
        }}>🔊 Appuie pour écouter le son</button>
      )}
      <audio ref={ref} src={url} preload="auto" playsInline
        onPlay={(e) => { setPlaying(true); window.dispatchEvent(new CustomEvent(PLAY_EVT, { detail: e.currentTarget })) }}
        onPause={() => setPlaying(false)}
        onEnded={() => { setPlaying(false); setPct(1); onEnded?.() }}
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
      <div style={{ flex: 1, minWidth: 80, height: 14, border: `3px solid ${C.ink}`, background: C.paper, overflow: 'hidden' }}>
        <div style={{
          width: '100%', height: '100%', transform: `scaleX(${pct})`, transformOrigin: 'left', transition: 'transform .2s linear',
          background: `repeating-linear-gradient(-45deg, ${C.ink} 0 4px, ${C.red} 4px 9px)`,
        }} />
      </div>
    </div>
  )
}

// Carte d'imitation : numéro, joueur, lecteur, gros bouton de vote (≥ 52 px).
// `onAir` : en cours dans « écouter tout » ; `dim` : le vote est allé à une autre carte.
export function TakeCard({ player, url, selected, onVote, disabled, voteLabel = 'Voter', index, isMe, onAir, dim }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18, rotate: (index ?? 0) % 2 ? 1.5 : -1.5 }}
      animate={{ opacity: dim ? 0.62 : 1, y: selected ? -4 : 0, rotate: selected ? -1.5 : 0, scale: onAir ? 1.02 : 1 }}
      transition={{ ...SPRING_POP, delay: index != null ? Math.min(index, 6) * 0.05 : 0 }}
      style={{
        position: 'relative', display: 'flex', flexDirection: 'column', gap: 10, padding: 12,
        background: selected ? C.yellow : isMe ? '#EEEDF2' : C.paper,
        border: `3px ${isMe ? 'dashed' : 'solid'} ${onAir ? C.red : C.ink}`,
        boxShadow: `${selected ? 7 : 4}px ${selected ? 7 : 4}px 0 ${onAir ? C.red : C.ink}`,
      }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {index != null && (
          <span aria-hidden style={{
            flex: '0 0 auto', width: 30, height: 30, display: 'grid', placeItems: 'center', background: C.ink, color: C.paper,
            fontFamily: FONT_DISPLAY, fontSize: 15, transform: 'rotate(-6deg)',
          }}>{index + 1}</span>
        )}
        <div style={{ flex: 1, minWidth: 0 }}><AvatarName player={player} sub={isMe ? "C'est toi" : onAir ? '🔊 En cours…' : undefined} /></div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 150px', minWidth: 0 }}><ClipPlayer url={url} label={player?.display_name} /></div>
        {onVote && (
          <motion.button type="button" className="gw-btn" disabled={disabled} onClick={onVote}
            whileTap={disabled ? undefined : { scale: 0.95, y: 2 }}
            aria-pressed={!!selected}
            style={{
              flex: '1 0 110px', minHeight: 52, padding: '0 12px', cursor: disabled ? 'default' : 'pointer', fontFamily: FONT_DISPLAY, fontSize: 16,
              border: `3px solid ${C.ink}`, background: selected ? C.ink : C.red, color: selected ? C.yellow : '#fff',
              boxShadow: selected ? 'none' : `3px 3px 0 ${C.ink}`,
            }}>
            {selected ? '✓ Mon vote' : voteLabel}
          </motion.button>
        )}
      </div>
      {selected && (
        <motion.span aria-hidden initial={{ scale: 2.6, opacity: 0, rotate: -30 }} animate={{ scale: 1, opacity: 1, rotate: 12 }}
          transition={{ type: 'spring', stiffness: 600, damping: 14 }}
          style={{
            position: 'absolute', top: -14, right: -8, background: C.red, color: '#fff', border: `3px solid ${C.ink}`,
            fontFamily: FONT_DISPLAY, fontSize: 15, padding: '2px 10px', boxShadow: `3px 3px 0 ${C.ink}`,
          }}>BEST!</motion.span>
      )}
    </motion.div>
  )
}
