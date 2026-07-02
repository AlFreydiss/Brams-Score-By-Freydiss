// ─────────────────────────────────────────────────────────────────────────────
// puzzles.js — positions « Trouve la rafle maximale » (Dames internationales 10×10).
// Données PURES (zéro import) : chaque puzzle est AUTO-VALIDÉ au chargement par
// RafleTrainer, qui reconstruit le plateau (makeBoard) et interroge le moteur :
// generateMoves(board, 'P', DEFAULT_RULES) doit renvoyer EXACTEMENT UN coup,
// une capture de `prisesAttendues` pièces (rafle maximale unique). Toute position
// qui ne respecte pas ce contrat est écartée silencieusement — on ne peut donc
// jamais afficher un puzzle faux.
// EN JEU, le trainer désactive `priseMaximale` (prise obligatoire conservée) :
// les rafles courtes restent jouables, sinon le moteur ne proposerait que la
// bonne réponse et on ne pourrait jamais se tromper.
//
//  pieces          : placements [r, c, kind] (format makeBoard de tutorialPositions)
//                    'p' = pion foncé (P) · 'P' = dame foncée · 'c' = pion clair (M)
//                    Le joueur incarne toujours le camp FONCÉ (P), qui monte (r décroissant).
//  prisesAttendues : nombre de pièces capturées par la rafle maximale (≥ 2)
//  difficulte      : 1 = Facile · 2 = Moyen · 3 = Difficile
//  astuce          : coup de pouce textuel (révélé par le bouton Indice)
// ─────────────────────────────────────────────────────────────────────────────
export const RAFLES = [
  // ── Difficulté 1 — voir la rafle de 2 ──────────────────────────────────────
  {
    id: 'r01',
    titre: 'Deux d’un coup',
    pieces: [[7, 2, 'p'], [6, 3, 'c'], [4, 3, 'c'], [7, 6, 'p'], [6, 7, 'c']],
    prisesAttendues: 2,
    difficulte: 1,
    astuce: 'Un de tes deux pions ne peut prendre qu’une pièce — l’autre en enchaîne deux. Compte les prises de chacun avant de choisir.',
  },
  {
    id: 'r02',
    titre: 'La bonne direction',
    pieces: [[6, 7, 'p'], [5, 6, 'c'], [3, 6, 'c'], [5, 8, 'c']],
    prisesAttendues: 2,
    difficulte: 1,
    astuce: 'Vers la droite, la prise s’arrête tout de suite. Vers la gauche, la rafle continue.',
  },
  {
    id: 'r03',
    titre: 'Marche arrière',
    pieces: [[5, 4, 'p'], [6, 5, 'c'], [8, 5, 'c'], [4, 3, 'c']],
    prisesAttendues: 2,
    difficulte: 1,
    astuce: 'Le pion capture aussi en arrière : la rafle la plus longue part vers le bas du damier.',
  },

  // ── Difficulté 2 — rafles de 3 et pièges classiques ────────────────────────
  {
    id: 'r04',
    titre: 'Zigzag',
    pieces: [[8, 3, 'p'], [7, 4, 'c'], [5, 4, 'c'], [3, 4, 'c'], [7, 2, 'c']],
    prisesAttendues: 3,
    difficulte: 2,
    astuce: 'Trois pions clairs attendent sur la même colonne : slalome entre eux au lieu de croquer le pion isolé.',
  },
  {
    id: 'r05',
    titre: 'Gauche ou droite ?',
    pieces: [[7, 4, 'p'], [6, 3, 'c'], [4, 1, 'c'], [6, 5, 'c'], [4, 5, 'c'], [2, 3, 'c']],
    prisesAttendues: 3,
    difficulte: 2,
    astuce: 'Les deux départs semblent bons — mais un seul côté enchaîne trois prises. Compte avant de cliquer.',
  },
  {
    id: 'r06',
    titre: 'Le crochet',
    pieces: [[6, 3, 'p'], [5, 4, 'c'], [3, 4, 'c'], [3, 2, 'c'], [5, 8, 'p'], [4, 7, 'c'], [2, 5, 'c']],
    prisesAttendues: 3,
    difficulte: 2,
    astuce: 'Le pion de droite prend deux pièces… mais celui de gauche en rafle trois en revenant sur ses pas.',
  },
  {
    id: 'r07',
    titre: 'Le mirage de la promotion',
    pieces: [[5, 2, 'p'], [4, 3, 'c'], [2, 3, 'c'], [2, 7, 'p'], [1, 6, 'c']],
    prisesAttendues: 2,
    difficulte: 2,
    astuce: 'Aller à dame en capturant, c’est tentant — mais ce n’est qu’une prise. La rafle de deux passe avant la couronne.',
  },

  // ── Difficulté 3 — grandes rafles et dame volante ──────────────────────────
  {
    id: 'r08',
    titre: 'Grand slalom',
    pieces: [[9, 2, 'p'], [8, 3, 'c'], [6, 3, 'c'], [4, 3, 'c'], [2, 3, 'c'], [8, 7, 'p'], [7, 6, 'c'], [5, 6, 'c']],
    prisesAttendues: 4,
    difficulte: 3,
    astuce: 'Quatre prises d’affilée en zigzag depuis la dernière rangée — l’autre pion n’en offre que deux.',
  },
  {
    id: 'r09',
    titre: 'Aller-retour',
    pieces: [[7, 4, 'p'], [6, 5, 'c'], [4, 5, 'c'], [2, 3, 'c'], [2, 1, 'c'], [6, 9, 'p'], [5, 8, 'c'], [3, 8, 'c']],
    prisesAttendues: 4,
    difficulte: 3,
    astuce: 'Monte, oblique à gauche, puis redescends : la rafle serpente jusqu’au bord du damier.',
  },
  {
    id: 'r10',
    titre: 'La dame balaie tout',
    pieces: [[9, 6, 'P'], [8, 5, 'c'], [6, 3, 'c'], [4, 1, 'c'], [2, 7, 'c']],
    prisesAttendues: 3,
    difficulte: 3,
    astuce: 'La dame prend à distance, mais chaque atterrissage est ici forcé : suis la grande diagonale. Le pion isolé, lui, survivra.',
  },
]
