// Tests moteur dames 3D — `node --test src/features/dames/engine/*.test.js`
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { SIZE, P, M, isDark, initBoard, generateMoves, applyMove, countPieces, gameStatus, opp, DEFAULT_RULES } from './draughts-engine.js'

const empty = () => Array.from({ length: SIZE }, () => Array(SIZE).fill(null))
const emptyN = (size) => Array.from({ length: size }, () => Array(size).fill(null))

test('initBoard : 20 pièces par camp, sur cases foncées', () => {
  const b = initBoard()
  assert.equal(countPieces(b, P), 20)
  assert.equal(countPieces(b, M), 20)
  for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) if (b[r][c]) assert.ok(isDark(r, c), `pièce sur case claire ${r},${c}`)
})

test('ouverture : que des déplacements (aucune capture)', () => {
  const moves = generateMoves(initBoard(), P)
  assert.ok(moves.length > 0)
  assert.ok(moves.every(m => !m.isCapture))
})

test('rafle MAXIMALE : la double prime sur la simple (tous pions confondus)', () => {
  const b = empty()
  b[4][5] = { side: P, king: false }   // peut faire une double (4,5)->(2,3)->(0,1)
  b[3][4] = { side: M, king: false }; b[1][2] = { side: M, king: false }
  b[6][3] = { side: P, king: false }   // peut faire une simple (6,3)->(4,1)
  b[5][2] = { side: M, king: false }
  const moves = generateMoves(b, P)
  assert.ok(moves.length > 0)
  assert.ok(moves.every(m => m.isCapture && m.caps.length === 2), 'seules les rafles max (2) doivent rester')
})

test('dame volante : capture à distance', () => {
  const b = empty()
  b[8][1] = { side: P, king: true }
  b[5][4] = { side: M, king: false }   // sur la diagonale (8,1)->(5,4), case d\'arrivée libre au-delà
  const moves = generateMoves(b, P)
  assert.ok(moves.some(m => m.isCapture && m.caps.some(([cr, cc]) => cr === 5 && cc === 4)), 'la dame doit capturer à distance')
})

test('promotion en dame sur la dernière rangée', () => {
  const b = empty()
  b[1][2] = { side: P, king: false }
  const mv = generateMoves(b, P).find(m => m.to[0] === 0)
  assert.ok(mv, 'le pion doit pouvoir avancer en rangée 0')
  const res = applyMove(b, mv)
  assert.equal(res.promoted, true)
  assert.equal(res.board[mv.to[0]][mv.to[1]].king, true)
})

test('gameStatus : sans coup légal = perdu', () => {
  const b = empty()
  b[0][1] = { side: P, king: false }   // bloqué au bord, aucun coup vers l\'avant
  // pion P en (0,1) ne peut pas avancer (déjà rangée 0) ni capturer → pas de coup
  assert.equal(generateMoves(b, P).length, 0)
  assert.equal(gameStatus(b, P).over, true)
})

test('invariant serveur : autopartie — chaque coup appliqué est légal, pas de crash', () => {
  let b = initBoard(), side = P, plies = 0
  while (plies < 300) {
    const moves = generateMoves(b, side)
    if (moves.length === 0) break
    const mv = moves[(Math.random() * moves.length) | 0]
    // c'est exactement ce que vérifie /api/dames : le coup DOIT être dans generateMoves
    assert.ok(moves.includes(mv))
    b = applyMove(b, mv).board
    side = opp(side); plies++
  }
  assert.ok(plies > 0)
  assert.ok(countPieces(b, P) >= 0 && countPieces(b, M) >= 0)
})

// ─────────────────────────────────────────────────────────────────────────────
// VARIANTES — paramètre `rules` configurable
// ─────────────────────────────────────────────────────────────────────────────

test('init 10×10 défaut : layout cases sombres, M rangées 0-3, P rangées 6-9', () => {
  const b = initBoard()
  assert.equal(SIZE, 10)
  assert.equal(countPieces(b, M), 20)
  assert.equal(countPieces(b, P), 20)
  for (let r = 0; r < 10; r++) for (let c = 0; c < 10; c++) {
    const p = b[r][c]
    if (r <= 3 && isDark(r, c)) { assert.equal(p.side, M); assert.equal(p.king, false) }
    else if (r >= 6 && isDark(r, c)) { assert.equal(p.side, P); assert.equal(p.king, false) }
    else assert.equal(p, null, `case ${r},${c} doit être vide`)
  }
})

