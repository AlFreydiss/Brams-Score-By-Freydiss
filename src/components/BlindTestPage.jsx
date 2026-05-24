import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  motion, AnimatePresence,
  useMotionValue, useSpring, useTransform,
} from 'framer-motion'
import { useAuth } from '../contexts/AuthContext.jsx'
import { supabase } from '../lib/supabase.js'
import {
  LOCAL_TRACKS, pickTrack, checkAnswer, calcBerries,
  upsertBlindTestScore, logSession,
} from '../lib/blindTest.js'

// ─── Palette ───────────────────────────────────────────────────────────────
const GOLD   = '#d4a017'
const GOLD2  = '#ffd700'
const RED    = '#c62828'
const RED2   = '#ef4444'
const ORANGE = '#f57c00'
const GREEN  = '#22c55e'
const BG     = '#0a0a0b'

const ROOM_QUERY = 'room'
const ROOM_TABLE = 'blind_test_rooms'
const ROUND_SECS = 30
const GUESS_DELAY = 5

// ─── CSS global (keyframes only) ───────────────────────────────────────────
const BT_CSS = `
  @keyframes btTwinkle { 0%,100%{opacity:.08} 50%{opacity:.55} }
  @keyframes btScan    { 0%{top:-2px} 100%{top:100%} }
  @keyframes btWave    { 0%,100%{height:6px} 50%{height:28px} }
  @keyframes btFloat   { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
  @keyframes btRingOut { 0%{transform:scale(.5);opacity:.9} 100%{transform:scale(2.6);opacity:0} }
  @keyframes btCountIn { 0%{opacity:0;transform:scale(2.4) translateY(-18px)} 60%{opacity:1;transform:scale(.93)} 100%{transform:scale(1)} }
  @keyframes btCountShake { 0%,100%{transform:rotate(0)} 20%{transform:rotate(-4deg) scale(1.07)} 50%{transform:rotate(4deg) scale(1.05)} 80%{transform:rotate(-2deg) scale(1.03)} }
  @keyframes btCountFlash { 0%,100%{opacity:1} 30%{opacity:.25} 60%{opacity:.85} }
  @keyframes btGradPulse { 0%,100%{opacity:.55} 50%{opacity:.85} }
  @keyframes btFlashGreen { 0%{opacity:.32} 40%{opacity:.18} 100%{opacity:0} }
  @keyframes btFlashRed   { 0%{opacity:.28} 40%{opacity:.15} 100%{opacity:0} }
  @keyframes btConfetti   { 0%{opacity:1;transform:translateY(0) rotate(0deg) scale(1)} 100%{opacity:0;transform:translateY(-90px) rotate(520deg) scale(.4)} }
  input[type=range].bt-vol { -webkit-appearance:none;appearance:none;background:transparent;writing-mode:vertical-lr;direction:rtl;height:90px;width:4px;cursor:pointer }
  input[type=range].bt-vol::-webkit-slider-runnable-track { background:rgba(255,255,255,.12);border-radius:4px }
  input[type=range].bt-vol::-webkit-slider-thumb { -webkit-appearance:none;width:14px;height:14px;border-radius:50%;background:${GOLD};margin-left:-5px }
  * { box-sizing: border-box }
`

// ─── Helpers ───────────────────────────────────────────────────────────────
function pickMCQChoices(correctTrack, allTracks) {
  const allAnimes = [...new Set(allTracks.map(t => t.anime))]
  const wrong = allAnimes
    .filter(a => a !== correctTrack.anime)
    .sort(() => Math.random() - 0.5)
    .slice(0, 3)
  return [correctTrack.anime, ...wrong].sort(() => Math.random() - 0.5)
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

// ─── Sub-components ────────────────────────────────────────────────────────

function BTStars() {
  const stars = useMemo(() => Array.from({ length: 60 }, (_, i) => ({
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
          background: s.gold ? 'rgba(212,160,23,.55)' : 'rgba(255,255,255,.4)',
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
        background: 'linear-gradient(90deg,transparent,rgba(212,160,23,.06),rgba(212,160,23,.13),rgba(212,160,23,.06),transparent)',
        animation: 'btScan 18s linear infinite',
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
      style={{ position: 'fixed', bottom: 28, right: 28, zIndex: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}
    >
      <AnimatePresence>
        {hover && (
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.15 }}
          >
            <input type="range" className="bt-vol" min={0} max={1} step={0.02} value={volume}
              onChange={e => onChange(Number(e.target.value))} />
          </motion.div>
        )}
      </AnimatePresence>
      <motion.div
        whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.94 }}
        style={{
          width: hover ? 44 : 36, height: hover ? 44 : 36,
          background: 'rgba(7,9,14,0.90)', border: `1px solid rgba(255,255,255,${hover ? '0.22' : '0.10'})`,
          borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: hover ? 20 : 15, cursor: 'pointer',
          transition: 'all .18s ease',
          boxShadow: hover ? `0 0 18px rgba(212,160,23,0.22)` : 'none',
        }}
      >
        {icon}
      </motion.div>
    </div>
  )
}

function Waveform({ playing, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 3, height: 36 }}>
      {Array.from({ length: 16 }).map((_, i) => (
        <div key={i} style={{
          width: 3, borderRadius: 2,
          background: color || GOLD,
          opacity: playing ? 0.90 : 0.20,
          animation: playing ? `btWave ${0.5 + (i % 5) * 0.12}s ${i * 0.04}s ease-in-out infinite` : 'none',
          height: playing ? undefined : 6,
        }} />
      ))}
    </div>
  )
}

