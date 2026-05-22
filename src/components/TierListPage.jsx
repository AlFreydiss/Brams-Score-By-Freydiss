import { useEffect, useMemo, useState } from 'react'

const STORAGE_KEY = 'brams_tier_list_v1'

const TIERS = [
  { id: 's', label: 'S', color: '#facc15' },
  { id: 'a', label: 'A', color: '#22c55e' },
  { id: 'b', label: 'B', color: '#38bdf8' },
  { id: 'c', label: 'C', color: '#a78bfa' },
  { id: 'd', label: 'D', color: '#fb7185' },
]

const DEFAULT_ITEMS = [
  'One Piece',
  'Dragon Ball Super',
  'Naruto Shippuden',
  'Tokyo Ghoul',
  'Code Geass',
  'Jujutsu Kaisen',
  'Attack on Titan',
  'Demon Slayer',
  'Black Clover',
  'My Hero Academia',
  'Blue Lock',
  'Dr. Stone',
  'Solo Leveling',
  'Fire Force',
  'The Promised Neverland',
  'Kingdom',
  'Seven Deadly Sins',
].map((name, index) => ({ id: `anime-${index}`, name }))

function createDefaultBoard() {
  return {
    s: ['anime-0', 'anime-1'],
    a: ['anime-2', 'anime-5', 'anime-6'],
    b: ['anime-7', 'anime-8', 'anime-9', 'anime-10'],
    c: ['anime-3', 'anime-4', 'anime-11', 'anime-12'],
    d: ['anime-13', 'anime-14', 'anime-15', 'anime-16'],
  }
}

function loadBoard() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')
    if (saved && typeof saved === 'object') return saved
  } catch {
    /* ignore broken local storage */
  }
  return createDefaultBoard()
}

function moveItem(board, itemId, targetTierId) {
  const next = Object.fromEntries(
    TIERS.map(tier => [tier.id, (board[tier.id] || []).filter(id => id !== itemId)])
  )
  next[targetTierId] = [...(next[targetTierId] || []), itemId]
  return next
}

export default function TierListPage() {
  const [board, setBoard] = useState(loadBoard)
  const [selectedId, setSelectedId] = useState(null)
  const itemsById = useMemo(() => Object.fromEntries(DEFAULT_ITEMS.map(item => [item.id, item])), [])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(board))
  }, [board])

  function handleDrop(event, tierId) {
    const itemId = event.dataTransfer.getData('text/plain')
    if (!itemId) return
    setBoard(current => moveItem(current, itemId, tierId))
    setSelectedId(null)
  }

  function handleTierClick(tierId) {
    if (!selectedId) return
    setBoard(current => moveItem(current, selectedId, tierId))
    setSelectedId(null)
  }

  return (
    <main style={{ minHeight: '100vh', background: '#07090e', color: '#fff', padding: '86px 20px 120px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <header style={{ display: 'flex', alignItems: 'end', justifyContent: 'space-between', gap: 24, marginBottom: 28, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.26em', textTransform: 'uppercase', color: '#d4a017', marginBottom: 10 }}>
              Brams Community
            </div>
            <h1 style={{ fontFamily: 'var(--display)', fontSize: 'clamp(38px,7vw,72px)', lineHeight: 1, margin: 0 }}>
              Tier List Anime
            </h1>
          </div>
          <button
            onClick={() => { setBoard(createDefaultBoard()); setSelectedId(null) }}
            style={{
              border: '1px solid rgba(255,255,255,0.14)',
              background: 'rgba(255,255,255,0.05)',
              color: 'rgba(255,255,255,0.78)',
              borderRadius: 8,
              padding: '10px 16px',
              cursor: 'pointer',
              fontWeight: 800,
            }}
          >
            Reset
          </button>
        </header>

        <section style={{ display: 'grid', gap: 10 }}>
          {TIERS.map(tier => (
            <div
              key={tier.id}
              onDragOver={event => event.preventDefault()}
              onDrop={event => handleDrop(event, tier.id)}
              onClick={() => handleTierClick(tier.id)}
              style={{
                display: 'grid',
                gridTemplateColumns: '76px 1fr',
                minHeight: 92,
                border: `1px solid ${tier.color}33`,
                background: 'rgba(255,255,255,0.035)',
                borderRadius: 8,
                overflow: 'hidden',
              }}
            >
              <div style={{
                display: 'grid',
                placeItems: 'center',
                background: `${tier.color}22`,
                borderRight: `1px solid ${tier.color}35`,
                color: tier.color,
                fontFamily: 'var(--display)',
                fontSize: 34,
                fontWeight: 900,
              }}>
                {tier.label}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', padding: 12 }}>
                {(board[tier.id] || []).map(itemId => {
                  const item = itemsById[itemId]
                  if (!item) return null
                  const selected = selectedId === itemId
                  return (
                    <button
                      key={itemId}
                      draggable
                      onDragStart={event => event.dataTransfer.setData('text/plain', itemId)}
                      onClick={event => { event.stopPropagation(); setSelectedId(selected ? null : itemId) }}
                      style={{
                        border: `1px solid ${selected ? '#d4a017' : 'rgba(255,255,255,0.12)'}`,
                        background: selected ? 'rgba(212,160,23,0.16)' : 'rgba(7,9,14,0.86)',
                        color: '#fff',
                        borderRadius: 8,
                        padding: '10px 13px',
                        fontSize: 13,
                        fontWeight: 800,
                        cursor: 'grab',
                        boxShadow: selected ? '0 0 18px rgba(212,160,23,0.18)' : 'none',
                      }}
                    >
                      {item.name}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </section>
      </div>
    </main>
  )
}
