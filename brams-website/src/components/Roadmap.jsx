import { useRef, useState } from 'react'
import { useEffect } from 'react'

const ITEMS = [
  { status: 'done', date: 'Nov 2024', title: 'Lancement du bot', desc: 'Brams Score rejoint le serveur. Système de vocal tracking opérationnel.', icon: '🚀' },
  { status: 'done', date: 'Déc 2024', title: 'Système de Rangs', desc: 'Attribution automatique des rôles Pirate → Roi des Pirates selon les heures vocales.', icon: '⚔️' },
  { status: 'done', date: 'Jan 2025', title: 'Économie Berrys', desc: 'Monnaie virtuelle One Piece. Gains vocaux, récompenses et boutique.', icon: '💰' },
  { status: 'done', date: 'Fév 2025', title: 'Cartes de Rang animées', desc: 'Génération d\'images personnalisées avec GIFs animés par rang. Style pirates.', icon: '🎴' },
  { status: 'done', date: 'Avr 2025', title: 'Quiz Animé IA', desc: 'Questions générées par Claude AI sur One Piece. Classement et récompenses.', icon: '🧠' },
  { status: 'done', date: 'Mai 2025', title: 'Site Brams Community', desc: 'Ce site ! Classement en temps réel, IA Gemini, design One Piece complet.', icon: '🌐' },
  { status: 'current', date: 'Juin 2025', title: 'Fruits du Démon & Map', desc: 'Attribution de pouvoirs aux membres selon leur rang. Carte du Grand Line interactive.', icon: '🍎' },
  { status: 'upcoming', date: 'Juil 2025', title: 'Tournois PvP', desc: 'Combats entre membres avec système de mise de Berrys. Brackets automatiques.', icon: '🏆' },
  { status: 'upcoming', date: 'Été 2025', title: 'Équipages & Alliances', desc: 'Groupes de membres, territoires, guerres de serveurs. Nakamas pour la vie.', icon: '🏴‍☠️' },
  { status: 'upcoming', date: '2025', title: 'Application Mobile', desc: 'App Brams Community sur iOS et Android. Notifications, classement, profil.', icon: '📱' },
]

function useInView(ref) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true) }, { threshold: 0.1 })
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [ref])
  return visible
}

const STATUS = {
  done:     { color: '#34d399', label: '✅ Terminé', bg: 'rgba(52,211,153,0.1)', border: 'rgba(52,211,153,0.3)' },
  current:  { color: '#fdcb6e', label: '🔄 En cours', bg: 'rgba(253,203,110,0.1)', border: 'rgba(253,203,110,0.35)' },
  upcoming: { color: '#74b9ff', label: '📅 Prévu', bg: 'rgba(116,185,255,0.08)', border: 'rgba(116,185,255,0.2)' },
}

export default function Roadmap() {
  const ref = useRef(null)
  const visible = useInView(ref)

  return (
    <section id="roadmap" ref={ref} style={{ padding: '110px 0', position: 'relative' }}>
      <div style={{ position: 'absolute', left: 0, top: '30%', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(116,185,255,0.04) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <div className="container">
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
          <div className="label">⚓ Évolution</div>
          <h2 className="h2" style={{ textAlign: 'center' }}>Roadmap du Bot</h2>
          <p className="sub" style={{ textAlign: 'center', margin: '0 auto' }}>Du premier vocal tracker à la conquête du Grand Line — la route du Roi des Pirates</p>
        </div>

        <div style={{ position: 'relative', maxWidth: 720, margin: '0 auto' }}>
          {/* Ligne verticale */}
          <div style={{
            position: 'absolute', left: 28, top: 0, bottom: 0, width: 2,
            background: 'linear-gradient(to bottom, var(--accent), rgba(116,185,255,0.3), transparent)',
          }} />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 28, paddingLeft: 72 }}>
            {ITEMS.map((item, i) => {
              const s = STATUS[item.status]
              return (
                <div key={i} style={{
                  position: 'relative',
                  animation: visible ? `fadeUp 0.5s ${i * 0.08}s ease-out both` : 'none',
                  opacity: visible ? undefined : 0,
                }}>
                  {/* Dot */}
                  <div style={{
                    position: 'absolute', left: -50, top: 18,
                    width: 20, height: 20, borderRadius: '50%',
                    background: s.color,
                    border: `3px solid var(--bg)`,
                    boxShadow: item.status === 'current' ? `0 0 16px ${s.color}` : 'none',
                    animation: item.status === 'current' ? 'pulse 2s infinite' : 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }} />

                  <div style={{
                    background: s.bg,
                    border: `1px solid ${s.border}`,
                    borderRadius: 14,
                    padding: '20px 24px',
                    position: 'relative',
                    transition: 'transform 0.2s',
                  }}
                    onMouseEnter={e => e.currentTarget.style.transform = 'translateX(4px)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'translateX(0)'}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 8, flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 22 }}>{item.icon}</span>
                        <span style={{ fontWeight: 700, fontSize: 16, color: '#fff' }}>{item.title}</span>
                      </div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                        <span style={{ fontSize: 11, color: 'var(--muted)' }}>{item.date}</span>
                        <span style={{
                          fontSize: 10, padding: '3px 10px', borderRadius: 20, fontWeight: 700,
                          background: s.bg, color: s.color, border: `1px solid ${s.border}`,
                        }}>{s.label}</span>
                      </div>
                    </div>
                    <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6, margin: 0 }}>{item.desc}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
