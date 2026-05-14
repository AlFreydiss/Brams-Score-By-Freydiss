import { useState } from 'react'
import { useSoundEffect } from '../hooks/useSoundEffect.js'

const LEETCHI_URL = 'https://www.leetchi.com/fr/c/brams-score' // ← remplace par ton vrai lien Leetchi

const SUPPORTS = [
  {
    icon: '💛',
    title: 'Cagnotte Leetchi',
    desc: 'Participe à la cagnotte officielle du Brams Score. Chaque contribution aide à couvrir les frais d\'hébergement et de développement du bot.',
    cta: 'Contribuer sur Leetchi',
    href: LEETCHI_URL,
    color: '#f9a825',
    badge: '💰 Cagnotte',
  },
  {
    icon: '💜',
    title: 'Booster le serveur',
    desc: 'Un boost Discord débloque des perks exclusifs pour toute la communauté : meilleure qualité audio, plus d\'emojis, bannière animée.',
    cta: 'Booster sur Discord',
    href: 'https://discord.gg/ez4dBTPE',
    color: '#9b59b6',
    badge: 'Impactant',
  },
  {
    icon: '📺',
    title: 'Regarder en live',
    desc: 'Rejoins les lives Twitch de Brams. Chaque vue, chaque sub compte pour faire grandir la communauté One Piece.',
    cta: 'Suivre sur Twitch',
    href: 'https://www.twitch.tv/bouledog_',
    color: '#9147ff',
    badge: 'Gratuit',
  },
  {
    icon: '▶️',
    title: 'S\'abonner YouTube',
    desc: 'Abonne-toi à la chaîne YouTube de Brams pour ne rater aucune vidéo. Like et partage = meilleure visibilité.',
    cta: 'S\'abonner',
    href: 'https://www.youtube.com/@BouleDogg/featured',
    color: '#ff0000',
    badge: 'Gratuit',
  },
  {
    icon: '🏴‍☠️',
    title: 'Recruter des nakamas',
    desc: 'Invite tes amis sur le serveur. Plus on est nombreux, plus l\'aventure est épique. La Brams Community grandit grâce à toi.',
    cta: 'Inviter des amis',
    href: 'https://discord.gg/ez4dBTPE',
    color: '#e0524a',
    badge: 'Communauté',
  },
]

export default function NousSoutenir() {
  const [hovered, setHovered] = useState(null)
  const { play } = useSoundEffect()

  return (
    <section id="soutenir" style={{ padding: '110px 0', position: 'relative', overflow: 'hidden' }}>
      {/* Orbe fond */}
      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(155,89,182,0.05) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <div className="container">
        <div style={{ textAlign: 'center', marginBottom: 60 }}>
          <div className="label">❤️ Soutien</div>
          <h2 className="h2" style={{ textAlign: 'center' }}>Nous soutenir</h2>
          <p className="sub" style={{ textAlign: 'center', margin: '0 auto' }}>
            Brams Community est 100% gratuit. Si tu veux aider l'aventure à continuer, voici comment.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16, maxWidth: 960, margin: '0 auto 56px' }}>
          {SUPPORTS.map((s, i) => (
            <a
              key={i}
              href={s.href}
              target="_blank"
              rel="noopener noreferrer"
              onMouseEnter={() => { setHovered(i); play('hover') }}
              onMouseLeave={() => setHovered(null)}
              onClick={() => play('click')}
              style={{
                display: 'flex', flexDirection: 'column', gap: 12,
                background: hovered === i ? `${s.color}12` : 'var(--card)',
                border: `1px solid ${hovered === i ? s.color + '40' : 'rgba(255,255,255,0.06)'}`,
                borderRadius: 16, padding: '24px 20px',
                transition: 'all 0.25s ease',
                transform: hovered === i ? 'translateY(-4px)' : 'none',
                boxShadow: hovered === i ? `0 12px 40px ${s.color}20` : '0 4px 20px rgba(0,0,0,0.2)',
                textDecoration: 'none',
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 12,
                  background: `${s.color}18`, border: `1px solid ${s.color}30`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
                }}>{s.icon}</div>
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
                  background: `${s.color}15`, color: s.color, border: `1px solid ${s.color}30`,
                  textTransform: 'uppercase', letterSpacing: '0.1em',
                }}>{s.badge}</span>
              </div>
              <div style={{ fontWeight: 700, fontSize: 16, color: '#fff' }}>{s.title}</div>
              <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.65, flex: 1 }}>{s.desc}</div>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                fontSize: 13, fontWeight: 700, color: s.color,
                marginTop: 4,
              }}>
                {s.cta} →
              </div>
            </a>
          ))}
        </div>

        {/* Bloc remerciement */}
        <div style={{
          maxWidth: 600, margin: '0 auto', textAlign: 'center',
          background: 'linear-gradient(135deg, rgba(224,82,74,0.06), rgba(155,89,182,0.06))',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 20, padding: '32px 40px',
        }}>
          <div style={{ fontSize: 40, marginBottom: 14 }}>🏴‍☠️</div>
          <h3 style={{ fontFamily: 'var(--display)', fontWeight: 800, fontSize: 20, color: '#fff', marginBottom: 10 }}>
            Merci à tous les nakamas
          </h3>
          <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.8, marginBottom: 20 }}>
            Ce serveur et ce bot sont développés bénévolement par <strong style={{ color: '#00C2FF' }}>Freydiss</strong>.
            Chaque soutien — boost, sub, like — fait une vraie différence. Merci à tous !
          </p>
          <a href="https://discord.gg/ez4dBTPE" target="_blank" rel="noopener noreferrer"
            className="btn btn-primary" style={{ fontSize: 14 }}
            onMouseEnter={() => play('hover')} onClick={() => play('click')}>
            Rejoindre l'aventure →
          </a>
        </div>
      </div>
    </section>
  )
}
