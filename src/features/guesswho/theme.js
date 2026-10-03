// Guess Who — identité Brams (atelier de gravure) : encre chaude + champagne.
// Repose sur src/theme/tierStudio.js, aucune seconde palette.
import { ink } from '../../theme/tierStudio.js'

export const T = {
  bg: ink.ink800, surface: ink.ink700, raised: ink.ink600, deep: ink.ink900,
  line: ink.line, lineSoft: ink.lineSoft,
  accent: ink.gold500, accentHi: ink.gold400, accentLit: ink.gold300, glow: ink.goldGlow,
  onAccent: '#0B0B0C',
  textHi: ink.textHi, text: ink.text, textMute: ink.textMute, textFaint: ink.textFaint,
  ok: '#7FA38A', danger: '#BE6A5A',
  medal: { gold: '#C7A869', silver: '#A9A9A4', bronze: '#A9774F' },
}

// Archivo seule : chasse large pour les titres (alias « GW Display », défini
// dans GLOBAL_CSS), chasse normale pour l'interface.
export const F = { display: "'GW Display', 'Archivo', system-ui, sans-serif", ui: "'Archivo', system-ui, sans-serif" }
export const LINE = `1px solid ${T.line}`
export const LINE_SOFT = `1px solid ${T.lineSoft}`
export const RADIUS = { sm: 10, md: 14, lg: 18, pill: 999 }
export const SHADOW = {
  soft: '0 1px 2px rgba(0,0,0,.45), 0 8px 24px rgba(0,0,0,.28)',
  lift: '0 2px 4px rgba(0,0,0,.5), 0 14px 36px rgba(0,0,0,.35)',
  inset: 'inset 0 1px 0 rgba(255,255,255,.04)',
}

// Plaque (carte structurelle) : filet fin, dégradé léger, ombre douce.
export function plate(extra = {}) {
  return {
    // légèrement translucide : le spectre du fond se devine derrière
    background: 'linear-gradient(180deg, rgba(30,30,32,0.9) 0%, rgba(22,22,24,0.9) 100%)',
    backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
    border: LINE, borderTopColor: 'rgba(255,255,255,0.09)', borderRadius: RADIUS.lg,
    boxShadow: `${SHADOW.soft}, ${SHADOW.inset}`, ...extra,
  }
}

// Pilule : 'primary' (champagne), 'ghost' (filet), 'danger' (filet brique).
export function pill(kind = 'primary', extra = {}) {
  const skins = {
    primary: { background: T.accent, color: T.onAccent, border: `1px solid ${T.accent}` },
    ghost: { background: 'transparent', color: T.textHi, border: LINE },
    danger: { background: 'transparent', color: T.danger, border: `1px solid ${T.danger}` },
  }
  return { borderRadius: RADIUS.pill, ...(skins[kind] || skins.primary), ...extra }
}

// Étiquette : petite, casse normale (pas de capitales espacées).
export function label(extra = {}) {
  return { fontFamily: F.ui, fontWeight: 600, fontSize: 13, color: T.textMute, ...extra }
}

// Rapport de contraste WCAG entre deux couleurs #RRGGBB.
export function contrast(a, b) {
  const lum = (hex) => {
    const n = parseInt(hex.slice(1), 16)
    const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
      const s = v / 255
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
    })
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
  }
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}
