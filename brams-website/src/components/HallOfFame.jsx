import { useState, useEffect, useRef } from 'react'
import { useInView } from '../hooks/useInView.js'

const LEGENDS = [
  {
    name: 'Brams', pseudo: 'Le Fondateur', icon: '👑', color: '#ffd700',
    prime: '5 000 000 000 ฿',
    desc: 'Fondateur de Brams Community. Créateur du serveur, à l\'origine de toute l\'aventure One Piece francophone.',
    fruit: 'Fruit du Roi',
    title: 'ROI DES PIRATES',
  },
  {
    name: 'Freydiss', pseudo: 'L\'Architecte', icon: '⚙️', color: '#9b59b6',
    prime: '3 200 000 000 ฿',
    desc: 'Développeur et admin du bot Brams Score. Bâtisseur de l\'empire technologique de la communauté.',
    fruit: 'Fruit du Code',
    title: 'DÉVELOPPEUR EN CHEF',
  },
  {
    name: 'Benactief', pseudo: 'Le Fantôme', icon: '👻', color: '#74b9ff',
    prime: '2 100 000 000 ฿',
    desc: 'Maître du serveur dans l\'ombre. Sa présence vocale fait trembler les Yonkous.',
    fruit: 'Fruit de l\'Ombre',
    title: 'MAÎTRE DU SILENCE',
  },
  {
    name: 'Berat', pseudo: 'Le Stratège', icon: '🗺️', color: '#00cec9',
    prime: '1 800 000 000 ฿',
    desc: 'Gestionnaire des événements. Chaque tournoi, chaque combat — c\'est son œuvre.',
    fruit: 'Fruit du Plan',
    title: 'MAÎTRE DES TOURNOIS',
  },
  {
    name: '???', pseudo: 'Le Prochain Roi ?', icon: '❓', color: '#e0524a',
    prime: '??? ฿',
    desc: 'Le prochain Roi des Pirates est peut-être toi. Rejoins le Grand Line et prouve ta valeur.',
    fruit: '???',
    title: 'À TOI DE JOUER',
  },
]

