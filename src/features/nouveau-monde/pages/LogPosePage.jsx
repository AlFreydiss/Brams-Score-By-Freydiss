// src/features/nouveau-monde/pages/LogPosePage.jsx
// Mon Log Pose : profil joueur. Prime totale (hero), stats par jeu, historique, badges.
// Route nested : /nouveau-monde/profil
// Source userId : session supabase si dispo, sinon placeholder Al Freydiss (mock).

import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { getPlayerLog } from '../data/api'
import { getSession } from '@/lib/supabase'
import { nm } from '../theme/tokens'

const FALLBACK_UID = '873117504367648798' // Al Freydiss — démo tant que pas connecté

function formatBounty(n) {
  if (!n) return '0 ฿'
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)} Md ฿`
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)} M ฿`
  return `${Math.round(n).toLocaleString('fr-FR')} ฿`
}

function Avatar({ p, size = 88 }) {
  return p?.avatar ? (
    <img src={p.avatar} alt="" width={size} height={size} style={{ borderRadius: '50%', objectFit: 'cover', border: `2px solid ${nm.color.gold}` }} />
  ) : (
    <div style={{
      width: size, height: size, borderRadius: '50%', display: 'grid', placeItems: 'center',
      background: `linear-gradient(135deg, ${nm.color.current}, ${nm.color.deepSea})`,
      border: `2px solid ${nm.color.gold}`,
      color: nm.color.foam, fontWeight: 800, fontFamily: nm.fonts.display, fontSize: size * 0.4,
    }}>{(p?.name || '?').charAt(0).toUpperCase()}</div>
  )
}

export default function LogPosePage() {
  const [log, setLog] = useState(null)

  useEffect(() => {
    let alive = true
    ;(async () => {
      // Identité backend = auth.uid() (uuid Supabase), cf. data/backend.md.
      const session = await getSession().catch(() => null)
      const uid = session?.user?.id || FALLBACK_UID
      const data = await getPlayerLog(uid)
      if (alive) setLog(data)
    })()
    return () => { alive = false }
  }, [])

  const sorted = useMemo(() => [...(log?.perGame || [])].sort((a, b) => b.bounty - a.bounty), [log])

  if (!log) {
    return (
      <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>
        <motion.div animate={{ opacity: [0.4, 0.8, 0.4] }} transition={{ duration: 1.2, repeat: Infinity }} style={{ ...nm.type.body, color: nm.color.foamDim }}>
          Lecture du Log Pose…
        </motion.div>
      </div>
    )
  }

  return (
    <div style={{ position: 'absolute', inset: 0, overflowY: 'auto', padding: `${nm.space.md} ${nm.space.xl} ${nm.space.xxl}` }}>
      <div style={{ maxWidth: 1080, margin: '0 auto', display: 'grid', gap: nm.space.lg }}>

        {/* Hero prime totale */}
        <motion.div
          initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: nm.motion.easeOut }}
          style={{
            display: 'flex', alignItems: 'center', gap: nm.space.lg, flexWrap: 'wrap',
            borderRadius: nm.radius.lg, padding: nm.space.xl, marginTop: nm.space.md,
            background: `linear-gradient(135deg, ${nm.color.goldDeep}22, rgba(6,20,31,0.92)), ${nm.color.deepSea}`,
            border: `1px solid ${nm.color.gold}44`, boxShadow: nm.shadow.island,
          }}>
          <Avatar p={log} />
          <div style={{ minWidth: 0 }}>
            <div style={{ ...nm.type.eyebrow, color: nm.color.goldHi }}>Mon Log Pose</div>
            <h1 style={{ fontFamily: nm.fonts.display, fontWeight: 800, fontSize: 'clamp(1.6rem, 4vw, 2.4rem)', margin: '4px 0', color: nm.color.foam }}>{log.name}</h1>
          </div>
          <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
            <div style={{ ...nm.type.eyebrow, color: nm.color.goldHi }}>Prime totale</div>
            <div style={{ ...nm.type.bounty, fontSize: 'clamp(1.8rem, 5vw, 3rem)', color: nm.color.goldHi, textShadow: `0 0 30px ${nm.color.gold}66` }}>
              {formatBounty(log.totalBounty)}
            </div>
          </div>
        </motion.div>

        {/* Badges */}
        {log.badges?.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: nm.space.sm }}>
            {log.badges.map((b) => (
              <div key={b.id} title={b.hint} style={{
                display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 14px',
                borderRadius: nm.radius.pill, background: `${nm.color.gold}1f`, border: `1px solid ${nm.color.gold}55`,
                ...nm.type.button, color: nm.color.goldHi,
              }}>🏅 {b.label}</div>
            ))}
          </div>
        )}

        {/* Stats par jeu */}
        <div>
          <div style={{ ...nm.type.eyebrow, color: nm.color.foamDim, marginBottom: nm.space.sm }}>Prime par île</div>
          <div style={{ display: 'grid', gap: nm.space.md, gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
            {sorted.map((g, i) => (
              <motion.div key={g.game}
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                style={{
                  borderRadius: nm.radius.lg, padding: nm.space.lg,
                  background: `linear-gradient(160deg, ${g.accent}1c, rgba(6,20,31,0.85))`,
                  border: `1px solid ${g.accent}44`,
                }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: nm.space.sm }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: g.accent }} />
                  {g.island ? (
                    <Link to={`/nouveau-monde/${g.island}`} style={{ fontFamily: nm.fonts.display, fontWeight: 700, color: nm.color.foam, textDecoration: 'none' }}>{g.title}</Link>
                  ) : (
                    <span style={{ fontFamily: nm.fonts.display, fontWeight: 700, color: nm.color.foam }}>{g.title}</span>
                  )}
                </div>
                <div style={{ ...nm.type.bounty, fontSize: '1.3rem', color: nm.color.goldHi }}>{formatBounty(g.bounty)}</div>
                <div style={{ ...nm.type.small, color: nm.color.foamDim, marginTop: 4 }}>
                  {g.elo != null && `ELO ${g.elo} · `}{g.wins}V / {g.losses}D{g.rank ? ` · #${g.rank}` : ''}
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Historique */}
        <div>
          <div style={{ ...nm.type.eyebrow, color: nm.color.foamDim, marginBottom: nm.space.sm }}>Journal de bord</div>
          <div style={{ borderRadius: nm.radius.lg, overflow: 'hidden', background: 'rgba(6,20,31,0.55)', border: `1px solid ${nm.color.mist}` }}>
            {(log.history || []).map((m, i) => (
              <div key={m.id} style={{
                display: 'flex', alignItems: 'center', gap: nm.space.md, padding: `${nm.space.sm} ${nm.space.lg}`,
                borderTop: i === 0 ? 'none' : `1px solid ${nm.color.mist}`,
              }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: m.result === 'win' ? nm.color.win : nm.color.danger, flexShrink: 0 }} />
                <span style={{ color: nm.color.foam, fontWeight: 600 }}>{m.title}</span>
                <span style={{ ...nm.type.small, color: nm.color.foamDim }}>vs {m.opponent}</span>
                <span style={{ marginLeft: 'auto', ...nm.type.small, color: nm.color.foamDim }}>{m.when}</span>
                <span style={{ minWidth: 70, textAlign: 'right', fontWeight: 700, color: m.result === 'win' ? nm.color.goldHi : nm.color.foamDim }}>{m.delta}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ textAlign: 'center' }}>
          <Link to="/nouveau-monde" style={{ ...nm.type.button, color: nm.color.foamDim, textDecoration: 'none' }}>← Retour à la carte</Link>
        </div>
      </div>
    </div>
  )
}
