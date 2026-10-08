import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence, MotionConfig } from 'framer-motion'
import { readAll, globalStats, championsBoard } from '../lib/tournamentStats.js'
import { loadOrCreateRounds, voteCurrentMatch } from '../lib/tournament.js'
import { TOURNAMENT_CONFIG, OPENING_TOURNAMENT_CONFIG, ENDING_TOURNAMENT_CONFIG, RAP_VS_OST_CONFIG, RAP_FR_CONFIG, OST_ANIME_CONFIG } from '../data/tournament-data.js'
import { TOURNAMENT_CATEGORIES, UPCOMING_TOURNAMENTS } from '../data/tournament-hub-data.js'
import { BANKAI, PANELS } from '../data/versus-data.js'
import { keyartSrc } from './animehub/keyart.js'
import './tournament/hub.css'

// Hub des tournois. Refait le 2026-10-09 : l'ancien empilait ~90 animations
// CSS infinies (dont un `filter` animé) et une trame canvas plein écran, d'où
// ~240 recalculs de style par seconde à l'arrêt. Ici : fond noir, aucune
// boucle, seulement des entrées (une fois) et des transitions au survol sur
// transform / opacity.

// Tournois musicaux à bracket (état en localStorage via lib/tournament).
const BRACKETS = [
  RAP_VS_OST_CONFIG,
  RAP_FR_CONFIG,
  OST_ANIME_CONFIG,
  OPENING_TOURNAMENT_CONFIG,
  ENDING_TOURNAMENT_CONFIG,
  TOURNAMENT_CONFIG,
]

const EASE = [0.22, 1, 0.36, 1]
const isYt = id => typeof id === 'string' && /^[\w-]{11}$/.test(id)
const ytThumb = (id, q = 'hqdefault') => `https://i.ytimg.com/vi/${id}/${q}.jpg`

// Image de couverture de chaque arène : une vraie image du contenu.
function coverOf(cat, read) {
  if (cat.id === 'bankai') return (BANKAI.find(b => b.id === 'senbonzakura-kageyoshi') || BANKAI[0])?.img
  if (cat.id === 'panels') return PANELS[0]?.img
  if (cat.id === 'doublage') return keyartSrc('violet-evergarden', 960)
  if (cat.id === 'studio') return keyartSrc('reze', 960)
  if (cat.id === 'sakuga') return keyartSrc('jjk', 960)
  // ces catalogues n'ont pas (ou plus) de vidéo YouTube exploitable
  if (cat.id === 'ost') return keyartSrc('onepiece', 960)
  if (cat.id === 'opening') return keyartSrc('aot', 960)
  const pool = read?.config.participants || []
  const p = (read?.currentMatch?.left && isYt(read.currentMatch.left.ytId) && read.currentMatch.left) || pool.find(x => isYt(x.ytId))
  return p ? ytThumb(p.ytId) : null
}

// ── Duel du hero ───────────────────────────────────────────────────────────
// Le duel en cours de l'arène la plus avancée, jouable ici. Le vote passe par
// le même bracket que la page du tournoi.
function DuelImage({ p }) {
  const [src, setSrc] = useState(() => (isYt(p.ytId) ? ytThumb(p.ytId, 'maxresdefault') : null))
  if (!src) return <span className="th-duel-ph" style={{ background: `linear-gradient(150deg, ${p.color || '#333'}55, #0b0b0c)` }} />
  return (
    <img
      src={src} alt="" decoding="async" draggable={false}
      // maxresdefault manque parfois : YouTube renvoie alors une vignette grise de 120 px
      onLoad={e => { if (e.currentTarget.naturalWidth <= 120 && src.includes('maxres')) setSrc(ytThumb(p.ytId)) }}
      className={src.includes('hqdefault') ? 'is-43' : ''}
    />
  )
}

