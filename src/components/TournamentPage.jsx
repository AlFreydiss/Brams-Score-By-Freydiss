import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  generateBracket,
  getCurrentMatch,
  advanceWinner,
  getTournamentProgress,
  getWinner,
  loadState, saveState,
  loadPersonalVotes, savePersonalVote, savePersonalVotes,
  loadVoteCounts, addVoteCount, saveVoteCounts,
  getVotePercents,
  resetTournament,
} from '../lib/tournament.js'
import { TOURNAMENT_CONFIGS } from '../data/tournament-data.js'
import DuelArena         from './tournament/DuelArena.jsx'
import DuelAmbient       from './tournament/DuelAmbient.jsx'
import BracketPanel      from './tournament/BracketPanel.jsx'
import WinnerCard        from './tournament/WinnerCard.jsx'
import TournamentBracket from './tournament/TournamentBracket.jsx'
import TournamentResults from './tournament/TournamentResults.jsx'

const BG      = '#020203'
const PINK    = '#9d174d'
const PURPLE  = '#4c1d95'
const PINK_L  = '#db2777'
const PINK_LL = '#f9a8d4'
const GRAD    = `linear-gradient(135deg, ${PINK}, ${PURPLE})`
const GRAD_TXT = `linear-gradient(135deg, ${PINK_LL} 0%, ${PINK_L} 45%, ${PURPLE} 100%)`
const GOLD    = PINK
const GOLD2   = PINK_LL

const T_CSS = `
  @keyframes t_glow    { 0%,100%{opacity:.5} 50%{opacity:1} }
  @keyframes tTwinkle  { 0%,100%{opacity:.07} 50%{opacity:.50} }
  @keyframes tScan     { 0%{top:-2px} 100%{top:100%} }
  @keyframes tGridMove { 0%{transform:translate3d(0,0,0)} 100%{transform:translate3d(-72px,72px,0)} }
  @keyframes tShadowSweep { 0%{transform:translateX(-35%) skewX(-12deg); opacity:.10} 50%{opacity:.22} 100%{transform:translateX(135%) skewX(-12deg); opacity:.10} }
`

function TDarkBackdrop() {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden', background: BG }}>
      <div style={{
        position: 'absolute', inset: '-20%',
        background: [
          'linear-gradient(115deg, transparent 0%, rgba(157,23,77,.08) 46%, rgba(76,29,149,.06) 50%, transparent 55%)',
          'repeating-linear-gradient(90deg, rgba(255,255,255,.025) 0 1px, transparent 1px 72px)',
          'repeating-linear-gradient(0deg, rgba(255,255,255,.018) 0 1px, transparent 1px 72px)',
          'linear-gradient(180deg, rgba(0,0,0,.20), rgba(0,0,0,.78))',
        ].join(','),
        opacity: 0.62,
        animation: 'tGridMove 26s linear infinite',
      }} />
      <div style={{
        position: 'absolute', top: 0, bottom: 0, width: '34%',
        background: 'linear-gradient(90deg, transparent, rgba(219,39,119,.09), rgba(255,255,255,.025), transparent)',
        filter: 'blur(10px)',
        animation: 'tShadowSweep 11s ease-in-out infinite',
      }} />
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(180deg, rgba(0,0,0,.45) 0%, rgba(2,2,3,.78) 42%, rgba(0,0,0,.96) 100%)',
      }} />
    </div>
  )
}

function TStars() {
  const stars = Array.from({ length: 50 }, (_, i) => ({
    x: (i * 37.3 + 11) % 98, y: (i * 41.9 + 17) % 96,
    size: i % 9 === 0 ? 2.5 : i % 4 === 0 ? 1.6 : 1,
    dur: 2.8 + (i * 0.28) % 4.5, del: (i * 0.21) % 7,
    gold: i % 13 === 0,
  }))
  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 1 }}>
      {stars.map((s, i) => (
        <div key={i} style={{
          position: 'absolute', left: `${s.x}%`, top: `${s.y}%`,
          width: s.size, height: s.size, borderRadius: '50%',
          background: s.gold ? 'rgba(157,23,77,.55)' : 'rgba(255,255,255,.4)',
          animation: `tTwinkle ${s.dur}s ${s.del}s ease-in-out infinite`,
        }} />
      ))}
    </div>
  )
}

