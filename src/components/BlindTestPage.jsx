import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext.jsx'
import {
  LOCAL_TRACKS, pickTrack, checkAnswer, calcBerries,
  upsertBlindTestScore, logSession,
} from '../lib/blindTest.js'

// ── Design tokens ─────────────────────────────────────────────────────────
const GOLD   = '#d4a017'
const RED    = '#e0524a'
const GREEN  = '#22c55e'

const BT_CSS = `
  @keyframes btFadeUp  { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:none} }
  @keyframes btTwinkle { 0%,100%{opacity:.10} 50%{opacity:.65} }
  @keyframes btScan    { 0%{top:-2px} 100%{top:100%} }
  @keyframes btPulse   { 0%,100%{transform:scale(1);opacity:.7} 50%{transform:scale(1.55);opacity:1} }
  @keyframes btFloat   { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-7px)} }
  @keyframes btShake   { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-6px)} 75%{transform:translateX(6px)} }
  @keyframes btBounce  { 0%,100%{transform:translateY(0) scale(1)} 40%{transform:translateY(-14px) scale(1.12)} }
  @keyframes btBar     { from{width:100%} to{width:0%} }
  @keyframes btWave    { 0%,100%{height:8px} 50%{height:32px} }
  @keyframes btGlow    { 0%,100%{opacity:.45} 50%{opacity:.9} }
`

// ── Stars background ───────────────────────────────────────────────────────
function BTStars() {
  const stars = useMemo(() => Array.from({ length: 50 }, (_, i) => ({
    x: (i * 39.1 + 7) % 98, y: (i * 43.7 + 13) % 96,
    size: i % 9 === 0 ? 2.5 : i % 4 === 0 ? 1.6 : 1,
    dur: 2.8 + (i * 0.28) % 4.5, del: (i * 0.21) % 7,
    gold: i % 13 === 0,
  })), [])
  return (
    <div style={{ position:'fixed', inset:0, pointerEvents:'none', zIndex:0 }}>
      {stars.map((s, i) => (
        <div key={i} style={{
          position:'absolute', left:`${s.x}%`, top:`${s.y}%`,
          width:s.size, height:s.size, borderRadius:'50%',
          background: s.gold ? 'rgba(212,160,23,.65)' : 'rgba(255,255,255,.5)',
          animation:`btTwinkle ${s.dur}s ${s.del}s ease-in-out infinite`,
        }} />
      ))}
    </div>
  )
}

function BTScanLine() {
  return (
    <div style={{ position:'fixed', inset:0, pointerEvents:'none', zIndex:1, overflow:'hidden' }}>
      <div style={{
        position:'absolute', left:0, right:0, height:2,
        background:'linear-gradient(90deg,transparent,rgba(212,160,23,.07),rgba(212,160,23,.16),rgba(212,160,23,.07),transparent)',
        animation:'btScan 16s linear infinite',
      }} />
    </div>
  )
}

// ── Waveform visual ────────────────────────────────────────────────────────
function Waveform({ playing, color }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:3, height:40 }}>
      {Array.from({ length: 18 }).map((_, i) => (
        <div key={i} style={{
          width:3, borderRadius:2,
          background: color || GOLD,
          opacity: playing ? 0.85 : 0.25,
          animation: playing ? `btWave ${0.5 + (i % 5) * 0.12}s ${i * 0.04}s ease-in-out infinite` : 'none',
          height: playing ? undefined : 8,
        }} />
      ))}
    </div>
  )
}

// ── Score display ──────────────────────────────────────────────────────────
function ScorePill({ label, value, color = GOLD }) {
  return (
    <div style={{ textAlign:'center' }}>
      <div style={{ fontFamily:"'Pirata One',cursive", fontSize:26, fontWeight:900, color, lineHeight:1 }}>{value}</div>
      <div style={{ fontSize:9, fontWeight:800, letterSpacing:'.12em', textTransform:'uppercase', color:'rgba(255,255,255,0.38)', marginTop:3 }}>{label}</div>
    </div>
  )
}

