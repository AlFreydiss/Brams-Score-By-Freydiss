import { useState } from 'react'
import { useInView } from '../hooks/useInView.js'

const CHAPTERS = [
  { num: 1127, title: 'L\'île des Géants', desc: 'L\'équipage du Chapeau de Paille approche d\'Elbaf. La silhouette colossale de l\'île se dessine à l\'horizon.', date: 'Jan 2025', emoji: '🏔️', key: 'Luffy, Shanks' },
  { num: 1128, title: 'Elbaf', desc: 'Premier contact avec les géants d\'Elbaf. Dorry et Brogy, les légendes de Little Garden, réapparaissent.', date: 'Jan 2025', emoji: '⚔️', key: 'Dorry, Brogy' },
  { num: 1129, title: 'Les Guerriers d\'Elbaf', desc: 'La hiérarchie des géants est révélée. L\'île cache des secrets liés aux Road Poneglyph.', date: 'Fév 2025', emoji: '🗡️', key: 'Géants, Poneglyph' },
  { num: 1130, title: 'L\'Armée des Géants', desc: 'La puissance d\'Elbaf se dévoile. Les Mugiwaras découvrent l\'ampleur de la société des géants.', date: 'Fév 2025', emoji: '🛡️', key: 'Elbaf' },
  { num: 1131, title: 'Le Roi des Géants', desc: 'Le souverain d\'Elbaf entre en scène. Sa relation avec Shanks est au cœur de l\'épisode.', date: 'Fév 2025', emoji: '👑', key: 'Shanks' },
  { num: 1132, title: 'Shanks', desc: 'Shanks et son équipage à Elbaf. Les révélations sur son passé et ses liens avec les géants.', date: 'Mar 2025', emoji: '🔴', key: 'Shanks, Red Hair Pirates' },
  { num: 1133, title: 'La Mémoire du Monde', desc: 'Des indices sur l\'histoire du monde cachés à Elbaf depuis des siècles sont mis au jour.', date: 'Mar 2025', emoji: '📜', key: 'Poneglyph, Histoire' },
  { num: 1134, title: 'Confrontation', desc: 'Tensions entre les factions présentes à Elbaf. Un affrontement devient inévitable.', date: 'Mar 2025', emoji: '💥', key: 'Mugiwaras' },
  { num: 1135, title: 'Le Pouvoir des Anciens', desc: 'Les secrets les plus profonds d\'Elbaf commencent à remonter à la surface.', date: 'Avr 2025', emoji: '🌊', key: 'Géants anciens' },
  { num: 1136, title: 'Alliances', desc: 'De nouvelles alliances se forment face à une menace commune qui pèse sur l\'île.', date: 'Avr 2025', emoji: '🤝', key: 'Luffy, géants' },
  { num: 1137, title: 'La Tempête', desc: 'Elbaf entre dans la tourmente. Luffy et ses alliés font face à une épreuve décisive.', date: 'Avr 2025', emoji: '⛈️', key: 'Luffy' },
  { num: 1138, title: 'Gear 5', desc: 'Luffy libère toute sa puissance. La transformation divine fait trembler Elbaf.', date: 'Mai 2025', emoji: '☀️', key: 'Luffy, Nika' },
  { num: 1139, title: 'Le Dernier Poneglyph', desc: 'La localisation du dernier Road Poneglyph se précise. One Piece est de plus en plus proche.', date: 'Mai 2025', emoji: '🗺️', key: 'Road Poneglyph' },
  { num: 1140, title: 'Vers le bout du monde', desc: 'L\'arc Elbaf touche à sa fin. L\'équipage repart avec des vérités qui changent tout.', date: 'Mai 2025', emoji: '🏴‍☠️', key: 'Mugiwaras' },
]

const ONGOING_CHAPTERS = [
  { num: 1141, title: '???', desc: 'En cours de publication...', date: 'Juin 2025', emoji: '⏳', key: '—' },
]

const ALL = [...CHAPTERS, ...ONGOING_CHAPTERS]

export default function Scans() {
  const [ref, inView] = useInView()
  const [hovered, setHovered] = useState(null)

  return (
    <section id="scans" style={{ padding: '110px 0', position: 'relative', overflow: 'hidden' }} ref={ref}>
      <div style={{ position: 'absolute', top: '30%', left: '-5%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(224,82,74,0.05) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '10%', right: '-5%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(155,89,182,0.05) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <div className="container">
        <div style={{ textAlign: 'center', marginBottom: 60 }}>
          <div className={`reveal ${inView ? 'visible' : ''}`}>
            <div className="label">📖 Manga</div>
            <h2 className="h2" style={{ textAlign: 'center' }}>Arc Elbaf</h2>
            <p className="sub" style={{ textAlign: 'center', margin: '0 auto 20px' }}>
              Tous les chapitres de l'arc Elbaf — Saga Finale de One Piece.
            </p>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.3)',
              borderRadius: 100, padding: '5px 14px',
              fontSize: 12, fontWeight: 700, color: '#34d399',
            }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#34d399', display: 'inline-block', animation: 'pulse 2s infinite' }} />
              Arc en cours
            </span>
          </div>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: 14,
        }}>
          {ALL.map((ch, i) => {
            const isOngoing = !CHAPTERS.find(c => c.num === ch.num)
            return (
              <div
                key={ch.num}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
                style={{
                  background: hovered === i ? 'rgba(30,32,36,0.98)' : 'rgba(20,21,24,0.7)',
                  border: `1px solid ${hovered === i ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.06)'}`,
                  borderRadius: 14,
                  padding: '18px 20px',
                  transition: 'all 0.22s ease',
                  transform: hovered === i ? 'translateY(-3px)' : 'none',
                  boxShadow: hovered === i ? '0 12px 32px rgba(0,0,0,0.3)' : 'none',
                  cursor: 'default',
                  animation: `fadeUp 0.5s ${Math.min(i, 8) * 0.04}s ease-out both`,
                  opacity: isOngoing ? 0.6 : 1,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 24 }}>{ch.emoji}</span>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.08em' }}>
                        CHAPITRE {ch.num}
                      </div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', lineHeight: 1.3 }}>
                        {ch.title}
                      </div>
                    </div>
                  </div>
                  <span style={{ fontSize: 10, color: 'var(--muted)', flexShrink: 0, marginTop: 2 }}>{ch.date}</span>
                </div>

                <p style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.55)', lineHeight: 1.65, marginBottom: 12 }}>
                  {ch.desc}
                </p>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{
                    fontSize: 10, padding: '2px 9px', borderRadius: 20, fontWeight: 600,
                    background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.35)',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}>
                    {ch.key}
                  </span>
                  {isOngoing ? (
                    <span style={{ fontSize: 10, color: '#34d399', fontWeight: 700 }}>En cours…</span>
                  ) : (
                    <a
                      href="https://mangaplus.shueisha.co.jp/titles/100020"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        fontSize: 11, fontWeight: 700, color: 'var(--accent)',
                        display: 'flex', alignItems: 'center', gap: 4,
                        textDecoration: 'none',
                        opacity: hovered === i ? 1 : 0.6,
                        transition: 'opacity 0.2s',
                      }}
                    >
                      Lire →
                    </a>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        <p style={{ textAlign: 'center', marginTop: 36, fontSize: 12, color: 'var(--muted)' }}>
          Lecture officielle sur <a href="https://mangaplus.shueisha.co.jp/titles/100020" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>MangaPlus</a> · Arc mis à jour au fil des sorties
        </p>
      </div>
    </section>
  )
}
