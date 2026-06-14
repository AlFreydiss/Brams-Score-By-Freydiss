// Brams Phone — tokens de style partagés (One Piece sombre maritime + or "avis de
// recherche"). Inline-styles only ; on réutilise type/fonts de styles/typography.
// Aucune dépendance Tailwind / CSS modules.

export const C = {
  // Fonds (bleu nuit maritime profond, pas de noir pur)
  bg:        '#070b12',
  bgDeep:    '#05080e',
  surface:   'rgba(16,22,34,0.72)',
  surface2:  'rgba(20,27,41,0.66)',
  surfaceFlat: '#101624',
  // Or "avis de recherche" / parchemin
  gold:      '#d7a829',
  goldSoft:  '#e7c25a',
  goldDeep:  '#a87a16',
  parchment: '#e9d9a8',
  // Accents secondaires
  sea:       '#2f7d8c',   // turquoise océan
  seaDeep:   '#1d5763',
  ink:       '#0a0f18',
  // Texte
  text:      '#f3efe2',
  textMut:   'rgba(243,239,226,0.62)',
  textFaint: 'rgba(243,239,226,0.38)',
  // Sémantique
  ok:        '#3fb964',
  warn:      '#e0a51f',
  danger:    '#e0524a',
  // Lignes
  hair:      'rgba(231,194,90,0.14)',
  hairSoft:  'rgba(255,255,255,0.07)',
  hairTop:   'rgba(255,255,255,0.11)',
}

// hex/rgb -> rgba avec alpha
export function alpha(c, a) {
  if (!c) return `rgba(215,168,41,${a})`
  if (c.startsWith('rgba') || c.startsWith('rgb')) return c
  const n = parseInt(c.replace('#', ''), 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`
}

export const GRAD = {
  gold:   `linear-gradient(135deg, ${C.gold}, ${C.goldSoft})`,
  goldDeep: `linear-gradient(135deg, ${C.goldDeep}, ${C.gold})`,
  sea:    `linear-gradient(135deg, ${C.sea}, ${C.seaDeep})`,
  goldText: `linear-gradient(100deg, ${C.goldSoft}, ${C.gold} 55%, ${C.goldDeep})`,
}

// Fond plein écran maritime (à poser fixed z0 derrière le contenu).
export const pageBg = {
  position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
  background: `
    radial-gradient(900px 540px at 72% 4%, rgba(47,125,140,0.16), transparent 62%),
    radial-gradient(760px 480px at 16% 20%, rgba(215,168,41,0.08), transparent 64%),
    radial-gradient(820px 560px at 78% 88%, rgba(29,87,99,0.16), transparent 60%),
    linear-gradient(180deg, #08111c 0%, ${C.bg} 52%, ${C.bgDeep} 100%)`,
}

// Grille de points subtile (texture parchemin/carte).
export const dotGrid = {
  position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', opacity: 0.1,
  backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(231,194,90,0.30) 1px, transparent 0)',
  backgroundSize: '24px 24px',
}

// Panneau type carte/parchemin sombre.
export const panel = {
  position: 'relative', overflow: 'hidden',
  background: `linear-gradient(165deg, ${C.surface}, ${C.surface2})`,
  border: `1px solid ${C.hairSoft}`,
  borderTop: `1px solid ${C.hairTop}`,
  borderRadius: 20,
  boxShadow: '0 26px 70px rgba(0,0,0,0.42)',
  backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
}

// Keyframes communs (injecter une fois via <style>).
export const KEYFRAMES = `
@keyframes bp-spin{to{transform:rotate(360deg)}}
@keyframes bp-pulse{0%,100%{opacity:.55}50%{opacity:1}}
@keyframes bp-livering{0%{transform:scale(.85);opacity:.5}100%{transform:scale(2.3);opacity:0}}
@keyframes bp-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
@keyframes bp-shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
@keyframes bp-flagwave{0%,100%{transform:rotate(-1.4deg)}50%{transform:rotate(1.4deg)}}
@keyframes bp-bookflip{0%{opacity:0;transform:perspective(900px) rotateY(-22deg) translateX(28px)}100%{opacity:1;transform:perspective(900px) rotateY(0) translateX(0)}}
@keyframes bp-rise{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
@media (prefers-reduced-motion: reduce){*[data-bp-anim]{animation:none!important}}
`
