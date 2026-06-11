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

// Titre de section de row (Space Grotesk 600, 18px) — réutilisé partout.
export const sectionTitleStyle = {
  fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: 18, color: C.text,
  letterSpacing: '-0.01em', lineHeight: 1.2,
}
