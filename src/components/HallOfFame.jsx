import { useInView } from '../hooks/useInView.js'

// Une couleur signature par légende (c = couleur structurelle pour bord/glow/hairline/prime).
// ??? = arc-en-ciel : flag `rainbow` → le dégradé animé est confiné au ring + hairline +
// filet sous la prime ; le TEXTE reste argent clair pour rester parfaitement lisible.
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

        /* dégradé arc-en-ciel commun, animé via background-position */
        .hof-rainbow-src { --rainbow: linear-gradient(110deg,#ff5d6c,#ff9f45,#ffe24d 32%,#4be08a 50%,#49c6ff 68%,#9b7bff 84%,#ff6fd6); }
        @keyframes hofRainbow { to { background-position: 220% 0; } }

        /* ---------- Surface translucide commune (laisse passer le fond One Piece) ---------- */
        .hof-surface {
          position: relative;
          border-radius: 18px;
          background:
            radial-gradient(120% 90% at 0% 0%, color-mix(in srgb, var(--c) 12%, transparent), transparent 58%),
            linear-gradient(180deg, rgba(17,18,26,.78), rgba(8,9,14,.85));
          -webkit-backdrop-filter: blur(13px) saturate(115%);
          backdrop-filter: blur(13px) saturate(115%);
          border: 1px solid color-mix(in srgb, var(--c) 26%, rgba(255,255,255,.05));
          box-shadow: 0 26px 60px -28px rgba(0,0,0,.85), inset 0 1px 0 rgba(255,255,255,.05);
          overflow: hidden;
          transition: transform .35s cubic-bezier(.22,1,.36,1), border-color .35s, box-shadow .35s;
        }
        .hof-surface:hover {
          border-color: color-mix(in srgb, var(--c) 60%, transparent);
          box-shadow: 0 34px 70px -26px color-mix(in srgb, var(--c) 40%, transparent), inset 0 1px 0 rgba(255,255,255,.07);
        }

        /* hairline supérieure = signature couleur (éditorial) */
        .hof-hairline { position: absolute; top: 0; left: 0; right: 0; height: 2px;
          background: linear-gradient(90deg, transparent, var(--c) 18%, var(--c) 82%, transparent); opacity: .9; }
        .rainbow .hof-hairline { background: var(--rainbow); background-size: 220% 100%; animation: hofRainbow 7s linear infinite; opacity: 1; }

        /* ring d'icône */
        .hof-ring { padding: 2px; border-radius: 50%; background: var(--c); flex-shrink: 0; box-shadow: 0 0 28px -6px var(--c); }
        .rainbow .hof-ring { background: var(--rainbow); background-size: 220% 100%; animation: hofRainbow 7s linear infinite; box-shadow: 0 0 30px -6px rgba(155,123,255,.75); }
        .hof-ring-in { border-radius: 50%; background: radial-gradient(120% 120% at 30% 25%, #1a1b25, #0d0e15); display: flex; align-items: center; justify-content: center; }

        /* typographie */
        .hof-name { font-family: var(--pirate); color: #f6f2e8; line-height: 1; }
        .hof-pseudo { color: var(--c); font-weight: 800; letter-spacing: .12em; text-transform: uppercase; }
        .hof-eyebrow { font-weight: 800; letter-spacing: .22em; text-transform: uppercase; color: color-mix(in srgb, var(--c) 78%, #f4f0e6); }
        .hof-prime { font-family: var(--pirate); color: var(--c); line-height: .9; letter-spacing: .01em;
          text-shadow: 0 2px 26px color-mix(in srgb, var(--c) 35%, transparent); }
        .hof-label { font-size: 9px; letter-spacing: .2em; text-transform: uppercase; color: rgba(244,240,230,.4); font-weight: 700; }

        /* ??? : on garde le texte argent clair, on n'applique le rainbow QU'au hairline/ring/filet */
        .rainbow .hof-pseudo { color: #cdd2e0; }
        .rainbow .hof-prime { color: #eef1f8; text-shadow: 0 2px 26px rgba(155,123,255,.4); }
        .rainbow .hof-eyebrow { color: #c9cedd; }
        .hof-rule { height: 2px; border-radius: 2px; background: var(--c); opacity: .65; }
        .rainbow .hof-rule { background: var(--rainbow); background-size: 220% 100%; animation: hofRainbow 7s linear infinite; opacity: 1; }

        /* ========================= BANNIÈRE BRAMS (pleine largeur, horizontale) ========================= */
        .hof-banner { display: flex; align-items: stretch; gap: 0; margin-bottom: 26px; }
        .hof-banner-id { flex: 1 1 auto; min-width: 0; display: flex; align-items: center; gap: 30px; padding: 30px 38px; }
        .hof-banner-prime {
          flex: 0 0 auto; display: flex; flex-direction: column; justify-content: center; gap: 14px;
          padding: 30px 42px; min-width: 340px;
          border-left: 1px solid color-mix(in srgb, var(--c) 22%, rgba(255,255,255,.06));
          background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--c) 7%, transparent));
        }
        .hof-banner-desc { color: rgba(244,240,230,.62); line-height: 1.65; font-size: 14px; margin: 12px 0 0; max-width: 460px; }

        /* ========================= RANGÉE DES 4 LÉGENDES ========================= */
        .hof-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 22px; }
        .hof-card-pad { padding: 26px 24px; display: flex; flex-direction: column; height: 100%; }
        .hof-card-desc { color: rgba(244,240,230,.55); line-height: 1.62; font-size: 12.5px; flex: 1; margin: 16px 0 20px; }
        .hof-foot { display: flex; align-items: flex-end; justify-content: space-between; gap: 12px; padding-top: 16px;
          border-top: 1px solid color-mix(in srgb, var(--c) 16%, rgba(255,255,255,.04)); }

        @media (max-width: 1024px) {
          .hof-row { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 760px) {
          .hof-banner { flex-direction: column; }
          .hof-banner-prime { min-width: 0; border-left: none; border-top: 1px solid color-mix(in srgb, var(--c) 22%, rgba(255,255,255,.06));
            background: linear-gradient(180deg, transparent, color-mix(in srgb, var(--c) 7%, transparent)); flex-direction: row; align-items: center; justify-content: space-between; }
        }
        @media (max-width: 600px) {
          .hof-row { grid-template-columns: 1fr; }
          .hof-shell { padding: 0 20px; }
          .hof-banner-id { flex-direction: column; align-items: flex-start; text-align: left; gap: 20px; padding: 26px 24px; }
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

        {/* ===== BANNIÈRE BRAMS — pleine largeur, éditoriale ===== */}
        <article
          className={`hof-surface hof-banner${featured.rainbow ? ' rainbow' : ''}`}
          style={{ '--c': featured.c }}
        >
          <div className="hof-hairline" />

          <div className="hof-banner-id">
            <div className="hof-ring">
              <div className="hof-ring-in" style={{ width: 92, height: 92, fontSize: 46 }}>{featured.icon}</div>
            </div>
            <div style={{ minWidth: 0 }}>
              <div className="hof-eyebrow" style={{ fontSize: 10, marginBottom: 12 }}>{featured.title}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, flexWrap: 'wrap' }}>
                <div className="hof-name" style={{ fontSize: 50 }}>{featured.name}</div>
                <div className="hof-pseudo" style={{ fontSize: 12 }}>🏴‍☠️ {featured.pseudo}</div>
              </div>
              <p className="hof-banner-desc">{featured.desc}</p>
            </div>
          </div>

          <div className="hof-banner-prime">
            <div>
              <div className="hof-label" style={{ marginBottom: 8 }}>Prime — Wanted</div>
              <div className="hof-prime" style={{ fontSize: 'clamp(26px, 3.2vw, 40px)' }}>{featured.prime}</div>
            </div>
            <div className="hof-rule" style={{ width: 54 }} />
            <div>
              <div className="hof-label" style={{ marginBottom: 5 }}>🍎 Fruit du Démon</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#f4f0e6' }}>{featured.fruit}</div>
            </div>
          </div>
        </article>

        {/* ===== LES 4 AUTRES LÉGENDES ===== */}
        <div className="hof-row">
          {rest.map((l, i) => (
            <article
              key={i}
              className={`hof-surface${l.rainbow ? ' rainbow hof-rainbow-src' : ''}`}
              style={{ '--c': l.c }}
            >
              <div className="hof-hairline" />
              <div className="hof-card-pad">
                <div style={{ display: 'flex', alignItems: 'center', gap: 13, marginBottom: 4 }}>
                  <div className="hof-ring">
                    <div className="hof-ring-in" style={{ width: 50, height: 50, fontSize: 25 }}>{l.icon}</div>
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div className="hof-name" style={{ fontSize: 26 }}>{l.name}</div>
                    <div className="hof-pseudo" style={{ fontSize: 9.5, marginTop: 5 }}>{l.pseudo}</div>
                  </div>
                </div>

                <div className="hof-eyebrow" style={{ fontSize: 8.5, marginTop: 18 }}>{l.title}</div>

                <p className="hof-card-desc">{l.desc}</p>

                <div>
                  <div className="hof-label" style={{ marginBottom: 7 }}>Prime</div>
                  <div className="hof-prime" style={{ fontSize: 'clamp(20px, 1.8vw, 26px)' }}>{l.prime}</div>
                  <div className="hof-rule" style={{ width: 40, margin: '12px 0 0' }} />
                </div>

                <div className="hof-foot">
                  <div>
                    <div className="hof-label" style={{ marginBottom: 4 }}>🍎 Fruit</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#f4f0e6' }}>{l.fruit}</div>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
