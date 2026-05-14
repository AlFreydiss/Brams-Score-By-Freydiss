import { useState, useEffect, useRef } from 'react'

const LEGENDS = [
  { name: 'BouleDogg', pseudo: 'Le Fondateur', prime: '1 000 000 000', icon: '👑', color: '#ffd700', desc: 'Fondateur de Brams Community. Roi absolu, imbattu et invincible du Grand Line.' },
  { name: 'Freydiss', pseudo: 'L\'Architecte', prime: '850 000 000', icon: '⚙️', color: '#9b59b6', desc: 'Développeur et admin du bot Brams Score. Bâtisseur de l\'empire technologique.' },
  { name: 'Benactief', pseudo: 'Le Fantôme', prime: '720 000 000', icon: '👻', color: '#74b9ff', desc: 'Maître du serveur dans l\'ombre. Sa présence vocale fait trembler les Yonkous.' },
  { name: 'Berat', pseudo: 'Le Stratège', prime: '680 000 000', icon: '🗺️', color: '#00cec9', desc: 'Gestionnaire des événements. Chaque tournoi, chaque combat — c\'est son oeuvre.' },
  { name: '???', pseudo: 'Le Prochain Roi ?', prime: '???', icon: '❓', color: '#e0524a', desc: 'Le prochain Roi des Pirates est peut-être toi. Rejoins le Grand Line et prouve ta valeur.' },
]

export default function HallOfFame() {
  const [active, setActive] = useState(0)
  const [animDir, setAnimDir] = useState(1)
  const intervalRef = useRef(null)

  const go = (dir) => {
    setAnimDir(dir)
    setActive(a => (a + dir + LEGENDS.length) % LEGENDS.length)
  }

  useEffect(() => {
    intervalRef.current = setInterval(() => go(1), 5000)
    return () => clearInterval(intervalRef.current)
  }, [])

  const legend = LEGENDS[active]

  return (
    <section id="hall-of-fame" style={{ padding: '110px 0', position: 'relative', overflow: 'hidden' }}>
      {/* Fond doré subtil */}
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center, rgba(255,215,0,0.04) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <div className="container">
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <div className="label" style={{ color: '#ffd700' }}>👑 Légendes</div>
          <h2 className="h2" style={{ textAlign: 'center' }}>Hall of Fame</h2>
          <p className="sub" style={{ textAlign: 'center', margin: '0 auto' }}>Les Rois des Pirates qui ont marqué Brams Community à jamais</p>
        </div>

        <div style={{ maxWidth: 680, margin: '0 auto', position: 'relative' }}>
          {/* Carte centrale */}
          <div key={active} style={{
            background: `linear-gradient(135deg, rgba(30,32,36,0.98), ${legend.color}12)`,
            border: `2px solid ${legend.color}40`,
            borderRadius: 24,
            padding: '48px 40px',
            textAlign: 'center',
            boxShadow: `0 0 60px ${legend.color}20, 0 20px 60px rgba(0,0,0,0.5)`,
            animation: 'scaleIn 0.35s ease-out',
            position: 'relative',
            overflow: 'hidden',
          }}>
            {/* Shine corner */}
            <div style={{
              position: 'absolute', top: -40, right: -40,
              width: 150, height: 150, borderRadius: '50%',
              background: `radial-gradient(circle, ${legend.color}25, transparent 70%)`,
              pointerEvents: 'none',
            }} />

            <div style={{
              width: 100, height: 100, borderRadius: '50%', margin: '0 auto 20px',
              background: `linear-gradient(135deg, ${legend.color}30, ${legend.color}10)`,
              border: `3px solid ${legend.color}60`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 44,
              boxShadow: `0 0 30px ${legend.color}30`,
            }}>
              {legend.icon}
            </div>

            <div style={{ fontFamily: 'var(--pirate)', fontSize: 32, color: '#fff', marginBottom: 4 }}>
              {legend.name}
            </div>
            <div style={{ fontSize: 13, color: legend.color, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 20 }}>
              {legend.pseudo}
            </div>

            <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.65)', lineHeight: 1.7, marginBottom: 28, maxWidth: 440, margin: '0 auto 28px' }}>
              {legend.desc}
            </p>

            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 10,
              background: `rgba(255,215,0,0.08)`, border: '1px solid rgba(255,215,0,0.25)',
              borderRadius: 40, padding: '10px 28px',
            }}>
              <span style={{ fontSize: 12, color: 'rgba(255,215,0,0.7)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Prime</span>
              <span style={{ fontSize: 20, fontWeight: 800, color: '#ffd700' }}>{legend.prime} Berrys</span>
            </div>
          </div>

          {/* Contrôles */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20, marginTop: 32 }}>
            <button onClick={() => { clearInterval(intervalRef.current); go(-1) }} style={{
              width: 44, height: 44, borderRadius: '50%', border: '1px solid var(--border)',
              background: 'var(--card)', color: '#fff', cursor: 'pointer', fontSize: 20,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.2s',
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = legend.color; e.currentTarget.style.boxShadow = `0 0 16px ${legend.color}30` }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none' }}
            >←</button>

            <div style={{ display: 'flex', gap: 8 }}>
              {LEGENDS.map((_, i) => (
                <button key={i} onClick={() => { clearInterval(intervalRef.current); setActive(i) }} style={{
                  width: i === active ? 24 : 8, height: 8, borderRadius: 4, border: 'none', cursor: 'pointer',
                  background: i === active ? legend.color : 'rgba(255,255,255,0.2)',
                  transition: 'all 0.3s ease',
                  padding: 0,
                }} />
              ))}
            </div>

            <button onClick={() => { clearInterval(intervalRef.current); go(1) }} style={{
              width: 44, height: 44, borderRadius: '50%', border: '1px solid var(--border)',
              background: 'var(--card)', color: '#fff', cursor: 'pointer', fontSize: 20,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.2s',
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = legend.color; e.currentTarget.style.boxShadow = `0 0 16px ${legend.color}30` }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none' }}
            >→</button>
          </div>
        </div>
      </div>
    </section>
  )
}
