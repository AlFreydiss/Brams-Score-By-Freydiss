// ── Moteur de Jeu de Dames — pur JS (ESM), zéro dépendance ───────────────────
// Dames internationales 10×10 par défaut : pions capturent en avant ET arrière,
// rafle maximale obligatoire, dames volantes, promotion à l'arrêt seulement.
// Partagé entre l'UI, l'IA et la validation serveur. JSDoc pour les types.
//
// Repère : plateau size×size, cases jouables = foncées ((r+c) impair).
// 'red' en bas (rangées hautes en index), monte vers la rangée 0 (promotion).
// 'black' en haut (index 0..), descend vers la dernière rangée (promotion).

/**
 * @typedef {'red'|'black'} Color
 * @typedef {'man'|'king'} PieceType
 * @typedef {{ color: Color, type: PieceType }} Piece
 * @typedef {Piece|null} Cell
 * @typedef {Cell[][]} Board
 * @typedef {{ from:[number,number], to:[number,number], captures:[number,number][], path:[number,number][], promotion:boolean }} Move
 */

export const RULESETS = {
  international: {
    id: 'international',
    size: 10,
    rowsPerSide: 4,
    flyingKings: true,        // dame volante (longue portée)
    menCaptureBackward: true, // les pions capturent aussi en arrière
    maxCapture: true,         // rafle maximale obligatoire
    promoteOnStopOnly: true,  // promu seulement si on S'ARRÊTE sur la dernière rangée
  },
  english: {
    id: 'english',
    size: 8,
    rowsPerSide: 3,
    flyingKings: false,
    menCaptureBackward: false,
    maxCapture: false,
    promoteOnStopOnly: true,
  },
}

export const DEFAULT_RULESET = RULESETS.international

const DIRS = [[-1, -1], [-1, 1], [1, -1], [1, 1]]

/** Direction "avant" d'un pion selon sa couleur (red monte, black descend). */
function forwardDirs(color) {
  return color === 'red' ? [[-1, -1], [-1, 1]] : [[1, -1], [1, 1]]
}
/** Directions de CAPTURE d'un pion (avant+arrière en internationales, avant seul en anglaises). */
function manCaptureDirs(color, ruleset) {
  return ruleset.menCaptureBackward ? DIRS : forwardDirs(color)
}

const inBounds = (r, c, size) => r >= 0 && c >= 0 && r < size && c < size
const isDark = (r, c) => (r + c) % 2 === 1
const opponent = (color) => (color === 'red' ? 'black' : 'red')

/** @returns {Board} */
export function emptyBoard(size = DEFAULT_RULESET.size) {
  return Array.from({ length: size }, () => Array.from({ length: size }, () => null))
}

/** Copie profonde (immuable). @param {Board} b @returns {Board} */
export function cloneBoard(b) {
  return b.map((row) => row.map((cell) => (cell ? { ...cell } : null)))
}

/** Plateau de départ rempli. @returns {Board} */
export function getInitialBoard(ruleset = DEFAULT_RULESET) {
  const { size, rowsPerSide } = ruleset
  const b = emptyBoard(size)
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (!isDark(r, c)) continue
      if (r < rowsPerSide) b[r][c] = { color: 'black', type: 'man' }
      else if (r >= size - rowsPerSide) b[r][c] = { color: 'red', type: 'man' }
    }
  }
  return b
}

const samePos = (a, br, bc) => a[0] === br && a[1] === bc

/** Promotion ? (pion seulement, arrivée sur la dernière rangée adverse) */
function isPromotion(color, toR, ruleset) {
  return (color === 'red' && toR === 0) || (color === 'black' && toR === ruleset.size - 1)
}

/** @returns {Move} */
function buildMove(path, captures, color, isMan, ruleset) {
  const to = path[path.length - 1]
  const promotion = isMan && isPromotion(color, to[0], ruleset)
  return { from: path[0], to, captures, path, promotion }
}

// ── Génération des captures (récursive, rafle complète) ──────────────────────

