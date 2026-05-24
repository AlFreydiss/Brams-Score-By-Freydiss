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

const BG    = '#07090e'
const GOLD  = '#d4a017'
const GOLD2 = '#f0c040'

// ── Hook: live OST tournament state from localStorage ──────────────────────
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
function SectionHeading({ title, subtitle, id }) {
  return (
    <div id={id} style={{ marginBottom: 28 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: subtitle ? 10 : 0 }}>
        <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,.06)' }} />
        <h2 style={{
          fontSize: 13, fontWeight: 700,
          color: 'rgba(255,255,255,.38)',
          letterSpacing: '0.14em', textTransform: 'uppercase',
          margin: 0, flexShrink: 0,
        }}>
          {title}
        </h2>
        <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,.06)' }} />
      </div>
      {subtitle && (
        <p style={{
          textAlign: 'center', fontSize: 14,
          color: 'rgba(255,255,255,.28)', margin: '8px 0 0',
          lineHeight: 1.5,
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
    active:  { bg: 'rgba(212,160,23,.14)', border: 'rgba(212,160,23,.35)', color: GOLD,                   label: 'En cours' },
    soon:    { bg: 'rgba(255,255,255,.05)', border: 'rgba(255,255,255,.12)', color: 'rgba(255,255,255,.38)', label: 'Bientôt' },
    testing: { bg: 'rgba(99,102,241,.12)', border: 'rgba(99,102,241,.3)',  color: '#a5b4fc',              label: 'En test' },
  }
  const s = styles[status] || styles.soon
  return (
    <span style={{
      fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
      padding: '3px 9px', borderRadius: 6,
      background: s.bg, border: `1px solid ${s.border}`, color: s.color,
    }}>
      {s.label}
    </span>
  )
}

// ── Category card ──────────────────────────────────────────────────────────
function CategoryCard({ cat, index }) {
  const navigate    = useNavigate()
  const isActive    = cat.status === 'active'
  const borderColor = isActive ? 'rgba(212,160,23,.2)' : 'rgba(255,255,255,.07)'

  function handleClick() {
    if (isActive && cat.route) navigate(cat.route)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.3 }}
      onClick={handleClick}
      style={{
        borderRadius: 16,
        border: `1px solid ${borderColor}`,
        background: isActive ? 'rgba(212,160,23,.03)' : 'rgba(255,255,255,.025)',
        padding: '22px 22px 20px',
        cursor: isActive ? 'pointer' : 'default',
        opacity: isActive ? 1 : 0.65,
        display: 'flex', flexDirection: 'column', gap: 12,
        transition: 'all 0.22s',
        position: 'relative', overflow: 'hidden',
      }}
      whileHover={isActive ? {
        borderColor: 'rgba(212,160,23,.35)',
        background: 'rgba(212,160,23,.055)',
        y: -2,
      } : {}}
    >
      {/* Left accent bar */}
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0, width: 3,
        background: isActive ? cat.color : 'rgba(255,255,255,.08)',
        borderRadius: '16px 0 0 16px',
      }} />

      {/* Top row: icon + status */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingLeft: 8 }}>
        <div style={{
          fontSize: 22,
          color: isActive ? cat.color : 'rgba(255,255,255,.3)',
          lineHeight: 1,
          filter: isActive ? `drop-shadow(0 0 8px ${cat.color}50)` : 'none',
        }}>
          {cat.icon}
        </div>
        <StatusBadge status={cat.status} />
      </div>

      {/* Content */}
      <div style={{ paddingLeft: 8 }}>
        <div style={{
          fontSize: 16, fontWeight: 700,
          color: isActive ? 'rgba(255,255,255,.92)' : 'rgba(255,255,255,.55)',
          marginBottom: 6, lineHeight: 1.2,
        }}>
          {cat.label}
        </div>
        <div style={{
          fontSize: 12, color: 'rgba(255,255,255,.32)',
          lineHeight: 1.55,
        }}>
          {cat.description}
        </div>
      </div>

      {/* Footer */}
      <div style={{
        paddingLeft: 8,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginTop: 'auto',
      }}>
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,.22)', letterSpacing: '0.06em' }}>
          {isActive ? `${cat.activeCount} tournoi actif` : 'Aucun tournoi actif'}
        </span>
        {isActive && (
          <span style={{ fontSize: 11, color: GOLD, fontWeight: 700, letterSpacing: '0.04em' }}>
            Entrer →
          </span>
        )}
      </div>
    </motion.div>
  )
}