function DuelSide({ p, side, state, onPick }) {
  const sub = p.artist || p.anime || ''
  return (
    <motion.button
      type="button"
      className={`th-side th-side--${side}`}
      data-state={state}
      disabled={state === 'win' || state === 'lose'}
      aria-label={`Voter pour ${p.title}${sub ? `, ${sub}` : ''}`}
      onClick={() => onPick(side)}
      initial={{ opacity: 0, x: side === 'left' ? -60 : 60 }}
      animate={{ opacity: state === 'lose' ? 0.18 : 1, x: 0, scale: state === 'lose' ? 0.97 : 1 }}
      exit={{ opacity: 0, transition: { duration: 0.18 } }}
      transition={{ type: 'spring', stiffness: 260, damping: 28, opacity: { duration: 0.4 } }}
    >
      <span className="th-side-img"><DuelImage p={p} /></span>
      <span className="th-side-cap">
        <b>{p.title}</b>
        <small>{state === 'win' ? 'Passe au tour suivant' : sub}</small>
      </span>
      {state === 'win' && <motion.i className="th-side-line" initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.5, ease: EASE }} />}
    </motion.button>
  )
}

function HeroDuel({ read, onVote }) {
  const [picked, setPicked] = useState(null)
  const [mine, setMine] = useState(0)
  const timer = useRef(0)
  useEffect(() => () => clearTimeout(timer.current), [])
  const match = read?.currentMatch
  if (!match?.left || !match?.right) return null
  const { done, total } = read.progress
  const pct = total ? (done / total) * 100 : 0
  const state = side => (picked ? (picked === side ? 'win' : 'lose') : 'rest')

  const pick = side => {
    if (picked) return
    setPicked(side)
    timer.current = setTimeout(() => { onVote(side); setMine(n => n + 1); setPicked(null) }, 850)
  }

  return (
    <div className="th-duel">
      <div className="th-duel-head">
        <span>À toi de trancher</span>
        <span className="th-duel-where">{read.config.categoryLabel || read.config.title} · {read.currentRound?.label || 'En cours'}</span>
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={match.id} className="th-duel-grid" exit={{ opacity: 0, transition: { duration: 0.15 } }}>
          <DuelSide p={match.left} side="left" state={state('left')} onPick={pick} />
          <motion.span className="th-vs" aria-hidden
            initial={{ opacity: 0, scale: 1.6 }} animate={{ opacity: picked ? 0 : 1, scale: 1 }}
            transition={{ delay: picked ? 0 : 0.25, type: 'spring', stiffness: 380, damping: 20 }}>
            vs
          </motion.span>
          <DuelSide p={match.right} side="right" state={state('right')} onPick={pick} />
        </motion.div>
      </AnimatePresence>
      <div className="th-duel-foot">
        <span className="th-bar"><motion.i animate={{ scaleX: Math.max(pct, 0.6) / 100 }} transition={{ duration: 0.8, ease: EASE }} /></span>
        <span>{done} / {total} duels{mine > 0 && <b> · {mine} par toi</b>}</span>
        {read.config.route && <Link to={read.config.route} className="th-link">Ouvrir l’arène →</Link>}
      </div>
    </div>
  )
}

// ── Arène ──────────────────────────────────────────────────────────────────
function ArenaCard({ cat, read, index, big }) {
  const cover = coverOf(cat, read)
  const pct = read ? (read.progress.done / Math.max(1, read.progress.total)) * 100 : 0
  const meta = read
    ? (read.winner ? `Champion : ${read.winner.title}` : read.progress.done ? `${read.progress.done} / ${read.progress.total} duels` : `${read.config.participants.length} participants`)
    : cat.tagline
  return (
    <motion.div
      className={`th-card ${big ? 'is-big' : ''}`}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.6, ease: EASE, delay: Math.min(index % 4, 3) * 0.06 }}
    >
      <Link to={cat.route} className="th-card-link">
        <span className="th-card-img">
          {cover ? <img src={cover} alt="" loading="lazy" decoding="async" onLoad={e => { if (e.currentTarget.naturalWidth <= 120) e.currentTarget.style.opacity = 0 }} /> : <span className="th-card-ph">{cat.icon}</span>}
        </span>
        <span className="th-card-body">
          <b>{cat.label}</b>
          <small>{big ? cat.description : meta}</small>
          {read && read.progress.done > 0 && !read.winner && <span className="th-bar"><i style={{ transform: `scaleX(${pct / 100})` }} /></span>}
          <em>Entrer →</em>
        </span>
      </Link>
    </motion.div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────