function TScanLine() {
  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 1, overflow: 'hidden' }}>
      <div style={{
        position: 'absolute', left: 0, right: 0, height: 2,
        background: 'linear-gradient(90deg,transparent,rgba(157,23,77,.10),rgba(76,29,149,.14),rgba(157,23,77,.10),transparent)',
        animation: 'tScan 18s linear infinite',
      }} />
    </div>
  )
}

// ── Version check ──────────────────────────────────────────────────────────
function loadRoundsWithVersionCheck(config) {
  const versionKey = `brams_t_version_${config.id}`
  const version = config.version || 'v1'
  const savedVersion = localStorage.getItem(versionKey)
  if (savedVersion !== version) {
    resetTournament(config.id)
    localStorage.setItem(versionKey, version)
    const { rounds } = generateBracket(config.participants, config.id)
    return rounds
  }
  const saved = loadState(config.id)
  if (saved) {
    if (getCurrentMatch(saved) || getWinner(saved)) return saved
    resetTournament(config.id)
  }
  const { rounds } = generateBracket(config.participants, config.id)
  return rounds
}

// ── Stats pill ─────────────────────────────────────────────────────────────
function Pill({ label, value, gold }) {
  return (
    <div style={{
      padding: '10px 20px',
      borderRadius: 12,
      background: gold ? 'rgba(157,23,77,.09)' : 'rgba(255,255,255,.04)',
      border: `1px solid ${gold ? 'rgba(157,23,77,.28)' : 'rgba(255,255,255,.08)'}`,
      textAlign: 'center', flexShrink: 0,
    }}>
      <div style={{
        fontFamily: "'Pirata One',cursive",
        fontSize: gold ? 22 : 20, fontWeight: 900,
        color: gold ? GOLD2 : 'rgba(255,255,255,.88)',
        lineHeight: 1,
        filter: gold ? `drop-shadow(0 0 8px ${GOLD}66)` : 'none',
      }}>
        {value}
      </div>
      <div style={{
        fontSize: 8, color: 'rgba(255,255,255,.26)',
        letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: 5,
      }}>
        {label}
      </div>
    </div>
  )
}

