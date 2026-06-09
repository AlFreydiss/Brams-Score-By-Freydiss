import { useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import SakuraBackdrop from './SakuraBackdrop.jsx'
import {
  loadState, getTournamentProgress, getCurrentMatch,
  generateBracket, getWinner,
} from '../lib/tournament.js'
import { TOURNAMENT_CONFIG, OPENING_TOURNAMENT_CONFIG, ENDING_TOURNAMENT_CONFIG } from '../data/tournament-data.js'
import {
  TOURNAMENT_CATEGORIES,
  UPCOMING_TOURNAMENTS,
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
  @keyframes htFloat   { 0%{transform:translateY(8px) translateX(0);opacity:0} 12%{opacity:.45} 88%{opacity:.32} 100%{transform:translateY(-90px) translateX(14px);opacity:0} }
  @keyframes arenaGridMove { from{background-position:0 0} to{background-position:0 72px} }
  @keyframes arenaAura     { 0%,100%{opacity:.9; transform:scale(1)} 50%{opacity:1; transform:scale(1.05)} }
  @keyframes arenaEmber    { 0%{transform:translateY(0) translateX(0);opacity:0} 10%{opacity:.8} 85%{opacity:.5} 100%{transform:translateY(-96vh) translateX(24px);opacity:0} }
  @keyframes arenaHorizon  { 0%,100%{opacity:.55} 50%{opacity:.95} }
  @keyframes arenaSweep    { 0%{transform:translateX(-60%) rotate(8deg);opacity:0} 35%{opacity:.5} 70%{opacity:0} 100%{transform:translateX(120%) rotate(8deg);opacity:0} }
  .arena-grid {
    position:absolute; left:-40%; right:-40%; bottom:-18%; height:72%;
    background-image:
      linear-gradient(rgba(232,90,160,.42) 1.4px, transparent 1.4px),
      linear-gradient(90deg, rgba(150,90,255,.34) 1.4px, transparent 1.4px);
    background-size:72px 72px;
    transform:perspective(520px) rotateX(60deg); transform-origin:bottom center;
    -webkit-mask-image:linear-gradient(to top,#000 8%, transparent 82%);
    mask-image:linear-gradient(to top,#000 8%, transparent 82%);
    animation:arenaGridMove 6s linear infinite;
  }
  /* Ligne d'horizon lumineuse (là où la grille rencontre le ciel) */
  .arena-horizon {
    position:absolute; left:0; right:0; bottom:36%; height:2px;
    background:linear-gradient(90deg, transparent, rgba(232,90,160,.9) 35%, rgba(150,90,255,.9) 65%, transparent);
    box-shadow:0 0 30px 6px rgba(232,90,160,.35), 0 0 60px 14px rgba(150,90,255,.22);
    animation:arenaHorizon 4.5s ease-in-out infinite;
  }
  /* Balayage de lumière diagonal */
  .arena-sweep {
    position:absolute; top:-20%; left:0; width:55%; height:140%;
    background:linear-gradient(100deg, transparent, rgba(232,90,160,.10) 45%, rgba(150,90,255,.07) 55%, transparent);
    filter:blur(8px); animation:arenaSweep 9s ease-in-out infinite;
  }
  .arena-grain {
    background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  }
  @media (prefers-reduced-motion: reduce){ [data-fx]{animation:none!important} .arena-grid{animation:none!important} }
`

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

// ── Fond « arène » épique mais sobre : auras maîtrisées + sol en perspective
// (grille qui défile) + embers + vignette + grain. Glow contrôlé (pas de RGB abusé).
function ArenaBackdrop() {
  const embers = useMemo(() => Array.from({ length: 16 }, (_, i) => ({
    x: (i * 53.3 + 9) % 96, dur: 9 + (i * 0.73) % 7, del: (i * 1.31) % 9,
    size: i % 3 === 0 ? 3 : 2, gold: i % 4 === 0,
  })), [])
  return (
    <div aria-hidden style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      {/* Base + auras (magenta au sommet, violet sur les flancs) — plus marquées */}
      <div data-fx style={{
        position: 'absolute', inset: 0, animation: 'arenaAura 10s ease-in-out infinite',
        background:
          'radial-gradient(ellipse 70% 55% at 50% -6%, rgba(196,40,110,.42) 0%, transparent 58%),' +
          'radial-gradient(ellipse 60% 60% at 100% 18%, rgba(140,80,255,.28) 0%, transparent 60%),' +
          'radial-gradient(ellipse 62% 66% at 0% 82%, rgba(196,40,110,.22) 0%, transparent 60%),' +
          'linear-gradient(180deg, #0c0612 0%, #090410 55%, #050308 100%)',
      }} />
      {/* Balayage de lumière + sol en perspective + horizon lumineux = arène */}
      <div data-fx className="arena-sweep" />
      <div data-fx className="arena-grid" />
      <div data-fx className="arena-horizon" />
      {/* Embers montants raffinés */}
      {embers.map((e, i) => (
        <div key={i} data-fx style={{
          position: 'absolute', left: `${e.x}%`, bottom: -12, width: e.size, height: e.size, borderRadius: '50%',
          background: e.gold ? 'rgba(249,168,212,.7)' : 'rgba(157,23,77,.6)',
          boxShadow: `0 0 6px ${e.gold ? 'rgba(249,168,212,.5)' : 'rgba(157,23,77,.45)'}`,
          animation: `arenaEmber ${e.dur}s ${e.del}s linear infinite`,
        }} />
      ))}
      {/* Vignette pour la profondeur */}
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 96% 86% at 50% 38%, transparent 47%, rgba(0,0,0,.62) 100%)' }} />
      {/* Grain fin */}
      <div className="arena-grain" style={{ position: 'absolute', inset: 0, opacity: 0.075, mixBlendMode: 'overlay' }} />
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

  return (
    <div style={{ minHeight: '100vh', background: BG, fontFamily: 'inherit', position: 'relative', overflowX: 'hidden' }}>
      <style>{HUB_CSS}</style>

      {/* Fond arène épique (auras + balayage + sol perspective + horizon + embers + grain) */}
      <ArenaBackdrop />
      {/* Pétales sakura par-dessus (remis à la demande) — touche communautaire */}
      <SakuraBackdrop count={22} />

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
              {TOURNAMENT_CATEGORIES.filter(c => c.status === 'active' && c.id !== 'ost').map((cat, i) => (
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

        </div>
      </div>
    </div>
  )
}
