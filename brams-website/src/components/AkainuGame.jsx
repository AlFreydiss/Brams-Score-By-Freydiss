import { useEffect, useRef, useState, useCallback } from 'react'
import { useSoundEffect } from '../hooks/useSoundEffect.js'

const W = 560, H = 400
const PLAYER_R = 18
const DURATION = 30

function useKonami(onActivate) {
  const seq = useRef([])
  const CODE = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a']
  useEffect(() => {
    const onKey = (e) => {
      seq.current = [...seq.current, e.key].slice(-10)
      if (seq.current.join(',') === CODE.join(',')) {
        seq.current = []
        onActivate()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onActivate])
}

export default function AkainuGame() {
  const [open, setOpen]       = useState(false)
  const [phase, setPhase]     = useState('ready') // ready | playing | dead | won
  const [timeLeft, setTimeLeft] = useState(DURATION)
  const [lives, setLives]     = useState(3)
  const [score, setScore]     = useState(0)
  const [bestScore, setBest]  = useState(() => parseInt(localStorage.getItem('akainu_best') || '0'))
  const canvasRef             = useRef(null)
  const gameRef               = useRef(null)
  const { play }              = useSoundEffect()

  useKonami(useCallback(() => { setOpen(true); play('awakening') }, [play]))

  const startGame = useCallback(() => {
    setPhase('playing')
    setTimeLeft(DURATION)
    setLives(3)
    setScore(0)
    play('click')
  }, [play])

  useEffect(() => {
    if (!open || phase !== 'playing') return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    const state = {
      player: { x: W / 2, y: H - 40, vx: 0 },
      fists: [],
      keys: {},
      time: 0,
      lives: 3,
      spawnRate: 90,
      frame: 0,
      running: true,
    }

    const keys = {}
    const onDown = (e) => { keys[e.key] = true }
    const onUp   = (e) => { keys[e.key] = false }
    window.addEventListener('keydown', onDown)
    window.addEventListener('keyup', onUp)

    // Touch / mobile
    let touchStartX = 0
    const onTouchMove = (e) => {
      const t = e.touches[0]
      const dx = t.clientX - touchStartX
      state.player.vx = dx * 0.3
      touchStartX = t.clientX
    }
    const onTouchStart = (e) => { touchStartX = e.touches[0].clientX }
    canvas.addEventListener('touchstart', onTouchStart)
    canvas.addEventListener('touchmove', onTouchMove)

    let timerInterval = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerInterval)
          state.running = false
          setPhase('won')
          play('success')
          return 0
        }
        return t - 1
      })
    }, 1000)

    const spawnFist = () => {
      state.fists.push({
        x: 40 + Math.random() * (W - 80),
        y: -30,
        r: 14 + Math.random() * 10,
        speed: 2 + state.frame / 600,
        pulse: Math.random() * Math.PI * 2,
      })
    }

    const loop = () => {
      if (!state.running) return
      state.frame++
      ctx.clearRect(0, 0, W, H)

      // Fond
      const bg = ctx.createLinearGradient(0, 0, 0, H)
      bg.addColorStop(0, '#1a0500')
      bg.addColorStop(1, '#0a0000')
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, W, H)

      // Grille lava
      ctx.strokeStyle = 'rgba(255,80,0,0.08)'
      ctx.lineWidth = 1
      for (let i = 0; i < W; i += 40) { ctx.beginPath(); ctx.moveTo(i,0); ctx.lineTo(i,H); ctx.stroke() }
      for (let i = 0; i < H; i += 40) { ctx.beginPath(); ctx.moveTo(0,i); ctx.lineTo(W,i); ctx.stroke() }

      // Mouvement joueur
      const speed = 4.5
      if (keys['ArrowLeft'] || keys['a']) state.player.vx = -speed
      else if (keys['ArrowRight'] || keys['d']) state.player.vx = speed
      else state.player.vx *= 0.75

      state.player.x = Math.max(PLAYER_R, Math.min(W - PLAYER_R, state.player.x + state.player.vx))

      // Spawn
      if (state.frame % Math.max(20, state.spawnRate - state.frame / 20) === 0) spawnFist()

      // Poings
      state.fists = state.fists.filter(f => {
        f.y += f.speed
        f.pulse += 0.15

        // Dessin poing de lave
        const glow = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.r * 1.8)
        glow.addColorStop(0, 'rgba(255,180,0,0.9)')
        glow.addColorStop(0.5, 'rgba(255,60,0,0.7)')
        glow.addColorStop(1, 'rgba(200,0,0,0)')
        ctx.beginPath()
        ctx.arc(f.x, f.y, f.r * 1.8, 0, Math.PI * 2)
        ctx.fillStyle = glow
        ctx.fill()

        ctx.beginPath()
        ctx.arc(f.x, f.y, f.r + Math.sin(f.pulse) * 2, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255,${100 + Math.sin(f.pulse)*50},0,0.95)`
        ctx.fill()
        ctx.strokeStyle = '#ff4400'
        ctx.lineWidth = 2
        ctx.stroke()

        // Collision
        const dx = f.x - state.player.x
        const dy = f.y - state.player.y
        if (Math.sqrt(dx*dx + dy*dy) < f.r + PLAYER_R - 4) {
          play('hit')
          state.lives--
          setLives(state.lives)
          if (state.lives <= 0) {
            state.running = false
            clearInterval(timerInterval)
            setPhase('dead')
          }
          return false
        }
        return f.y < H + 40
      })

      // Joueur — cercle brillant (Luffy)
      const playerGrad = ctx.createRadialGradient(state.player.x, state.player.y, 0, state.player.x, state.player.y, PLAYER_R)
      playerGrad.addColorStop(0, '#fff')
      playerGrad.addColorStop(0.4, '#74b9ff')
      playerGrad.addColorStop(1, '#0050ff')
      ctx.beginPath()
      ctx.arc(state.player.x, state.player.y, PLAYER_R, 0, Math.PI * 2)
      ctx.fillStyle = playerGrad
      ctx.fill()
      ctx.strokeStyle = '#fff'
      ctx.lineWidth = 2
      ctx.stroke()

      // Emoji chapeau
      ctx.font = '22px serif'
      ctx.textAlign = 'center'
      ctx.fillText('🏴‍☠️', state.player.x, state.player.y + 7)

      // Score
      const elapsed = DURATION - timeLeft
      setScore(Math.floor(elapsed * 100 + (3 - state.lives) * -500 + state.frame))

      gameRef.current = requestAnimationFrame(loop)
    }

    gameRef.current = requestAnimationFrame(loop)

    return () => {
      state.running = false
      cancelAnimationFrame(gameRef.current)
      clearInterval(timerInterval)
      window.removeEventListener('keydown', onDown)
      window.removeEventListener('keyup', onUp)
      canvas.removeEventListener('touchstart', onTouchStart)
      canvas.removeEventListener('touchmove', onTouchMove)
    }
  }, [open, phase, play])

  const close = () => {
    setOpen(false)
    setPhase('ready')
    if (gameRef.current) cancelAnimationFrame(gameRef.current)
  }

  const finalScore = DURATION * 100 - (3 - lives) * 500
  useEffect(() => {
    if ((phase === 'won' || phase === 'dead') && score > bestScore) {
      setBest(score)
      localStorage.setItem('akainu_best', score)
    }
  }, [phase])

  if (!open) return null

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9998,
      background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      animation: 'fadeIn 0.3s ease-out',
    }}>
      <div style={{
        background: 'linear-gradient(135deg, #1a0500, #0a0000)',
        border: '2px solid rgba(255,60,0,0.4)',
        borderRadius: 20, padding: 32, maxWidth: 600, width: '100%',
        boxShadow: '0 0 80px rgba(255,60,0,0.2)',
        animation: 'scaleIn 0.3s ease-out',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <div style={{ fontFamily: 'var(--pirate)', fontSize: 28, color: '#ff4400' }}>Boss Fight — Akainu</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>Évite les poings de lave · ← → ou A D · {DURATION}s</div>
          </div>
          <button onClick={close} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 22 }}>✕</button>
        </div>

        {phase === 'ready' && (
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <div style={{ fontSize: 80, marginBottom: 16 }}>🌋</div>
            <p style={{ color: 'rgba(255,255,255,0.65)', marginBottom: 24, lineHeight: 1.7 }}>
              Akainu t'a repéré, pirate.<br/>
              Survive <strong style={{ color: '#ff4400' }}>{DURATION} secondes</strong> sans te faire toucher.<br/>
              Utilise ← → (ou A/D) pour esquiver.
            </p>
            {bestScore > 0 && <div style={{ fontSize: 13, color: '#fdcb6e', marginBottom: 16 }}>Meilleur score : {bestScore.toLocaleString()}</div>}
            <button onClick={startGame} style={{
              padding: '14px 40px', borderRadius: 12, border: 'none', cursor: 'pointer',
              background: 'linear-gradient(135deg, #ff4400, #cc0000)',
              color: '#fff', fontWeight: 700, fontSize: 16, fontFamily: 'var(--body)',
              boxShadow: '0 4px 24px rgba(255,60,0,0.4)',
            }}>⚔️ Commencer</button>
          </div>
        )}

        {phase === 'playing' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, fontSize: 14 }}>
              <div style={{ color: '#ff6b6b', fontWeight: 700 }}>{'❤️'.repeat(lives)}{'🖤'.repeat(3 - lives)}</div>
              <div style={{ color: '#fdcb6e', fontWeight: 700 }}>⏱ {timeLeft}s</div>
            </div>
            <canvas ref={canvasRef} width={W} height={H} style={{ borderRadius: 12, display: 'block', maxWidth: '100%', border: '1px solid rgba(255,60,0,0.2)' }} />
          </>
        )}

        {(phase === 'dead' || phase === 'won') && (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div style={{ fontSize: 72, marginBottom: 16 }}>{phase === 'won' ? '🏆' : '💀'}</div>
            <h3 style={{ fontFamily: 'var(--pirate)', fontSize: 28, color: phase === 'won' ? '#ffd700' : '#ff4400', marginBottom: 8 }}>
              {phase === 'won' ? 'Tu as survécu !' : 'Éliminé par Akainu !'}
            </h3>
            <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: 8, fontSize: 13 }}>
              {phase === 'won' ? `Temps survécu : ${DURATION}s` : `Temps survécu : ${DURATION - timeLeft}s`}
            </p>
            {score > bestScore && <div style={{ color: '#ffd700', fontWeight: 700, marginBottom: 16 }}>🎉 Nouveau record !</div>}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button onClick={startGame} style={{ padding: '12px 28px', borderRadius: 10, border: 'none', cursor: 'pointer', background: '#ff4400', color: '#fff', fontWeight: 700, fontSize: 14, fontFamily: 'var(--body)' }}>
                🔄 Rejouer
              </button>
              <button onClick={close} className="btn btn-ghost" style={{ fontSize: 14 }}>Fermer</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
