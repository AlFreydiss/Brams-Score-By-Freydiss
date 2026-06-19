import { useInView } from '../hooks/useInView.js'

const LEGENDS = [
  {
    name: 'Brams', pseudo: 'Le Fondateur', icon: '👑', color: '#d8bd7e',
    prime: '5 000 000 000 ฿',
    desc: 'Fondateur de Brams Community. Créateur du serveur, à l\'origine de toute l\'aventure One Piece francophone.',
    fruit: 'Fruit du Roi',
    title: 'ROI DES PIRATES',
  },
  {
    name: 'Freydiss', pseudo: 'L\'Architecte', icon: '⚙️', color: '#BFA46A',
    prime: '3 200 000 000 ฿',
    desc: 'Développeur et admin du bot Brams Score. Bâtisseur de l\'empire technologique de la communauté.',
    fruit: 'Fruit du Code',
    title: 'DÉVELOPPEUR EN CHEF',
  },
  {
    name: 'Benactief', pseudo: 'Le Fantôme', icon: '👻', color: '#BFA46A',
    prime: '2 100 000 000 ฿',
    desc: 'Maître du serveur dans l\'ombre. Sa présence vocale fait trembler les Yonkous.',
    fruit: 'Fruit de l\'Ombre',
    title: 'MAÎTRE DU SILENCE',
  },
  {
    name: 'Berat', pseudo: 'Le Stratège', icon: '🗺️', color: '#BFA46A',
    prime: '1 800 000 000 ฿',
    desc: 'Gestionnaire des événements. Chaque tournoi, chaque combat — c\'est son œuvre.',
    fruit: 'Fruit du Plan',
    title: 'MAÎTRE DES TOURNOIS',
  },
  {
    name: '???', pseudo: 'Le Prochain Roi ?', icon: '❓', color: '#9a8552',
    prime: '??? ฿',
    desc: 'Le prochain Roi des Pirates est peut-être toi. Rejoins le Grand Line et prouve ta valeur.',
    fruit: '???',
    title: 'À TOI DE JOUER',
  },
]