// Circular SVG timer ring
function TimerRing({ elapsed, total, color }) {
  const R = 52, STROKE = 5
  const C = 2 * Math.PI * R
  const pct = Math.max(0, (total - elapsed) / total)
  const dashOffset = C * (1 - pct)
  const secs = total - elapsed
  const ringColor = pct > 0.5 ? GREEN : pct > 0.25 ? ORANGE : RED2

  return (
    <div style={{ position: 'relative', width: 130, height: 130, flexShrink: 0 }}>
      <svg width="130" height="130" style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)' }}>
        <circle cx="65" cy="65" r={R} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={STROKE} />
        <motion.circle
          cx="65" cy="65" r={R} fill="none"
          stroke={ringColor} strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={C}
          animate={{ strokeDashoffset: dashOffset, stroke: ringColor }}
          transition={{ duration: 0.25, ease: 'linear' }}
          style={{ filter: `drop-shadow(0 0 6px ${ringColor}88)` }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      }}>
        <motion.span
          key={secs}
          initial={{ scale: 1.25, opacity: 0.6 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.2 }}
          style={{
            fontFamily: "'Pirata One',cursive", fontSize: 36, fontWeight: 900,
            color: ringColor, lineHeight: 1,
          }}
        >
          {secs}
        </motion.span>
        <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.30)', marginTop: 2 }}>sec</span>
      </div>
    </div>
  )
}

// Animated score counter using spring
function AnimatedScore({ value, color = GOLD, label, size = 32 }) {
  const mv = useMotionValue(value)
  const spring = useSpring(mv, { stiffness: 180, damping: 28 })
  const display = useTransform(spring, v => Math.round(v).toLocaleString('fr-FR'))

  useEffect(() => { mv.set(value) }, [value, mv])

  return (
    <div style={{ textAlign: 'center' }}>
      <motion.span style={{
        fontFamily: "'Pirata One',cursive", fontSize: size, fontWeight: 900,
        color, lineHeight: 1, display: 'block',
      }}>
        {display}
      </motion.span>
      <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.32)', marginTop: 3, display: 'block' }}>{label}</span>
    </div>
  )
}

// MCQ button — Framer Motion enhanced
function MCQButton({ label, index, onClick, selected, correct, revealed, color }) {
  let bg, border, textColor, icon

  if (revealed && correct) {
    bg = 'rgba(34,197,94,0.14)'; border = '1.5px solid rgba(34,197,94,0.55)'; textColor = GREEN; icon = '✓'
  } else if (revealed && selected && !correct) {
    bg = 'rgba(239,68,68,0.13)'; border = '1.5px solid rgba(239,68,68,0.45)'; textColor = RED2; icon = '✗'
  } else if (revealed) {
    bg = 'rgba(255,255,255,0.02)'; border = '1px solid rgba(255,255,255,0.07)'; textColor = 'rgba(255,255,255,0.30)'; icon = '○'
  } else if (selected) {
    bg = `${color || GOLD}1a`; border = `1.5px solid ${color || GOLD}70`; textColor = '#fff'; icon = '▶'
  } else {
    bg = 'rgba(255,255,255,0.035)'; border = '1px solid rgba(255,255,255,0.10)'; textColor = 'rgba(255,255,255,0.75)'; icon = '○'
  }

  const wrongShake = revealed && selected && !correct
  const correctPop = revealed && correct

  return (
    <motion.button
      custom={index}
      variants={{
        hidden: { opacity: 0, y: 14, scale: 0.97 },
        visible: (i) => ({ opacity: 1, y: 0, scale: 1, transition: { delay: i * 0.07, duration: 0.32, ease: [0.22, 1, 0.36, 1] } }),
      }}
      initial="hidden"
      animate={wrongShake
        ? { x: [0, -10, 10, -8, 7, -5, 0], scale: 1, opacity: 1 }
        : correctPop
        ? { scale: [1, 1.04, 1], opacity: 1 }
        : 'visible'}
      whileHover={!revealed ? { scale: 1.02, transition: { duration: 0.14 } } : undefined}
      whileTap={!revealed ? { scale: 0.97 } : undefined}
      transition={wrongShake ? { duration: 0.45 } : correctPop ? { duration: 0.38 } : undefined}
      onClick={onClick}
      disabled={revealed}
      style={{
        width: '100%', padding: '14px 16px', borderRadius: 14,
        background: bg, border, color: textColor,
        fontSize: 13, fontWeight: 700, cursor: revealed ? 'default' : 'pointer',
        textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10,
        boxShadow: selected && !revealed ? `0 0 16px ${color || GOLD}28` : 'none',
        transition: 'background .15s, border-color .15s, box-shadow .15s',
        outline: 'none',
      }}
    >
      <span style={{
        flexShrink: 0, fontSize: 13, width: 16, textAlign: 'center',
        color: revealed && correct ? GREEN : revealed && selected ? RED2 : selected ? color || GOLD : 'rgba(255,255,255,0.28)',
      }}>{icon}</span>
      <span style={{ flex: 1, lineHeight: 1.35 }}>{label}</span>
      {revealed && correct && (
        <motion.span
          initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 18 }}
          style={{ fontSize: 16 }}
        >✨</motion.span>
      )}
    </motion.button>
  )
}