export default function TournamentHubPage() {
  const navigate = useNavigate()
  const [version, setVersion] = useState(0)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const reads = useMemo(() => readAll(BRACKETS), [version])
  const stats = useMemo(() => globalStats(reads), [reads])
  const podium = useMemo(() => championsBoard(reads, 6), [reads])
  const byRoute = useMemo(() => new Map(reads.map(r => [r.config.route, r])), [reads])

  // L'arène du hero est choisie une fois : voter ne fait pas sauter d'un tournoi à l'autre.
  const [heroId] = useState(() => (stats.hottest || reads.find(r => r.currentMatch) || reads[0])?.id || null)
  const heroRead = reads.find(r => r.id === heroId) || null
  const vote = side => {
    if (!heroRead) return
    voteCurrentMatch(heroRead.config, loadOrCreateRounds(heroRead.config), side)
    setVersion(v => v + 1)
  }

  useEffect(() => { document.title = 'Tournois · Brams Community' }, [])

  const arenas = TOURNAMENT_CATEGORIES.filter(c => c.status === 'active' && c.route)
  const featured = arenas.filter(c => c.id === 'bankai' || c.id === 'panels')
  const rest = arenas.filter(c => !featured.includes(c))
  const arenasRef = useRef(null)

  return (
    <MotionConfig reducedMotion="user">
      <div className="th-page">
        <div className="th-wrap">
          <header className="th-hero">
            <motion.p className="th-kicker" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
              {arenas.length} arènes · {stats.matchesTotal.toLocaleString('fr-FR')} duels
            </motion.p>
            <h1 className="th-title" aria-label="Tournois">
              {'Tournois'.split('').map((ch, i) => (
                <motion.span key={i} aria-hidden
                  initial={{ opacity: 0, y: '0.35em', fontStretch: '70%' }}
                  animate={{ opacity: 1, y: 0, fontStretch: '125%' }}
                  transition={{ delay: 0.05 + i * 0.035, duration: 0.8, ease: EASE }}>
                  {ch}
                </motion.span>
              ))}
            </h1>
            <motion.div className="th-hero-row" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35, duration: 0.6, ease: EASE }}>
              <p className="th-lede">Deux propositions, un vote. Le bracket avance jusqu’au champion.</p>
              <div className="th-ctas">
                <button type="button" className="th-btn th-btn--main" onClick={() => arenasRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>Toutes les arènes</button>
                <button type="button" className="th-btn" onClick={() => navigate('/tournoi/salon')}>Jouer à plusieurs</button>
              </div>
            </motion.div>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2, duration: 0.4 }}>
              <HeroDuel read={heroRead} onVote={vote} />
            </motion.div>
          </header>

          <div ref={arenasRef} className="th-block">
            <h2 className="th-h2">Les arènes</h2>
            <div className="th-grid th-grid--big">
              {featured.map((c, i) => <ArenaCard key={c.id} cat={c} index={i} big />)}
            </div>
            <div className="th-grid">
              {rest.map((c, i) => <ArenaCard key={c.id} cat={c} read={byRoute.get(c.route)} index={i} />)}
            </div>
          </div>

          {podium.length > 0 && (
            <div className="th-block">
              <h2 className="th-h2">Tes champions <small>{podium.filter(r => r.finished).length} tournois terminés</small></h2>
              <ol className="th-champs">
                {podium.map(r => (
                  <li key={r.id}>
                    <Link to={r.config.route}>
                      <span className="th-champs-img">{isYt(r.leader.ytId) ? <img src={ytThumb(r.leader.ytId)} alt="" loading="lazy" /> : null}</span>
                      <span className="th-champs-txt">
                        <small>{r.config.categoryLabel || r.config.title} · {r.finished ? 'Champion' : 'En tête'}</small>
                        <b>{r.leader.title}</b>
                      </span>
                    </Link>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {(UPCOMING_TOURNAMENTS.length > 0 || TOURNAMENT_CATEGORIES.some(c => c.status === 'soon')) && (
            <div className="th-block">
              <h2 className="th-h2">Bientôt</h2>
              <p className="th-soon">
                {[...TOURNAMENT_CATEGORIES.filter(c => c.status === 'soon').map(c => c.label), ...UPCOMING_TOURNAMENTS.map(u => u.title || u.label)].map(t => <span key={t}>{t}</span>)}
              </p>
            </div>
          )}
        </div>
      </div>
    </MotionConfig>
  )
}
