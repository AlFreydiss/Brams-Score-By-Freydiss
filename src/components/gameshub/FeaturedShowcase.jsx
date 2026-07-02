// ── FeaturedShowcase — grand bandeau VEDETTE du hub Brams Arcade ──────────────
// Rotation auto (8s) entre 3 jeux (échecs / dames / fredisu) avec crossfade+slide,
// pause au hover/focus, dots + flèches clavier, scènes SVG animées 100% autonomes
// (aucun import des jeux, aucun asset externe). Styles inline + <style> scoped fsx-
// (même pattern que GamesHubPage : les keyframes/media queries ne peuvent pas vivre en inline).
import { useEffect, useState } from 'react'

const GOLD = '#d4a017'
const GOLD_HI = '#f0d27a'

const ROTATE_MS = 8000

const CSS = `
  /* padding:0 = neutralise la règle globale du site sur <section> (110px 0) */
  .fsx-root{outline:none;padding:0}
  .fsx-root:focus-visible{outline:2px solid ${GOLD};outline-offset:4px}
  .fsx-bg{transition:opacity .5s ease}
  /* Crossfade + léger slide entre jeux. visibility retardée à la sortie pour laisser
     le fondu se jouer ; coupe aussi le focus/lecteur d'écran des slides cachées. */
  .fsx-slide{opacity:0;transform:translateX(18px);visibility:hidden;pointer-events:none;transition:opacity .5s ease,transform .5s ease,visibility 0s linear .5s}
  .fsx-slide.is-active{opacity:1;transform:none;visibility:visible;pointer-events:auto;transition:opacity .5s ease,transform .5s ease,visibility 0s}
  /* Mobile d'abord : 1 colonne, scène au-dessus (order:-1). Desktop ≥900px : 2 colonnes.
     grid-template-columns volontairement PAS en inline, sinon la media query perdrait. */
  .fsx-grid{display:grid;grid-template-columns:1fr;gap:clamp(20px,3vw,36px);align-items:center;padding:clamp(20px,3.5vw,38px) clamp(20px,3.5vw,38px) clamp(10px,2vw,18px)}
  .fsx-scene{order:-1;width:100%;max-width:420px;margin:0 auto;min-width:0;animation:fsx-rise .6s ease .22s both}
  @media (min-width:900px){
    .fsx-grid{grid-template-columns:1.08fr .92fr}
    .fsx-scene{order:0;margin:0;justify-self:end}
  }
  /* Stagger d'apparition au mount */
  @keyframes fsx-rise{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
  .fsx-stagger>*{animation:fsx-rise .5s ease both}
  .fsx-stagger>*:nth-child(1){animation-delay:.04s}
  .fsx-stagger>*:nth-child(2){animation-delay:.1s}
  .fsx-stagger>*:nth-child(3){animation-delay:.16s}
  .fsx-stagger>*:nth-child(4){animation-delay:.22s}
  .fsx-stagger>*:nth-child(5){animation-delay:.28s}
  .fsx-stagger>*:nth-child(6){animation-delay:.34s}
  .fsx-cta{transition:transform .18s ease,filter .18s ease;outline:none}
  .fsx-cta:hover{transform:translateY(-2px);filter:brightness(1.07)}
  .fsx-cta:active{transform:translateY(0)}
  .fsx-cta:focus-visible{outline:2px solid ${GOLD_HI};outline-offset:3px}
  .fsx-dot{background:transparent;border:0;padding:6px;margin:0;cursor:pointer;display:inline-flex;border-radius:999px}
  .fsx-dot span{display:block;width:8px;height:8px;border-radius:999px;background:rgba(240,210,122,.26);transition:width .3s ease,background .3s ease}
  .fsx-dot:hover span{background:rgba(240,210,122,.5)}
  .fsx-dot[aria-current="true"] span{width:24px;background:${GOLD}}
  .fsx-dot:focus-visible{outline:2px solid ${GOLD_HI};outline-offset:1px}
  /* ── Scènes SVG (boucles lentes, unités = user units 24u des viewBox) ──
     Échecs : le pion blanc avance puis prend en diagonale (le pion noir s'efface). */
  .fsx-chess-mover{animation:fsx-chess-mover 6s cubic-bezier(.35,.75,.3,1) infinite}
  .fsx-chess-taken{animation:fsx-chess-taken 6s ease infinite}
  @keyframes fsx-chess-mover{0%,16%{transform:translate(0,0)}28%,46%{transform:translate(0,-24px)}58%,82%{transform:translate(24px,-48px)}94%,100%{transform:translate(0,0)}}
  @keyframes fsx-chess-taken{0%,50%{opacity:1}58%,84%{opacity:0}96%,100%{opacity:1}}
  /* Dames : prise en diagonale (saut 2 cases) + petit "lift" d'échelle au passage. */
  .fsx-dame-jump{animation:fsx-dame-jump 6s cubic-bezier(.35,.75,.3,1) infinite}
  .fsx-dame-lift{animation:fsx-dame-lift 6s ease infinite;transform-box:fill-box;transform-origin:center}
  .fsx-dame-taken{animation:fsx-dame-taken 6s ease infinite}
  @keyframes fsx-dame-jump{0%,20%{transform:translate(0,0)}38%,74%{transform:translate(48px,-48px)}90%,100%{transform:translate(0,0)}}
  @keyframes fsx-dame-lift{0%,20%{transform:scale(1)}29%{transform:scale(1.14)}38%,100%{transform:scale(1)}}
  @keyframes fsx-dame-taken{0%,30%{opacity:1}42%,80%{opacity:0}94%,100%{opacity:1}}
  /* Fredisu : approach circles osu!-like qui se referment en cascade (delays inline). */
  .fsx-osu-app{animation:fsx-osu-app 3s cubic-bezier(.25,.6,.3,1) infinite both;transform-box:fill-box;transform-origin:center}
  .fsx-osu-hit{animation:fsx-osu-hit 3s ease infinite both;transform-box:fill-box;transform-origin:center}
  @keyframes fsx-osu-app{0%{transform:scale(2.2);opacity:0}10%{opacity:.9}40%{transform:scale(1);opacity:.9}48%,100%{transform:scale(1);opacity:0}}
  @keyframes fsx-osu-hit{0%,38%{opacity:.55;transform:scale(1)}44%{opacity:1}56%{opacity:0;transform:scale(1.35)}57%{opacity:0;transform:scale(1)}74%,100%{opacity:.55;transform:scale(1)}}
  @media (prefers-reduced-motion:reduce){
    .fsx-bg{transition:none}
    .fsx-slide,.fsx-slide.is-active{transition:none;transform:none}
    .fsx-stagger>*,.fsx-scene{animation:none!important}
    .fsx-cta,.fsx-dot span{transition:none}
    .fsx-cta:hover,.fsx-cta:active{transform:none}
    .fsx-chess-mover,.fsx-chess-taken,.fsx-dame-jump,.fsx-dame-lift,.fsx-dame-taken,.fsx-osu-app,.fsx-osu-hit{animation:none!important}
  }
`

