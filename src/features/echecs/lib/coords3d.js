// Mapping cases d'échecs ↔ coordonnées 3D, et FEN → liste de pièces.
// Repère : plateau centré à l'origine, case de 1 unité. Fichier a..h → x,
// rangée 1..8 → z. 'white' face au joueur (z+ devant). y=0 (posées sur le plateau).
const FICHIERS = 'abcdefgh'

export function squareVers3D(square, orientation = 'white') {
  const f = FICHIERS.indexOf(square[0])        // 0..7
  const r = parseInt(square[1], 10) - 1         // 0..7
  let x = f - 3.5
  let z = 3.5 - r
  if (orientation === 'black') { x = -x; z = -z }
  return [x, 0, z]
}

// FEN champ 1 = placement (rangées 8→1, séparées par '/'). Majuscule = blanc.
export function piecesDepuisFen(fen) {
  const placement = String(fen).split(' ')[0]
  const rangs = placement.split('/')
  const out = []
  for (let i = 0; i < 8; i++) {
    const r = 8 - i
    let f = 0
    for (const ch of rangs[i] || '') {
      if (/\d/.test(ch)) { f += parseInt(ch, 10); continue }
      out.push({
        square: FICHIERS[f] + r,
        type: ch.toLowerCase(),
        couleur: ch === ch.toUpperCase() ? 'w' : 'b',
      })
      f++
    }
  }
  return out
}
