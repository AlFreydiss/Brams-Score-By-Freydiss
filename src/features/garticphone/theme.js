// Freydiss Phone — tokens de style partagés. Identité « AVIS DE RECHERCHE » :
// One Piece sombre maritime + or martelé + braise chaude (énergie party-game).
// Inline-styles only ; on réutilise type/fonts de styles/typography.
// Aucune dépendance Tailwind / CSS modules.

export const C = {
  // Fonds (bleu nuit maritime profond, pas de noir pur)
  bg:        '#060a11',
  bgDeep:    '#04060c',
  surface:   'rgba(18,25,39,0.74)',
  surface2:  'rgba(22,30,46,0.66)',
  surfaceFlat: '#0f1522',
  // Or "avis de recherche" / parchemin (foil martelé)
  gold:      '#e6b631',
  goldSoft:  '#f6d978',
  goldDeep:  '#a8761a',
  goldHot:   '#ffe9a8',   // surbrillance foil (highlights, reflets)
  parchment: '#f0e2b4',
  // Braise chaude (accent énergie : urgence chaude, CTA héros, punchline)
  ember:     '#ff7a3d',
  emberDeep: '#d4451f',
  // Accents secondaires
  sea:       '#33a0b2',   // turquoise océan (plus lumineux)
  seaDeep:   '#19505d',
  ink:       '#0a0f18',
  // Texte
  text:      '#f6f1e3',
  textMut:   'rgba(246,241,227,0.64)',
  textFaint: 'rgba(246,241,227,0.40)',
  // Sémantique
  ok:        '#46cf72',
  warn:      '#f2b324',
  danger:    '#ef5a4d',
  // Lignes
  hair:      'rgba(246,217,120,0.16)',
  hairSoft:  'rgba(255,255,255,0.075)',
  hairTop:   'rgba(255,255,255,0.12)',
}

