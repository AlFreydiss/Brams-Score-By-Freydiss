// ── puzzles.js : positions de tactique « mat en 1 » ET « mat en 2 ».
// Chaque puzzle est AUTO-VALIDÉ au chargement (PuzzleTrainer rejoue TOUTE la solution
// sur une instance Chess neuve et vérifie isCheckmate sur la position finale) : on ne
// peut donc jamais afficher un puzzle dont la ligne ne mate pas réellement.
//  fen      : position (chess.js)
//  joueur   : 'w' | 'b' — camp au trait = celui que tu contrôles (oriente le plateau)
//  solution : coups UCI de la ligne gagnante.
//             · mat en 1 → 1 demi-coup           [coupMatant]
//             · mat en 2 → 3 demi-coups           [coupJoueur, répliqueAdverse, coupMatant]
//  coups    : 1 ou 2 (longueur logique ; sinon dérivée de solution.length dans le trainer)
//  idee     : phrase d'explication (indice + contexte coach)
//
// MAT EN 1 : la validation/jeu accepte n'importe quel coup légal qui donne mat.
// MAT EN 2 : le joueur DOIT jouer solution[0] (le coup forçant), la réplique adverse
//            solution[1] est jouée automatiquement, puis il livre le mat. Les 6 lignes
//            ci-dessous sont des mats forcés vérifiés par moteur (mat contre TOUTE défense).
export const PUZZLES = [
  { id: 'br1', theme: 'Mat du couloir', niveau: 'Facile',
    fen: '6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1', joueur: 'w', solution: ['a1a8'],
    idee: "Le roi noir est étouffé par ses propres pions f7-g7-h7. La tour plonge sur la 8e rangée et mate." },
  { id: 'br2', theme: 'Mat du couloir', niveau: 'Facile',
    fen: '6k1/5ppp/8/8/8/8/8/3R2K1 w - - 0 1', joueur: 'w', solution: ['d1d8'],
    idee: "Même motif : la tour file sur la dernière rangée, le roi n'a aucune case de fuite." },
  { id: 'br3', theme: 'Mat du couloir', niveau: 'Facile',
    fen: '7k/5ppp/8/8/8/8/8/R6K w - - 0 1', joueur: 'w', solution: ['a1a8'],
    idee: "Roi noir coincé en h8 : Ta8 attaque la 8e rangée, fuite impossible." },
  { id: 'q1', theme: 'Mat de la dame', niveau: 'Facile',
    fen: '6k1/5ppp/8/8/8/8/5PPP/Q5K1 w - - 0 1', joueur: 'w', solution: ['a1a8'],
    idee: "La dame balaie toute la 8e rangée. Da8 est mat, le roi est muré par ses pions." },
  { id: 'brb1', theme: 'Mat du couloir (Noirs)', niveau: 'Facile',
    fen: 'r5k1/8/8/8/8/8/5PPP/6K1 b - - 0 1', joueur: 'b', solution: ['a8a1'],
    idee: "À toi de conclure côté noir : le roi blanc est bloqué par f2-g2-h2, la tour mate sur la 1re rangée." },
  { id: 'brb2', theme: 'Mat du couloir (Noirs)', niveau: 'Facile',
    fen: '1r4k1/8/8/8/8/8/5PPP/6K1 b - - 0 1', joueur: 'b', solution: ['b8b1'],
    idee: "Tb1 plonge sur la dernière rangée blanche : le roi g1 est étouffé par ses pions." },

  // ── Mat en 2 (3 demi-coups : ton coup forçant, la réplique forcée, le mat). ──
  { id: 'm2a', theme: 'Mat en 2', niveau: 'Moyen', coups: 2,
    fen: '5r1k/6pp/7N/8/8/1Q6/8/6K1 w - - 0 1', joueur: 'w', solution: ['b3g8', 'f8g8', 'h6f7'],
    idee: "Mat étouffé : Dg8+ force la tour à reprendre (Txg8), puis Cf7 livre le mat — le roi est muré par ses propres pièces." },
  { id: 'm2b', theme: 'Mat en 2', niveau: 'Moyen', coups: 2,
    fen: '2kr4/1p6/2p5/8/2B2B2/8/6Q1/6K1 w - - 0 1', joueur: 'w', solution: ['c4e6', 'd8d7', 'g2g8'],
    idee: "Fe6+ oblige la tour à s'interposer en d7, ce qui dégage la 8e rangée : Dg8 mate le roi enfermé par ses pièces et le fou f4." },
  { id: 'm2c', theme: 'Mat en 2', niveau: 'Moyen', coups: 2,
    fen: 'r5k1/R4ppp/8/8/8/8/Q4PPP/6K1 w - - 0 1', joueur: 'w', solution: ['a2f7', 'g8h8', 'a7a8'],
    idee: "Sacrifice Dxf7+ (la dame est défendue par la tour a7) : le roi n'a que h8, puis Txa8 mate sur la dernière rangée." },
  { id: 'm2d', theme: 'Mat en 2', niveau: 'Moyen', coups: 2,
    fen: '3r2k1/5ppp/2N5/Q7/8/8/5PPP/6K1 w - - 0 1', joueur: 'w', solution: ['c6e7', 'g8h8', 'a5d8'],
    idee: "Échec à la fourchette Ce7+ : le roi fuit en h8, puis Dxd8 capture la tour et mate sur la 8e rangée." },
  { id: 'm2e', theme: 'Mat en 2', niveau: 'Moyen', coups: 2,
    fen: '6k1/8/1q6/8/8/7n/6PP/5R1K b - - 0 1', joueur: 'b', solution: ['b6g1', 'f1g1', 'h3f2'],
    idee: "Côté noir, mat étouffé : Dg1+ force Txg1, puis Cf2 livre le mat — le roi blanc est asphyxié par ses pions et sa tour." },
  { id: 'm2f', theme: 'Mat en 2', niveau: 'Moyen', coups: 2,
    fen: '6k1/6q1/8/8/2b2b2/2P5/1P6/2KR4 b - - 0 1', joueur: 'b', solution: ['c4d3', 'd1d2', 'g7g1'],
    idee: "Côté noir : Fd3+ force la tour à bloquer en d2, ce qui ouvre la 1re rangée, et Dg1 mate le roi muré par ses pièces." },
]
