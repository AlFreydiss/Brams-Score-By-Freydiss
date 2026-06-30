// ─────────────────────────────────────────────────────────────────────────────
// exportNotation — notation internationale d'une partie de dames (cases 1–50).
// Réutilise `moveToNotation` du moteur (engine/notation.js) : "32-28", "23x32"…
// `historique` accepté sous 2 formes :
//   • liste de coups joués { side, n, capture } (game.moves) → on lit `.n`
//   • liste de mouvements moteur { from, to, caps } → on dérive via moveToNotation
// Produit un texte numéroté en paires (Foncé / Clair), prêt à copier/télécharger.
// ─────────────────────────────────────────────────────────────────────────────
import { moveToNotation } from '../../../features/dames/engine/notation.js'

// Normalise un élément d'historique → chaîne de notation internationale.
function notationDe(item) {
  if (!item) return ''
  if (typeof item === 'string') return item
  if (typeof item.n === 'string') return item.n           // game.moves : notation pré-calculée
  if (item.from && item.to) return moveToNotation(item)   // mouvement moteur brut
  return ''
}

export function genererNotation(historique = [], meta = {}) {
  const coups = historique.map(notationDe).filter(Boolean)
  const lignes = []
  for (let i = 0; i < coups.length; i += 2) {
    const n = i / 2 + 1
    const blanc = coups[i] || ''
    const noir = coups[i + 1] || ''
    lignes.push(`${String(n).padStart(2, ' ')}. ${blanc.padEnd(8, ' ')}${noir}`.trimEnd())
  }
  const enTete = [
    'Dames internationales 10×10 — Brams',
    meta.date || new Date().toLocaleDateString('fr-FR'),
    meta.result ? `Résultat : ${meta.result}` : null,
    '',
  ].filter(v => v !== null)
  return `${enTete.join('\n')}${lignes.join('\n')}\n`
}

// Copie presse-papier (avec repli execCommand). Retourne true si OK.
export async function copierPresse(texte) {
  try {
    if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(texte); return true }
  } catch { /* repli ci-dessous */ }
  try {
    const ta = document.createElement('textarea')
    ta.value = texte
    ta.style.position = 'fixed'; ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.focus(); ta.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    return ok
  } catch { return false }
}

// Télécharge le texte comme fichier .txt.
export function telecharger(texte, nom = 'partie-dames.txt', type = 'text/plain;charset=utf-8') {
  try {
    const blob = new Blob([texte], { type })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = nom
    document.body.appendChild(a); a.click(); a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    return true
  } catch { return false }
}
