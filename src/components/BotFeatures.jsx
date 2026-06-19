import { CINE, CineStyles, Reveal, CineSection, SectionHead, CineCard } from './home/cine.jsx'

// Bento : chaque feature porte un `span` (1 ou 2 colonnes) pour des tuiles hero variées.
// Données 100% préservées (titres, descriptions, commandes, stats) — restyle uniquement.
// Les couleurs par card ont été retirées : ADN doré sobre unifié (zéro RGB).
const FEATURES = [
  {
    emoji: '💰', title: 'Économie Berry', span: 2,
    desc: 'Gagne des Berrys en étant actif en vocal. Dépose-les en banque, surveille ta fortune et dépense-les dans la boutique pirate.',
    cmds: ['/banque', '/retrait', '/depot'],
    stat: '∞ Berrys en circulation',
  },
  {
    emoji: '📊', title: 'Stats vocales', span: 1,
    desc: 'Suis tes heures vocales en temps réel. Vois combien il te reste pour atteindre le rang suivant et compare avec les autres.',
    cmds: ['/stats'],
    stat: 'Mis à jour en temps réel',
  },
  {
    emoji: '🏆', title: 'Classement', span: 1,
    desc: 'Qui domine le serveur cette semaine ? Consulte le top vocal et le top Berry en direct. Chaque heure compte.',
    cmds: ['/top'],
    stat: 'Top 100 en live',
  },
  {
    emoji: '🎯', title: 'Quiz Animé', span: 2,
    desc: 'Des questions sur One Piece, Naruto, Dragon Ball et des dizaines d\'autres animes. Teste ta culture otaku face à la communauté.',
    cmds: ['/question'],
    stat: '500+ questions disponibles',
  },
  {
    emoji: '🏦', title: 'Banque & Coffre', span: 1,
    desc: 'Gère ton coffre, surveille tes revenus passifs et ta fortune accumulée. Fais des virements à tes nakamas.',
    cmds: ['/banque', '/coffre', '/virement'],
    stat: 'Intérêts quotidiens',
  },
  {
    emoji: '👤', title: 'Profil & Wanted', span: 1,
    desc: 'Personnalise ton profil, génère ta fiche d\'avis de recherche style One Piece et affiche ta prime aux autres membres.',
    cmds: ['/monprofil', '/modifprofil'],
    stat: 'Carte personnalisable',
  },
]

function FeatureTile({ feature, delay }) {
  const { emoji, title, desc, cmds, stat, span } = feature
  const hero = span === 2

  return (
    <Reveal
      delay={delay}
      style={{ gridColumn: hero ? 'span 2' : 'span 1', minWidth: 0 }}
    >
      <CineCard pad={hero ? 'clamp(26px, 3vw, 38px)' : 26} style={{ height: '100%', overflow: 'hidden' }}>
        {/* Halo doré discret (haut-droite) — sobre, aucun glow agressif */}
        <div aria-hidden style={{
          position: 'absolute', top: -60, right: -60, width: 180, height: 180, borderRadius: '50%',
          background: `radial-gradient(circle, ${CINE.goldDim} 0%, transparent 68%)`, opacity: 0.18,
          pointerEvents: 'none',
        }} />

        <div style={{
          position: 'relative', zIndex: 1, height: '100%',
          display: 'flex', flexDirection: 'column',
        }}>
          {/* Icône */}
          <div style={{
            width: hero ? 64 : 54, height: hero ? 64 : 54, borderRadius: 16, flexShrink: 0,
            marginBottom: hero ? 26 : 20,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: hero ? 30 : 26,
            background: 'rgba(191,164,106,0.10)',
            border: `1px solid ${CINE.goldDim}`,
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)',
          }}>{emoji}</div>

          {/* Titre */}
          <h3 style={{
            margin: 0, fontFamily: CINE.title, fontWeight: 700, color: CINE.ink,
            fontSize: hero ? 'clamp(22px, 2.4vw, 30px)' : 19, letterSpacing: '-0.015em', lineHeight: 1.1,
          }}>{title}</h3>

          {/* Description */}
          <p style={{
            margin: hero ? '14px 0 0' : '12px 0 0', maxWidth: hero ? 560 : 'none',
            fontFamily: CINE.body, fontSize: hero ? 15.5 : 14, lineHeight: 1.65, color: CINE.inkSoft,
          }}>{desc}</p>

          {/* Stat — filet or live */}
          <div style={{ margin: hero ? '22px 0 0' : '18px 0 0' }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '5px 12px', borderRadius: 999,
              background: 'rgba(191,164,106,0.07)', border: `1px solid ${CINE.hair}`,
            }}>
              <span style={{
                width: 6, height: 6, borderRadius: '50%', background: CINE.gold,
                animation: 'cinePulse 2.4s ease-in-out infinite',
              }} />
              <span style={{
                fontFamily: CINE.title, fontSize: 11.5, fontWeight: 700, letterSpacing: '0.04em', color: CINE.goldHi,
              }}>{stat}</span>
            </span>
          </div>

          {/* Commandes — collées en bas pour aligner les tuiles */}
          <div style={{
            marginTop: 'auto', paddingTop: hero ? 24 : 18,
            display: 'flex', gap: 8, flexWrap: 'wrap',
          }}>
            {cmds.map((c) => (
              <span key={c} style={{
                padding: '4px 11px', borderRadius: 8,
                background: 'rgba(255,255,255,0.03)', border: `1px solid ${CINE.hairTop}`,
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                fontSize: 12.5, fontWeight: 600, color: CINE.inkSoft,
              }}>{c}</span>
            ))}
          </div>
        </div>
      </CineCard>
    </Reveal>
  )
}

export default function BotFeatures() {
  return (
    <CineSection id="bot">
      <CineStyles />

      <div style={{
        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 24, marginBottom: 'clamp(40px, 6vh, 64px)',
      }}>
        <SectionHead
          eyebrow="Le bot"
          title="Tout ce que Brams Score"
          accent="peut faire"
          lead="Un bot 100% custom. Économie, classements, quiz, profils — tout est pensé pour la communauté."
        />
        <Reveal delay={160} style={{ flexShrink: 0 }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 9,
            padding: '9px 16px', borderRadius: 999,
            background: 'rgba(46,204,113,0.07)', border: '1px solid rgba(46,204,113,0.22)',
          }}>
            <span style={{
              width: 8, height: 8, borderRadius: '50%', background: CINE.live,
              boxShadow: `0 0 10px ${CINE.live}`, animation: 'cinePulse 2s ease-in-out infinite',
            }} />
            <span style={{ fontFamily: CINE.title, fontSize: 13, fontWeight: 700, color: CINE.live }}>
              Brams Score en ligne
            </span>
          </span>
        </Reveal>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
        gap: 'clamp(14px, 1.4vw, 22px)',
        gridAutoRows: '1fr',
      }}>
        {FEATURES.map((f, i) => (
          <FeatureTile key={f.title} feature={f} delay={(i % 4) * 90} />
        ))}
      </div>

      {/* Fallback responsive : le bento 4-col passe en 2-col puis 1-col sans Tailwind */}
      <style>{`
        @media (max-width: 900px){
          #bot [style*="repeat(4, minmax(0, 1fr))"]{ grid-template-columns: repeat(2, minmax(0,1fr)) !important; }
        }
        @media (max-width: 560px){
          #bot [style*="repeat(4, minmax(0, 1fr))"]{ grid-template-columns: 1fr !important; }
          #bot [style*="span 2"]{ grid-column: auto !important; }
        }
      `}</style>
    </CineSection>
  )
}
