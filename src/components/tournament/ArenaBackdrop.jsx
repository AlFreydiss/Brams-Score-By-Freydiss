import { useEffect, useMemo, useRef } from 'react'
import ArenaField from './ArenaField.jsx'

// Fond « arène » du hub des tournois. Le décor est empilé en profondeurs qui
// bougent chacune à sa vitesse quand la souris se déplace (parallaxe) : ciel et
// auras à peine, projecteurs un peu, sol néon franchement. C'est ce décalage
// qui donne le volume — sans lui, les mêmes calques restent un aplat.
//
// Contraintes tenues : tout en transform/opacity (GPU), parallaxe lissée dans
// une seule boucle rAF coupée quand l'onglet passe en arrière-plan, et
// prefers-reduced-motion désactive mouvement ET parallaxe.

const CSS = `
  @keyframes abAuraA   { 0%,100%{transform:translate3d(-4%,-2%,0) scale(1)}    50%{transform:translate3d(3%,4%,0) scale(1.14)} }
  @keyframes abAuraB   { 0%,100%{transform:translate3d(4%,3%,0) scale(1.1)}    50%{transform:translate3d(-3%,-3%,0) scale(0.97)} }
  @keyframes abBeamA   { 0%,100%{transform:rotate(15deg);  opacity:.20} 50%{transform:rotate(25deg);  opacity:.44} }
  @keyframes abBeamB   { 0%,100%{transform:rotate(-17deg); opacity:.17} 50%{transform:rotate(-27deg); opacity:.40} }
  @keyframes abGrid    { from{background-position:0 0} to{background-position:0 72px} }
  @keyframes abHorizon { 0%,100%{opacity:.55} 50%{opacity:1} }
  @keyframes abSweep   { 0%{transform:translateX(-60%) rotate(8deg); opacity:0} 35%{opacity:.5} 70%{opacity:0} 100%{transform:translateX(120%) rotate(8deg); opacity:0} }
  @keyframes abEmber   { 0%{transform:translate3d(0,0,0); opacity:0} 10%{opacity:.8} 85%{opacity:.45} 100%{transform:translate3d(24px,-96vh,0); opacity:0} }
  @keyframes abTwinkle { 0%,100%{opacity:.07} 50%{opacity:.5} }
  @keyframes abPulse   { 0%{transform:translateY(0) scaleX(1); opacity:0} 12%{opacity:.75} 100%{transform:translateY(-46vh) scaleX(.35); opacity:0} }
  @keyframes abEq      { 0%,100%{transform:scaleY(.16)} 50%{transform:scaleY(1)} }

  .ab-grid {
    position:absolute; left:-45%; right:-45%; bottom:-22%; height:74%;
    background-image:
      linear-gradient(var(--abLineA) 1.4px, transparent 1.4px),
      linear-gradient(90deg, var(--abLineB) 1.4px, transparent 1.4px);
    background-size:72px 72px;
    transform:perspective(520px) rotateX(60deg); transform-origin:bottom center;
    -webkit-mask-image:linear-gradient(to top,#000 8%, transparent 84%);
    mask-image:linear-gradient(to top,#000 8%, transparent 84%);
    animation:abGrid 6s linear infinite;
  }
  .ab-grain {
    background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  }
  @media (prefers-reduced-motion: reduce){
    [data-abfx]{animation:none!important}
    .ab-grid{animation:none!important}
  }
`

// Les couches de parallaxe : amplitude en px pour un curseur allant d'un bord
// à l'autre. Le sol bouge le plus, le ciel presque pas.
const DEPTHS = [
  { key: 'sky',   ax: 8,  ay: 5 },
  { key: 'beams', ax: 20, ay: 12 },
  { key: 'floor', ax: 34, ay: 16 },
]