// ── Track card (revealed after answer) ────────────────────────────────────
function RevealCard({ track, result, berries }) {
  const c = track.color
  return (
    <div style={{
      background:`linear-gradient(145deg,${c}18 0%,rgba(7,9,14,0.97) 100%)`,
      border:`1px solid ${c}44`,
      borderTop:`3px solid ${c}`,
      borderRadius:16, padding:'22px 24px',
      animation:'btFadeUp .4s ease',
      textAlign:'center',
    }}>
      <div style={{ fontSize:52, marginBottom:12, animation:'btBounce 1s ease', filter:`drop-shadow(0 0 20px ${c}66)` }}>{track.emoji}</div>
      <div style={{ fontSize:10, fontWeight:800, letterSpacing:'.18em', color:c, textTransform:'uppercase', marginBottom:6 }}>
        {track.type} · {track.episode}
      </div>
      <div style={{ fontFamily:"'Pirata One',cursive", fontSize:'clamp(22px,4vw,36px)', color:'#fff', fontWeight:900, marginBottom:4, lineHeight:1.1 }}>{track.title}</div>
      <div style={{ fontSize:15, color:'rgba(255,255,255,0.60)', marginBottom:16 }}>{track.anime}</div>

      <div style={{ display:'flex', gap:16, justifyContent:'center', flexWrap:'wrap', marginBottom:16 }}>
        {result.animeOk && (
          <span style={{ fontSize:11, fontWeight:700, color:GREEN, background:'rgba(34,197,94,0.12)', border:'1px solid rgba(34,197,94,0.30)', borderRadius:100, padding:'4px 14px' }}>
            ✓ Anime correct
          </span>
        )}
        {result.titleOk && (
          <span style={{ fontSize:11, fontWeight:700, color:GREEN, background:'rgba(34,197,94,0.12)', border:'1px solid rgba(34,197,94,0.30)', borderRadius:100, padding:'4px 14px' }}>
            ✓ Titre correct
          </span>
        )}
        {!result.animeOk && !result.titleOk && (
          <span style={{ fontSize:11, fontWeight:700, color:'#f87171', background:'rgba(239,68,68,0.10)', border:'1px solid rgba(239,68,68,0.28)', borderRadius:100, padding:'4px 14px' }}>
            ✗ Raté
          </span>
        )}
      </div>

      {berries > 0 && (
        <div style={{ fontSize:13, fontWeight:800, color:GOLD }}>
          +{berries.toLocaleString('fr-FR')} 🪙 berries
        </div>
      )}
    </div>
  )
}

// ── Main game ─────────────────────────────────────────────────────────────
const ROUND_SECS = 30
const GUESS_DELAY = 5 // seconds before guessing is enabled