export default function FeaturedShowcase({ games = [], onPlay, podiums }) {
  const count = games.length
  const [index, setIndex] = useState(0)
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const [reduced, setReduced] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false
  )

  // Suit le réglage OS en live (pas seulement au mount).
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = () => setReduced(mq.matches)
    if (mq.addEventListener) mq.addEventListener('change', onChange)
    else mq.addListener(onChange)
    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', onChange)
      else mq.removeListener(onChange)
    }
  }, [])

  const paused = hovered || focused

  // Auto-rotation 8s. `index` dans les deps = le compteur repart de zéro après un
  // clic dot / flèche clavier (sinon le slide suivant pourrait arriver trop tôt).
  useEffect(() => {
    if (paused || reduced || count < 2) return
    const t = setInterval(() => setIndex(i => (i + 1) % count), ROTATE_MS)
    return () => clearInterval(t)
  }, [paused, reduced, count, index])

  if (!count) return null
  const safeIndex = Math.min(index, count - 1)

  const onKeyDown = (e) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); setIndex(i => (i + 1) % count) }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); setIndex(i => (i - 1 + count) % count) }
  }
  // onBlur bubble (≈ focusout) : on ne reprend que si le focus SORT vraiment du bandeau.
  const onBlur = (e) => { if (!e.currentTarget.contains(e.relatedTarget)) setFocused(false) }

  return (
    <section
      className="fsx-root"
      tabIndex={0}
      role="region"
      aria-roledescription="carrousel"
      aria-label="Jeux en vedette"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={onBlur}
      onKeyDown={onKeyDown}
      style={{
        position: 'relative', overflow: 'hidden', isolation: 'isolate', width: '100%',
        borderRadius: 22, border: '1px solid rgba(212,160,23,0.22)',
        background: 'rgba(255,255,255,0.015)',
        boxShadow: '0 24px 60px -22px rgba(0,0,0,0.6)',
      }}
    >
      <style>{CSS}</style>

      {/* Fonds accentués par jeu : crossfade synchronisé avec les slides
          (un gradient CSS ne s'interpole pas → une couche par jeu, opacité toggle). */}
      {games.map((g, i) => (
        <div
          key={(g.id || i) + '-bg'} aria-hidden="true" className="fsx-bg"
          style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            background: `linear-gradient(160deg, ${g.accent}10, rgba(255,255,255,0.015))`,
            opacity: i === safeIndex ? 1 : 0,
          }}
        />
      ))}
      {/* Vignette sombre */}
      <div aria-hidden="true" style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(140% 120% at 50% -10%, transparent 55%, rgba(0,0,0,0.4) 100%)',
      }} />

      {/* Pile de slides : toutes en gridArea 1/1 → le bandeau prend la hauteur de la plus grande. */}
      <div style={{ position: 'relative', display: 'grid' }} aria-live={paused || reduced ? 'polite' : 'off'}>
        {games.map((g, i) => (
          <Slide key={g.id || i} g={g} active={i === safeIndex} onPlay={onPlay} podium={podiums && podiums[g.id]} />
        ))}
      </div>

      {/* Dots de navigation */}
      <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', gap: 4, padding: '2px 0 16px' }}>
        {games.map((g, i) => (
          <button
            key={(g.id || i) + '-dot'}
            type="button"
            className="fsx-dot"
            aria-label={`Voir ${g.title}`}
            aria-current={i === safeIndex ? 'true' : undefined}
            onClick={() => setIndex(i)}
          >
            <span aria-hidden="true" />
          </button>
        ))}
      </div>
    </section>
  )
}

