import { useState, useEffect, useRef } from 'react'
import {
  CINE, GOLD_GRAD, CineStyles, Reveal, CineSection, SectionHead,
} from './home/cine.jsx'

const LEGENDS = [
  {
    name: 'Brams', pseudo: 'Le Fondateur', icon: '👑',
    prime: '5 000 000 000 ฿',
    desc: 'Fondateur de Brams Community. Créateur du serveur, à l\'origine de toute l\'aventure One Piece francophone.',
    fruit: 'Fruit du Roi',
    title: 'ROI DES PIRATES',
  },
  {
    name: 'Freydiss', pseudo: 'L\'Architecte', icon: '⚙️',
    prime: '3 200 000 000 ฿',
    desc: 'Développeur et admin du bot Brams Score. Bâtisseur de l\'empire technologique de la communauté.',
    fruit: 'Fruit du Code',
    title: 'DÉVELOPPEUR EN CHEF',
  },
  {
    name: 'Benactief', pseudo: 'Le Fantôme', icon: '👻',
    prime: '2 100 000 000 ฿',
    desc: 'Maître du serveur dans l\'ombre. Sa présence vocale fait trembler les Yonkous.',
    fruit: 'Fruit de l\'Ombre',
    title: 'MAÎTRE DU SILENCE',
  },
  {
    name: 'Berat', pseudo: 'Le Stratège', icon: '🗺️',
    prime: '1 800 000 000 ฿',
    desc: 'Gestionnaire des événements. Chaque tournoi, chaque combat — c\'est son œuvre.',
    fruit: 'Fruit du Plan',
    title: 'MAÎTRE DES TOURNOIS',
  },
  {
    name: '???', pseudo: 'Le Prochain Roi ?', icon: '❓',
    prime: '??? ฿',
    desc: 'Le prochain Roi des Pirates est peut-être toi. Rejoins le Grand Line et prouve ta valeur.',
    fruit: '???',
    title: 'À TOI DE JOUER',
  },
]