// ── Active tournament card ─────────────────────────────────────────────────
function ActiveTournamentCard({ config, progress, currentRound, winner }) {
  const navigate   = useNavigate()
  const phaseName  = winner ? 'Terminé' : currentRound?.label ?? 'En cours'
  const isFinished = !!winner

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        borderRadius: 18,
        border: `1px solid rgba(212,160,23,.22)`,
        background: 'rgba(212,160,23,.04)',
        padding: 'clamp(20px,3vw,32px)',
        position: 'relative', overflow: 'hidden',
      }}
    >
      {/* Background glow */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
        background: 'radial-gradient(ellipse 60% 80% at 15% 50%, rgba(212,160,23,.05) 0%, transparent 60%)',
      }} />

      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'flex-start' }}>

        {/* Left: meta */}
        <div style={{ flex: '1 1 280px', minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
            <StatusBadge status={isFinished ? 'soon' : 'active'} />
            <span style={{
              fontSize: 9, color: 'rgba(255,255,255,.3)',
              background: 'rgba(255,255,255,.05)',
              border: '1px solid rgba(255,255,255,.08)',
              borderRadius: 6, padding: '3px 9px',
              letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 700,
            }}>
              OST
            </span>
          </div>

          <h3 style={{
            fontSize: 'clamp(20px,3vw,28px)',
            fontWeight: 800, margin: '0 0 6px',
            color: 'rgba(255,255,255,.94)', lineHeight: 1.15,
          }}>
            {config.title}
          </h3>

          <p style={{
            fontSize: 13, color: 'rgba(255,255,255,.38)',
            margin: '0 0 18px', lineHeight: 1.55, maxWidth: 480,
          }}>
            {winner
              ? `${winner.title} remporte le tournoi.`
              : '32 OST cultes. Une seule restera dans le bracket. Vote duel après duel.'}
          </p>

          {/* Stats row */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, marginBottom: 18 }}>
            {[
              { label: 'Participants',  value: config.participants.length },
              { label: 'Matchs joués', value: `${progress.done} / ${progress.total}` },
              { label: 'Phase',         value: phaseName },
              { label: 'Format',        value: 'Élimination' },
            ].map(s => (
              <div key={s.label}>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'rgba(255,255,255,.88)' }}>
                  {s.value}
                </div>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,.28)', letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: 3 }}>
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: progress + CTAs */}
        <div style={{ flex: '0 1 260px', display: 'flex', flexDirection: 'column', gap: 12, justifyContent: 'center' }}>
          {/* Progress bar */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'rgba(255,255,255,.25)', marginBottom: 7, letterSpacing: '0.08em' }}>
              <span>PROGRESSION</span>
              <span>{progress.pct}%</span>
            </div>
            <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,.07)', overflow: 'hidden' }}>
              <motion.div
                initial={false}
                animate={{ width: `${progress.pct}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                style={{ height: '100%', background: `linear-gradient(90deg, ${GOLD}, ${GOLD2})` }}
              />
            </div>
          </div>

          {/* CTAs */}
          {!isFinished ? (
            <>
              <button
                onClick={() => navigate('/tournoi/ost')}
                style={{
                  padding: '12px 0', width: '100%',
                  borderRadius: 12, border: `1px solid ${GOLD}`,
                  background: 'rgba(212,160,23,.12)',
                  color: GOLD, fontWeight: 700, fontSize: 13,
                  cursor: 'pointer', letterSpacing: '0.04em',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(212,160,23,.22)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(212,160,23,.12)'}
              >
                Participer au duel actuel
              </button>
              <button
                onClick={() => navigate('/tournoi/ost')}
                style={{
                  padding: '10px 0', width: '100%',
                  borderRadius: 12, border: '1px solid rgba(255,255,255,.1)',
                  background: 'rgba(255,255,255,.03)',
                  color: 'rgba(255,255,255,.55)', fontWeight: 600, fontSize: 12,
                  cursor: 'pointer', letterSpacing: '0.03em',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,.07)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,.03)'}
              >
                Voir le bracket
              </button>
            </>
          ) : (
            <button
              onClick={() => navigate('/tournoi/ost')}
              style={{
                padding: '12px 0', width: '100%',
                borderRadius: 12, border: '1px solid rgba(255,255,255,.12)',
                background: 'rgba(255,255,255,.04)',
                color: 'rgba(255,255,255,.55)', fontWeight: 600, fontSize: 13,
                cursor: 'pointer', letterSpacing: '0.03em',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,.08)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,.04)'}
            >
              Voir les résultats
            </button>
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
      transition={{ delay: index * 0.05 }}
      style={{
        borderRadius: 14,
        border: '1px solid rgba(255,255,255,.07)',
        background: 'rgba(255,255,255,.025)',
        padding: '20px 20px 18px',
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
            fontSize: 9, color: 'rgba(255,255,255,.3)',
            background: 'rgba(255,255,255,.05)',
            border: '1px solid rgba(255,255,255,.08)',
            borderRadius: 5, padding: '2px 8px',
            letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 700,
          }}>
            {cat?.label ?? item.categoryId}
          </span>
        </div>
        <span style={{
          fontSize: 9, color: 'rgba(255,255,255,.25)',
          letterSpacing: '0.06em', textTransform: 'uppercase',
        }}>
          {item.dateLabel}
        </span>
      </div>

      <div>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,.75)', marginBottom: 5, lineHeight: 1.2 }}>
          {item.title}
        </div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,.28)', lineHeight: 1.5 }}>
          {item.description}
        </div>
      </div>

      <button
        style={{
          padding: '8px 14px',
          borderRadius: 9, border: '1px solid rgba(255,255,255,.1)',
          background: 'transparent',
          color: 'rgba(255,255,255,.3)', fontSize: 11, fontWeight: 600,
          cursor: 'not-allowed', letterSpacing: '0.03em',
          alignSelf: 'flex-start',
        }}
      >
        Bientôt disponible
      </button>
    </motion.div>
  )
}

// ── Hero ───────────────────────────────────────────────────────────────────
function TournamentHero({ activeRef, categoriesRef }) {
  function scrollTo(ref) {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div style={{
      position: 'relative',
      textAlign: 'center',
      padding: 'clamp(48px,8vw,100px) 0 clamp(48px,6vw,72px)',
    }}>
      {/* Atmospheric glow */}
      <div style={{
        position: 'absolute', inset: '-80px -200px 0', zIndex: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 80% 100% at 50% 0%, rgba(212,160,23,.08) 0%, transparent 55%)',
      }} />

      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Badge */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 7,
          background: 'rgba(212,160,23,.08)', border: '1px solid rgba(212,160,23,.2)',
          borderRadius: 20, padding: '5px 16px', marginBottom: 20,
        }}>
          <span style={{ fontSize: 8, color: GOLD, letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 700 }}>
            ✦ Événements communautaires
          </span>
        </div>

        {/* Title */}
        <h1 style={{
          fontSize: 'clamp(44px,8vw,96px)',
          fontWeight: 900, margin: '0 0 16px',
          background: `linear-gradient(135deg, ${GOLD2} 0%, ${GOLD} 50%, rgba(191,164,106,.72) 100%)`,
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          letterSpacing: '-0.025em', lineHeight: 0.95,
        }}>
          Tournois Brams
        </h1>

        {/* Tagline */}
        <p style={{
          fontSize: 'clamp(16px,2.5vw,22px)',
          color: 'rgba(255,255,255,.72)', fontWeight: 500,
          margin: '0 0 16px', letterSpacing: '-0.005em',
        }}>
          Chaque vote fait avancer le bracket.
        </p>

        {/* Description */}
        <p style={{
          fontSize: 14, color: 'rgba(255,255,255,.35)',
          margin: '0 0 36px', maxWidth: 580, marginInline: 'auto',
          lineHeight: 1.7,
        }}>
          Openings, OST, personnages, théories ou wiki battles : choisis ton tournoi et fais gagner tes favoris avec la communauté.
        </p>

        {/* CTAs */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 28 }}>
          <button
            onClick={() => scrollTo(activeRef)}
            style={{
              padding: '13px 32px', borderRadius: 12,
              border: `1px solid ${GOLD}`,
              background: 'rgba(212,160,23,.12)',
              color: GOLD, fontWeight: 700, fontSize: 14,
              cursor: 'pointer', letterSpacing: '0.03em',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(212,160,23,.22)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(212,160,23,.12)'}
          >
            Voir les tournois actifs
          </button>
          <button
            onClick={() => scrollTo(categoriesRef)}
            style={{
              padding: '13px 32px', borderRadius: 12,
              border: '1px solid rgba(255,255,255,.12)',
              background: 'rgba(255,255,255,.04)',
              color: 'rgba(255,255,255,.62)', fontWeight: 600, fontSize: 14,
              cursor: 'pointer', letterSpacing: '0.03em',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,.08)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,.04)'}
          >
            Explorer les catégories
          </button>
        </div>

        {/* Microcopy */}
        <div style={{
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          gap: 8, flexWrap: 'wrap',
        }}>
          {['Votes communautaires', 'Bracket', 'Résultats', 'Récompenses en berries'].map((item, i, arr) => (
            <span key={item} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,.22)', letterSpacing: '0.04em' }}>
                {item}
              </span>
              {i < arr.length - 1 && (
                <span style={{ fontSize: 8, color: 'rgba(255,255,255,.15)' }}>•</span>
              )}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────
export default function TournamentHubPage() {
  const ost          = useOSTState()
  const activeRef    = useRef(null)
  const categoriesRef = useRef(null)

  return (
    <div style={{ minHeight: '100vh', background: BG, fontFamily: 'inherit' }}>
      <div style={{
        maxWidth: 1440,
        margin: '0 auto',
        padding: '0 clamp(16px,4vw,56px) 96px',
      }}>

        {/* Hero */}
        <TournamentHero activeRef={activeRef} categoriesRef={categoriesRef} />

        {/* ── Catégories ── */}
        <div ref={categoriesRef} style={{ marginBottom: 72 }}>
          <SectionHeading
            title="Choisis ton arène"
            subtitle="Chaque catégorie est un format de tournoi distinct. OST, openings, personnages, théories et plus encore."
          />
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))',
            gap: 14,
          }}>
            {TOURNAMENT_CATEGORIES.map((cat, i) => (
              <CategoryCard key={cat.id} cat={cat} index={i} />
            ))}
          </div>
        </div>

        {/* ── Tournois actifs ── */}
        <div ref={activeRef} style={{ marginBottom: 72 }}>
          <SectionHeading title="Tournois actifs" />
          <ActiveTournamentCard
            config={TOURNAMENT_CONFIG}
            progress={ost.progress}
            currentRound={ost.currentRound}
            winner={ost.winner}
          />
        </div>

        {/* ── À venir ── */}
        <div style={{ marginBottom: 72 }}>
          <SectionHeading
            title="À venir"
            subtitle="Les prochains tournois sont en préparation. Suis les annonces sur Brams."
          />
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: 12,
          }}>
            {UPCOMING_TOURNAMENTS.map((item, i) => (
              <UpcomingCard key={item.id} item={item} index={i} />
            ))}
          </div>
        </div>

        {/* ── Archives (si tournois terminés) ── */}
        {COMPLETED_TOURNAMENTS.length === 0 ? (
          <div style={{ marginBottom: 40 }}>
            <SectionHeading title="Archives" />
            <div style={{
              textAlign: 'center', padding: '40px 20px',
              border: '1px solid rgba(255,255,255,.06)',
              borderRadius: 14,
              background: 'rgba(255,255,255,.018)',
            }}>
              <div style={{ fontSize: 28, marginBottom: 10, opacity: 0.2 }}>◎</div>
              <div style={{ fontSize: 14, color: 'rgba(255,255,255,.25)' }}>
                Aucun tournoi archivé pour l'instant.
              </div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,.15)', marginTop: 6 }}>
                Les tournois terminés apparaîtront ici avec leurs résultats.
              </div>
            </div>
          </div>
        ) : (
          <div style={{ marginBottom: 40 }}>
            <SectionHeading title="Archives" />
            {/* Completed tournament cards will render here */}
          </div>
        )}

      </div>
    </div>
  )
}
