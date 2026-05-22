import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../lib/supabase.js'

const STORAGE_KEY = 'brams_tier_list_v2'
const VIEW_KEY = 'brams_tier_list_view'
const ROOM_QUERY = 'room'
const ROOM_PREFIX = 'brams_tier_room_'

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

const ITEMS_BY_ID = Object.fromEntries(DEFAULT_ITEMS.map(item => [item.id, item]))

function createDefaultBoard() {
  return {
    s: ['anime-0', 'anime-1'],
    a: ['anime-2', 'anime-5', 'anime-6'],
    b: ['anime-7', 'anime-8', 'anime-9', 'anime-10'],
    c: ['anime-3', 'anime-4', 'anime-11', 'anime-12'],
    d: ['anime-13', 'anime-14', 'anime-15', 'anime-16'],
  }
}

function emptyBoard() {
  return Object.fromEntries(TIERS.map(tier => [tier.id, []]))
}

function normalizeBoard(board) {
  const next = emptyBoard()
  const seen = new Set()

  for (const tier of TIERS) {
    const ids = Array.isArray(board?.[tier.id]) ? board[tier.id] : []
    for (const id of ids) {
      if (!ITEMS_BY_ID[id] || seen.has(id)) continue
      next[tier.id].push(id)
      seen.add(id)
    }
  }

  for (const item of DEFAULT_ITEMS) {
    if (seen.has(item.id)) continue
    next.d.push(item.id)
  }

  return next
}

function loadLocalBoard() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')
    if (saved && typeof saved === 'object') return normalizeBoard(saved)
  } catch {
    /* ignore broken local storage */
  }
  return createDefaultBoard()
}

function makeRoomCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase()
}

function roomUrl(roomCode) {
  const url = new URL(window.location.href)
  url.searchParams.set(ROOM_QUERY, roomCode)
  return url.toString()
}

function getRoomFromUrl() {
  return (new URLSearchParams(window.location.search).get(ROOM_QUERY) || '').trim().toUpperCase()
}

function moveItem(board, itemId, targetTierId) {
  const next = Object.fromEntries(
    TIERS.map(tier => [tier.id, (board[tier.id] || []).filter(id => id !== itemId)])
  )
  next[targetTierId] = [...(next[targetTierId] || []), itemId]
  return normalizeBoard(next)
}

function readViewMode() {
  const saved = localStorage.getItem(VIEW_KEY)
  return saved === 'multi' ? 'multi' : 'local'
}

async function fetchRoom(roomCode) {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('tier_list_rooms')
    .select('room_code, board, updated_at')
    .eq('room_code', roomCode)
    .maybeSingle()

  if (error) return null
  return data || null
}

async function saveRoom(roomCode, board) {
  if (!supabase) return false
  const payload = {
    room_code: roomCode,
    board,
    updated_at: new Date().toISOString(),
  }
  const { error } = await supabase.from('tier_list_rooms').upsert(payload, { onConflict: 'room_code' })
  return !error
}

async function deleteRoom(roomCode) {
  if (!supabase) return
  await supabase.from('tier_list_rooms').delete().eq('room_code', roomCode)
}

