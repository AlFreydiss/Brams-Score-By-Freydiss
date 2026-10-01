import { motion } from 'framer-motion'
import { type } from '../../styles/typography.js'
import { C, alpha, SPRING_POP } from '../garticphone/theme.js'
import { PhaseFrame } from '../garticphone/ui.jsx'
import { AvatarName, Lives } from './ui.jsx'

export default function ResultPhase({ g }) {
  const res = g.room.last_result || {}
  const losers = new Set(res.losers || [])
  const scores = res.stage === 'revote' ? res.revote_scores || {} : res.scores || {}
  const rows = [...g.players].filter((p) => p.seat != null).sort((a, b) => (scores[b.user_id] || 0) - (scores[a.user_id] || 0))
  const title = losers.size === 0 ? 'Personne ne perd de vie'
    : res.stage === 'auto' ? "Pas assez d'imitations : ceux qui n'ont rien envoyé perdent une vie"
    : losers.size > 1 ? 'Égalité parfaite : les ex aequo perdent une vie' : 'Le moins voté perd une vie'
  return (
    <PhaseFrame eyebrow={`Tour ${res.round} · Résultat`} prompt={title} remaining={g.remaining} total={g.total}>
      <div style={{ display: 'grid', gap: 8 }}>
        {rows.map((p) => (
          <motion.div key={p.user_id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={SPRING_POP}
            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 14,
              background: losers.has(p.user_id) ? alpha(C.danger, 0.14) : 'rgba(255,255,255,0.04)' }}>
            <div style={{ flex: 1, minWidth: 0 }}><AvatarName player={p} /></div>
            <span style={{ ...type.body, color: C.textMut, fontVariantNumeric: 'tabular-nums' }}>
              {res.stage === 'auto' ? '—' : `${scores[p.user_id] || 0} vote${(scores[p.user_id] || 0) > 1 ? 's' : ''}`}
            </span>
            <Lives lives={p.lives} />
            {losers.has(p.user_id) && <span aria-hidden style={{ fontSize: 20 }}>💔</span>}
          </motion.div>
        ))}
      </div>
    </PhaseFrame>
  )
}
