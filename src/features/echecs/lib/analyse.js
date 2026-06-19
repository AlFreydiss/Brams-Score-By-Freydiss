// ── analyse.js : helpers d'évaluation (eval bar, indice, formatage) ──────────
// Convention : Stockfish renvoie le score du point de vue du camp AU TRAIT.
// On normalise systématiquement vers le point de vue des BLANCS pour l'affichage
// (barre + texte), comme sur lichess / chess.com.

// Score (cp + mate, vus du camp au trait) → score vu des blancs.
// trait : 'w' | 'b'. Retourne { cp, mate } côté blanc (cp en centipions).
export function normaliserVersBlanc({ scoreCp, mate }, trait) {
  const signe = trait === 'w' ? 1 : -1
  return {
    cp: scoreCp == null ? null : scoreCp * signe,
    mate: mate == null ? null : mate * signe,
  }
}

// Centipions (côté blanc) → ratio d'avantage blanc 0..1 (sigmoïde lichess-like).
// 0.5 = égalité, →1 = blancs gagnants. Plafonné pour rester lisible.
export function cpVersRatio(cp) {
  if (cp == null) return 0.5
  // courbe utilisée par lichess (≈ 1/(1+10^(-cp/k))) ; k réglé pour ~+4 ≈ 0.92
  const ratio = 1 / (1 + Math.pow(10, -cp / 400))
  return Math.min(0.98, Math.max(0.02, ratio))
}

// Mat (côté blanc) → ratio extrême mais jamais 0/1 pile (la barre garde un liseré).
export function mateVersRatio(mate) {
  if (mate == null) return 0.5
  return mate > 0 ? 0.99 : 0.01
}

// { cp, mate } côté blanc → ratio 0..1 d'avantage blanc.
export function evalVersRatio({ cp, mate }) {
  if (mate != null) return mateVersRatio(mate)
  return cpVersRatio(cp)
}

// Texte court façon lichess : « +1.4 », « -0.8 », « M3 », « M-2 », « 0.0 ».
export function formaterEval({ cp, mate }) {
  if (mate != null) {
    if (mate === 0) return '#'
    return mate > 0 ? `M${mate}` : `M${mate}`   // mate négatif porte déjà le signe
  }
  if (cp == null) return '–'
  const v = cp / 100
  const signe = v > 0 ? '+' : (v < 0 ? '' : '')
  return `${signe}${v.toFixed(Math.abs(v) >= 10 ? 0 : 1)}`
}

// UCI « e2e4 » / « e7e8q » → { from, to, promotion }.
export function uciVersCoup(uci) {
  if (!uci || uci.length < 4) return null
  return { from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] || undefined }
}

// Wrapper « indice » : depuis le résultat brut de analyser(), renvoie un objet
// prêt pour l'UI (coup conseillé + libellé). trait sert au formatage du score.
export function construireIndice(resultat, trait = 'w') {
  if (!resultat || !resultat.bestMove) return null
  const coup = uciVersCoup(resultat.bestMove)
  const blanc = normaliserVersBlanc(resultat, trait)
  return {
    uci: resultat.bestMove,
    coup,                                   // { from, to, promotion }
    cases: coup ? [coup.from, coup.to] : [],
    texte: coup ? `${coup.from}${coup.to}` : resultat.bestMove,
    evalTexte: formaterEval(blanc),
  }
}

// Construit l'état d'éval normalisé pour la barre depuis un résultat analyser().
export function construireEval(resultat, trait = 'w') {
  if (!resultat) return null
  const blanc = normaliserVersBlanc(resultat, trait)
  return {
    ...blanc,
    ratio: evalVersRatio(blanc),
    texte: formaterEval(blanc),
    bestMove: resultat.bestMove || null,
  }
}
