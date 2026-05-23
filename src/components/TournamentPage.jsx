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

// ── Design tokens ──────────────────────────────────────────────────────────
const BG    = '#08090D'
const GOLD  = '#d4a017'
const GOLD2 = '#f0c040'

const T_CSS = `
  @keyframes t_glow { 0%,100%{opacity:.6} 50%{opacity:1} }
  @keyframes t_pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.04)} }
`

// ── Tab nav ────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'duel',      label: 'Duel',       icon: '⚔️' },
  { id: 'bracket',   label: 'Bracket',    icon: '🏆' },
  { id: 'results',   label: 'Résultats',  icon: '📊' },
]

function TabBar({ active, onChange, roundLabel, matchLabel }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, marginBottom: 32 }}>
      {/* Current round badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
        <span style={{
          background: 'rgba(212,160,23,.1)', border: '1px solid rgba(212,160,23,.25)',
          borderRadius: 20, padding: '4px 14px',
          fontSize: 12, color: GOLD, fontWeight: 700, letterSpacing: '0.08em',
        }}>
          {roundLabel}
        </span>
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,.3)' }}>{matchLabel}</span>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex', gap: 4,
        background: 'rgba(255,255,255,.04)',
        border: '1px solid rgba(255,255,255,.07)',
        borderRadius: 12, padding: 4,
      }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            style={{
              padding: '9px 22px',
              borderRadius: 9, border: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: 700,
              background: active === tab.id
                ? 'rgba(212,160,23,.12)'
                : 'transparent',
              color: active === tab.id ? GOLD : 'rgba(255,255,255,.45)',
              borderColor: active === tab.id ? 'rgba(212,160,23,.3)' : 'transparent',
              outline: active === tab.id ? `1px solid rgba(212,160,23,.25)` : 'none',
              transition: 'all 0.18s',
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            <span style={{ fontSize: 14 }}>{tab.icon}</span>
            <span style={{ display: 'none' }}>{tab.label}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Hero header ────────────────────────────────────────────────────────────
function TournamentHeader({ config, progress }) {
  return (
    <div style={{ textAlign: 'center', marginBottom: 40, position: 'relative', zIndex: 1 }}>
      {/* Stars background hint */}
      <div style={{
        position: 'absolute', inset: '-40px -80px', zIndex: -1,
        background: 'radial-gradient(ellipse 60% 100% at 50% 0%, rgba(212,160,23,0.07) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{ fontSize: 11, color: 'rgba(255,255,255,.3)', letterSpacing: '0.15em', marginBottom: 8 }}>
        BRAMS COMMUNITY · {config.edition.toUpperCase()}
      </div>

      <h1 style={{
        fontSize: 'clamp(26px, 5vw, 44px)',
        fontWeight: 900, margin: '0 0 8px',
        background: `linear-gradient(135deg, ${GOLD2} 0%, ${GOLD} 60%, rgba(191,164,106,0.8) 100%)`,
        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        letterSpacing: '-0.01em', lineHeight: 1.1,
      }}>
        {config.title}
      </h1>

      <p style={{ fontSize: 14, color: 'rgba(255,255,255,.4)', margin: '0 0 20px', maxWidth: 520, marginInline: 'auto', lineHeight: 1.5 }}>
        {config.description}
      </p>

      {/* Stats row */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 28, flexWrap: 'wrap', marginBottom: 20 }}>
        {[
          { label: 'Participants', value: config.participants.length },
          { label: 'Format', value: 'Élimination directe' },
          { label: 'Matchs joués', value: `${progress.done} / ${progress.total}` },
        ].map(s => (
          <div key={s.label} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: 'rgba(255,255,255,.9)' }}>{s.value}</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,.3)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Global progress bar */}
      <div style={{ maxWidth: 400, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'rgba(255,255,255,.3)', marginBottom: 6 }}>
          <span>Progression globale</span>
          <span>{progress.pct}%</span>
        </div>
        <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,.07)', overflow: 'hidden' }}>
          <motion.div
            initial={false}
            animate={{ width: `${progress.pct}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            style={{ height: '100%', background: `linear-gradient(90deg, ${GOLD}, ${GOLD2})` }}
          />
        </div>
      </div>
    </div>
  )
}

// Version stamp — bump when participants list changes to auto-reset saved state.
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

// ── Main page ──────────────────────────────────────────────────────────────
export default function TournamentPage() {
  const [tab,           setTab]          = useState('duel')
  const [rounds,        setRounds]       = useState(() => loadRoundsWithVersionCheck())
  const [personalVotes, setPersonalVotes] = useState(() => loadPersonalVotes(TOURNAMENT_CONFIG.id))
  const [voteCounts,    setVoteCounts]    = useState(() => loadVoteCounts(TOURNAMENT_CONFIG.id))
  const [isMobile,      setIsMobile]      = useState(() => window.innerWidth < 768)

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  // Persist whenever rounds change
  useEffect(() => {
    saveState(TOURNAMENT_CONFIG.id, rounds)
  }, [rounds])

  const current  = useMemo(() => getCurrentMatch(rounds), [rounds])
  const progress = useMemo(() => getTournamentProgress(rounds), [rounds])
  const winner   = useMemo(() => getWinner(rounds), [rounds])

  // Find total matches in current round
  const totalMatchesInRound = useMemo(() => {
    if (!current) return 0
    const round = rounds.find(r => r.id === current.round.id)
    return round?.matches?.filter(m => m.left && m.right).length || 0
  }, [current, rounds])

  const roundLabel = current
    ? current.round.label
    : winner
      ? 'Tournoi terminé'
      : 'En attente'

  const matchLabel = current
    ? `Duel ${current.match.position + 1} / ${totalMatchesInRound}`
    : ''

  function handleVote(side) {
    if (!current) return
    const matchId = current.match.id

    // Update personal vote
    const newPersonal = { ...personalVotes, [matchId]: side }
    setPersonalVotes(newPersonal)
    savePersonalVote(TOURNAMENT_CONFIG.id, matchId, side)

    // Update aggregate count
    const newVC = addVoteCount(TOURNAMENT_CONFIG.id, matchId, side)
    setVoteCounts({ ...newVC })
  }

  function handleNext() {
    if (!current) return
    const matchId   = current.match.id
    const myVote    = personalVotes[matchId]
    if (!myVote) return

    // Determine winner from vote counts (or personal vote if no counts)
    const percents  = getVotePercents(voteCounts, matchId)
    const winnerId  = percents.leftN >= percents.rightN
      ? current.match.left?.id
      : current.match.right?.id

    const newRounds = advanceWinner(rounds, matchId, winnerId)
    setRounds(newRounds)

    // If we just finished, switch to bracket view
    const newWinner = getWinner(newRounds)
    if (newWinner) setTab('results')
  }

  function handleReset() {
    resetTournament(TOURNAMENT_CONFIG.id)
    const { rounds: fresh } = generateBracket(TOURNAMENT_CONFIG.participants)
    setRounds(fresh)
    setPersonalVotes({})
    setVoteCounts({})
    setTab('duel')
  }

  const isLastMatch = !current || (
    rounds.every(r => r.id === current.round.id || r.matches.every(m => m.status === 'closed' || (!m.left && !m.right)))
    && current.round.matches.filter(m => m.left && m.right).every((m, i, arr) => i <= current.match.position)
  )

  return (
    <div style={{
      minHeight: '100vh',
      background: BG,
      padding: 'clamp(20px, 4vw, 60px) clamp(16px, 4vw, 48px)',
      fontFamily: 'inherit',
    }}>
      <style>{T_CSS}</style>

      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <TournamentHeader config={TOURNAMENT_CONFIG} progress={progress} />

        <TabBar
          active={tab}
          onChange={setTab}
          roundLabel={roundLabel}
          matchLabel={matchLabel}
        />

        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
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
                    isLastMatch={!getCurrentMatch(
                      advanceWinner(rounds, current.match.id, current.match.left?.id)
                    )}
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

        {/* Admin / Reset */}
        <div style={{ marginTop: 60, paddingTop: 28, borderTop: '1px solid rgba(255,255,255,.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,.25)', lineHeight: 1.6 }}>
              Les votes sont stockés localement dans ce navigateur.<br />
              Supabase peut être connecté pour des votes communautaires partagés.
            </div>
          </div>
          <button
            onClick={() => { if (confirm('Réinitialiser le tournoi ? Tous les votes seront perdus.')) handleReset() }}
            style={{
              padding: '8px 18px', borderRadius: 8,
              border: '1px solid rgba(255,255,255,.12)',
              background: 'rgba(255,255,255,.03)',
              color: 'rgba(255,255,255,.35)',
              fontSize: 12, cursor: 'pointer',
            }}
          >
            Réinitialiser le tournoi
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Final winner screen ────────────────────────────────────────────────────
function WinnerSection({ winner, onReset }) {
  return (
    <div style={{ textAlign: 'center', padding: '40px 20px' }}>
      <div style={{ fontSize: 11, letterSpacing: '0.15em', color: 'rgba(255,255,255,.35)', marginBottom: 16 }}>
        VAINQUEUR DU TOURNOI
      </div>
      <div style={{
        display: 'inline-block',
        borderRadius: 20,
        border: `1px solid ${GOLD}`,
        background: 'rgba(212,160,23,0.07)',
        padding: '36px 48px',
        marginBottom: 28,
        animation: 't_glow 3s ease-in-out infinite',
      }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🏆</div>
        <div style={{ fontSize: 'clamp(22px, 4vw, 36px)', fontWeight: 900, color: GOLD2, marginBottom: 6 }}>
          {winner.title}
        </div>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,.55)', marginBottom: 4 }}>
          {winner.anime}
        </div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,.3)' }}>
          {winner.artist}
        </div>
      </div>
      <div style={{ fontSize: 14, color: 'rgba(255,255,255,.4)', marginBottom: 24 }}>
        Le tournoi est terminé. La communauté a parlé.
      </div>
    </div>
  )
}

function NoMatchReady() {
  return (
    <div style={{ textAlign: 'center', padding: '60px 20px', color: 'rgba(255,255,255,.3)', fontSize: 14 }}>
      En attente du prochain duel.
    </div>
  )
}
