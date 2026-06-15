// ── Brams Tier Studio — palette « atelier de gravure » (warm-ink + champagne) ─
// Encre chaude, laiton patiné, typo gravée. Sobre, premium. Zéro bloc saturé.
// Référencé en inline dans les style={{}} ; keyframes/letterpress → <style> scopé.

export const ink = {
  ink900: '#080809', // fond le plus profond
  ink800: '#0B0B0C', // fond de page (base sombre neutre)
  ink700: '#161618', // surface / cartes
  ink600: '#1E1E20', // élevé / hover
  line:   'rgba(255,255,255,0.07)', // bordures fines
  lineSoft: 'rgba(255,255,255,0.05)', // hairlines
  gold500: '#C7A869', // champagne mat, accent principal
  gold400: '#D9C190', // champagne clair (hover)
  gold300: '#E3D2A6', // champagne lumineux (emphase texte)
  goldGlow: 'rgba(199,168,105,0.06)', // halo réduit au minimum
  textHi:   '#EDEAE3', // off-white chaud (titres)
  text:     '#C7C2B8', // corps
  textMute: '#9A958B', // secondaire gris chaud désaturé
  textFaint:'#6B675F',
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
    background: 'linear-gradient(180deg, #1E1E20 0%, #161618 100%)',
    border: `1px solid ${ink.line}`,
    borderTopColor: 'rgba(255,255,255,0.08)',
    boxShadow: '0 1px 2px rgba(0,0,0,.45), inset 0 1px 0 rgba(255,255,255,.04)',
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
    textShadow: '0 1px 0 rgba(0,0,0,.6), 0 -1px 0 rgba(255,255,255,.04)',
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

// Bouton primaire — outline premium : fill sombre, bordure fine champagne, texte
// champagne. Zéro glow (le relief vient d'un dégradé champagne très subtil).
export function btnPrimary(extra = {}) {
  return {
    background: 'linear-gradient(180deg, rgba(199,168,105,0.16), rgba(199,168,105,0.07))',
    color: ink.gold400,
    border: '1px solid rgba(199,168,105,0.45)',
    borderRadius: 10,
    fontFamily: fonts.ui,
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: 'none',
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
