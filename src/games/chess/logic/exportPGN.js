// ─────────────────────────────────────────────────────────────────────────────
// exportPGN — génère un PGN standard valide depuis l'historique chess.js verbose.
// `historique` = [{ san, ... }] (les SAN viennent directement de chess.js → valides).
// `meta` = en-têtes optionnels { event, site, date, white, black, result, ...extra }.
// Produit : balises [Septuple-Tag-Roster] + corps "1. e4 e5 2. Nf3 …" + résultat.
// ─────────────────────────────────────────────────────────────────────────────

// Résultat PGN normalisé. `resultat` interne = 'blanc' | 'noir' | 'nulle' | null.
const RESULT_PGN = { blanc: '1-0', noir: '0-1', nulle: '1/2-1/2' }
function toResultTag(r) { return RESULT_PGN[r] || '*' }

// Date PGN : YYYY.MM.DD (champs inconnus → '??').
function pgnDate(d = new Date()) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const j = String(d.getDate()).padStart(2, '0')
  return `${y}.${m}.${j}`
}

// Échappe les valeurs de balise (guillemets / antislash) comme l'exige la norme PGN.
function escTag(v) { return String(v ?? '').replace(/\\/g, '\\\\').replace(/"/g, '\\"') }

// Corps : numérotation des coups, retour à la ligne souple (~80 colonnes).
function corpsCoups(historique) {
  const tokens = []
  for (let i = 0; i < historique.length; i++) {
    const san = historique[i]?.san
    if (!san) continue
    if (i % 2 === 0) tokens.push(`${i / 2 + 1}.`)
    tokens.push(san)
  }
  // wrap à ~80 colonnes pour un PGN propre.
  const lignes = []
  let ligne = ''
  for (const t of tokens) {
    if (ligne && (ligne.length + 1 + t.length) > 80) { lignes.push(ligne); ligne = t }
    else ligne = ligne ? `${ligne} ${t}` : t
  }
  if (ligne) lignes.push(ligne)
  return lignes.join('\n')
}

export function genererPGN(historique = [], meta = {}) {
  const resultTag = toResultTag(meta.result)
  const tags = [
    ['Event', meta.event || 'Partie amicale'],
    ['Site', meta.site || 'Brams · Échecs'],
    ['Date', meta.date || pgnDate()],
    ['Round', meta.round || '-'],
    ['White', meta.white || 'Blancs'],
    ['Black', meta.black || 'Noirs'],
    ['Result', resultTag],
  ]
  if (meta.eco) tags.push(['ECO', meta.eco])
  if (meta.opening) tags.push(['Opening', meta.opening])
  if (meta.timeControl) tags.push(['TimeControl', meta.timeControl])

  const enTete = tags.map(([k, v]) => `[${k} "${escTag(v)}"]`).join('\n')
  const corps = corpsCoups(historique)
  const mouvements = corps ? `${corps} ${resultTag}` : resultTag
  return `${enTete}\n\n${mouvements}\n`
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

// Télécharge le texte comme fichier (Blob + ancre éphémère).
export function telecharger(texte, nom = 'partie.pgn', type = 'application/x-chess-pgn') {
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
