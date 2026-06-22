// src/features/nouveau-monde/pages/ClassementsPage.jsx
// Leaderboards cross-jeux façon AVIS DE RECHERCHE (wanted posters parchemin),
// podium animé, filtres par jeu / période. Type posterTitle / bounty.
// Route nested : /nouveau-monde/classements

import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ISLANDS } from '../data/islands'
import { getLeaderboard } from '../data/api'
import { nm } from '../theme/tokens'

const PERIODS = [
  { id: 'week',  label: 'Semaine' },
  { id: 'month', label: 'Mois' },
  { id: 'all',   label: 'Tout temps' },
]
const GAMES = [{ id: 'global', label: 'Cross-jeux', accent: nm.color.gold }, ...ISLANDS.filter(i => i.status === 'live').map(i => ({ id: i.ratingKey, label: i.title, accent: i.accent }))]

function formatBounty(n) {
  if (!n) return '0 ฿'
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)} Md ฿`
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)} M ฿`
  return `${Math.round(n).toLocaleString('fr-FR')} ฿`
}

function Avatar({ p, size = 44 }) {
  return p.avatar ? (
    <img src={p.avatar} alt="" width={size} height={size} style={{ borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
  ) : (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0, display: 'grid', placeItems: 'center',
      background: `linear-gradient(135deg, ${nm.color.current}, ${nm.color.deepSea})`,
      color: nm.color.foam, fontWeight: 800, fontFamily: nm.fonts.display, fontSize: size * 0.4,
    }}>{(p.name || '?').charAt(0).toUpperCase()}</div>
  )
}

// Poster « WANTED » parchemin pour le podium.
function WantedPoster({ p, place }) {
  const offset = place === 1 ? -18 : 0
  const scale = place === 1 ? 1 : 0.92
  return (
    <motion.div
      initial={{ opacity: 0, y: 40, rotate: place === 1 ? 0 : (place === 2 ? -3 : 3) }}
      animate={{ opacity: 1, y: offset }}
      transition={{ delay: 0.1 * place, type: 'spring', stiffness: 220, damping: 22 }}
      style={{
        width: place === 1 ? 220 : 180, transform: `scale(${scale})`,
        background: `linear-gradient(165deg, ${nm.color.parchment}, ${nm.color.parchmentDim})`,
        border: `2px solid ${nm.color.goldDeep}`, borderRadius: nm.radius.sm,
        boxShadow: place === 1 ? nm.shadow.goldGlow + ', ' + nm.shadow.island : nm.shadow.card,
        padding: nm.space.md, textAlign: 'center', color: nm.color.ink,
      }}
    >
      <div style={{ ...nm.type.posterTitle, fontSize: place === 1 ? '1.05rem' : '0.9rem', color: nm.color.ink, letterSpacing: '0.14em' }}>WANTED</div>
      <div style={{ height: 1, background: nm.color.inkLine, margin: '6px 0 10px' }} />
      <div style={{ display: 'grid', placeItems: 'center', marginBottom: 8 }}>
        <Avatar p={p} size={place === 1 ? 72 : 56} />
      </div>
      <div style={{ fontFamily: nm.fonts.display, fontWeight: 800, color: nm.color.ink, fontSize: place === 1 ? '1rem' : '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
      <div style={{ height: 1, background: nm.color.inkLine, margin: '8px 0' }} />
      <div style={{ ...nm.type.eyebrow, color: nm.color.goldDeep, letterSpacing: '0.18em' }}>Prime</div>
      <div style={{ ...nm.type.bounty, color: nm.color.ink }}>{formatBounty(p.bounty)}</div>
      <div style={{ marginTop: 6, ...nm.type.small, color: nm.color.goldDeep, fontWeight: 700 }}>
        {place === 1 ? '👑 Empereur' : `#${place}`}
      </div>
    </motion.div>
  )
}

export default function ClassementsPage() {
  const [game, setGame] = useState('global')
  const [period, setPeriod] = useState('week')
  const [rows, setRows] = useState(null)

  useEffect(() => {
    let alive = true
    setRows(null)
    ;(async () => {
      const b = await getLeaderboard(game, period)
      if (alive) setRows(b)
    })()
    return () => { alive = false }
  }, [game, period])

  const podium = useMemo(() => (rows || []).slice(0, 3), [rows])
  const rest = useMemo(() => (rows || []).slice(3), [rows])
  const activeAccent = GAMES.find(g => g.id === game)?.accent || nm.color.gold

  return (
    <div style={{ position: 'absolute', inset: 0, overflowY: 'auto', padding: `${nm.space.md} ${nm.space.xl} ${nm.space.xxl}` }}>
      <div style={{ maxWidth: 1080, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: nm.space.lg }}>
          <div style={{ ...nm.type.eyebrow, color: nm.color.goldHi }}>Le mur du Nouveau Monde</div>
          <h1 style={{ ...nm.type.posterTitle, color: nm.color.parchment, fontSize: 'clamp(2rem, 4.5vw, 3rem)', margin: '4px 0' }}>Avis de Recherche</h1>
          <p style={{ ...nm.type.body, color: nm.color.foamDim, margin: 0 }}>Les primes les plus élevées de l'archipel.</p>
        </div>

        {/* Filtres */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: nm.space.md, justifyContent: 'center', marginBottom: nm.space.xl }}>
          <FilterRow group="game" items={GAMES} value={game} onChange={setGame} />
          <FilterRow group="period" items={PERIODS} value={period} onChange={setPeriod} />
        </div>

        {/* Podium */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: nm.space.lg, minHeight: 300, marginBottom: nm.space.xl }}>
          <AnimatePresence mode="wait">
            {rows && podium[1] && <WantedPoster key={`2-${podium[1].uid}`} p={podium[1]} place={2} />}
            {rows && podium[0] && <WantedPoster key={`1-${podium[0].uid}`} p={podium[0]} place={1} />}
            {rows && podium[2] && <WantedPoster key={`3-${podium[2].uid}`} p={podium[2]} place={3} />}
            {!rows && <PodiumSkeleton />}
          </AnimatePresence>
        </div>

        {/* Reste du classement */}
        <div style={{
          borderRadius: nm.radius.lg, overflow: 'hidden',
          background: 'rgba(6,20,31,0.55)', border: `1px solid ${nm.color.mist}`,
        }}>
          {!rows ? (
            <div style={{ padding: nm.space.lg }}><ListSkeleton /></div>
          ) : rest.map((p, i) => (
            <motion.div key={p.uid}
              initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
              style={{
                display: 'flex', alignItems: 'center', gap: nm.space.md,
                padding: `${nm.space.sm} ${nm.space.lg}`,
                borderTop: i === 0 ? 'none' : `1px solid ${nm.color.mist}`,
              }}>
              <span style={{ width: 28, textAlign: 'center', fontWeight: 800, color: nm.color.foamDim }}>{p.rank || i + 4}</span>
              <Avatar p={p} size={40} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: nm.color.foam, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                {p.elo != null && <div style={{ ...nm.type.small, color: nm.color.foamDim }}>ELO {p.elo} · {p.wins}V / {p.losses}D</div>}
              </div>
              <span style={{ ...nm.type.bounty, fontSize: '1.1rem', color: nm.color.goldHi }}>{formatBounty(p.bounty)}</span>
            </motion.div>
          ))}
        </div>

        <div style={{ textAlign: 'center', marginTop: nm.space.lg }}>
          <Link to="/nouveau-monde" style={{ ...nm.type.button, color: nm.color.foamDim, textDecoration: 'none' }}>← Retour à la carte</Link>
        </div>
      </div>
    </div>
  )
}

