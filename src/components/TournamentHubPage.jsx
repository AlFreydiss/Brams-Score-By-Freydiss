import { useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  loadState, getTournamentProgress, getCurrentMatch,
  generateBracket, getWinner,
} from '../lib/tournament.js'
import { TOURNAMENT_CONFIG, OPENING_TOURNAMENT_CONFIG, ENDING_TOURNAMENT_CONFIG } from '../data/tournament-data.js'
import {
  TOURNAMENT_CATEGORIES,
  UPCOMING_TOURNAMENTS,
  COMPLETED_TOURNAMENTS,
} from '../data/tournament-hub-data.js'

const BG      = '#0a0a0b'
const PINK    = '#9d174d'   // rose sombre
const PURPLE  = '#4c1d95'   // violet sombre
const PINK_L  = '#db2777'   // rose moyen (text mid)
const PINK_LL = '#f9a8d4'   // rose clair (text start)
const GRAD    = `linear-gradient(135deg, ${PINK}, ${PURPLE})`
const GRAD_TXT = `linear-gradient(135deg, ${PINK_LL} 0%, ${PINK_L} 45%, ${PURPLE} 100%)`
const GOLD  = PINK
const GOLD2 = PINK_LL

const HUB_CSS = `
  @keyframes htTwinkle { 0%,100%{opacity:.07} 50%{opacity:.50} }
  @keyframes htScan    { 0%{top:-2px} 100%{top:100%} }
  @keyframes htPulse   { 0%,100%{opacity:.5} 50%{opacity:.85} }
  /* Pétales de sakura qui tombent (chute + balancement + rotation) */
  @keyframes htFall { 0%{transform:translateY(-10vh) rotate(0deg);opacity:0} 8%{opacity:.95} 90%{opacity:.85} 100%{transform:translateY(110vh) rotate(420deg);opacity:0} }
  @keyframes htSway { 0%,100%{margin-left:-18px} 50%{margin-left:18px} }
  @keyframes htBreathe { 0%,100%{opacity:.05} 50%{opacity:.10} }
  @media (prefers-reduced-motion: reduce){ [data-fx]{animation:none!important} }
`

// Motif de fleurs de sakura (data-URI SVG) — texture de fond discrète façon Undercover.
const SAKURA_URI = `data:image/svg+xml,${encodeURIComponent(`
<svg xmlns='http://www.w3.org/2000/svg' width='90' height='90' viewBox='0 0 80 80'>
  <g fill='#f472b6' opacity='0.9'>
    <ellipse cx='40' cy='22' rx='8' ry='15' transform='rotate(0 40 40)'/>
    <ellipse cx='40' cy='22' rx='8' ry='15' transform='rotate(72 40 40)'/>
    <ellipse cx='40' cy='22' rx='8' ry='15' transform='rotate(144 40 40)'/>
    <ellipse cx='40' cy='22' rx='8' ry='15' transform='rotate(216 40 40)'/>
    <ellipse cx='40' cy='22' rx='8' ry='15' transform='rotate(288 40 40)'/>
    <circle cx='40' cy='40' r='5' fill='#fbcfe8'/>
  </g>
</svg>`)}`

// ── Pétales de sakura / roses (fond façon Undercover) ──────────────────────
function HTSakura() {
  const petals = useMemo(() => Array.from({ length: 22 }, (_, i) => ({
    x:    (i * 41.7 + 5) % 99,
    size: 9 + (i % 4) * 4,                 // 9–21 px
    dur:  9 + (i % 6) * 2.5,               // 9–22 s
    del:  -(i * 1.3) % 14,                 // démarrage étalé (négatif = déjà en cours)
    sway: 5.5 + (i % 4) * 1.6,
    col:  ['#f9a8d4', '#f472b6', '#ec4899', '#fbcfe8'][i % 4],
  })), [])
  return (
    <div aria-hidden style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 1, overflow: 'hidden' }}>
      {petals.map((p, i) => (
        <div key={i} data-fx style={{
          position: 'absolute', left: `${p.x}%`, top: 0,
          animation: `htFall ${p.dur}s ${p.del}s linear infinite`,
          willChange: 'transform',
        }}>
          <div data-fx style={{
            width: p.size, height: p.size * 0.82,
            background: `radial-gradient(circle at 30% 30%, ${p.col}, ${p.col}99)`,
            borderRadius: '150% 0 150% 0',
            transform: 'rotate(35deg)',
            boxShadow: `0 0 6px ${p.col}55`,
            opacity: 0.85,
            animation: `htSway ${p.sway}s ease-in-out infinite`,
          }} />
        </div>
      ))}
    </div>
  )
}