function Slide({ g, active, onPlay, podium }) {
  const pod = Array.isArray(podium) ? podium.slice(0, 3) : null
  return (
    <div
      className={active ? 'fsx-slide is-active' : 'fsx-slide'}
      aria-hidden={active ? undefined : true}
      style={{ gridArea: '1 / 1', minWidth: 0 }}
    >
      <div className="fsx-grid">
        <div className="fsx-stagger" style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.26em', textTransform: 'uppercase', color: GOLD }}>
            En vedette
          </div>
          <h2 style={{ margin: 0, fontFamily: "'Pirata One', serif", fontWeight: 400, fontSize: 'clamp(34px,4.5vw,52px)', lineHeight: 1.04, color: '#f4ecd8', textShadow: '0 2px 34px rgba(212,160,23,0.22)' }}>
            {g.title}
          </h2>
          <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.6, color: 'rgba(236,232,223,0.62)', maxWidth: 520 }}>
            {g.desc}
          </p>
          <Chips caps={g.caps} />
          {/* Podium live si dispo (échecs/dames) ; sinon rien — dégradation silencieuse,
              les chips caps ci-dessus occupent alors la place (cas fredisu). */}
          {pod && pod.length > 0 && <Podium entries={pod} />}
          <button
            type="button"
            className="fsx-cta"
            aria-label={`Jouer à ${g.title}`}
            onClick={(ev) => { if (typeof onPlay === 'function') onPlay(g, ev) }}
            style={{
              alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: 8,
              marginTop: 4, padding: '12px 24px', borderRadius: 12, border: 'none', cursor: 'pointer',
              background: g.accent, color: '#0c0a06', fontSize: 15, fontWeight: 800,
              fontFamily: 'inherit', letterSpacing: '.01em',
              boxShadow: `0 12px 28px -10px ${g.accent}aa`,
            }}
          >
            Jouer <span aria-hidden="true" style={{ fontSize: 17, lineHeight: 1 }}>→</span>
          </button>
        </div>
        <div className="fsx-scene">
          <Scene id={g.id} />
        </div>
      </div>
    </div>
  )
}

// ── Chips capacités (même langage que Caps du hub) ───────────────────────────
function Chips({ caps }) {
  if (!caps || !caps.length) return null
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {caps.map(c => (
        <span key={c} style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: 'rgba(236,232,223,0.62)', background: 'rgba(255,255,255,0.045)', border: '1px solid rgba(255,255,255,0.12)', padding: '3px 9px', borderRadius: 999, whiteSpace: 'nowrap' }}>{c}</span>
      ))}
    </div>
  )
}

// ── Podium live top-3 (monospace tabular sobre) ──────────────────────────────
const MEDALS = ['🥇', '🥈', '🥉']