// Reveal card
function RevealCard({ track, result, berries }) {
  const c = track.color
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
      style={{
        background: `linear-gradient(145deg,${c}16 0%,rgba(10,10,11,0.97) 100%)`,
        border: `1px solid ${c}38`, borderTop: `3px solid ${c}`,
        borderRadius: 18, padding: '24px', textAlign: 'center',
      }}
    >
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.1 }}
        style={{ fontSize: 58, marginBottom: 14, filter: `drop-shadow(0 0 24px ${c}77)`, display: 'inline-block' }}
      >
        {track.emoji}
      </motion.div>

      <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.20em', color: c, textTransform: 'uppercase', marginBottom: 6 }}>
        {track.type} · {track.episode}
      </div>
      <div style={{ fontFamily: "'Pirata One',cursive", fontSize: 'clamp(22px,4vw,36px)', color: '#fff', fontWeight: 900, marginBottom: 4, lineHeight: 1.1 }}>
        {track.title}
      </div>
      <div style={{ fontSize: 15, color: 'rgba(255,255,255,0.55)', marginBottom: 18 }}>{track.anime}</div>

      <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
        {result.animeOk && (
          <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.2 }}
            style={pillStyle(GREEN, 'rgba(34,197,94,0.12)', 'rgba(34,197,94,0.28)')}>
            ✓ Anime correct
          </motion.span>
        )}
        {result.titleOk && (
          <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.28 }}
            style={pillStyle(GREEN, 'rgba(34,197,94,0.12)', 'rgba(34,197,94,0.28)')}>
            ✓ Titre bonus
          </motion.span>
        )}
        {!result.animeOk && !result.titleOk && (
          <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.2 }}
            style={pillStyle('#f87171', 'rgba(239,68,68,0.10)', 'rgba(239,68,68,0.26)')}>
            ✗ Raté
          </motion.span>
        )}
      </div>

      {berries > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.3 }}
          style={{ fontSize: 15, fontWeight: 800, color: GOLD2, letterSpacing: '.02em' }}
        >
          +{berries.toLocaleString('fr-FR')} 🪙
        </motion.div>
      )}
    </motion.div>
  )
}

function PlayerChip({ player }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6,
      padding: '4px 10px 4px 5px', borderRadius: 100,
      background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)',
    }}>
      {player.avatarUrl
        ? <img src={player.avatarUrl} alt="" style={{ width: 22, height: 22, borderRadius: '50%', objectFit: 'cover' }} />
        : <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(212,160,23,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 }}>👤</div>
      }
      <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.72)' }}>{player.displayName}</span>
    </div>
  )
}

// ─── Confetti burst on correct answer ──────────────────────────────────────
function ConfettiBurst({ active }) {
  const pieces = useMemo(() => Array.from({ length: 22 }, (_, i) => ({
    x: (Math.random() - 0.5) * 280, color: [GOLD2, GREEN, ORANGE, '#fff', RED2][i % 5],
    dur: 0.7 + Math.random() * 0.5, del: Math.random() * 0.2, size: 6 + Math.random() * 6,
  })), [])
  if (!active) return null
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', borderRadius: 18 }}>
      {pieces.map((p, i) => (
        <div key={i} style={{
          position: 'absolute', bottom: '40%', left: '50%',
          width: p.size, height: p.size * 0.55, borderRadius: 2,
          background: p.color, transformOrigin: 'center',
          animation: `btConfetti ${p.dur}s ${p.del}s ease-out forwards`,
          transform: `translateX(${p.x}px)`,
        }} />
      ))}
    </div>
  )
}

