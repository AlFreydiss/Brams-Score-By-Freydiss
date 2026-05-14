import { useState, useEffect, useCallback } from 'react'
import { useSoundEffect } from '../hooks/useSoundEffect.js'

// Déclenche via : taper "haki" n'importe où OU appel externe via ref/event
export default function ConquerorsHaki() {
  const [phase, setPhase]   = useState('idle') // idle → charging → waves → silence → out
  const [buffer, setBuffer] = useState('')
  const { play } = useSoundEffect()

  const activate = useCallback(() => {
    if (phase !== 'idle') return
    setPhase('charging')
    play('haki')
    setTimeout(() => setPhase('waves'), 300)
    setTimeout(() => { play('awakening'); setPhase('silence') }, 1200)
    setTimeout(() => setPhase('out'), 4500)
    setTimeout(() => setPhase('idle'), 5200)
  }, [phase, play])

  // Écoute "haki" au clavier
  useEffect(() => {
    const onKey = (e) => {
      const next = (buffer + e.key).slice(-4)
      setBuffer(next)
      if (next === 'haki') activate()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [buffer, activate])

  // Expose via event global (pour bouton extérieur)
  useEffect(() => {
    const handler = () => activate()
    window.addEventListener('brams:haki', handler)
    return () => window.removeEventListener('brams:haki', handler)
  }, [activate])

  if (phase === 'idle') return null

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 99999,
      pointerEvents: phase === 'out' ? 'none' : 'all',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      opacity: phase === 'out' ? 0 : 1,
      transition: 'opacity 0.7s ease',
    }}>
      {/* Voile noir */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'rgba(0,0,0,0.92)',
        opacity: phase === 'charging' ? 0 : phase === 'silence' || phase === 'out' ? 0.7 : 1,
        transition: 'opacity 0.8s ease',
      }} />

      {/* Ondes qui rayonnent */}
      {phase === 'waves' && [0, 0.15, 0.3, 0.5, 0.7].map((delay, i) => (
        <div key={i} style={{
          position: 'absolute',
          width: 100, height: 100,
          borderRadius: '50%',
          border: '3px solid rgba(0,0,0,0.9)',
          boxShadow: `0 0 0 0 rgba(0,0,0,1), inset 0 0 40px rgba(0,0,0,0.5)`,
          animation: `haki-wave 1.2s ${delay}s ease-out both`,
          zIndex: 1,
        }} />
      ))}

      {/* Texte central */}
      {(phase === 'waves' || phase === 'silence') && (
        <div style={{
          position: 'relative', zIndex: 2, textAlign: 'center',
          animation: phase === 'silence' ? 'fadeIn 0.6s ease-out both' : 'shake 0.4s ease-out both',
        }}>
          <div style={{
            fontSize: 'clamp(48px, 10vw, 100px)',
            fontFamily: 'var(--pirate)',
            color: '#fff',
            letterSpacing: '0.05em',
            textShadow: '0 0 60px rgba(0,0,0,1), 0 0 20px rgba(255,255,255,0.3)',
            marginBottom: 16,
            filter: phase === 'waves' ? 'blur(2px)' : 'none',
            transition: 'filter 0.5s ease',
          }}>
            覇王色の覇気
          </div>
          <div style={{
            fontSize: 'clamp(14px, 2vw, 20px)',
            color: 'rgba(255,255,255,0.5)',
            letterSpacing: '0.3em',
            textTransform: 'uppercase',
            fontWeight: 700,
          }}>
            Conqueror's Haki
          </div>
        </div>
      )}

      {/* Éclairs décoratifs */}
      {phase === 'waves' && (
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 1 }} viewBox="0 0 100 100" preserveAspectRatio="none">
          {['M50,50 L10,10', 'M50,50 L90,15', 'M50,50 L5,60', 'M50,50 L95,55', 'M50,50 L20,90', 'M50,50 L80,85'].map((d, i) => (
            <path key={i} d={d} stroke="rgba(255,255,255,0.15)" strokeWidth="0.3" fill="none"
              style={{ animation: `fadeIn 0.1s ${i * 0.08}s ease-out both` }} />
          ))}
        </svg>
      )}

      {/* Tapez pour skip */}
      <div style={{
        position: 'absolute', bottom: 32, left: '50%', transform: 'translateX(-50%)',
        fontSize: 11, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.15em',
        textTransform: 'uppercase', cursor: 'pointer', zIndex: 3,
      }} onClick={() => { setPhase('out'); setTimeout(() => setPhase('idle'), 700) }}>
        Cliquer pour ignorer
      </div>
    </div>
  )
}