test('init 8×8 : 12 pions chacun, 3 rangées', () => {
  const b = initBoard({ size: 8 })
  assert.equal(b.length, 8)
  assert.equal(countPieces(b, M), 12)
  assert.equal(countPieces(b, P), 12)
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
    const p = b[r][c]
    if (r <= 2 && isDark(r, c)) assert.equal(p.side, M)
    else if (r >= 5 && isDark(r, c)) assert.equal(p.side, P)
    else assert.equal(p, null)
  }
})

// Position au choix entre rafle double (2) et capture simple (1).
function doubleCaptureBoard() {
  const b = empty()
  b[6][5] = { side: P, king: false }
  b[5][4] = { side: M, king: false }   // (6,5)->(4,3) ...
  b[3][4] = { side: M, king: false }   // ... ->(2,5) = double
  b[5][6] = { side: M, king: false }   // alternative simple (6,5)->(4,7)
  return b
}

test('priseMaximale défaut : seule la rafle la plus longue est légale', () => {
  const moves = generateMoves(doubleCaptureBoard(), P)
  assert.ok(moves.length > 0)
  assert.ok(moves.every(m => m.caps.length === 2), 'toutes les captures = longueur max 2')
})

test('priseMaximale:false : une capture plus courte devient légale', () => {
  const moves = generateMoves(doubleCaptureBoard(), P, { priseMaximale: false })
  const lengths = new Set(moves.map(m => m.caps.length))
  assert.ok(lengths.has(1), 'capture simple présente')
  assert.ok(lengths.has(2), 'rafle double aussi présente')
})

test('priseObligatoire défaut : que des captures quand une existe', () => {
  const b = empty()
  b[6][5] = { side: P, king: false }
  b[5][4] = { side: M, king: false }
  const moves = generateMoves(b, P)
  assert.ok(moves.length > 0 && moves.every(m => m.isCapture))
})

test('priseObligatoire:false : un coup tranquille coexiste avec une capture', () => {
  const b = empty()
  b[6][5] = { side: P, king: false }
  b[5][4] = { side: M, king: false }
  const moves = generateMoves(b, P, { priseObligatoire: false })
  assert.ok(moves.some(m => m.isCapture), 'capture présente')
  assert.ok(moves.some(m => !m.isCapture), 'coup tranquille présent')
})

test('dameVolante défaut : la dame atteint une case lointaine', () => {
  const b = empty()
  b[9][0] = { side: P, king: true }
  const moves = generateMoves(b, P)
  assert.ok(moves.some(m => m.to[0] === 0 && m.to[1] === 9), 'glisse jusqu’au coin opposé')
})

test('dameVolante:false : la dame est limitée à 1 case', () => {
  const b = empty()
  b[9][0] = { side: P, king: true }
  const moves = generateMoves(b, P, { dameVolante: false })
  assert.ok(moves.length > 0)
  assert.ok(moves.every(m => Math.abs(m.to[0] - 9) === 1 && Math.abs(m.to[1] - 0) === 1),
    'dame courte = exactement 1 case en diagonale')
})

test('promotion 8×8 : M promu en r=7 (size-1), pas en 10×10', () => {
  const b8 = emptyN(8); b8[6][3] = { side: M, king: false }
  const r8 = applyMove(b8, { from: [6, 3], to: [7, 4], caps: [] }, { size: 8 })
  assert.ok(r8.promoted && r8.board[7][4].king)

  const b10 = empty(); b10[6][3] = { side: M, king: false }
  const r10 = applyMove(b10, { from: [6, 3], to: [7, 4], caps: [] })
  assert.ok(!r10.promoted && !r10.board[7][4].king, 'r=7 ne promeut pas en 10×10')
})

test('back-compat : generateMoves sans rules === avec DEFAULT_RULES', () => {
  const b = initBoard()
  assert.deepEqual(generateMoves(b, P), generateMoves(b, P, DEFAULT_RULES))
  const b2 = doubleCaptureBoard()
  assert.deepEqual(generateMoves(b2, P), generateMoves(b2, P, DEFAULT_RULES))
})
