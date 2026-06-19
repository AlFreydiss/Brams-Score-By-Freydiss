import { useInView } from '../hooks/useInView.js'

// Une couleur signature par légende (c = couleur structurelle pour bord/glow/ombre).
// ??? = arc-en-ciel : flag `rainbow` → les accents visibles passent en dégradé.
const LEGENDS = [
  {
    name: 'Brams', pseudo: 'Le Fondateur', icon: '👑', c: '#f5c945',
    prime: '5 000 000 000 ฿',
    desc: 'Fondateur de Brams Community. Créateur du serveur, à l\'origine de toute l\'aventure One Piece francophone.',
    fruit: 'Fruit du Roi',
    title: 'ROI DES PIRATES',
  },
  {
    name: 'Freydiss', pseudo: 'L\'Architecte', icon: '⚙️', c: '#a674ff',
    prime: '3 200 000 000 ฿',
    desc: 'Développeur et admin du bot Brams Score. Bâtisseur de l\'empire technologique de la communauté.',
    fruit: 'Fruit du Code',
    title: 'DÉVELOPPEUR EN CHEF',
  },
  {
    name: 'Benactief', pseudo: 'Le Fantôme', icon: '👻', c: '#36d97c',
    prime: '2 100 000 000 ฿',
    desc: 'Maître du serveur dans l\'ombre. Sa présence vocale fait trembler les Yonkous.',
    fruit: 'Fruit de l\'Ombre',
    title: 'MAÎTRE DU SILENCE',
  },
  {
    name: 'Berat', pseudo: 'Le Stratège', icon: '🗺️', c: '#d4374f',
    prime: '1 800 000 000 ฿',
    desc: 'Gestionnaire des événements. Chaque tournoi, chaque combat — c\'est son œuvre.',
    fruit: 'Fruit du Plan',
    title: 'MAÎTRE DES TOURNOIS',
  },
  {
    name: '???', pseudo: 'Le Prochain Roi ?', icon: '❓', c: '#c77dff', rainbow: true,
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
        padding: '120px 0',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <style>{`
        .hof-shell { width: 100%; max-width: 1320px; margin: 0 auto; padding: 0 40px; position: relative; z-index: 1; }

        .hof-grid { display: grid; grid-template-columns: 1.32fr 1fr; gap: 24px; align-items: stretch; }
        .hof-sub-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }

        /* dégradé arc-en-ciel commun (réutilisé pour bar / ring / textes) */
        .hof-card { --rainbow: linear-gradient(105deg,#ff5d6c,#ff9f45,#ffe24d 38%,#4be08a 55%,#49c6ff 72%,#9b7bff 88%,#ff6fd6); }

        .hof-card {
          position: relative;
          border-radius: 20px;
          overflow: hidden;
          background:
            radial-gradient(120% 80% at 0% 0%, color-mix(in srgb, var(--c) 13%, transparent), transparent 60%),
            linear-gradient(180deg, rgba(18,19,27,.80), rgba(9,10,15,.86));
          -webkit-backdrop-filter: blur(11px);
          backdrop-filter: blur(11px);
          border: 1px solid color-mix(in srgb, var(--c) 34%, transparent);
          box-shadow: 0 22px 55px -26px rgba(0,0,0,.85), inset 0 1px 0 rgba(255,255,255,.05);
          transition: transform .3s cubic-bezier(.22,1,.36,1), border-color .3s, box-shadow .3s;
        }
        .hof-card:hover {
          transform: translateY(-6px);
          border-color: color-mix(in srgb, var(--c) 72%, transparent);
          box-shadow: 0 30px 65px -24px color-mix(in srgb, var(--c) 42%, transparent),
                      inset 0 1px 0 rgba(255,255,255,.07);
        }
        .hof-card.featured { grid-row: span 2; }

        /* halo coloré diffus en fond de carte */
        .hof-card::after {
          content: ''; position: absolute; inset: -1px; pointer-events: none; opacity: .5;
          background: radial-gradient(70% 50% at 80% 8%, color-mix(in srgb, var(--c) 22%, transparent), transparent 70%);
        }
        .hof-card.rainbow::after {
          opacity: .42;
          background: radial-gradient(80% 55% at 50% 0%, rgba(155,123,255,.22), rgba(73,198,255,.14) 45%, transparent 72%);
        }

        .hof-accent { height: 3px; background: linear-gradient(90deg, transparent, var(--c), transparent); }
        .rainbow .hof-accent { background: var(--rainbow); }

        .hof-ring { padding: 2px; border-radius: 50%; background: var(--c); flex-shrink: 0;
          box-shadow: 0 0 26px -4px var(--c); }
        .rainbow .hof-ring { background: var(--rainbow); box-shadow: 0 0 26px -4px rgba(155,123,255,.7); }
        .hof-ring-in { border-radius: 50%; background: #13141d; display: flex; align-items: center; justify-content: center; }

        .hof-pseudo { color: var(--c); font-weight: 800; letter-spacing: .12em; text-transform: uppercase; }
        .hof-title-pill {
          align-self: flex-start; font-weight: 900; letter-spacing: .16em;
          color: var(--c);
          border: 1px solid color-mix(in srgb, var(--c) 45%, transparent);
          background: color-mix(in srgb, var(--c) 9%, transparent);
          border-radius: 5px;
        }
        .hof-prime { color: var(--c); font-family: var(--pirate); font-weight: 800; }

        /* textes arc-en-ciel */
        .rainbow .hof-pseudo, .rainbow .hof-prime, .rainbow .hof-name {
          background: var(--rainbow); -webkit-background-clip: text; background-clip: text;
          -webkit-text-fill-color: transparent; color: transparent;
        }
        .rainbow .hof-title-pill {
          background: var(--rainbow); -webkit-background-clip: text; background-clip: text;
          -webkit-text-fill-color: transparent; color: transparent;
          border-color: rgba(255,255,255,.16);
        }

        .hof-name { font-family: var(--pirate); color: #f4f0e6; line-height: 1; }
        .hof-meta-box { background: rgba(255,255,255,.035); border: 1px solid color-mix(in srgb, var(--c) 26%, transparent); border-radius: 12px; }

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
        <div className={`reveal ${inView ? 'visible' : ''}`} style={{ textAlign: 'center', marginBottom: 58 }}>
          <div className="label" style={{ color: '#BFA46A' }}>👑 Légendes</div>
          <h2 className="h2" style={{ textAlign: 'center', fontFamily: "'Clash Display','Syne',system-ui" }}>Hall of Fame</h2>
          <p className="sub" style={{ textAlign: 'center', margin: '0 auto', color: 'rgba(244,240,230,0.6)' }}>
            Les Rois des Pirates qui ont marqué Brams Community à jamais
          </p>
        </div>

        <div className="hof-grid">
          {/* Carte vedette — Brams */}
          <article className={`hof-card featured${featured.rainbow ? ' rainbow' : ''}`} style={{ '--c': featured.c, display: 'flex', flexDirection: 'column' }}>
            <div className="hof-accent" />
            <div style={{ padding: '42px 40px', display: 'flex', flexDirection: 'column', flex: 1 }}>
              <span className="hof-title-pill" style={{ fontSize: 10.5, padding: '6px 15px', marginBottom: 32 }}>{featured.title}</span>

              <div style={{ display: 'flex', alignItems: 'center', gap: 26, marginBottom: 28 }}>
                <div className="hof-ring"><div className="hof-ring-in" style={{ width: 104, height: 104, fontSize: 52 }}>{featured.icon}</div></div>
                <div>
                  <div className="hof-name" style={{ fontSize: 46 }}>{featured.name}</div>
                  <div className="hof-pseudo" style={{ fontSize: 12.5, marginTop: 9 }}>🏴‍☠️ {featured.pseudo}</div>
                </div>
              </div>

              <p style={{ fontSize: 15, color: 'rgba(244,240,230,0.64)', lineHeight: 1.8, marginBottom: 30, flex: 1 }}>{featured.desc}</p>

              <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                <div className="hof-meta-box" style={{ '--c': featured.c, padding: '11px 19px' }}>
                  <div style={{ fontSize: 9, color: 'rgba(244,240,230,0.42)', letterSpacing: '.14em', marginBottom: 4 }}>PRIME</div>
                  <div className="hof-prime" style={{ fontSize: 17 }}>{featured.prime}</div>
                </div>
                <div className="hof-meta-box" style={{ '--c': featured.c, padding: '11px 19px' }}>
                  <div style={{ fontSize: 9, color: 'rgba(244,240,230,0.42)', letterSpacing: '.14em', marginBottom: 4 }}>🍎 FRUIT DU DÉMON</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#f4f0e6' }}>{featured.fruit}</div>
                </div>
              </div>
            </div>
          </article>

          {/* Les 4 autres légendes */}
          <div className="hof-sub-grid">
            {rest.map((l, i) => (
              <article key={i} className={`hof-card${l.rainbow ? ' rainbow' : ''}`} style={{ '--c': l.c, display: 'flex', flexDirection: 'column' }}>
                <div className="hof-accent" />
                <div style={{ padding: '24px 22px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
                    <div className="hof-ring"><div className="hof-ring-in" style={{ width: 54, height: 54, fontSize: 27 }}>{l.icon}</div></div>
                    <div style={{ minWidth: 0 }}>
                      <div className="hof-name" style={{ fontSize: 25 }}>{l.name}</div>
                      <div className="hof-pseudo" style={{ fontSize: 10, marginTop: 5 }}>{l.pseudo}</div>
                    </div>
                  </div>

                  <span className="hof-title-pill" style={{ fontSize: 8.5, padding: '4px 10px', marginBottom: 15 }}>{l.title}</span>

                  <p style={{ fontSize: 12.5, color: 'rgba(244,240,230,0.56)', lineHeight: 1.65, marginBottom: 18, flex: 1 }}>{l.desc}</p>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 10, paddingTop: 14, borderTop: '1px solid color-mix(in srgb, var(--c) 18%, transparent)' }}>
                    <div>
                      <div style={{ fontSize: 8, color: 'rgba(244,240,230,0.4)', letterSpacing: '.12em', marginBottom: 3 }}>PRIME</div>
                      <div className="hof-prime" style={{ fontSize: 13.5 }}>{l.prime}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 8, color: 'rgba(244,240,230,0.4)', letterSpacing: '.1em', marginBottom: 3 }}>🍎 FRUIT</div>
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