export default function HallOfFame() {
  const [ref, inView] = useInView()

  const featured = LEGENDS[0]
  const rest = LEGENDS.slice(1)

  return (
    <section
      id="hall-of-fame"
      ref={ref}
      style={{
        background: 'transparent',
        padding: '110px 0',
        position: 'relative',
        overflow: 'hidden',
        borderTop: '1px solid rgba(191,164,106,0.14)',
        borderBottom: '1px solid rgba(191,164,106,0.14)',
      }}
    >
      <style>{`
        .hof-shell { width: 100%; max-width: 1320px; margin: 0 auto; padding: 0 40px; }
        .hof-grid {
          display: grid;
          grid-template-columns: 1.35fr 1fr;
          gap: 22px;
          align-items: stretch;
        }
        .hof-sub-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 22px;
        }
        .hof-card {
          background: #10111a;
          border: 1px solid rgba(191,164,106,0.22);
          border-radius: 18px;
          overflow: hidden;
          position: relative;
          transition: border-color .25s ease, transform .25s ease;
        }
        .hof-card:hover { border-color: rgba(191,164,106,0.55); transform: translateY(-3px); }
        .hof-card.featured { grid-row: span 2; }
        @media (max-width: 1024px) {
          .hof-grid { grid-template-columns: 1fr; }
          .hof-card.featured { grid-row: auto; }
        }
        @media (max-width: 720px) {
          .hof-sub-grid { grid-template-columns: 1fr; }
          .hof-shell { padding: 0 20px; }
        }
      `}</style>

      <div className="hof-shell">
        <div className={`reveal ${inView ? 'visible' : ''}`} style={{ textAlign: 'center', marginBottom: 54 }}>
          <div className="label" style={{ color: '#BFA46A' }}>👑 Légendes</div>
          <h2 className="h2" style={{ textAlign: 'center', fontFamily: "'Clash Display','Syne',system-ui" }}>Hall of Fame</h2>
          <p className="sub" style={{ textAlign: 'center', margin: '0 auto', color: 'rgba(244,240,230,0.6)' }}>
            Les Rois des Pirates qui ont marqué Brams Community à jamais
          </p>
        </div>

        <div className="hof-grid">
          {/* Carte vedette */}
          <article className="hof-card featured" style={{ background: '#0d0e13', display: 'flex', flexDirection: 'column' }}>
            <div style={{ height: 3, background: `linear-gradient(90deg, transparent, ${featured.color}, transparent)` }} />
            <div style={{ padding: '40px 38px', display: 'flex', flexDirection: 'column', flex: 1 }}>
              <span style={{
                alignSelf: 'flex-start',
                fontSize: 10, fontWeight: 900, letterSpacing: '.18em',
                color: featured.color, border: `1px solid ${featured.color}55`,
                borderRadius: 4, padding: '5px 14px', marginBottom: 30,
              }}>{featured.title}</span>

              <div style={{ display: 'flex', alignItems: 'center', gap: 26, marginBottom: 26 }}>
                <div style={{
                  width: 108, height: 108, borderRadius: '50%', flexShrink: 0,
                  background: '#15161f',
                  border: `2px solid ${featured.color}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 54,
                }}>{featured.icon}</div>
                <div>
                  <div style={{ fontFamily: 'var(--pirate)', fontSize: 44, color: '#f4f0e6', lineHeight: 1 }}>{featured.name}</div>
                  <div style={{ fontSize: 12, color: featured.color, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', marginTop: 8 }}>
                    🏴‍☠️ {featured.pseudo}
                  </div>
                </div>
              </div>

              <p style={{ fontSize: 15, color: 'rgba(244,240,230,0.62)', lineHeight: 1.8, marginBottom: 28, flex: 1 }}>{featured.desc}</p>

              <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                <div style={{ background: '#15161f', border: `1px solid ${featured.color}33`, borderRadius: 10, padding: '10px 18px' }}>
                  <div style={{ fontSize: 9, color: 'rgba(244,240,230,0.4)', letterSpacing: '.12em', marginBottom: 3 }}>PRIME</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: featured.color, fontFamily: 'var(--pirate)' }}>{featured.prime}</div>
                </div>
                <div style={{ background: '#15161f', border: `1px solid ${featured.color}33`, borderRadius: 10, padding: '10px 18px' }}>
                  <div style={{ fontSize: 9, color: 'rgba(244,240,230,0.4)', letterSpacing: '.12em', marginBottom: 3 }}>🍎 FRUIT DU DÉMON</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#f4f0e6' }}>{featured.fruit}</div>
                </div>
              </div>
            </div>
          </article>

          {/* Les 4 autres légendes, plein cadre */}
          <div className="hof-sub-grid">
            {rest.map((l, i) => (
              <article key={i} className="hof-card" style={{ background: '#111319', display: 'flex', flexDirection: 'column' }}>
                <div style={{ height: 3, background: `linear-gradient(90deg, transparent, ${l.color}, transparent)` }} />
                <div style={{ padding: '24px 22px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
                    <div style={{
                      width: 56, height: 56, borderRadius: '50%', flexShrink: 0,
                      background: '#191b24',
                      border: `2px solid ${l.color}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28,
                    }}>{l.icon}</div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontFamily: 'var(--pirate)', fontSize: 24, color: '#f4f0e6', lineHeight: 1 }}>{l.name}</div>
                      <div style={{ fontSize: 10, color: l.color, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', marginTop: 5 }}>
                        {l.pseudo}
                      </div>
                    </div>
                  </div>

                  <div style={{
                    alignSelf: 'flex-start',
                    fontSize: 8.5, fontWeight: 900, letterSpacing: '.15em',
                    color: l.color, border: `1px solid ${l.color}45`,
                    borderRadius: 4, padding: '3px 9px', marginBottom: 14,
                  }}>{l.title}</div>

                  <p style={{ fontSize: 12.5, color: 'rgba(244,240,230,0.55)', lineHeight: 1.65, marginBottom: 18, flex: 1 }}>{l.desc}</p>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 10, paddingTop: 14, borderTop: '1px solid rgba(191,164,106,0.12)' }}>
                    <div>
                      <div style={{ fontSize: 8, color: 'rgba(244,240,230,0.38)', letterSpacing: '.12em', marginBottom: 2 }}>PRIME</div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: l.color, fontFamily: 'var(--pirate)' }}>{l.prime}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 8, color: 'rgba(244,240,230,0.38)', letterSpacing: '.1em', marginBottom: 2 }}>🍎 FRUIT</div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#f4f0e6' }}>{l.fruit}</div>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
