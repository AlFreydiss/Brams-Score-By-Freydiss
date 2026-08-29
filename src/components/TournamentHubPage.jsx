import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { DUR, EASE } from '../lib/motion.js'
import SakuraBackdrop from './SakuraBackdrop.jsx'
import ArenaBackdrop from './tournament/ArenaBackdrop.jsx'
import LiveStatsBar from './tournament/LiveStatsBar.jsx'
import DailyDuel from './tournament/DailyDuel.jsx'
import HallOfChampions from './tournament/HallOfChampions.jsx'
import GameModesShowcase from './tournament/GameModesShowcase.jsx'
import { readAll, globalStats, championsBoard } from '../lib/tournamentStats.js'
import { TOURNAMENT_CONFIG, OPENING_TOURNAMENT_CONFIG, ENDING_TOURNAMENT_CONFIG, RAP_VS_OST_CONFIG, RAP_FR_CONFIG, OST_ANIME_CONFIG } from '../data/tournament-data.js'
import {
  TOURNAMENT_CATEGORIES,
  UPCOMING_TOURNAMENTS,
} from '../data/tournament-hub-data.js'

// Accents de l'arène : fond, sections et cartes tirent tous d'ici pour que le
// hub parle d'une seule palette.
const ACCENT_A = '#e85aa0'
const ACCENT_B = '#9d5aff'

