// Guess Who — briques d'interface (vies, avatar, lecteur de son, carte d'imitation), identité Brams.
import { useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { SPRING_POP } from './manga.jsx'
import { LifeShards } from './cartoon.jsx'
import { T, F, LINE, RADIUS, SHADOW, plate, pill } from './theme.js'

// Vies : points champagne. Une vie perdue pendant qu'on regarde se brise
// façon dessin animé : elle gonfle (anticipation), vire au rouge, s'écrase,
// puis ses éclats tombent (LifeShards). Au premier affichage : rien.
export function Lives({ lives, max = 2, size = 20 }) {
  const d = Math.max(8, Math.round(size * 0.5))
  const prev = useRef(lives)
  const [broken, setBroken] = useState(null) // index de la vie qui vient de casser
  useEffect(() => {
    if (lives < prev.current) setBroken(lives)
    prev.current = lives
  }, [lives])
  return (
    <span aria-label={`${lives} vie${lives > 1 ? 's' : ''}`} style={{ display: 'inline-flex', gap: Math.round(d * 0.6), flex: '0 0 auto', alignItems: 'center' }}>
      {Array.from({ length: max }, (_, i) => {
        const full = i < lives
        const breaking = i === broken
        return (
          <span key={i} style={{ position: 'relative', display: 'inline-block', width: d, height: d }}>
            <motion.span initial={false}
              animate={full ? { scale: 1, scaleY: 1, opacity: 1 }
                : breaking ? { scale: [1, 1.45, 1.3, 0.55, 1], scaleY: [1, 1.1, 0.6, 1, 1], opacity: [1, 1, 1, 1, 0.9] }
                : { scale: 1, opacity: 0.9 }}
              transition={full ? SPRING_POP : { duration: 0.55, times: [0, 0.25, 0.4, 0.6, 1] }}
              style={{
                position: 'absolute', inset: 0, borderRadius: '50%', display: 'block',
                background: full ? T.accent : 'transparent', border: `1px solid ${full ? T.accent : breaking ? T.danger : T.textFaint}`,
                boxShadow: full ? `0 0 8px ${T.glow}` : 'none', transition: 'background .25s .15s, border-color .25s .15s',
              }} />
            {breaking && <LifeShards key={`shards-${lives}`} size={d} />}
          </span>
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
        border: LINE, background: T.raised,
      }} />
      <span style={{ display: 'grid', minWidth: 0 }}>
        <span style={{ fontFamily: F.ui, fontWeight: 600, fontSize: size > 50 ? 18 : 15.5, color: T.textHi, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
        {sub && <span style={{ fontFamily: F.ui, fontWeight: 500, fontSize: 12.5, color: T.textMute }}>{sub}</span>}
      </span>
    </span>
  )
}

// Un seul son à la fois sur la page : lancer un lecteur met les autres en pause.
export const PLAY_EVT = 'gw-audio-play'

// Points carrés de 4 px tous les 9 px.
const dotRow = (color) => `linear-gradient(90deg, ${color} 0 4px, transparent 4px) 0 0 / 9px 4px repeat-x`

// Lecteur : bouton rond champagne + progression en points.
export function ClipPlayer({ url, label: name, autoPlay = false, onError, big = false, onEnded }) {
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
  const s = big ? 72 : 48
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, width: '100%', flexWrap: 'wrap' }}>
      {blocked && (
        <button type="button" className="gw-btn" onClick={toggle} style={{
          ...pill('primary'), width: '100%', minHeight: 52, cursor: 'pointer', fontFamily: F.ui, fontWeight: 700, fontSize: 16,
        }}>Appuie pour écouter le son</button>
      )}
      <audio ref={ref} src={url} preload="auto" playsInline
        onPlay={(e) => { setPlaying(true); window.dispatchEvent(new CustomEvent(PLAY_EVT, { detail: e.currentTarget })) }}
        onPause={() => setPlaying(false)}
        onEnded={() => { setPlaying(false); setPct(1); onEnded?.() }}
        onTimeUpdate={(e) => setPct(e.currentTarget.duration ? e.currentTarget.currentTime / e.currentTarget.duration : 0)}
        onError={onError} />
      <motion.button type="button" className="gw-btn" onClick={toggle} whileTap={{ scale: 0.94 }}
        aria-label={playing ? 'Pause' : `Écouter ${name || ''}`}
        style={{
          width: s, height: s, borderRadius: '50%', cursor: 'pointer', flex: '0 0 auto', display: 'grid', placeItems: 'center',
          background: playing ? 'transparent' : T.accent, color: playing ? T.accent : T.onAccent,
          border: `1px solid ${T.accent}`, boxShadow: playing ? `0 0 0 6px ${T.glow}` : SHADOW.soft,
          fontFamily: F.ui, fontWeight: 800, fontSize: big ? 22 : 15, transition: 'background .2s, color .2s, box-shadow .2s',
        }}>
        {playing ? '❚❚' : <span style={{ marginLeft: big ? 4 : 2 }}>▶</span>}
      </motion.button>
      {/* progression en rangée de points (même trame que le fond), motif
          répété : autant de points que la largeur en permet */}
      <div aria-hidden style={{ flex: 1, minWidth: 80, height: 4, background: dotRow('rgba(237,234,227,0.18)') }}>
        <div style={{ width: `${pct * 100}%`, height: '100%', background: dotRow(playing ? T.accentLit : T.accent), transition: 'width .2s linear' }} />
      </div>
    </div>
  )
}

// Vote posé : une gerbe de points champagne jaillit du bouton (une fois,
// au montage ; rien si l'OS demande moins d'animations).
const BURST = Array.from({ length: 12 }, (_, i) => {
  const a = (i / 12) * Math.PI * 2 + (i % 2 ? 0.2 : 0)
  const d = 38 + (i % 3) * 14
  return { x: Math.cos(a) * d * 1.6, y: Math.sin(a) * d, s: i % 3 === 0 ? 6 : 4 }
})
export function DotBurst() {
  const reduce = useReducedMotion()
  if (reduce) return null
  return (
    <span aria-hidden style={{ position: 'absolute', left: '50%', top: '50%', width: 0, height: 0, pointerEvents: 'none', zIndex: 2 }}>
      {BURST.map((p, i) => (
        <motion.span key={i}
          initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
          animate={{ x: p.x, y: p.y, opacity: 0, scale: 0.4 }}
          transition={{ duration: 0.6, ease: [0.15, 0.8, 0.3, 1] }}
          style={{ position: 'absolute', left: -p.s / 2, top: -p.s / 2, width: p.s, height: p.s, background: i % 4 ? T.accent : T.accentLit }} />
      ))}
    </span>
  )
}

// Carte d'imitation : numéro, joueur, lecteur, bouton de vote (≥ 48 px).
// `onAir` : en cours dans « écouter tout » ; `dim` : le vote est allé à une autre carte.
export function TakeCard({ player, url, selected, onVote, disabled, voteLabel = 'Voter', index, isMe, onAir, dim }) {
  const edge = selected || onAir ? T.accent : T.line
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: dim ? 0.6 : 1, y: 0, scale: onAir ? 1.01 : 1 }}
      transition={{ duration: 0.25, delay: index != null ? Math.min(index, 6) * 0.04 : 0 }}
      style={{
        ...plate({ padding: 14, borderRadius: RADIUS.md }),
        border: `1px ${isMe ? 'dashed' : 'solid'} ${edge}`,
        boxShadow: selected ? `0 0 0 3px ${T.glow}, ${SHADOW.soft}` : plate().boxShadow,
        position: 'relative', display: 'flex', flexDirection: 'column', gap: 12,
      }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {index != null && (
          <span aria-hidden style={{
            flex: '0 0 auto', width: 28, height: 28, borderRadius: '50%', display: 'grid', placeItems: 'center',
            border: LINE, color: T.accentLit, fontFamily: F.display, fontWeight: 500, fontSize: 14,
          }}>{index + 1}</span>
        )}
        <div style={{ flex: 1, minWidth: 0 }}><AvatarName player={player} sub={isMe ? "C'est toi" : onAir ? 'En cours…' : undefined} /></div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 150px', minWidth: 0 }}><ClipPlayer url={url} label={player?.display_name} /></div>
        {onVote && (
          <span style={{ position: 'relative', flex: '1 0 110px', display: 'flex' }}>
          {selected && <DotBurst />}
          <motion.button type="button" className="gw-btn" disabled={disabled} onClick={onVote}
            whileTap={disabled ? undefined : { scale: 0.97 }}
            aria-pressed={!!selected}
            style={{
              ...pill(selected ? 'primary' : 'ghost'),
              flex: 1, minHeight: 48, padding: '0 14px', cursor: disabled ? 'default' : 'pointer',
              fontFamily: F.ui, fontWeight: 700, fontSize: 15, opacity: disabled && !selected ? 0.5 : 1,
            }}>
            {selected ? '✓ Voté' : voteLabel}
          </motion.button>
          </span>
        )}
      </div>
    </motion.div>
  )
}
