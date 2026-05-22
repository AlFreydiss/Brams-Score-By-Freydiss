import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext.jsx'
import { supabase } from '../lib/supabase.js'
import {
  LOCAL_TRACKS, pickTrack, checkAnswer, calcBerries,
  upsertBlindTestScore, logSession,
} from '../lib/blindTest.js'

const GOLD  = '#d4a017'
const RED   = '#e0524a'
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
  @keyframes btWave       { 0%,100%{height:8px} 50%{height:32px} }
  @keyframes btCountIn    { 0%{opacity:0;transform:scale(2.2) translateY(-20px)} 60%{opacity:1;transform:scale(0.92)} 100%{transform:scale(1)} }
  @keyframes btCountShake { 0%,100%{transform:scale(1) rotate(0deg)} 20%{transform:scale(1.08) rotate(-3deg)} 40%{transform:scale(1.04) rotate(3deg)} 60%{transform:scale(1.06) rotate(-2deg)} 80%{transform:scale(1.02) rotate(2deg)} }
  @keyframes btCountFlash { 0%,100%{opacity:1} 25%{opacity:0.3} 50%{opacity:1} 75%{opacity:0.5} }
  @keyframes btRingOut    { 0%{transform:scale(0.6);opacity:0.9} 100%{transform:scale(2.8);opacity:0} }
  @keyframes btGradPulse  { 0%,100%{opacity:0.55} 50%{opacity:0.85} }
  input[type=range].bt-vol { -webkit-appearance:none; appearance:none; background:transparent; writing-mode:vertical-lr; direction:rtl; height:90px; width:4px; cursor:pointer; }
  input[type=range].bt-vol::-webkit-slider-runnable-track { background:rgba(255,255,255,0.14); border-radius:4px; }
  input[type=range].bt-vol::-webkit-slider-thumb { -webkit-appearance:none; width:14px; height:14px; border-radius:50%; background:#d4a017; margin-left:-5px; }
`

function pickMCQChoices(correctTrack, allTracks) {
  const allAnimes = [...new Set(allTracks.map(t => t.anime))]
  const wrong = allAnimes
    .filter(a => a !== correctTrack.anime)
    .sort(() => Math.random() - 0.5)
    .slice(0, 3)
  return [correctTrack.anime, ...wrong].sort(() => Math.random() - 0.5)
}

function BTStars() {
  const stars = useMemo(() => Array.from({ length: 50 }, (_, i) => ({
    x: (i * 39.1 + 7) % 98, y: (i * 43.7 + 13) % 96,
    size: i % 9 === 0 ? 2.5 : i % 4 === 0 ? 1.6 : 1,
    dur: 2.8 + (i * 0.28) % 4.5, del: (i * 0.21) % 7,
    gold: i % 13 === 0,
  })), [])
  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 3 }}>
      {stars.map((s, i) => (
        <div key={i} style={{
          position: 'absolute', left: `${s.x}%`, top: `${s.y}%`,
          width: s.size, height: s.size, borderRadius: '50%',
          background: s.gold ? 'rgba(212,160,23,.65)' : 'rgba(255,255,255,.5)',
          animation: `btTwinkle ${s.dur}s ${s.del}s ease-in-out infinite`,
        }} />
      ))}
    </div>
  )
}

function BTScanLine() {
  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 4, overflow: 'hidden' }}>
      <div style={{
        position: 'absolute', left: 0, right: 0, height: 2,
        background: 'linear-gradient(90deg,transparent,rgba(212,160,23,.07),rgba(212,160,23,.16),rgba(212,160,23,.07),transparent)',
        animation: 'btScan 16s linear infinite',
      }} />
    </div>
  )
}

function VolumeWidget({ volume, onChange }) {
  const [hover, setHover] = useState(false)
  const icon = volume === 0 ? '🔇' : volume < 0.4 ? '🔈' : volume < 0.75 ? '🔉' : '🔊'
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: 'fixed', bottom: 28, right: 28, zIndex: 20,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
      }}
    >
      {hover && (
        <input
          type="range" className="bt-vol"
          min={0} max={1} step={0.02}
          value={volume}
          onChange={e => onChange(Number(e.target.value))}
          style={{ animation: 'btFadeUp .15s ease' }}
        />
      )}
      <div style={{
        width: hover ? 44 : 34, height: hover ? 44 : 34,
        background: 'rgba(7,9,14,0.88)', border: `1px solid rgba(255,255,255,${hover ? '0.24' : '0.12'})`,
        borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: hover ? 20 : 15, cursor: 'pointer',
        transition: 'all .18s ease',
        boxShadow: hover ? '0 0 16px rgba(212,160,23,0.18)' : 'none',
      }}>
        {icon}
      </div>
    </div>
  )
}

function Waveform({ playing, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 3, height: 40 }}>
      {Array.from({ length: 18 }).map((_, i) => (
        <div key={i} style={{
          width: 3, borderRadius: 2,
          background: color || GOLD,
          opacity: playing ? 0.85 : 0.25,
          animation: playing ? `btWave ${0.5 + (i % 5) * 0.12}s ${i * 0.04}s ease-in-out infinite` : 'none',
          height: playing ? undefined : 8,
        }} />
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

function MCQButton({ label, onClick, selected, correct, revealed, color }) {
  let bg = 'rgba(255,255,255,0.04)'
  let border = '1px solid rgba(255,255,255,0.12)'
  let textColor = 'rgba(255,255,255,0.80)'
  if (selected && !revealed) { bg = `${color || GOLD}20`; border = `1px solid ${color || GOLD}60`; textColor = '#fff' }
  if (revealed && correct)   { bg = 'rgba(34,197,94,0.15)'; border = '1px solid rgba(34,197,94,0.50)'; textColor = GREEN }
  if (revealed && selected && !correct) { bg = 'rgba(239,68,68,0.12)'; border = '1px solid rgba(239,68,68,0.40)'; textColor = RED }
  return (
    <button onClick={onClick} disabled={revealed} style={{
      width: '100%', padding: '14px 18px', borderRadius: 12,
      background: bg, border, color: textColor,
      fontSize: 13, fontWeight: 700, cursor: revealed ? 'default' : 'pointer',
      textAlign: 'left', transition: 'all .15s',
      display: 'flex', alignItems: 'center', gap: 10,
    }}>
      {revealed && correct      && <span style={{ flexShrink: 0, color: GREEN }}>✓</span>}
      {revealed && selected && !correct && <span style={{ flexShrink: 0, color: RED }}>✗</span>}
      {!revealed && selected    && <span style={{ flexShrink: 0, color: color || GOLD }}>▶</span>}
      {!revealed && !selected   && <span style={{ flexShrink: 0, color: 'rgba(255,255,255,0.25)' }}>○</span>}
      {label}
    </button>
  )
}

function RevealCard({ track, result, berries }) {
  const c = track.color
  return (
    <div style={{
      background: `linear-gradient(145deg,${c}18 0%,rgba(7,9,14,0.97) 100%)`,
      border: `1px solid ${c}44`, borderTop: `3px solid ${c}`,
      borderRadius: 16, padding: '22px 24px',
      animation: 'btFadeUp .4s ease', textAlign: 'center',
    }}>
      <div style={{ fontSize: 52, marginBottom: 12, animation: 'btBounce 1s ease', filter: `drop-shadow(0 0 20px ${c}66)` }}>{track.emoji}</div>
      <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.18em', color: c, textTransform: 'uppercase', marginBottom: 6 }}>
        {track.type} · {track.episode}
      </div>
      <div style={{ fontFamily: "'Pirata One',cursive", fontSize: 'clamp(22px,4vw,36px)', color: '#fff', fontWeight: 900, marginBottom: 4, lineHeight: 1.1 }}>{track.title}</div>
      <div style={{ fontSize: 15, color: 'rgba(255,255,255,0.60)', marginBottom: 16 }}>{track.anime}</div>
      <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
        {result.animeOk && <span style={{ fontSize: 11, fontWeight: 700, color: GREEN, background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.30)', borderRadius: 100, padding: '4px 14px' }}>✓ Anime correct</span>}
        {result.titleOk && <span style={{ fontSize: 11, fontWeight: 700, color: GREEN, background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.30)', borderRadius: 100, padding: '4px 14px' }}>✓ Titre bonus</span>}
        {!result.animeOk && !result.titleOk && <span style={{ fontSize: 11, fontWeight: 700, color: '#f87171', background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.28)', borderRadius: 100, padding: '4px 14px' }}>✗ Raté</span>}
      </div>
      {berries > 0 && <div style={{ fontSize: 13, fontWeight: 800, color: GOLD }}>+{berries.toLocaleString('fr-FR')} 🪙 berries</div>}
    </div>
  )
}

function PlayerChip({ player }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6,
      padding: '4px 10px 4px 4px', borderRadius: 100,
      background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)',
    }}>
      {player.avatarUrl
        ? <img src={player.avatarUrl} alt="" style={{ width: 22, height: 22, borderRadius: '50%', objectFit: 'cover' }} />
        : <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(212,160,23,0.20)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>👤</div>
      }
      <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.75)' }}>{player.displayName}</span>
    </div>
  )
}

function makeRoomCode() { return Math.random().toString(36).slice(2, 8).toUpperCase() }
function getRoomFromUrl() { return (new URLSearchParams(window.location.search).get(ROOM_QUERY) || '').trim().toUpperCase() }
function roomUrl(code) { const u = new URL(window.location.href); u.searchParams.set(ROOM_QUERY, code); return u.toString() }

function normalizeRoom(row) {
  return {
    room_code:     row?.room_code     || '',
    track_id:      row?.track_id      || null,
    phase:         row?.phase         || 'lobby',
    round:         Number(row?.round  || 0),
    last_track_id: row?.last_track_id || null,
    started_at:    row?.started_at    || null,
  }
}

export default function BlindTestPage() {
  const navigate = useNavigate()
  const { isAuthenticated, user, displayName, avatarUrl } = useAuth()
  const videoRef       = useRef(null)
  const roomChannelRef = useRef(null)
  const roomGuardRef   = useRef(false)
  const titleRef       = useRef(null)

  const [phase,        setPhase]        = useState('intro')
  const [track,        setTrack]        = useState(null)
  const [lastTrackId,  setLastTrackId]  = useState(null)
  const [elapsed,      setElapsed]      = useState(0)
  const [startTime,    setStartTime]    = useState(null)
  const [animeGuess,   setAnimeGuess]   = useState('')
  const [mcqSelected,  setMcqSelected]  = useState(null)
  const [mcqChoices,   setMcqChoices]   = useState([])
  const [titleGuess,   setTitleGuess]   = useState('')
  const [result,       setResult]       = useState(null)
  const [berries,      setBerries]      = useState(0)
  const [totalScore,   setTotalScore]   = useState(0)
  const [streak,       setStreak]       = useState(0)
  const [maxStreak,    setMaxStreak]    = useState(0)
  const [round,        setRound]        = useState(0)
  const [history,      setHistory]      = useState([])
  const [countdown,    setCountdown]    = useState(3)
  const [guessEnabled, setGuessEnabled] = useState(false)
  const [volume,       setVolume]       = useState(0.7)
  const [videoFailed,  setVideoFailed]  = useState(false)

  const [roomCode,    setRoomCode]    = useState('')
  const [roomInput,   setRoomInput]   = useState('')
  const [roomRole,    setRoomRole]    = useState('local')
  const [roomStatus,  setRoomStatus]  = useState('Mode solo')
  const [roomSync,    setRoomSync]    = useState('idle')
  const [roomNotice,  setRoomNotice]  = useState('')
  const [roomPlayers, setRoomPlayers] = useState([])

  const roomLink = roomCode ? roomUrl(roomCode) : ''
  const isPlaying = phase === 'playing' || phase === 'countdown' || phase === 'reveal'
  const activeTrack = track || LOCAL_TRACKS[0]

  // ── Video overlay alpha: lower = more video visible ───────────────────────
  const overlayAlpha = phase === 'reveal' ? 0.52 : phase === 'playing' ? 0.86 : phase === 'countdown' ? 0.88 : 0.96
  const videoBlur    = phase === 'reveal' ? 0   : 26
  const videoOpacity = isPlaying ? 1 : 0

  // ── Sync volume to video element ──────────────────────────────────────────
  useEffect(() => {
    if (videoRef.current) videoRef.current.volume = volume
  }, [volume])

  useEffect(() => {
    const initialRoom = getRoomFromUrl()
    if (initialRoom) void joinRoom(initialRoom)
    return () => {
      roomChannelRef.current?.unsubscribe?.()
      if (videoRef.current) { videoRef.current.pause(); videoRef.current.src = '' }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (phase !== 'countdown') return
    if (countdown <= 0) {
      videoRef.current?.play().catch(() => {})
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
      if (s >= ROUND_SECS)  handleTimeout()
    }, 250)
    return () => clearInterval(t)
  }, [phase, startTime])

  useEffect(() => {
    if (phase !== 'playing' && videoRef.current) videoRef.current.pause()
  }, [phase])

  function loadVideo(url) {
    const v = videoRef.current
    if (!v) return
    v.pause()
    v.src = url
    v.currentTime = 0
    v.volume = volume
    v.load()
    setVideoFailed(false)
    // Pre-play within user-gesture context to unlock autoplay, then pause for countdown
    v.play().then(() => v.pause()).catch(() => setVideoFailed(true))
  }

  function syncRoomPayload(roomRow) {
    const room = normalizeRoom(roomRow)
    if (!room.room_code) return
    setRoomCode(room.room_code)
    setRoomInput(room.room_code)
    setRoomStatus(room.phase === 'lobby' ? `Salle ${room.room_code}` : `Salle ${room.room_code} ✓`)
    setRoomSync('live')
    if (!room.track_id) return
    const nextTrack = LOCAL_TRACKS.find(t => t.id === room.track_id)
    if (!nextTrack) return
    roomGuardRef.current = true
    loadVideo(nextTrack.url)
    setTrack(nextTrack)
    setLastTrackId(room.last_track_id || nextTrack.id)
    setAnimeGuess(''); setMcqSelected(null)
    setMcqChoices(pickMCQChoices(nextTrack, LOCAL_TRACKS))
    setTitleGuess(''); setResult(null); setBerries(0)
    if (room.phase === 'countdown') {
      const started = room.started_at ? Date.parse(room.started_at) : Date.now()
      const remaining = Math.max(0, 3 - Math.floor((Date.now() - started) / 1000))
      setCountdown(remaining); setGuessEnabled(false); setPhase('countdown')
    } else if (room.phase === 'playing') {
      setPhase('playing'); setStartTime(Date.now()); setElapsed(0); setCountdown(0); setGuessEnabled(false)
    } else if (room.phase === 'reveal') {
      setPhase('reveal')
    }
  }

  async function joinRoom(code) {
    const nextCode = (code || roomInput || '').trim().toUpperCase()
    if (!nextCode) { setRoomStatus('Code manquant'); return }
    setRoomInput(nextCode); setRoomCode(nextCode); setRoomRole('guest')
    setRoomStatus(`Connexion ${nextCode}...`); setRoomSync('loading')
    window.history.replaceState({}, '', roomUrl(nextCode))
    if (!supabase) { setRoomStatus('Supabase non configuré'); setRoomSync('error'); return }
    const { data } = await supabase.from(ROOM_TABLE).select('*').eq('room_code', nextCode).maybeSingle()
    if (!data) { setRoomStatus(`Salle ${nextCode} introuvable`); setRoomSync('error'); return }
    syncRoomPayload(data)
    subscribeRoom(nextCode)
  }

  async function createRoom() {
    const nextCode = makeRoomCode()
    setRoomRole('host'); setRoomCode(nextCode); setRoomInput(nextCode)
    setRoomStatus(`Salle ${nextCode} créée`); setRoomSync('saving')
    window.history.replaceState({}, '', roomUrl(nextCode))
    if (!supabase) { setRoomStatus('Supabase non configuré'); setRoomSync('error'); return }
    await supabase.from(ROOM_TABLE).upsert({
      room_code: nextCode, phase: 'lobby', round: 0,
      track_id: null, last_track_id: null, started_at: null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'room_code' })
    subscribeRoom(nextCode)
    setRoomSync('saved')
  }

  function subscribeRoom(code) {
    roomChannelRef.current?.unsubscribe?.()
    if (!supabase) return
    const myId   = user?.id || 'anon-' + Math.random().toString(36).slice(2, 8)
    const myName = displayName || 'Joueur'

    const channel = supabase
      .channel(`brams-bt-${code}`)
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        setRoomPlayers(Object.values(state).flat())
      })
      .on('postgres_changes', {
        event: '*', schema: 'public', table: ROOM_TABLE, filter: `room_code=eq.${code}`
      }, payload => {
        if (roomGuardRef.current) { roomGuardRef.current = false; return }
        syncRoomPayload(payload.new || payload.old)
      })
      .subscribe(async status => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ userId: myId, displayName: myName, avatarUrl: avatarUrl || null })
        }
      })
    roomChannelRef.current = channel
  }

  async function publishRoomState(nextPhase, nextTrack = track, nextRound = round, nextLastId = lastTrackId) {
    if (!roomCode || roomRole !== 'host' || !supabase) return
    roomGuardRef.current = true
    await supabase.from(ROOM_TABLE).upsert({
      room_code: roomCode, phase: nextPhase, round: nextRound,
      track_id: nextTrack?.id || null, last_track_id: nextLastId || null,
      started_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    }, { onConflict: 'room_code' })
    setRoomSync('saved')
  }

  async function leaveRoom() {
    roomChannelRef.current?.unsubscribe?.()
    roomChannelRef.current = null
    setRoomCode(''); setRoomInput(''); setRoomRole('local')
    setRoomStatus('Mode solo'); setRoomSync('idle'); setRoomPlayers([])
    setPhase('intro'); setTrack(null); setLastTrackId(null)
    setCountdown(3); setGuessEnabled(false)
    window.history.replaceState({}, '', window.location.pathname)
  }

  function startGame() {
    if (roomCode && roomRole !== 'host') { setRoomStatus('Attends le host pour lancer'); return }
    const t = pickTrack(lastTrackId)
    setTrack(t); setLastTrackId(t.id)
    setAnimeGuess(''); setMcqSelected(null)
    setMcqChoices(pickMCQChoices(t, LOCAL_TRACKS))
    setTitleGuess(''); setResult(null); setBerries(0)
    setCountdown(3); setGuessEnabled(false)
    loadVideo(t.url)
    if (roomCode && roomRole === 'host') void publishRoomState('countdown', t, round + 1, t.id)
    setPhase('countdown')
  }

  function handleTimeout() { if (phase !== 'playing') return; submitGuess(true) }

  function submitGuess(timeout = false) {
    if (phase !== 'playing' && !timeout) return
    const ms = Date.now() - startTime
    const res = checkAnswer(animeGuess, titleGuess, track)
    const newStreak = (res.animeOk || res.titleOk) ? streak + 1 : 0
    const earned = (timeout && !res.animeOk && !res.titleOk) ? 0
      : calcBerries({ animeOk: res.animeOk, titleOk: res.titleOk, timeMs: ms, streak })
    setResult(res); setBerries(earned); setStreak(newStreak)
    setMaxStreak(prev => Math.max(prev, newStreak))
    setTotalScore(prev => prev + earned)
    setRound(prev => prev + 1)
    setHistory(prev => [...prev, { track, result: res, earned }])
    setPhase('reveal')
    if (user) logSession({ userId: user.id, trackId: track.id, correct: res.animeOk || res.titleOk, timeMs: ms })
  }

  function nextRound() { if (roomCode && roomRole !== 'host') return; startGame() }

  function endGame() {
    setPhase('end')
    if (user && round > 0) upsertBlindTestScore({ userId: user.id, displayName, avatarUrl, score: totalScore, streakMax: maxStreak, gamesPlayed: 1 })
  }

  const barPct   = phase === 'playing' ? Math.max(0, 100 - (elapsed / ROUND_SECS) * 100) : 0
  const barColor = barPct > 50 ? GREEN : barPct > 25 ? '#f59e0b' : RED

  return (
    <div style={{ minHeight: '100vh', position: 'relative', overflowX: 'hidden' }}>
      <style>{BT_CSS}</style>

      {/* ── Dark base ── */}
      <div style={{ position: 'fixed', inset: 0, background: '#07090e', zIndex: 0 }} />

      {/* ── Video ── */}
      <video
        ref={videoRef}
        playsInline
        loop
        preload="auto"
        onError={() => setVideoFailed(true)}
        style={{
          position: 'fixed', inset: 0, width: '100%', height: '100%',
          objectFit: 'cover', zIndex: 1,
          filter: `blur(${videoBlur}px)`,
          opacity: videoOpacity,
          transition: 'filter 1.4s ease, opacity 1.0s ease',
          pointerEvents: 'none',
          willChange: 'filter, opacity',
          transform: 'scale(1.06)',
        }}
      />

      {/* ── Gradient fallback when video codec unsupported ── */}
      {isPlaying && videoFailed && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1, pointerEvents: 'none',
          background: `radial-gradient(ellipse 80% 60% at 50% 40%, ${activeTrack.color}55 0%, rgba(7,9,14,0.97) 68%)`,
          animation: 'btGradPulse 3.5s ease-in-out infinite',
        }} />
      )}

      {/* ── Dark overlay over video / gradient ── */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 2,
        background: `rgba(7,9,14,${videoFailed && isPlaying ? overlayAlpha - 0.30 : overlayAlpha})`,
        transition: 'background 1.4s ease',
        pointerEvents: 'none',
      }} />

      <BTStars />
      <BTScanLine />

      {/* ── Volume widget ── */}
      <VolumeWidget volume={volume} onChange={v => { setVolume(v); if (videoRef.current) videoRef.current.volume = v }} />

      {/* ── Content ── */}
      <div style={{ position: 'relative', zIndex: 5, maxWidth: 720, margin: '0 auto', padding: '72px 20px 120px' }}>

        {/* Room bar — hidden during active play to keep focus */}
        {!isPlaying && (
          <div style={{
            display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap',
            padding: '12px 14px', marginBottom: 16,
            border: '1px solid rgba(255,255,255,0.09)', borderRadius: 12,
            background: 'rgba(7,9,14,0.80)',
          }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: 'rgba(255,255,255,0.75)' }}>
              {roomStatus}
              {roomCode ? ` · ${roomRole === 'host' ? 'host' : 'guest'}` : ''}
            </div>
            <div style={{ flex: 1 }} />
            <input
              value={roomInput}
              onChange={e => setRoomInput(e.target.value.toUpperCase())}
              placeholder="Code salle"
              style={{
                width: 120, padding: '9px 12px', borderRadius: 10,
                border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(7,9,14,0.9)',
                color: '#fff', fontSize: 13, fontWeight: 800, outline: 'none',
              }}
            />
            <button onClick={() => joinRoom(roomInput)} style={smallBtn(false)}>Rejoindre</button>
            <button onClick={createRoom}               style={smallBtn(true)}>Créer</button>
            <button onClick={leaveRoom}                style={smallBtn(false)} disabled={!roomCode}>Quitter</button>
          </div>
        )}

        {/* Room link — only in lobby */}
        {roomLink && !isPlaying && (
          <div style={{
            display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap',
            padding: '10px 14px', marginBottom: 12,
            border: '1px solid rgba(212,160,23,0.20)', borderRadius: 12,
            background: 'rgba(212,160,23,0.07)',
          }}>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.72)' }}>Code: <strong style={{ color: '#fff', letterSpacing: '.06em' }}>{roomCode}</strong></div>
            <div style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 11, color: 'rgba(255,255,255,0.40)' }}>{roomLink}</div>
            <button
              onClick={async () => { await navigator.clipboard.writeText(roomLink); setRoomNotice('Copié !'); setTimeout(() => setRoomNotice(''), 1400) }}
              style={smallBtn(true)}
            >{roomNotice || 'Copier le lien'}</button>
          </div>
        )}

        {/* Player list */}
        {roomCode && roomPlayers.length > 0 && !isPlaying && (
          <div style={{
            display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center',
            padding: '8px 14px', marginBottom: 20,
            border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12,
            background: 'rgba(255,255,255,0.03)',
          }}>
            <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '.18em', color: 'rgba(255,255,255,0.28)', textTransform: 'uppercase', marginRight: 4 }}>
              {roomPlayers.length} joueur{roomPlayers.length > 1 ? 's' : ''}
            </span>
            {roomPlayers.map((p, i) => <PlayerChip key={i} player={p} />)}
          </div>
        )}

        {/* Player list compact during play */}
        {roomCode && roomPlayers.length > 0 && isPlaying && (
          <div style={{
            display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16,
            justifyContent: 'center',
          }}>
            {roomPlayers.map((p, i) => <PlayerChip key={i} player={p} />)}
          </div>
        )}

        {/* ── INTRO ── */}
        {phase === 'intro' && (
          <div style={{ textAlign: 'center', animation: 'btFadeUp .5s ease' }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 18px',
              borderRadius: 100, background: 'rgba(212,160,23,0.10)', border: '1px solid rgba(212,160,23,0.28)',
              fontSize: 10, fontWeight: 800, letterSpacing: '.22em', color: GOLD, textTransform: 'uppercase', marginBottom: 22,
            }}>🎵 Blind Test Anime</div>
            <h1 style={{ fontFamily: "'Pirata One',cursive", fontSize: 'clamp(46px,8vw,84px)', color: '#fff', margin: '0 0 16px', lineHeight: 1 }}>
              Blind Test
            </h1>
            <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.42)', maxWidth: 480, margin: '0 auto 36px', lineHeight: 1.75 }}>
              Un opening se lance en fond. Choisis parmi 4 propositions et tape le titre pour le bonus.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))', gap: 10, marginBottom: 40, textAlign: 'left' }}>
              {LOCAL_TRACKS.map((t, i) => (
                <div key={t.id} style={{
                  background: `linear-gradient(145deg,${t.color}14 0%,rgba(7,9,14,0.97) 100%)`,
                  border: `1px solid ${t.color}22`, borderTop: `2px solid ${t.color}`,
                  borderRadius: 12, padding: '12px 14px',
                  animation: `btFadeUp .4s ${i * 0.04}s ease both`,
                }}>
                  <div style={{ fontSize: 22, marginBottom: 5 }}>{t.emoji}</div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: '#fff', marginBottom: 2 }}>{t.anime}</div>
                  <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)' }}>{t.type} · {t.episode}</div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 36 }}>
              {[['🎯','Anime = 50 pts'],['🎵','Titre = +30 pts'],['⚡','< 5s = ×2'],['🔥','Streak ×3 = ×1.2']].map(([icon, text], i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 100, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.65)' }}>
                  <span>{icon}</span><span>{text}</span>
                </div>
              ))}
            </div>

            <button
              onClick={startGame}
              style={{
                padding: '15px 44px', borderRadius: 100, border: 'none', fontSize: 16, fontWeight: 800,
                background: `linear-gradient(135deg,${GOLD},#e5b83a)`, color: '#1a1200', cursor: 'pointer',
                letterSpacing: '.04em', boxShadow: `0 8px 32px rgba(212,160,23,0.35)`,
                fontFamily: "'Pirata One',cursive",
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

        {/* ── COUNTDOWN — centré verticalement ── */}
        {phase === 'countdown' && (() => {
          const n = countdown
          const cfg = n === 3
            ? { color: '#22c55e', glow: 'rgba(34,197,94,0.55)',  anim: 'btCountIn .45s cubic-bezier(.22,1,.36,1) both', ring: 'rgba(34,197,94,0.35)' }
            : n === 2
            ? { color: '#f59e0b', glow: 'rgba(245,158,11,0.60)', anim: 'btCountIn .40s cubic-bezier(.22,1,.36,1) both', ring: 'rgba(245,158,11,0.40)' }
            : n === 1
            ? { color: '#ef4444', glow: 'rgba(239,68,68,0.70)',  anim: 'btCountShake .55s ease-in-out, btCountFlash .3s .1s ease-in-out', ring: 'rgba(239,68,68,0.45)' }
            : { color: GOLD,      glow: `rgba(212,160,23,0.55)`, anim: 'btCountIn .35s cubic-bezier(.22,1,.36,1) both', ring: 'rgba(212,160,23,0.35)' }
          return (
            <div style={{
              textAlign: 'center',
              minHeight: 'calc(100vh - 260px)', display: 'flex', flexDirection: 'column', justifyContent: 'center',
            }}>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.22em', color: 'rgba(255,255,255,0.40)', textTransform: 'uppercase', marginBottom: 32 }}>
                {roomCode ? `Salle ${roomCode} · prépare-toi...` : 'Prépare-toi...'}
              </div>

              {/* Number + ring VFX */}
              <div style={{ position: 'relative', display: 'inline-block', margin: '0 auto' }}>
                {/* Expanding ring */}
                <div key={`ring-${n}`} style={{
                  position: 'absolute', inset: '-20%', borderRadius: '50%',
                  border: `3px solid ${cfg.ring}`,
                  animation: 'btRingOut .7s ease-out forwards',
                  pointerEvents: 'none',
                }} />
                <div key={`ring2-${n}`} style={{
                  position: 'absolute', inset: '-5%', borderRadius: '50%',
                  border: `2px solid ${cfg.ring}`,
                  animation: 'btRingOut .9s .12s ease-out forwards',
                  pointerEvents: 'none',
                }} />

                <div
                  key={n}
                  style={{
                    fontFamily: "'Pirata One',cursive",
                    fontSize: 'clamp(130px,24vw,200px)',
                    color: n === 0 ? GOLD : cfg.color,
                    lineHeight: 1,
                    textShadow: `0 0 60px ${cfg.glow}, 0 0 120px ${cfg.glow}`,
                    animation: cfg.anim,
                    display: 'block',
                  }}
                >
                  {n || '▶'}
                </div>
              </div>

              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.28)', marginTop: 28, letterSpacing: '.06em' }}>
                L'extrait va commencer...
              </div>
            </div>
          )
        })()}

        {/* ── PLAYING — centré ── */}
        {phase === 'playing' && track && (
          <div style={{
            animation: 'btFadeUp .3s ease',
            minHeight: 'calc(100vh - 260px)', display: 'flex', flexDirection: 'column', justifyContent: 'center',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <ScorePill label="Score" value={totalScore.toLocaleString('fr-FR')} />
              <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                <ScorePill label="Streak" value={streak} color={streak >= 3 ? '#f59e0b' : 'rgba(255,255,255,0.55)'} />
                <ScorePill label="Round"  value={round + 1} color="rgba(255,255,255,0.55)" />
              </div>
            </div>

            <div style={{ background: 'rgba(7,9,14,0.82)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 18, padding: '24px 24px 20px', backdropFilter: 'blur(6px)' }}>
              {/* Timer bar */}
              <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 100, overflow: 'hidden', marginBottom: 20, position: 'relative' }}>
                <div style={{
                  position: 'absolute', left: 0, top: 0, height: '100%',
                  background: `linear-gradient(90deg,${barColor}88,${barColor})`,
                  borderRadius: 100, width: `${barPct}%`,
                  transition: 'width .25s linear, background .25s',
                  boxShadow: `0 0 8px ${barColor}44`,
                }} />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <Waveform playing color={activeTrack.color} />
                <div style={{ fontFamily: "'Pirata One',cursive", fontSize: 28, color: elapsed <= 5 ? GREEN : elapsed <= 15 ? GOLD : RED, fontWeight: 900 }}>
                  {ROUND_SECS - elapsed}s
                </div>
              </div>

              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.32)', textAlign: 'center', marginBottom: guessEnabled ? 18 : 0 }}>
                {!guessEnabled ? `⏳ Écoute encore ${GUESS_DELAY - elapsed}s...` : '🎯 Choisis l\'anime !'}
              </div>

              {guessEnabled && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '.18em', color: 'rgba(255,255,255,0.28)', textTransform: 'uppercase', marginBottom: 2 }}>
                    Quel anime ?
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
                    {mcqChoices.map((choice, i) => (
                      <MCQButton
                        key={i} label={choice}
                        selected={mcqSelected === choice}
                        revealed={false} color={activeTrack.color}
                        onClick={() => { setAnimeGuess(choice); setMcqSelected(choice); titleRef.current?.focus() }}
                      />
                    ))}
                  </div>

                  <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '.18em', color: 'rgba(255,255,255,0.28)', textTransform: 'uppercase', marginBottom: 2 }}>
                    Titre de l'opening (bonus)
                  </div>
                  <input
                    type="text" value={titleGuess}
                    onChange={e => setTitleGuess(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && submitGuess()}
                    ref={titleRef}
                    placeholder="Titre de l'opening..."
                    style={inputStyle}
                  />

                  <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                    <button onClick={() => submitGuess()} style={primaryBtnStyle} disabled={!mcqSelected}>Valider</button>
                    <button onClick={() => submitGuess()} style={secondaryBtnStyle}>Passer</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── REVEAL ── */}
        {phase === 'reveal' && track && result && (
          <div style={{
            animation: 'btFadeUp .4s ease',
            minHeight: 'calc(100vh - 260px)', display: 'flex', flexDirection: 'column', justifyContent: 'center',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <ScorePill label="Score total" value={totalScore.toLocaleString('fr-FR')} />
              <ScorePill label="Streak" value={streak} color={streak >= 3 ? '#f59e0b' : 'rgba(255,255,255,0.55)'} />
            </div>

            {/* MCQ revealed */}
            <div style={{ background: 'rgba(7,9,14,0.72)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '16px 18px', marginBottom: 14, backdropFilter: 'blur(4px)' }}>
              <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '.18em', color: 'rgba(255,255,255,0.28)', textTransform: 'uppercase', marginBottom: 8 }}>Quel anime ?</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {mcqChoices.map((choice, i) => (
                  <MCQButton key={i} label={choice}
                    selected={mcqSelected === choice}
                    correct={choice === track.anime}
                    revealed={true} color={activeTrack.color}
                    onClick={() => {}}
                  />
                ))}
              </div>
            </div>

            <RevealCard track={track} result={result} berries={berries} />

            <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
              <button onClick={nextRound} style={{ ...primaryBtnStyle, flex: 1, fontFamily: "'Pirata One',cursive" }}>Extrait suivant →</button>
              {round >= 2 && <button onClick={endGame} style={endBtnStyle}>Terminer</button>}
            </div>
          </div>
        )}

        {/* ── END ── */}
        {phase === 'end' && (
          <div style={{ textAlign: 'center', animation: 'btFadeUp .5s ease' }}>
            <div style={{ fontSize: 72, marginBottom: 20, animation: 'btFloat 3s ease-in-out infinite', filter: `drop-shadow(0 0 28px ${GOLD}55)` }}>🏆</div>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.22em', color: GOLD, textTransform: 'uppercase', marginBottom: 12 }}>Partie terminée</div>
            <h2 style={{ fontFamily: "'Pirata One',cursive", fontSize: 'clamp(36px,6vw,64px)', color: '#fff', margin: '0 0 28px', lineHeight: 1 }}>Score final</h2>

            <div style={{ display: 'flex', gap: 28, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 36 }}>
              {[
                { val: totalScore.toLocaleString('fr-FR'), label: 'Berries gagnées', color: GOLD },
                { val: maxStreak, label: 'Streak max', color: '#f59e0b' },
                { val: round, label: 'Rounds joués', color: 'rgba(255,255,255,0.80)' },
              ].map((s, i, arr) => (
                <>
                  <div key={i} style={{ textAlign: 'center' }}>
                    <div style={{ fontFamily: "'Pirata One',cursive", fontSize: 42, fontWeight: 900, color: s.color, lineHeight: 1 }}>{s.val}</div>
                    <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.38)', marginTop: 4 }}>{s.label}</div>
                  </div>
                  {i < arr.length - 1 && <div key={`d${i}`} style={{ width: 1, height: 48, background: 'rgba(255,255,255,0.08)', alignSelf: 'center' }} />}
                </>
              ))}
            </div>

            {!isAuthenticated && (
              <div style={{ padding: '14px 20px', borderRadius: 12, background: 'rgba(212,160,23,0.08)', border: '1px solid rgba(212,160,23,0.22)', marginBottom: 24, fontSize: 13, color: 'rgba(255,255,255,0.60)', lineHeight: 1.6 }}>
                💡 Connecte-toi avec Discord pour sauvegarder ton score !
              </div>
            )}

            <div style={{ textAlign: 'left', marginBottom: 32 }}>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.18em', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', marginBottom: 14 }}>Récap</div>
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
              <button onClick={() => { setPhase('intro'); setTotalScore(0); setStreak(0); setMaxStreak(0); setRound(0); setHistory([]) }} style={primaryBtnStyle}>Rejouer</button>
              <button onClick={() => navigate('/blind-test/leaderboard')} style={endBtnStyle}>Classement</button>
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
    borderRadius: 10, padding: '9px 13px',
    cursor: 'pointer', fontWeight: 800, fontSize: 12,
  }
}

const inputStyle = {
  padding: '13px 16px', borderRadius: 12, width: '100%', boxSizing: 'border-box',
  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.14)',
  color: '#fff', fontSize: 14, outline: 'none', fontFamily: 'var(--body)',
}

const primaryBtnStyle = {
  flex: 1, padding: '12px', borderRadius: 12, border: 'none',
  background: `linear-gradient(135deg,${GOLD},#e5b83a)`, color: '#1a1200',
  fontSize: 14, fontWeight: 800, cursor: 'pointer', letterSpacing: '.02em',
}

const secondaryBtnStyle = {
  padding: '12px 16px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.10)',
  background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.45)',
  fontSize: 13, fontWeight: 700, cursor: 'pointer',
}

const endBtnStyle = {
  padding: '12px 28px', borderRadius: 100,
  border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.04)',
  color: 'rgba(255,255,255,0.70)', fontSize: 14, fontWeight: 700, cursor: 'pointer',
}
