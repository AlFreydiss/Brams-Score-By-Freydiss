// ── Brams Tier Studio — palette « atelier de gravure » (warm-ink + champagne) ─
// Encre chaude, laiton patiné, typo gravée. Sobre, premium. Zéro bloc saturé.
// Référencé en inline dans les style={{}} ; keyframes/letterpress → <style> scopé.

export const ink = {
  ink900: '#0D0B07', // fond le plus profond (noir chaud)
  ink800: '#14110B', // fond de page
  ink700: '#1C1810', // surface / cartes
  ink600: '#262017', // élevé / hover
  line:   '#322A1E', // bordures
  lineSoft: 'rgba(212,180,131,0.08)', // hairlines teintées or
  gold500: '#C9A86A', // champagne, accent principal
  gold400: '#D9BE85', // or clair (highlights)
  gold300: '#E8D5A8', // texte or (emphase)
  goldGlow: 'rgba(201,168,106,0.15)',
  textHi:   '#F3ECDD', // blanc chaud (titres)
  text:     '#C9C0AE', // corps (gris chaud)
  textMute: '#8A8270', // légendes
  textFaint:'#5A5446',
}

// Accents de tier MATS (heat-map désaturée, descendante). Défauts — l'user peut
// toujours changer la couleur d'un tier. Nommés (legacy) + ordonnés (par position).
export const tierAccents = {
  ZENO:               '#D4B483', // champagne (apex / divin)
  DAIKAISHIN:         '#BE6A5A', // brique mat
  ANGES:              '#C2864E', // ambre mat
  BEST:               '#5E83A6', // acier bleuté mat
  ELITES:             '#8270A6', // améthyste mat
  GREATEST_UNIVERSAL: '#4E8290', // sarcelle mat
  GREAT:              '#6E60A0', // indigo mat
  VERY_GOOD:          '#5A5080', // violet profond mat
  GOOD:               '#806080', // prune mat
}

// Échelle d'accents mats par position (du plus haut tier au plus bas).
export const MAT_ACCENTS = [
  '#D4B483', '#BE6A5A', '#C2864E', '#5E83A6', '#8270A6',
  '#4E8290', '#6E60A0', '#5A5080', '#806080', '#6E6456',
]
export const matAccent = (i) => MAT_ACCENTS[i % MAT_ACCENTS.length]

// Palette de couleurs proposée au color-picker des tiers (mate, patinée).
export const TIER_ACCENT_PALETTE = [...MAT_ACCENTS, ink.gold500, '#9A8A6A', '#7A8C6E']

export const fonts = {
  display: "'Fraunces', Georgia, serif",      // titres + nom de liste
  ui:      "'Hanken Grotesk', system-ui, sans-serif", // UI / corps
}

// ── Recettes de style (composables dans les style={{}}) ──────────────────────

// Plaque laiton gravée (label de tier, cartes structurelles).
export function plaque(extra = {}) {
  return {
    background: 'linear-gradient(180deg, #2A2318 0%, #1C1710 100%)',
    border: `1px solid ${ink.line}`,
    borderTopColor: 'rgba(212,180,131,0.14)',
    boxShadow: '0 1px 2px rgba(0,0,0,.4), inset 0 1px 0 rgba(212,180,131,.06)',
    ...extra,
  }
}

// Label gravé dans le laiton (teinté de l'accent du tier).
export function engravedLabel(accent, extra = {}) {
  return {
    color: accent,
    fontFamily: fonts.display,
    fontVariant: 'small-caps',
    fontWeight: 500,
    letterSpacing: '.12em',
    textShadow: '0 1px 0 rgba(0,0,0,.6), 0 -1px 0 rgba(212,180,131,.05)',
    ...extra,
  }
}

// Carte encre chaude (decks, persos, listes commu).
export function card(extra = {}) {
  return {
    background: ink.ink700,
    border: `1px solid ${ink.line}`,
    borderRadius: 14,
    boxShadow: '0 1px 2px rgba(0,0,0,.35)',
    ...extra,
  }
}

// Bouton primaire (or plein).
export function btnPrimary(extra = {}) {
  return {
    background: `linear-gradient(180deg, ${ink.gold400}, ${ink.gold500})`,
    color: '#1A1410',
    border: '1px solid rgba(232,213,168,0.5)',
    borderRadius: 10,
    fontFamily: fonts.ui,
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,.25)',
    ...extra,
  }
}

// Bouton ghost (transparent, hairline).
export function btnGhost(extra = {}) {
  return {
    background: 'transparent',
    color: ink.textHi,
    border: `1px solid ${ink.line}`,
    borderRadius: 10,
    fontFamily: fonts.ui,
    fontWeight: 600,
    cursor: 'pointer',
    ...extra,
  }
}

// Caption (label MAJ, espacée).
export const caption = {
  fontFamily: fonts.ui,
  fontSize: 11.5,
  fontWeight: 500,
  letterSpacing: '.08em',
  textTransform: 'uppercase',
  color: ink.textMute,
}
