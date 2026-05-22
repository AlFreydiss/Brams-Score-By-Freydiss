import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext.jsx'
import { supabase } from '../lib/supabase.js'
import {
  LOCAL_TRACKS, pickTrack, checkAnswer, calcBerries,
  upsertBlindTestScore, logSession,
} from '../lib/blindTest.js'

const GOLD = '#d4a017'
const RED = '#e0524a'
const GREEN = '#22c55e'
const ROOM_QUERY = 'room'
const ROOM_TABLE = 'blind_test_rooms'

const ROUND_SECS = 30
const GUESS_DELAY = 5

const BT_CSS = `
  @keyframes btFadeUp  { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:none} }
  @keyframes btTwinkle { 0%,100%{opacity:.10} 50%{opacity:.65} }
  @keyframes btScan    { 0%{top:-2px} 100%{top:100%} }
  @keyframes btPulse   { 0%,100%{transform:scale(1);opacity:.7} 50%{transform:scale(1.55);opacity:1} }
  @keyframes btFloat   { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-7px)} }
  @keyframes btBounce  { 0%,100%{transform:translateY(0) scale(1)} 40%{transform:translateY(-14px) scale(1.12)} }
  @keyframes btWave    { 0%,100%{height:8px} 50%{height:32px} }
`

function BTStars() {
  const stars = useMemo(() => Array.from({ length: 50 }, (_, i) => ({
    x: (i * 39.1 + 7) % 98, y: (i * 43.7 + 13) % 96,
    size: i % 9 === 0 ? 2.5 : i % 4 === 0 ? 1.6 : 1,
    dur: 2.8 + (i * 0.28) % 4.5, del: (i * 0.21) % 7,
    gold: i % 13 === 0,
  })), [])

  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
      {stars.map((s, i) => (
        <div
          key={i}
          style={{
            position: 'absolute', left: `${s.x}%`, top: `${s.y}%`,
            width: s.size, height: s.size, borderRadius: '50%',
            background: s.gold ? 'rgba(212,160,23,.65)' : 'rgba(255,255,255,.5)',
            animation: `btTwinkle ${s.dur}s ${s.del}s ease-in-out infinite`,
          }}
        />
      ))}
    </div>
  )
}

function BTScanLine() {
  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 1, overflow: 'hidden' }}>
      <div
        style={{
          position: 'absolute', left: 0, right: 0, height: 2,
          background: 'linear-gradient(90deg,transparent,rgba(212,160,23,.07),rgba(212,160,23,.16),rgba(212,160,23,.07),transparent)',
          animation: 'btScan 16s linear infinite',
        }}
      />
    </div>
  )
}

function Waveform({ playing, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 3, height: 40 }}>
      {Array.from({ length: 18 }).map((_, i) => (
        <div
          key={i}
          style={{
            width: 3, borderRadius: 2,
            background: color || GOLD,
            opacity: playing ? 0.85 : 0.25,
            animation: playing ? `btWave ${0.5 + (i % 5) * 0.12}s ${i * 0.04}s ease-in-out infinite` : 'none',
            height: playing ? undefined : 8,
          }}
        />
      ))}
    </div>
  )
}

function ScorePill({ label, value, color = GOLD }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontFamily: "'Pirata One',cursive", fontSize: 26, fontWeight: 900, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.38)', marginTop: 3 }}>{label}</div>
    </div>
  )
}