// ── Hero ───────────────────────────────────────────────────────────────────
function TournamentHero({ config, progress, roundLabel, matchLabel }) {
  const navigate = useNavigate()
  return (
    <div style={{
      position: 'relative', textAlign: 'center', paddingBottom: 44,
    }}>
      {/* Breadcrumb */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        marginBottom: 28, justifyContent: 'flex-start',
      }}>
        <button
          onClick={() => navigate('/tournoi')}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'none', border: 'none', cursor: 'pointer', padding: 0,
            fontSize: 11, color: 'rgba(255,255,255,.35)',
            letterSpacing: '0.06em', fontWeight: 600,
            transition: 'color 0.18s',
          }}
          onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,.7)'}
          onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,.35)'}
        >
          <span style={{ fontSize: 14, lineHeight: 1 }}>←</span>
          Tournois
        </button>
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,.14)' }}>/</span>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,.5)', fontWeight: 600, letterSpacing: '0.06em' }}>
          {config.categoryLabel}
        </span>
      </div>

      <div style={{
        position: 'absolute', inset: '-40px -200px 0', zIndex: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 80% 90% at 50% 0%, rgba(157,23,77,.07) 0%, transparent 55%)',
      }} />

      <div style={{ position: 'relative', zIndex: 1 }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.05 }}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 18px',
            borderRadius: 100, background: 'rgba(157,23,77,.10)', border: '1px solid rgba(157,23,77,.30)',
            fontSize: 9, fontWeight: 800, letterSpacing: '.18em', color: GOLD,
            textTransform: 'uppercase', marginBottom: 18,
          }}
        >
          {'♪'} Best Anime OST
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          style={{
            fontFamily: "'Pirata One',cursive",
            fontSize: 'clamp(40px, 7vw, 88px)',
            fontWeight: 900, margin: '0 0 14px',
            background: GRAD_TXT,
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            letterSpacing: '-0.01em', lineHeight: 0.95,
          }}
        >
          {config.title}
        </motion.h1>

        <p style={{
          fontSize: 14, color: 'rgba(255,255,255,.33)',
          margin: '0 0 32px', maxWidth: 580, marginInline: 'auto', lineHeight: 1.65,
        }}>
          {config.description}
        </p>

        {/* Stats row */}
        <div style={{
          display: 'flex', justifyContent: 'center',
          gap: 8, flexWrap: 'wrap', marginBottom: 26,
        }}>
          <Pill label="Participants"  value={config.participants.length} />
          <Pill label="Format"        value="Élimination" />
          <Pill label="Matchs joués"  value={`${progress.done} / ${progress.total}`} />
          <Pill label="Phase"         value={roundLabel} gold />
          {matchLabel && <Pill label="Duel"  value={matchLabel} />}
        </div>

        {/* Progress bar */}
        <div style={{ maxWidth: 440, margin: '0 auto' }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            fontSize: 9, color: 'rgba(255,255,255,.2)',
            marginBottom: 8, letterSpacing: '0.09em',
          }}>
            <span>PROGRESSION GLOBALE</span>
            <span>{progress.pct}%</span>
          </div>
          <div style={{ height: 3, borderRadius: 2, background: 'rgba(255,255,255,.06)', overflow: 'hidden' }}>
            <motion.div
              initial={false}
              animate={{ width: `${progress.pct}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              style={{ height: '100%', background: GRAD }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Tabs ───────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'duel',    label: 'Duel',      icon: '⚔' },
  { id: 'results', label: 'Résultats', icon: '📊' },
]

function TournamentTabs({ active, onChange, roundLabel, matchLabel }) {
  return (
    <div style={{ marginBottom: 36 }}>
      {/* Current round info strip */}
      {(roundLabel || matchLabel) && (
        <div style={{
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          gap: 10, marginBottom: 16,
        }}>
          {roundLabel && (
            <span style={{
              fontSize: 11, color: GOLD, fontWeight: 700,
              letterSpacing: '0.1em', textTransform: 'uppercase',
              background: 'rgba(157,23,77,.08)',
              border: '1px solid rgba(157,23,77,.2)',
              borderRadius: 20, padding: '3px 14px',
            }}>
              {roundLabel}
            </span>
          )}
          {matchLabel && (
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,.28)' }}>
              {matchLabel}
            </span>
          )}
        </div>
      )}

      {/* Tab bar */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <div style={{
          display: 'flex', gap: 3,
          background: 'rgba(255,255,255,.03)',
          border: '1px solid rgba(255,255,255,.08)',
          borderRadius: 14, padding: 4,
        }}>
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              style={{
                padding: '10px 28px',
                borderRadius: 11, border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: 700,
                background: active === tab.id ? 'rgba(157,23,77,.12)' : 'transparent',
                color: active === tab.id ? GOLD : 'rgba(255,255,255,.38)',
                outline: active === tab.id ? `1px solid rgba(157,23,77,.22)` : 'none',
                transition: 'all 0.18s',
                display: 'flex', alignItems: 'center', gap: 7,
              }}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Winner section ─────────────────────────────────────────────────────────
function WinnerSection({ winner, onReset }) {
  const [imgFailed, setImgFailed] = useState(false)
  const [imgState,  setImgState]  = useState('loading')
  const ytOk   = winner?.ytId && !winner.ytId.startsWith('similar')
  const thumb  = ytOk && !imgFailed
    ? `https://img.youtube.com/vi/${winner.ytId}/hqdefault.jpg`
    : null
  const accent = winner?.color || GOLD

  function handleLoad(e) {
    if (e.target.naturalWidth <= 120) setImgFailed(true)
    else setImgState('ok')
  }

  const showThumb = !!thumb && imgState !== 'failed' && !imgFailed

  return (
    <div style={{ textAlign: 'center', padding: '20px 0 40px' }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        style={{
          display: 'inline-block',
          position: 'relative',
          borderRadius: 24,
          border: `1px solid ${GOLD}`,
          overflow: 'hidden',
          boxShadow: `0 0 80px rgba(157,23,77,.1), 0 0 0 1px rgba(157,23,77,.12)`,
          animation: 't_glow 3.5s ease-in-out infinite',
          maxWidth: 500, width: '100%',
        }}
      >
        {showThumb && (
          <>
            <img loading="lazy" decoding="async"
              src={thumb}
              onLoad={handleLoad}
              onError={() => setImgFailed(true)}
              alt=""
              style={{
                position: 'absolute', inset: '-5%',
                width: '110%', height: '110%',
                maxWidth: 'none', maxHeight: 'none',
                objectFit: 'cover',
                filter: 'blur(16px) brightness(0.26) saturate(1.3)',
              }}
            />
            <div style={{
              position: 'absolute', inset: 0,
              background: `radial-gradient(ellipse at 50% 40%, ${accent}30 0%, rgba(7,9,14,0.88) 65%)`,
            }} />
          </>
        )}
        {!showThumb && (
          <div style={{
            position: 'absolute', inset: 0,
            background: `radial-gradient(ellipse at 40% 35%, ${accent}55 0%, ${accent}18 40%, rgba(7,9,14,.98) 68%)`,
          }} />
        )}

        <div style={{ position: 'relative', zIndex: 1, padding: '44px 56px' }}>
          <div style={{ fontSize: 48, marginBottom: 14 }}>🏆</div>
          <div style={{
            fontSize: 'clamp(22px, 4vw, 32px)', fontWeight: 900,
            background: GRAD_TXT,
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            marginBottom: 8, lineHeight: 1.2,
          }}>
            {winner.title}
          </div>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,.5)', marginBottom: 4 }}>
            {winner.anime}
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,.28)' }}>{winner.artist}</div>
        </div>
      </motion.div>

      <div style={{ fontSize: 14, color: 'rgba(255,255,255,.35)', margin: '24px 0' }}>
        Le tournoi est terminé. La communauté a parlé.
      </div>

      <button
        onClick={onReset}
        style={{
          padding: '10px 28px', borderRadius: 10,
          border: '1px solid rgba(255,255,255,.12)',
          background: 'rgba(255,255,255,.03)',
          color: 'rgba(255,255,255,.35)', fontSize: 12, cursor: 'pointer',
          transition: 'all 0.2s',
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,.07)'}
        onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,.03)'}
      >
        Rejouer le tournoi
      </button>
    </div>
  )
}

