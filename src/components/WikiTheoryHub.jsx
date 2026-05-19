import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import WikiHome from './WikiHome.jsx'
import TheoriesHome from './TheoriesHome.jsx'

const GOLD   = '#d4a017'
const VIOLET = '#a29bfe'
const BLUE   = '#74b9ff'

const TABS = [
  { id: 'wiki',     label: 'Wiki',     icon: '📖', color: GOLD        },
  { id: 'theories', label: 'Théories', icon: '🔮', color: VIOLET      },
  { id: 'upcoming', label: 'À venir',  icon: '🚀', color: '#34d399'   },
]

const UPCOMING = [
  { icon: '🎵', title: 'Blind Tests musicaux',       desc: 'Testez votre connaissance des OST One Piece et autres mangas en direct dans le salon vocal.', status: 'dev',     color: VIOLET },
  { icon: '🗳️', title: 'Débats communautaires',      desc: 'Votez et débattez en temps réel sur les grandes questions du lore One Piece.',                status: 'planned', color: '#5865f2' },
  { icon: '📊', title: 'Sondages lore',               desc: 'Participez à des sondages hebdomadaires sur les théories en cours dans le manga.',             status: 'planned', color: '#06b6d4' },
  { icon: '🏆', title: 'Quiz Wiki',                   desc: 'Des quiz basés sur les articles du wiki pour tester vos connaissances.',                        status: 'planned', color: GOLD      },
  { icon: '🎙️', title: 'Sessions lore vocales',      desc: 'Sessions vocales dédiées aux analyses, débats et théories avec la communauté.',                 status: 'planned', color: '#e0524a' },
  { icon: '🔗', title: 'Liens Wiki ↔ Théories',      desc: 'Références croisées automatiques entre articles de lore et théories communautaires.',            status: 'planned', color: '#34d399' },
]

const STATUS_STYLE = {
  dev:     { label: '🔄 En cours', color: '#fdcb6e', bg: 'rgba(253,203,110,0.12)', border: 'rgba(253,203,110,0.28)' },
  planned: { label: '📅 Prévu',   color: BLUE,      bg: 'rgba(116,185,255,0.08)', border: 'rgba(116,185,255,0.20)' },
}

function BlindTestBanner({ onClick, active }) {
  return (
    <div style={{ maxWidth:900, margin:'0 auto 28px', padding:'0 20px' }}>
      <div
        onClick={onClick}
        style={{
          display:'flex', alignItems:'center', gap:18, padding:'16px 22px',
          background: active
            ? 'linear-gradient(135deg, rgba(74,85,255,0.18), rgba(162,155,254,0.12))'
            : 'linear-gradient(135deg, rgba(74,85,255,0.10), rgba(162,155,254,0.06))',
          border:`1px solid ${active ? 'rgba(162,155,254,0.45)' : 'rgba(162,155,254,0.18)'}`,
          borderLeft:`3px solid ${VIOLET}`,
          borderRadius:12,
          cursor:'pointer',
          transition:'all .22s',
          boxShadow: active ? `0 0 24px rgba(162,155,254,0.14)` : 'none',
        }}
        onMouseEnter={e => { if (!active) e.currentTarget.style.borderColor='rgba(162,155,254,0.35)' }}
        onMouseLeave={e => { if (!active) e.currentTarget.style.borderColor='rgba(162,155,254,0.18)' }}
      >
        <div style={{ fontSize:30, filter:`drop-shadow(0 0 12px ${VIOLET}66)`, flexShrink:0 }}>🎵</div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:9, fontWeight:800, letterSpacing:'.22em', color:VIOLET, textTransform:'uppercase', marginBottom:3 }}>
            Bientôt disponible
          </div>
          <div style={{ fontSize:14, fontWeight:800, color:'#fff', marginBottom:2 }}>
            Blind Tests musicaux
          </div>
          <div style={{ fontSize:12, color:'rgba(255,255,255,0.38)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
            Sessions OST One Piece &amp; mangas — testez vos connaissances musicales en vocal
          </div>
        </div>
        <div style={{
          display:'flex', alignItems:'center', gap:6, padding:'7px 16px', flexShrink:0,
          background:'rgba(162,155,254,0.10)',
          border:`1px solid ${VIOLET}45`,
          borderRadius:8, color:VIOLET,
          fontSize:12, fontWeight:700, whiteSpace:'nowrap',
          transition:'all .18s',
        }}>
          Jouer →
        </div>
      </div>
    </div>
  )
}