// ── Carte « trône » : la légende mise en avant, encadrement or raffiné. ──────────
function ThroneCard({ legend, animating }) {
  return (
    <div style={{
      opacity: animating ? 0 : 1,
      transform: animating ? 'scale(0.985) translateY(10px)' : 'scale(1) translateY(0)',
      transition: 'opacity .35s cubic-bezier(.22,1,.36,1), transform .35s cubic-bezier(.22,1,.36,1)',
      position: 'relative', borderRadius: 22, overflow: 'hidden',
      background: `linear-gradient(150deg, ${CINE.panel2}, rgba(191,164,106,0.05))`,
      border: `1px solid ${CINE.goldDim}`,
      boxShadow: '0 28px 80px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.05)',
    }}>
      {/* filet or supérieur */}
      <div aria-hidden style={{ height: 2, background: `linear-gradient(90deg, transparent, ${CINE.gold}, transparent)` }} />

      <div style={{ padding: 'clamp(28px, 4vw, 48px)' }}>
        <span style={{
          display: 'inline-block', fontFamily: CINE.title, fontSize: 11, fontWeight: 700,
          letterSpacing: '.2em', textTransform: 'uppercase', color: CINE.gold,
          background: 'rgba(191,164,106,0.1)', border: `1px solid ${CINE.goldDim}`,
          borderRadius: 999, padding: '6px 16px', marginBottom: 28,
        }}>★ {legend.title}</span>

        <div style={{
          display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 'clamp(24px, 4vw, 44px)',
          alignItems: 'center',
        }}>
          {/* Avatar + prime */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            <div style={{
              width: 'clamp(110px, 14vw, 150px)', height: 'clamp(110px, 14vw, 150px)', borderRadius: '50%',
              background: 'radial-gradient(circle at 35% 30%, rgba(216,189,126,0.22), rgba(0,0,0,0.4))',
              border: `2px solid ${CINE.gold}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 'clamp(48px, 7vw, 70px)',
              boxShadow: '0 0 0 6px rgba(191,164,106,0.08), inset 0 2px 10px rgba(0,0,0,0.4)',
            }}>{legend.icon}</div>

            <div style={{
              background: 'rgba(0,0,0,0.35)', border: `1px solid ${CINE.hair}`,
              borderRadius: 10, padding: '8px 18px', textAlign: 'center', minWidth: 130,
            }}>
              <div style={{ fontSize: 9, color: CINE.faint, letterSpacing: '.14em', marginBottom: 3 }}>PRIME</div>
              <div style={{ fontFamily: 'var(--pirate)', fontSize: 15, fontWeight: 800, color: CINE.goldHi }}>{legend.prime}</div>
            </div>
          </div>

          {/* Identité */}
          <div>
            <div style={{ fontFamily: 'var(--pirate)', fontSize: 'clamp(34px, 5vw, 54px)', color: CINE.ink, lineHeight: 1, marginBottom: 8 }}>{legend.name}</div>
            <div style={{ fontFamily: CINE.title, fontSize: 12, color: CINE.gold, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', marginBottom: 18 }}>
              🏴‍☠️ {legend.pseudo}
            </div>
            <p style={{ fontFamily: CINE.body, fontSize: 'clamp(14px, 1.4vw, 16px)', color: CINE.inkSoft, lineHeight: 1.75, marginBottom: 22, maxWidth: 520 }}>{legend.desc}</p>

            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 10,
              background: 'rgba(191,164,106,0.06)', border: `1px solid ${CINE.hair}`,
              borderRadius: 10, padding: '9px 16px',
            }}>
              <span style={{ fontSize: 18 }}>🍎</span>
              <div>
                <div style={{ fontSize: 9, color: CINE.faint, letterSpacing: '.1em', marginBottom: 1 }}>FRUIT DU DÉMON</div>
                <div style={{ fontFamily: CINE.title, fontSize: 13, fontWeight: 700, color: CINE.goldHi }}>{legend.fruit}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div aria-hidden style={{ height: 1, background: `linear-gradient(90deg, transparent, ${CINE.goldDim}, transparent)`, opacity: 0.5 }} />
    </div>
  )
}

// ── Vignette galerie : un champion du mur, cliquable pour le mettre sur le trône. ─
function ChampCard({ legend, active, onSelect }) {
  const [h, setH] = useState(false)
  return (
    <button
      onClick={onSelect}
      onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{
        textAlign: 'left', cursor: 'pointer', width: '100%',
        display: 'flex', flexDirection: 'column', gap: 12,
        borderRadius: 16, padding: 18,
        background: active ? CINE.panel2 : (h ? CINE.panel2 : CINE.panel),
        border: `1px solid ${active ? CINE.gold : (h ? CINE.hairTop : CINE.hair)}`,
        boxShadow: active
          ? '0 18px 50px rgba(0,0,0,0.45), inset 0 0 0 1px rgba(191,164,106,0.12)'
          : (h ? '0 18px 50px rgba(0,0,0,0.45)' : '0 6px 24px rgba(0,0,0,0.25)'),
        transform: h || active ? 'translateY(-4px)' : 'none',
        transition: 'transform .35s cubic-bezier(.22,1,.36,1), background .3s, border-color .3s, box-shadow .35s',
      }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{
          width: 56, height: 56, borderRadius: '50%', flexShrink: 0,
          background: 'radial-gradient(circle at 35% 30%, rgba(216,189,126,0.18), rgba(0,0,0,0.35))',
          border: `1px solid ${active ? CINE.gold : CINE.goldDim}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28,
        }}>{legend.icon}</div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--pirate)', fontSize: 22, color: CINE.ink, lineHeight: 1.05, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{legend.name}</div>
          <div style={{ fontFamily: CINE.title, fontSize: 10.5, color: CINE.gold, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{legend.pseudo}</div>
        </div>
      </div>

      <div style={{
        fontFamily: CINE.title, fontSize: 9.5, fontWeight: 700, letterSpacing: '.12em',
        color: active ? CINE.goldHi : CINE.muted, textTransform: 'uppercase',
        background: 'rgba(191,164,106,0.06)', border: `1px solid ${CINE.hair}`,
        borderRadius: 6, padding: '5px 10px', alignSelf: 'flex-start',
      }}>{legend.title}</div>

      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, marginTop: 'auto' }}>
        <span style={{ fontSize: 9, color: CINE.faint, letterSpacing: '.12em' }}>PRIME</span>
        <span style={{ fontFamily: 'var(--pirate)', fontSize: 13, fontWeight: 800, color: CINE.goldHi, whiteSpace: 'nowrap' }}>{legend.prime}</span>
      </div>
    </button>
  )
}

