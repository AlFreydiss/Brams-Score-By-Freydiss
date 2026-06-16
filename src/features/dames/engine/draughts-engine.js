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
      // défense de la dernière rangée : tant qu'un pion y reste, l'adversaire ne peut pas promouvoir ici
      if ((p.side === P && r === 9) || (p.side === M && r === 0)) v += 8
      // contrôle du centre (colonnes centrales = plus de mobilité)
      v += (4 - Math.abs(c - 4.5)) * 1.5
    } else {
      const cd = Math.abs(c - 4.5) + Math.abs(r - 4.5); v += (10 - cd) * 2
    }
    s += p.side === P ? v : -v
  }
  return s
}
// score du point de vue du camp `side` (negamax)
const evalSide = (board, side) => (side === P ? 1 : -1) * evaluate(board)
const sameMove = (a, b) => a && b && a.from[0] === b.from[0] && a.from[1] === b.from[1] && a.to[0] === b.to[0] && a.to[1] === b.to[1]
// Hash compact du plateau (clé de la table de transposition, pour le move ordering).
function hashBoard(board) {
  let s = ''
  for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) { const p = board[r][c]; s += p ? (p.side === P ? (p.king ? 'A' : 'a') : (p.king ? 'B' : 'b')) : '.' }
  return s
}
// Score statique d'un coup (PAS de clone de plateau) : ordering rapide → on cherche
// plus profond dans le même budget. Capture > avance/promotion > centre.
function moveScore(board, side, m) {
  let s = 0
  if (m.isCapture) s += 1000 + m.caps.length * 60
  const [fr, fc] = m.from, [tr, tc] = m.to, piece = board[fr][fc]
  if (piece && !piece.king) {
    s += (side === P ? (fr - tr) : (tr - fr)) * 4                 // progression vers la promotion
    if ((side === P && tr === 0) || (side === M && tr === SIZE - 1)) s += 220
    s += 4 - Math.abs(tc - 4.5)                                   // biais centre
  }
  return s
}
// Tri : ttMove (meilleur de l'itération précédente) en tête, puis killer moves
// (coups qui ont provoqué une coupure à cette profondeur), puis heuristique statique.
function orderMoves(board, side, moves, ttMove, depth) {
  const killers = _killers[depth] || []
  return moves
    .map(m => { let s = moveScore(board, side, m); if (ttMove && sameMove(m, ttMove)) s += 1e6; else if (sameMove(m, killers[0])) s += 9000; else if (sameMove(m, killers[1])) s += 8000; return { m, s } })
    .sort((a, b) => b.s - a.s).map(x => x.m)
}
let _tt, _killers
// Negamax + alpha-bêta + table de transposition (ordering) + killer moves + quiescence sur les rafles.
function negamax(board, side, depth, alpha, beta) {
  if (Date.now() > searchDeadline) return evalSide(board, side)
  const moves = generateMoves(board, side)
  if (moves.length === 0) return -(100000 + depth)            // camp au trait sans coup = perd
  // Quiescence : à profondeur épuisée on s'arrête, SAUF si des rafles sont forcées
  // (sinon effet d'horizon : on couperait au milieu d'une prise).
  if (depth <= 0 && !moves[0].isCapture) return evalSide(board, side)
  const key = hashBoard(board) + side
  const ttMove = _tt.get(key)
  const ordered = orderMoves(board, side, moves, ttMove, depth)
  let best = -Infinity, bestMove = null
  for (const m of ordered) {
    const nd = m.isCapture ? Math.max(depth - 1, 0) : depth - 1   // les rafles prolongent (quiescence)
    const v = -negamax(applyMove(board, m).board, opp(side), nd, -beta, -alpha)
    if (v > best) { best = v; bestMove = m }
    if (v > alpha) alpha = v
    if (alpha >= beta) {                                          // coupure : mémorise un killer (coup quiet)
      if (!m.isCapture) { const k = _killers[depth] || (_killers[depth] = []); if (!sameMove(k[0], m)) { k[1] = k[0]; k[0] = m } }
      break
    }
  }
  if (bestMove) _tt.set(key, bestMove)
  return best
}
// Iterative deepening avec budget temps : on garde le meilleur coup de la dernière
// profondeur complétée. Le meilleur coup courant amorce l'ordering de la profondeur suivante.
export function chooseAIMove(board, side, maxDepth, budgetMs) {
  const moves = generateMoves(board, side); if (!moves.length) return null
  if (moves.length === 1) return moves[0]
  searchDeadline = Date.now() + (budgetMs || 900); _tt = new Map(); _killers = []
  let best = moves[0]
  for (let d = 1; d <= maxDepth; d++) {
    let curBest = null, curV = -Infinity, alpha = -Infinity
    const ordered = orderMoves(board, side, moves, best, d)
    let completed = true
    for (const m of ordered) {
      if (Date.now() > searchDeadline) { completed = false; break }
      const v = -negamax(applyMove(board, m).board, opp(side), d - 1, -Infinity, -alpha)
      if (v > curV) { curV = v; curBest = m }
      if (v > alpha) alpha = v
    }
    if (curBest && completed) best = curBest
    if (!completed || Date.now() > searchDeadline) break
  }
  return best
}
export const AI_DEPTH = { mousse: 1, marin: 3, capitaine: 6, amiral: 9, legende: 14 }
export const AI_BUDGET = { mousse: 180, marin: 450, capitaine: 950, amiral: 1600, legende: 2800 }
export function aiMove(board, side, diff) {
  const moves = generateMoves(board, side)
  if (!moves.length) return null
  if (diff === 'mousse') {
    // niveau débutant : capture au hasard si forcé, sinon souvent un coup aléatoire (variété d'ouverture)
    if (moves[0].isCapture) return moves[(Math.random() * moves.length) | 0]
    return Math.random() < 0.6 ? moves[(Math.random() * moves.length) | 0] : chooseAIMove(board, side, 1, 200)
  }
  return chooseAIMove(board, side, AI_DEPTH[diff] ?? 6, AI_BUDGET[diff] ?? 950)
}
// Meilleur coup pour l'humain (bouton Indice) — recherche moyenne, rapide.
export function bestHint(board, side) { return chooseAIMove(board, side, 8, 700) }