/** Captures d'un PION depuis (r,c). @returns {Move[]} séquences terminales */
function manCaptureSequences(board, r, c, color, ruleset) {
  const size = ruleset.size
  const work = cloneBoard(board)
  work[r][c] = null // la pièce est "en main", sa case de départ est libre
  const dirs = manCaptureDirs(color, ruleset)
  /** @type {Move[]} */
  const out = []
  const dfs = (cr, cc, captured, path) => {
    let extended = false
    for (const [dr, dc] of dirs) {
      const ar = cr + dr, ac = cc + dc          // case adjacente (ennemi)
      const lr = cr + 2 * dr, lc = cc + 2 * dc  // case d'arrivée
      if (!inBounds(lr, lc, size)) continue
      const adj = work[ar][ac]
      if (!adj || adj.color === color) continue
      if (captured.some((p) => samePos(p, ar, ac))) continue // déjà capturée ce tour
      if (work[lr][lc] !== null) continue                    // arrivée doit être libre
      extended = true
      dfs(lr, lc, [...captured, [ar, ac]], [...path, [lr, lc]])
    }
    if (!extended && captured.length) out.push(buildMove(path, captured, color, true, ruleset))
  }
  dfs(r, c, [], [[r, c]])
  return out
}

/** Captures d'une DAME volante depuis (r,c). @returns {Move[]} */
function kingCaptureSequences(board, r, c, color, ruleset) {
  const size = ruleset.size
  const work = cloneBoard(board)
  work[r][c] = null
  /** @type {Move[]} */
  const out = []
  const dfs = (cr, cc, captured, path) => {
    let extended = false
    for (const [dr, dc] of DIRS) {
      // 1) avancer sur les cases vides jusqu'à la 1re pièce
      let i = 1, er = -1, ec = -1
      for (; ; i++) {
        const sr = cr + dr * i, sc = cc + dc * i
        if (!inBounds(sr, sc, size)) break
        const cell = work[sr][sc]
        if (cell === null) continue
        // pièce rencontrée
        if (cell.color === color) break // propre pièce → bloque
        if (captured.some((p) => samePos(p, sr, sc))) break // déjà capturée → bloque
        er = sr; ec = sc // ennemi capturable
        break
      }
      if (er < 0) continue
      // 2) cases d'arrivée libres au-delà de l'ennemi (la dame choisit où s'arrêter)
      for (let j = 1; ; j++) {
        const lr = er + dr * j, lc = ec + dc * j
        if (!inBounds(lr, lc, size) || work[lr][lc] !== null) break
        extended = true
        dfs(lr, lc, [...captured, [er, ec]], [...path, [lr, lc]])
      }
    }
    if (!extended && captured.length) out.push(buildMove(path, captured, color, false, ruleset))
  }
  dfs(r, c, [], [[r, c]])
  return out
}

/** Toutes les captures possibles pour `color` (avant filtre rafle max). @returns {Move[]} */
function allCaptureSequences(board, color, ruleset) {
  /** @type {Move[]} */
  const seqs = []
  for (let r = 0; r < ruleset.size; r++) {
    for (let c = 0; c < ruleset.size; c++) {
      const p = board[r][c]
      if (!p || p.color !== color) continue
      if (p.type === 'man') seqs.push(...manCaptureSequences(board, r, c, color, ruleset))
      else if (ruleset.flyingKings) seqs.push(...kingCaptureSequences(board, r, c, color, ruleset))
      else seqs.push(...shortKingCaptureSequences(board, r, c, color, ruleset))
    }
  }
  return seqs
}

/** Captures d'une dame NON volante (anglaises) : comme un pion mais 4 directions. */
function shortKingCaptureSequences(board, r, c, color, ruleset) {
  const size = ruleset.size
  const work = cloneBoard(board)
  work[r][c] = null
  const out = []
  const dfs = (cr, cc, captured, path) => {
    let extended = false
    for (const [dr, dc] of DIRS) {
      const ar = cr + dr, ac = cc + dc, lr = cr + 2 * dr, lc = cc + 2 * dc
      if (!inBounds(lr, lc, size)) continue
      const adj = work[ar][ac]
      if (!adj || adj.color === color) continue
      if (captured.some((p) => samePos(p, ar, ac))) continue
      if (work[lr][lc] !== null) continue
      extended = true
      dfs(lr, lc, [...captured, [ar, ac]], [...path, [lr, lc]])
    }
    if (!extended && captured.length) out.push(buildMove(path, captured, color, false, ruleset))
  }
  dfs(r, c, [], [[r, c]])
  return out
}