export default function HallOfFame() {
  const [active, setActive] = useState(0)
  const [animating, setAnimating] = useState(false)
  const intervalRef = useRef(null)

  const go = (dir) => {
    if (animating) return
    setAnimating(true)
    setTimeout(() => {
      setActive(a => (a + dir + LEGENDS.length) % LEGENDS.length)
      setAnimating(false)
    }, 250)
  }

  const goTo = (i) => {
    if (animating || i === active) return
    setAnimating(true)
    clearInterval(intervalRef.current)
    setTimeout(() => { setActive(i); setAnimating(false) }, 250)
    intervalRef.current = setInterval(() => go(1), 5500)
  }

  useEffect(() => {
    intervalRef.current = setInterval(() => go(1), 5500)
    return () => clearInterval(intervalRef.current)
  }, [])

  const legend = LEGENDS[active]

  return (
    <CineSection id="hall-of-fame">
      <CineStyles />

      {/* halo or diffus, pleine largeur, sans glow agressif */}
      <div aria-hidden style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
        background: 'radial-gradient(ellipse 60% 50% at 50% 0%, rgba(191,164,106,0.06), transparent 70%)',
      }} />

      <div style={{ position: 'relative', zIndex: 1 }}>
        <SectionHead
          eyebrow="★ Légendes"
          title="Hall of"
          accent="Fame"
          lead="Le mur des champions de Brams Community — les Rois des Pirates qui ont marqué le serveur à jamais."
          align="center"
        />

        {/* Trône : la légende mise en avant */}
        <Reveal delay={140} style={{ marginTop: 'clamp(40px, 6vw, 64px)' }}>
          <ThroneCard legend={legend} animating={animating} />
        </Reveal>

        {/* Contrôles du carousel — flèches + points */}
        <Reveal delay={180} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 22, marginTop: 28,
        }}>
          <NavArrow dir="←" onClick={() => { clearInterval(intervalRef.current); go(-1); intervalRef.current = setInterval(() => go(1), 5500) }} />
          <div style={{ display: 'flex', gap: 8 }}>
            {LEGENDS.map((l, i) => (
              <button key={i} aria-label={`Voir ${l.name}`} onClick={() => goTo(i)} style={{
                width: i === active ? 30 : 8, height: 8, borderRadius: 4, border: 'none', cursor: 'pointer',
                background: i === active ? GOLD_GRAD : CINE.hairTop,
                transition: 'all 0.35s cubic-bezier(.22,1,.36,1)', padding: 0,
              }} />
            ))}
          </div>
          <NavArrow dir="→" onClick={() => { clearInterval(intervalRef.current); go(1); intervalRef.current = setInterval(() => go(1), 5500) }} />
        </Reveal>

        {/* Mur des champions — galerie pleine largeur */}
        <Reveal delay={220} style={{
          marginTop: 'clamp(40px, 6vw, 64px)',
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 18,
        }}>
          {LEGENDS.map((l, i) => (
            <ChampCard key={i} legend={l} active={i === active} onSelect={() => goTo(i)} />
          ))}
        </Reveal>
      </div>
    </CineSection>
  )
}

function NavArrow({ dir, onClick }) {
  const [h, setH] = useState(false)
  return (
    <button onClick={onClick}
      onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      aria-label={dir === '←' ? 'Précédent' : 'Suivant'}
      style={{
        width: 44, height: 44, borderRadius: '50%',
        border: `1px solid ${h ? CINE.gold : CINE.hairTop}`,
        background: h ? CINE.panel2 : 'transparent', color: CINE.ink, cursor: 'pointer', fontSize: 18,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'border-color .25s, background .25s, transform .25s',
        transform: h ? 'translateY(-2px)' : 'none',
      }}>{dir}</button>
  )
}
