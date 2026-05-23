import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext.jsx'
import { supabase } from '../lib/supabase.js'
import {
  LOCAL_TRACKS,
  createBlindTestRoom,
  fetchBlindTestRoom,
  fetchBlindTestRoomAnswers,
  fetchBlindTestRoomPlayers,
  getTrackById,
  joinBlindTestRoom,
  pickTrack,
  submitBlindTestRoomAnswer,
  updateBlindTestRoom,
} from '../lib/blindTest.js'

const GOLD = '#d4a017'
const GREEN = '#22c55e'
const RED = '#e0524a'

const DIFFICULTIES = {
  easy: { id: 'easy', label: 'Facile', seconds: 30, color: GREEN },
  normal: { id: 'normal', label: 'Normal', seconds: 15, color: GOLD },
  expert: { id: 'expert', label: 'Expert', seconds: 5, color: RED },
}

function guestId() {
  let id = localStorage.getItem('brams_blind_guest_id')
  if (!id) {
    id = `guest_${crypto.randomUUID?.() || Math.random().toString(36).slice(2)}`
    localStorage.setItem('brams_blind_guest_id', id)
  }
  return id
}

function normalizeCode(value) {
  return (value || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)
}

function OpeningBackdrop({ track, status }) {
  const visible = track && (status === 'playing' || status === 'reveal')
  if (!visible) return null

  const revealed = status === 'reveal'
  return (
    <>
      <video
        key={track.url}
        src={track.url}
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        style={{
          position:'fixed',
          inset:0,
          width:'100%',
          height:'100%',
          objectFit:'cover',
          zIndex:0,
          pointerEvents:'none',
          opacity:revealed ? 0.36 : 0.22,
          filter:revealed
            ? 'blur(0px) brightness(0.82) saturate(1.16)'
            : 'blur(36px) brightness(0.32) saturate(1.08)',
          transform:revealed ? 'scale(1.01)' : 'scale(1.15)',
          transition:'opacity 1.25s ease, filter 1.45s cubic-bezier(.22,.8,.22,1), transform 1.45s cubic-bezier(.22,.8,.22,1)',
          willChange:'opacity, filter, transform',
        }}
      />
      <div style={{ position:'fixed', inset:0, zIndex:0, pointerEvents:'none' }}>
        <div
          style={{
            position:'absolute',
            inset:0,
            background:'linear-gradient(180deg, rgba(7,9,14,0.72), rgba(7,9,14,0.88))',
            opacity:revealed ? 0 : 1,
            transition:'opacity 1.2s ease',
          }}
        />
        <div
          style={{
            position:'absolute',
            inset:0,
            background:'linear-gradient(180deg, rgba(7,9,14,0.32), rgba(7,9,14,0.58))',
            opacity:revealed ? 1 : 0,
            transition:'opacity 1.2s ease',
          }}
        />
      </div>
    </>
  )
}

function Btn({ children, muted, ...props }) {
  return (
    <button
      {...props}
      style={{
        minHeight: 44,
        padding: '0 18px',
        borderRadius: 12,
        border: muted ? '1px solid rgba(255,255,255,.12)' : 'none',
        background: muted ? 'rgba(255,255,255,.055)' : `linear-gradient(135deg, ${GOLD}, #e5b83a)`,
        color: muted ? 'rgba(255,255,255,.72)' : '#1a1200',
        fontWeight: 900,
        cursor: 'pointer',
        ...props.style,
      }}
    >
      {children}
    </button>
  )
}

function VolumeDock({ volume, onChange, visible }) {
  if (!visible) return null
  return (
    <div
      style={{
        position:'fixed',
        left:22,
        bottom:22,
        zIndex:5,
        width:48,
        height:48,
        borderRadius:999,
        overflow:'hidden',
        display:'flex',
        alignItems:'center',
        gap:10,
        padding:'0 14px',
        border:'1px solid rgba(255,255,255,.13)',
        background:'rgba(18,20,26,.72)',
        backdropFilter:'blur(16px)',
        boxShadow:'0 18px 50px rgba(0,0,0,.28)',
        transition:'width .22s ease, background .22s ease',
      }}
      onMouseEnter={e => { e.currentTarget.style.width = '190px'; e.currentTarget.style.background = 'rgba(24,26,34,.86)' }}
      onMouseLeave={e => { e.currentTarget.style.width = '48px'; e.currentTarget.style.background = 'rgba(18,20,26,.72)' }}
    >
      <span style={{ flex:'0 0 auto', width:20, color:GOLD, fontSize:17, lineHeight:1 }}>♪</span>
      <input
        type="range"
        min="0"
        max="100"
        value={Math.round(volume * 100)}
        onChange={e => onChange(Number(e.target.value) / 100)}
        style={{ width:118, accentColor:GOLD, cursor:'pointer', flex:'0 0 auto' }}
      />
      <span style={{ color:'rgba(255,255,255,.48)', fontSize:11, fontWeight:900, flex:'0 0 auto' }}>{Math.round(volume * 100)}</span>
    </div>
  )
}