function Podium({ entries }) {
  return (
    <div style={{
      display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: '6px 16px',
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
      fontVariantNumeric: 'tabular-nums', fontSize: 12.5, color: 'rgba(236,232,223,0.72)',
    }}>
      <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.14em', textTransform: 'uppercase', color: GOLD }}>Podium</span>
      {entries.map((e, i) => (
        <span key={(e.pseudo || '') + i} style={{ whiteSpace: 'nowrap' }}>
          <span aria-hidden="true">{MEDALS[i]}</span> {e.pseudo}
          {e.elo != null && <span style={{ color: 'rgba(236,232,223,0.45)' }}> · {e.elo}</span>}
        </span>
      ))}
    </div>
  )
}

// ── Scènes SVG (viewBox 192×120 = 8×5 cases de 24u, rendu ~420×260) ──────────
const SCENE_STYLE = {
  width: '100%', height: 'auto', display: 'block', borderRadius: 14,
  border: '1px solid rgba(255,255,255,0.09)', boxShadow: '0 18px 44px rgba(0,0,0,0.45)',
}

function Scene({ id }) {
  if (id === 'echecs') return <SceneEchecs />
  if (id === 'dames') return <SceneDames />
  if (id === 'fredisu') return <SceneFredisu />
  return null
}

function Cases({ cols, rows, light, dark }) {
  const out = []
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++)
    out.push(<rect key={`${c}-${r}`} x={c * 24} y={r * 24} width={24} height={24} fill={(c + r) % 2 ? dark : light} />)
  return out
}

// Échiquier vert/crème (palette chess.com) — silhouettes SVG étendues depuis les
// mini-previews du hub. Le pion blanc (2,4) avance en (2,3) puis prend le pion
// noir en (3,2) ; g externe = position (attr), g interne = coup joué (CSS, sinon
// le transform CSS écraserait l'attribut transform de position).
function SceneEchecs() {
  const w = { fill: '#f9f9f9', stroke: '#43403a', strokeWidth: 1, strokeLinejoin: 'round' }
  const b = { fill: '#3f3d3b', stroke: '#211f1d', strokeWidth: 1, strokeLinejoin: 'round' }
  return (
    <svg viewBox="0 0 192 120" aria-hidden="true" focusable="false" style={SCENE_STYLE}>
      <Cases cols={8} rows={5} light="#EBECD0" dark="#739552" />
      {/* Tour noire */}
      <g transform="translate(0,0)">
        <path {...b} d="M8 19v-5.6h1.1V11h2v1.6h1.8V11h2v2.4H16V19z" />
      </g>
      {/* Roi noir */}
      <g transform="translate(96,0)">
        <rect {...b} x="11.2" y="6.4" width="1.6" height="5.8" rx=".4" />
        <rect {...b} x="9.6" y="8.1" width="4.8" height="1.6" rx=".4" />
        <path {...b} d="M8.6 19.2l1-5.8h4.8l1 5.8z" />
      </g>
      {/* Dame noire */}
      <g transform="translate(48,24)">
        <path {...b} d="M6.9 18.6 8.1 11.7l2.9 3.3L12 9.7l1 5.3 2.9-3.3 1.2 6.9z" />
        <circle {...b} cx="8" cy="10.4" r="1.1" /><circle {...b} cx="12" cy="8.4" r="1.1" /><circle {...b} cx="16" cy="10.4" r="1.1" />
      </g>
      {/* Fou blanc */}
      <g transform="translate(144,72)">
        <circle {...w} cx="12" cy="6.3" r="1.3" />
        <path {...w} d="M12 7.6c2 1.7 3.2 3.5 3.2 5.6 0 1.6-.6 3-1.6 3.9h-3.2c-1-.9-1.6-2.3-1.6-3.9 0-2.1 1.2-3.9 3.2-5.6z" />
        <rect {...w} x="8.2" y="17.6" width="7.6" height="1.8" rx=".9" />
      </g>
      {/* Pion noir — pris au 2e coup, fade out puis reset */}
      <g transform="translate(72,48)">
        <g className="fsx-chess-taken">
          <circle {...b} cx="12" cy="8.8" r="3.2" />
          <path {...b} d="M8.7 19.2c.2-3.6 1.5-5.7 3.3-6.9 1.8 1.2 3.1 3.3 3.3 6.9z" />
          <rect {...b} x="7.7" y="18.5" width="8.6" height="1.9" rx=".95" />
        </g>
      </g>
      {/* Pion blanc — séquence avance + prise en boucle 6s */}
      <g transform="translate(48,96)">
        <g className="fsx-chess-mover">
          <circle {...w} cx="12" cy="8.8" r="3.2" />
          <path {...w} d="M8.7 19.2c.2-3.6 1.5-5.7 3.3-6.9 1.8 1.2 3.1 3.3 3.3 6.9z" />
          <rect {...w} x="7.7" y="18.5" width="8.6" height="1.9" rx=".95" />
        </g>
      </g>
    </svg>
  )
}

