import { useState } from 'react'
import { useSoundEffect } from '../hooks/useSoundEffect.js'
import { CINE, GOLD_GRAD, CineStyles, Reveal, CineSection, SectionHead, GoldButton } from './home/cine.jsx'

const LEETCHI_URL = 'https://www.leetchi.com/fr/c/brams-score-by-freydiss-1073815?utm_source=copylink&utm_medium=social_sharing'

const SUPPORTS = [
  {
    icon: '💛',
    title: 'Cagnotte Leetchi',
    desc: 'Participe à la cagnotte officielle du Brams Score. Chaque contribution aide à couvrir les frais d\'hébergement et de développement du bot.',
    cta: 'Contribuer sur Leetchi',
    href: LEETCHI_URL,
    badge: '💰 Cagnotte',
  },
  {
    icon: '💜',
    title: 'Booster le serveur',
    desc: 'Un boost Discord débloque des perks exclusifs pour toute la communauté : meilleure qualité audio, plus d\'emojis, bannière animée.',
    cta: 'Booster sur Discord',
    href: 'https://discord.gg/4FgezPpnGU',
    badge: 'Impactant',
  },
  {
    icon: '📺',
    title: 'Regarder en live',
    desc: 'Rejoins les lives Twitch de Brams. Chaque vue, chaque sub compte pour faire grandir la communauté One Piece.',
    cta: 'Suivre sur Twitch',
    href: 'https://www.twitch.tv/bouledog_',
    badge: 'Gratuit',
  },
  {
    icon: '▶️',
    title: 'S\'abonner YouTube',
    desc: 'Abonne-toi à la chaîne YouTube de Brams pour ne rater aucune vidéo. Like et partage = meilleure visibilité.',
    cta: 'S\'abonner',
    href: 'https://www.youtube.com/@BouleDogg/featured',
    badge: 'Gratuit',
  },
  {
    icon: '🏴‍☠️',
    title: 'Recruter des nakamas',
    desc: 'Invite tes amis sur le serveur. Plus on est nombreux, plus l\'aventure est épique. La Brams Community grandit grâce à toi.',
    cta: 'Inviter des amis',
    href: 'https://discord.gg/4FgezPpnGU',
    badge: 'Communauté',
  },
]

export default function NousSoutenir() {
  const [hovered, setHovered] = useState(null)
  const { play } = useSoundEffect()

  return (
    <CineSection id="soutenir">
      <CineStyles />

      <SectionHead
        eyebrow="❤️ Soutien"
        title="Nous"
        accent="soutenir"
        lead="Brams Community est 100% gratuit. Si tu veux aider l'aventure à continuer, voici comment."
        align="center"
        max={620}
      />

      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: 18, margin: '56px 0 64px', width: '100%',
      }}>
        {SUPPORTS.map((s, i) => (
          <Reveal key={i} delay={i * 70}>
            <a
              href={s.href}
              target="_blank"
              rel="noopener noreferrer"
              onMouseEnter={() => { setHovered(i); play('hover') }}
              onMouseLeave={() => setHovered(null)}
              onClick={() => play('click')}
              style={{
                display: 'flex', flexDirection: 'column', gap: 14, height: '100%',
                boxSizing: 'border-box',
                background: hovered === i ? CINE.panel2 : CINE.panel,
                border: `1px solid ${hovered === i ? CINE.gold : CINE.hair}`,
                borderRadius: 18, padding: '26px 24px',
                transition: 'transform .35s cubic-bezier(.22,1,.36,1), background .3s, border-color .3s, box-shadow .35s',
                transform: hovered === i ? 'translateY(-4px)' : 'none',
                boxShadow: hovered === i ? '0 18px 50px rgba(0,0,0,0.45)' : '0 6px 24px rgba(0,0,0,0.25)',
                textDecoration: 'none', cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{
                  width: 50, height: 50, borderRadius: 13,
                  background: 'rgba(191,164,106,0.10)', border: `1px solid ${CINE.goldDim}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 23,
                }}>{s.icon}</div>
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: '4px 11px', borderRadius: 20,
                  background: 'rgba(191,164,106,0.08)', color: CINE.gold, border: `1px solid ${CINE.goldDim}`,
                  textTransform: 'uppercase', letterSpacing: '0.12em', fontFamily: CINE.title,
                }}>{s.badge}</span>
              </div>
              <div style={{ fontWeight: 700, fontSize: 17, color: CINE.ink, fontFamily: CINE.title, letterSpacing: '-0.01em' }}>{s.title}</div>
              <div style={{ fontSize: 13.5, color: CINE.inkSoft, lineHeight: 1.65, flex: 1 }}>{s.desc}</div>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                fontSize: 13, fontWeight: 700, color: CINE.gold, fontFamily: CINE.title,
                marginTop: 4,
              }}>
                {s.cta} →
              </div>
            </a>
          </Reveal>
        ))}
      </div>

      {/* Bloc remerciement */}
      <Reveal delay={120}>
        <div style={{
          maxWidth: 640, margin: '0 auto', textAlign: 'center',
          background: CINE.panel,
          border: `1px solid ${CINE.hairTop}`,
          borderRadius: 22, padding: 'clamp(28px, 5vw, 40px)',
          boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
        }}>
          <div style={{ fontSize: 42, marginBottom: 16 }}>🏴‍☠️</div>
          <h3 style={{ fontFamily: CINE.title, fontWeight: 700, fontSize: 'clamp(20px, 2.6vw, 26px)', color: CINE.ink, margin: '0 0 12px', letterSpacing: '-0.02em' }}>
            Merci à tous les <span style={{ background: GOLD_GRAD, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>nakamas</span>
          </h3>
          <p style={{ fontSize: 14.5, color: CINE.inkSoft, lineHeight: 1.8, margin: '0 auto 24px', maxWidth: 480 }}>
            Ce serveur et ce bot sont développés bénévolement par <strong style={{ color: CINE.gold }}>Freydiss</strong>.
            Chaque soutien — boost, sub, like — fait une vraie différence. Merci à tous !
          </p>
          <GoldButton href="https://discord.gg/4FgezPpnGU" target="_blank" rel="noopener noreferrer"
            onMouseEnter={() => play('hover')} onClick={() => play('click')}>
            Rejoindre l'aventure →
          </GoldButton>
        </div>
      </Reveal>
    </CineSection>
  )
}
