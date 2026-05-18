import { useState } from 'react'
import { useInView } from '../hooks/useInView.js'

const FEATURES = [
  {
    emoji: '💰', title: 'Économie Berry', color: '#FFD700',
    desc: 'Gagne des Berrys en étant actif en vocal. Dépose-les en banque, surveille ta fortune et dépense-les dans la boutique pirate.',
    cmds: ['/banque', '/retrait', '/depot'],
    stat: '∞ Berrys en circulation',
  },
  {
    emoji: '📊', title: 'Stats vocales', color: '#3B82F6',
    desc: 'Suis tes heures vocales en temps réel. Vois combien il te reste pour atteindre le rang suivant et compare avec les autres.',
    cmds: ['/stats'],
    stat: 'Mis à jour en temps réel',
  },
  {
    emoji: '🏆', title: 'Classement', color: '#E0524A',
    desc: 'Qui domine le serveur cette semaine ? Consulte le top vocal et le top Berry en direct. Chaque heure compte.',
    cmds: ['/top'],
    stat: 'Top 100 en live',
  },
  {
    emoji: '🎯', title: 'Quiz Animé', color: '#34D399',
    desc: 'Des questions sur One Piece, Naruto, Dragon Ball et des dizaines d\'autres animes. Teste ta culture otaku face à la communauté.',
    cmds: ['/question'],
    stat: '500+ questions disponibles',
  },
  {
    emoji: '🏦', title: 'Banque & Coffre', color: '#9B59B6',
    desc: 'Gère ton coffre, surveille tes revenus passifs et ta fortune accumulée. Fais des virements à tes nakamas.',
    cmds: ['/banque', '/coffre', '/virement'],
    stat: 'Intérêts quotidiens',
  },
  {
    emoji: '👤', title: 'Profil & Wanted', color: '#F97316',
    desc: 'Personnalise ton profil, génère ta fiche d\'avis de recherche style One Piece et affiche ta prime aux autres membres.',
    cmds: ['/monprofil', '/modifprofil'],
    stat: 'Carte personnalisable',
  },
]

function FeatureCard({ feature, delay, inView }) {
  const [hovered, setHovered] = useState(false)
  const { emoji, title, color, desc, cmds, stat } = feature

  return (
    <div
      className={`reveal reveal-${delay} ${inView ? 'visible' : ''}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        borderRadius: 18, position: 'relative', overflow: 'hidden',
        padding: 1,
        background: hovered
          ? `linear-gradient(135deg, ${color}80, ${color}20, ${color}60)`
          : `linear-gradient(135deg, ${color}30, rgba(255,255,255,0.04), ${color}15)`,
        transition: 'background 0.4s ease, transform 0.2s ease, box-shadow 0.2s ease',
        transform: hovered ? 'translateY(-6px)' : 'translateY(0)',
        boxShadow: hovered ? `0 20px 60px ${color}25, 0 8px 20px rgba(0,0,0,0.4)` : '0 2px 12px rgba(0,0,0,0.2)',
        cursor: 'default',
      }}
    >
      {/* Inner card */}
      <div style={{
        padding: '26px 24px',
        borderRadius: 17,
        background: `linear-gradient(135deg, ${color}12 0%, rgba(17,18,20,0.95) 55%, rgba(12,13,15,0.98) 100%)`,
        backdropFilter: 'blur(20px)',
        height: '100%',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Glow top-right */}
        <div style={{
          position: 'absolute', top: -40, right: -40, width: 120, height: 120,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${color}${hovered ? '20' : '10'} 0%, transparent 70%)`,
          transition: 'background 0.3s ease',
          pointerEvents: 'none',
        }} />

        {/* Shine line on hover */}
        {hovered && (
          <div style={{
            position: 'absolute', top: 0, left: '-100%', width: '60%', height: '100%',
            background: `linear-gradient(90deg, transparent, ${color}08, transparent)`,
            animation: 'shimmer 0.8s ease-out',
            pointerEvents: 'none',
          }} />
        )}

        {/* Icon */}
        <div style={{
          width: 54, height: 54, borderRadius: 14, marginBottom: 18,
          background: `${color}22`,
          border: `1px solid ${color}${hovered ? '70' : '40'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26,
          boxShadow: hovered ? `0 0 20px ${color}40, inset 0 0 12px ${color}10` : `0 4px 16px ${color}15`,
          transition: 'all 0.3s ease',
          transform: hovered ? 'scale(1.08)' : 'scale(1)',
        }}>{emoji}</div>

        {/* Title */}
        <h3 style={{
          fontFamily: 'var(--display)', fontWeight: 700, fontSize: 17,
          color: hovered ? '#fff' : 'rgba(255,255,255,0.9)',
          marginBottom: 10, transition: 'color 0.2s',
        }}>{title}</h3>

        {/* Desc */}
        <p style={{ fontSize: 13.5, color: 'var(--muted)', lineHeight: 1.7, marginBottom: 18 }}>{desc}</p>

        {/* Stat badge */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: `${color}10`, border: `1px solid ${color}25`,
          borderRadius: 6, padding: '4px 10px', marginBottom: 16,
        }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: color, animation: 'pulse 2s infinite' }} />
          <span style={{ fontSize: 11, color, fontWeight: 600 }}>{stat}</span>
        </div>

        {/* Commands */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {cmds.map(c => (
            <span key={c} style={{
              background: `${color}10`, border: `1px solid ${color}${hovered ? '50' : '28'}`,
              borderRadius: 6, padding: '3px 10px', fontSize: 12, color,
              fontFamily: 'monospace', fontWeight: 600,
              transition: 'border-color 0.2s',
            }}>{c}</span>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function BotFeatures() {
  const [ref, inView] = useInView()

  return (
    <section id="bot" style={{ position: 'relative' }}>
      <style>{`
        @keyframes shimmer {
          from { left: -100% }
          to   { left: 200% }
        }
      `}</style>
      <div className="orb" style={{ width: 500, height: 500, top: '20%', right: '-10%', background: 'rgba(224,82,74,.06)', pointerEvents: 'none' }} />

      <div className="container" ref={ref}>
        <div style={{ marginBottom: 64 }}>
          <div className={`reveal ${inView ? 'visible' : ''}`}>
            <div className="label">Bot Brams Score</div>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
              <div>
                <h2 className="h2">Tout ce que Brams Score peut faire</h2>
                <p className="sub">Un bot 100% custom. Économie, classements, quiz, profils — tout est pensé pour la communauté.</p>
              </div>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: 'rgba(52,211,153,.08)', border: '1px solid rgba(52,211,153,.2)',
                borderRadius: 10, padding: '9px 18px',
              }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success)', boxShadow: '0 0 8px #34d399', animation: 'pulse 2s infinite' }} />
                <span style={{ fontSize: 13, color: 'var(--success)', fontWeight: 600 }}>Brams Score en ligne</span>
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 16 }}>
          {FEATURES.map((f, i) => (
            <FeatureCard key={f.title} feature={f} delay={(i % 4) + 1} inView={inView} />
          ))}
        </div>
      </div>
    </section>
  )
}