function PionDame({ x, y, dark, anim, taken }) {
  const s = dark
    ? { fill: '#3a2f28', stroke: '#201914' }
    : { fill: '#f2e7cf', stroke: '#b09a6d' }
  const ring = dark ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.18)'
  const disc = (
    <>
      <circle cx="12" cy="12" r="8" strokeWidth="1.2" {...s} />
      <circle cx="12" cy="12" r="4.6" fill="none" stroke={ring} strokeWidth="1.1" />
    </>
  )
  let inner = disc
  if (anim) inner = <g className="fsx-dame-jump"><g className="fsx-dame-lift">{disc}</g></g>
  else if (taken) inner = <g className="fsx-dame-taken">{disc}</g>
  return <g transform={`translate(${x * 24},${y * 24})`}>{inner}</g>
}

// Damier bois — le pion clair (2,3) saute par-dessus le pion foncé (3,2) et
// atterrit en (4,1) ; le pion pris s'efface pendant le saut, puis tout se reset.
function SceneDames() {
  return (
    <svg viewBox="0 0 192 120" aria-hidden="true" focusable="false" style={SCENE_STYLE}>
      <Cases cols={8} rows={5} light="#e3c193" dark="#9c6b43" />
      <PionDame x={1} y={0} dark />
      <PionDame x={3} y={0} dark />
      <PionDame x={5} y={0} dark />
      <PionDame x={6} y={1} dark />
      <PionDame x={3} y={2} dark taken />
      <PionDame x={0} y={3} />
      <PionDame x={4} y={3} />
      <PionDame x={5} y={4} />
      <PionDame x={7} y={4} />
      <PionDame x={2} y={3} anim />
    </svg>
  )
}

// Scène rythme abstraite : 3 hit circles or le long d'un slider discret, chaque
// approach circle se referme en cascade (delays inline, boucle 3s). En
// reduced-motion : anneaux d'approche invisibles (opacité inline 0), les cercles
// posés restent visibles en statique.
function SceneFredisu() {
  const spots = [
    { x: 48, y: 74, d: 0 },
    { x: 96, y: 44, d: 0.45 },
    { x: 144, y: 70, d: 0.9 },
  ]
  return (
    <svg viewBox="0 0 192 120" aria-hidden="true" focusable="false" style={SCENE_STYLE}>
      <defs>
        <radialGradient id="fsx-osu-glow" cx="50%" cy="42%" r="70%">
          <stop offset="0%" stopColor="rgba(212,160,23,0.10)" />
          <stop offset="100%" stopColor="rgba(212,160,23,0)" />
        </radialGradient>
      </defs>
      <rect width="192" height="120" fill="#0b0c11" />
      <rect width="192" height="120" fill="url(#fsx-osu-glow)" />
      {/* Corps de slider discret reliant les 3 cercles */}
      <path d="M48 74 Q96 18 144 70" fill="none" stroke="rgba(212,160,23,0.08)" strokeWidth="12" strokeLinecap="round" />
      <path d="M48 74 Q96 18 144 70" fill="none" stroke="rgba(212,160,23,0.16)" strokeWidth="1.2" />
      {spots.map((s, i) => (
        <g key={i}>
          {/* Anneau concentrique statique très discret */}
          <circle cx={s.x} cy={s.y} r="18" fill="none" stroke="rgba(212,160,23,0.07)" strokeWidth="1" />
          {/* Hit circle (flash au moment du "hit") */}
          <circle
            className="fsx-osu-hit"
            cx={s.x} cy={s.y} r="12"
            fill="rgba(212,160,23,0.14)" stroke={GOLD_HI} strokeWidth="1.6" opacity="0.55"
            style={{ animationDelay: `${s.d}s` }}
          />
          <circle cx={s.x} cy={s.y} r="2" fill="rgba(240,210,122,0.5)" />
          {/* Approach circle qui se referme */}
          <circle
            className="fsx-osu-app"
            cx={s.x} cy={s.y} r="12"
            fill="none" stroke={GOLD} strokeWidth="1.6" opacity="0"
            style={{ animationDelay: `${s.d}s` }}
          />
        </g>
      ))}
    </svg>
  )
}
