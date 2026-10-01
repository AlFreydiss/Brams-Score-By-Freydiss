import { motion } from 'framer-motion'
import { C, FONT_DISPLAY, PhaseFrame, SPRING_POP, type } from './manga.jsx'
import { AvatarName, Lives } from './ui.jsx'

// Verdict du tour : classement en cases, le perdant prend un tampon « K.O. ».
export default function ResultPhase({ g }) {
  const res = g.room.last_result || {}
  const losers = new Set(res.losers || [])
  const scores = res.stage === 'revote' ? res.revote_scores || {} : res.scores || {}
  const rows = [...g.players].filter((p) => p.seat != null).sort((a, b) => (scores[b.user_id] || 0) - (scores[a.user_id] || 0))
  const title = losers.size === 0 ? 'Personne ne perd de vie'
    : res.stage === 'auto' ? "Ceux qui n'ont rien envoyé perdent une vie"
    : losers.size > 1 ? 'Égalité : les ex aequo perdent une vie' : 'Le moins voté perd une vie'
  return (
    <PhaseFrame eyebrow={`Tour ${res.round} · Verdict`} prompt={title} remaining={g.remaining} total={g.total} tilt={0.6}>
      <div style={{ display: 'grid', gap: 10 }}>
        {rows.map((p, i) => {
          const lost = losers.has(p.user_id)
          const n = scores[p.user_id] || 0
          return (
            <motion.div key={p.user_id}
              initial={{ x: -30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ ...SPRING_POP, delay: i * 0.08 }}
              style={{
                position: 'relative', display: 'flex', alignItems: 'center', gap: 14, padding: '10px 14px',
                border: `3px solid ${C.ink}`, background: lost ? '#FFE3E8' : C.paper, boxShadow: `4px 4px 0 ${C.ink}`,
              }}>
              <div style={{ flex: 1, minWidth: 0 }}><AvatarName player={p} /></div>
              <span style={{ ...type.h3, color: C.ink, fontVariantNumeric: 'tabular-nums' }}>
                {res.stage === 'auto' ? '—' : `${n} vote${n > 1 ? 's' : ''}`}
              </span>
              <Lives lives={p.lives} />
              {lost && (
                <motion.span aria-label="perd une vie"
                  initial={{ scale: 3, rotate: -30, opacity: 0 }} animate={{ scale: 1, rotate: -12, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 600, damping: 12, delay: 0.4 + i * 0.08 }}
                  style={{
                    position: 'absolute', right: 12, top: -14, fontFamily: FONT_DISPLAY, fontSize: 20, color: '#fff',
                    background: C.red, border: `3px solid ${C.ink}`, padding: '2px 10px',
                  }}>K.O.</motion.span>
              )}
            </motion.div>
          )
        })}
      </div>
    </PhaseFrame>
  )
}