function RevealCard({ track, result, berries }) {
  const c = track.color
  return (
    <div
      style={{
        background: `linear-gradient(145deg,${c}18 0%,rgba(7,9,14,0.97) 100%)`,
        border: `1px solid ${c}44`,
        borderTop: `3px solid ${c}`,
        borderRadius: 16, padding: '22px 24px',
        animation: 'btFadeUp .4s ease',
        textAlign: 'center',
      }}
    >
      <div style={{ fontSize: 52, marginBottom: 12, animation: 'btBounce 1s ease', filter: `drop-shadow(0 0 20px ${c}66)` }}>{track.emoji}</div>
      <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.18em', color: c, textTransform: 'uppercase', marginBottom: 6 }}>
        {track.type} · {track.episode}
      </div>
      <div style={{ fontFamily: "'Pirata One',cursive", fontSize: 'clamp(22px,4vw,36px)', color: '#fff', fontWeight: 900, marginBottom: 4, lineHeight: 1.1 }}>{track.title}</div>
      <div style={{ fontSize: 15, color: 'rgba(255,255,255,0.60)', marginBottom: 16 }}>{track.anime}</div>
      <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
        {result.animeOk && <span style={{ fontSize: 11, fontWeight: 700, color: GREEN, background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.30)', borderRadius: 100, padding: '4px 14px' }}>✓ Anime correct</span>}
        {result.titleOk && <span style={{ fontSize: 11, fontWeight: 700, color: GREEN, background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.30)', borderRadius: 100, padding: '4px 14px' }}>✓ Titre correct</span>}
        {!result.animeOk && !result.titleOk && <span style={{ fontSize: 11, fontWeight: 700, color: '#f87171', background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.28)', borderRadius: 100, padding: '4px 14px' }}>✗ Raté</span>}
      </div>
      {berries > 0 && <div style={{ fontSize: 13, fontWeight: 800, color: GOLD }}>+{berries.toLocaleString('fr-FR')} 🪙 berries</div>}
    </div>
  )
}

function makeRoomCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase()
}

function getRoomFromUrl() {
  return (new URLSearchParams(window.location.search).get(ROOM_QUERY) || '').trim().toUpperCase()
}

function roomUrl(roomCode) {
  const url = new URL(window.location.href)
  url.searchParams.set(ROOM_QUERY, roomCode)
  return url.toString()
}

function normalizeRoom(row) {
  return {
    room_code: row?.room_code || '',
    track_id: row?.track_id || null,
    phase: row?.phase || 'lobby',
    round: Number(row?.round || 0),
    last_track_id: row?.last_track_id || null,
    started_at: row?.started_at || null,
    updated_at: row?.updated_at || null,
  }
}

export default function BlindTestPage() {
  const navigate = useNavigate()
  const { isAuthenticated, user, displayName, avatarUrl } = useAuth()
  const audioRef = useRef(null)
  const roomChannelRef = useRef(null)
  const roomGuardRef = useRef(false)
  const roomStateRef = useRef(null)

  const [phase, setPhase] = useState('intro')
  const [track, setTrack] = useState(null)
  const [lastTrackId, setLastTrackId] = useState(null)
  const [elapsed, setElapsed] = useState(0)
  const [startTime, setStartTime] = useState(null)
  const [animeGuess, setAnimeGuess] = useState('')
  const [titleGuess, setTitleGuess] = useState('')
  const [result, setResult] = useState(null)
  const [berries, setBerries] = useState(0)
  const [totalScore, setTotalScore] = useState(0)
  const [streak, setStreak] = useState(0)
  const [maxStreak, setMaxStreak] = useState(0)
  const [round, setRound] = useState(0)
  const [history, setHistory] = useState([])
  const [countdown, setCountdown] = useState(3)
  const [guessEnabled, setGuessEnabled] = useState(false)

  const [roomCode, setRoomCode] = useState('')
  const [roomInput, setRoomInput] = useState('')
  const [roomRole, setRoomRole] = useState('local')
  const [roomStatus, setRoomStatus] = useState('Mode solo')
  const [roomSync, setRoomSync] = useState('idle')
  const [roomNotice, setRoomNotice] = useState('')
  const titleRef = useRef(null)

  const roomLink = roomCode ? roomUrl(roomCode) : ''

  useEffect(() => {
    const initialRoom = getRoomFromUrl()
    if (initialRoom) void joinRoom(initialRoom)
    return () => {
      roomChannelRef.current?.unsubscribe?.()
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.src = ''
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (phase !== 'countdown') return
    if (countdown <= 0) {
      audioRef.current?.play().catch(() => {})
      setPhase('playing')
      setStartTime(Date.now())
      setElapsed(0)
      if (roomCode && roomRole === 'host') publishRoomState('playing')
      return
    }
    const t = setTimeout(() => setCountdown(v => v - 1), 1000)
    return () => clearTimeout(t)
  }, [phase, countdown, roomCode, roomRole])

  useEffect(() => {
    if (phase !== 'playing') return
    const t = setInterval(() => {
      const s = Math.floor((Date.now() - startTime) / 1000)
      setElapsed(s)
      if (s >= GUESS_DELAY) setGuessEnabled(true)
      if (s >= ROUND_SECS) handleTimeout()
    }, 250)
    return () => clearInterval(t)
  }, [phase, startTime])

  useEffect(() => {
    if (phase !== 'playing' && audioRef.current) audioRef.current.pause()
  }, [phase])

  function syncRoomPayload(roomRow) {
    const room = normalizeRoom(roomRow)
    roomStateRef.current = room
    if (!room.room_code) return

    setRoomCode(room.room_code)
    setRoomInput(room.room_code)
    setRoomStatus(room.phase === 'lobby' ? `Salle ${room.room_code}` : `Salle ${room.room_code} synchronisée`)
    setRoomSync('live')

    if (!room.track_id) return
    const nextTrack = LOCAL_TRACKS.find(t => t.id === room.track_id) || null
    if (!nextTrack) return

    roomGuardRef.current = true
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.src = ''
    }
    audioRef.current = new Audio(nextTrack.url)
    setTrack(nextTrack)
    setLastTrackId(room.last_track_id || nextTrack.id)
    setAnimeGuess('')
    setTitleGuess('')
    setResult(null)
    setBerries(0)

    if (room.phase === 'countdown') {
      const started = room.started_at ? Date.parse(room.started_at) : Date.now()
      const elapsedMs = Math.max(0, Date.now() - started)
      const remaining = Math.max(0, 3 - Math.floor(elapsedMs / 1000))
      setCountdown(remaining)
      setGuessEnabled(false)
      setPhase('countdown')
      return
    }

    if (room.phase === 'playing') {
      setPhase('playing')
      setStartTime(Date.now())
      setElapsed(0)
      setCountdown(0)
      setGuessEnabled(false)
      return
    }

    if (room.phase === 'reveal') {
      setPhase('reveal')
      return
    }
  }

  async function joinRoom(code) {
    const nextCode = (code || roomInput || '').trim().toUpperCase()
    if (!nextCode) {
      setRoomStatus('Code manquant')
      return
    }

    setRoomInput(nextCode)
    setRoomCode(nextCode)
    setRoomRole('guest')
    setRoomStatus(`Connexion ${nextCode}...`)
    setRoomSync('loading')
    window.history.replaceState({}, '', roomUrl(nextCode))

    if (!supabase) {
      setRoomStatus('Supabase non configuré')
      setRoomSync('error')
      return
    }

    const { data } = await supabase.from(ROOM_TABLE).select('*').eq('room_code', nextCode).maybeSingle()
    if (!data) {
      setRoomStatus(`Salle ${nextCode} introuvable`)
      setRoomSync('error')
      return
    }

    syncRoomPayload(data)
    subscribeRoom(nextCode)
  }

  async function createRoom() {
    const nextCode = makeRoomCode()
    setRoomRole('host')
    setRoomCode(nextCode)
    setRoomInput(nextCode)
    setRoomStatus(`Salle ${nextCode} créée`)
    setRoomSync('saving')
    window.history.replaceState({}, '', roomUrl(nextCode))

    if (!supabase) {
      setRoomStatus('Supabase non configuré')
      setRoomSync('error')
      return
    }

    const payload = {
      room_code: nextCode,
      phase: 'lobby',
      round: 0,
      track_id: null,
      last_track_id: null,
      started_at: null,
      updated_at: new Date().toISOString(),
    }
    await supabase.from(ROOM_TABLE).upsert(payload, { onConflict: 'room_code' })
    subscribeRoom(nextCode)
    setRoomSync('saved')
  }

  function subscribeRoom(code) {
    roomChannelRef.current?.unsubscribe?.()
    if (!supabase) return

    const channel = supabase
      .channel(`blind-test-room-${code}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: ROOM_TABLE, filter: `room_code=eq.${code}` }, payload => {
        if (roomGuardRef.current) {
          roomGuardRef.current = false
          return
        }
        syncRoomPayload(payload.new || payload.old)
      })
      .subscribe()

    roomChannelRef.current = channel
  }

  async function publishRoomState(nextPhase, nextTrack = track, nextRound = round, nextLastTrackId = lastTrackId) {
    if (!roomCode || roomRole !== 'host' || !supabase) return
    const payload = {
      room_code: roomCode,
      phase: nextPhase,
      round: nextRound,
      track_id: nextTrack?.id || null,
      last_track_id: nextLastTrackId || null,
      started_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    roomGuardRef.current = true
    await supabase.from(ROOM_TABLE).upsert(payload, { onConflict: 'room_code' })
    setRoomSync('saved')
  }

  async function leaveRoom() {
    roomChannelRef.current?.unsubscribe?.()
    roomChannelRef.current = null
    roomStateRef.current = null
    setRoomCode('')
    setRoomInput('')
    setRoomRole('local')
    setRoomStatus('Mode solo')
    setRoomSync('idle')
    setPhase('intro')
    setTrack(null)
    setLastTrackId(null)
    setCountdown(3)
    setGuessEnabled(false)
    window.history.replaceState({}, '', window.location.pathname)
  }

  function startGame() {
    if (roomCode && roomRole !== 'host') {
      setRoomStatus('Attends le host pour lancer')
      return
    }

    const t = pickTrack(lastTrackId)
    setTrack(t)
    setLastTrackId(t.id)
    setAnimeGuess('')
    setTitleGuess('')
    setResult(null)
    setBerries(0)
    setCountdown(3)
    setGuessEnabled(false)
    setRoomStatus(roomCode ? `Salle ${roomCode} en cours` : 'Mode solo')

    if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = '' }
    const audio = new Audio(t.url)
    audioRef.current = audio
    audio.play().then(() => { audio.pause(); audio.currentTime = 0 }).catch(() => {})

    if (roomCode && roomRole === 'host') {
      void publishRoomState('countdown', t, round + 1, t.id)
    }

    setPhase('countdown')
  }

  function handleTimeout() {
    if (phase !== 'playing') return
    submitGuess(true)
  }

  function submitGuess(timeout = false) {
    if (phase !== 'playing' && !timeout) return
    const ms = Date.now() - startTime
    const res = checkAnswer(animeGuess, titleGuess, track)
    const newStreak = (res.animeOk || res.titleOk) ? streak + 1 : 0
    const earned = timeout && !res.animeOk && !res.titleOk
      ? 0
      : calcBerries({ animeOk: res.animeOk, titleOk: res.titleOk, timeMs: ms, streak })

    setResult(res)
    setBerries(earned)
    setStreak(newStreak)
    setMaxStreak(prev => Math.max(prev, newStreak))
    setTotalScore(prev => prev + earned)
    setRound(prev => prev + 1)
    setHistory(prev => [...prev, { track, result: res, earned }])
    setPhase('reveal')

    if (user) {
      logSession({ userId: user.id, trackId: track.id, correct: res.animeOk || res.titleOk, timeMs: ms })
    }
  }

  function nextRound() {
    if (roomCode && roomRole !== 'host') return
    startGame()
  }

  function endGame() {
    setPhase('end')
    if (user && round > 0) {
      upsertBlindTestScore({
        userId: user.id,
        displayName,
        avatarUrl,
        score: totalScore,
        streakMax: maxStreak,
        gamesPlayed: 1,
      })
    }
  }

  const barPct = phase === 'playing' ? Math.max(0, 100 - (elapsed / ROUND_SECS) * 100) : 0
  const barColor = barPct > 50 ? GREEN : barPct > 25 ? '#f59e0b' : RED
  const activeTrack = track || LOCAL_TRACKS[0]

  return (
    <div style={{ minHeight: '100vh', background: '#07090e', position: 'relative', overflowX: 'hidden' }}>
      <style>{BT_CSS}</style>
      <BTStars />
      <BTScanLine />

      <div style={{ position: 'relative', zIndex: 2, maxWidth: 860, margin: '0 auto', padding: '72px 20px 100px' }}>
        <div style={{
          display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap',
          padding: '12px 14px', marginBottom: 20,
          border: '1px solid rgba(255,255,255,0.09)', borderRadius: 12,
          background: 'rgba(255,255,255,0.03)',
        }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: 'rgba(255,255,255,0.75)' }}>
            {roomStatus}
            {roomCode ? ` · ${roomRole === 'host' ? 'host' : 'guest'} · ${roomSync}` : ''}
          </div>
          <div style={{ flex: 1 }} />
          <input
            value={roomInput}
            onChange={e => setRoomInput(e.target.value.toUpperCase())}
            placeholder="Code salle"
            style={{
              width: 130, padding: '10px 12px', borderRadius: 10,
              border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(7,9,14,0.9)',
              color: '#fff', fontSize: 13, fontWeight: 800, outline: 'none',
            }}
          />
          <button onClick={() => joinRoom(roomInput)} style={smallBtn(false)}>Rejoindre</button>
          <button onClick={createRoom} style={smallBtn(true)}>Créer</button>
          <button onClick={leaveRoom} style={smallBtn(false)} disabled={!roomCode}>Quitter</button>
        </div>

        {roomLink && (
          <div style={{
            display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap',
            padding: '10px 14px', marginBottom: 20,
            border: '1px solid rgba(212,160,23,0.20)', borderRadius: 12,
            background: 'rgba(212,160,23,0.08)',
          }}>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.72)' }}>Code: <strong style={{ color: '#fff' }}>{roomCode}</strong></div>
            <div style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12, color: 'rgba(255,255,255,0.55)' }}>{roomLink}</div>
            <button onClick={async () => { await navigator.clipboard.writeText(roomLink); setRoomNotice('Lien copié'); setTimeout(() => setRoomNotice(''), 1500) }} style={smallBtn(true)}>{roomNotice || 'Copier le lien'}</button>
          </div>
        )}

        {phase === 'intro' && (
          <div style={{ textAlign: 'center', animation: 'btFadeUp .5s ease' }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 18px',
              borderRadius: 100, background: 'rgba(212,160,23,0.10)', border: '1px solid rgba(212,160,23,0.28)',
              fontSize: 10, fontWeight: 800, letterSpacing: '.22em', color: GOLD, textTransform: 'uppercase', marginBottom: 22,
            }}>🎵 Blind Test Anime</div>

            <h1 style={{ fontFamily: "'Pirata One',cursive", fontSize: 'clamp(46px,8vw,84px)', color: '#fff', margin: '0 0 16px', lineHeight: 1, letterSpacing: '-.02em' }}>
              Blind Test
            </h1>
            <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.42)', maxWidth: 520, margin: '0 auto 36px', lineHeight: 1.75 }}>
              Un extrait d'opening anime se lance. Trouve l'anime et/ou le titre pour gagner des <strong style={{ color: GOLD }}>berries</strong>.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: 10, marginBottom: 40, textAlign: 'left' }}>
              {LOCAL_TRACKS.map((t, i) => (
                <div key={t.id} style={{
                  background: `linear-gradient(145deg,${t.color}14 0%,rgba(7,9,14,0.97) 100%)`,
                  border: `1px solid ${t.color}22`, borderTop: `2px solid ${t.color}`,
                  borderRadius: 12, padding: '14px 16px',
                  animation: `btFadeUp .4s ${i * 0.08}s ease both`,
                }}>
                  <div style={{ fontSize: 24, marginBottom: 6 }}>{t.emoji}</div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: '#fff', marginBottom: 2 }}>{t.anime}</div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.38)' }}>{t.type} · {t.episode}</div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 36 }}>
              {[
                { icon: '🎯', text: 'Anime = 50 pts' },
                { icon: '🎵', text: 'Titre = 30 pts' },
                { icon: '⚡', text: '< 5s = ×2' },
                { icon: '🔥', text: 'Streak ×3 = ×1.2' },
              ].map((r, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 100, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.65)' }}>
                  <span>{r.icon}</span><span>{r.text}</span>
                </div>
              ))}
            </div>

            <button
              onClick={startGame}
              style={{
                padding: '15px 44px', borderRadius: 100, border: 'none', fontSize: 16, fontWeight: 800,
                background: `linear-gradient(135deg,${GOLD},#e5b83a)`, color: '#1a1200', cursor: 'pointer',
                letterSpacing: '.04em', boxShadow: `0 8px 32px rgba(212,160,23,0.35)`,
                transition: 'all .2s', fontFamily: "'Pirata One',cursive",
              }}
            >
              {roomCode && roomRole !== 'host' ? 'Attendre le host' : 'Lancer le jeu'}
            </button>

            <div style={{ marginTop: 20 }}>
              <button onClick={() => navigate('/blind-test/leaderboard')} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.35)', cursor: 'pointer', fontSize: 13, fontWeight: 600, textDecoration: 'underline' }}>
                Voir le classement →
              </button>
            </div>
          </div>
        )}

        {phase === 'countdown' && (
          <div style={{ textAlign: 'center', animation: 'btFadeUp .3s ease' }}>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.22em', color: GOLD, textTransform: 'uppercase', marginBottom: 20 }}>
              {roomCode ? `Salle ${roomCode} · prépare-toi...` : 'Prépare-toi...'}
            </div>
            <div style={{
              fontFamily: "'Pirata One',cursive",
              fontSize: 'clamp(100px,20vw,160px)',
              color: '#fff', lineHeight: 1,
              textShadow: `0 0 80px ${GOLD}44`,
              animation: 'btPulse .9s ease-in-out infinite',
            }}>
              {countdown || '▶'}
            </div>
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.35)', marginTop: 20 }}>L'extrait va commencer...</div>
          </div>
        )}

        {phase === 'playing' && track && (
          <div style={{ animation: 'btFadeUp .3s ease' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
              <ScorePill label="Score" value={totalScore.toLocaleString('fr-FR')} />
              <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                <ScorePill label="Streak" value={streak} color={streak >= 3 ? '#f59e0b' : 'rgba(255,255,255,0.55)'} />
                <ScorePill label="Round" value={round + 1} color="rgba(255,255,255,0.55)" />
              </div>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 18, padding: '28px 28px 24px', marginBottom: 20 }}>
              <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 100, overflow: 'hidden', marginBottom: 22, position: 'relative' }}>
                <div style={{
                  position: 'absolute', left: 0, top: 0, height: '100%',
                  background: `linear-gradient(90deg,${barColor}88,${barColor})`,
                  borderRadius: 100,
                  width: `${barPct}%`,
                  transition: 'width .25s linear, background .25s',
                  boxShadow: `0 0 8px ${barColor}44`,
                }} />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <Waveform playing color={track.color} />
                <div style={{ fontFamily: "'Pirata One',cursive", fontSize: 28, color: elapsed <= 5 ? GREEN : elapsed <= 15 ? GOLD : RED, fontWeight: 900 }}>
                  {ROUND_SECS - elapsed}s
                </div>
              </div>

              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', textAlign: 'center', marginBottom: guessEnabled ? 20 : 0 }}>
                {!guessEnabled ? `⏳ Écoute encore ${GUESS_DELAY - elapsed}s avant de répondre...` : '🎯 Réponds maintenant !'}
              </div>

              {guessEnabled && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <input
                    autoFocus
                    type="text"
                    value={animeGuess}
                    onChange={e => setAnimeGuess(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && titleRef?.current?.focus()}
                    placeholder="Nom de l'anime..."
                    style={inputGuessStyle}
                  />
                  <input
                    type="text"
                    value={titleGuess}
                    onChange={e => setTitleGuess(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && submitGuess()}
                    ref={titleRef}
                    placeholder="Titre de l'opening / ending..."
                    style={inputGuessStyle}
                  />

                  <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                    <button onClick={() => submitGuess()} style={primaryBtnStyle}>Valider ma réponse</button>
                    <button onClick={() => submitGuess()} style={secondaryBtnStyle}>Passer</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {phase === 'reveal' && track && result && (
          <div style={{ animation: 'btFadeUp .4s ease' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <ScorePill label="Score total" value={totalScore.toLocaleString('fr-FR')} />
              <ScorePill label="Streak" value={streak} color={streak >= 3 ? '#f59e0b' : 'rgba(255,255,255,0.55)'} />
            </div>

            <RevealCard track={track} result={result} berries={berries} />

            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button onClick={nextRound} style={{ ...primaryBtnStyle, flex: 1, fontFamily: "'Pirata One',cursive" }}>Extrait suivant →</button>
              {round >= 2 && <button onClick={endGame} style={endBtnStyle}>Terminer</button>}
            </div>
          </div>
        )}

        {phase === 'end' && (
          <div style={{ textAlign: 'center', animation: 'btFadeUp .5s ease' }}>
            <div style={{ fontSize: 72, marginBottom: 20, animation: 'btFloat 3s ease-in-out infinite', filter: `drop-shadow(0 0 28px ${GOLD}55)` }}>🏆</div>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.22em', color: GOLD, textTransform: 'uppercase', marginBottom: 12 }}>
              Partie terminée
            </div>
            <h2 style={{ fontFamily: "'Pirata One',cursive", fontSize: 'clamp(36px,6vw,64px)', color: '#fff', margin: '0 0 28px', lineHeight: 1 }}>
              Score final
            </h2>

            <div style={{ display: 'flex', gap: 28, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 36 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: "'Pirata One',cursive", fontSize: 42, fontWeight: 900, color: GOLD, lineHeight: 1 }}>{totalScore.toLocaleString('fr-FR')}</div>
                <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.38)', marginTop: 4 }}>Berries gagnées</div>
              </div>
              <div style={{ width: 1, height: 48, background: 'rgba(255,255,255,0.08)', alignSelf: 'center' }} />
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: "'Pirata One',cursive", fontSize: 42, fontWeight: 900, color: '#f59e0b', lineHeight: 1 }}>{maxStreak}</div>
                <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.38)', marginTop: 4 }}>Streak max</div>
              </div>
              <div style={{ width: 1, height: 48, background: 'rgba(255,255,255,0.08)', alignSelf: 'center' }} />
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: "'Pirata One',cursive", fontSize: 42, fontWeight: 900, color: 'rgba(255,255,255,0.80)', lineHeight: 1 }}>{round}</div>
                <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.38)', marginTop: 4 }}>Rounds joués</div>
              </div>
            </div>

            {!isAuthenticated && (
              <div style={{ padding: '14px 20px', borderRadius: 12, background: 'rgba(212,160,23,0.08)', border: '1px solid rgba(212,160,23,0.22)', marginBottom: 24, fontSize: 13, color: 'rgba(255,255,255,0.60)', lineHeight: 1.6 }}>
                💡 Connecte-toi avec Discord pour sauvegarder ton score et apparaître dans le classement !
              </div>
            )}

            <div style={{ textAlign: 'left', marginBottom: 32 }}>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.18em', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', marginBottom: 14 }}>
                Récapitulatif
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {history.map((h, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
                    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
                    borderLeft: `3px solid ${h.result.perfect ? GREEN : h.result.animeOk || h.result.titleOk ? GOLD : RED}`,
                    borderRadius: 10,
                  }}>
                    <span style={{ fontSize: 20, flexShrink: 0 }}>{h.track.emoji}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.track.title}</div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.38)' }}>{h.track.anime}</div>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: h.earned > 0 ? GOLD : 'rgba(255,255,255,0.30)', flexShrink: 0 }}>
                      {h.earned > 0 ? `+${h.earned.toLocaleString('fr-FR')} 🪙` : '✗'}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={() => { setPhase('intro'); setTotalScore(0); setStreak(0); setMaxStreak(0); setRound(0); setHistory([]) }}
                style={primaryBtnStyle}
              >
                Rejouer
              </button>
              <button onClick={() => navigate('/blind-test/leaderboard')} style={endBtnStyle}>
                Classement
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function smallBtn(primary) {
  return {
    border: `1px solid ${primary ? 'rgba(212,160,23,0.42)' : 'rgba(255,255,255,0.14)'}`,
    background: primary ? 'rgba(212,160,23,0.14)' : 'rgba(255,255,255,0.05)',
    color: primary ? '#facc15' : 'rgba(255,255,255,0.78)',
    borderRadius: 10,
    padding: '10px 14px',
    cursor: 'pointer',
    fontWeight: 800,
    fontSize: 13,
  }
}

const inputGuessStyle = {
  padding: '14px 18px', borderRadius: 12,
  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.14)',
  color: '#fff', fontSize: 15, outline: 'none', fontFamily: 'var(--body)',
  transition: 'border-color .15s, box-shadow .15s',
}

const primaryBtnStyle = {
  flex: 1, padding: '13px', borderRadius: 12, border: 'none',
  background: `linear-gradient(135deg,${GOLD},#e5b83a)`, color: '#1a1200',
  fontSize: 14, fontWeight: 800, cursor: 'pointer', transition: 'all .15s', letterSpacing: '.02em',
}

const secondaryBtnStyle = {
  padding: '13px 18px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.10)',
  background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.45)',
  fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'all .15s',
}

const endBtnStyle = {
  padding: '13px 30px', borderRadius: 100,
  border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.04)',
  color: 'rgba(255,255,255,0.70)', fontSize: 14, fontWeight: 700, cursor: 'pointer',
}
