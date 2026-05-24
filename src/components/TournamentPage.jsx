import { useState, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  generateBracket,
  getCurrentMatch,
  advanceWinner,
  getTournamentProgress,
  getWinner,
  loadState, saveState,
  loadPersonalVotes, savePersonalVote,
  loadVoteCounts, addVoteCount,
  getVotePercents,
  resetTournament,
} from '../lib/tournament.js'
import { TOURNAMENT_CONFIG } from '../data/tournament-data.js'
import TournamentDuel    from './tournament/TournamentDuel.jsx'
import TournamentBracket from './tournament/TournamentBracket.jsx'
import TournamentResults from './tournament/TournamentResults.jsx'

const BG    = '#07090e'
const GOLD  = '#d4a017'
const GOLD2 = '#f0c040'

const T_CSS = `
  @keyframes t_glow    { 0%,100%{opacity:.5} 50%{opacity:1} }
  @keyframes t_shimmer { 0%{background-position:200% center} 100%{background-position:-200% center} }
`

const TABS = [
  { id: 'duel',    label: 'Duel',      icon: '⚔' },
  { id: 'bracket', label: 'Bracket',   icon: '🏆' },
  { id: 'results', label: 'Résultats', icon: '📊' },
]

const TOURNAMENT_VERSION = 'v2-ost'
const VERSION_KEY = `brams_t_version_${TOURNAMENT_CONFIG.id}`

function loadRoundsWithVersionCheck() {
  const savedVersion = localStorage.getItem(VERSION_KEY)
  if (savedVersion !== TOURNAMENT_VERSION) {
    resetTournament(TOURNAMENT_CONFIG.id)
    localStorage.setItem(VERSION_KEY, TOURNAMENT_VERSION)
    const { rounds } = generateBracket(TOURNAMENT_CONFIG.participants)
    return rounds
  }
  const saved = loadState(TOURNAMENT_CONFIG.id)
  if (saved) return saved
  const { rounds } = generateBracket(TOURNAMENT_CONFIG.participants)
  return rounds
}

// ── Stats pill row ─────────────────────────────────────────────────────────
function StatPill({ label, value, highlight }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '10px 20px',
      borderRadius: 12,
      background: highlight ? 'rgba(212,160,23,.08)' : 'rgba(255,255,255,.03)',
      border: `1px solid ${highlight ? 'rgba(212,160,23,.25)' : 'rgba(255,255,255,.07)'}`,
      minWidth: 80,
    }}>
      <div style={{
        fontSize: 18, fontWeight: 800,
        color: highlight ? GOLD2 : 'rgba(255,255,255,.9)',
        lineHeight: 1,
      }}>{value}</div>
      <div style={{
        fontSize: 10, color: 'rgba(255,255,255,.3)',
        letterSpacing: '0.08em', textTransform: 'uppercase',
        marginTop: 4,
      }}>{label}</div>
    </div>
  )
}

// ── Hero header ────────────────────────────────────────────────────────────
function TournamentHeader({ config, progress, roundLabel }) {
  return (
    <div style={{ textAlign: 'center', marginBottom: 40, position: 'relative', zIndex: 1 }}>
      {/* Gold radial glow */}
      <div style={{
        position: 'absolute', inset: '-60px -100px', zIndex: -1,
        background: 'radial-gradient(ellipse 65% 80% at 50% 0%, rgba(212,160,23,0.08) 0%, transparent 65%)',
        pointerEvents: 'none',
      }} />

      <div style={{
        fontSize: 11, color: 'rgba(255,255,255,.28)',
        letterSpacing: '0.18em', marginBottom: 10,
        textTransform: 'uppercase',
      }}>
        Brams Community · {config.edition.toUpperCase()}
      </div>

      <h1 style={{
        fontSize: 'clamp(28px, 5.5vw, 52px)',
        fontWeight: 900, margin: '0 0 10px',
        background: `linear-gradient(135deg, ${GOLD2} 0%, ${GOLD} 55%, rgba(191,164,106,0.75) 100%)`,
        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        letterSpacing: '-0.015em', lineHeight: 1.05,
      }}>
        {config.title}
      </h1>

      <p style={{
        fontSize: 14, color: 'rgba(255,255,255,.38)',
        margin: '0 0 28px', maxWidth: 540, marginInline: 'auto',
        lineHeight: 1.55,
      }}>
        {config.description}
      </p>

      {/* Stats pills */}
      <div style={{
        display: 'flex', justifyContent: 'center',
        gap: 8, flexWrap: 'wrap', marginBottom: 24,
      }}>
        <StatPill label="Participants"   value={config.participants.length} />
        <StatPill label="Format"         value="Élimination" />
        <StatPill label="Matchs joués"   value={`${progress.done} / ${progress.total}`} />
        <StatPill label="Phase"          value={roundLabel} highlight />
      </div>

      {/* Global progress bar */}
      <div style={{ maxWidth: 380, margin: '0 auto' }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          fontSize: 10, color: 'rgba(255,255,255,.25)',
          marginBottom: 7, letterSpacing: '0.06em',
        }}>
          <span>PROGRESSION GLOBALE</span>
          <span>{progress.pct}%</span>
        </div>
        <div style={{ height: 3, borderRadius: 2, background: 'rgba(255,255,255,.06)', overflow: 'hidden' }}>
          <motion.div
            initial={false}
            animate={{ width: `${progress.pct}%` }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            style={{
              height: '100%',
              background: `linear-gradient(90deg, ${GOLD}, ${GOLD2})`,
            }}
          />
        </div>
      </div>
    </div>
  )
}