export default function ArenaBackdrop({
  accentA = '#e85aa0',
  accentB = '#9d5aff',
  fieldDensity = 1,
  parallax = true,
}) {
  const layerRefs = useRef({})
  const rootRef = useRef(null)

  const embers = useMemo(() => Array.from({ length: 18 }, (_, i) => ({
    x: (i * 53.3 + 9) % 96, dur: 9 + (i * 0.73) % 7, del: (i * 1.31) % 9,
    size: i % 3 === 0 ? 3 : 2, light: i % 4 === 0,
  })), [])
  const stars = useMemo(() => Array.from({ length: 52 }, (_, i) => ({
    x: (i * 39.1 + 7) % 98, y: (i * 43.7 + 11) % 70,
    size: i % 9 === 0 ? 2.4 : i % 4 === 0 ? 1.6 : 1,
    dur: 2.8 + (i * 0.28) % 4.5, del: (i * 0.21) % 7,
    tint: i % 12 === 0,
  })), [])
  // Ondes qui remontent le sol néon, décalées pour ne jamais se superposer.
  const pulses = useMemo(() => Array.from({ length: 3 }, (_, i) => ({
    dur: 5.5 + i * 1.6, del: i * 2.1,
  })), [])
  const bars = useMemo(() => Array.from({ length: 40 }, (_, i) => ({
    dur: 0.9 + (i * 0.137) % 1.4, del: (i * 0.211) % 1.8, h: 12 + (i * 13.7) % 34,
  })), [])

  useEffect(() => {
    if (!parallax) return
    const mq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null
    if (mq && mq.matches) return
    // Pas de parallaxe au doigt : sur mobile il n'y a pas de survol, et bouger
    // le décor à chaque tap donnerait juste des à-coups.
    const fine = window.matchMedia ? window.matchMedia('(pointer: fine)') : null
    if (fine && !fine.matches) return

    let raf = 0
    let tx = 0, ty = 0, cx = 0, cy = 0

    function onMove(e) {
      tx = (e.clientX / window.innerWidth - 0.5) * 2
      ty = (e.clientY / window.innerHeight - 0.5) * 2
    }
    function loop() {
      // Lissage exponentiel : le décor suit la souris avec de l'inertie.
      cx += (tx - cx) * 0.06
      cy += (ty - cy) * 0.06
      for (const d of DEPTHS) {
        const el = layerRefs.current[d.key]
        if (el) el.style.transform = 'translate3d(' + (-cx * d.ax).toFixed(2) + 'px,' + (-cy * d.ay).toFixed(2) + 'px,0)'
      }
      raf = requestAnimationFrame(loop)
    }
    function stop() { if (raf) { cancelAnimationFrame(raf); raf = 0 } }
    function start() { if (!raf) raf = requestAnimationFrame(loop) }
    function onVisibility() { if (document.hidden) stop(); else start() }

    window.addEventListener('pointermove', onMove, { passive: true })
    document.addEventListener('visibilitychange', onVisibility)
    start()
    return () => {
      stop()
      window.removeEventListener('pointermove', onMove)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [parallax])

  const setLayer = key => el => { layerRefs.current[key] = el }

  return (
    <div
      ref={rootRef}
      aria-hidden
      style={{
        position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
        overflow: 'hidden', background: '#050308',
        // Les lignes du sol sont pilotées par variables pour suivre l'accent.
        '--abLineA': accentA + '5c',
        '--abLineB': accentB + '4a',
      }}
    >
      <style>{CSS}</style>

      {/* ── Profondeur 1 : ciel + auras ─────────────────────────────────── */}
      <div ref={setLayer('sky')} style={{ position: 'absolute', inset: -40, willChange: 'transform' }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(180deg, #0d0614 0%, #090410 54%, #050308 100%)',
        }} />
        <div data-abfx style={{
          position: 'absolute', left: '-16%', top: '-26%', width: '68%', height: '72%',
          background: 'radial-gradient(circle at 45% 45%, ' + accentA + '4d 0%, ' + accentA + '14 42%, transparent 68%)',
          filter: 'blur(48px)', animation: 'abAuraA 13s ease-in-out infinite',
        }} />
        <div data-abfx style={{
          position: 'absolute', right: '-18%', top: '-16%', width: '64%', height: '76%',
          background: 'radial-gradient(circle at 55% 45%, ' + accentB + '47 0%, ' + accentB + '12 44%, transparent 70%)',
          filter: 'blur(54px)', animation: 'abAuraB 16s ease-in-out infinite',
        }} />
        <div data-abfx style={{
          position: 'absolute', left: '-14%', bottom: '-12%', width: '58%', height: '54%',
          background: 'radial-gradient(circle at 50% 50%, ' + accentA + '2b 0%, transparent 66%)',
          filter: 'blur(60px)', animation: 'abAuraB 19s ease-in-out infinite',
        }} />
        {stars.map((s, i) => (
          <div key={i} data-abfx style={{
            position: 'absolute', left: s.x + '%', top: s.y + '%',
            width: s.size, height: s.size, borderRadius: '50%',
            background: s.tint ? accentA + '99' : 'rgba(255,255,255,.42)',
            animation: 'abTwinkle ' + s.dur + 's ' + s.del + 's ease-in-out infinite',
          }} />
        ))}
      </div>

      {/* ── Profondeur 2 : projecteurs + balayage ───────────────────────── */}
      <div ref={setLayer('beams')} style={{ position: 'absolute', inset: -40, willChange: 'transform' }}>
        <div data-abfx style={{
          position: 'absolute', left: '18%', top: '-46%', width: '17%', height: '116%',
          background: 'linear-gradient(180deg, ' + accentA + '5c 0%, ' + accentA + '1c 42%, transparent 78%)',
          filter: 'blur(26px)', transformOrigin: 'top center',
          animation: 'abBeamA 11s ease-in-out infinite',
        }} />
        <div data-abfx style={{
          position: 'absolute', right: '16%', top: '-48%', width: '15%', height: '118%',
          background: 'linear-gradient(180deg, ' + accentB + '54 0%, ' + accentB + '18 44%, transparent 80%)',
          filter: 'blur(28px)', transformOrigin: 'top center',
          animation: 'abBeamB 14s ease-in-out infinite',
        }} />
        <div data-abfx style={{
          position: 'absolute', top: '-20%', left: 0, width: '55%', height: '140%',
          background: 'linear-gradient(100deg, transparent, ' + accentA + '1a 45%, ' + accentB + '12 55%, transparent)',
          filter: 'blur(8px)', animation: 'abSweep 9s ease-in-out infinite',
        }} />
      </div>

      {/* ── Profondeur 3 : sol néon, horizon, égaliseur, embers ─────────── */}
      <div ref={setLayer('floor')} style={{ position: 'absolute', inset: -40, willChange: 'transform' }}>
        <div data-abfx className="ab-grid" />

        {/* Ondes de lumière qui remontent la grille */}
        {pulses.map((p, i) => (
          <div key={i} data-abfx style={{
            position: 'absolute', left: '10%', right: '10%', bottom: '32%', height: 2,
            background: 'linear-gradient(90deg, transparent, ' + accentA + 'cc 30%, ' + accentB + 'cc 70%, transparent)',
            filter: 'blur(1.5px)',
            animation: 'abPulse ' + p.dur + 's ' + p.del + 's ease-out infinite',
          }} />
        ))}

        {/* Ligne d'horizon : la couture entre le ciel et le sol */}
        <div data-abfx style={{
          position: 'absolute', left: 0, right: 0, bottom: '36%', height: 2,
          background: 'linear-gradient(90deg, transparent, ' + accentA + 'e6 34%, ' + accentB + 'e6 66%, transparent)',
          boxShadow: '0 0 30px 6px ' + accentA + '59, 0 0 60px 14px ' + accentB + '38',
          animation: 'abHorizon 4.5s ease-in-out infinite',
        }} />

        {/* Égaliseur au ras du sol — la scène « joue » quelque chose */}
        <div style={{
          position: 'absolute', left: 0, right: 0, bottom: 0, height: 60,
          display: 'flex', alignItems: 'flex-end', gap: 3, padding: '0 2%',
          opacity: 0.3, maskImage: 'linear-gradient(90deg,transparent,#000 18%,#000 82%,transparent)',
          WebkitMaskImage: 'linear-gradient(90deg,transparent,#000 18%,#000 82%,transparent)',
        }}>
          {bars.map((b, i) => (
            <div key={i} data-abfx style={{
              flex: 1, height: b.h, borderRadius: 2, transformOrigin: 'bottom',
              background: 'linear-gradient(180deg, ' + (i % 3 === 0 ? accentB : accentA) + 'cc, transparent)',
              animation: 'abEq ' + b.dur + 's ' + b.del + 's ease-in-out infinite',
            }} />
          ))}
        </div>

        {embers.map((e, i) => (
          <div key={i} data-abfx style={{
            position: 'absolute', left: e.x + '%', bottom: -12,
            width: e.size, height: e.size, borderRadius: '50%',
            background: e.light ? accentB + 'b3' : accentA + 'a6',
            boxShadow: '0 0 6px ' + (e.light ? accentB + '80' : accentA + '73'),
            animation: 'abEmber ' + e.dur + 's ' + e.del + 's linear infinite',
          }} />
        ))}
      </div>

      {/* ── Champ d'énergie interactif (canvas) ─────────────────────────── */}
      <ArenaField accentA={accentA} accentB={accentB} density={fieldDensity} zIndex={1} />

      {/* Vignette + grain : profondeur et matière, toujours en dernier */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 2,
        background: 'radial-gradient(ellipse 96% 86% at 50% 38%, transparent 45%, rgba(0,0,0,.66) 100%)',
      }} />
      <div className="ab-grain" style={{
        position: 'absolute', inset: 0, zIndex: 2, opacity: 0.075, mixBlendMode: 'overlay',
      }} />
    </div>
  )
}
