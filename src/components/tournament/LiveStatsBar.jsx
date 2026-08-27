import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { fetchVoiceLive } from '../../lib/hubLive.js'
import { fetchRecentTournamentRooms } from '../../lib/tournamentRooms.js'

// Bandeau de stats du hub. Deux sources, et rien d'autre :
//   • local  — duels tranchés et votes, relus depuis lib/tournamentStats
//   • Supabase — membres en vocal (RPC voice_live) et salons multi ouverts
// Une valeur qu'on ne sait pas mesurer n'est pas affichée : pas de compteur
// décoratif qui monte tout seul.

const CSS = `
  @keyframes lsSheen { 0%{transform:translateX(-120%)} 55%{transform:translateX(220%)} 100%{transform:translateX(220%)} }
  @keyframes lsDot   { 0%,100%{opacity:.35; transform:scale(.85)} 50%{opacity:1; transform:scale(1.15)} }
  @keyframes lsHalo  { 0%,100%{opacity:.35} 50%{opacity:.8} }
  @media (prefers-reduced-motion: reduce){ [data-lsfx]{animation:none!important} }
`

// Compteur qui monte à l'apparition. Sous prefers-reduced-motion la valeur
// s'affiche directement : c'est le chiffre qui compte, pas l'effet.
function Odometer({ value = 0, duration = 900 }) {
  const [shown, setShown] = useState(0)
  const fromRef = useRef(0)

  useEffect(() => {
    const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const from = fromRef.current
    fromRef.current = value
    if (reduced || from === value) { setShown(value); return }
    let raf = 0
    const t0 = performance.now()
    function tick(now) {
      const p = Math.min(1, (now - t0) / duration)
      // easeOutCubic : démarrage franc, arrivée douce sur le chiffre final.
      const e = 1 - Math.pow(1 - p, 3)
      setShown(Math.round(from + (value - from) * e))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value, duration])

  return <>{shown.toLocaleString('fr-FR')}</>
}

function Stat({ label, value, suffix, accent, live, index, hint }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ delay: index * 0.06, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      style={{
        position: 'relative', overflow: 'hidden',
        flex: '1 1 150px', minWidth: 132,
        padding: '16px 18px 14px', borderRadius: 14,
        background: 'linear-gradient(150deg,' + accent + '14 0%, rgba(10,10,11,.92) 100%)',
        border: '1px solid ' + accent + '26',
        borderTop: '2px solid ' + accent + 'aa',
      }}
    >
      <div data-lsfx style={{
        position: 'absolute', top: 0, bottom: 0, width: '38%',
        background: 'linear-gradient(100deg, transparent, rgba(255,255,255,.06), transparent)',
        animation: 'lsSheen 7s ease-in-out infinite', pointerEvents: 'none',
      }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        {live && (
          <span data-lsfx style={{
            width: 6, height: 6, borderRadius: '50%', background: accent,
            boxShadow: '0 0 8px ' + accent, animation: 'lsDot 1.6s ease-in-out infinite',
          }} />
        )}
        <span style={{
          fontSize: 8, fontWeight: 800, letterSpacing: '.14em', textTransform: 'uppercase',
          color: 'rgba(255,255,255,.34)',
        }}>
          {label}
        </span>
      </div>
      <div style={{
        fontFamily: "'Pirata One',cursive", fontSize: 30, lineHeight: 1,
        color: 'rgba(255,255,255,.94)',
        textShadow: '0 0 22px ' + accent + '66',
      }}>
        {typeof value === 'number' ? <Odometer value={value} /> : value}
        {suffix && <span style={{ fontSize: 14, color: accent, marginLeft: 3 }}>{suffix}</span>}
      </div>
      {hint && (
        <div style={{ fontSize: 9, color: 'rgba(255,255,255,.24)', marginTop: 6, lineHeight: 1.4 }}>
          {hint}
        </div>
      )}
    </motion.div>
  )
}

export default function LiveStatsBar({ stats, accentA = '#e85aa0', accentB = '#9d5aff' }) {
  const [voice, setVoice] = useState(null)
  const [rooms, setRooms] = useState(null)

  // Les deux compteurs réseau sont optionnels : si Supabase ne répond pas, la
  // tuile disparaît au lieu d'afficher un zéro mensonger.
  useEffect(() => {
    let alive = true
    async function pull() {
      try {
        const v = await fetchVoiceLive()
        if (alive) setVoice(typeof v?.count === 'number' ? v.count : null)
      } catch { if (alive) setVoice(null) }
      try {
        const r = await fetchRecentTournamentRooms(12)
        if (alive) setRooms(Array.isArray(r) ? r.length : null)
      } catch { if (alive) setRooms(null) }
    }
    pull()
    const t = setInterval(pull, 60000)
    return () => { alive = false; clearInterval(t) }
  }, [])

  const hottestLabel = stats.hottest
    ? (stats.hottest.config.categoryLabel || stats.hottest.config.title)
    : '—'

  const tiles = [
    { label: 'Duels tranchés', value: stats.matchesDone, accent: accentA, hint: 'sur ' + stats.matchesTotal + ' possibles' },
    { label: 'Votes déposés',  value: stats.votes,       accent: accentB, hint: 'toutes arènes confondues' },
    { label: 'Arènes lancées', value: stats.started, suffix: '/' + stats.arenas, accent: '#f59e0b', hint: stats.finished + ' terminée' + (stats.finished > 1 ? 's' : '') },
    { label: 'Arène la plus chaude', value: hottestLabel, accent: '#22d3ee', hint: stats.hottest ? stats.hottest.progress.done + ' duels joués' : 'aucun duel pour l’instant' },
  ]
  if (voice !== null) tiles.push({ label: 'En vocal', value: voice, accent: '#22c55e', live: true, hint: 'membres connectés' })
  if (rooms !== null) tiles.push({ label: 'Salons multi', value: rooms, accent: '#a78bfa', live: true, hint: 'parties récentes' })

  return (
    <div style={{ position: 'relative', marginBottom: 64 }}>
      <style>{CSS}</style>
      <div data-lsfx style={{
        position: 'absolute', inset: '-30px -10px', pointerEvents: 'none',
        background: 'radial-gradient(ellipse 70% 120% at 50% 50%, ' + accentA + '12 0%, transparent 70%)',
        animation: 'lsHalo 7s ease-in-out infinite',
      }} />
      <div style={{ position: 'relative', display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        {tiles.map((t, i) => <Stat key={t.label} index={i} {...t} />)}
      </div>
    </div>
  )
}
