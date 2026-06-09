import { useState } from 'react'

const FEATURES = [
  {
    icon: '🏴‍☠️',
    title: 'Créer son équipage',
    desc: 'Fonde ton propre équipage, choisis un nom, un tag, un drapeau. Monte jusqu\'au niveau 10 et décroche le statut Yonkou.',
    color: '#e0524a',
    badge: 'Fondation',
  },
  {
    icon: '⚔️',
    title: 'Guerres d\'équipages',
    desc: 'Déclare la guerre à un équipage rival. Mise des Berrys, accumule les victoires en duel — le vainqueur rafle le butin.',
    color: '#ff6b35',
    badge: 'Combat',
  },
  {
    icon: '🎙️',
    title: 'Duels arbitrés en vocal',
    desc: 'Défie un équipage adverse en vocal. Un arbitre neutre supervise le duel en direct et déclare le vainqueur.',
    color: '#5865f2',
    badge: 'Nouveau',
  },
  {
    icon: '📋',
    title: 'Missions hebdomadaires',
    desc: 'Chaque semaine, 3 missions générées automatiquement. Accomplis-les pour gagner XP et Berrys d\'équipage.',
    color: '#ffd700',
    badge: 'Hebdo',
  },
  {
    icon: '🗺️',
    title: 'Conquête de territoires',
    desc: 'Attaque des îles One Piece (Wano, Dressrosa, Egghead…). La communauté vote, le vainqueur touche un bonus quotidien.',
    color: '#00c8b0',
    badge: 'Stratégie',
  },
  {
    icon: '🏆',
    title: 'Tournoi mensuel',
    desc: 'Inscris-toi au tournoi officiel des équipages. Bracket en élimination directe, prize pool commun, gloire éternelle.',
    color: '#9b59b6',
    badge: 'Compétition',
  },
  {
    icon: '💰',
    title: 'Trésor collectif',
    desc: 'Chaque membre contribue au trésor de l\'équipage. Finances les guerres, les alliances et les missions.',
    color: '#f9a825',
    badge: 'Économie',
  },
  {
    icon: '🤝',
    title: 'Alliances & trahisons',
    desc: 'Forge des alliances avec d\'autres équipages… ou trahis-les au bon moment. La politique fait partie du jeu.',
    color: '#34d399',
    badge: 'Diplomatie',
  },
]


export default function EquipageSection() {
  const [hovered, setHovered] = useState(null)

  return (
    <section id="equipage" style={{ padding: '110px 0', position: 'relative', overflow: 'hidden' }}>

      {/* Orbes déco */}
      <div style={{ position: 'absolute', top: '5%', right: '-10%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(224,82,74,0.05) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '10%', left: '-5%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(88,101,242,0.05) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <div className="container">

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
          <div className="label">🏴‍☠️ Équipages</div>
          <h2 className="h2" style={{ textAlign: 'center' }}>
            Forge ton équipage
          </h2>
          <p className="sub" style={{ textAlign: 'center', margin: '0 auto', maxWidth: 560 }}>
            Rejoins ou crée un équipage sur le serveur Brams Community. Guerres, missions, territoires, tournois — l'aventure commence ici.
          </p>
        </div>

        {/* Grille features */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: 16,
          marginBottom: 64,
        }}>
          {FEATURES.map((f, i) => (
            <div
              key={i}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              style={{
                display: 'flex', flexDirection: 'column', gap: 12,
                background: hovered === i ? `${f.color}10` : 'rgba(255,255,255,0.028)',
                border: `1px solid ${hovered === i ? f.color + '40' : 'rgba(255,255,255,0.06)'}`,
                borderRadius: 16, padding: '24px 20px',
                transition: 'all 0.25s ease',
                transform: hovered === i ? 'translateY(-4px)' : 'none',
                boxShadow: hovered === i ? `0 12px 40px ${f.color}18` : '0 4px 20px rgba(0,0,0,0.2)',
                cursor: 'default',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 12,
                  background: `${f.color}18`, border: `1px solid ${f.color}30`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
                }}>{f.icon}</div>
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
                  background: `${f.color}15`, color: f.color, border: `1px solid ${f.color}30`,
                  textTransform: 'uppercase', letterSpacing: '0.1em',
                }}>{f.badge}</span>
              </div>
              <div style={{ fontWeight: 700, fontSize: 16, color: '#fff' }}>{f.title}</div>
              <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.65, flex: 1 }}>{f.desc}</div>
            </div>
          ))}
        </div>

        {/* CTA bas */}
        <div style={{
          maxWidth: 640, margin: '0 auto', textAlign: 'center',
          background: 'linear-gradient(135deg, rgba(224,82,74,0.07), rgba(88,101,242,0.07))',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 20, padding: '40px 40px 36px',
        }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🏴‍☠️</div>
          <h3 style={{ fontFamily: 'var(--display)', fontWeight: 800, fontSize: 22, color: '#fff', marginBottom: 10 }}>
            Prêt à embarquer ?
          </h3>
          <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.8, marginBottom: 28, maxWidth: 420, margin: '0 auto 28px' }}>
            Rejoins le serveur Discord Brams Community, utilise <code style={{ background: 'rgba(255,255,255,0.08)', padding: '1px 6px', borderRadius: 4, fontSize: 13, color: '#fff' }}>/equipage</code> et forge ta légende.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a
              href="/equipage"
              className="btn"
              style={{ fontSize: 14, background: 'linear-gradient(135deg,#d4a017,#e8b84a)', color: '#1a1a1a', fontWeight: 700, boxShadow: '0 4px 20px rgba(212,160,23,0.3)' }}
            >
              ⚔️ Explorer les équipages
            </a>
            <a
              href="https://discord.gg/4FgezPpnGU"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-discord"
              style={{ fontSize: 14 }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/></svg>
              Rejoindre le serveur
            </a>
          </div>
        </div>

      </div>
    </section>
  )
}
