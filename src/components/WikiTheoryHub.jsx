import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import WikiHome from './WikiHome.jsx'
import TheoriesHome from './TheoriesHome.jsx'

const GOLD   = '#b08a3a'
const VIOLET = '#6d5f8f'
const BLUE   = '#587084'
const BROWN  = '#7b3f45'

const TABS = [
  { id: 'wiki',     label: 'Wiki',     icon: '📖', color: GOLD  },
  { id: 'theories', label: 'Théories', icon: '🔮', color: BROWN },
  { id: 'upcoming', label: 'À venir',  icon: '🚀', color: BLUE  },
]

const UPCOMING = [
  { icon: '🎵', title: 'Blind Tests musicaux',       desc: 'Testez votre connaissance des OST One Piece et autres mangas en direct dans le salon vocal.', status: 'dev',     color: VIOLET },
  { icon: '🗳️', title: 'Débats communautaires',      desc: 'Votez et débattez en temps réel sur les grandes questions du lore One Piece.',                status: 'planned', color: BLUE },
  { icon: '📊', title: 'Sondages lore',               desc: 'Participez à des sondages hebdomadaires sur les théories en cours dans le manga.',             status: 'planned', color: '#5f7484' },
  { icon: '🏆', title: 'Quiz Wiki',                   desc: 'Des quiz basés sur les articles du wiki pour tester vos connaissances.',                        status: 'planned', color: GOLD      },
  { icon: '🎙️', title: 'Sessions lore vocales',      desc: 'Sessions vocales dédiées aux analyses, débats et théories avec la communauté.',                 status: 'planned', color: BROWN },
  { icon: '🔗', title: 'Liens Wiki ↔ Théories',      desc: 'Références croisées automatiques entre articles de lore et théories communautaires.',            status: 'planned', color: '#5f766a' },
]

const STATUS_STYLE = {
  dev:     { label: '🔄 En cours', color: GOLD, bg: 'rgba(176,138,58,0.12)', border: 'rgba(176,138,58,0.28)' },
  planned: { label: '📅 Prévu',   color: BLUE, bg: 'rgba(88,112,132,0.10)', border: 'rgba(88,112,132,0.22)' },
}


function UpcomingTab() {
  return (
    <div style={{ padding: '60px 20px 100px' }}>
      <div style={{ maxWidth: 860, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.28em', color: BROWN, textTransform: 'uppercase', marginBottom: 12 }}>
            Développement actif
          </div>
          <h2 style={{
            fontFamily: 'var(--display)', fontWeight: 900,
            fontSize: 'clamp(28px,5vw,46px)',
          color: '#f4f1ec', margin: '0 0 12px',
          }}>
            Bientôt dans Brams
          </h2>
          <p style={{ fontSize: 14, color: 'rgba(236,229,220,0.44)', maxWidth: 440, margin: '0 auto', lineHeight: 1.7 }}>
            Fonctionnalités en développement ou planifiées pour les prochaines semaines.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
          {UPCOMING.map((item, i) => {
            const s = STATUS_STYLE[item.status]
            return (
              <div key={i} style={{
                background: `linear-gradient(145deg, ${item.color}0d 0%, rgba(14,14,16,0.92) 100%)`,
                border: `1px solid ${item.color}20`,
                borderRadius: 14, padding: '20px 22px',
                animation: `wthFadeUp 0.4s ${i * 0.06}s ease-out both`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <span style={{ fontSize: 24 }}>{item.icon}</span>
                  <span style={{ fontWeight: 800, fontSize: 14, color: '#fff', flex: 1, lineHeight: 1.2 }}>{item.title}</span>
                  <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 8px', borderRadius: 10, background: s.bg, color: s.color, border: `1px solid ${s.border}`, whiteSpace: 'nowrap', flexShrink: 0 }}>
                    {s.label}
                  </span>
                </div>
                <p style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.42)', margin: 0, lineHeight: 1.65 }}>{item.desc}</p>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default function WikiTheoryHub() {
  const { pathname } = useLocation()
  const [activeTab, setActiveTab] = useState(() =>
    pathname.startsWith('/theories') ? 'theories' : 'wiki'
  )

  const activeColor = TABS.find(t => t.id === activeTab)?.color ?? GOLD

  return (
    <div style={{ minHeight: '100vh' }}>
      <style>{`
        @keyframes wthFadeUp { from { opacity:0; transform:translateY(18px) } to { opacity:1; transform:none } }
      `}</style>

      {/* ── Hub header ── */}
      <div style={{ padding: '72px 20px 0', textAlign: 'center' }}>
        <div style={{
          fontSize: 10, fontWeight: 800, letterSpacing: '.3em',
          color: GOLD, textTransform: 'uppercase', marginBottom: 14,
        }}>
          Brams Community • Espace Savoir
        </div>
        <h1 style={{
          fontFamily: 'var(--display)', fontWeight: 900,
          fontSize: 'clamp(38px,7vw,72px)',
          color: '#fff', margin: '0 0 14px', lineHeight: 1,
          letterSpacing: '-0.02em',
        }}>
          Wiki &amp; Théories
        </h1>
        <p style={{
          fontSize: 15, color: 'rgba(255,255,255,0.40)',
          maxWidth: 520, margin: '0 auto 32px', lineHeight: 1.7,
        }}>
          Explore le lore, les théories, les mystères et les analyses de la communauté.
        </p>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap', paddingBottom: 0 }}>
          {TABS.map(tab => {
            const active = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 7,
                  padding: '10px 20px', borderRadius: 100,
                  border: `1px solid ${active ? `${tab.color}55` : 'rgba(255,255,255,0.09)'}`,
                  background: active ? `${tab.color}16` : 'rgba(255,255,255,0.03)',
                  color: active ? tab.color : 'rgba(236,229,220,0.44)',
                  fontSize: 13, fontWeight: 700, cursor: 'pointer',
                  transition: 'all .18s',
                  boxShadow: active ? `0 0 20px ${tab.color}18` : 'none',
                }}
                onMouseEnter={e => { if (!active) { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)'; e.currentTarget.style.color = 'rgba(244,241,236,0.74)' } }}
                onMouseLeave={e => { if (!active) { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.09)'; e.currentTarget.style.color = 'rgba(236,229,220,0.44)' } }}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            )
          })}
        </div>

        {/* Tab separator */}
        <div style={{ height: 1, maxWidth: 640, margin: '28px auto 0', background: `linear-gradient(90deg, transparent, ${activeColor}35, transparent)`, transition: 'background 0.4s' }} />
      </div>

      {/* ── Content ── */}
      <div>
        {activeTab === 'wiki'     && <WikiHome />}
        {activeTab === 'theories' && <TheoriesHome />}
        {activeTab === 'upcoming' && <UpcomingTab />}
      </div>
    </div>
  )
}
