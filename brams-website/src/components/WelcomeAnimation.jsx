import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext.jsx'

const PARTICLES = Array.from({ length: 24 }, (_, i) => ({
  id: i,
  x: Math.random() * 100,
  y: Math.random() * 100,
  size: 3 + Math.random() * 5,
  delay: Math.random() * 0.8,
  duration: 1.2 + Math.random() * 1.4,
  color: ['#FFD700', '#E0524A', '#9B59B6', '#2ECC71', '#fff'][i % 5],
  dx: (Math.random() - 0.5) * 200,
  dy: -(60 + Math.random() * 140),
}))

const CONFETTI = Array.from({ length: 32 }, (_, i) => ({
  id: i,
  x: Math.random() * 100,
  delay: Math.random() * 1.5,
  duration: 2 + Math.random() * 1.5,
  size: 6 + Math.random() * 8,
  color: ['#FFD700', '#E0524A', '#9B59B6', '#2ECC71', '#74b9ff', '#ff6b35'][i % 6],
  rotation: Math.random() * 360,
  shape: i % 3 === 0 ? 'circle' : i % 3 === 1 ? 'square' : 'diamond',
}))

const EMOJIS = ['🏴‍☠️', '⚓', '🗡️', '☠️', '🌊', '⚔️']

const CSS = `
@keyframes welcomeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}
@keyframes welcomeOut {
  from { opacity: 1; }
  to   { opacity: 0; }
}
@keyframes waveRise {
  0%   { transform: translateX(-100%) scaleY(0.8); opacity: 0.3; }
  50%  { transform: translateX(0%) scaleY(1); opacity: 0.6; }
  100% { transform: translateX(100%) scaleY(0.8); opacity: 0.3; }
}
@keyframes shipArrive {
  0%   { transform: translateX(-120%) translateY(10px) rotate(-3deg); opacity: 0; }
  60%  { transform: translateX(0%) translateY(-5px) rotate(1deg); opacity: 1; }
  80%  { transform: translateX(4%) translateY(0px) rotate(-1deg); }
  100% { transform: translateX(0%) translateY(0px) rotate(0deg); opacity: 1; }
}
@keyframes cardBounce {
  0%   { transform: translateY(40px) scale(0.9); opacity: 0; }
  60%  { transform: translateY(-8px) scale(1.02); opacity: 1; }
  80%  { transform: translateY(4px) scale(0.99); }
  100% { transform: translateY(0) scale(1); opacity: 1; }
}
@keyframes confettiFall {
  0%   { transform: translateY(-20px) rotate(0deg); opacity: 1; }
  100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
}
@keyframes particlePop {
  0%   { transform: translate(0,0) scale(1); opacity: 1; }
  100% { transform: translate(var(--pdx), var(--pdy)) scale(0); opacity: 0; }
}
@keyframes subtitleAppear {
  0%   { opacity: 0; transform: translateY(12px) letterSpacing 0.2em; }
  100% { opacity: 1; transform: translateY(0); }
}
@keyframes hatDrop {
  0%   { transform: translateY(-80px) rotate(-15deg); opacity: 0; }
  50%  { transform: translateY(8px) rotate(3deg); opacity: 1; }
  70%  { transform: translateY(-4px) rotate(-1deg); }
  100% { transform: translateY(0) rotate(0deg); opacity: 1; }
}
@keyframes rankReveal {
  0%   { width: 0; }
  100% { width: 100%; }
}
@keyframes glowPulse {
  0%,100% { box-shadow: 0 0 30px rgba(255,215,0,0.4), 0 0 60px rgba(224,82,74,0.2); }
  50%      { box-shadow: 0 0 60px rgba(255,215,0,0.7), 0 0 100px rgba(224,82,74,0.4); }
}
`