function BlindTestsTab() {
  return (
    <div style={{ padding: '80px 20px 120px', textAlign: 'center' }}>
      <div style={{ maxWidth: 560, margin: '0 auto' }}>
        <div style={{ fontSize: 72, marginBottom: 24, filter: `drop-shadow(0 0 28px ${VIOLET}66)` }}>🎵</div>
        <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.3em', color: VIOLET, textTransform: 'uppercase', marginBottom: 12 }}>
          Bientôt disponible
        </div>
        <h2 style={{
          fontFamily: 'var(--display)', fontWeight: 900,
          fontSize: 'clamp(34px,6vw,56px)',
          color: '#fff', margin: '0 0 18px', lineHeight: 1.1,
        }}>
          Blind Tests
        </h2>
        <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.42)', lineHeight: 1.8, maxWidth: 440, margin: '0 auto 40px' }}>
          Les blind tests arrivent bientôt.<br />
          De nouveaux modes communautaires seront ajoutés progressivement pour tester vos connaissances musicales.
        </p>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 9,
          padding: '11px 22px', borderRadius: 100,
          background: 'rgba(162,155,254,0.10)', border: '1px solid rgba(162,155,254,0.28)',
          color: VIOLET, fontSize: 13, fontWeight: 700,
        }}>
          🔔 Notifications à venir dans le Discord
        </div>
      </div>
    </div>
  )
}

function UpcomingTab() {
  return (
    <div style={{ padding: '60px 20px 100px' }}>
      <div style={{ maxWidth: 860, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.28em', color: GOLD, textTransform: 'uppercase', marginBottom: 12 }}>
            Développement actif
          </div>
          <h2 style={{
            fontFamily: 'var(--display)', fontWeight: 900,
            fontSize: 'clamp(28px,5vw,46px)',
            color: '#fff', margin: '0 0 12px',
          }}>
            Bientôt dans Brams
          </h2>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.35)', maxWidth: 440, margin: '0 auto', lineHeight: 1.7 }}>
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
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState(() =>
    pathname.startsWith('/theories') ? 'theories' : 'wiki'
  )
  const [showBlindTests, setShowBlindTests] = useState(false)

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

        {/* Blind Tests banner — séparé, en vedette */}
        <BlindTestBanner onClick={() => navigate('/blind-test')} active={false} />

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap', paddingBottom: 0 }}>
          {TABS.map(tab => {
            const active = activeTab === tab.id && !showBlindTests
            return (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setShowBlindTests(false) }}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 7,
                  padding: '10px 20px', borderRadius: 100,
                  border: `1px solid ${active ? `${tab.color}55` : 'rgba(255,255,255,0.09)'}`,
                  background: active ? `${tab.color}14` : 'rgba(255,255,255,0.03)',
                  color: active ? tab.color : 'rgba(255,255,255,0.40)',
                  fontSize: 13, fontWeight: 700, cursor: 'pointer',
                  transition: 'all .18s',
                  boxShadow: active ? `0 0 20px ${tab.color}18` : 'none',
                }}
                onMouseEnter={e => { if (!active) { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)'; e.currentTarget.style.color = 'rgba(255,255,255,0.72)' } }}
                onMouseLeave={e => { if (!active) { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.09)'; e.currentTarget.style.color = 'rgba(255,255,255,0.40)' } }}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            )
          })}
        </div>

        {/* Tab separator */}
        <div style={{ height: 1, maxWidth: 640, margin: '28px auto 0', background: `linear-gradient(90deg, transparent, ${showBlindTests ? VIOLET : activeColor}35, transparent)`, transition: 'background 0.4s' }} />
      </div>

      {/* ── Content ── */}
      <div>
        {showBlindTests ? (
          <BlindTestsTab />
        ) : (
          <>
            {activeTab === 'wiki'     && <WikiHome />}
            {activeTab === 'theories' && <TheoriesHome />}
            {activeTab === 'upcoming' && <UpcomingTab />}
          </>
        )}
      </div>
    </div>
  )
}
