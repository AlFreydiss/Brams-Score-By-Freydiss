import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence, MotionConfig } from 'framer-motion'
import { DUR, EASE } from '../lib/motion.js'
import HalftoneField, { fx as dotFx } from './versus/HalftoneField.jsx'
import LiveStatsBar from './tournament/LiveStatsBar.jsx'
import DailyDuel from './tournament/DailyDuel.jsx'
import HallOfChampions from './tournament/HallOfChampions.jsx'
import GameModesShowcase from './tournament/GameModesShowcase.jsx'
import { readAll, globalStats, championsBoard } from '../lib/tournamentStats.js'
import { loadOrCreateRounds, voteCurrentMatch } from '../lib/tournament.js'
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

const BG      = '#050505'
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

  /* Anneau de focus : les cartes navigables sont atteignables au clavier, il
     faut donc voir où on est. Un outline seul se perd sur fond sombre, d'où le
     halo qui l'accompagne. */
  [data-tkcard]:focus-visible {
    outline:2px solid #f9a8d4; outline-offset:3px;
    box-shadow:0 0 0 6px rgba(249,168,212,.16) !important;
  }
  /* ── Hero ── une colonne centrée, noir + trame de points (HalftoneField).
     Blanc sur noir ; le rose et le violet ne servent que de repères de camp. */
  .vs-halftone { position:fixed; inset:0; z-index:0; pointer-events:none }
  .ht-hero {
    display:flex; flex-direction:column; align-items:center; text-align:center;
    padding:clamp(64px,8vw,112px) 0 clamp(56px,7vw,88px);
  }
  .ht-kicker {
    display:flex; flex-wrap:wrap; justify-content:center; gap:10px; margin-bottom:20px;
    font-size:11px; font-weight:700; letter-spacing:.18em; text-transform:uppercase;
    color:rgba(255,255,255,.4);
  }
  .ht-sep { opacity:.4 }
  h1.ht-title {
    display:block; margin:0 0 18px;
    font-family:'Archivo','Inter',sans-serif; font-stretch:125%; font-weight:800;
    text-transform:uppercase; color:#f4f2f3;
    font-size:clamp(40px,5.4vw,80px); line-height:.95; letter-spacing:-.02em;
  }
  .ht-word { display:inline-block; white-space:nowrap }
  .ht-lede {
    margin:0 0 clamp(36px,4.4vw,56px);
    font-size:clamp(15px,1.4vw,17px); line-height:1.6; color:rgba(255,255,255,.5);
  }

  .ht-duel { width:100%; max-width:1040px; margin-bottom:clamp(36px,4vw,52px) }
  .ht-duel-head {
    display:flex; align-items:center; justify-content:center; gap:10px; margin-bottom:18px;
    font-size:11px; font-weight:700; letter-spacing:.16em; text-transform:uppercase;
    color:rgba(255,255,255,.55);
  }
  .ht-duel-where { color:rgba(255,255,255,.35); letter-spacing:.12em }
  .ht-live {
    width:6px; height:6px; border-radius:50%; background:#fff;
    animation:htPulse 1.6s ease-in-out infinite;
  }
  .ht-duel-grid {
    position:relative; display:grid; align-items:start;
    grid-template-columns:minmax(0,1fr) 56px minmax(0,1fr);
  }
  .ht-side {
    display:block; width:100%; min-width:0; padding:0; margin:0;
    background:none; border:none; color:inherit; font:inherit;
    cursor:pointer; -webkit-tap-highlight-color:transparent;
  }
  .ht-side:disabled { cursor:default }
  .ht-side:focus-visible { outline:2px solid #fff; outline-offset:5px; border-radius:6px }
  .ht-frame {
    position:relative; aspect-ratio:16 / 9; overflow:hidden; border-radius:6px;
    background:#0c0c0d; box-shadow:inset 0 0 0 1px rgba(255,255,255,.08);
  }
  .ht-side-meta { display:flex; align-items:flex-start; gap:10px; padding-top:14px; text-align:left }
  .ht-side:last-child .ht-side-meta { flex-direction:row-reverse; text-align:right }
  .ht-side-mark { flex:0 0 auto; width:3px; height:30px; border-radius:2px; margin-top:2px }
  .ht-side-title {
    font-size:clamp(14px,1.4vw,17px); font-weight:700; color:#fff;
    white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
  }
  .ht-side-sub {
    margin-top:3px; font-size:12px; color:rgba(255,255,255,.42);
    white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
  }
  /* VS au milieu des images 16:9 : une marge en % se calcule sur la LARGEUR
     du bloc, d'où (largeur - 56) / 2 × 9/16 / 2. */
  .ht-vs-col { align-self:stretch }
  .ht-vs {
    position:absolute; left:50%; top:0;
    width:40px; height:40px; margin-left:-20px; margin-top:calc(14.0625% - 7.875px - 20px);
    border-radius:50%; display:grid; place-items:center;
    background:#000; box-shadow:0 0 0 1px rgba(255,255,255,.18);
    font-family:'Archivo',sans-serif; font-stretch:125%; font-weight:800;
    font-size:11px; letter-spacing:.06em; color:#fff;
  }
  .ht-duel-foot { display:flex; align-items:center; gap:16px; margin-top:22px }
  .ht-bar { flex:1; min-width:0; height:1px; background:rgba(255,255,255,.12); overflow:hidden }
  .ht-bar-fill { height:100%; background:#fff }
  .ht-foot-txt { font-size:11px; color:rgba(255,255,255,.4); white-space:nowrap }
  .ht-foot-txt b { font-weight:600; color:rgba(255,255,255,.75) }

  .ht-ctas { display:flex; flex-wrap:wrap; justify-content:center; gap:10px; margin-bottom:20px }
  .ht-btn {
    padding:13px 28px; border-radius:100px; cursor:pointer;
    font:inherit; font-size:14px; font-weight:700; letter-spacing:.01em;
    transition:transform .25s cubic-bezier(.22,1,.36,1), background-color .25s, border-color .25s, color .25s;
  }
  .ht-btn:active { transform:scale(.97) }
  .ht-btn--main { border:none; background:#f4f2f3; color:#0a0a0b }
  .ht-btn--main:hover { background:#fff; transform:translateY(-1px) }
  .ht-btn--ghost { border:1px solid rgba(255,255,255,.18); background:rgba(0,0,0,.4); color:rgba(255,255,255,.85) }
  .ht-btn--ghost:hover { border-color:rgba(255,255,255,.45); color:#fff }
  .ht-links { display:flex; flex-wrap:wrap; justify-content:center; gap:22px }
  .ht-link-btn {
    padding:4px 0; border:none; background:none; cursor:pointer;
    font:inherit; font-size:12px; font-weight:600; color:rgba(255,255,255,.42);
    border-bottom:1px solid transparent; transition:color .2s, border-color .2s;
  }
  .ht-link-btn:hover { color:#fff; border-bottom-color:rgba(255,255,255,.3) }
  .ht-btn:focus-visible, .ht-link-btn:focus-visible { outline:2px solid #fff; outline-offset:3px }
  @media (max-width: 640px) {
    .ht-duel-head { flex-wrap:wrap; row-gap:6px }
    .ht-duel-head > * { white-space:nowrap }
    .ht-duel-head .ht-sep { display:none }
    .ht-duel-where { flex-basis:100%; text-align:center }
    .ht-duel-grid { grid-template-columns:minmax(0,1fr) 36px minmax(0,1fr) }
    .ht-vs { width:32px; height:32px; margin-left:-16px; margin-top:calc(14.0625% - 5.0625px - 16px); font-size:9px }
    .ht-side-mark { display:none }
    .ht-duel-foot { flex-wrap:wrap; gap:8px 14px }
    .ht-bar { flex-basis:100% }
  }
  @media (max-width: 768px) {
    /* index.css force tous les h1 à 48 px max sur mobile. */
    h1.ht-title { font-size:clamp(34px,10.5vw,52px) !important }
    /* La barre de nav flotte au-dessus du contenu sur téléphone. */
    .ht-hero { padding-top:92px }
  }
  @media (prefers-reduced-motion: reduce){ [data-fx]{animation:none!important} }
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
// Les lettres tombent une à une. Le titre reste UN seul <h1> pour les lecteurs d'écran : les lettres sont des
// <span aria-hidden> et le texte complet est porté par aria-label. Chaque mot
// est un bloc insécable : le retour à la ligne tombe entre deux mots, jamais
// au milieu d'un.
function HeroTitle({ text }) {
  const words = useMemo(() => text.split(' '), [text])
  let n = 0
  return (
    <h1 aria-label={text} className="ht-title">
      {words.map((word, w) => (
        <span key={w} className="ht-word" style={{ marginRight: w < words.length - 1 ? '0.22em' : 0 }}>
          {word.split('').map((ch) => {
            const i = n++
            return (
              <motion.span
                key={i}
                aria-hidden
                initial={{ opacity: 0, y: 26, rotateX: -55 }}
                animate={{ opacity: 1, y: 0, rotateX: 0 }}
                transition={{ delay: 0.06 + i * 0.035, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                style={{ display: 'inline-block', transformOrigin: 'bottom center' }}
              >
                {ch}
              </motion.span>
            )
          })}
        </span>
      ))}
    </h1>
  )
}

// ── Duel jouable du hero ───────────────────────────────────────────────────
// La pièce maîtresse : le duel en cours d'une arène, en grand, et on le
// tranche ici. Survol : la trame de points s'éclaire du côté visé. Clic : le
// camp choisi reste, l'autre s'efface, une onde part du clic dans la trame,
// puis le duel suivant entre par les bords. Le vote passe par le même bracket
// que la page du tournoi (lib/tournament), donc rien n'est perdu ni inventé.

// Miniature YouTube la plus nette disponible. maxresdefault n'existe pas pour
// toutes les vidéos : YouTube renvoie alors une vignette grise de 120 px au
// lieu d'une erreur, d'où le contrôle de largeur au chargement.
function YtImage({ ytId, vivid, state }) {
  const [src, setSrc] = useState('https://i.ytimg.com/vi/' + ytId + '/maxresdefault.jpg')
  return (
    <img
      src={src} alt="" decoding="async" draggable={false}
      onLoad={e => {
        if (e.currentTarget.naturalWidth <= 120 && src.includes('maxres')) {
          setSrc('https://i.ytimg.com/vi/' + ytId + '/hqdefault.jpg')
        }
      }}
      style={{
        position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover',
        // hqdefault (4:3) porte des bandes noires : le zoom les rogne ; la
        // version haute définition est déjà en 16:9.
        transform: (src.includes('hqdefault') ? 'scale(1.34)' : 'scale(1)') + (vivid ? ' scale(1.04)' : ''),
        filter: vivid ? 'none' : state === 'lose' ? 'grayscale(1) brightness(.35)' : 'grayscale(.85) brightness(.62)',
        transition: 'filter .5s ease, transform 1s cubic-bezier(.22,1,.36,1)',
      }}
    />
  )
}

const EASE_OUT = [0.22, 1, 0.36, 1]

// États visuels d'un camp : repos, survolé, gagnant, perdant.
function sideState(side, hovered, picked) {
  if (picked) return picked === side ? 'win' : 'lose'
  if (hovered) return hovered === side ? 'lit' : 'dim'
  return 'rest'
}

const SIDE_ANIM = {
  rest: { opacity: 1,    scale: 1 },
  lit:  { opacity: 1,    scale: 1 },
  dim:  { opacity: 0.55, scale: 0.99 },
  win:  { opacity: 1,    scale: 1.015 },
  lose: { opacity: 0.1,  scale: 0.95 },
}

function DuelSide({ p, side, accent, state, onHover, onPick, disabled }) {
  const vivid = state === 'lit' || state === 'win'
  const sub = p.artist || p.anime || ''
  return (
    <motion.button
      type="button"
      className="ht-side"
      disabled={disabled}
      aria-label={'Voter pour ' + p.title + (sub ? ', ' + sub : '')}
      onMouseEnter={() => onHover(side)}
      onFocus={() => onHover(side)}
      onClick={e => onPick(side, e)}
      initial={{ opacity: 0, x: side === 'left' ? -40 : 40 }}
      animate={{ x: 0, ...SIDE_ANIM[state] }}
      exit={{ opacity: 0, transition: { duration: 0.2 } }}
      transition={{ duration: state === 'lose' ? 0.55 : 0.7, ease: EASE_OUT }}
      style={{ textAlign: side }}
    >
      <div className="ht-frame" data-state={state}>
        {p.ytId
          ? <YtImage ytId={p.ytId} vivid={vivid} state={state} />
          : <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(150deg,' + (p.color || accent) + '44, #0c0c0d)' }} />}
        {/* Gagnant : un filet blanc se trace au pied de l'image */}
        {state === 'win' && (
          <motion.span
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.55, ease: EASE_OUT }}
            style={{
              position: 'absolute', left: 0, right: 0, bottom: 0, height: 2,
              background: '#fff', transformOrigin: side === 'left' ? 'left' : 'right',
            }}
          />
        )}
      </div>
      <div className="ht-side-meta">
        <span className="ht-side-mark" style={{ background: accent }} />
        <div style={{ minWidth: 0 }}>
          <div className="ht-side-title">{p.title}</div>
          <div className="ht-side-sub">{state === 'win' ? 'Passe au tour suivant' : sub}</div>
        </div>
      </div>
    </motion.button>
  )
}

function HeroDuel({ read, onVote }) {
  const navigate = useNavigate()
  const [hovered, setHovered] = useState(null)
  const [picked, setPicked] = useState(null)
  const [count, setCount] = useState(0)
  const timer = useRef(0)
  useEffect(() => () => { clearTimeout(timer.current); dotFx.lean(null) }, [])

  const match = read?.currentMatch
  const left  = match?.left
  const right = match?.right
  if (!left || !right) return null

  const { done, total } = read.progress
  const pct = total ? (done / total) * 100 : 0
  const route = read.config.route

  function hover(side) {
    setHovered(side)
    dotFx.lean(side)
  }

  function pick(side, e) {
    if (picked) return
    setPicked(side)
    dotFx.lean(null)
    // L'onde part du clic (ou du centre de la carte au clavier).
    const r = e.currentTarget.getBoundingClientRect()
    const x = e.clientX || r.left + r.width / 2
    const y = e.clientY || r.top + r.height / 2
    dotFx.pulse(x, y, '#ffffff', 1)
    // Le temps de voir le choix se marquer, puis le bracket avance.
    timer.current = setTimeout(() => {
      onVote(side)
      setCount(c => c + 1)
      setPicked(null)
      setHovered(null)
    }, 950)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay: 0.25, ease: EASE_OUT }}
      className="ht-duel"
    >
      <div className="ht-duel-head">
        <span data-fx className="ht-live" />
        <span>À toi de trancher</span>
        <span aria-hidden className="ht-sep">·</span>
        <span className="ht-duel-where">{read.config.categoryLabel || 'Tournoi'} — {read.currentRound?.label || 'En cours'}</span>
      </div>

      <AnimatePresence mode="wait" initial={true}>
        <motion.div
          key={match.id}
          exit={{ opacity: 0, transition: { duration: 0.18 } }}
          className="ht-duel-grid"
          onMouseLeave={() => hover(null)}
        >
          <DuelSide p={left} side="left" accent={ACCENT_A}
            state={sideState('left', hovered, picked)} onHover={hover} onPick={pick} disabled={!!picked} />
          <div className="ht-vs-col" aria-hidden>
            <motion.span
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: picked ? 0 : 1, scale: picked ? 0.6 : 1 }}
              transition={{ duration: 0.35, delay: picked ? 0 : 0.6, ease: EASE_OUT }}
              className="ht-vs"
            >
              VS
            </motion.span>
          </div>
          <DuelSide p={right} side="right" accent={ACCENT_B}
            state={sideState('right', hovered, picked)} onHover={hover} onPick={pick} disabled={!!picked} />
        </motion.div>
      </AnimatePresence>

      <div className="ht-duel-foot">
        <div className="ht-bar">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: Math.max(pct, 1) + '%' }}
            transition={{ duration: 0.9, ease: EASE_OUT }}
            className="ht-bar-fill"
          />
        </div>
        <span className="ht-foot-txt">
          {done} / {total} duels tranchés
          {count > 0 && <b> · {count} par toi</b>}
        </span>
        {route && (
          <button type="button" className="ht-link-btn" onClick={() => navigate(route)}>
            Ouvrir l'arène →
          </button>
        )}
      </div>
    </motion.div>
  )
}

// ── Hero ───────────────────────────────────────────────────────────────────
// Une seule colonne centrée sur fond noir et trame de points : une ligne de
// contexte, le titre, une phrase, le duel en grand, puis les actions.
function TournamentHero({ activeRef, categoriesRef, duelRef, ticker, stats, onVote }) {
  const navigate = useNavigate()
  function scrollTo(ref) {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
  const hasDuel = !!(ticker && ticker.currentMatch && ticker.currentMatch.left && ticker.currentMatch.right)

  return (
    <div className="ht-hero">
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="ht-kicker"
      >
        <span>{stats.arenas} arènes ouvertes</span>
        <span aria-hidden className="ht-sep">·</span>
        <span>{stats.matchesTotal.toLocaleString('fr-FR')} duels à trancher</span>
      </motion.div>

      <HeroTitle text="Tournois Brams" />

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className="ht-lede"
      >
        Deux morceaux, un vote. Le bracket avance jusqu'au champion.
      </motion.p>

      {hasDuel && <HeroDuel read={ticker} onVote={onVote} />}

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.5 }}
        className="ht-ctas"
      >
        <button type="button" className="ht-btn ht-btn--main" onClick={() => scrollTo(duelRef)}>
          Duel du jour
        </button>
        <button type="button" className="ht-btn ht-btn--ghost" onClick={() => navigate('/tournoi/salon')}>
          Jouer à plusieurs
        </button>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6, duration: 0.5 }}
        className="ht-links"
      >
        <button type="button" className="ht-link-btn" onClick={() => scrollTo(activeRef)}>Tournois actifs ↓</button>
        <button type="button" className="ht-link-btn" onClick={() => scrollTo(categoriesRef)}>Toutes les arènes ↓</button>
      </motion.div>
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────
export default function TournamentHubPage() {
  // Une seule lecture de l'état local pour tout le hub : les cartes de tournoi,
  // le bandeau de stats et le podium partent des mêmes chiffres.
  // `version` change à chaque vote donné depuis le hero : cartes, compteurs et
  // podium se relisent avec.
  const [version, setVersion] = useState(0)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const reads   = useMemo(() => readAll(ACTIVE_CONFIGS), [version])
  const stats   = useMemo(() => globalStats(reads), [reads])
  const podium  = useMemo(() => championsBoard(reads, 3), [reads])

  // L'arène du hero est choisie une fois (la plus avancée, sinon la première
  // avec un duel ouvert) et ne change plus pendant la visite : voter ne doit
  // pas faire sauter le joueur d'un tournoi à l'autre.
  const [heroId] = useState(() => (stats.hottest || reads.find(r => r.currentMatch) || reads[0])?.id || null)
  const heroRead = reads.find(r => r.id === heroId) || null

  function voteFromHero(side) {
    if (!heroRead) return
    voteCurrentMatch(heroRead.config, loadOrCreateRounds(heroRead.config), side)
    setVersion(v => v + 1)
  }

  const activeRef     = useRef(null)
  const categoriesRef = useRef(null)
  const duelRef       = useRef(null)

  return (
    <MotionConfig reducedMotion="user">
    <div style={{ minHeight: '100vh', background: BG, fontFamily: 'inherit', position: 'relative', overflowX: 'hidden' }}>
      <style>{HUB_CSS}</style>

      {/* Fond : noir et trame de points (la même que les tournois en images).
          Elle réagit au duel du hero : côté survolé, onde au vote. */}
      <HalftoneField />

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
            ticker={heroRead}
            stats={stats}
            onVote={voteFromHero}
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
    </MotionConfig>
  )
}