export default function WelcomeAnimation() {
  const { showWelcome, dismissWelcome, displayName, avatarUrl } = useAuth()
  const [phase, setPhase] = useState('enter') // enter | show | exit

  useEffect(() => {
    if (!showWelcome) { setPhase('enter'); return }
    setPhase('enter')
    const t1 = setTimeout(() => setPhase('show'), 50)
    const t2 = setTimeout(() => setPhase('exit'), 4200)
    const t3 = setTimeout(() => dismissWelcome(), 4700)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [showWelcome, dismissWelcome])

  if (!showWelcome) return null

  const isExiting = phase === 'exit'

  return (
    <>
      <style>{CSS}</style>
      <div
        onClick={dismissWelcome}
        style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(8,10,14,0.92)',
          backdropFilter: 'blur(12px)',
          animation: isExiting ? 'welcomeOut 0.5s ease forwards' : 'welcomeIn 0.4s ease forwards',
          cursor: 'pointer',
          overflow: 'hidden',
        }}
      >
        {/* Vagues de fond */}
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            position: 'absolute', bottom: `${i * 8}%`, left: 0, right: 0,
            height: 120, overflow: 'hidden', pointerEvents: 'none',
            opacity: 0.08 + i * 0.04,
          }}>
            <div style={{
              position: 'absolute', inset: 0,
              background: `linear-gradient(180deg, transparent, rgba(${i === 0 ? '224,82,74' : i === 1 ? '155,89,182' : '255,215,0'},0.6))`,
              borderRadius: '50% 50% 0 0 / 40px 40px 0 0',
              animation: `waveRise ${2.5 + i * 0.7}s ${i * 0.3}s ease-in-out infinite`,
              animationFillMode: 'both',
            }} />
          </div>
        ))}

        {/* Confettis */}
        {CONFETTI.map(c => (
          <div key={c.id} style={{
            position: 'absolute', top: '-20px', left: `${c.x}%`,
            width: c.size, height: c.size,
            background: c.color,
            borderRadius: c.shape === 'circle' ? '50%' : c.shape === 'diamond' ? '0' : '2px',
            transform: c.shape === 'diamond' ? 'rotate(45deg)' : 'none',
            animation: `confettiFall ${c.duration}s ${c.delay}s ease-in forwards`,
            pointerEvents: 'none', zIndex: 1,
          }} />
        ))}

        {/* Particules burst depuis le centre */}
        {PARTICLES.map(p => (
          <div key={p.id} style={{
            position: 'absolute', top: '50%', left: '50%',
            width: p.size, height: p.size, borderRadius: '50%',
            background: p.color,
            '--pdx': `${p.dx}px`, '--pdy': `${p.dy}px`,
            animation: `particlePop ${p.duration}s ${p.delay}s ease-out forwards`,
            pointerEvents: 'none', zIndex: 2,
          }} />
        ))}

        {/* Emojis flottants arrière-plan */}
        {EMOJIS.map((e, i) => (
          <div key={i} style={{
            position: 'absolute',
            top: `${10 + Math.random() * 70}%`,
            left: `${5 + (i * 16)}%`,
            fontSize: 24 + i * 4, opacity: 0.06,
            animation: `float ${4 + i}s ${i * 0.5}s ease-in-out infinite`,
            pointerEvents: 'none',
          }}>{e}</div>
        ))}

        {/* Carte principale */}
        <div
          onClick={e => e.stopPropagation()}
          style={{
            position: 'relative', zIndex: 10,
            background: 'linear-gradient(145deg, rgba(18,20,24,0.98), rgba(30,20,10,0.97))',
            border: '2px solid rgba(255,215,0,0.5)',
            borderRadius: 24,
            padding: '48px 56px',
            maxWidth: 480, width: '90%',
            textAlign: 'center',
            animation: 'cardBounce 0.6s 0.1s cubic-bezier(0.34,1.56,0.64,1) both, glowPulse 2s 0.7s ease-in-out infinite',
            boxShadow: '0 0 40px rgba(255,215,0,0.3), 0 24px 80px rgba(0,0,0,0.7)',
          }}
        >
          {/* Bande top dorée */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: 'linear-gradient(90deg, #E0524A, #FFD700, #9B59B6, #FFD700, #E0524A)', borderRadius: '22px 22px 0 0' }} />

          {/* Chapeau de paille */}
          <div style={{ fontSize: 64, marginBottom: 8, animation: 'hatDrop 0.7s 0.3s cubic-bezier(0.34,1.56,0.64,1) both' }}>
            🏴‍☠️
          </div>

          {/* Avatar Discord */}
          {avatarUrl && (
            <div style={{
              width: 72, height: 72, borderRadius: '50%', margin: '0 auto 16px',
              border: '3px solid #FFD700',
              boxShadow: '0 0 20px rgba(255,215,0,0.5)',
              overflow: 'hidden',
              animation: 'bounceIn 0.5s 0.4s cubic-bezier(0.34,1.56,0.64,1) both',
            }}>
              <img src={avatarUrl} alt={displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          )}

          {/* Texte bienvenue */}
          <div style={{
            fontFamily: "'Pirata One', cursive", fontSize: 'clamp(22px, 4vw, 32px)',
            color: '#fff', lineHeight: 1.2, marginBottom: 8,
            animation: 'subtitleAppear 0.5s 0.5s ease both',
          }}>
            Bienvenue à bord,
          </div>
          <div style={{
            fontFamily: "'Pirata One', cursive", fontSize: 'clamp(28px, 5vw, 42px)',
            background: 'linear-gradient(135deg, #FFD700, #ff8a50, #FFD700)',
            backgroundSize: '200% 200%',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            animation: 'subtitleAppear 0.5s 0.6s ease both, communityGradient 3s 1s ease infinite',
            marginBottom: 20,
          }}>
            {displayName} !
          </div>

          {/* Sous-texte */}
          <p style={{
            fontSize: 14, color: 'rgba(255,255,255,0.55)', lineHeight: 1.6, marginBottom: 24,
            animation: 'subtitleAppear 0.5s 0.75s ease both',
          }}>
            Tu fais maintenant partie de l'équipage.<br />
            Le Grand Line t'attend, nakama.
          </p>

          {/* Barre de rang déco */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', letterSpacing: '.12em', marginBottom: 6 }}>RANG INITIAL</div>
            <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{
                height: '100%', background: 'linear-gradient(90deg, #2ECC71, #34d399)',
                animation: 'rankReveal 1s 0.8s ease both',
                width: '30%', borderRadius: 2,
              }} />
            </div>
            <div style={{ fontSize: 12, color: '#2ECC71', fontWeight: 700, marginTop: 4 }}>⚓ Moussaillon</div>
          </div>

          {/* Button dismiss */}
          <button
            onClick={dismissWelcome}
            style={{
              background: 'linear-gradient(135deg, #E0524A, #c0392b)',
              border: 'none', borderRadius: 12, padding: '12px 32px',
              color: '#fff', fontWeight: 800, fontSize: 14, cursor: 'pointer',
              letterSpacing: '.04em', transition: 'transform .15s',
              animation: 'subtitleAppear 0.4s 1s ease both',
              fontFamily: 'var(--body)',
            }}
            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.04)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            Lever l'ancre ! ⚓
          </button>

          {/* Bande bas dorée */}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 4, background: 'linear-gradient(90deg, #9B59B6, #FFD700, #E0524A, #FFD700, #9B59B6)', borderRadius: '0 0 22px 22px' }} />
        </div>

        {/* Hint clic */}
        <div style={{
          position: 'absolute', bottom: 32, left: '50%', transform: 'translateX(-50%)',
          fontSize: 11, color: 'rgba(255,255,255,0.25)', letterSpacing: '.08em',
          animation: 'subtitleAppear 0.4s 1.5s ease both',
          pointerEvents: 'none',
        }}>
          Cliquer pour fermer
        </div>
      </div>
    </>
  )
}
