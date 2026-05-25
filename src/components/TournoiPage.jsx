import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext.jsx'

const G = {
  bg: '#08090D',
  panel: 'rgba(14,15,22,.96)',
  card: 'rgba(20,22,32,.88)',
  border: 'rgba(255,255,255,.07)',
  gold: '#BFA46A',
  goldDim: 'rgba(191,164,106,.18)',
  goldBorder: 'rgba(191,164,106,.28)',
  rose: '#a0445c',
  text: '#e8e4de',
  muted: 'rgba(232,228,222,.38)',
  success: '#4caf88',
}

const MOCK_BRACKET = [
  {
    round: 1, label: 'Quarts de finale',
    matchups: [
      { id: 1, a: { name: 'Monkey D. Luffy', emoji: '🏴‍☠️', votes: 312 }, b: { name: 'Roronoa Zoro', emoji: '⚔️', votes: 287 }, done: true, winner: 'a' },
      { id: 2, a: { name: 'Trafalgar Law', emoji: '💙', votes: 198 }, b: { name: 'Portgas D. Ace', emoji: '🔥', votes: 241 }, done: true, winner: 'b' },
      { id: 3, a: { name: 'Boa Hancock', emoji: '🐍', votes: 0 }, b: { name: 'Nami', emoji: '🍊', votes: 0 }, done: false, winner: null },
      { id: 4, a: { name: 'Shanks', emoji: '🌊', votes: 0 }, b: { name: 'Kaido', emoji: '🐉', votes: 0 }, done: false, winner: null },
    ]
  },
  {
    round: 2, label: 'Demi-finales',
    matchups: [
      { id: 5, a: { name: 'Luffy', emoji: '🏴‍☠️', votes: 0 }, b: { name: 'Ace', emoji: '🔥', votes: 0 }, done: false, winner: null },
      { id: 6, a: { name: '???', emoji: '❓', votes: 0 }, b: { name: '???', emoji: '❓', votes: 0 }, done: false, winner: null },
    ]
  },
  {
    round: 3, label: 'Finale',
    matchups: [
      { id: 7, a: { name: '???', emoji: '❓', votes: 0 }, b: { name: '???', emoji: '❓', votes: 0 }, done: false, winner: null },
    ]
  },
]

const PAST_TOURNAMENTS = [
  { id: 1, title: 'Tournoi des Capitaines', winner: 'Monkey D. Luffy', emoji: '🏆', date: 'Mars 2026', participants: 128 },
  { id: 2, title: 'Duel des Épéistes', winner: 'Roronoa Zoro', emoji: '⚔️', date: 'Février 2026', participants: 64 },
]

function MatchCard({ matchup, onVote, userVote }) {
  const total = (matchup.a.votes || 0) + (matchup.b.votes || 0)
  const pctA = total > 0 ? Math.round((matchup.a.votes / total) * 100) : 50
  const pctB = total > 0 ? Math.round((matchup.b.votes / total) * 100) : 50

  return (
    <div style={{
      background: G.card,
      border: `1px solid ${matchup.done ? G.goldBorder : G.border}`,
      borderRadius: 14,
      padding: '16px 18px',
      width: 280,
      position: 'relative',
      boxShadow: matchup.done ? `0 0 20px rgba(191,164,106,.06)` : 'none',
    }}>
      {matchup.done && (
        <div style={{ position: 'absolute', top: 8, right: 10, fontSize: 10, color: G.gold, fontWeight: 700, letterSpacing: '.06em', opacity: 0.7 }}>TERMINÉ</div>
      )}
      {!matchup.done && matchup.a.name !== '???' && (
        <div style={{ position: 'absolute', top: 8, right: 10, fontSize: 10, color: G.success, fontWeight: 700, letterSpacing: '.06em' }}>EN COURS</div>
      )}

      {['a', 'b'].map((side, i) => {
        const char = matchup[side]
        const isWinner = matchup.done && matchup.winner === side
        const isLoser = matchup.done && matchup.winner !== null && matchup.winner !== side
        const voted = userVote === side
        const pct = side === 'a' ? pctA : pctB

        return (
          <div key={side}>
            {i === 1 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '10px 0', opacity: 0.4 }}>
                <div style={{ flex: 1, height: 1, background: G.border }} />
                <span style={{ fontSize: 9, color: G.muted, letterSpacing: '.1em', fontWeight: 700 }}>VS</span>
                <div style={{ flex: 1, height: 1, background: G.border }} />
              </div>
            )}
            <button
              onClick={() => !matchup.done && char.name !== '???' && onVote(matchup.id, side)}
              disabled={matchup.done || char.name === '???'}
              style={{
                width: '100%', cursor: matchup.done || char.name === '???' ? 'default' : 'pointer',
                padding: '8px 10px', borderRadius: 9, textAlign: 'left',
                background: isWinner ? 'rgba(191,164,106,.08)' : voted ? 'rgba(191,164,106,.05)' : 'transparent',
                border: `1px solid ${isWinner ? G.goldBorder : voted ? 'rgba(191,164,106,.2)' : 'transparent'}`,
                transition: 'all .18s',
                opacity: isLoser ? 0.45 : 1,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 22 }}>{char.emoji}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: isWinner ? G.gold : G.text }}>{char.name}</span>
                    {isWinner && <span style={{ fontSize: 10 }}>👑</span>}
                  </div>
                  {matchup.done && total > 0 && (
                    <div style={{ marginTop: 5 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                        <span style={{ fontSize: 10, color: G.muted }}>{char.votes} votes</span>
                        <span style={{ fontSize: 10, color: isWinner ? G.gold : G.muted, fontWeight: 700 }}>{pct}%</span>
                      </div>
                      <div style={{ height: 3, background: G.border, borderRadius: 2 }}>
                        <div style={{ height: '100%', width: `${pct}%`, borderRadius: 2, background: isWinner ? G.gold : 'rgba(232,228,222,.2)', transition: 'width .6s ease' }} />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </button>
          </div>
        )
      })}
    </div>
  )
}