// ── Ambient background ─────────────────────────────────────────────────────
function HTStars() {
  const stars = useMemo(() => Array.from({ length: 55 }, (_, i) => ({
    x: (i * 39.1 + 7) % 98, y: (i * 43.7 + 13) % 96,
    size: i % 9 === 0 ? 2.5 : i % 4 === 0 ? 1.6 : 1,
    dur: 2.8 + (i * 0.28) % 4.5, del: (i * 0.21) % 7,
    gold: i % 13 === 0,
  })), [])
  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 1 }}>
      {stars.map((s, i) => (
        <div key={i} style={{
          position: 'absolute', left: `${s.x}%`, top: `${s.y}%`,
          width: s.size, height: s.size, borderRadius: '50%',
          background: s.gold ? 'rgba(157,23,77,.55)' : 'rgba(255,255,255,.4)',
          animation: `htTwinkle ${s.dur}s ${s.del}s ease-in-out infinite`,
        }} />
      ))}
    </div>
  )
}

function HTScanLine() {
  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 1, overflow: 'hidden' }}>
      <div style={{
        position: 'absolute', left: 0, right: 0, height: 2,
        background: 'linear-gradient(90deg,transparent,rgba(157,23,77,.10),rgba(76,29,149,.14),rgba(157,23,77,.10),transparent)',
        animation: 'htScan 18s linear infinite',
      }} />
    </div>
  )
}

// ── Hook: live tournament state ─────────────────────────────────────────────
function useTournamentState(config) {
  return useMemo(() => {
    const saved  = loadState(config.id)
    const rounds = saved || generateBracket(config.participants).rounds
    return {
      progress:     getTournamentProgress(rounds),
      currentRound: getCurrentMatch(rounds)?.round ?? null,
      winner:       getWinner(rounds),
    }
  }, [config])
}

// ── Section heading ────────────────────────────────────────────────────────
function SectionHeading({ title, subtitle }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: subtitle ? 10 : 0 }}>
        <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,.06)' }} />
        <h2 style={{
          fontSize: 11, fontWeight: 800,
          color: 'rgba(255,255,255,.32)',
          letterSpacing: '0.18em', textTransform: 'uppercase',
          margin: 0, flexShrink: 0,
        }}>
          {title}
        </h2>
        <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,.06)' }} />
      </div>
      {subtitle && (
        <p style={{
          textAlign: 'center', fontSize: 13,
          color: 'rgba(255,255,255,.25)', margin: '8px 0 0',
          lineHeight: 1.6,
        }}>
          {subtitle}
        </p>
      )}
    </div>
  )
}

// ── Status badge ───────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const styles = {
    active:  { bg: 'rgba(157,23,77,.14)', border: 'rgba(157,23,77,.35)', color: GOLD,                   label: 'En cours' },
    soon:    { bg: 'rgba(255,255,255,.05)', border: 'rgba(255,255,255,.10)', color: 'rgba(255,255,255,.32)', label: 'Bientôt' },
    testing: { bg: 'rgba(99,102,241,.12)', border: 'rgba(99,102,241,.3)',  color: '#a5b4fc',              label: 'En test' },
  }
  const s = styles[status] || styles.soon
  return (
    <span style={{
      fontSize: 8, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase',
      padding: '3px 10px', borderRadius: 6,
      background: s.bg, border: `1px solid ${s.border}`, color: s.color,
    }}>
      {s.label}
    </span>
  )
}