// Ordre d'affichage des tournois actifs — et source unique des agrégats du hub
// (stats, podium), pour ne pas relire six fois le même localStorage.
const ACTIVE_CONFIGS = [
  RAP_VS_OST_CONFIG,
  RAP_FR_CONFIG,
  OST_ANIME_CONFIG,
  OPENING_TOURNAMENT_CONFIG,
  ENDING_TOURNAMENT_CONFIG,
  TOURNAMENT_CONFIG,
]

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
  @keyframes htPulse   { 0%,100%{opacity:.5} 50%{opacity:.85} }
  @keyframes htShine   { 0%,72%{background-position:120% 50%} 100%{background-position:-20% 50%} }

  /* Tournois actifs. Sur grand écran, une grille. Sur téléphone, les six
     cartes empilées faisaient 3800 px à elles seules — 43 % de la page — et
     enterraient tout ce qui suit. Elles passent donc en rail horizontal avec
     accroche : une carte par écran, on glisse. */
  .ht-actifs {
    display:grid; gap:14px;
    grid-template-columns:repeat(auto-fit, minmax(280px, 1fr));
  }
  @media (max-width: 760px) {
    .ht-actifs {
      display:flex; grid-template-columns:none;
      overflow-x:auto; overscroll-behavior-x:contain;
      scroll-snap-type:x mandatory;
      /* Le débord sert de marge : la carte suivante dépasse, ce qui montre
         qu'on peut glisser sans avoir à l'écrire. */
      margin-inline:calc(-1 * clamp(16px,4vw,56px));
      padding-inline:clamp(16px,4vw,56px);
      scrollbar-width:none;
    }
    .ht-actifs::-webkit-scrollbar { display:none }
    .ht-actifs > * {
      flex:0 0 86%; scroll-snap-align:center; min-width:0;
    }
  }
  .ht-swipe { display:none }
  @media (max-width: 760px) { .ht-swipe { display:block } }

  /* Reflet du titre : une bande claire glisse dans le dégradé de chaque lettre.
     Le décalage lettre par lettre (animationDelay en JS) donne l'impression
     d'une lumière qui traverse le mot, et comme c'est le background de la
     lettre elle-même, ça reste rogné aux glyphes. */
  .ht-letter {
    background:linear-gradient(100deg,
      #f9a8d4 0%, #db2777 26%, #ffffff 42%, #f9a8d4 54%, #db2777 70%, #4c1d95 100%);
    background-size:340% 100%;
    background-position:120% 50%;
    -webkit-background-clip:text; background-clip:text;
    -webkit-text-fill-color:transparent; color:transparent;
    animation:htShine 6s ease-in-out infinite;
  }
  /* Anneau de focus : les cartes navigables sont atteignables au clavier, il
     faut donc voir où on est. Un outline seul se perd sur fond sombre, d'où le
     halo qui l'accompagne. */
  [data-tkcard]:focus-visible {
    outline:2px solid #f9a8d4; outline-offset:3px;
    box-shadow:0 0 0 6px rgba(249,168,212,.16) !important;
  }
  @media (prefers-reduced-motion: reduce){ [data-fx]{animation:none!important} .ht-letter{animation:none!important;background-position:50% 50%!important} }
`

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

  // Position du curseur dans la carte, pour le halo qui le suit.
  const [spot, setSpot] = useState(null)

  function handleClick() {
    if (isActive && cat.route) navigate(cat.route)
  }
  function handleKeyDown(e) {
    if (!isActive) return
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleClick() }
  }
  function handleMove(e) {
    if (!isActive) return
    const r = e.currentTarget.getBoundingClientRect()
    setSpot({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 })
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -8% 0px' }}
      transition={{ delay: index * 0.045, duration: DUR.slow, ease: EASE.out }}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onMouseMove={handleMove}
      onMouseLeave={() => setSpot(null)}
      // Une carte qui navigue doit être atteignable au clavier : sans ça, la
      // moitié des arènes du hub était inaccessible sans souris.
      role={isActive ? 'button' : undefined}
      tabIndex={isActive ? 0 : undefined}
      data-tkcard={isActive ? '' : undefined}
      aria-label={isActive ? `Ouvrir l'arène ${cat.label}` : undefined}
      whileHover={isActive ? {
        y: -3,
        transition: { duration: 0.18 },
      } : {}}
      style={{
        background: `linear-gradient(145deg,${cat.color}16 0%,rgba(10,10,11,0.97) 100%)`,
        border: `1px solid ${cat.color}${spot ? '5c' : '22'}`,
        borderTop: `2px solid ${isActive ? cat.color + 'cc' : 'rgba(255,255,255,.10)'}`,
        borderRadius: 14,
        padding: '20px 20px 18px',
        cursor: isActive ? 'pointer' : 'default',
        opacity: isActive ? 1 : 0.62,
        display: 'flex', flexDirection: 'column', gap: 10,
        position: 'relative', overflow: 'hidden',
        outline: 'none',
        boxShadow: spot ? `0 14px 40px rgba(0,0,0,.45), 0 0 30px ${cat.color}26` : 'none',
        transition: 'border-color .2s, box-shadow .25s',
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

      {/* Halo qui suit le curseur */}
      {spot && (
        <div aria-hidden style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: `radial-gradient(220px circle at ${spot.x}% ${spot.y}%, ${cat.color}2e 0%, transparent 62%)`,
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
// Affiche du duel ouvert : deux titres et un VS, avec les couleurs des deux
// participants. C'est la seule chose de la carte qui change entre deux visites,
// donc elle passe devant les compteurs.
function CurrentDuelStrip({ match }) {
  if (!match || !match.left || !match.right) return null
  const l = match.left, r = match.right
  const cl = l.color || PINK, cr = r.color || PURPLE

  return (
    <div style={{
      display: 'flex', alignItems: 'stretch', gap: 8, margin: '0 0 20px',
      borderRadius: 12, overflow: 'hidden',
      border: '1px solid rgba(255,255,255,.07)',
      background: 'linear-gradient(90deg,' + cl + '1a, rgba(0,0,0,.2) 45%, rgba(0,0,0,.2) 55%,' + cr + '1a)',
    }}>
      <div style={{ flex: 1, minWidth: 0, padding: '11px 13px' }}>
        <div style={{ fontSize: 7.5, letterSpacing: '.14em', color: cl, fontWeight: 800, marginBottom: 3 }}>
          EN LICE
        </div>
        <div style={{
          fontSize: 12, color: 'rgba(255,255,255,.82)', fontWeight: 700,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {l.title}
        </div>
      </div>
      <div style={{
        flexShrink: 0, alignSelf: 'center', padding: '0 4px',
        fontFamily: "'Pirata One',cursive", fontSize: 15, color: 'rgba(255,255,255,.5)',
      }}>
        VS
      </div>
      <div style={{ flex: 1, minWidth: 0, padding: '11px 13px', textAlign: 'right' }}>
        <div style={{ fontSize: 7.5, letterSpacing: '.14em', color: cr, fontWeight: 800, marginBottom: 3 }}>
          EN LICE
        </div>
        <div style={{
          fontSize: 12, color: 'rgba(255,255,255,.82)', fontWeight: 700,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {r.title}
        </div>
      </div>
    </div>
  )
}

function ActiveTournamentCard({ config, progress, currentRound, currentMatch, winner }) {
  const navigate  = useNavigate()
  const route = config.route || '/tournoi/ost'
  const phaseName = winner ? 'Terminé' : currentRound?.label ?? 'En cours'
  const isFinished = !!winner

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -8% 0px' }}
      transition={{ duration: DUR.slow, ease: EASE.out }}
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

          {/* Affiche du duel ouvert */}
          {!isFinished && <CurrentDuelStrip match={currentMatch} />}

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
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -8% 0px' }}
      transition={{ delay: index * 0.05, duration: DUR.base, ease: EASE.out }}
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

// ── Titre du hero ──────────────────────────────────────────────────────────
// Les lettres tombent une à une, puis un balayage de lumière traverse le mot.
// Le titre reste UN seul <h1> pour les lecteurs d'écran : les lettres sont des
// <span aria-hidden> et le texte complet est porté par aria-label.
function HeroTitle({ text }) {
  const letters = useMemo(() => text.split(''), [text])
  return (
    // Bloc : les lettres sont en inline-block, et sans ça le titre remonterait
    // sur la ligne du badge qui le précède.
    <h1
      aria-label={text}
      style={{
        display: 'block',
        fontFamily: "'Pirata One',cursive",
        fontSize: 'clamp(56px,10vw,110px)',
        fontWeight: 900, margin: '0 0 16px',
        letterSpacing: '-0.01em', lineHeight: 0.95,
      }}
    >
      {letters.map((ch, i) => (
        <motion.span
          key={i}
          aria-hidden
          className="ht-letter"
          initial={{ opacity: 0, y: 26, rotateX: -55 }}
          animate={{ opacity: 1, y: 0, rotateX: 0 }}
          transition={{ delay: 0.06 + i * 0.035, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          style={{
            display: 'inline-block',
            whiteSpace: ch === ' ' ? 'pre' : 'normal',
            transformOrigin: 'bottom center',
            // Le reflet vit DANS le dégradé de chaque lettre et se décale de
            // proche en proche : il traverse le mot en restant rogné aux
            // glyphes. Un calque posé par-dessus s'afficherait en rectangle,
            // car le background-clip d'un parent ne rogne pas ses enfants.
            animationDelay: (i * 0.07) + 's',
          }}
        >
          {ch === ' ' ? ' ' : ch}
        </motion.span>
      ))}
    </h1>
  )
}

// ── Bandeau live du hero ───────────────────────────────────────────────────
// Dit ce qui se joue en ce moment sur l'arène la plus avancée. S'il n'y a
// aucun duel ouvert, la ligne disparaît plutôt que d'annoncer du vide.
function HeroTicker({ read }) {
  if (!read || !read.currentMatch) return null
  const left  = read.currentMatch.left
  const right = read.currentMatch.right
  if (!left || !right) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.55, duration: 0.4 }}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
        justifyContent: 'center', marginBottom: 26,
        padding: '8px 18px', borderRadius: 100,
        background: 'rgba(255,255,255,.03)',
        border: '1px solid rgba(255,255,255,.08)',
        maxWidth: '100%',
      }}
    >
      <span data-fx style={{
        width: 6, height: 6, borderRadius: '50%', background: ACCENT_A,
        boxShadow: '0 0 8px ' + ACCENT_A, animation: 'htPulse 1.6s ease-in-out infinite', flexShrink: 0,
      }} />
      <span style={{
        fontSize: 9, fontWeight: 800, letterSpacing: '.14em', textTransform: 'uppercase',
        color: 'rgba(255,255,255,.34)', flexShrink: 0,
      }}>
        {read.config.categoryLabel || 'Tournoi'} · {read.currentRound?.label || 'En cours'}
      </span>
      <span style={{ fontSize: 12, color: 'rgba(255,255,255,.62)' }}>
        {left.title}
        <span style={{ color: ACCENT_A, margin: '0 7px', fontWeight: 800 }}>vs</span>
        {right.title}
      </span>
    </motion.div>
  )
}

// ── Hero ───────────────────────────────────────────────────────────────────
function TournamentHero({ activeRef, categoriesRef, duelRef, ticker }) {
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

      {/* Titre : lettres révélées une à une, puis balayage de lumière */}
      <HeroTitle text="Tournois Brams" />

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

      {/* Ce qui se joue en ce moment */}
      <HeroTicker read={ticker} />

      {/* CTAs */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.34 }}
        style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 30 }}
      >
        <motion.button
          onClick={() => scrollTo(duelRef)}
          whileHover={{ scale: 1.04, boxShadow: `0 10px 32px rgba(232,90,160,.42)` }}
          whileTap={{ scale: 0.97 }}
          style={{
            padding: '14px 36px', borderRadius: 100,
            border: 'none',
            background: `linear-gradient(135deg, ${ACCENT_A}, #f06cb5 55%, ${ACCENT_B})`,
            color: '#1a0011', fontWeight: 800, fontSize: 14,
            cursor: 'pointer', letterSpacing: '0.04em',
            fontFamily: "'Pirata One',cursive",
            boxShadow: `0 6px 24px rgba(232,90,160,.3)`,
          }}
        >
          ⚡ Duel du jour
        </motion.button>
        <motion.button
          onClick={() => scrollTo(activeRef)}
          whileHover={{ scale: 1.04, boxShadow: `0 10px 32px rgba(157,23,77,.38)` }}
          whileTap={{ scale: 0.97 }}
          style={{
            padding: '14px 36px', borderRadius: 100,
            border: `1px solid ${GOLD}66`,
            background: 'rgba(157,23,77,.14)',
            color: '#f9a8d4', fontWeight: 800, fontSize: 14,
            cursor: 'pointer', letterSpacing: '0.04em',
            fontFamily: "'Pirata One',cursive",
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
  // Une seule lecture de l'état local pour tout le hub : les cartes de tournoi,
  // le bandeau de stats et le podium partent des mêmes chiffres.
  const reads   = useMemo(() => readAll(ACTIVE_CONFIGS), [])
  const stats   = useMemo(() => globalStats(reads), [reads])
  const podium  = useMemo(() => championsBoard(reads, 3), [reads])

  const activeRef     = useRef(null)
  const categoriesRef = useRef(null)
  const duelRef       = useRef(null)

  return (
    <div style={{ minHeight: '100vh', background: BG, fontFamily: 'inherit', position: 'relative', overflowX: 'hidden' }}>
      <style>{HUB_CSS}</style>

      {/* Fond arène : ciel, projecteurs et sol néon en parallaxe + champ
          d'énergie interactif au curseur */}
      <ArenaBackdrop accentA={ACCENT_A} accentB={ACCENT_B} />
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
          <TournamentHero
            activeRef={activeRef}
            categoriesRef={categoriesRef}
            duelRef={duelRef}
            ticker={stats.hottest || reads.find(r => r.currentMatch) || null}
          />

          {/* ── Stats du hub ── */}
          <LiveStatsBar stats={stats} accentA={ACCENT_A} accentB={ACCENT_B} />

          {/* ── Arène du jour : 5 duels seedés sur la date ── */}
          <div ref={duelRef}>
            <DailyDuel accentA={ACCENT_A} accentB={ACCENT_B} />
          </div>

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
            <div className="ht-swipe" style={{
              fontSize: 10, color: 'rgba(255,255,255,.26)', letterSpacing: '.08em',
              textAlign: 'center', margin: '-14px 0 14px',
            }}>
              {reads.length} arènes — glisse pour les parcourir →
            </div>
            <div className="ht-actifs">
              {reads.map(r => (
                <ActiveTournamentCard
                  key={r.id}
                  config={r.config}
                  progress={r.progress}
                  currentRound={r.currentRound}
                  currentMatch={r.currentMatch}
                  winner={r.winner}
                />
              ))}
            </div>
          </div>

          {/* ── Prochainement ──
              UpcomingCard et UPCOMING_TOURNAMENTS existaient déjà mais rien ne
              les rendait : trois tournois annoncés dormaient dans les données. */}
          {UPCOMING_TOURNAMENTS.length > 0 && (
            <div style={{ marginBottom: 76 }}>
              <SectionHeading
                title="Prochainement"
                subtitle="Les prochaines arènes à ouvrir. Elles arrivent avec la communauté."
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
          )}

          {/* ── Podium ── */}
          <HallOfChampions board={podium} accentA={ACCENT_A} accentB={ACCENT_B} />

          {/* ── Modes de jeu (Doublage, Plus vieux/Plus récent, Sakuga) ── */}
          <GameModesShowcase accentA={ACCENT_A} accentB={ACCENT_B} />

        </div>
      </div>
    </div>
  )
}
