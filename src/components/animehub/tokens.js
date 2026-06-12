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

// ── Thème par animé : accent, accent clair (dégradé du titre) + police ──────
// Le titre du hero est rendu comme un logo : dégradé accent2→accent dans le
// texte + halo. Fonts chargées à la volée par AnimeHubV2 (Pirata One est déjà
// sur le site). Chacun des 31 animés du catalogue a son thème dédié.
export const THEME_FONT_HREF = 'https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Russo+One&family=Quicksand:wght@600;700&family=Pirata+One&family=Anton&family=Bungee&family=Audiowide&family=Special+Elite&display=swap'

const F_BEBAS  = "'Bebas Neue', sans-serif"      // shōnen percutant
const F_ANTON  = "'Anton', sans-serif"            // épique massif
const F_BUNGEE = "'Bungee', sans-serif"           // urbain blocky
const F_RUSSO  = "'Russo One', sans-serif"        // mecha / SF
const F_AUDIO  = "'Audiowide', sans-serif"        // tech / gaming
const F_QUICK  = "'Quicksand', sans-serif"        // romance / douceur
const F_ELITE  = "'Special Elite', cursive"       // machine à écrire (thriller)
const F_PIRATA = "'Pirata One', system-ui, sans-serif"

export const ANIME_THEMES = {
  // Shōnen / action
  onepiece:            { accent: '#E0524A', accent2: '#F5B04A', font: F_PIRATA },
  reze:                { accent: '#E63946', accent2: '#FF9A8C', font: F_BEBAS },
  bleach:              { accent: '#FF7A1A', accent2: '#FFE0B8', font: F_BUNGEE },
  jjk:                 { accent: '#8B6CFF', accent2: '#4AC6FF', font: F_BEBAS },
  kny:                 { accent: '#3EC1A8', accent2: '#F2788F', font: F_BEBAS },
  hxh:                 { accent: '#69C46B', accent2: '#F5E04A', font: F_BEBAS },
  fireforce:           { accent: '#FF7A1A', accent2: '#FFD24A', font: F_BEBAS },
  bc:                  { accent: '#69C46B', accent2: '#C9F27A', font: F_BEBAS },
  mha:                 { accent: '#57C785', accent2: '#FF7A66', font: F_BEBAS },
  nnt:                 { accent: '#E0524A', accent2: '#F5B04A', font: F_BEBAS },
  // Épique / guerre
  aot:                 { accent: '#A8B576', accent2: '#D6C9A3', font: F_ANTON },
  kingdom:             { accent: '#C9A227', accent2: '#E8D27A', font: F_ANTON },
  dbs:                 { accent: '#FFA133', accent2: '#FFD93D', font: F_ANTON },
  'fate-zero':         { accent: '#C9A227', accent2: '#FFF0C9', font: F_ANTON },
  // SF / tech / gaming
  'kaiju-no-8':        { accent: '#55A8FF', accent2: '#9BE8FF', font: F_RUSSO },
  bluelock:            { accent: '#3FB6FF', accent2: '#8FE8FF', font: F_RUSSO },
  drstone:             { accent: '#6EE76E', accent2: '#B7F77A', font: F_AUDIO },
  sl:                  { accent: '#5B7CFF', accent2: '#B388FF', font: F_AUDIO },
  vivy:                { accent: '#62D8E8', accent2: '#B388FF', font: F_AUDIO },
  // Thriller
  tpn:                 { accent: '#6FCFB6', accent2: '#D9F5EC', font: F_ELITE },
  // Romance / douceur
  kaguya:              { accent: '#E8556D', accent2: '#F5B04A', font: F_QUICK },
  'violet-evergarden': { accent: '#8FB3E8', accent2: '#E8E0C9', font: F_QUICK },
  'your-name':         { accent: '#6FB7E8', accent2: '#F2788F', font: F_QUICK },
  'your-lie':          { accent: '#F2B5C4', accent2: '#8FD4F2', font: F_QUICK },
  bubble:              { accent: '#7FD4E8', accent2: '#F2A6C8', font: F_QUICK },
  'bunny-girl':        { accent: '#A98FE8', accent2: '#F2B5C4', font: F_QUICK },
  'rent-girlfriend':   { accent: '#F26D7E', accent2: '#FFC9D2', font: F_QUICK },
  'domestic-na-kanojo':{ accent: '#F26D7E', accent2: '#C9B6F2', font: F_QUICK },
  'koi-ameagari':      { accent: '#7FD4E8', accent2: '#F2C9A6', font: F_QUICK },
  'love-prism':        { accent: '#F2A6C8', accent2: '#C9B6F2', font: F_QUICK },
  'carole-tuesday':    { accent: '#7FD4E8', accent2: '#F2B5C4', font: F_QUICK },
}

const GENRE_THEMES = [
  ['Romance',         { accent: '#E8556D', accent2: '#F5C9D9', font: F_QUICK }],
  ['Science-fiction', { accent: '#55A8FF', accent2: '#9BE8FF', font: F_RUSSO }],
  ['Action',          { accent: '#E0524A', accent2: '#F5B04A', font: F_BEBAS }],
  ['Drame',           { accent: '#C9A227', accent2: '#E8D27A', font: FONT_DISPLAY }],
]

const THEME_DEFAULT = { accent: C.brass, accent2: '#EBCB88', font: FONT_DISPLAY }

export function themeFor(anime) {
  if (!anime) return THEME_DEFAULT
  if (ANIME_THEMES[anime.id]) return ANIME_THEMES[anime.id]
  for (const [g, t] of GENRE_THEMES) if ((anime.genres || []).includes(g)) return t
  return THEME_DEFAULT
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
