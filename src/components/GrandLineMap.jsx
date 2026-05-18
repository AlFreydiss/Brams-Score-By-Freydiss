import { useState } from 'react'

const ZONES = [
  {
    id: 'east-blue',
    name: 'East Blue',
    rank: 'Pirate',
    color: '#4a9eff',
    hours: '10h+',
    desc: 'Point de départ de tous les grands pirates. Luffy y a commencé son aventure.',
    emoji: '🌊',
    top: [{ name: 'Rookie_01', h: 18 }, { name: 'Newbie_X', h: 14 }, { name: 'FreshMate', h: 11 }],
    path: 'M 80 280 C 80 200, 160 150, 200 200 C 230 240, 250 290, 220 330 C 190 370, 130 370, 100 340 Z',
    labelX: 155, labelY: 280,
  },
  {
    id: 'paradise',
    name: 'Paradise',
    rank: 'Shichibukai',
    color: '#9b59b6',
    hours: '25h+',
    desc: 'Première moitié du Grand Line. Fishman Island, Alabasta, Skypiea... Dangereux.',
    emoji: '⚔️',
    top: [{ name: 'SeaWarrior', h: 38 }, { name: 'CrimsonBlade', h: 32 }, { name: 'TempestRider', h: 26 }],
    path: 'M 240 180 C 280 120, 380 110, 420 170 C 450 220, 440 290, 400 310 C 360 330, 290 310, 260 270 Z',
    labelX: 345, labelY: 225,
  },
  {
    id: 'marineford',
    name: 'Marineford',
    rank: 'Amiral',
    color: '#e0524a',
    hours: '40h+',
    desc: 'Siège de la Marine. Seulement les plus puissants osent s\'en approcher.',
    emoji: '⚓',
    top: [{ name: 'AdmiralSword', h: 65 }, { name: 'IronFist', h: 58 }, { name: 'GhostFleet', h: 44 }],
    path: 'M 420 250 C 460 200, 540 210, 560 260 C 575 300, 555 350, 510 360 C 465 370, 430 340, 420 300 Z',
    labelX: 492, labelY: 288,
  },
  {
    id: 'new-world',
    name: 'Nouveau Monde',
    rank: 'Yonkou',
    color: '#fdcb6e',
    hours: '70h+',
    desc: 'Territoire des Yonkou. Chaque île est un défi mortel. Seuls les élites survivent.',
    emoji: '🌋',
    top: [{ name: 'YonkouKing', h: 142 }, { name: 'DragonRage', h: 118 }, { name: 'TitanForce', h: 95 }],
    path: 'M 260 360 C 290 310, 400 320, 500 380 C 550 420, 540 490, 480 510 C 400 535, 290 510, 250 460 Z',
    labelX: 390, labelY: 430,
  },
  {
    id: 'raftel',
    name: 'Laugh Tale',
    rank: 'Roi des Pirates',
    color: '#ffd700',
    hours: '150h+',
    desc: 'L\'île au trésor de Joy Boy. Le One Piece s\'y trouve. Seuls les élus y arrivent.',
    emoji: '👑',
    top: [{ name: 'BouleDogg', h: 280 }, { name: 'Freydiss', h: 210 }, { name: 'LegendKing', h: 175 }],
    path: 'M 580 160 C 610 120, 680 130, 700 170 C 720 210, 700 260, 660 270 C 620 280, 580 250, 570 210 Z',
    labelX: 641, labelY: 200,
  },
]

