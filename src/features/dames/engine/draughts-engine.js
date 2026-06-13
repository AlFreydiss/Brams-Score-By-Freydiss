// ─────────────────────────────────────────────────────────────────────────────
// MOTEUR — Dames internationales 10×10 (Pirates P / Marine M)
// 100% DOM-free, ESM pur → réutilisable tel quel dans une Edge Function Deno
// pour valider les coups côté serveur (anti-triche). Rafle MAXIMALE + dames
// volantes. Porté verbatim du prototype testé (11 tests + partie aléatoire OK).
// ─────────────────────────────────────────────────────────────────────────────
export const SIZE = 10
export const P = 'P'   // Pirates (jouent vers le haut, r décroissant)
export const M = 'M'   // Marine  (jouent vers le bas, r croissant)
const DIAG = [[-1, -1], [-1, 1], [1, -1], [1, 1]]
export const isDark = (r, c) => (r + c) % 2 === 1
const inB = (r, c) => r >= 0 && r < SIZE && c >= 0 && c < SIZE
export const opp = (s) => (s === P ? M : P)
const fwd = (s) => (s === P ? -1 : 1)
const KEY = (r, c) => r * SIZE + c

export function initBoard() {
  const b = Array.from({ length: SIZE }, () => Array(SIZE).fill(null))
  for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) {
    if (!isDark(r, c)) continue
    if (r <= 3) b[r][c] = { side: M, king: false }
    else if (r >= 6) b[r][c] = { side: P, king: false }
  }
  return b
}
export const cloneBoard = (b) => b.map(row => row.map(c => (c ? { ...c } : null)))

// Toutes les séquences de capture possibles depuis (r,c) (récursif, multi-saut).
export function pieceCaptures(board, r, c) {
  const orig = board[r][c]; if (!orig) return []
  board[r][c] = null
  const seqs = []; const captured = new Set()
  function rec(cr, cc, path, caps) {
    let ext = false
    if (!orig.king) {
      for (const [dr, dc] of DIAG) {
        const er = cr + dr, ec = cc + dc, lr = cr + 2 * dr, lc = cc + 2 * dc
        if (!inB(er, ec) || !inB(lr, lc)) continue
        if (captured.has(KEY(er, ec))) continue
        const ep = board[er][ec]
        if (!ep || ep.side === orig.side) continue
        if (board[lr][lc]) continue
        ext = true; captured.add(KEY(er, ec))
        rec(lr, lc, [...path, [lr, lc]], [...caps, [er, ec]])
        captured.delete(KEY(er, ec))
      }
    } else {
      for (const [dr, dc] of DIAG) {
        let k = 1, enemy = null
        while (true) {
          const sr = cr + dr * k, sc = cc + dc * k
          if (!inB(sr, sc)) break
          if (captured.has(KEY(sr, sc))) break
          const sp = board[sr][sc]
          if (sp) { if (sp.side !== orig.side) enemy = [sr, sc]; break }
          k++
        }
        if (!enemy) continue
        const [er, ec] = enemy; const d = (er - cr) / dr; let j = d + 1
        while (true) {
          const lr = cr + dr * j, lc = cc + dc * j
          if (!inB(lr, lc)) break
          if (captured.has(KEY(lr, lc)) || board[lr][lc]) break
          ext = true; captured.add(KEY(er, ec))
          rec(lr, lc, [...path, [lr, lc]], [...caps, [er, ec]])
          captured.delete(KEY(er, ec)); j++
        }
      }
    }
    if (!ext && caps.length > 0) seqs.push({ path, caps })
  }
  rec(r, c, [], []); board[r][c] = orig; return seqs
}

// Coups légaux pour `side`. Rafle MAXIMALE imposée (on ne garde que les captures
// les plus longues s'il en existe).
export function generateMoves(board, side) {
  let caps = []
  for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) {
    const p = board[r][c]
    if (p && p.side === side) for (const s of pieceCaptures(board, r, c))
      caps.push({ from: [r, c], path: s.path, caps: s.caps, count: s.caps.length })
  }
  if (caps.length) {
    const max = Math.max(...caps.map(m => m.count))
    return caps.filter(m => m.count === max).map(m => ({ ...m, isCapture: true, to: m.path[m.path.length - 1] }))
  }
  const moves = []
  for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) {
    const p = board[r][c]; if (!p || p.side !== side) continue
    if (!p.king) {
      for (const dc of [-1, 1]) {
        const nr = r + fwd(side), nc = c + dc
        if (inB(nr, nc) && isDark(nr, nc) && !board[nr][nc])
          moves.push({ from: [r, c], to: [nr, nc], path: [[nr, nc]], caps: [], isCapture: false })
      }
    } else {
      for (const [dr, dc] of DIAG) {
        let k = 1
        while (true) {
          const nr = r + dr * k, nc = c + dc * k
          if (!inB(nr, nc) || board[nr][nc]) break
          moves.push({ from: [r, c], to: [nr, nc], path: [[nr, nc]], caps: [], isCapture: false }); k++
        }
      }
    }
  }
  return moves
}

