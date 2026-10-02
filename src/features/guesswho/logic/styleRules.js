// Règles du garde-fou visuel (identité Brams, sobre) : une ligne = une violation.
const RULES = [
  [/(?<![\d.])[2-9]px (solid|dashed)/, 'contour épais (> 1,5 px)'],
  [/['`]\s*-?\d+px -?\d+px 0 /, 'ombre dure décalée'],
  [/\bC\.(yellow|red|cyan)\b/, 'couleur saturée (C.yellow/red/cyan)'],
  [/Dela Gothic|M PLUS 1p/, 'police manga'],
  [/gw-shake|rotateY/, 'secousse / rotation de page'],
  [/repeating-conic-gradient/, 'lignes de vitesse'],
]

export function styleViolations(source) {
  const out = []
  String(source).split(/\r?\n/).forEach((line, i) => {
    // commentaires ignorés ; l'anneau de focus de 2 px est voulu (accessibilité)
    if (/^\s*\/\//.test(line) || /outline\s*:/.test(line)) return
    for (const [re, why] of RULES) if (re.test(line)) out.push(`${i + 1}: ${why}`)
  })
  return out
}