function PlayerList({ players, answers, round }) {
  const answered = new Set(answers.map(a => a.user_id))
  return (
    <div style={{ display:'grid', gap:8 }}>
      {players.map(player => (
        <div key={player.user_id} style={{
          display:'flex',
          alignItems:'center',
          gap:10,
          padding:'10px 12px',
          borderRadius:12,
          border:'1px solid rgba(255,255,255,.09)',
          background:'rgba(255,255,255,.045)',
        }}>
          <img
            src={player.avatar_url || `https://api.dicebear.com/8.x/thumbs/svg?seed=${encodeURIComponent(player.display_name || player.user_id)}`}
            alt=""
            style={{ width:30, height:30, borderRadius:'50%', objectFit:'cover' }}
          />
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ color:'#fff', fontSize:13, fontWeight:900, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{player.display_name || 'Pirate'}</div>
            <div style={{ color:'rgba(255,255,255,.38)', fontSize:11 }}>{Number(player.score || 0).toLocaleString('fr-FR')} berries</div>
          </div>
          {round > 0 && (
            <div style={{ color: answered.has(player.user_id) ? GREEN : 'rgba(255,255,255,.32)', fontSize:11, fontWeight:900 }}>
              {answered.has(player.user_id) ? 'Répondu' : 'En cours'}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

export default function BlindTestRoomPage() {
  const { code: routeCode } = useParams()
  const navigate = useNavigate()
  const auth = useAuth()
  const audioRef = useRef(null)
  const userId = auth.user?.id || guestId()
  const displayName = auth.displayName || `Invité ${userId.slice(-4)}`
  const avatarUrl = auth.avatarUrl || null

  const [joinCode, setJoinCode] = useState(normalizeCode(routeCode))
  const [room, setRoom] = useState(null)
  const [players, setPlayers] = useState([])
  const [answers, setAnswers] = useState([])
  const [animeGuess, setAnimeGuess] = useState('')
  const [titleGuess, setTitleGuess] = useState('')
  const [error, setError] = useState('')
  const [audioBlocked, setAudioBlocked] = useState(false)
  const [now, setNow] = useState(Date.now())
  const [volume, setVolume] = useState(0.65)

  const code = normalizeCode(routeCode)
  const difficulty = DIFFICULTIES[room?.difficulty_id] || DIFFICULTIES.easy
  const track = getTrackById(room?.current_track_id)
  const isHost = room?.host_user_id === userId
  const myPlayer = players.find(p => p.user_id === userId)
  const myAnswer = answers.find(a => a.user_id === userId)
  const answeredIds = useMemo(() => new Set(answers.map(answer => answer.user_id)), [answers])
  const everyoneAnswered = room?.status === 'playing'
    && players.length > 0
    && players.every(player => answeredIds.has(player.user_id))
  const elapsed = room?.started_at ? Math.max(0, Math.floor((now - new Date(room.started_at).getTime()) / 1000)) : 0
  const timeLeft = Math.max(0, difficulty.seconds - elapsed)
  const answerDelay = difficulty.seconds <= 5 ? 0 : 5
  const canAnswer = room?.status === 'playing' && elapsed >= answerDelay && !myAnswer
  const inviteLink = code ? `${window.location.origin}/blind-test/room/${code}` : ''

  const animeOptions = useMemo(() => {
    if (!track) return []
    const byAnime = new Map()
    LOCAL_TRACKS.forEach(item => {
      if (!byAnime.has(item.anime)) byAnime.set(item.anime, item)
    })
    const extras = Array.from(byAnime.values()).filter(item => item.anime !== track.anime).slice(0, 3)
    return [track, ...extras].sort((a, b) => (a.anime + track.id).localeCompare(b.anime + track.id))
  }, [track])

  async function reload(nextCode = code) {
    if (!nextCode) return
    const nextRoom = await fetchBlindTestRoom(nextCode)
    setRoom(nextRoom)
    setPlayers(await fetchBlindTestRoomPlayers(nextCode))
    setAnswers(await fetchBlindTestRoomAnswers(nextCode, nextRoom?.round))
  }

  useEffect(() => {
    if (!code) return
    let active = true
    ;(async () => {
      try {
        const nextRoom = await fetchBlindTestRoom(code)
        if (!nextRoom) {
          setError('Room introuvable.')
          return
        }
        await joinBlindTestRoom({ code, userId, displayName, avatarUrl })
        if (active) await reload(code)
      } catch (e) {
        setError(e.message || 'Impossible de rejoindre la room.')
      }
    })()
    return () => { active = false }
  }, [code, userId])

  useEffect(() => {
    if (!supabase || !code) return
    const channel = supabase
      .channel(`blind-test-room-${code}`)
      .on('postgres_changes', { event:'*', schema:'public', table:'blind_test_rooms', filter:`code=eq.${code}` }, payload => {
        setRoom(payload.new)
        setAnimeGuess('')
        setTitleGuess('')
        fetchBlindTestRoomAnswers(code, payload.new?.round).then(setAnswers)
      })
      .on('postgres_changes', { event:'*', schema:'public', table:'blind_test_room_players', filter:`room_code=eq.${code}` }, () => {
        fetchBlindTestRoomPlayers(code).then(setPlayers)
      })
      .on('postgres_changes', { event:'*', schema:'public', table:'blind_test_room_answers', filter:`room_code=eq.${code}` }, () => {
        fetchBlindTestRoomAnswers(code, room?.round).then(setAnswers)
        fetchBlindTestRoomPlayers(code).then(setPlayers)
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [code, room?.round])

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (!track || room?.status !== 'playing') return
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.src = ''
    }
    const audio = new Audio(track.url)
    audio.volume = volume
    audioRef.current = audio
    audio.currentTime = elapsed
    audio.play().then(() => setAudioBlocked(false)).catch(() => setAudioBlocked(true))
    return () => audio.pause()
  }, [track?.id, room?.status])

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume
  }, [volume])

  useEffect(() => {
    if (room?.status === 'playing' && timeLeft <= 0 && isHost) {
      updateBlindTestRoom(code, { status: 'reveal' }).catch(() => {})
    }
  }, [room?.status, timeLeft, isHost, code])

  async function createRoom() {
    try {
      setError('')
      const newCode = await createBlindTestRoom({ hostUserId: userId, displayName, avatarUrl })
      navigate(`/blind-test/room/${newCode}`)
    } catch (e) {
      setError(e.message || 'Impossible de créer la room. SQL Supabase à installer.')
    }
  }

  function joinRoom() {
    const next = normalizeCode(joinCode)
    if (next.length === 6) navigate(`/blind-test/room/${next}`)
  }

  async function startRound() {
    const nextTrack = pickTrack(room?.current_track_id)
    await updateBlindTestRoom(code, {
      status: 'playing',
      round: (room?.round || 0) + 1,
      current_track_id: nextTrack.id,
      started_at: new Date().toISOString(),
    })
  }

  async function submitAnswer() {
    if (!track || myAnswer) return
    await submitBlindTestRoomAnswer({
      code,
      userId,
      round: room.round,
      track,
      animeGuess,
      titleGuess,
      timeMs: elapsed * 1000,
      streak: myPlayer?.streak || 0,
    })
  }

  async function revealNow() {
    if (!isHost || room?.status !== 'playing') return
    await updateBlindTestRoom(code, { status: 'reveal' })
  }

  async function copyInvite() {
    await navigator.clipboard?.writeText(inviteLink)
  }

  if (!code) {
    return (
      <div style={{ minHeight:'100vh', display:'grid', placeItems:'center', padding:20, background:'#07090e' }}>
        <div style={{ width:'min(720px,100%)', padding:28, borderRadius:18, background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.10)', textAlign:'center' }}>
          <h1 style={{ fontFamily:"'Pirata One',cursive", fontSize:'clamp(44px,8vw,76px)', margin:'0 0 10px', color:'#fff' }}>Blind Test Multi</h1>
          <p style={{ color:'rgba(255,255,255,.48)', margin:'0 0 24px' }}>Crée une room ou rejoins avec un code.</p>
          <div style={{ display:'grid', gridTemplateColumns:'1fr auto', gap:10, marginBottom:12 }}>
            <input value={joinCode} onChange={e => setJoinCode(normalizeCode(e.target.value))} placeholder="CODE" style={{ height:44, borderRadius:12, border:'1px solid rgba(255,255,255,.12)', background:'rgba(255,255,255,.06)', color:'#fff', padding:'0 14px', fontWeight:900, letterSpacing:'.14em' }} />
            <Btn onClick={joinRoom}>Rejoindre</Btn>
          </div>
          <Btn onClick={createRoom} style={{ width:'100%' }}>Créer une room</Btn>
          {error && <div style={{ color:RED, marginTop:14, fontSize:13 }}>{error}</div>}
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight:'100vh', background:'#07090e', color:'#fff', padding:'80px 20px 42px', position:'relative', overflow:'hidden', display:'grid', placeItems:'center', boxSizing:'border-box' }}>
      <OpeningBackdrop track={track} status={room?.status} />
      <VolumeDock volume={volume} onChange={setVolume} visible={['playing', 'reveal'].includes(room?.status)} />
      <div style={{ position:'relative', zIndex:2, width:'min(1040px,100%)', margin:'0 auto', display:'grid', gridTemplateColumns:'minmax(0,1fr) 300px', gap:18, alignItems:'start' }}>
        <main style={{ border:'1px solid rgba(255,255,255,.12)', background:'rgba(18,20,26,.70)', borderRadius:18, padding:24, backdropFilter:'blur(16px)', boxShadow:'0 24px 90px rgba(0,0,0,.28)' }}>
          <div style={{ display:'flex', justifyContent:'space-between', gap:14, alignItems:'start', marginBottom:22 }}>
            <div>
              <div style={{ color:GOLD, fontSize:11, fontWeight:900, letterSpacing:'.18em' }}>ROOM {code}</div>
              <h1 style={{ fontFamily:"'Pirata One',cursive", fontSize:48, margin:'4px 0 0' }}>Blind Test Multi</h1>
            </div>
            <Btn muted onClick={copyInvite}>Copier le lien</Btn>
          </div>

          {error && <div style={{ color:RED, marginBottom:14 }}>{error}</div>}

          {room?.status === 'waiting' && (
            <div style={{ textAlign:'center', padding:'30px 0' }}>
              <div style={{ fontSize:13, color:'rgba(255,255,255,.46)', marginBottom:18 }}>Partage le code ou le lien aux joueurs.</div>
              <div style={{ display:'inline-flex', gap:8, padding:'10px 18px', borderRadius:14, background:'rgba(212,160,23,.10)', border:'1px solid rgba(212,160,23,.28)', color:GOLD, fontSize:28, fontWeight:950, letterSpacing:'.16em', marginBottom:22 }}>{code}</div>
              <div style={{ display:'flex', justifyContent:'center', gap:8, flexWrap:'wrap', marginBottom:22 }}>
                {Object.values(DIFFICULTIES).map(item => (
                  <Btn key={item.id} muted={room.difficulty_id !== item.id} disabled={!isHost} onClick={() => updateBlindTestRoom(code, { difficulty_id:item.id })}>
                    {item.label} · {item.seconds}s
                  </Btn>
                ))}
              </div>
              {isHost ? <Btn onClick={startRound}>Lancer la manche</Btn> : <div style={{ color:'rgba(255,255,255,.42)' }}>En attente du host...</div>}
            </div>
          )}

          {room?.status === 'playing' && track && (
            <div>
              <div style={{ height:4, borderRadius:999, background:'rgba(255,255,255,.08)', overflow:'hidden', marginBottom:18 }}>
                <div style={{ height:'100%', width:`${(timeLeft / difficulty.seconds) * 100}%`, background:timeLeft < 6 ? RED : GOLD, transition:'width .25s linear' }} />
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
                <div style={{ color:'rgba(255,255,255,.48)', fontWeight:800 }}>Manche {room.round}</div>
                <div style={{ fontFamily:"'Pirata One',cursive", fontSize:34, color:timeLeft < 6 ? RED : GOLD }}>{timeLeft}s</div>
              </div>
              {audioBlocked && <Btn onClick={() => audioRef.current?.play().then(() => setAudioBlocked(false))} style={{ width:'100%', marginBottom:12 }}>Activer le son</Btn>}
              {!canAnswer && !myAnswer && <div style={{ textAlign:'center', color:'rgba(255,255,255,.42)', margin:'20px 0' }}>{elapsed < answerDelay ? `Écoute encore ${answerDelay - elapsed}s...` : 'Temps écoulé...'}</div>}
              {myAnswer && <div style={{ textAlign:'center', color:GREEN, fontWeight:900, margin:'20px 0' }}>Réponse envoyée</div>}
              {everyoneAnswered && (
                <div style={{ margin:'12px 0 18px', padding:12, borderRadius:12, border:'1px solid rgba(34,197,94,.24)', background:'rgba(34,197,94,.08)', textAlign:'center' }}>
                  <div style={{ color:GREEN, fontSize:13, fontWeight:900, marginBottom:isHost ? 10 : 0 }}>Tout le monde a repondu.</div>
                  {isHost ? (
                    <Btn onClick={revealNow}>Reveler maintenant</Btn>
                  ) : (
                    <div style={{ color:'rgba(255,255,255,.42)', fontSize:12 }}>En attente du chef de groupe...</div>
                  )}
                </div>
              )}
              {canAnswer && (
                <div style={{ display:'grid', gap:10 }}>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(2,minmax(0,1fr))', gap:10 }}>
                    {animeOptions.map(option => (
                      <Btn key={option.id} muted={animeGuess !== option.anime} onClick={() => setAnimeGuess(option.anime)} style={{ justifyContent:'start', textAlign:'left' }}>
                        {option.emoji} {option.anime}
                      </Btn>
                    ))}
                  </div>
                  <input value={titleGuess} onChange={e => setTitleGuess(e.target.value)} placeholder="Titre de l'opening (bonus facultatif)" style={{ height:46, borderRadius:12, border:'1px solid rgba(255,255,255,.12)', background:'rgba(255,255,255,.06)', color:'#fff', padding:'0 14px' }} />
                  <Btn onClick={submitAnswer}>Valider ma réponse</Btn>
                </div>
              )}
            </div>
          )}

          {room?.status === 'reveal' && track && (
            <div style={{ textAlign:'center' }}>
              <div style={{ fontSize:54, marginBottom:8 }}>{track.emoji}</div>
              <div style={{ color:GOLD, fontWeight:900, letterSpacing:'.14em', fontSize:11 }}>{track.type} · {track.episode}</div>
              <h2 style={{ fontFamily:"'Pirata One',cursive", fontSize:46, margin:'8px 0 4px' }}>{track.title}</h2>
              <div style={{ color:'rgba(255,255,255,.55)', marginBottom:22 }}>{track.anime}</div>
              <div style={{ display:'grid', gap:8, marginBottom:22 }}>
                {answers.map(answer => {
                  const player = players.find(p => p.user_id === answer.user_id)
                  return (
                    <div key={answer.user_id} style={{ display:'flex', justifyContent:'space-between', padding:'10px 12px', borderRadius:12, background:'rgba(255,255,255,.045)', border:'1px solid rgba(255,255,255,.08)' }}>
                      <span>{player?.display_name || 'Pirate'}</span>
                      <span style={{ color:answer.earned > 0 ? GOLD : RED, fontWeight:900 }}>{answer.earned > 0 ? `+${Number(answer.earned).toLocaleString('fr-FR')}` : 'Raté'}</span>
                    </div>
                  )
                })}
              </div>
              {isHost ? <Btn onClick={startRound}>Extrait suivant</Btn> : <div style={{ color:'rgba(255,255,255,.42)' }}>Le host lance la suite...</div>}
            </div>
          )}
        </main>

        <aside style={{ border:'1px solid rgba(255,255,255,.12)', background:'rgba(18,20,26,.68)', borderRadius:18, padding:16, alignSelf:'start', backdropFilter:'blur(16px)', boxShadow:'0 24px 90px rgba(0,0,0,.20)' }}>
          <div style={{ color:GOLD, fontSize:11, fontWeight:900, letterSpacing:'.16em', marginBottom:12 }}>JOUEURS</div>
          <PlayerList players={players} answers={answers} round={room?.round || 0} />
        </aside>
      </div>
    </div>
  )
}