export function applyMove(board, mv) {
  const b = cloneBoard(board); const [fr, fc] = mv.from; const piece = b[fr][fc]
  b[fr][fc] = null; for (const [cr, cc] of mv.caps) b[cr][cc] = null
  const [tr, tc] = mv.to; let promoted = false
  if (!piece.king && ((piece.side === P && tr === 0) || (piece.side === M && tr === SIZE - 1))) { piece.king = true; promoted = true }
  b[tr][tc] = piece; return { board: b, promoted }
}
export function countPieces(board, side) { let n = 0; for (const row of board) for (const c of row) if (c && c.side === side) n++; return n }
export function gameStatus(board, side) { return { over: generateMoves(board, side).length === 0, winner: opp(side) } }

// Deux coups identiques ? (utile pour valider un coup reçu côté serveur)
export function movesEqual(a, b) {
  if (!a || !b) return false
  if (a.from[0] !== b.from[0] || a.from[1] !== b.from[1]) return false
  if (a.to[0] !== b.to[0] || a.to[1] !== b.to[1]) return false
  return (a.caps?.length || 0) === (b.caps?.length || 0)
}

// ── IA : minimax + alpha-beta + garde-temps (porté verbatim) ──────────────────
let searchDeadline = 0
export function evaluate(board) {
  let s = 0
  for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) {
    const p = board[r][c]; if (!p) continue
    let v = p.king ? 340 : 100
    if (!p.king) {
      const adv = p.side === P ? (9 - r) : r; v += adv * 5
      if (c === 0 || c === 9) v += 4
    } else {
      const cd = Math.abs(c - 4.5) + Math.abs(r - 4.5); v += (10 - cd) * 2
    }
    s += p.side === P ? v : -v
  }
  return s
}
function minimax(board, side, depth, alpha, beta) {
  if (generateMoves(board, side).length === 0) return (side === P ? -1 : 1) * (100000 + depth)
  if (depth === 0 || Date.now() > searchDeadline) return evaluate(board)
  const moves = generateMoves(board, side)
  if (side === P) {
    let best = -Infinity
    for (const m of moves) { const nb = applyMove(board, m).board; best = Math.max(best, minimax(nb, M, depth - 1, alpha, beta)); alpha = Math.max(alpha, best); if (beta <= alpha) break }
    return best
  } else {
    let best = Infinity
    for (const m of moves) { const nb = applyMove(board, m).board; best = Math.min(best, minimax(nb, P, depth - 1, alpha, beta)); beta = Math.min(beta, best); if (beta <= alpha) break }
    return best
  }
}
export function chooseAIMove(board, side, depth) {
  const moves = generateMoves(board, side); if (!moves.length) return null
  for (let i = moves.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0;[moves[i], moves[j]] = [moves[j], moves[i]] }
  searchDeadline = Date.now() + (depth >= 6 ? 1600 : depth >= 4 ? 900 : 400)
  let bestM = moves[0], bestV = side === P ? -Infinity : Infinity
  for (const m of moves) {
    let v = minimax(applyMove(board, m).board, opp(side), depth - 1, -Infinity, Infinity)
    v += (Math.random() - 0.5) * 0.02
    if (side === P) { if (v > bestV) { bestV = v; bestM = m } } else { if (v < bestV) { bestV = v; bestM = m } }
  }
  return bestM
}
export const AI_DEPTH = { mousse: 1, marin: 2, capitaine: 4, amiral: 6 }
export function aiMove(board, side, diff) {
  const depth = AI_DEPTH[diff] ?? 2
  if (diff === 'mousse') {
    const mv = generateMoves(board, side)
    if (mv.some(m => m.isCapture)) return mv[(Math.random() * mv.length) | 0]
    return Math.random() < 0.6 ? mv[(Math.random() * mv.length) | 0] : chooseAIMove(board, side, 1)
  }
  return chooseAIMove(board, side, depth)
}