// ── Déplacements simples (sans capture) ──────────────────────────────────────

function simpleMoves(board, color, ruleset) {
  const size = ruleset.size
  /** @type {Move[]} */
  const out = []
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const p = board[r][c]
      if (!p || p.color !== color) continue
      if (p.type === 'man') {
        for (const [dr, dc] of forwardDirs(color)) {
          const nr = r + dr, nc = c + dc
          if (inBounds(nr, nc, size) && board[nr][nc] === null) {
            out.push(buildMove([[r, c], [nr, nc]], [], color, true, ruleset))
          }
        }
      } else if (ruleset.flyingKings) {
        for (const [dr, dc] of DIRS) {
          for (let i = 1; ; i++) {
            const nr = r + dr * i, nc = c + dc * i
            if (!inBounds(nr, nc, size) || board[nr][nc] !== null) break
            out.push(buildMove([[r, c], [nr, nc]], [], color, false, ruleset))
          }
        }
      } else {
        for (const [dr, dc] of DIRS) {
          const nr = r + dr, nc = c + dc
          if (inBounds(nr, nc, size) && board[nr][nc] === null) {
            out.push(buildMove([[r, c], [nr, nc]], [], color, false, ruleset))
          }
        }
      }
    }
  }
  return out
}

// ── API publique ─────────────────────────────────────────────────────────────

/**
 * Coups légaux de `color`. Applique DÉJÀ la rafle maximale (internationales).
 * @returns {Move[]}
 */
export function getLegalMoves(board, color, ruleset = DEFAULT_RULESET) {
  const caps = allCaptureSequences(board, color, ruleset)
  if (caps.length) {
    if (!ruleset.maxCapture) return caps
    let max = 0
    for (const m of caps) if (m.captures.length > max) max = m.captures.length
    return caps.filter((m) => m.captures.length === max)
  }
  return simpleMoves(board, color, ruleset)
}

/** Applique un coup (immuable). @returns {Board} nouveau plateau */
export function applyMove(board, move) {
  const nb = cloneBoard(board)
  const [fr, fc] = move.from
  const [tr, tc] = move.to
  const piece = nb[fr][fc]
  if (!piece) return nb
  nb[fr][fc] = null
  for (const [cr, cc] of move.captures) nb[cr][cc] = null
  nb[tr][tc] = move.promotion ? { color: piece.color, type: 'king' } : piece
  return nb
}

function countColor(board, color) {
  let n = 0
  for (const row of board) for (const cell of row) if (cell && cell.color === color) n++
  return n
}

/**
 * Issue de la partie. `colorToMove` = qui doit jouer maintenant.
 * @returns {Color|'draw'|null} null = en cours
 */
export function getOutcome(board, colorToMove, ruleset = DEFAULT_RULESET) {
  if (countColor(board, 'red') === 0) return 'black'
  if (countColor(board, 'black') === 0) return 'red'
  if (getLegalMoves(board, colorToMove, ruleset).length === 0) return opponent(colorToMove)
  return null
}

/** Compte les pièces par couleur/type — pratique pour l'éval IA et les stats. */
export function materialCount(board) {
  const out = { red: { man: 0, king: 0 }, black: { man: 0, king: 0 } }
  for (const row of board) for (const cell of row) if (cell) out[cell.color][cell.type]++
  return out
}

/** Égalité de 2 coups (utile pour matcher le coup choisi dans la liste légale). */
export function movesEqual(a, b) {
  return a && b && a.from[0] === b.from[0] && a.from[1] === b.from[1]
    && a.to[0] === b.to[0] && a.to[1] === b.to[1]
    && a.captures.length === b.captures.length
}