export default function BlindTestPage() {
  const navigate = useNavigate()
  const { isAuthenticated, user, displayName, avatarUrl } = useAuth()
  const videoRef = useRef(null)
  const titleRef = useRef(null)

  // Game state
  const [phase, setPhase]           = useState('intro')   // intro | countdown | playing | reveal | end
  const [track, setTrack]           = useState(null)
  const [lastTrackId, setLastTrackId] = useState(null)
  const [elapsed, setElapsed]       = useState(0)         // seconds playing
  const [startTime, setStartTime]   = useState(null)
  const [animeGuess, setAnimeGuess] = useState('')
  const [titleGuess, setTitleGuess] = useState('')
  const [result, setResult]         = useState(null)
  const [berries, setBerries]       = useState(0)

  // Session totals
  const [totalScore, setTotalScore] = useState(0)
  const [streak, setStreak]         = useState(0)
  const [maxStreak, setMaxStreak]   = useState(0)
  const [round, setRound]           = useState(0)
  const [history, setHistory]       = useState([])

  const [countdown, setCountdown]   = useState(3)
  const [guessEnabled, setGuessEnabled] = useState(false)

  // Countdown 3-2-1 before track plays
  useEffect(() => {
    if (phase !== 'countdown') return
    if (countdown <= 0) { setPhase('playing'); setStartTime(Date.now()); setElapsed(0); return }
    const t = setTimeout(() => setCountdown(v => v - 1), 1000)
    return () => clearTimeout(t)
  }, [phase, countdown])

  // Playing timer
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

  // Auto-play video when phase=playing
  useEffect(() => {
    if (phase === 'playing' && videoRef.current) {
      videoRef.current.currentTime = 0
      videoRef.current.play().catch(() => {})
    }
    if (phase !== 'playing' && videoRef.current) {
      videoRef.current.pause()
    }
  }, [phase])

  function startGame() {
    const t = pickTrack(lastTrackId)
    setTrack(t)
    setLastTrackId(t.id)
    setAnimeGuess('')
    setTitleGuess('')
    setResult(null)
    setBerries(0)
    setCountdown(3)
    setGuessEnabled(false)
    setPhase('countdown')
  }

  function handleTimeout() {
    if (phase !== 'playing') return
    submitGuess(true)
  }

  function submitGuess(timeout = false) {
    if (phase !== 'playing' && !timeout) return
    const ms   = Date.now() - startTime
    const res  = checkAnswer(animeGuess, titleGuess, track)
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

    // Persist to Supabase
    if (user) {
      logSession({ userId: user.id, trackId: track.id, correct: res.animeOk || res.titleOk, timeMs: ms })
    }
  }

  function nextRound() {
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
    <div style={{ minHeight:'100vh', background:'#07090e', position:'relative', overflowX:'hidden' }}>
      <style>{BT_CSS}</style>
      <BTStars />
      <BTScanLine />

      {/* Hidden video player */}
      {track && (
        <video
          ref={videoRef}
          key={track.id}
          src={track.url}
          style={{ display:'none' }}
          preload="auto"
        />
      )}

      <div style={{ position:'relative', zIndex:2, maxWidth:780, margin:'0 auto', padding:'80px 20px 100px' }}>

        {/* ── INTRO ── */}
        {phase === 'intro' && (
          <div style={{ textAlign:'center', animation:'btFadeUp .5s ease' }}>
            <div style={{
              display:'inline-flex', alignItems:'center', gap:8, padding:'5px 18px',
              borderRadius:100, background:'rgba(212,160,23,0.10)', border:'1px solid rgba(212,160,23,0.28)',
              fontSize:10, fontWeight:800, letterSpacing:'.22em', color:GOLD, textTransform:'uppercase', marginBottom:22,
            }}>🎵 Blind Test Anime</div>

            <h1 style={{ fontFamily:"'Pirata One',cursive", fontSize:'clamp(46px,8vw,84px)', color:'#fff', margin:'0 0 16px', lineHeight:1, letterSpacing:'-.02em' }}>
              Blind Test
            </h1>
            <p style={{ fontSize:15, color:'rgba(255,255,255,0.42)', maxWidth:480, margin:'0 auto 36px', lineHeight:1.75 }}>
              Un extrait d'Opening anime se lance. Trouve l'anime et/ou le titre pour gagner des <strong style={{ color:GOLD }}>berries</strong> !
            </p>

            {/* Tracks preview */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap:10, marginBottom:40, textAlign:'left' }}>
              {LOCAL_TRACKS.map((t, i) => (
                <div key={t.id} style={{
                  background:`linear-gradient(145deg,${t.color}14 0%,rgba(7,9,14,0.97) 100%)`,
                  border:`1px solid ${t.color}22`, borderTop:`2px solid ${t.color}`,
                  borderRadius:12, padding:'14px 16px',
                  animation:`btFadeUp .4s ${i * 0.08}s ease both`,
                }}>
                  <div style={{ fontSize:24, marginBottom:6 }}>{t.emoji}</div>
                  <div style={{ fontSize:12, fontWeight:800, color:'#fff', marginBottom:2 }}>{t.anime}</div>
                  <div style={{ fontSize:10, color:'rgba(255,255,255,0.38)' }}>{t.type} · {t.episode}</div>
                </div>
              ))}
            </div>

            {/* Rules */}
            <div style={{ display:'flex', gap:10, justifyContent:'center', flexWrap:'wrap', marginBottom:36 }}>
              {[
                { icon:'🎯', text:'Anime = 50 pts' },
                { icon:'🎵', text:'Titre = 30 pts' },
                { icon:'⚡', text:'< 5s = ×2' },
                { icon:'🔥', text:'Streak ×3 = ×1.2' },
              ].map((r, i) => (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 14px', borderRadius:100, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.09)', fontSize:12, fontWeight:700, color:'rgba(255,255,255,0.65)' }}>
                  <span>{r.icon}</span><span>{r.text}</span>
                </div>
              ))}
            </div>

            <button
              onClick={startGame}
              style={{
                padding:'15px 44px', borderRadius:100, border:'none', fontSize:16, fontWeight:800,
                background:`linear-gradient(135deg,${GOLD},#e5b83a)`, color:'#1a1200', cursor:'pointer',
                letterSpacing:'.04em', boxShadow:`0 8px 32px rgba(212,160,23,0.35)`,
                transition:'all .2s', fontFamily:"'Pirata One',cursive",
              }}
              onMouseEnter={e => { e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow=`0 14px 42px rgba(212,160,23,0.50)` }}
              onMouseLeave={e => { e.currentTarget.style.transform='none'; e.currentTarget.style.boxShadow=`0 8px 32px rgba(212,160,23,0.35)` }}
            >
              Lancer le jeu
            </button>

            <div style={{ marginTop:20 }}>
              <button onClick={() => navigate('/blind-test/leaderboard')} style={{ background:'none', border:'none', color:'rgba(255,255,255,0.35)', cursor:'pointer', fontSize:13, fontWeight:600, textDecoration:'underline' }}>
                Voir le classement →
              </button>
            </div>
          </div>
        )}

        {/* ── COUNTDOWN ── */}
        {phase === 'countdown' && (
          <div style={{ textAlign:'center', animation:'btFadeUp .3s ease' }}>
            <div style={{ fontSize:10, fontWeight:800, letterSpacing:'.22em', color:GOLD, textTransform:'uppercase', marginBottom:20 }}>
              Prépare-toi…
            </div>
            <div style={{
              fontFamily:"'Pirata One',cursive",
              fontSize:'clamp(100px,20vw,160px)',
              color:'#fff', lineHeight:1,
              textShadow:`0 0 80px ${GOLD}44`,
              animation:'btPulse .9s ease-in-out infinite',
            }}>
              {countdown || '▶'}
            </div>
            <div style={{ fontSize:14, color:'rgba(255,255,255,0.35)', marginTop:20 }}>L'extrait va commencer…</div>
          </div>
        )}

        {/* ── PLAYING ── */}
        {phase === 'playing' && track && (
          <div style={{ animation:'btFadeUp .3s ease' }}>
            {/* Score bar top */}
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:28 }}>
              <ScorePill label="Score" value={totalScore.toLocaleString('fr-FR')} />
              <div style={{ display:'flex', gap:16, alignItems:'center' }}>
                <ScorePill label="Streak" value={streak} color={streak >= 3 ? '#f59e0b' : 'rgba(255,255,255,0.55)'} />
                <ScorePill label="Round" value={round + 1} color="rgba(255,255,255,0.55)" />
              </div>
            </div>

            {/* Player card */}
            <div style={{
              background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.09)',
              borderRadius:18, padding:'28px 28px 24px', marginBottom:20,
            }}>
              {/* Timer bar */}
              <div style={{ height:4, background:'rgba(255,255,255,0.06)', borderRadius:100, overflow:'hidden', marginBottom:22, position:'relative' }}>
                <div style={{
                  position:'absolute', left:0, top:0, height:'100%',
                  background:`linear-gradient(90deg,${barColor}88,${barColor})`,
                  borderRadius:100,
                  width:`${barPct}%`,
                  transition:'width .25s linear, background .25s',
                  boxShadow:`0 0 8px ${barColor}44`,
                }} />
              </div>

              {/* Waveform + time */}
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
                <Waveform playing color={track.color} />
                <div style={{ fontFamily:"'Pirata One',cursive", fontSize:28, color: elapsed <= 5 ? GREEN : elapsed <= 15 ? GOLD : RED, fontWeight:900 }}>
                  {ROUND_SECS - elapsed}s
                </div>
              </div>

              {/* Status */}
              <div style={{ fontSize:12, color:'rgba(255,255,255,0.35)', textAlign:'center', marginBottom:guessEnabled ? 20 : 0 }}>
                {!guessEnabled
                  ? `⏳ Écoute encore ${GUESS_DELAY - elapsed}s avant de répondre…`
                  : '🎯 Réponds maintenant !'
                }
              </div>

              {/* Input fields */}
              {guessEnabled && (
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  <input
                    autoFocus
                    type="text"
                    value={animeGuess}
                    onChange={e => setAnimeGuess(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && titleRef?.current?.focus()}
                    placeholder="Nom de l'anime…"
                    style={{
                      padding:'14px 18px', borderRadius:12,
                      background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.14)',
                      color:'#fff', fontSize:15, outline:'none', fontFamily:'var(--body)',
                      transition:'border-color .15s, box-shadow .15s',
                    }}
                    onFocus={e => { e.target.style.borderColor='rgba(212,160,23,0.5)'; e.target.style.boxShadow='0 0 0 3px rgba(212,160,23,0.09)' }}
                    onBlur={e  => { e.target.style.borderColor='rgba(255,255,255,0.14)'; e.target.style.boxShadow='none' }}
                  />
                  <input
                    type="text"
                    value={titleGuess}
                    onChange={e => setTitleGuess(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && submitGuess()}
                    ref={titleRef}
                    placeholder="Titre de l'opening / ending…"
                    style={{
                      padding:'14px 18px', borderRadius:12,
                      background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.14)',
                      color:'#fff', fontSize:15, outline:'none', fontFamily:'var(--body)',
                      transition:'border-color .15s, box-shadow .15s',
                    }}
                    onFocus={e => { e.target.style.borderColor='rgba(212,160,23,0.5)'; e.target.style.boxShadow='0 0 0 3px rgba(212,160,23,0.09)' }}
                    onBlur={e  => { e.target.style.borderColor='rgba(255,255,255,0.14)'; e.target.style.boxShadow='none' }}
                  />

                  <div style={{ display:'flex', gap:10, marginTop:4 }}>
                    <button
                      onClick={() => submitGuess()}
                      style={{
                        flex:1, padding:'13px', borderRadius:12, border:'none',
                        background:`linear-gradient(135deg,${GOLD},#e5b83a)`, color:'#1a1200',
                        fontSize:14, fontWeight:800, cursor:'pointer', transition:'all .15s', letterSpacing:'.02em',
                      }}
                      onMouseEnter={e => e.currentTarget.style.opacity='.88'}
                      onMouseLeave={e => e.currentTarget.style.opacity='1'}
                    >
                      Valider ma réponse
                    </button>
                    <button
                      onClick={() => submitGuess()}
                      style={{
                        padding:'13px 18px', borderRadius:12, border:'1px solid rgba(255,255,255,0.10)',
                        background:'rgba(255,255,255,0.03)', color:'rgba(255,255,255,0.45)',
                        fontSize:13, fontWeight:700, cursor:'pointer', transition:'all .15s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background='rgba(255,255,255,0.07)'; e.currentTarget.style.color='rgba(255,255,255,0.75)' }}
                      onMouseLeave={e => { e.currentTarget.style.background='rgba(255,255,255,0.03)'; e.currentTarget.style.color='rgba(255,255,255,0.45)' }}
                    >
                      Passer
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── REVEAL ── */}
        {phase === 'reveal' && track && result && (
          <div style={{ animation:'btFadeUp .4s ease' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
              <ScorePill label="Score total" value={totalScore.toLocaleString('fr-FR')} />
              <ScorePill label="Streak" value={streak} color={streak >= 3 ? '#f59e0b' : 'rgba(255,255,255,0.55)'} />
            </div>

            <RevealCard track={track} result={result} berries={berries} />

            <div style={{ display:'flex', gap:10, marginTop:20 }}>
              <button
                onClick={nextRound}
                style={{
                  flex:1, padding:'14px', borderRadius:12, border:'none',
                  background:`linear-gradient(135deg,${GOLD},#e5b83a)`, color:'#1a1200',
                  fontSize:14, fontWeight:800, cursor:'pointer', transition:'all .15s', letterSpacing:'.02em',
                  fontFamily:"'Pirata One',cursive",
                }}
                onMouseEnter={e => e.currentTarget.style.opacity='.88'}
                onMouseLeave={e => e.currentTarget.style.opacity='1'}
              >
                Extrait suivant →
              </button>
              {round >= 2 && (
                <button
                  onClick={endGame}
                  style={{
                    padding:'14px 20px', borderRadius:12,
                    border:'1px solid rgba(255,255,255,0.12)', background:'rgba(255,255,255,0.04)',
                    color:'rgba(255,255,255,0.55)', fontSize:13, fontWeight:700, cursor:'pointer',
                  }}
                >
                  Terminer
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── END ── */}
        {phase === 'end' && (
          <div style={{ textAlign:'center', animation:'btFadeUp .5s ease' }}>
            <div style={{ fontSize:72, marginBottom:20, animation:'btFloat 3s ease-in-out infinite', filter:`drop-shadow(0 0 28px ${GOLD}55)` }}>🏆</div>
            <div style={{ fontSize:10, fontWeight:800, letterSpacing:'.22em', color:GOLD, textTransform:'uppercase', marginBottom:12 }}>
              Partie terminée
            </div>
            <h2 style={{ fontFamily:"'Pirata One',cursive", fontSize:'clamp(36px,6vw,64px)', color:'#fff', margin:'0 0 28px', lineHeight:1 }}>
              Score final
            </h2>

            {/* Stats */}
            <div style={{ display:'flex', gap:28, justifyContent:'center', flexWrap:'wrap', marginBottom:36 }}>
              <div style={{ textAlign:'center' }}>
                <div style={{ fontFamily:"'Pirata One',cursive", fontSize:42, fontWeight:900, color:GOLD, lineHeight:1 }}>{totalScore.toLocaleString('fr-FR')}</div>
                <div style={{ fontSize:10, fontWeight:800, letterSpacing:'.12em', textTransform:'uppercase', color:'rgba(255,255,255,0.38)', marginTop:4 }}>Berries gagnées</div>
              </div>
              <div style={{ width:1, height:48, background:'rgba(255,255,255,0.08)', alignSelf:'center' }} />
              <div style={{ textAlign:'center' }}>
                <div style={{ fontFamily:"'Pirata One',cursive", fontSize:42, fontWeight:900, color:'#f59e0b', lineHeight:1 }}>{maxStreak}</div>
                <div style={{ fontSize:10, fontWeight:800, letterSpacing:'.12em', textTransform:'uppercase', color:'rgba(255,255,255,0.38)', marginTop:4 }}>Streak max</div>
              </div>
              <div style={{ width:1, height:48, background:'rgba(255,255,255,0.08)', alignSelf:'center' }} />
              <div style={{ textAlign:'center' }}>
                <div style={{ fontFamily:"'Pirata One',cursive", fontSize:42, fontWeight:900, color:'rgba(255,255,255,0.80)', lineHeight:1 }}>{round}</div>
                <div style={{ fontSize:10, fontWeight:800, letterSpacing:'.12em', textTransform:'uppercase', color:'rgba(255,255,255,0.38)', marginTop:4 }}>Rounds joués</div>
              </div>
            </div>

            {!isAuthenticated && (
              <div style={{ padding:'14px 20px', borderRadius:12, background:'rgba(212,160,23,0.08)', border:'1px solid rgba(212,160,23,0.22)', marginBottom:24, fontSize:13, color:'rgba(255,255,255,0.60)', lineHeight:1.6 }}>
                💡 Connecte-toi avec Discord pour sauvegarder ton score et apparaître dans le classement !
              </div>
            )}

            {/* History */}
            <div style={{ textAlign:'left', marginBottom:32 }}>
              <div style={{ fontSize:10, fontWeight:800, letterSpacing:'.18em', color:'rgba(255,255,255,0.35)', textTransform:'uppercase', marginBottom:14 }}>
                Récapitulatif
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {history.map((h, i) => (
                  <div key={i} style={{
                    display:'flex', alignItems:'center', gap:12, padding:'10px 14px',
                    background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)',
                    borderLeft:`3px solid ${h.result.perfect ? GREEN : h.result.animeOk || h.result.titleOk ? GOLD : RED}`,
                    borderRadius:10,
                  }}>
                    <span style={{ fontSize:20, flexShrink:0 }}>{h.track.emoji}</span>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:13, fontWeight:700, color:'#fff', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{h.track.title}</div>
                      <div style={{ fontSize:11, color:'rgba(255,255,255,0.38)' }}>{h.track.anime}</div>
                    </div>
                    <div style={{ fontSize:13, fontWeight:800, color: h.earned > 0 ? GOLD : 'rgba(255,255,255,0.30)', flexShrink:0 }}>
                      {h.earned > 0 ? `+${h.earned.toLocaleString('fr-FR')} 🪙` : '✗'}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display:'flex', gap:10, justifyContent:'center', flexWrap:'wrap' }}>
              <button
                onClick={() => { setPhase('intro'); setTotalScore(0); setStreak(0); setMaxStreak(0); setRound(0); setHistory([]) }}
                style={{
                  padding:'13px 30px', borderRadius:100, border:'none',
                  background:`linear-gradient(135deg,${GOLD},#e5b83a)`, color:'#1a1200',
                  fontSize:14, fontWeight:800, cursor:'pointer', letterSpacing:'.04em',
                  fontFamily:"'Pirata One',cursive",
                }}
              >
                Rejouer
              </button>
              <button
                onClick={() => navigate('/blind-test/leaderboard')}
                style={{
                  padding:'13px 30px', borderRadius:100,
                  border:'1px solid rgba(255,255,255,0.14)', background:'rgba(255,255,255,0.04)',
                  color:'rgba(255,255,255,0.70)', fontSize:14, fontWeight:700, cursor:'pointer',
                }}
              >
                Classement
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