// ── Category card — BlindTest track card style ─────────────────────────────
function CategoryCard({ cat, index }) {
  const navigate = useNavigate()
  const isActive = cat.status === 'active'

  function handleClick() {
    if (isActive && cat.route) navigate(cat.route)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.045, duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      onClick={handleClick}
      whileHover={isActive ? {
        y: -3,
        transition: { duration: 0.18 },
      } : {}}
      style={{
        background: `linear-gradient(145deg,${cat.color}16 0%,rgba(10,10,11,0.97) 100%)`,
        border: `1px solid ${cat.color}22`,
        borderTop: `2px solid ${isActive ? cat.color + 'cc' : 'rgba(255,255,255,.10)'}`,
        borderRadius: 14,
        padding: '20px 20px 18px',
        cursor: isActive ? 'pointer' : 'default',
        opacity: isActive ? 1 : 0.62,
        display: 'flex', flexDirection: 'column', gap: 10,
        position: 'relative', overflow: 'hidden',
        transition: 'border-color 0.2s',
      }}
    >
      {/* Ambient glow */}
      {isActive && (
        <div style={{
          position: 'absolute', top: -20, left: -20, right: -20,
          height: 60, pointerEvents: 'none',
          background: `radial-gradient(ellipse 80% 100% at 50% 0%, ${cat.color}18 0%, transparent 70%)`,
        }} />
      )}

      {/* Top row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative', zIndex: 1 }}>
        <div style={{
          fontSize: 20, lineHeight: 1,
          color: isActive ? cat.color : 'rgba(255,255,255,.28)',
          filter: isActive ? `drop-shadow(0 0 10px ${cat.color}88)` : 'none',
          animation: isActive ? 'htPulse 3s ease-in-out infinite' : 'none',
        }}>
          {cat.icon}
        </div>
        <StatusBadge status={cat.status} />
      </div>

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{
          fontSize: 8, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase',
          color: isActive ? cat.color : 'rgba(255,255,255,.2)',
          marginBottom: 6,
        }}>
          {cat.tagline}
        </div>
        <div style={{
          fontSize: 16, fontWeight: 800,
          color: isActive ? 'rgba(255,255,255,.92)' : 'rgba(255,255,255,.48)',
          marginBottom: 7, lineHeight: 1.2,
        }}>
          {cat.label}
        </div>
        <div style={{
          fontSize: 11, color: 'rgba(255,255,255,.28)',
          lineHeight: 1.55,
        }}>
          {cat.description}
        </div>
      </div>

      {/* Footer */}
      <div style={{
        position: 'relative', zIndex: 1,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginTop: 'auto', paddingTop: 6,
        borderTop: `1px solid ${isActive ? cat.color + '20' : 'rgba(255,255,255,.06)'}`,
      }}>
        <span style={{ fontSize: 9, color: 'rgba(255,255,255,.20)', letterSpacing: '0.06em' }}>
          {isActive ? `${cat.activeCount} tournoi actif` : 'Aucun tournoi actif'}
        </span>
        {isActive && (
          <span style={{ fontSize: 11, color: cat.color, fontWeight: 800, letterSpacing: '0.04em' }}>
            Entrer →
          </span>
        )}
      </div>
    </motion.div>
  )
}

// ── Progress ring ──────────────────────────────────────────────────────────
function ProgressRing({ pct }) {
  const R = 28, STROKE = 3
  const C = 2 * Math.PI * R
  const dash = C * (1 - pct / 100)
  return (
    <div style={{ position: 'relative', width: 70, height: 70, flexShrink: 0 }}>
      <svg width="70" height="70" style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)' }}>
        <defs>
          <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={PINK} />
            <stop offset="100%" stopColor={PURPLE} />
          </linearGradient>
        </defs>
        <circle cx="35" cy="35" r={R} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={STROKE} />
        <motion.circle
          cx="35" cy="35" r={R} fill="none"
          stroke="url(#ringGrad)" strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={C}
          animate={{ strokeDashoffset: dash }}
          transition={{ duration: 1, ease: 'easeOut' }}
          style={{ filter: `drop-shadow(0 0 6px ${PINK}88)` }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ fontFamily: "'Pirata One',cursive", fontSize: 18, fontWeight: 900, color: GOLD2, lineHeight: 1 }}>
          {pct}
        </span>
        <span style={{ fontSize: 7, fontWeight: 800, letterSpacing: '.12em', color: 'rgba(255,255,255,.3)', textTransform: 'uppercase', marginTop: 1 }}>%</span>
      </div>
    </div>
  )
}

