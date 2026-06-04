import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext.jsx'
import { TOURNAMENT_CONFIGS } from '../data/tournament-data.js'
import { generateBracket } from '../lib/tournament.js'
import { createTournamentRoom } from '../lib/tournamentRooms.js'

const GOLD = '#d4a017'
const BG = '#07090e'
const PANEL = '#08090D'
const LINE = 'rgba(255,255,255,.09)'
const TEXT = '#f5efe4'
const MUTED = 'rgba(245,239,228,.62)'

const TABS = [
  { id: 'bracket', label: 'Bracket' },
  { id: 'palmares', label: 'Palmares' },
  { id: 'creer', label: 'Creer' },
]

function getGuestId() {
  if (typeof window === 'undefined') return `guest_${Date.now()}`
  const key = 'brams_tournament_guest_id'
  const existing = window.localStorage.getItem(key)
  if (existing) return existing
  const next = `guest_${Math.random().toString(36).slice(2, 10)}`
  window.localStorage.setItem(key, next)
  return next
}

function firstConfigId(configs) {
  return Object.keys(configs)[0] || 'ost'
}

export default function TournoiPage() {
  const navigate = useNavigate()
  const auth = useAuth() || {}
  const { isAuthenticated, displayName, avatarUrl, discordId, userId } = auth
  const tournamentOptions = useMemo(() => Object.entries(TOURNAMENT_CONFIGS), [])
  const defaultType = firstConfigId(TOURNAMENT_CONFIGS)

  const [tab, setTab] = useState('bracket')
  const [name, setName] = useState('')
  const [type, setType] = useState(defaultType)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const selectedConfig = TOURNAMENT_CONFIGS[type] || TOURNAMENT_CONFIGS[defaultType]
  const hostUserId = discordId || userId || getGuestId()
  const hostName = displayName || (isAuthenticated ? 'Pirate' : 'Invite')

  async function handleCreateTournament(event) {
    event.preventDefault()
    setError('')

    if (!name.trim()) {
      setError('Donne un nom au tournoi.')
      return
    }

    if (!selectedConfig?.participants?.length) {
      setError('Ce type de tournoi ne contient aucun participant.')
      return
    }

    setBusy(true)
    const bracket = generateBracket(selectedConfig.participants, `tournoi_${type}_${Date.now()}`)
    const { code, error: createError } = await createTournamentRoom({
      hostUserId,
      displayName: hostName,
      avatarUrl: avatarUrl || null,
      tournamentId: type,
      rounds: bracket,
    })
    setBusy(false)

    if (createError) {
      setError(`Creation impossible : ${createError}`)
      return
    }

    navigate(`/tournoi/salon?code=${code}`)
  }

  const inputStyle = {
    width: '100%',
    minHeight: 44,
    borderRadius: 10,
    border: `1px solid ${LINE}`,
    background: 'rgba(255,255,255,.035)',
    color: TEXT,
    padding: '0 12px',
    outline: 'none',
    fontSize: 14,
    letterSpacing: 0,
  }

  return (
    <main style={{
      minHeight: '100vh',
      background: BG,
      color: TEXT,
      padding: '92px 18px 38px',
      fontFamily: 'Inter, system-ui, -apple-system, Segoe UI, sans-serif',
    }}>
      <section style={{ maxWidth: 1120, margin: '0 auto' }}>
        <div style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: 18,
          flexWrap: 'wrap',
          marginBottom: 22,
        }}>
          <div>
            <p style={{
              margin: '0 0 8px',
              color: GOLD,
              fontSize: 12,
              fontWeight: 850,
              textTransform: 'uppercase',
              letterSpacing: 0,
            }}>
              Brams Score
            </p>
            <h1 style={{ margin: 0, fontSize: 'clamp(30px, 5vw, 54px)', letterSpacing: 0 }}>
              Tournois
            </h1>
          </div>

          <div style={{
            display: 'inline-flex',
            padding: 4,
            borderRadius: 12,
            border: `1px solid ${LINE}`,
            background: 'rgba(255,255,255,.035)',
          }}>
            {TABS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                style={{
                  border: 0,
                  borderRadius: 9,
                  background: tab === item.id ? 'rgba(212,160,23,.14)' : 'transparent',
                  color: tab === item.id ? GOLD : MUTED,
                  padding: '9px 13px',
                  fontSize: 13,
                  fontWeight: 850,
                  cursor: 'pointer',
                  letterSpacing: 0,
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {tab === 'bracket' && (
          <div style={{
            border: `1px solid ${LINE}`,
            borderRadius: 14,
            background: PANEL,
            padding: 22,
          }}>
            <h2 style={{ margin: '0 0 8px', fontSize: 22, letterSpacing: 0 }}>
              Modes disponibles
            </h2>
            <p style={{ margin: '0 0 18px', color: MUTED, lineHeight: 1.6 }}>
              Lance un salon temps reel depuis l'onglet Creer, avec les participants deja supportes par le site.
            </p>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 12,
            }}>
              {tournamentOptions.map(([id, config]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    setType(id)
                    setTab('creer')
                  }}
                  style={{
                    textAlign: 'left',
                    border: `1px solid ${LINE}`,
                    borderRadius: 12,
                    background: 'rgba(255,255,255,.025)',
                    color: TEXT,
                    padding: 16,
                    cursor: 'pointer',
                  }}
                >
                  <strong style={{ display: 'block', marginBottom: 7, color: GOLD, fontSize: 15 }}>
                    {config.title || id.toUpperCase()}
                  </strong>
                  <span style={{ display: 'block', color: MUTED, fontSize: 13, lineHeight: 1.45 }}>
                    {config.description || `${config.participants?.length || 0} participants`}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {tab === 'palmares' && (
          <div style={{
            border: `1px solid ${LINE}`,
            borderRadius: 14,
            background: PANEL,
            padding: 22,
          }}>
            <h2 style={{ margin: '0 0 8px', fontSize: 22, letterSpacing: 0 }}>
              Palmares
            </h2>
            <p style={{ margin: 0, color: MUTED, lineHeight: 1.6 }}>
              Les salons temps reel conservent le bracket pendant la session. Aucun historique structure n'est expose par les libs actuelles.
            </p>
          </div>
        )}

        {tab === 'creer' && (
          <form
            onSubmit={handleCreateTournament}
            style={{
              border: `1px solid ${LINE}`,
              borderRadius: 14,
              background: PANEL,
              padding: 22,
              display: 'grid',
              gap: 16,
            }}
          >
            <div>
              <h2 style={{ margin: '0 0 8px', fontSize: 24, letterSpacing: 0 }}>
                Creer un tournoi
              </h2>
              <p style={{ margin: 0, color: MUTED, lineHeight: 1.6 }}>
                Le salon cree redirige vers la page multi et utilise les types deja configures.
              </p>
            </div>

            <label style={{ display: 'grid', gap: 8, color: MUTED, fontSize: 13, fontWeight: 800 }}>
              Nom du tournoi
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Grand tournoi Brams"
                style={inputStyle}
              />
            </label>

            <label style={{ display: 'grid', gap: 8, color: MUTED, fontSize: 13, fontWeight: 800 }}>
              Type
              <select
                value={type}
                onChange={(event) => setType(event.target.value)}
                style={{ ...inputStyle, cursor: 'pointer' }}
              >
                {tournamentOptions.map(([id, config]) => (
                  <option key={id} value={id}>
                    {config.title || id.toUpperCase()}
                  </option>
                ))}
              </select>
            </label>

            <div style={{
              border: `1px solid ${LINE}`,
              borderRadius: 12,
              padding: 14,
              background: 'rgba(255,255,255,.025)',
              display: 'grid',
              gap: 6,
            }}>
              <span style={{ color: GOLD, fontSize: 13, fontWeight: 850 }}>
                {selectedConfig?.title || type.toUpperCase()}
              </span>
              <span style={{ color: MUTED, fontSize: 13, lineHeight: 1.5 }}>
                {selectedConfig?.participants?.length || 0} participants. {selectedConfig?.description || 'Bracket genere automatiquement.'}
              </span>
            </div>

            {error && (
              <div style={{
                border: '1px solid rgba(255,120,120,.28)',
                borderRadius: 10,
                background: 'rgba(90,24,24,.22)',
                color: 'rgba(255,210,210,.95)',
                padding: '11px 12px',
                fontSize: 13,
                fontWeight: 750,
              }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="submit"
                disabled={busy}
                style={{
                  minHeight: 42,
                  borderRadius: 10,
                  border: `1px solid rgba(212,160,23,${busy ? '.18' : '.38'})`,
                  background: busy ? 'rgba(212,160,23,.08)' : 'rgba(212,160,23,.16)',
                  color: GOLD,
                  padding: '0 16px',
                  fontSize: 13,
                  fontWeight: 900,
                  cursor: busy ? 'wait' : 'pointer',
                  letterSpacing: 0,
                }}
              >
                {busy ? 'Creation...' : 'Creer le salon'}
              </button>
            </div>
          </form>
        )}
      </section>
    </main>
  )
}