// hex/rgb -> rgba avec alpha
export function alpha(c, a) {
  if (!c) return `rgba(230,182,49,${a})`
  if (c.startsWith('rgba') || c.startsWith('rgb')) return c
  const n = parseInt(c.replace('#', ''), 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`
}

export const GRAD = {
  // Or "foil martelé" : highlight chaud → or → or profond (3 stops = relief métal)
  gold:     `linear-gradient(135deg, ${C.goldHot} 0%, ${C.gold} 42%, ${C.goldDeep} 100%)`,
  goldDeep: `linear-gradient(135deg, ${C.goldDeep}, ${C.gold})`,
  sea:      `linear-gradient(135deg, ${C.sea}, ${C.seaDeep})`,
  ember:    `linear-gradient(135deg, ${C.ember}, ${C.emberDeep})`,
  // Texte foil (titres héros) : reflet chaud traversant
  goldText: `linear-gradient(100deg, ${C.goldHot} 0%, ${C.goldSoft} 30%, ${C.gold} 58%, ${C.goldDeep} 100%)`,
}

// Fond plein écran maritime + braise (à poser fixed z0 derrière le contenu).
// Plus de couches → vraie profondeur atmosphérique (pas un aplat).
export const pageBg = {
  position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
  background: `
    radial-gradient(1000px 600px at 74% -2%, rgba(51,160,178,0.18), transparent 60%),
    radial-gradient(820px 520px at 12% 14%, rgba(230,182,49,0.10), transparent 62%),
    radial-gradient(700px 700px at 90% 96%, rgba(255,122,61,0.10), transparent 58%),
    radial-gradient(880px 600px at 30% 100%, rgba(25,80,93,0.20), transparent 60%),
    linear-gradient(180deg, #08121f 0%, ${C.bg} 50%, ${C.bgDeep} 100%)`,
}

// Grain de film (texture parchemin/pellicule). Data-URI SVG noise, très léger.
const GRAIN_URI = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E\")"
export const grain = {
  position: 'fixed', inset: 0, zIndex: 1, pointerEvents: 'none', opacity: 0.05,
  backgroundImage: GRAIN_URI, backgroundSize: '160px 160px', mixBlendMode: 'overlay',
}

// Grille de points subtile (texture carte au trésor).
export const dotGrid = {
  position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', opacity: 0.09,
  backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(246,217,120,0.32) 1px, transparent 0)',
  backgroundSize: '26px 26px',
}

// Panneau type carte/parchemin sombre — bord supérieur foil, ombre profonde + glow interne.
export const panel = {
  position: 'relative', overflow: 'hidden',
  background: `linear-gradient(168deg, ${C.surface}, ${C.surface2})`,
  border: `1px solid ${C.hairSoft}`,
  borderTop: `1px solid ${C.hairTop}`,
  borderRadius: 22,
  boxShadow: `0 30px 80px rgba(0,0,0,0.46), inset 0 1px 0 rgba(255,255,255,0.06)`,
  backdropFilter: 'blur(18px) saturate(1.15)', WebkitBackdropFilter: 'blur(18px) saturate(1.15)',
}

// Liseré foil décoratif (à poser en absolute sur un panel pour la touche "poster doré").
export const foilEdge = {
  position: 'absolute', inset: 0, borderRadius: 22, pointerEvents: 'none',
  padding: 1, background: `linear-gradient(135deg, ${alpha(C.goldHot, 0.5)}, transparent 35%, transparent 65%, ${alpha(C.gold, 0.32)})`,
  WebkitMask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
  WebkitMaskComposite: 'xor', maskComposite: 'exclude',
}

// Courbes de spring/ease réutilisables (framer-motion).
export const SPRING = { type: 'spring', stiffness: 420, damping: 30, mass: 0.7 }
export const SPRING_SOFT = { type: 'spring', stiffness: 260, damping: 26 }
export const SPRING_POP = { type: 'spring', stiffness: 560, damping: 18, mass: 0.6 }
export const EASE_OUT = [0.16, 1, 0.3, 1]

// Keyframes communs (injecter une fois via <style>). framer-motion couvre les
// micro-interactions ; ces @keyframes restent pour les boucles infinies & overlays
// purement CSS (pas de coût React), avec respect de prefers-reduced-motion.
export const KEYFRAMES = `
@keyframes bp-spin{to{transform:rotate(360deg)}}
@keyframes bp-pulse{0%,100%{opacity:.55}50%{opacity:1}}
@keyframes bp-livering{0%{transform:scale(.85);opacity:.5}100%{transform:scale(2.3);opacity:0}}
@keyframes bp-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}
@keyframes bp-shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
@keyframes bp-foilsweep{0%{transform:translateX(-130%) skewX(-18deg)}100%{transform:translateX(230%) skewX(-18deg)}}
@keyframes bp-flagwave{0%,100%{transform:rotate(-1.4deg)}50%{transform:rotate(1.4deg)}}
@keyframes bp-bookflip{0%{opacity:0;transform:perspective(900px) rotateY(-22deg) translateX(28px)}100%{opacity:1;transform:perspective(900px) rotateY(0) translateX(0)}}
@keyframes bp-rise{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
@keyframes bp-reveal-in{0%{opacity:0;filter:blur(14px);transform:scale(.92) translateY(18px)}55%{filter:blur(2px)}100%{opacity:1;filter:blur(0);transform:scale(1) translateY(0)}}
@keyframes bp-buildup{0%{opacity:0;transform:scale(.7)}40%{opacity:1}70%{transform:scale(1.06)}100%{opacity:0;transform:scale(1.18)}}
@keyframes bp-confetti{0%{opacity:0;transform:translate(-50%,0) scale(.3) rotate(0)}10%{opacity:1}100%{opacity:0;transform:translate(calc(-50% + var(--bp-dx)),var(--bp-dy)) scale(1) rotate(var(--bp-rot))}}
@keyframes bp-splash{0%{opacity:0;transform:translateY(34px) scale(.86)}18%{opacity:1;transform:translateY(0) scale(1)}82%{opacity:1;transform:translateY(0) scale(1)}100%{opacity:0;transform:translateY(-26px) scale(1.04)}}
@keyframes bp-crown{0%,100%{transform:translateX(-50%) translateY(0) rotate(-7deg)}50%{transform:translateX(-50%) translateY(-3px) rotate(7deg)}}
@keyframes bp-seat-in{from{opacity:0;transform:translate(-50%,-50%) translate(var(--bp-sx,0),var(--bp-sy,0)) scale(.55)}to{opacity:1;transform:translate(-50%,-50%) translate(var(--bp-sx,0),var(--bp-sy,0)) scale(1)}}
@keyframes bp-ready-pop{0%{transform:scale(0) rotate(-40deg)}60%{transform:scale(1.35) rotate(8deg)}100%{transform:scale(1) rotate(0)}}
@keyframes bp-halo{0%,100%{opacity:.4}50%{opacity:.85}}
@keyframes bp-focus{0%{filter:blur(12px);opacity:.55;transform:scale(1.02)}100%{filter:blur(0);opacity:1;transform:scale(1)}}
@keyframes bp-glowpulse{0%,100%{box-shadow:0 16px 38px rgba(168,118,26,0.28)}50%{box-shadow:0 16px 52px rgba(230,182,49,0.6),0 0 0 1px rgba(246,217,120,0.45)}}
@keyframes bp-orbit{from{transform:rotate(0)}to{transform:rotate(360deg)}}
@keyframes bp-tablebob{0%,100%{transform:translate(-50%,-50%) scale(1)}50%{transform:translate(-50%,-50%) scale(1.015)}}
@media (prefers-reduced-motion: reduce){*[data-bp-anim]{animation:none!important}}
@media (prefers-reduced-motion: reduce){.bp-splash,.bp-reveal-scene,.bp-confetti-pc,.bp-seat,.bp-buildup,.bp-foil{animation:none!important}}
`