export default function HallOfFame() {
  const [active, setActive] = useState(0)
  const [animating, setAnimating] = useState(false)
  const intervalRef = useRef(null)
  const [ref, inView] = useInView()

  const go = (dir) => {
    if (animating) return
    setAnimating(true)
    setTimeout(() => {
      setActive(a => (a + dir + LEGENDS.length) % LEGENDS.length)
      setAnimating(false)
    }, 250)
  }

  const goTo = (i) => {
    if (animating || i === active) return
    setAnimating(true)
    clearInterval(intervalRef.current)
    setTimeout(() => { setActive(i); setAnimating(false) }, 250)
    intervalRef.current = setInterval(() => go(1), 5500)
  }

  useEffect(() => {
    intervalRef.current = setInterval(() => go(1), 5500)
    return () => clearInterval(intervalRef.current)
  }, [])

  const legend = LEGENDS[active]

  return (
    <section id="hall-of-fame" style={{ padding: '110px 0', position: 'relative', overflow: 'hidden' }} ref={ref}>
      {/* Fond radial doré */}
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center, rgba(255,215,0,0.05) 0%, transparent 65%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', top: '20%', left: '5%', width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,215,0,0.04), transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '20%', right: '5%', width: 160, height: 160, borderRadius: '50%', background: 'radial-gradient(circle, rgba(155,89,182,0.05), transparent 70%)', pointerEvents: 'none' }} />

      <div className="container">
        <div className={`reveal ${inView ? 'visible' : ''}`} style={{ textAlign: 'center', marginBottom: 56 }}>
          <div className="label" style={{ color: '#ffd700' }}>👑 Légendes</div>
          <h2 className="h2" style={{ textAlign: 'center' }}>Hall of Fame</h2>
          <p className="sub" style={{ textAlign: 'center', margin: '0 auto' }}>Les Rois des Pirates qui ont marqué Brams Community à jamais</p>
        </div>

        <div style={{ maxWidth: 700, margin: '0 auto', position: 'relative' }}>
          {/* Carte */}
          <div style={{
            opacity: animating ? 0 : 1,
            transform: animating ? 'scale(0.97) translateY(8px)' : 'scale(1) translateY(0)',
            transition: 'opacity 0.25s ease, transform 0.25s ease',
          }}>
            <div style={{
              background: `linear-gradient(145deg, rgba(20,22,26,0.97), ${legend.color}14)`,
              border: `1px solid ${legend.color}40`,
              borderRadius: 24,
              padding: '0',
              boxShadow: `0 0 80px ${legend.color}18, 0 24px 80px rgba(0,0,0,0.55)`,
              overflow: 'hidden',
              position: 'relative',
            }}>
              {/* Bande supérieure couleur */}
              <div style={{
                height: 4,
                background: `linear-gradient(90deg, transparent, ${legend.color}, transparent)`,
              }} />

              <div style={{ padding: '44px 40px 36px' }}>
                {/* Title badge */}
                <div style={{ textAlign: 'center', marginBottom: 28 }}>
                  <span style={{
                    fontSize: 10, fontWeight: 900, letterSpacing: '.15em',
                    background: `${legend.color}18`, color: legend.color,
                    border: `1px solid ${legend.color}40`,
                    borderRadius: 4, padding: '4px 14px',
                  }}>{legend.title}</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 32, alignItems: 'start' }}>
                  {/* Avatar */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 110, height: 110, borderRadius: '50%',
                      background: `linear-gradient(135deg, ${legend.color}30, ${legend.color}10)`,
                      border: `3px solid ${legend.color}60`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 52,
                      boxShadow: `0 0 40px ${legend.color}35, inset 0 0 20px ${legend.color}10`,
                    }}>{legend.icon}</div>

                    {/* Prime */}
                    <div style={{
                      background: 'rgba(0,0,0,0.4)', border: `1px solid ${legend.color}30`,
                      borderRadius: 8, padding: '6px 14px', textAlign: 'center',
                    }}>
                      <div style={{ fontSize: 9, color: 'rgba(255,255,255,.35)', letterSpacing: '.1em', marginBottom: 2 }}>PRIME</div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: legend.color, fontFamily: 'var(--pirate)' }}>{legend.prime}</div>
                    </div>
                  </div>

                  {/* Info */}
                  <div>
                    <div style={{ fontFamily: 'var(--pirate)', fontSize: 36, color: '#fff', lineHeight: 1, marginBottom: 4 }}>{legend.name}</div>
                    <div style={{ fontSize: 12, color: legend.color, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 16 }}>
                      🏴‍☠️ {legend.pseudo}
                    </div>
                    <p style={{ fontSize: 14.5, color: 'rgba(255,255,255,.65)', lineHeight: 1.75, marginBottom: 20 }}>{legend.desc}</p>

                    {/* Fruit du démon */}
                    <div style={{
                      display: 'inline-flex', alignItems: 'center', gap: 8,
                      background: `${legend.color}10`, border: `1px solid ${legend.color}25`,
                      borderRadius: 8, padding: '7px 14px',
                    }}>
                      <span>🍎</span>
                      <div>
                        <div style={{ fontSize: 9, color: 'rgba(255,255,255,.3)', letterSpacing: '.08em' }}>FRUIT DU DÉMON</div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: legend.color }}>{legend.fruit}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bande inférieure */}
              <div style={{ height: 2, background: `linear-gradient(90deg, transparent, ${legend.color}30, transparent)` }} />
            </div>
          </div>

          {/* Navigation */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20, marginTop: 36 }}>
            <button onClick={() => { clearInterval(intervalRef.current); go(-1); intervalRef.current = setInterval(() => go(1), 5500) }}
              style={{
                width: 44, height: 44, borderRadius: '50%', border: `1px solid ${legend.color}30`,
                background: `${legend.color}10`, color: '#fff', cursor: 'pointer', fontSize: 20,
                display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = legend.color; e.currentTarget.style.boxShadow = `0 0 20px ${legend.color}30` }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = `${legend.color}30`; e.currentTarget.style.boxShadow = 'none' }}
            >←</button>

            <div style={{ display: 'flex', gap: 8 }}>
              {LEGENDS.map((l, i) => (
                <button key={i} onClick={() => goTo(i)} style={{
                  width: i === active ? 28 : 8, height: 8, borderRadius: 4, border: 'none', cursor: 'pointer',
                  background: i === active ? legend.color : 'rgba(255,255,255,0.18)',
                  transition: 'all 0.3s ease', padding: 0,
                }} />
              ))}
            </div>

            <button onClick={() => { clearInterval(intervalRef.current); go(1); intervalRef.current = setInterval(() => go(1), 5500) }}
              style={{
                width: 44, height: 44, borderRadius: '50%', border: `1px solid ${legend.color}30`,
                background: `${legend.color}10`, color: '#fff', cursor: 'pointer', fontSize: 20,
                display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = legend.color; e.currentTarget.style.boxShadow = `0 0 20px ${legend.color}30` }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = `${legend.color}30`; e.currentTarget.style.boxShadow = 'none' }}
            >→</button>
          </div>

          {/* Miniatures */}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 24 }}>
            {LEGENDS.map((l, i) => (
              <button key={i} onClick={() => goTo(i)} style={{
                width: 44, height: 44, borderRadius: 10,
                background: i === active ? `${l.color}20` : 'rgba(255,255,255,0.04)',
                border: `1px solid ${i === active ? l.color + '60' : 'rgba(255,255,255,0.08)'}`,
                fontSize: 20, cursor: 'pointer', transition: 'all 0.25s',
                transform: i === active ? 'scale(1.12)' : 'scale(1)',
              }}>{l.icon}</button>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
