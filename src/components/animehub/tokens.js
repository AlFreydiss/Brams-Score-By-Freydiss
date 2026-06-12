// ── Tokens DA « Animés & Scans » v2 ──────────────────────────────────────────
// Direction : chrome quasi monochrome (le contenu EST la couleur), UN accent
// laiton. Densité Crunchyroll, sobriété Prime, hero Netflix.
export const C = {
  bg0:    '#0B0E14',                  // fond page (haut)
  bg1:    '#0D111A',                  // fond page (bas)
  panel:  'rgba(13,17,26,0.85)',      // barres sticky (avec blur)
  text:   '#E8EAF0',                  // texte principal
  dim:    '#949AA8',                  // texte secondaire
  faint:  '#59616F',                  // texte tertiaire / placeholders
  hair:   'rgba(255,255,255,0.07)',   // filets
  hair2:  'rgba(255,255,255,0.12)',   // bordures hover
  brass:  '#D7A44A',                  // accent UNIQUE (actif, CTA, progression, étoiles)
  brassHi:'#EBCB88',                  // accent hover
  scrim:  'rgba(11,14,20,1)',         // base des dégradés sur image
}

// rgba("#D7A44A", .4) → "rgba(215,164,74,0.4)"
export function rgba(hex, a = 1) {
  const h = hex.replace('#', '')
  const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`
}

export const FONT_DISPLAY = "'Space Grotesk', 'Inter', system-ui, sans-serif"
export const FONT_BODY    = "'Inter', system-ui, sans-serif"

export const RADIUS_CARD = 12
export const RADIUS_PANEL = 16
export const SHADOW_CARD = '0 18px 40px -22px rgba(0,0,0,.8)'

// ── Thème par animé : accent + police d'affichage (hero, indicateurs) ────────
// Fonts chargées à la volée par AnimeHubV2 (Bebas Neue / Russo One / Quicksand,
// Pirata One est déjà sur le site). Fallback par genre, puis laiton.
export const THEME_FONT_HREF = 'https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Russo+One&family=Quicksand:wght@600;700&family=Pirata+One&display=swap'

export const ANIME_THEMES = {
  onepiece:            { accent: '#E0524A', font: "'Pirata One', system-ui, sans-serif" },
  reze:                { accent: '#E63946', font: "'Bebas Neue', sans-serif" },
  bleach:              { accent: '#FF7A1A', font: "'Bebas Neue', sans-serif" },
  jjk:                 { accent: '#8B6CFF', font: "'Bebas Neue', sans-serif" },
  aot:                 { accent: '#A8B576', font: "'Bebas Neue', sans-serif" },
  kny:                 { accent: '#3EC1A8', font: "'Bebas Neue', sans-serif" },
  dbs:                 { accent: '#FFA133', font: "'Bebas Neue', sans-serif" },
  hxh:                 { accent: '#69C46B', font: "'Bebas Neue', sans-serif" },
  'fate-zero':         { accent: '#C9A227', font: "'Bebas Neue', sans-serif" },
  bluelock:            { accent: '#3FB6FF', font: "'Russo One', sans-serif" },
  drstone:             { accent: '#6EE76E', font: "'Russo One', sans-serif" },
  'kaiju-no-8':        { accent: '#55A8FF', font: "'Russo One', sans-serif" },
  vivy:                { accent: '#62D8E8', font: "'Russo One', sans-serif" },
  kaguya:              { accent: '#E8556D', font: "'Quicksand', sans-serif" },
  'violet-evergarden': { accent: '#8FB3E8', font: "'Quicksand', sans-serif" },
  'your-name':         { accent: '#6FB7E8', font: "'Quicksand', sans-serif" },
  'your-lie':          { accent: '#F2B5C4', font: "'Quicksand', sans-serif" },
  bubble:              { accent: '#7FD4E8', font: "'Quicksand', sans-serif" },
}

const GENRE_THEMES = [
  ['Romance',         { accent: '#E8556D', font: "'Quicksand', sans-serif" }],
  ['Science-fiction', { accent: '#55A8FF', font: "'Russo One', sans-serif" }],
  ['Action',          { accent: '#E0524A', font: "'Bebas Neue', sans-serif" }],
  ['Drame',           { accent: '#C9A227', font: FONT_DISPLAY }],
]

export function themeFor(anime) {
  if (!anime) return { accent: C.brass, font: FONT_DISPLAY }
  if (ANIME_THEMES[anime.id]) return ANIME_THEMES[anime.id]
  for (const [g, t] of GENRE_THEMES) if ((anime.genres || []).includes(g)) return t
  return { accent: C.brass, font: FONT_DISPLAY }
}

// Texte foncé sur accent clair, blanc sur accent sombre (boutons, badges).
export function onAccent(hex) {
  const h = hex.replace('#', '')
  const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16)
  const lum = 0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)
  return lum > 150 ? '#14110A' : '#fff'
}

// Titre de section de row (Space Grotesk 600, 18px) — réutilisé partout.
export const sectionTitleStyle = {
  fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: 18, color: C.text,
  letterSpacing: '-0.01em', lineHeight: 1.2,
}
