// ── puzzles.js : positions de tactique « mat en 1 ».
// Chaque puzzle est AUTO-VALIDÉ au chargement (PuzzleTrainer rejoue la solution et
// vérifie isCheckmate) : on ne peut donc jamais afficher un puzzle dont la solution
// ne mate pas réellement. La `solution` sert à l'indice (case de départ) et au coach ;
// la VALIDATION accepte n'importe quel coup qui donne mat (pédagogiquement correct).
//  fen      : position (chess.js)
//  joueur   : 'w' | 'b' — camp au trait = celui que tu contrôles (oriente le plateau)
//  solution : coups UCI de la ligne gagnante (ici 1 demi-coup)
//  idee     : phrase d'explication (indice + contexte coach)
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
]