export default function GrandLineMap() {
  const [activeZone, setActiveZone] = useState(null)
  const zone = ZONES.find(z => z.id === activeZone)

  return (
    <section id="map" style={{ padding: '110px 0', position: 'relative' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 60% 50%, rgba(74,158,255,0.04) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <div className="container">
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <div className="label">🗺️ Grand Line</div>
          <h2 className="h2" style={{ textAlign: 'center' }}>Carte du Grand Line</h2>
          <p className="sub" style={{ textAlign: 'center', margin: '0 auto' }}>Chaque zone correspond à un rang. Clique pour voir les membres qui y règnent.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 32, alignItems: 'start', maxWidth: 900, margin: '0 auto' }}>
          {/* SVG Map */}
          <div style={{ position: 'relative' }}>
            <svg viewBox="0 0 780 570" style={{ width: '100%', filter: 'drop-shadow(0 20px 60px rgba(0,0,0,0.4))' }}>
              {/* Fond océan */}
              <defs>
                <radialGradient id="ocean" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#0a1628" />
                  <stop offset="100%" stopColor="#050d1a" />
                </radialGradient>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
              </defs>

              <rect width="780" height="570" fill="url(#ocean)" rx="16" />

              {/* Vagues stylisées */}
              {[...Array(8)].map((_, i) => (
                <line key={i} x1="0" y1={60 + i * 64} x2="780" y2={60 + i * 64}
                  stroke="rgba(74,158,255,0.04)" strokeWidth="1" />
              ))}

              {/* "Red Line" — ligne horizontale centrale */}
              <line x1="0" y1="285" x2="780" y2="285" stroke="rgba(224,82,74,0.25)" strokeWidth="2" strokeDasharray="8,6" />
              <text x="780" y="280" textAnchor="end" fill="rgba(224,82,74,0.5)" fontSize="10" fontStyle="italic">Red Line</text>

              {ZONES.map(z => (
                <g key={z.id} style={{ cursor: 'pointer' }} onClick={() => setActiveZone(z.id === activeZone ? null : z.id)}>
                  <path
                    d={z.path}
                    fill={activeZone === z.id ? z.color + '45' : z.color + '22'}
                    stroke={z.color}
                    strokeWidth={activeZone === z.id ? 2.5 : 1.5}
                    style={{ transition: 'all 0.25s ease', filter: activeZone === z.id ? `drop-shadow(0 0 12px ${z.color})` : 'none' }}
                  />
                  <text x={z.labelX} y={z.labelY - 8} textAnchor="middle" fill={z.color} fontSize="11" fontWeight="700" fontFamily="sans-serif">{z.emoji}</text>
                  <text x={z.labelX} y={z.labelY + 8} textAnchor="middle" fill="#fff" fontSize="9.5" fontFamily="sans-serif" opacity="0.9">{z.name}</text>
                  <text x={z.labelX} y={z.labelY + 22} textAnchor="middle" fill={z.color} fontSize="8" fontFamily="sans-serif" opacity="0.7">{z.hours}</text>
                </g>
              ))}

              {/* Boussole décorative */}
              <g transform="translate(40, 490)">
                <circle cx="0" cy="0" r="24" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
                <text x="0" y="-8" textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="8">N</text>
                <text x="0" y="16" textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="8">S</text>
                <text x="-14" y="4" textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="8">O</text>
                <text x="14" y="4" textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="8">E</text>
                <line x1="0" y1="-18" x2="0" y2="-6" stroke="var(--accent)" strokeWidth="1.5" />
                <line x1="0" y1="6" x2="0" y2="18" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
              </g>
            </svg>
          </div>

          {/* Panel info */}
          <div style={{ minWidth: 220, maxWidth: 260 }}>
            {zone ? (
              <div key={zone.id} style={{
                background: `linear-gradient(135deg, rgba(30,32,36,0.98), ${zone.color}12)`,
                border: `1px solid ${zone.color}40`, borderRadius: 16,
                padding: '24px 20px', animation: 'scaleIn 0.25s ease-out',
              }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>{zone.emoji}</div>
                <div style={{ fontWeight: 800, fontSize: 17, color: '#fff', marginBottom: 4 }}>{zone.name}</div>
                <div style={{
                  display: 'inline-block', fontSize: 11, padding: '3px 10px', borderRadius: 20,
                  background: zone.color + '20', color: zone.color, fontWeight: 700,
                  border: `1px solid ${zone.color}40`, marginBottom: 14,
                }}>{zone.rank} · {zone.hours}</div>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6, marginBottom: 18 }}>{zone.desc}</p>

                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>Top membres</div>
                {zone.top.map((m, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '8px 0', borderBottom: i < 2 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 14 }}>{['🥇', '🥈', '🥉'][i]}</span>
                      <span style={{ fontSize: 13, color: '#fff', fontWeight: 600 }}>{m.name}</span>
                    </div>
                    <span style={{ fontSize: 12, color: zone.color, fontWeight: 700 }}>{m.h}h</span>
                  </div>
                ))}

                <button onClick={() => setActiveZone(null)} style={{
                  marginTop: 16, width: '100%', padding: '8px', borderRadius: 8,
                  background: 'transparent', border: '1px solid rgba(255,255,255,0.1)',
                  color: 'var(--muted)', cursor: 'pointer', fontSize: 12, fontFamily: 'var(--body)',
                }}>✕ Fermer</button>
              </div>
            ) : (
              <div style={{
                background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16,
                padding: '24px 20px',
              }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>🗺️</div>
                <div style={{ fontWeight: 700, fontSize: 15, color: '#fff', marginBottom: 8 }}>Explore le Grand Line</div>
                <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.7 }}>Clique sur une zone de la carte pour voir le rang correspondant et ses meilleurs membres.</p>
                <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {ZONES.map(z => (
                    <div key={z.id} onClick={() => setActiveZone(z.id)} style={{
                      display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
                      padding: '6px 10px', borderRadius: 8,
                      transition: 'background 0.15s',
                    }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: z.color, flexShrink: 0 }} />
                      <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>{z.name}</span>
                      <span style={{ fontSize: 11, color: z.color, marginLeft: 'auto' }}>{z.hours}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