function FilterRow({ group, items, value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 4, padding: 4, borderRadius: nm.radius.pill, background: 'rgba(6,20,31,0.5)', border: `1px solid ${nm.color.mist}`, flexWrap: 'wrap' }}>
      {items.map((it) => {
        const active = value === it.id
        return (
          <button key={it.id} type="button" onClick={() => onChange(it.id)}
            style={{
              position: 'relative', cursor: 'pointer', minHeight: 32, padding: '7px 14px',
              borderRadius: nm.radius.pill, border: 'none', background: 'transparent',
              ...nm.type.button, color: active ? nm.color.abyss : nm.color.foam,
            }}>
            {active && (
              <motion.span layoutId={`filter-${group}`}
                transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                style={{ position: 'absolute', inset: 0, borderRadius: nm.radius.pill, background: `linear-gradient(135deg, ${nm.color.goldHi}, ${nm.color.gold})`, zIndex: -1 }} />
            )}
            <span style={{ position: 'relative' }}>{it.label}</span>
          </button>
        )
      })}
    </div>
  )
}

function PodiumSkeleton() {
  return (
    <>
      {[2, 1, 3].map((pl) => (
        <motion.div key={pl} animate={{ opacity: [0.4, 0.7, 0.4] }} transition={{ duration: 1.2, repeat: Infinity }}
          style={{ width: pl === 1 ? 220 : 180, height: pl === 1 ? 280 : 240, borderRadius: nm.radius.sm, background: 'rgba(231,214,173,0.15)' }} />
      ))}
    </>
  )
}
function ListSkeleton() {
  return (
    <div style={{ display: 'grid', gap: 10 }}>
      {Array.from({ length: 6 }).map((_, i) => (
        <motion.div key={i} animate={{ opacity: [0.35, 0.7, 0.35] }} transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.08 }}
          style={{ height: 44, borderRadius: nm.radius.md, background: 'rgba(234,243,244,0.06)' }} />
      ))}
    </div>
  )
}
