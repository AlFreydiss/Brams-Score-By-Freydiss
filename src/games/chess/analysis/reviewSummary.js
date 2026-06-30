// ── reviewSummary.js : agrégats « Game Review » pour AnalysisPanel ────────────
// Dérive, depuis le `resultat` d'analyzeGame, les éléments de l'en-tête récap :
//   - compteurs globaux (Brillant / Excellent / Imprécision / Gaffe), 2 camps confondus
//   - le coup le plus critique (plus grosse perte de win%) = le tournant de la partie
//   - un message texte décrivant la partie pour le coach IA (/api/chat mode coach)
//
// « Brillant » : l'analyse moteur ne produit pas de glyphe '!!'. On qualifie de brillant
// un coup excellent quasi parfait (perte de win% quasi nulle = le joueur a trouvé le
// meilleur coup du moteur). C'est un SOUS-ENSEMBLE strict des excellents, donc
// Brillant + Excellent = total des '!' (cohérent avec les barres de précision par camp).

const SEUIL_BRILLANT = 0.2   // perte de win% (en points) sous laquelle un '!' devient « brillant »
const SEUIL_TOURNANT = 2     // perte minimale (points de win%) pour qu'un coup soit un vrai tournant

// Compteurs agrégés sur les deux camps.
export function compteursGlobaux(resultat) {
  const coups = resultat?.coups || []
  let brillants = 0, excellents = 0, imprecisions = 0, gaffes = 0
  for (const c of coups) {
    if (c.glyphe === '??') gaffes++
    else if (c.glyphe === '?') imprecisions++
    else if (c.glyphe === '!') {
      if (c.perte <= SEUIL_BRILLANT) brillants++
      else excellents++
    }
  }
  return { brillants, excellents, imprecisions, gaffes }
}

// Numéro affiché d'un coup : « 14. » (Blancs) ou « 14… » (Noirs).
export function numeroCoup(ply, color) {
  return `${Math.floor(ply / 2) + 1}.${color === 'b' ? '…' : ''}`
}

// Coup le plus critique = plus grosse perte de win%. null si la partie est « propre ».
export function coupCritique(resultat) {
  const coups = resultat?.coups || []
  let pire = null
  for (const c of coups) {
    if (!pire || c.perte > pire.perte) pire = c
  }
  if (!pire || pire.perte < SEUIL_TOURNANT) return null
  return {
    ply: pire.ply,
    san: pire.san,
    color: pire.color,
    perte: pire.perte,
    numero: numeroCoup(pire.ply, pire.color),
  }
}

// Message décrivant TOUTE la partie pour le coach IA (bilan pédagogue FR).
export function construireMessageBilan(resultat) {
  const b = resultat?.blancs || {}
  const n = resultat?.noirs || {}
  const crit = coupCritique(resultat)
  const camp = (data, nom) =>
    `${nom} : précision ${data.precision ?? '?'}% — ${data.blunders || 0} gaffe(s), `
    + `${data.imprecisions || 0} imprécision(s), ${data.excellents || 0} excellent(s), `
    + `perte moyenne ${data.perteMoyenne ?? '?'}% de probabilité de gain.`

  const lignes = [
    "Fais le BILAN d'une partie d'échecs TERMINÉE. Ce n'est pas une position à analyser mais un résumé global de toute la partie, à partir des statistiques ci-dessous.",
    camp(b, 'Blancs'),
    camp(n, 'Noirs'),
    crit
      ? `Moment le plus critique : coup ${crit.numero} ${crit.san} (joué par les ${crit.color === 'w' ? 'Blancs' : 'Noirs'}), qui a coûté ${Math.round(crit.perte)}% de probabilité de gain — c'est le tournant de la partie.`
      : "Aucun coup n'a vraiment fait basculer la partie : jeu régulier des deux côtés.",
    "Rédige UN SEUL paragraphe de 4 à 6 phrases, pédagogue et bienveillant, en français au tutoiement : dis qui a mieux joué et pourquoi, explique le moment clé, puis termine par UN conseil concret de progression. Texte brut, sans listes, sans titres, sans notation de position.",
  ]
  return lignes.join('\n')
}