export default function TierListPage() {
  const [mode, setMode] = useState(readViewMode)
  const [board, setBoard] = useState(loadLocalBoard)
  const [selectedId, setSelectedId] = useState(null)
  const [roomCode, setRoomCode] = useState('')
  const [roomInput, setRoomInput] = useState(getRoomFromUrl())
  const [roomState, setRoomState] = useState('local')
  const [roomStatus, setRoomStatus] = useState('Mode local')
  const [shareNotice, setShareNotice] = useState('')
  const [syncState, setSyncState] = useState('idle')
  const boardJsonRef = useRef(JSON.stringify(board))
  const roomSubscriptionRef = useRef(null)
  const lastUrlRoomRef = useRef(getRoomFromUrl())

  const itemsById = useMemo(() => ITEMS_BY_ID, [])
  const link = roomCode ? roomUrl(roomCode) : ''

  useEffect(() => {
    localStorage.setItem(VIEW_KEY, mode)
  }, [mode])

  useEffect(() => {
    if (mode === 'local') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(board))
    }
  }, [board, mode])

  useEffect(() => {
    const initialRoom = getRoomFromUrl()
    if (!initialRoom) return
    void joinRoom(initialRoom)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    return () => {
      roomSubscriptionRef.current?.unsubscribe?.()
    }
  }, [])

  useEffect(() => {
    if (mode !== 'multi' || !roomCode || !supabase) return undefined

    const nextJson = JSON.stringify(board)
    if (nextJson === boardJsonRef.current) return undefined

    setSyncState('saving')
    const timer = window.setTimeout(async () => {
      const ok = await saveRoom(roomCode, normalizeBoard(board))
      if (ok) {
        boardJsonRef.current = JSON.stringify(normalizeBoard(board))
        setSyncState('saved')
      } else {
        setSyncState('error')
      }
    }, 250)

    return () => window.clearTimeout(timer)
  }, [board, mode, roomCode])

  async function createRoom() {
    const nextCode = makeRoomCode()
    const nextBoard = createDefaultBoard()

    setMode('multi')
    setRoomCode(nextCode)
    setRoomInput(nextCode)
    setBoard(nextBoard)
    setSelectedId(null)
    setRoomState('creating')
    setRoomStatus('Création de la salle...')
    setSyncState('saving')
    boardJsonRef.current = JSON.stringify(nextBoard)
    lastUrlRoomRef.current = nextCode
    window.history.replaceState({}, '', roomUrl(nextCode))

    const ok = await saveRoom(nextCode, nextBoard)
    if (!ok) {
      setRoomStatus('Multi indisponible pour l’instant')
      setSyncState('error')
      return
    }

    setRoomState('host')
    setRoomStatus(`Salle ${nextCode}`)
    setSyncState('saved')
    subscribeRoom(nextCode)
  }

  async function joinRoom(code) {
    const nextCode = (code || roomInput || '').trim().toUpperCase()
    if (!nextCode) {
      setRoomStatus('Code manquant')
      return
    }

    setMode('multi')
    setRoomCode(nextCode)
    setRoomInput(nextCode)
    setRoomState('joining')
    setRoomStatus(`Connexion ${nextCode}...`)
    setShareNotice('')
    window.history.replaceState({}, '', roomUrl(nextCode))
    lastUrlRoomRef.current = nextCode

    const remote = await fetchRoom(nextCode)
    const nextBoard = normalizeBoard(remote?.board || createDefaultBoard())
    setBoard(nextBoard)
    setSelectedId(null)
    boardJsonRef.current = JSON.stringify(nextBoard)

    if (!remote) {
      await saveRoom(nextCode, nextBoard)
      setRoomState('host')
      setRoomStatus(`Salle ${nextCode} créée`)
    } else {
      setRoomState('guest')
      setRoomStatus(`Salle ${nextCode} rejointe`)
    }

    setSyncState('saved')
    subscribeRoom(nextCode)
  }

  function subscribeRoom(nextCode) {
    roomSubscriptionRef.current?.unsubscribe?.()
    if (!supabase) return

    const channel = supabase
      .channel(`tier-list-room-${nextCode}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tier_list_rooms', filter: `room_code=eq.${nextCode}` },
        (payload) => {
          const incoming = normalizeBoard(payload.new?.board || payload.old?.board || createDefaultBoard())
          const incomingJson = JSON.stringify(incoming)
          if (incomingJson === boardJsonRef.current) return
          boardJsonRef.current = incomingJson
          setBoard(incoming)
          setSyncState('live')
          setRoomStatus(`Synchronisé ${nextCode}`)
        },
      )
      .subscribe()

    roomSubscriptionRef.current = channel
  }

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

  async function copyLink() {
    if (!link) return
    await navigator.clipboard.writeText(link)
    setShareNotice('Lien copié')
    window.setTimeout(() => setShareNotice(''), 1800)
  }

  async function leaveRoom() {
    roomSubscriptionRef.current?.unsubscribe?.()
    roomSubscriptionRef.current = null
    if (roomCode) await deleteRoom(roomCode)
    setMode('local')
    setRoomCode('')
    setRoomInput('')
    setRoomState('local')
    setRoomStatus('Mode local')
    setSyncState('idle')
    setBoard(loadLocalBoard())
    setSelectedId(null)
    window.history.replaceState({}, '', window.location.pathname)
  }

  return (
    <main style={{ minHeight: '100vh', background: '#07090e', color: '#fff', padding: '86px 20px 120px' }}>
      <div style={{ maxWidth: 1180, margin: '0 auto' }}>
        <header style={{ display: 'flex', alignItems: 'end', justifyContent: 'space-between', gap: 24, marginBottom: 18, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.26em', textTransform: 'uppercase', color: '#d4a017', marginBottom: 10 }}>
              Brams Community
            </div>
            <h1 style={{ fontFamily: 'var(--display)', fontSize: 'clamp(38px,7vw,72px)', lineHeight: 1, margin: 0 }}>
              Tier List Anime
            </h1>
            <div style={{ marginTop: 10, color: 'rgba(255,255,255,0.46)', fontSize: 13 }}>
              {roomStatus}
              {mode === 'multi' && roomCode ? ` • ${syncState}` : ''}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              onClick={() => { setMode('local'); setRoomState('local'); setRoomStatus('Mode local'); setRoomCode(''); setRoomInput(''); setBoard(loadLocalBoard()); setSelectedId(null); window.history.replaceState({}, '', window.location.pathname) }}
              style={toolbarBtnStyle(mode === 'local')}
            >
              Local
            </button>
            <button onClick={createRoom} style={toolbarBtnStyle(mode === 'multi')}>Créer une salle</button>
            <button
              onClick={() => { setBoard(createDefaultBoard()); setSelectedId(null) }}
              style={toolbarBtnStyle(false)}
            >
              Reset
            </button>
          </div>
        </header>

        <section style={{
          display: 'grid',
          gridTemplateColumns: '1.2fr 0.8fr',
          gap: 12,
          marginBottom: 18,
        }}>
          <div style={panelStyle}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                value={roomInput}
                onChange={e => setRoomInput(e.target.value.toUpperCase())}
                placeholder="Code de salle"
                style={inputStyle}
              />
              <button onClick={() => joinRoom(roomInput)} style={accentBtnStyle}>Rejoindre</button>
              <button onClick={copyLink} disabled={!link} style={ghostBtnStyle}>Copier le lien</button>
              <button onClick={leaveRoom} disabled={mode !== 'multi'} style={ghostBtnStyle}>Quitter</button>
            </div>
            <div style={{ marginTop: 10, color: 'rgba(255,255,255,0.46)', fontSize: 12, lineHeight: 1.5 }}>
              Partage le lien de salle pour synchroniser la tier list en direct. Si Supabase n’est pas configuré, le mode multi reste visible mais ne peut pas persister.
            </div>
          </div>
          <div style={panelStyle}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: 10, letterSpacing: '.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.32)' }}>Salle active</div>
                <div style={{ fontSize: 16, fontWeight: 900, marginTop: 2 }}>{mode === 'multi' && roomCode ? roomCode : 'Locale'}</div>
              </div>
              {mode === 'multi' && roomCode && (
                <button onClick={copyLink} style={linkBadgeStyle}>
                  {shareNotice || 'Partager le lien'}
                </button>
              )}
            </div>
          </div>
        </section>

        {mode === 'multi' && roomCode && link && (
          <section style={{ ...panelStyle, marginBottom: 18 }}>
            <div style={{ fontSize: 10, letterSpacing: '.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.34)', marginBottom: 8 }}>
              Code / Lien
            </div>
            <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
              <div style={codeBoxStyle}>
                <span>Code</span>
                <strong>{roomCode}</strong>
              </div>
              <div style={codeBoxStyle}>
                <span>Lien</span>
                <strong style={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{link}</strong>
              </div>
            </div>
          </section>
        )}

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

function toolbarBtnStyle(active) {
  return {
    border: `1px solid ${active ? 'rgba(212,160,23,0.42)' : 'rgba(255,255,255,0.14)'}`,
    background: active ? 'rgba(212,160,23,0.12)' : 'rgba(255,255,255,0.05)',
    color: active ? '#facc15' : 'rgba(255,255,255,0.78)',
    borderRadius: 8,
    padding: '10px 16px',
    cursor: 'pointer',
    fontWeight: 800,
  }
}

const panelStyle = {
  border: '1px solid rgba(255,255,255,0.10)',
  background: 'rgba(255,255,255,0.03)',
  borderRadius: 10,
  padding: 14,
}

const inputStyle = {
  flex: '1 1 220px',
  minWidth: 180,
  borderRadius: 8,
  border: '1px solid rgba(255,255,255,0.14)',
  background: 'rgba(7,9,14,0.92)',
  color: '#fff',
  padding: '11px 12px',
  fontSize: 13,
  fontWeight: 800,
  outline: 'none',
}

const accentBtnStyle = {
  border: '1px solid rgba(212,160,23,0.42)',
  background: 'rgba(212,160,23,0.14)',
  color: '#facc15',
  borderRadius: 8,
  padding: '11px 14px',
  cursor: 'pointer',
  fontWeight: 800,
}

const ghostBtnStyle = {
  border: '1px solid rgba(255,255,255,0.14)',
  background: 'rgba(255,255,255,0.05)',
  color: 'rgba(255,255,255,0.72)',
  borderRadius: 8,
  padding: '11px 14px',
  cursor: 'pointer',
  fontWeight: 800,
}

const codeBoxStyle = {
  border: '1px solid rgba(255,255,255,0.10)',
  background: 'rgba(7,9,14,0.86)',
  borderRadius: 8,
  padding: '12px 14px',
  display: 'grid',
  gap: 4,
}

const linkBadgeStyle = {
  border: '1px solid rgba(212,160,23,0.35)',
  background: 'rgba(212,160,23,0.10)',
  color: '#facc15',
  borderRadius: 8,
  padding: '10px 14px',
  cursor: 'pointer',
  fontWeight: 800,
}
