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
import DuelArena         from './tournament/DuelArena.jsx'
import TournamentBracket from './tournament/TournamentBracket.jsx'
import TournamentResults from './tournament/TournamentResults.jsx'

const BG    = '#07090e'
const GOLD  = '#d4a017'
const GOLD2 = '#f0c040'

const T_CSS = `@keyframes t_glow { 0%,100%{opacity:.5} 50%{opacity:1} }`

// ── Version check ──────────────────────────────────────────────────────────
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

// ── Stats pill ─────────────────────────────────────────────────────────────
function Pill({ label, value, gold }) {
  return (
    <div style={{
      padding: '10px 22px',
      borderRadius: 12,
      background: gold ? 'rgba(212,160,23,.09)' : 'rgba(255,255,255,.04)',
      border: `1px solid ${gold ? 'rgba(212,160,23,.28)' : 'rgba(255,255,255,.08)'}`,
      textAlign: 'center', flexShrink: 0,
    }}>
      <div style={{
        fontSize: 19, fontWeight: 800,
        color: gold ? GOLD2 : 'rgba(255,255,255,.9)',
        lineHeight: 1,
      }}>
        {value}
      </div>
      <div style={{
        fontSize: 9, color: 'rgba(255,255,255,.28)',
        letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 5,
      }}>
        {label}
      </div>
    </div>
  )
}

// ── Hero ───────────────────────────────────────────────────────────────────
function TournamentHero({ config, progress, roundLabel, matchLabel }) {
  return (
    <div style={{
      position: 'relative', textAlign: 'center', paddingBottom: 44,
    }}>
      <div style={{
        position: 'absolute', inset: '-40px -200px 0', zIndex: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 80% 90% at 50% 0%, rgba(212,160,23,.07) 0%, transparent 55%)',
      }} />

      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{
          fontSize: 10, color: 'rgba(255,255,255,.25)',
          letterSpacing: '0.2em', marginBottom: 14, textTransform: 'uppercase',
        }}>
          Brams Community · OST Tournament
        </div>

        <h1 style={{
          fontSize: 'clamp(38px, 6.5vw, 80px)',
          fontWeight: 900, margin: '0 0 14px',
          background: `linear-gradient(135deg, ${GOLD2} 0%, ${GOLD} 50%, rgba(191,164,106,.75) 100%)`,
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          letterSpacing: '-0.02em', lineHeight: 1,
        }}>
          {config.title}
        </h1>

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
              style={{ height: '100%', background: `linear-gradient(90deg, ${GOLD}, ${GOLD2})` }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Tabs ───────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'duel',    label: 'Duel',     icon: '⚔' },
  { id: 'bracket', label: 'Bracket',  icon: '🏆' },
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
              background: 'rgba(212,160,23,.08)',
              border: '1px solid rgba(212,160,23,.2)',
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
                background: active === tab.id ? 'rgba(212,160,23,.12)' : 'transparent',
                color: active === tab.id ? GOLD : 'rgba(255,255,255,.38)',
                outline: active === tab.id ? `1px solid rgba(212,160,23,.22)` : 'none',
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
          boxShadow: `0 0 80px rgba(212,160,23,.1), 0 0 0 1px rgba(212,160,23,.12)`,
          animation: 't_glow 3.5s ease-in-out infinite',
          maxWidth: 500, width: '100%',
        }}
      >
        {showThumb && (
          <>
            <img
              src={thumb}
              onLoad={handleLoad}
              onError={() => setImgFailed(true)}
              alt=""
              style={{
                position: 'absolute', inset: '-5%',
                width: '110%', height: '110%',
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
            background: `linear-gradient(135deg, ${GOLD2}, ${GOLD})`,
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

function NoMatchReady() {
  return (
    <div style={{ textAlign: 'center', padding: '60px 20px' }}>
      <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.2 }}>⚔</div>
      <div style={{ color: 'rgba(255,255,255,.28)', fontSize: 14 }}>
        En attente du prochain duel.
      </div>
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────
export default function TournamentPage() {
  const [tab,           setTab]           = useState('duel')
  const [rounds,        setRounds]        = useState(() => loadRoundsWithVersionCheck())
  const [personalVotes, setPersonalVotes] = useState(() => loadPersonalVotes(TOURNAMENT_CONFIG.id))
  const [voteCounts,    setVoteCounts]    = useState(() => loadVoteCounts(TOURNAMENT_CONFIG.id))
  const [isMobile,      setIsMobile]      = useState(() => window.innerWidth < 768)

  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
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

  const roundLabel = current ? current.round.label : winner ? 'Terminé' : 'En attente'
  const matchLabel = current ? `${current.match.position + 1} / ${totalMatchesInRound}` : ''

  function handleVote(side) {
    if (!current) return
    const matchId     = current.match.id
    const newPersonal = { ...personalVotes, [matchId]: side }
    setPersonalVotes(newPersonal)
    savePersonalVote(TOURNAMENT_CONFIG.id, matchId, side)
    const newVC = addVoteCount(TOURNAMENT_CONFIG.id, matchId, side)
    setVoteCounts({ ...newVC })
  }

  function handleNext() {
    if (!current) return
    const matchId = current.match.id
    if (!personalVotes[matchId]) return
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
      fontFamily: 'inherit',
    }}>
      <style>{T_CSS}</style>

      {/* Inner container — wide */}
      <div style={{
        maxWidth: 1440,
        margin: '0 auto',
        padding: 'clamp(24px, 4vw, 64px) clamp(16px, 4vw, 56px)',
      }}>

        <TournamentHero
          config={TOURNAMENT_CONFIG}
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
                  <WinnerSection winner={winner} onReset={handleReset} />
                ) : current ? (
                  <DuelArena
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
          marginTop: 72, paddingTop: 24,
          borderTop: '1px solid rgba(255,255,255,.05)',
          display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', flexWrap: 'wrap', gap: 12,
        }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,.18)', lineHeight: 1.7 }}>
            Les votes sont stockés localement dans ce navigateur.<br />
            Supabase peut être connecté pour des votes communautaires partagés.
          </div>
          <button
            onClick={() => { if (confirm('Réinitialiser le tournoi ? Tous les votes seront perdus.')) handleReset() }}
            style={{
              padding: '7px 16px', borderRadius: 8,
              border: '1px solid rgba(255,255,255,.1)',
              background: 'rgba(255,255,255,.025)',
              color: 'rgba(255,255,255,.25)', fontSize: 11, cursor: 'pointer',
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
