import { useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  loadState, getTournamentProgress, getCurrentMatch,
  generateBracket, getWinner,
} from '../lib/tournament.js'
import { TOURNAMENT_CONFIG } from '../data/tournament-data.js'
import {
  TOURNAMENT_CATEGORIES,
  UPCOMING_TOURNAMENTS,
  COMPLETED_TOURNAMENTS,
} from '../data/tournament-hub-data.js'

const BG   = '#0a0a0b'
const GOLD  = '#e91e8c'
const GOLD2 = '#f9a8d4'

const HUB_CSS = `
  @keyframes htTwinkle { 0%,100%{opacity:.07} 50%{opacity:.50} }
  @keyframes htScan    { 0%{top:-2px} 100%{top:100%} }
  @keyframes htPulse   { 0%,100%{opacity:.5} 50%{opacity:.85} }
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
          background: s.gold ? 'rgba(233,30,140,.55)' : 'rgba(255,255,255,.4)',
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
        background: 'linear-gradient(90deg,transparent,rgba(233,30,140,.06),rgba(233,30,140,.13),rgba(233,30,140,.06),transparent)',
        animation: 'htScan 18s linear infinite',
      }} />
    </div>
  )
}

// ── Hook: live OST state ────────────────────────────────────────────────────
function useOSTState() {
  return useMemo(() => {
    const saved  = loadState(TOURNAMENT_CONFIG.id)
    const rounds = saved || generateBracket(TOURNAMENT_CONFIG.participants).rounds
    return {
      progress:     getTournamentProgress(rounds),
      currentRound: getCurrentMatch(rounds)?.round ?? null,
      winner:       getWinner(rounds),
    }
  }, [])
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
    active:  { bg: 'rgba(233,30,140,.14)', border: 'rgba(233,30,140,.35)', color: GOLD,                   label: 'En cours' },
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
        <circle cx="35" cy="35" r={R} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={STROKE} />
        <motion.circle
          cx="35" cy="35" r={R} fill="none"
          stroke={GOLD} strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={C}
          animate={{ strokeDashoffset: dash }}
          transition={{ duration: 1, ease: 'easeOut' }}
          style={{ filter: `drop-shadow(0 0 5px ${GOLD}88)` }}
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
  const phaseName = winner ? 'Terminé' : currentRound?.label ?? 'En cours'
  const isFinished = !!winner

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      style={{
        background: `linear-gradient(145deg, rgba(233,30,140,.07) 0%, rgba(10,10,11,0.97) 100%)`,
        border: '1px solid rgba(233,30,140,.18)',
        borderTop: `2px solid ${GOLD}99`,
        borderRadius: 18,
        padding: 'clamp(20px,3vw,36px)',
        position: 'relative', overflow: 'hidden',
      }}
    >
      {/* Top ambient */}
      <div style={{
        position: 'absolute', top: -30, left: -30, right: -30, height: 100,
        background: `radial-gradient(ellipse 70% 100% at 50% 0%, rgba(233,30,140,.10) 0%, transparent 70%)`,
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
              OST
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
                onClick={() => navigate('/tournoi/ost')}
                whileHover={{ scale: 1.03, boxShadow: `0 8px 28px rgba(233,30,140,.32)` }}
                whileTap={{ scale: 0.97 }}
                style={{
                  width: '100%', padding: '13px 0',
                  borderRadius: 12, border: 'none',
                  background: `linear-gradient(135deg, ${GOLD}, #f06cb5)`,
                  color: '#1a0011', fontWeight: 800, fontSize: 14,
                  cursor: 'pointer', letterSpacing: '0.03em',
                  fontFamily: "'Pirata One',cursive",
                }}
              >
                Participer au duel
              </motion.button>
              <motion.button
                onClick={() => navigate('/tournoi/ost')}
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
              onClick={() => navigate('/tournoi/ost')}
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
          background: 'rgba(233,30,140,.08)', border: '1px solid rgba(233,30,140,.26)',
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
          background: `linear-gradient(135deg, ${GOLD2} 0%, ${GOLD} 50%, rgba(191,164,106,.72) 100%)`,
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
        Openings, OST, personnages, théories ou wiki battles — choisis ton tournoi et fais gagner tes favoris avec la communauté.
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
          whileHover={{ scale: 1.04, boxShadow: `0 10px 32px rgba(233,30,140,.38)` }}
          whileTap={{ scale: 0.97 }}
          style={{
            padding: '14px 36px', borderRadius: 100,
            border: 'none',
            background: `linear-gradient(135deg, ${GOLD}, #f06cb5)`,
            color: '#1a0011', fontWeight: 800, fontSize: 14,
            cursor: 'pointer', letterSpacing: '0.04em',
            fontFamily: "'Pirata One',cursive",
            boxShadow: `0 6px 24px rgba(233,30,140,.24)`,
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
  const ost           = useOSTState()
  const activeRef     = useRef(null)
  const categoriesRef = useRef(null)

  return (
    <div style={{ minHeight: '100vh', background: BG, fontFamily: 'inherit', position: 'relative' }}>
      <style>{HUB_CSS}</style>

      {/* Fixed bg layers */}
      <div style={{ position: 'fixed', inset: 0, background: BG, zIndex: 0 }} />
      <HTStars />
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
              subtitle="Chaque catégorie est un format de tournoi distinct. OST, openings, personnages, théories et plus encore."
            />
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: 12,
            }}>
              {TOURNAMENT_CATEGORIES.map((cat, i) => (
                <CategoryCard key={cat.id} cat={cat} index={i} />
              ))}
            </div>
          </div>

          {/* ── Tournois actifs ── */}
          <div ref={activeRef} style={{ marginBottom: 76 }}>
            <SectionHeading title="Tournois actifs" />
            <ActiveTournamentCard
              config={TOURNAMENT_CONFIG}
              progress={ost.progress}
              currentRound={ost.currentRound}
              winner={ost.winner}
            />
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
            {COMPLETED_TOURNAMENTS.length === 0 ? (
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
            ) : null}
          </div>

        </div>
      </div>
    </div>
  )
}