function ConnectorLine({ count }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-around', height: count * 140, padding: '70px 0' }}>
      {Array.from({ length: Math.floor(count / 2) }).map((_, i) => (
        <div key={i} style={{ width: 32, height: 140, borderTop: `1px solid ${G.border}`, borderRight: `1px solid ${G.border}`, borderBottom: `1px solid ${G.border}`, borderRadius: '0 8px 8px 0' }} />
      ))}
    </div>
  )
}

function BracketView({ bracket, votes, onVote }) {
  return (
    <div style={{ overflowX: 'auto', paddingBottom: 20 }}>
      <div style={{ display: 'flex', gap: 0, alignItems: 'flex-start', minWidth: 'max-content' }}>
        {bracket.map((round, rIdx) => (
          <div key={rIdx} style={{ display: 'flex', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 11, color: G.gold, fontWeight: 700, letterSpacing: '.08em', textAlign: 'center', marginBottom: 16, textTransform: 'uppercase' }}>
                {round.label}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: round.round === 1 ? 24 : round.round === 2 ? 88 : 152 }}>
                {round.matchups.map((matchup) => (
                  <MatchCard
                    key={matchup.id}
                    matchup={matchup}
                    onVote={onVote}
                    userVote={votes[matchup.id]}
                  />
                ))}
              </div>
            </div>
            {rIdx < bracket.length - 1 && (
              <ConnectorLine count={round.matchups.length} />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function TournoiPage() {
  const navigate = useNavigate()
  const { isAuthenticated, displayName } = useAuth()
  const [votes, setVotes] = useState({})
  const [tab, setTab] = useState('bracket') // bracket | palmares | creer
  const [toast, setToast] = useState(null)
  const [bracket, setBracket] = useState(MOCK_BRACKET)

  useEffect(() => {
    const saved = localStorage.getItem('brams_tournoi_votes')
    if (saved) {
      try { setVotes(JSON.parse(saved)) } catch { /* noop */ }
    }
  }, [])

  function handleVote(matchId, side) {
    if (!isAuthenticated) {
      document.dispatchEvent(new CustomEvent('open-auth-modal'))
      return
    }
    if (votes[matchId]) {
      showToast('Tu as déjà voté pour ce match !')
      return
    }
    const next = { ...votes, [matchId]: side }
    setVotes(next)
    localStorage.setItem('brams_tournoi_votes', JSON.stringify(next))
    setBracket(prev => prev.map(round => ({
      ...round,
      matchups: round.matchups.map(m => {
        if (m.id !== matchId) return m
        return {
          ...m,
          [side]: { ...m[side], votes: (m[side].votes || 0) + 1 }
        }
      })
    })))
    showToast('Vote enregistré ✓')
  }

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(null), 2400)
  }

  const TABS = [
    { id: 'bracket', label: 'Bracket en cours' },
    { id: 'palmares', label: 'Palmarès' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: G.bg, color: G.text, paddingTop: 80 }}>
      {/* Hero */}
      <div style={{
        background: `linear-gradient(135deg, rgba(191,164,106,.06) 0%, transparent 60%)`,
        borderBottom: `1px solid ${G.border}`,
        padding: '48px 32px 36px',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 13, color: G.gold, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', marginBottom: 12, opacity: 0.8 }}>
          Brams Community
        </div>
        <h1 style={{ fontSize: 'clamp(28px, 5vw, 48px)', fontWeight: 900, margin: 0, letterSpacing: '-.01em', lineHeight: 1.1 }}>
          Tournoi <span style={{ color: G.gold }}>des Légendes</span>
        </h1>
        <p style={{ marginTop: 14, fontSize: 14, color: G.muted, maxWidth: 500, margin: '14px auto 0' }}>
          Vote pour tes personnages favoris et propulse-les vers la victoire. Le champion est décidé par la communauté.
        </p>

        <div style={{ display: 'flex', gap: 20, justifyContent: 'center', marginTop: 28, flexWrap: 'wrap' }}>
          {[
            { label: 'Participants', value: '8', icon: '👥' },
            { label: 'Votes totaux', value: '1 038', icon: '🗳️' },
            { label: 'Rounds restants', value: '2', icon: '⚔️' },
            { label: 'Fin du vote', value: '30 mai', icon: '⏳' },
          ].map(s => (
            <div key={s.label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 20, marginBottom: 4 }}>{s.icon}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: G.gold }}>{s.value}</div>
              <div style={{ fontSize: 11, color: G.muted, letterSpacing: '.04em' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, padding: '20px 32px 0', borderBottom: `1px solid ${G.border}`, maxWidth: 1200, margin: '0 auto' }}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '10px 18px', fontSize: 13, fontWeight: 700,
              color: tab === t.id ? G.gold : G.muted,
              borderBottom: `2px solid ${tab === t.id ? G.gold : 'transparent'}`,
              letterSpacing: '.03em', transition: 'color .15s',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 32px 80px' }}>

        {tab === 'bracket' && (
          <div>
            {!isAuthenticated && (
              <div style={{
                background: G.goldDim,
                border: `1px solid ${G.goldBorder}`,
                borderRadius: 12, padding: '14px 20px',
                marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12,
              }}>
                <span style={{ fontSize: 18 }}>🔒</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: G.gold }}>Connecte-toi pour voter</div>
                  <div style={{ fontSize: 12, color: G.muted }}>Seuls les membres peuvent voter dans les tournois.</div>
                </div>
                <button
                  onClick={() => document.dispatchEvent(new CustomEvent('open-auth-modal'))}
                  style={{
                    marginLeft: 'auto', background: G.gold, border: 'none', borderRadius: 8,
                    padding: '8px 16px', fontSize: 12, fontWeight: 700, color: '#08090D',
                    cursor: 'pointer',
                  }}
                >
                  Se connecter
                </button>
              </div>
            )}

            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 11, color: G.muted, marginBottom: 6 }}>Instructions</div>
              <div style={{ fontSize: 13, color: G.text, lineHeight: 1.6 }}>
                Clique sur un personnage pour voter. Les matchs en attente se débloquent après la fin des votes du round précédent.
                Un seul vote par match et par compte.
              </div>
            </div>

            <BracketView bracket={bracket} votes={votes} onVote={handleVote} />
          </div>
        )}

        {tab === 'palmares' && (
          <div>
            <div style={{ fontSize: 13, color: G.muted, marginBottom: 24 }}>Historique des tournois passés</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {PAST_TOURNAMENTS.map(t => (
                <div key={t.id} style={{
                  background: G.card, border: `1px solid ${G.border}`,
                  borderRadius: 14, padding: '20px 24px',
                  display: 'flex', alignItems: 'center', gap: 20,
                }}>
                  <span style={{ fontSize: 36 }}>{t.emoji}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 16, fontWeight: 800, color: G.text }}>{t.title}</div>
                    <div style={{ fontSize: 13, color: G.muted, marginTop: 3 }}>{t.date} · {t.participants} participants</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 11, color: G.gold, fontWeight: 700, letterSpacing: '.06em', marginBottom: 4 }}>CHAMPION</div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: G.text }}>👑 {t.winner}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 32, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(20,22,32,.97)', border: `1px solid ${G.goldBorder}`,
          borderRadius: 12, padding: '12px 24px', fontSize: 13, fontWeight: 600,
          color: G.text, zIndex: 9999, boxShadow: '0 8px 32px rgba(0,0,0,.5)',
          whiteSpace: 'nowrap',
        }}>
          {toast}
        </div>
      )}
    </div>
  )
}