// ─── Main component ────────────────────────────────────────────────────────
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
  const [showConfetti, setShowConfetti] = useState(false)

  const [roomCode,    setRoomCode]    = useState('')
  const [roomInput,   setRoomInput]   = useState('')
  const [roomRole,    setRoomRole]    = useState('local')
  const [roomStatus,  setRoomStatus]  = useState('Mode solo')
  const [roomSync,    setRoomSync]    = useState('idle')
  const [roomNotice,  setRoomNotice]  = useState('')
  const [roomPlayers, setRoomPlayers] = useState([])

  const roomLink  = roomCode ? roomUrl(roomCode) : ''
  const isPlaying = phase === 'playing' || phase === 'countdown' || phase === 'reveal'
  const activeTrack = track || LOCAL_TRACKS[0]

  const overlayAlpha = phase === 'reveal' ? 0.50 : phase === 'playing' ? 0.93 : phase === 'countdown' ? 0.93 : 0.95
  const videoBlur    = phase === 'reveal' ? 0 : 55
  const videoOpacity = isPlaying ? 1 : 0

  const barPct   = phase === 'playing' ? Math.max(0, 100 - (elapsed / ROUND_SECS) * 100) : 0
  const barColor = barPct > 50 ? GREEN : barPct > 25 ? ORANGE : RED2

  useEffect(() => { if (videoRef.current) videoRef.current.volume = volume }, [volume])

  useEffect(() => {
    const initialRoom = getRoomFromUrl()
    if (initialRoom) void joinRoom(initialRoom)
    return () => {
      roomChannelRef.current?.unsubscribe?.()
      if (videoRef.current) { videoRef.current.pause(); videoRef.current.src = '' }
    }
  }, [])

  useEffect(() => {
    if (phase !== 'countdown') return
    if (countdown <= 0) {
      videoRef.current?.play().catch(() => {})
      setPhase('playing'); setStartTime(Date.now()); setElapsed(0)
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
    if (!videoRef.current) return
    if (phase === 'intro' || phase === 'end') videoRef.current.pause()
  }, [phase])

  function loadVideo(url) {
    const v = videoRef.current
    if (!v) return
    v.pause(); v.src = url; v.currentTime = 0; v.volume = volume; v.load()
    setVideoFailed(false)
    v.play().then(() => v.pause()).catch(() => setVideoFailed(true))
  }

  function syncRoomPayload(roomRow) {
    const room = normalizeRoom(roomRow)
    if (!room.room_code) return
    setRoomCode(room.room_code); setRoomInput(room.room_code)
    setRoomStatus(room.phase === 'lobby' ? `Salle ${room.room_code}` : `Salle ${room.room_code} ✓`)
    setRoomSync('live')
    if (!room.track_id) return
    const nextTrack = LOCAL_TRACKS.find(t => t.id === room.track_id)
    if (!nextTrack) return
    roomGuardRef.current = true
    loadVideo(nextTrack.url)
    setTrack(nextTrack); setLastTrackId(room.last_track_id || nextTrack.id)
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
    syncRoomPayload(data); subscribeRoom(nextCode)
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
    subscribeRoom(nextCode); setRoomSync('saved')
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
        if (status === 'SUBSCRIBED')
          await channel.track({ userId: myId, displayName: myName, avatarUrl: avatarUrl || null })
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
    if (res.animeOk || res.titleOk) {
      setShowConfetti(true)
      setTimeout(() => setShowConfetti(false), 1200)
    }
    if (user) logSession({ userId: user.id, trackId: track.id, correct: res.animeOk || res.titleOk, timeMs: ms })
  }

  function nextRound() { if (roomCode && roomRole !== 'host') return; startGame() }

  function endGame() {
    setPhase('end')
    if (user && round > 0) upsertBlindTestScore({ userId: user.id, displayName, avatarUrl, score: totalScore, streakMax: maxStreak, gamesPlayed: 1 })
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', position: 'relative', overflowX: 'hidden', background: BG }}>
      <style>{BT_CSS}</style>

      {/* Dark base */}
      <div style={{ position: 'fixed', inset: 0, background: BG, zIndex: 0 }} />

      {/* Video background */}
      <video
        ref={videoRef} playsInline loop preload="auto"
        onError={() => setVideoFailed(true)}
        style={{
          position: 'fixed', inset: 0, width: '100%', height: '100%',
          objectFit: 'cover', zIndex: 1,
          filter: `blur(${videoBlur}px)`,
          opacity: videoOpacity,
          transition: 'filter 1.4s ease, opacity 1.0s ease',
          pointerEvents: 'none', willChange: 'filter, opacity',
          transform: 'scale(1.06)',
        }}
      />

      {/* Gradient fallback */}
      {isPlaying && videoFailed && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1, pointerEvents: 'none',
          background: `radial-gradient(ellipse 80% 60% at 50% 40%, ${activeTrack.color}55 0%, rgba(10,10,11,0.97) 68%)`,
          animation: 'btGradPulse 3.5s ease-in-out infinite',
        }} />
      )}

      {/* Reveal flash (correct = green, wrong = red) */}
      <AnimatePresence>
        {phase === 'reveal' && result && (
          <motion.div
            key="revealFlash"
            initial={{ opacity: 1 }} animate={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            style={{
              position: 'fixed', inset: 0, zIndex: 6, pointerEvents: 'none',
              background: result.animeOk
                ? 'rgba(34,197,94,0.22)'
                : 'rgba(198,40,40,0.22)',
            }}
          />
        )}
      </AnimatePresence>

      {/* Dark overlay */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 2,
        background: `rgba(10,10,11,${videoFailed && isPlaying ? overlayAlpha - 0.28 : overlayAlpha})`,
        transition: 'background 1.4s ease', pointerEvents: 'none',
      }} />

      <BTStars />
      <BTScanLine />
      <VolumeWidget volume={volume} onChange={v => { setVolume(v); if (videoRef.current) videoRef.current.volume = v }} />

      {/* Main content */}
      <div style={{ position: 'relative', zIndex: 5, maxWidth: 680, margin: '0 auto', padding: '64px 18px 120px' }}>

        {/* Room bar */}
        {!isPlaying && (
          <motion.div
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            style={glassPanel({ marginBottom: 12 })}
          >
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: 'rgba(255,255,255,0.72)', flex: 1 }}>
                {roomStatus}{roomCode ? ` · ${roomRole === 'host' ? 'host' : 'guest'}` : ''}
              </div>
              <input
                value={roomInput}
                onChange={e => setRoomInput(e.target.value.toUpperCase())}
                placeholder="Code salle"
                style={inputStyle({ width: 114, textTransform: 'uppercase' })}
              />
              <button onClick={() => joinRoom(roomInput)} style={smallBtn(false)}>Rejoindre</button>
              <button onClick={createRoom}               style={smallBtn(true)}>Créer</button>
              <button onClick={leaveRoom}                style={smallBtn(false)} disabled={!roomCode}>Quitter</button>
            </div>
          </motion.div>
        )}

        {/* Room link */}
        {roomLink && !isPlaying && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{ ...glassPanel({ marginBottom: 10 }), borderColor: 'rgba(212,160,23,0.24)', background: 'rgba(212,160,23,0.07)' }}
          >
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.70)' }}>Code: <strong style={{ color: '#fff', letterSpacing: '.06em' }}>{roomCode}</strong></span>
              <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{roomLink}</span>
              <button
                onClick={async () => { await navigator.clipboard.writeText(roomLink); setRoomNotice('Copié !'); setTimeout(() => setRoomNotice(''), 1400) }}
                style={smallBtn(true)}
              >{roomNotice || 'Copier'}</button>
            </div>
          </motion.div>
        )}

        {/* Players */}
        {roomCode && roomPlayers.length > 0 && !isPlaying && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 18, padding: '8px 14px', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, background: 'rgba(255,255,255,0.025)' }}>
            <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '.18em', color: 'rgba(255,255,255,0.28)', textTransform: 'uppercase', marginRight: 4 }}>
              {roomPlayers.length} joueur{roomPlayers.length > 1 ? 's' : ''}
            </span>
            {roomPlayers.map((p, i) => <PlayerChip key={i} player={p} />)}
          </div>
        )}
        {roomCode && roomPlayers.length > 0 && isPlaying && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14, justifyContent: 'center' }}>
            {roomPlayers.map((p, i) => <PlayerChip key={i} player={p} />)}
          </div>
        )}

        {/* ── Phase content with AnimatePresence ── */}
        <AnimatePresence mode="wait">

          {/* INTRO */}
          {phase === 'intro' && (
            <motion.div
              key="intro"
              initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              style={{ textAlign: 'center' }}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 18px',
                  borderRadius: 100, background: 'rgba(212,160,23,0.10)', border: '1px solid rgba(212,160,23,0.30)',
                  fontSize: 10, fontWeight: 800, letterSpacing: '.22em', color: GOLD, textTransform: 'uppercase', marginBottom: 20,
                }}
              >
                🎵 Blind Test Anime
              </motion.div>

              <h1 style={{ fontFamily: "'Pirata One',cursive", fontSize: 'clamp(52px,10vw,96px)', color: '#fff', margin: '0 0 14px', lineHeight: 1, letterSpacing: '-0.01em' }}>
                Blind Test
              </h1>
              <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.40)', maxWidth: 460, margin: '0 auto 36px', lineHeight: 1.75 }}>
                Un opening se lance en fond. Choisis parmi 4 propositions et tape le titre pour le bonus.
              </p>

              {/* Track grid */}
              <motion.div
                variants={{ visible: { transition: { staggerChildren: 0.04 } } }}
                initial="hidden" animate="visible"
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill,minmax(140px,1fr))',
                  gap: 10,
                  marginBottom: 36,
                  textAlign: 'left',
                  maxHeight: 340,
                  overflowY: 'auto',
                  paddingRight: 6,
                  scrollbarWidth: 'thin',
                  scrollbarColor: 'rgba(212,160,23,0.3) transparent',
                }}
              >
                {LOCAL_TRACKS.map((t) => (
                  <motion.div
                    key={t.id}
                    variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { duration: 0.3 } } }}
                    whileHover={{ scale: 1.03, transition: { duration: 0.14 } }}
                    style={{
                      background: `linear-gradient(145deg,${t.color}14 0%,rgba(10,10,11,0.97) 100%)`,
                      border: `1px solid ${t.color}20`, borderTop: `2px solid ${t.color}bb`,
                      borderRadius: 12, padding: '12px 14px', cursor: 'default',
                    }}
                  >
                    <div style={{
                      width: '100%',
                      aspectRatio: '16 / 9',
                      borderRadius: 10,
                      overflow: 'hidden',
                      marginBottom: 8,
                      background: `${t.color}18`,
                      border: `1px solid ${t.color}22`,
                    }}>
                      {t.thumbnail ? (
                        <img
                          src={t.thumbnail}
                          alt={t.anime}
                          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                        />
                      ) : (
                        <div style={{
                          width: '100%',
                          height: '100%',
                          display: 'grid',
                          placeItems: 'center',
                          color: 'rgba(255,255,255,0.8)',
                          fontSize: 22,
                        }}>
                          {t.emoji}
                        </div>
                      )}
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 800, color: '#fff', marginBottom: 2, lineHeight: 1.3 }}>{t.anime}</div>
                    <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.32)' }}>{t.type} · {t.episode}</div>
                  </motion.div>
                ))}
              </motion.div>

              {/* Rules pills */}
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 36 }}>
                {[['🎯','Anime = 50 pts'],['🎵','Titre = +30 pts'],['⚡','< 5s = ×2'],['🔥','Streak ×3 = ×1.5']].map(([icon, text], i) => (
                  <motion.div
                    key={i} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3 + i * 0.06 }}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 100, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.62)' }}
                  >
                    <span>{icon}</span><span>{text}</span>
                  </motion.div>
                ))}
              </div>

              <motion.button
                onClick={startGame}
                whileHover={{ scale: 1.04, boxShadow: `0 12px 40px rgba(212,160,23,0.45)` }}
                whileTap={{ scale: 0.97 }}
                style={{
                  padding: '16px 52px', borderRadius: 100, border: 'none', fontSize: 17, fontWeight: 800,
                  background: `linear-gradient(135deg, ${GOLD}, #e5b83a)`, color: '#1a1200', cursor: 'pointer',
                  letterSpacing: '.04em', boxShadow: `0 8px 32px rgba(212,160,23,0.32)`,
                  fontFamily: "'Pirata One',cursive",
                }}
              >
                {roomCode && roomRole !== 'host' ? 'Attendre le host' : 'Lancer le jeu'}
              </motion.button>

              <div style={{ marginTop: 18 }}>
                <button onClick={() => navigate('/blind-test/leaderboard')} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.32)', cursor: 'pointer', fontSize: 13, fontWeight: 600, textDecoration: 'underline' }}>
                  Voir le classement →
                </button>
              </div>
            </motion.div>
          )}

          {/* COUNTDOWN */}
          {phase === 'countdown' && (() => {
            const n = countdown
            const cfg = n === 3
              ? { color: GREEN,   glow: 'rgba(34,197,94,0.60)',  anim: 'btCountIn .45s cubic-bezier(.22,1,.36,1) both', ring: 'rgba(34,197,94,0.38)' }
              : n === 2
              ? { color: ORANGE,  glow: 'rgba(245,158,11,0.65)', anim: 'btCountIn .40s cubic-bezier(.22,1,.36,1) both', ring: 'rgba(245,158,11,0.42)' }
              : n === 1
              ? { color: RED2,    glow: 'rgba(239,68,68,0.75)',  anim: 'btCountShake .55s ease-in-out, btCountFlash .3s .1s ease-in-out', ring: 'rgba(239,68,68,0.48)' }
              : { color: GOLD,    glow: 'rgba(212,160,23,0.58)', anim: 'btCountIn .35s cubic-bezier(.22,1,.36,1) both', ring: 'rgba(212,160,23,0.38)' }
            return (
              <motion.div
                key="countdown"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                style={{ textAlign: 'center', minHeight: 'calc(100vh - 240px)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}
              >
                <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.24em', color: 'rgba(255,255,255,0.38)', textTransform: 'uppercase', marginBottom: 36 }}>
                  {roomCode ? `Salle ${roomCode} · prépare-toi...` : 'Prépare-toi...'}
                </div>
                <div style={{ position: 'relative', display: 'inline-block', margin: '0 auto' }}>
                  <div key={`r1-${n}`} style={{ position: 'absolute', inset: '-22%', borderRadius: '50%', border: `3px solid ${cfg.ring}`, animation: 'btRingOut .75s ease-out forwards', pointerEvents: 'none' }} />
                  <div key={`r2-${n}`} style={{ position: 'absolute', inset: '-6%',  borderRadius: '50%', border: `2px solid ${cfg.ring}`, animation: 'btRingOut .95s .14s ease-out forwards', pointerEvents: 'none' }} />
                  <div key={n} style={{
                    fontFamily: "'Pirata One',cursive",
                    fontSize: 'clamp(130px,24vw,210px)', color: n === 0 ? GOLD : cfg.color,
                    lineHeight: 1, textShadow: `0 0 70px ${cfg.glow}, 0 0 140px ${cfg.glow}`,
                    animation: cfg.anim, display: 'block',
                  }}>
                    {n || '▶'}
                  </div>
                </div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.26)', marginTop: 30, letterSpacing: '.06em' }}>
                  L'extrait va commencer...
                </div>
              </motion.div>
            )
          })()}

          {/* PLAYING */}
          {phase === 'playing' && track && (
            <motion.div
              key="playing"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              style={{ minHeight: 'calc(100vh - 240px)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}
            >
              {/* Hero stats row */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, gap: 12 }}>
                <TimerRing elapsed={elapsed} total={ROUND_SECS} color={barColor} />

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'flex-end' }}>
                  <AnimatedScore value={totalScore} label="Score" size={38} color={GOLD2} />
                  <div style={{ display: 'flex', gap: 20 }}>
                    <AnimatedScore value={streak} label="Streak" size={24} color={streak >= 3 ? ORANGE : 'rgba(255,255,255,0.55)'} />
                    <AnimatedScore value={round + 1} label="Round"  size={24} color="rgba(255,255,255,0.48)" />
                  </div>
                </div>
              </div>

              {/* Game panel */}
              <div style={{ ...glassPanel({}), padding: 22, backdropFilter: 'blur(10px)' }}>
                {/* Progress bar */}
                <div style={{ height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 100, overflow: 'hidden', marginBottom: 20 }}>
                  <motion.div
                    animate={{ width: `${barPct}%`, background: barColor }}
                    transition={{ duration: 0.25, ease: 'linear' }}
                    style={{ height: '100%', borderRadius: 100, boxShadow: `0 0 8px ${barColor}55` }}
                  />
                </div>

                {/* Waveform + hint */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <Waveform playing color={activeTrack.color} />
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', fontWeight: 600 }}>
                    {!guessEnabled ? `⏳ Écoute encore ${GUESS_DELAY - elapsed}s...` : '🎯 Choisis l\'anime'}
                  </div>
                </div>

                <AnimatePresence>
                  {guessEnabled && (
                    <motion.div
                      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '.18em', color: 'rgba(255,255,255,0.28)', textTransform: 'uppercase', marginBottom: 10 }}>
                        Quel anime ?
                      </div>
                      <motion.div
                        variants={{ visible: { transition: { staggerChildren: 0.07 } } }}
                        initial="hidden" animate="visible"
                        style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9, marginBottom: 14 }}
                      >
                        {mcqChoices.map((choice, i) => (
                          <MCQButton
                            key={i} index={i} label={choice}
                            selected={mcqSelected === choice}
                            revealed={false} color={activeTrack.color}
                            onClick={() => { setAnimeGuess(choice); setMcqSelected(choice); titleRef.current?.focus() }}
                          />
                        ))}
                      </motion.div>

                      <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '.18em', color: 'rgba(255,255,255,0.28)', textTransform: 'uppercase', marginBottom: 8 }}>
                        Titre de l'opening (bonus)
                      </div>
                      <input
                        type="text" value={titleGuess} ref={titleRef}
                        onChange={e => setTitleGuess(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && submitGuess()}
                        placeholder="Titre de l'opening..."
                        style={inputStyle({ width: '100%' })}
                      />

                      <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                        <motion.button
                          onClick={() => submitGuess()}
                          disabled={!mcqSelected}
                          whileHover={mcqSelected ? { scale: 1.02, boxShadow: `0 6px 24px rgba(212,160,23,0.36)` } : undefined}
                          whileTap={mcqSelected ? { scale: 0.97 } : undefined}
                          style={{ flex: 1, padding: '13px', borderRadius: 12, border: 'none', background: mcqSelected ? `linear-gradient(135deg,${GOLD},#e5b83a)` : 'rgba(255,255,255,0.07)', color: mcqSelected ? '#1a1200' : 'rgba(255,255,255,0.28)', fontSize: 14, fontWeight: 800, cursor: mcqSelected ? 'pointer' : 'default', letterSpacing: '.02em', transition: 'background .2s, color .2s' }}
                        >
                          Valider
                        </motion.button>
                        <motion.button
                          onClick={() => submitGuess()}
                          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                          style={{ padding: '13px 20px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.10)', background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.42)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
                        >
                          Passer
                        </motion.button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}

          {/* REVEAL */}
          {phase === 'reveal' && track && result && (
            <motion.div
              key="reveal"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
              style={{ minHeight: 'calc(100vh - 240px)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}
            >
              {/* Stats row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <AnimatedScore value={totalScore} label="Score total" size={34} color={GOLD2} />
                <AnimatedScore value={streak} label="Streak" size={28} color={streak >= 3 ? ORANGE : 'rgba(255,255,255,0.50)'} />
              </div>

              {/* MCQ revealed */}
              <div style={{ ...glassPanel({ marginBottom: 12 }), padding: 16, backdropFilter: 'blur(8px)' }}>
                <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '.18em', color: 'rgba(255,255,255,0.28)', textTransform: 'uppercase', marginBottom: 10 }}>Quel anime ?</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9 }}>
                  {mcqChoices.map((choice, i) => (
                    <MCQButton key={i} index={i} label={choice}
                      selected={mcqSelected === choice}
                      correct={choice === track.anime}
                      revealed={true} color={activeTrack.color}
                      onClick={() => {}}
                    />
                  ))}
                </div>
              </div>

              {/* Reveal card with confetti */}
              <div style={{ position: 'relative' }}>
                <RevealCard track={track} result={result} berries={berries} />
                <ConfettiBurst active={showConfetti} />
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                <motion.button
                  onClick={nextRound}
                  whileHover={{ scale: 1.02, boxShadow: `0 6px 24px rgba(212,160,23,0.38)` }}
                  whileTap={{ scale: 0.97 }}
                  style={{ flex: 1, padding: '13px', borderRadius: 12, border: 'none', background: `linear-gradient(135deg,${GOLD},#e5b83a)`, color: '#1a1200', fontSize: 14, fontWeight: 800, cursor: 'pointer', fontFamily: "'Pirata One',cursive", letterSpacing: '.02em' }}
                >
                  Extrait suivant →
                </motion.button>
                {round >= 2 && (
                  <motion.button
                    onClick={endGame}
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                    style={{ padding: '13px 24px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.65)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
                  >
                    Terminer
                  </motion.button>
                )}
              </div>
            </motion.div>
          )}

          {/* END */}
          {phase === 'end' && (
            <motion.div
              key="end"
              initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              style={{ textAlign: 'center' }}
            >
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
                style={{ fontSize: 80, marginBottom: 20, filter: `drop-shadow(0 0 30px ${GOLD}66)`, display: 'inline-block' }}
              >
                🏆
              </motion.div>

              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.24em', color: GOLD, textTransform: 'uppercase', marginBottom: 10 }}>Partie terminée</div>
              <h2 style={{ fontFamily: "'Pirata One',cursive", fontSize: 'clamp(36px,6vw,66px)', color: '#fff', margin: '0 0 30px', lineHeight: 1 }}>Score final</h2>

              {/* Stats */}
              <div style={{ display: 'flex', gap: 0, justifyContent: 'center', marginBottom: 36, ...glassPanel({}), padding: '24px 32px', borderRadius: 20 }}>
                {[
                  { val: totalScore.toLocaleString('fr-FR'), label: 'Berries', color: GOLD2 },
                  { val: maxStreak,                          label: 'Streak max', color: ORANGE },
                  { val: round,                              label: 'Rounds',    color: 'rgba(255,255,255,0.80)' },
                ].map((s, i, arr) => (
                  <>
                    <div key={i} style={{ textAlign: 'center', flex: 1 }}>
                      <motion.div
                        initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.1 + i * 0.1, type: 'spring', stiffness: 200 }}
                        style={{ fontFamily: "'Pirata One',cursive", fontSize: 44, fontWeight: 900, color: s.color, lineHeight: 1 }}
                      >
                        {s.val}
                      </motion.div>
                      <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', marginTop: 6 }}>{s.label}</div>
                    </div>
                    {i < arr.length - 1 && <div key={`d${i}`} style={{ width: 1, background: 'rgba(255,255,255,0.07)', margin: '0 8px', alignSelf: 'stretch' }} />}
                  </>
                ))}
              </div>

              {!isAuthenticated && (
                <motion.div
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
                  style={{ padding: '14px 20px', borderRadius: 14, background: 'rgba(212,160,23,0.07)', border: '1px solid rgba(212,160,23,0.22)', marginBottom: 24, fontSize: 13, color: 'rgba(255,255,255,0.58)', lineHeight: 1.6 }}
                >
                  💡 Connecte-toi avec Discord pour sauvegarder ton score !
                </motion.div>
              )}

              {/* History */}
              <div style={{ textAlign: 'left', marginBottom: 30 }}>
                <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.18em', color: 'rgba(255,255,255,0.30)', textTransform: 'uppercase', marginBottom: 12 }}>Récap</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {history.map((h, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
                        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
                        borderLeft: `3px solid ${h.result.perfect ? GREEN : h.result.animeOk || h.result.titleOk ? GOLD : RED2}`,
                        borderRadius: 10,
                      }}
                    >
                      <span style={{ fontSize: 20, flexShrink: 0 }}>{h.track.emoji}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.track.title}</div>
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{h.track.anime}</div>
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: h.earned > 0 ? GOLD : 'rgba(255,255,255,0.25)', flexShrink: 0 }}>
                        {h.earned > 0 ? `+${h.earned.toLocaleString('fr-FR')} 🪙` : '✗'}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                <motion.button
                  onClick={() => { setPhase('intro'); setTotalScore(0); setStreak(0); setMaxStreak(0); setRound(0); setHistory([]) }}
                  whileHover={{ scale: 1.03, boxShadow: `0 8px 28px rgba(212,160,23,0.36)` }} whileTap={{ scale: 0.97 }}
                  style={{ padding: '13px 36px', borderRadius: 100, border: 'none', background: `linear-gradient(135deg,${GOLD},#e5b83a)`, color: '#1a1200', fontSize: 15, fontWeight: 800, cursor: 'pointer', letterSpacing: '.02em' }}
                >
                  Rejouer
                </motion.button>
                <motion.button
                  onClick={() => navigate('/blind-test/leaderboard')}
                  whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                  style={{ padding: '13px 32px', borderRadius: 100, border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.68)', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
                >
                  Classement
                </motion.button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  )
}

// ─── Style helpers ──────────────────────────────────────────────────────────
function glassPanel(extra) {
  return {
    border: '1px solid rgba(255,255,255,0.09)',
    background: 'rgba(255,255,255,0.035)',
    borderRadius: 16,
    padding: '12px 14px',
    ...extra,
  }
}

function inputStyle(extra) {
  return {
    padding: '13px 15px', borderRadius: 12,
    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
    color: '#fff', fontSize: 14, outline: 'none', fontFamily: 'var(--body)',
    ...extra,
  }
}

function smallBtn(primary) {
  return {
    border: `1px solid ${primary ? 'rgba(212,160,23,0.40)' : 'rgba(255,255,255,0.13)'}`,
    background: primary ? 'rgba(212,160,23,0.12)' : 'rgba(255,255,255,0.05)',
    color: primary ? '#facc15' : 'rgba(255,255,255,0.75)',
    borderRadius: 10, padding: '9px 13px',
    cursor: 'pointer', fontWeight: 800, fontSize: 12,
  }
}

function pillStyle(color, bg, border) {
  return {
    fontSize: 11, fontWeight: 700, color,
    background: bg, border: `1px solid ${border}`,
    borderRadius: 100, padding: '4px 14px', display: 'inline-block',
  }
}