// ── Active tournament card ─────────────────────────────────────────────────
function ActiveTournamentCard({ config, progress, currentRound, winner }) {
  const navigate  = useNavigate()
  const route = config.route || '/tournoi/ost'
  const phaseName = winner ? 'Terminé' : currentRound?.label ?? 'En cours'
  const isFinished = !!winner

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      style={{
        background: `linear-gradient(145deg, rgba(157,23,77,.07) 0%, rgba(10,10,11,0.97) 100%)`,
        border: '1px solid rgba(157,23,77,.18)',
        borderTop: `2px solid ${GOLD}99`,
        borderRadius: 18,
        padding: 'clamp(20px,3vw,36px)',
        position: 'relative', overflow: 'hidden',
      }}
    >
      {/* Top ambient */}
      <div style={{
        position: 'absolute', top: -30, left: -30, right: -30, height: 100,
        background: `radial-gradient(ellipse 70% 100% at 50% 0%, rgba(157,23,77,.10) 0%, transparent 70%)`,
        pointerEvents: 'none',
      }} />

      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexWrap: 'wrap', gap: 28, alignItems: 'flex-start' }}>

        {/* Left */}
        <div style={{ flex: '1 1 280px', minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
            <StatusBadge status={isFinished ? 'soon' : 'active'} />
            <span style={{
              fontSize: 8, color: 'rgba(255,255,255,.28)',
              background: 'rgba(255,255,255,.04)',
              border: '1px solid rgba(255,255,255,.08)',
              borderRadius: 5, padding: '3px 9px',
              letterSpacing: '0.10em', textTransform: 'uppercase', fontWeight: 800,
            }}>
              {config.categoryLabel || 'Tournoi'}
            </span>
          </div>

          <h3 style={{
            fontFamily: "'Pirata One',cursive",
            fontSize: 'clamp(22px,3.5vw,34px)',
            fontWeight: 900, margin: '0 0 8px',
            color: 'rgba(255,255,255,.94)', lineHeight: 1.1,
          }}>
            {config.title}
          </h3>

          <p style={{
            fontSize: 13, color: 'rgba(255,255,255,.35)',
            margin: '0 0 22px', lineHeight: 1.6, maxWidth: 480,
          }}>
            {winner
              ? `${winner.title} remporte le tournoi.`
              : config.description}
          </p>

          {/* Stats */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18 }}>
            {[
              { label: 'Participants',  value: config.participants.length },
              { label: 'Matchs joués', value: `${progress.done}/${progress.total}` },
              { label: 'Phase',         value: phaseName },
              { label: 'Format',        value: 'Élimination' },
            ].map(s => (
              <div key={s.label} style={{
                padding: '10px 18px', borderRadius: 10,
                background: 'rgba(255,255,255,.04)',
                border: '1px solid rgba(255,255,255,.07)',
                textAlign: 'center',
              }}>
                <div style={{
                  fontFamily: "'Pirata One',cursive",
                  fontSize: 20, fontWeight: 900,
                  color: 'rgba(255,255,255,.88)', lineHeight: 1,
                }}>
                  {s.value}
                </div>
                <div style={{ fontSize: 8, color: 'rgba(255,255,255,.28)', letterSpacing: '0.10em', textTransform: 'uppercase', marginTop: 4 }}>
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: ring + CTAs */}
        <div style={{ flex: '0 1 220px', display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center', justifyContent: 'center' }}>
          <ProgressRing pct={progress.pct} />

          {!isFinished ? (
            <>
              <motion.button
                onClick={() => navigate(route)}
                whileHover={{ scale: 1.03, boxShadow: `0 8px 28px rgba(157,23,77,.32)` }}
                whileTap={{ scale: 0.97 }}
                style={{
                  width: '100%', padding: '13px 0',
                  borderRadius: 12, border: 'none',
                  background: GRAD,
                  color: '#fff', fontWeight: 800, fontSize: 14,
                  cursor: 'pointer', letterSpacing: '0.03em',
                  fontFamily: "'Pirata One',cursive",
                }}
              >
                Participer au duel
              </motion.button>
              <motion.button
                onClick={() => navigate(route)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                style={{
                  width: '100%', padding: '11px 0',
                  borderRadius: 12, border: '1px solid rgba(255,255,255,.10)',
                  background: 'rgba(255,255,255,.03)',
                  color: 'rgba(255,255,255,.50)', fontWeight: 700, fontSize: 12,
                  cursor: 'pointer', letterSpacing: '0.03em',
                }}
              >
                Voir le bracket
              </motion.button>
            </>
          ) : (
            <motion.button
              onClick={() => navigate(route)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              style={{
                width: '100%', padding: '13px 0',
                borderRadius: 12, border: '1px solid rgba(255,255,255,.12)',
                background: 'rgba(255,255,255,.04)',
                color: 'rgba(255,255,255,.55)', fontWeight: 700, fontSize: 13,
                cursor: 'pointer',
              }}
            >
              Voir les résultats
            </motion.button>
          )}
        </div>
      </div>
    </motion.div>
  )
}

// ── Archive card — tournoi terminé : champion + accès à la page de victoire ──
function ArchiveCard({ config, winner, index }) {
  const navigate = useNavigate()
  const route = config.route || '/tournoi/ost'
  const ytOk  = winner?.ytId && !String(winner.ytId).startsWith('similar')
  const thumb = ytOk ? `https://img.youtube.com/vi/${winner.ytId}/hqdefault.jpg` : null
  const accent = winner?.color || GOLD
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
      onClick={() => navigate(route)}
      whileHover={{ y: -3, transition: { duration: 0.18 } }}
      style={{
        background: `linear-gradient(145deg, ${accent}14 0%, rgba(10,10,11,0.97) 100%)`,
        border: `1px solid ${accent}28`,
        borderTop: `2px solid ${GOLD}99`,
        borderRadius: 14, padding: '18px 20px 16px',
        cursor: 'pointer', position: 'relative', overflow: 'hidden',
        display: 'flex', flexDirection: 'column', gap: 12,
      }}
    >
      <div style={{ position: 'absolute', top: -24, left: -24, right: -24, height: 70, pointerEvents: 'none', background: `radial-gradient(ellipse 80% 100% at 50% 0%, ${accent}1c 0%, transparent 70%)` }} />
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <StatusBadge status="soon" />
        <span style={{ fontSize: 8, color: 'rgba(255,255,255,.28)', background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 5, padding: '3px 9px', letterSpacing: '0.10em', textTransform: 'uppercase', fontWeight: 800 }}>
          {config.categoryLabel || 'Tournoi'}
        </span>
      </div>
      <h3 style={{ position: 'relative', zIndex: 1, fontFamily: "'Pirata One',cursive", fontSize: 20, fontWeight: 900, margin: 0, color: 'rgba(255,255,255,.92)', lineHeight: 1.1 }}>
        {config.title}
      </h3>
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 12, background: 'rgba(255,255,255,.03)', border: `1px solid ${GOLD}22` }}>
        {thumb
          ? <img src={thumb} alt="" style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
          : <div style={{ width: 48, height: 48, borderRadius: 8, flexShrink: 0, display: 'grid', placeItems: 'center', fontSize: 22, background: `${accent}22` }}>👑</div>}
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 8, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: GOLD, marginBottom: 3 }}>Champion 👑</div>
          <div style={{ fontSize: 14, fontWeight: 800, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{winner.title}</div>
          {winner.anime && <div style={{ fontSize: 11, color: 'rgba(255,255,255,.4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{winner.anime}</div>}
        </div>
      </div>
      <button onClick={(e) => { e.stopPropagation(); navigate(route) }}
        style={{ position: 'relative', zIndex: 1, width: '100%', padding: '10px 0', borderRadius: 10, border: '1px solid rgba(255,255,255,.12)', background: 'rgba(255,255,255,.04)', color: 'rgba(255,255,255,.6)', fontWeight: 700, fontSize: 12.5, cursor: 'pointer', fontFamily: 'inherit' }}>
        Voir le vainqueur →
      </button>
    </motion.div>
  )
}

// ── Upcoming card ──────────────────────────────────────────────────────────
function UpcomingCard({ item, index }) {
  const cat = TOURNAMENT_CATEGORIES.find(c => c.id === item.categoryId)

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      style={{
        background: `linear-gradient(145deg, ${cat?.color ?? '#fff'}0c 0%, rgba(10,10,11,.97) 100%)`,
        border: `1px solid ${cat?.color ?? '#fff'}18`,
        borderTop: `2px solid rgba(255,255,255,.10)`,
        borderRadius: 14,
        padding: '18px 20px 16px',
        display: 'flex', flexDirection: 'column', gap: 10,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {cat && (
            <span style={{ fontSize: 14, color: cat.color ?? 'rgba(255,255,255,.3)' }}>
              {cat.icon}
            </span>
          )}
          <span style={{
            fontSize: 8, color: 'rgba(255,255,255,.28)',
            background: 'rgba(255,255,255,.04)',
            border: '1px solid rgba(255,255,255,.08)',
            borderRadius: 5, padding: '2px 8px',
            letterSpacing: '0.10em', textTransform: 'uppercase', fontWeight: 800,
          }}>
            {cat?.label ?? item.categoryId}
          </span>
        </div>
        <span style={{ fontSize: 9, color: 'rgba(255,255,255,.22)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          {item.dateLabel}
        </span>
      </div>

      <div>
        <div style={{ fontSize: 14, fontWeight: 800, color: 'rgba(255,255,255,.72)', marginBottom: 5, lineHeight: 1.2 }}>
          {item.title}
        </div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,.26)', lineHeight: 1.55 }}>
          {item.description}
        </div>
      </div>

      <span style={{
        fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,.25)',
        background: 'rgba(255,255,255,.04)',
        border: '1px solid rgba(255,255,255,.08)',
        borderRadius: 8, padding: '5px 12px',
        letterSpacing: '0.06em', textTransform: 'uppercase',
        alignSelf: 'flex-start',
      }}>
        Bientôt disponible
      </span>
    </motion.div>
  )
}

// ── Hero ───────────────────────────────────────────────────────────────────
function TournamentHero({ activeRef, categoriesRef }) {
  const navigate = useNavigate()
  function scrollTo(ref) {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div style={{ textAlign: 'center', padding: 'clamp(56px,9vw,110px) 0 clamp(48px,6vw,72px)' }}>
      {/* Badge */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: 'rgba(157,23,77,.08)', border: '1px solid rgba(157,23,77,.26)',
          borderRadius: 100, padding: '5px 18px', marginBottom: 22,
        }}
      >
        <span style={{ fontSize: 8, color: GOLD, letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 800 }}>
          ✦ Événements communautaires
        </span>
      </motion.div>

      {/* Pirata One title */}
      <motion.h1
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        style={{
          fontFamily: "'Pirata One',cursive",
          fontSize: 'clamp(56px,10vw,110px)',
          fontWeight: 900, margin: '0 0 16px',
          background: GRAD_TXT,
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          letterSpacing: '-0.01em', lineHeight: 0.95,
        }}
      >
        Tournois Brams
      </motion.h1>

      {/* Tagline */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        style={{
          fontSize: 'clamp(15px,2.2vw,20px)',
          color: 'rgba(255,255,255,.65)', fontWeight: 500,
          margin: '0 0 14px', letterSpacing: '-0.005em',
        }}
      >
        Chaque vote fait avancer le bracket.
      </motion.p>

      {/* Description */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.28 }}
        style={{
          fontSize: 13, color: 'rgba(255,255,255,.30)',
          margin: '0 0 38px', maxWidth: 560, marginInline: 'auto',
          lineHeight: 1.75,
        }}
      >
        Openings, endings, OST, personnages, théories ou wiki battles — choisis ton tournoi et fais gagner tes favoris avec la communauté.
      </motion.p>

      {/* CTAs */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.34 }}
        style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 30 }}
      >
        <motion.button
          onClick={() => scrollTo(activeRef)}
          whileHover={{ scale: 1.04, boxShadow: `0 10px 32px rgba(157,23,77,.38)` }}
          whileTap={{ scale: 0.97 }}
          style={{
            padding: '14px 36px', borderRadius: 100,
            border: 'none',
            background: `linear-gradient(135deg, ${GOLD}, #f06cb5)`,
            color: '#1a0011', fontWeight: 800, fontSize: 14,
            cursor: 'pointer', letterSpacing: '0.04em',
            fontFamily: "'Pirata One',cursive",
            boxShadow: `0 6px 24px rgba(157,23,77,.24)`,
          }}
        >
          Tournois actifs
        </motion.button>
        <motion.button
          onClick={() => scrollTo(categoriesRef)}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          style={{
            padding: '14px 36px', borderRadius: 100,
            border: '1px solid rgba(255,255,255,.14)',
            background: 'rgba(255,255,255,.04)',
            color: 'rgba(255,255,255,.65)', fontWeight: 700, fontSize: 14,
            cursor: 'pointer', letterSpacing: '0.03em',
          }}
        >
          Explorer les arènes
        </motion.button>
        <motion.button
          onClick={() => navigate('/tournoi/salon')}
          whileHover={{ scale: 1.04, boxShadow: `0 10px 32px rgba(76,29,149,.4)` }}
          whileTap={{ scale: 0.97 }}
          style={{
            padding: '14px 36px', borderRadius: 100,
            border: '1px solid rgba(124,58,237,.45)',
            background: 'linear-gradient(135deg, rgba(124,58,237,.22), rgba(157,23,77,.18))',
            color: '#e9d5ff', fontWeight: 800, fontSize: 14,
            cursor: 'pointer', letterSpacing: '0.03em',
            display: 'inline-flex', alignItems: 'center', gap: 8,
          }}
        >
          🟣 Mode multi — Salon en ligne
        </motion.button>
      </motion.div>

      {/* Microcopy */}
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        {['Votes communautaires', 'Bracket', 'Résultats', 'Récompenses en berries'].map((item, i, arr) => (
          <span key={item} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,.18)', letterSpacing: '0.04em' }}>{item}</span>
            {i < arr.length - 1 && <span style={{ fontSize: 7, color: 'rgba(255,255,255,.12)' }}>•</span>}
          </span>
        ))}
      </div>
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────
export default function TournamentHubPage() {
  const ost           = useTournamentState(TOURNAMENT_CONFIG)
  const opening       = useTournamentState(OPENING_TOURNAMENT_CONFIG)
  const ending        = useTournamentState(ENDING_TOURNAMENT_CONFIG)
  const activeRef     = useRef(null)
  const categoriesRef = useRef(null)

  // Archives = tournois réellement terminés (un vainqueur existe). Le clic mène
  // à la route du tournoi, qui n'affiche que la page de victoire quand il y a un
  // gagnant. Concaténé aux archives statiques éventuelles.
  const archivedTournaments = [
    { config: OPENING_TOURNAMENT_CONFIG, winner: opening.winner },
    { config: ENDING_TOURNAMENT_CONFIG,  winner: ending.winner },
    { config: TOURNAMENT_CONFIG,         winner: ost.winner },
  ].filter(t => t.winner)

  return (
    <div style={{ minHeight: '100vh', background: BG, fontFamily: 'inherit', position: 'relative' }}>
      <style>{HUB_CSS}</style>

      {/* Fixed bg layers */}
      <div style={{ position: 'fixed', inset: 0, background: BG, zIndex: 0 }} />
      {/* Halos roses/violets diffus (ambiance sakura) — plus présents */}
      <div aria-hidden style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', background: `
        radial-gradient(1200px 700px at 80% -10%, rgba(236,72,153,.22), transparent 58%),
        radial-gradient(1000px 600px at 6% 4%, rgba(124,58,237,.18), transparent 60%),
        radial-gradient(820px 820px at 50% 122%, rgba(219,39,119,.14), transparent 60%),
        linear-gradient(180deg, #120710 0%, #0a0a0b 62%, #110714 100%)` }} />
      {/* Texture motif sakura discrète (respire) */}
      <div data-fx aria-hidden style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', opacity: .07, backgroundImage: `url("${SAKURA_URI}")`, backgroundSize: '120px', animation: 'htBreathe 9s ease-in-out infinite' }} />
      <HTStars />
      <HTSakura />
      <HTScanLine />

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 2 }}>
        <div style={{
          maxWidth: 1440,
          margin: '0 auto',
          padding: '0 clamp(16px,4vw,56px) 100px',
        }}>

          {/* Hero */}
          <TournamentHero activeRef={activeRef} categoriesRef={categoriesRef} />

          {/* ── Arènes ── */}
          <div ref={categoriesRef} style={{ marginBottom: 76 }}>
            <SectionHeading
              title="Choisis ton arène"
              subtitle="Chaque catégorie est un format de tournoi distinct. OST, openings, endings, personnages, théories et plus encore."
            />
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: 12,
            }}>
              {TOURNAMENT_CATEGORIES.filter(c => c.status === 'active').map((cat, i) => (
                <CategoryCard key={cat.id} cat={cat} index={i} />
              ))}
            </div>
          </div>

          {/* ── Tournois actifs ── */}
          <div ref={activeRef} style={{ marginBottom: 76 }}>
            <SectionHeading title="Tournois actifs" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
              <ActiveTournamentCard
                config={OPENING_TOURNAMENT_CONFIG}
                progress={opening.progress}
                currentRound={opening.currentRound}
                winner={opening.winner}
              />
              <ActiveTournamentCard
                config={ENDING_TOURNAMENT_CONFIG}
                progress={ending.progress}
                currentRound={ending.currentRound}
                winner={ending.winner}
              />
              <ActiveTournamentCard
                config={TOURNAMENT_CONFIG}
                progress={ost.progress}
                currentRound={ost.currentRound}
                winner={ost.winner}
              />
            </div>
          </div>

          {/* ── À venir ── */}
          <div style={{ marginBottom: 76 }}>
            <SectionHeading
              title="À venir"
              subtitle="Les prochains tournois sont en préparation. Suis les annonces sur Brams."
            />
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(255px, 1fr))',
              gap: 12,
            }}>
              {UPCOMING_TOURNAMENTS.map((item, i) => (
                <UpcomingCard key={item.id} item={item} index={i} />
              ))}
            </div>
          </div>

          {/* ── Archives ── */}
          <div style={{ marginBottom: 40 }}>
            <SectionHeading title="Archives" />
            {archivedTournaments.length === 0 ? (
              <div style={{
                textAlign: 'center', padding: '44px 20px',
                border: '1px solid rgba(255,255,255,.06)',
                borderRadius: 14,
                background: 'rgba(255,255,255,.015)',
              }}>
                <div style={{ fontSize: 30, marginBottom: 12, opacity: 0.18 }}>◎</div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,.22)' }}>
                  Aucun tournoi archivé pour l'instant.
                </div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,.14)', marginTop: 6 }}>
                  Les tournois terminés apparaîtront ici avec leurs résultats.
                </div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
                {archivedTournaments.map((t, i) => (
                  <ArchiveCard key={t.config.id} config={t.config} winner={t.winner} index={i} />
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}