// ── Tab bar ────────────────────────────────────────────────────────────────
function TabBar({ active, onChange, matchLabel }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', gap: 12, marginBottom: 32,
    }}>
      {matchLabel && (
        <div style={{
          fontSize: 12, color: 'rgba(255,255,255,.3)',
          letterSpacing: '0.06em',
        }}>
          {matchLabel}
        </div>
      )}
      <div style={{
        display: 'flex', gap: 4,
        background: 'rgba(255,255,255,.03)',
        border: '1px solid rgba(255,255,255,.07)',
        borderRadius: 13, padding: 4,
      }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            style={{
              padding: '9px 22px',
              borderRadius: 10, border: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: 700,
              background: active === tab.id ? 'rgba(212,160,23,.12)' : 'transparent',
              color: active === tab.id ? GOLD : 'rgba(255,255,255,.4)',
              outline: active === tab.id ? `1px solid rgba(212,160,23,.22)` : 'none',
              transition: 'all 0.18s',
              display: 'flex', alignItems: 'center', gap: 7,
            }}
          >
            <span style={{ fontSize: 13 }}>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Winner section ─────────────────────────────────────────────────────────
function WinnerSection({ winner, onReset }) {
  const [imgFailed, setImgFailed] = useState(false)
  const ytOk  = winner?.ytId && !winner.ytId.startsWith('similar')
  const thumb = ytOk && !imgFailed
    ? `https://img.youtube.com/vi/${winner.ytId}/hqdefault.jpg`
    : null
  const accent = winner?.color || GOLD

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
          background: 'rgba(212,160,23,.06)',
          padding: thumb ? 0 : '40px 52px',
          marginBottom: 28,
          overflow: 'hidden',
          boxShadow: `0 0 80px rgba(212,160,23,.1), 0 0 0 1px rgba(212,160,23,.12)`,
          animation: 't_glow 3.5s ease-in-out infinite',
          maxWidth: 480, width: '100%',
        }}
      >
        {/* Thumbnail background */}
        {thumb && (
          <>
            <img
              src={thumb}
              onError={() => setImgFailed(true)}
              alt=""
              style={{
                position: 'absolute', inset: '-5%',
                width: '110%', height: '110%',
                objectFit: 'cover',
                filter: 'blur(14px) brightness(0.28) saturate(1.3)',
              }}
            />
            <div style={{
              position: 'absolute', inset: 0,
              background: `radial-gradient(ellipse at 50% 40%, ${accent}30 0%, rgba(7,9,14,0.88) 65%)`,
            }} />
          </>
        )}

        <div style={{
          position: 'relative', zIndex: 1,
          padding: '40px 52px',
        }}>
          <div style={{ fontSize: 44, marginBottom: 14 }}>🏆</div>
          <div style={{
            fontSize: 'clamp(20px, 4vw, 30px)',
            fontWeight: 900,
            background: `linear-gradient(135deg, ${GOLD2} 0%, ${GOLD} 100%)`,
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            marginBottom: 8, lineHeight: 1.2,
          }}>
            {winner.title}
          </div>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,.55)', marginBottom: 4 }}>
            {winner.anime}
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,.3)' }}>
            {winner.artist}
          </div>
        </div>
      </motion.div>

      <div style={{ fontSize: 14, color: 'rgba(255,255,255,.38)', marginBottom: 24 }}>
        Le tournoi est terminé. La communauté a parlé.
      </div>

      <button
        onClick={onReset}
        style={{
          padding: '10px 26px', borderRadius: 10,
          border: '1px solid rgba(255,255,255,.12)',
          background: 'rgba(255,255,255,.03)',
          color: 'rgba(255,255,255,.38)',
          fontSize: 12, cursor: 'pointer',
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

function NoMatchReady() {
  return (
    <div style={{ textAlign: 'center', padding: '60px 20px' }}>
      <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.25 }}>⚔</div>
      <div style={{ color: 'rgba(255,255,255,.28)', fontSize: 14 }}>
        En attente du prochain duel.
      </div>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function TournamentPage() {
  const [tab,           setTab]           = useState('duel')
  const [rounds,        setRounds]        = useState(() => loadRoundsWithVersionCheck())
  const [personalVotes, setPersonalVotes] = useState(() => loadPersonalVotes(TOURNAMENT_CONFIG.id))
  const [voteCounts,    setVoteCounts]    = useState(() => loadVoteCounts(TOURNAMENT_CONFIG.id))
  const [isMobile,      setIsMobile]      = useState(() => window.innerWidth < 768)

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  useEffect(() => {
    saveState(TOURNAMENT_CONFIG.id, rounds)
  }, [rounds])

  const current  = useMemo(() => getCurrentMatch(rounds), [rounds])
  const progress = useMemo(() => getTournamentProgress(rounds), [rounds])
  const winner   = useMemo(() => getWinner(rounds), [rounds])

  const totalMatchesInRound = useMemo(() => {
    if (!current) return 0
    const round = rounds.find(r => r.id === current.round.id)
    return round?.matches?.filter(m => m.left && m.right).length || 0
  }, [current, rounds])

  const roundLabel = current
    ? current.round.label
    : winner
      ? 'Terminé'
      : 'En attente'

  const matchLabel = current
    ? `Duel ${current.match.position + 1} / ${totalMatchesInRound}`
    : ''

  function handleVote(side) {
    if (!current) return
    const matchId    = current.match.id
    const newPersonal = { ...personalVotes, [matchId]: side }
    setPersonalVotes(newPersonal)
    savePersonalVote(TOURNAMENT_CONFIG.id, matchId, side)
    const newVC = addVoteCount(TOURNAMENT_CONFIG.id, matchId, side)
    setVoteCounts({ ...newVC })
  }

  function handleNext() {
    if (!current) return
    const matchId = current.match.id
    const myVote  = personalVotes[matchId]
    if (!myVote) return

    const percents  = getVotePercents(voteCounts, matchId)
    const winnerId  = percents.leftN >= percents.rightN
      ? current.match.left?.id
      : current.match.right?.id

    const newRounds = advanceWinner(rounds, matchId, winnerId)
    setRounds(newRounds)

    if (getWinner(newRounds)) setTab('results')
  }

  function handleReset() {
    resetTournament(TOURNAMENT_CONFIG.id)
    const { rounds: fresh } = generateBracket(TOURNAMENT_CONFIG.participants)
    setRounds(fresh)
    setPersonalVotes({})
    setVoteCounts({})
    setTab('duel')
  }

  const isLastMatch = !current || !(getCurrentMatch(
    advanceWinner(rounds, current.match.id, current.match.left?.id)
  ))

  return (
    <div style={{
      minHeight: '100vh',
      background: BG,
      padding: 'clamp(20px, 4vw, 64px) clamp(16px, 4vw, 48px)',
      fontFamily: 'inherit',
    }}>
      <style>{T_CSS}</style>

      <div style={{ maxWidth: 1100, margin: '0 auto' }}>

        <TournamentHeader
          config={TOURNAMENT_CONFIG}
          progress={progress}
          roundLabel={roundLabel}
        />

        <TabBar
          active={tab}
          onChange={setTab}
          matchLabel={matchLabel}
        />

        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
          >
            {tab === 'duel' && (
              <>
                {winner ? (
                  <WinnerSection winner={winner} onReset={handleReset} />
                ) : current ? (
                  <TournamentDuel
                    round={current.round}
                    match={current.match}
                    totalMatchesInRound={totalMatchesInRound}
                    voteCounts={voteCounts}
                    personalVotes={personalVotes}
                    onVote={handleVote}
                    onNext={handleNext}
                    isLastMatch={isLastMatch}
                    isMobile={isMobile}
                  />
                ) : (
                  <NoMatchReady />
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
          marginTop: 64, paddingTop: 24,
          borderTop: '1px solid rgba(255,255,255,.05)',
          display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', flexWrap: 'wrap', gap: 12,
        }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,.2)', lineHeight: 1.65 }}>
            Les votes sont stockés localement dans ce navigateur.<br />
            Supabase peut être connecté pour des votes communautaires partagés.
          </div>
          <button
            onClick={() => { if (confirm('Réinitialiser le tournoi ? Tous les votes seront perdus.')) handleReset() }}
            style={{
              padding: '7px 16px', borderRadius: 8,
              border: '1px solid rgba(255,255,255,.1)',
              background: 'rgba(255,255,255,.025)',
              color: 'rgba(255,255,255,.28)',
              fontSize: 11, cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,.06)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,.025)'}
          >
            Réinitialiser le tournoi
          </button>
        </div>
      </div>
    </div>
  )
}