function NoMatchReady({ onReset }) {
  return (
    <div style={{ textAlign: 'center', padding: '60px 20px' }}>
      <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.2 }}>⚔</div>
      <div style={{ color: 'rgba(255,255,255,.28)', fontSize: 14, marginBottom: 18 }}>
        En attente du prochain duel.
      </div>
      <button
        onClick={onReset}
        style={{
          padding: '10px 20px',
          borderRadius: 10,
          border: '1px solid rgba(157,23,77,.35)',
          background: 'rgba(157,23,77,.12)',
          color: GOLD2,
          fontSize: 12,
          fontWeight: 800,
          cursor: 'pointer',
        }}
      >
        Lancer le tournoi solo
      </button>
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────
export default function TournamentPage({ tournamentId = 'ost' }) {
  const config = TOURNAMENT_CONFIGS[tournamentId] || TOURNAMENT_CONFIGS.ost
  const [tab,           setTab]           = useState('duel')
  const [rounds,        setRounds]        = useState(() => loadRoundsWithVersionCheck(config))
  const [personalVotes, setPersonalVotes] = useState(() => loadPersonalVotes(config.id))
  const [voteCounts,    setVoteCounts]    = useState(() => loadVoteCounts(config.id))
  const [isMobile,      setIsMobile]      = useState(() => window.innerWidth < 768)

  // Joker "Passer ce duel" : 1 dispo, se recharge dès qu'on vote pour un autre duel.
  const [skipTokens,    setSkipTokens]    = useState(1)
  // Pile d'annulation (en mémoire) + tours où le bouton Retour a déjà été utilisé
  // (Retour limité à une fois par bracket/tour).
  const [history,       setHistory]       = useState([])
  const [backUsedRounds, setBackUsedRounds] = useState({})

  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])

  useEffect(() => {
    setRounds(loadRoundsWithVersionCheck(config))
    setPersonalVotes(loadPersonalVotes(config.id))
    setVoteCounts(loadVoteCounts(config.id))
    setSkipTokens(1)
    setHistory([])
    setBackUsedRounds({})
    setTab('duel')
  }, [config.id])

  useEffect(() => {
    saveState(config.id, rounds)
  }, [rounds, config.id])

  const current  = useMemo(() => getCurrentMatch(rounds), [rounds])
  const progress = useMemo(() => getTournamentProgress(rounds), [rounds])
  const winner   = useMemo(() => getWinner(rounds), [rounds])

  const totalMatchesInRound = useMemo(() => {
    if (!current) return 0
    const round = rounds.find(r => r.id === current.round.id)
    return round?.matches?.filter(m => m.left && m.right).length || 0
  }, [current, rounds])

  const roundLabel = current ? current.round.label : winner ? 'Terminé' : 'En attente'
  const matchLabel = current ? `${current.match.position + 1} / ${totalMatchesInRound}` : ''

  function handleVote(side) {
    if (!current) return
    const matchId     = current.match.id
    const newPersonal = { ...personalVotes, [matchId]: side }
    setPersonalVotes(newPersonal)
    savePersonalVote(config.id, matchId, side)
    const newVC = addVoteCount(config.id, matchId, side)
    setVoteCounts({ ...newVC })
    // Voter pour un duel recharge le joker "Passer" (plafonné à 1).
    setSkipTokens(1)
  }

  // Mémorise l'état AVANT d'avancer pour pouvoir revenir en arrière proprement.
  function pushHistory(matchId, votedSide) {
    setHistory(h => [...h, { rounds, matchId, votedSide: votedSide || null, roundId: current?.round.id }])
  }

  function handleNext() {
    if (!current) return
    const matchId = current.match.id
    if (!personalVotes[matchId]) return
    const percents  = getVotePercents(voteCounts, matchId)
    const winnerId  = percents.leftN >= percents.rightN
      ? current.match.left?.id
      : current.match.right?.id
    pushHistory(matchId, personalVotes[matchId])
    const newRounds = advanceWinner(rounds, matchId, winnerId)
    setRounds(newRounds)
    if (getWinner(newRounds)) setTab('results')
  }

  // Passer le duel sans se prononcer : consomme le joker, avance selon les votes
  // déjà comptés (égalité ou aucun vote → tirage au sort).
  function handleSkip() {
    if (!current || skipTokens <= 0) return
    const matchId  = current.match.id
    const percents = getVotePercents(voteCounts, matchId)
    const winnerId = percents.leftN === percents.rightN
      ? (Math.random() < 0.5 ? current.match.left?.id : current.match.right?.id)
      : (percents.leftN > percents.rightN ? current.match.left?.id : current.match.right?.id)
    pushHistory(matchId, personalVotes[matchId])
    setSkipTokens(t => t - 1)
    const newRounds = advanceWinner(rounds, matchId, winnerId)
    setRounds(newRounds)
    if (getWinner(newRounds)) setTab('results')
  }

  // Retour : annule le dernier duel (1 fois par tour). On restaure le bracket et on
  // efface le vote concerné pour pouvoir re-choisir librement.
  const canBack = history.length > 0 && current && !backUsedRounds[current.round.id]
  function handleBack() {
    if (!canBack) return
    const entry = history[history.length - 1]
    setHistory(h => h.slice(0, -1))
    setBackUsedRounds(b => ({ ...b, [current.round.id]: true }))
    setRounds(entry.rounds)
    if (entry.votedSide) {
      const newPV = { ...personalVotes }; delete newPV[entry.matchId]
      setPersonalVotes(newPV); savePersonalVotes(config.id, newPV)
      const newVC = { ...voteCounts }
      if (newVC[entry.matchId]) {
        newVC[entry.matchId] = { ...newVC[entry.matchId], [entry.votedSide]: Math.max(0, (newVC[entry.matchId][entry.votedSide] || 0) - 1) }
        setVoteCounts(newVC); saveVoteCounts(config.id, newVC)
      }
    } else {
      // L'entrée annulée était un "Passer" → on rembourse le joker.
      setSkipTokens(1)
    }
    setTab('duel')
  }

  function handleReset() {
    resetTournament(config.id)
    const { rounds: fresh } = generateBracket(config.participants, config.id)
    setRounds(fresh)
    setPersonalVotes({})
    setVoteCounts({})
    setSkipTokens(1)
    setHistory([])
    setBackUsedRounds({})
    setTab('duel')
  }

  const isLastMatch = !current || !(getCurrentMatch(
    advanceWinner(rounds, current.match.id, current.match.left?.id)
  ))

  return (
    <div style={{ minHeight: '100vh', background: BG, fontFamily: 'inherit', position: 'relative' }}>
      <style>{T_CSS}</style>

      {/* Fixed bg layers */}
      <TDarkBackdrop />
      <TStars />
      <TScanLine />

      {/* Inner container — wide */}
      <div style={{ position: 'relative', zIndex: 2 }}>
      <div style={{
        maxWidth: 1440,
        margin: '0 auto',
        padding: 'clamp(88px, 9vw, 124px) clamp(16px, 4vw, 56px) clamp(24px, 4vw, 64px)',
      }}>

        <TournamentHero
          config={config}
          progress={progress}
          roundLabel={roundLabel}
          matchLabel={matchLabel}
        />

        <TournamentTabs
          active={tab}
          onChange={setTab}
          roundLabel={roundLabel}
          matchLabel={matchLabel ? `Duel ${matchLabel}` : ''}
        />

        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
          >
            {tab === 'duel' && (
              <>
                {winner ? (
                  <WinnerCard winner={winner} onReset={handleReset} />
                ) : current ? (
                  <>
                    {/* Fond d'ambiance + suivi de progression + duel vertical + bracket
                        en sidebar : même présentation premium que le tournoi multi. */}
                    <DuelAmbient left={current.match.left} right={current.match.right} />
                    <style>{`@keyframes tsolo-pulse{0%,100%{opacity:.5}50%{opacity:1}}`}</style>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16, position: 'relative', zIndex: 1 }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '7px 16px', borderRadius: 999, background: 'rgba(157,23,77,.12)', border: '1px solid rgba(157,23,77,.45)' }}>
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#f9a8d4', boxShadow: '0 0 8px #f9a8d4', animation: 'tsolo-pulse 2s ease-in-out infinite' }} />
                        <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: '#f9a8d4' }}>{roundLabel}</span>
                        <span style={{ width: 1, height: 14, background: 'rgba(255,255,255,.15)' }} />
                        <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,.55)' }}>Duel {matchLabel}/{totalMatchesInRound}</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 18, alignItems: 'flex-start', justifyContent: 'center', flexDirection: isMobile ? 'column' : 'row' }}>
                      <div style={{ flex: '1 1 0', minWidth: 0, maxWidth: 900, width: '100%' }}>
                        <DuelArena
                          key={current.match.id}
                          round={current.round}
                          match={current.match}
                          totalMatchesInRound={totalMatchesInRound}
                          voteCounts={voteCounts}
                          personalVotes={personalVotes}
                          onVote={handleVote}
                          onNext={handleNext}
                          isLastMatch={isLastMatch}
                          isMobile={isMobile}
                          vertical
                        />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: isMobile ? '100%' : 248, position: 'relative', zIndex: 1 }}>
                        <BracketPanel rounds={rounds} currentId={current.match.id} isMobile={isMobile} />

                        {/* Joker "Passer ce duel" : 1 dispo, rechargé en votant ailleurs */}
                        {!isLastMatch && (() => {
                          const can = skipTokens > 0
                          return (
                            <button
                              onClick={handleSkip}
                              disabled={!can}
                              title={can ? 'Passer ce duel sans voter (joker)' : 'Joker épuisé — vote un duel pour le recharger'}
                              style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                                padding: '12px 16px', borderRadius: 13,
                                border: `1px solid ${can ? 'rgba(219,39,119,.42)' : 'rgba(255,255,255,.05)'}`,
                                background: can ? 'rgba(157,23,77,.12)' : 'rgba(255,255,255,.015)',
                                color: can ? 'rgba(255,255,255,.92)' : 'rgba(255,255,255,.22)',
                                fontSize: 13, fontWeight: 800, fontFamily: 'inherit',
                                cursor: can ? 'pointer' : 'not-allowed', letterSpacing: '.02em',
                                boxShadow: can ? '0 4px 18px rgba(157,23,77,.18)' : 'none',
                                transition: 'background .18s, border-color .18s, color .18s, box-shadow .18s',
                              }}
                              onMouseEnter={e => { if (can) { e.currentTarget.style.background = 'rgba(157,23,77,.24)'; e.currentTarget.style.borderColor = '#db2777'; e.currentTarget.style.color = '#fff' } }}
                              onMouseLeave={e => { if (can) { e.currentTarget.style.background = 'rgba(157,23,77,.12)'; e.currentTarget.style.borderColor = 'rgba(219,39,119,.42)'; e.currentTarget.style.color = 'rgba(255,255,255,.92)' } }}
                            >
                              <span>Passer ce duel →</span>
                              <span style={{
                                fontSize: 11, fontWeight: 900, padding: '1px 7px', borderRadius: 999,
                                background: can ? 'rgba(219,39,119,.32)' : 'rgba(255,255,255,.05)',
                                color: can ? '#ffd9ea' : 'rgba(255,255,255,.3)',
                              }}>🃏 {skipTokens}</span>
                            </button>
                          )
                        })()}

                        {/* Retour : annule le dernier duel, 1 fois par tour */}
                        <button
                          onClick={handleBack}
                          disabled={!canBack}
                          title={canBack ? 'Revenir au duel précédent (1 fois par tour)' : 'Retour déjà utilisé ce tour — ou rien à annuler'}
                          style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                            padding: '10px 16px', borderRadius: 13,
                            border: '1px solid rgba(255,255,255,.06)',
                            background: 'transparent',
                            color: canBack ? 'rgba(255,255,255,.5)' : 'rgba(255,255,255,.2)',
                            fontSize: 12.5, fontWeight: 700, fontFamily: 'inherit',
                            cursor: canBack ? 'pointer' : 'not-allowed', letterSpacing: '.02em',
                            transition: 'background .18s, color .18s',
                          }}
                          onMouseEnter={e => { if (canBack) { e.currentTarget.style.background = 'rgba(255,255,255,.05)'; e.currentTarget.style.color = 'rgba(255,255,255,.85)' } }}
                          onMouseLeave={e => { if (canBack) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,.5)' } }}
                        >
                          ← Retour
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <NoMatchReady onReset={handleReset} />
                )}
              </>
            )}

            {tab === 'bracket' && (
              <TournamentBracket
                rounds={rounds}
                currentMatchId={current?.match?.id}
                isMobile={isMobile}
              />
            )}

            {tab === 'results' && (
              <TournamentResults
                rounds={rounds}
                voteCounts={voteCounts}
                winner={winner}
              />
            )}
          </motion.div>
        </AnimatePresence>

        {/* Footer */}
        <div style={{
          marginTop: 72, paddingTop: 24,
          borderTop: '1px solid rgba(255,255,255,.05)',
          display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', flexWrap: 'wrap', gap: 12,
        }}>
          <div />
          <button
            onClick={() => { if (confirm('Réinitialiser le tournoi ? Tous les votes seront perdus.')) handleReset() }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '11px 22px', borderRadius: 10,
              border: '1px solid rgba(220,72,72,.45)',
              background: 'rgba(220,72,72,.10)',
              color: '#f1a3a3', fontSize: 13, fontWeight: 600,
              letterSpacing: .2, cursor: 'pointer',
              transition: 'all 0.18s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(220,72,72,.20)'
              e.currentTarget.style.borderColor = 'rgba(220,72,72,.75)'
              e.currentTarget.style.color = '#ffd7d7'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(220,72,72,.10)'
              e.currentTarget.style.borderColor = 'rgba(220,72,72,.45)'
              e.currentTarget.style.color = '#f1a3a3'
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 1 0 9-9 9 9 0 0 0-6.4 2.6L3 8" />
              <path d="M3 3v5h5" />
            </svg>
            Réinitialiser le tournoi
          </button>
        </div>
      </div>
      </div>
    </div>
  )
}
