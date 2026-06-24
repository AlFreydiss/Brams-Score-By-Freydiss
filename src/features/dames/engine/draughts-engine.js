// ─────────────────────────────────────────────────────────────────────────────
// MOTEUR — Dames internationales 10×10 (Pirates P / Marine M)
// 100% DOM-free, ESM pur → réutilisable tel quel dans une Edge Function Deno
// pour valider les coups côté serveur (anti-triche). Rafle MAXIMALE + dames
// volantes. Porté verbatim du prototype testé (11 tests + partie aléatoire OK).
//
// VARIANTES : un objet `rules` optionnel paramètre la partie. Quand il est omis
// le comportement est STRICTEMENT identique à l'historique (10×10, rafle
// maximale imposée, dames volantes). Voir DEFAULT_RULES.
// ─────────────────────────────────────────────────────────────────────────────
export const SIZE = 10
export const P = 'P'   // Pirates (jouent vers le haut, r décroissant)
export const M = 'M'   // Marine  (jouent vers le bas, r croissant)
const DIAG = [[-1, -1], [-1, 1], [1, -1], [1, 1]]
export const isDark = (r, c) => (r + c) % 2 === 1
export const opp = (s) => (s === P ? M : P)
const fwd = (s) => (s === P ? -1 : 1)

// Règles par défaut = dames internationales historiques.
export const DEFAULT_RULES = Object.freeze({
  size: 10,
  priseObligatoire: true,
  priseMaximale: true,
  dameVolante: true,
})

// Normalise un objet `rules` partiel/absent vers un set complet. `undefined`
// → DEFAULT_RULES (comportement legacy byte-identique).
function R(rules) {
  if (!rules) return DEFAULT_RULES
  return {
    size: rules.size ?? DEFAULT_RULES.size,
    priseObligatoire: rules.priseObligatoire ?? DEFAULT_RULES.priseObligatoire,
    priseMaximale: rules.priseMaximale ?? DEFAULT_RULES.priseMaximale,
    dameVolante: rules.dameVolante ?? DEFAULT_RULES.dameVolante,
  }
}

// Catalogue des variantes jouables (taille + nombre de rangées peuplées). Pur JS,
// sans dépendance React → réutilisable côté serveur (Vercel) ET dans le hook UI.
export const VARIANTES = {
  '10x10': { size: 10, filledRows: 4, men: 20 },
  '8x8':   { size: 8,  filledRows: 3, men: 12 },
}

// variante (texte) → objet `rules` complet. Une variante inconnue / absente →
// 10×10 international (défaut byte-identique à l'historique). Les règles
// optionnelles (prise obligatoire/maximale, dame volante) restent celles par
// défaut sauf override explicite via `extra`.
export function rulesFromVariante(variante, extra) {
  const v = VARIANTES[variante] || VARIANTES['10x10']
  return {
    size: v.size,
    priseObligatoire: extra?.priseObligatoire ?? DEFAULT_RULES.priseObligatoire,
    priseMaximale:    extra?.priseMaximale ?? DEFAULT_RULES.priseMaximale,
    dameVolante:      extra?.dameVolante ?? DEFAULT_RULES.dameVolante,
  }
}

const inBounds = (r, c, size) => r >= 0 && r < size && c >= 0 && c < size
const keyFor = (r, c, size) => r * size + c

export function initBoard(rules) {
  const { size } = R(rules)
  const b = Array.from({ length: size }, () => Array(size).fill(null))
  // Nombre de rangées remplies par camp : 4 en 10×10, 3 en 8×8.
  const rows = size === 8 ? 3 : 4
  for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) {
    if (!isDark(r, c)) continue
    if (r <= rows - 1) b[r][c] = { side: M, king: false }
    else if (r >= size - rows) b[r][c] = { side: P, king: false }
  }
  return b
}
export const cloneBoard = (b) => b.map(row => row.map(c => (c ? { ...c } : null)))

// Toutes les séquences de capture possibles depuis (r,c) (récursif, multi-saut).
export function pieceCaptures(board, r, c, rules) {
  const { size, dameVolante } = R(rules)
  const inB = (rr, cc) => inBounds(rr, cc, size)
  const KEY = (rr, cc) => keyFor(rr, cc, size)
  const orig = board[r][c]; if (!orig) return []
  board[r][c] = null
  const seqs = []; const captured = new Set()
  function rec(cr, cc, path, caps) {
    let ext = false
    if (!orig.king || !dameVolante) {
      // Pion OU dame courte : capture à 1 case dans les 4 diagonales (dame = 2 sens).
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

// Coups légaux pour `side`. Selon `rules` :
//  - priseObligatoire : si une capture existe, seules les captures sont légales (défaut true).
//  - priseMaximale    : on ne garde que les rafles les plus longues (défaut true).
export function generateMoves(board, side, rules) {
  const { size, priseObligatoire, priseMaximale, dameVolante } = R(rules)
  const inB = (rr, cc) => inBounds(rr, cc, size)
  let caps = []
  for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) {
    const p = board[r][c]
    if (p && p.side === side) for (const s of pieceCaptures(board, r, c, rules))
      caps.push({ from: [r, c], path: s.path, caps: s.caps, count: s.caps.length })
  }
  const captureMoves = caps.length
    ? (priseMaximale
        ? (() => { const max = Math.max(...caps.map(m => m.count)); return caps.filter(m => m.count === max) })()
        : caps
      ).map(m => ({ ...m, isCapture: true, to: m.path[m.path.length - 1] }))
    : []
  // Prise obligatoire : dès qu'une capture existe, on ne renvoie que les captures.
  if (captureMoves.length && priseObligatoire) return captureMoves

  const moves = []
  for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) {
    const p = board[r][c]; if (!p || p.side !== side) continue
    if (!p.king) {
      for (const dc of [-1, 1]) {
        const nr = r + fwd(side), nc = c + dc
        if (inB(nr, nc) && isDark(nr, nc) && !board[nr][nc])
          moves.push({ from: [r, c], to: [nr, nc], path: [[nr, nc]], caps: [], isCapture: false })
      }
    } else if (dameVolante) {
      for (const [dr, dc] of DIAG) {
        let k = 1
        while (true) {
          const nr = r + dr * k, nc = c + dc * k
          if (!inB(nr, nc) || board[nr][nc]) break
          moves.push({ from: [r, c], to: [nr, nc], path: [[nr, nc]], caps: [], isCapture: false }); k++
        }
      }
    } else {
      // Dame courte : un pas dans chacune des 4 diagonales.
      for (const [dr, dc] of DIAG) {
        const nr = r + dr, nc = c + dc
        if (inB(nr, nc) && !board[nr][nc])
          moves.push({ from: [r, c], to: [nr, nc], path: [[nr, nc]], caps: [], isCapture: false })
      }
    }
  }
  // priseObligatoire=false : les captures coexistent avec les coups tranquilles.
  return captureMoves.length ? [...captureMoves, ...moves] : moves
}

export function applyMove(board, mv, rules) {
  const { size } = R(rules)
  const b = cloneBoard(board); const [fr, fc] = mv.from; const piece = b[fr][fc]
  b[fr][fc] = null; for (const [cr, cc] of mv.caps) b[cr][cc] = null
  const [tr, tc] = mv.to; let promoted = false
  if (!piece.king && ((piece.side === P && tr === 0) || (piece.side === M && tr === size - 1))) { piece.king = true; promoted = true }
  b[tr][tc] = piece; return { board: b, promoted }
}
export function countPieces(board, side) { let n = 0; for (const row of board) for (const c of row) if (c && c.side === side) n++; return n }
export function countKings(board, side) { let n = 0; for (const row of board) for (const c of row) if (c && c.side === side && c.king) n++; return n }

// ── Détection de nulle (correctness : sans ça une partie peut tourner à l'infini) ──
// Compteur "demi-coups sans progrès" : règle des 25 coups internationale.
// On le repart à zéro à chaque PRISE ou déplacement de PION (un pion qui bouge ne
// peut jamais revenir en arrière → progression irréversible). Seuls les coups de
// dames sans capture incrémentent le compteur.
export const DRAW_PLIES = 50   // 25 coups de chaque camp = 50 demi-coups

// Le coup fait-il progresser la partie (reset du compteur) ?
export function moveIsProgress(board, mv) {
  if (mv.caps && mv.caps.length) return true
  const p = board[mv.from[0]]?.[mv.from[1]]
  return !!(p && !p.king)   // un pion (non-dame) qui avance = progrès
}

// Met à jour le compteur halfmove-sans-progrès. À appeler AVANT applyMove (besoin du plateau d'origine).
export function nextHalfmoveClock(prevClock, board, mv) {
  return moveIsProgress(board, mv) ? 0 : (prevClock | 0) + 1
}

// Clé canonique d'une position pour la répétition (plateau + camp au trait).
export function positionKey(board, side) { return hashBoard(board) + side }

// Nulle triviale par matériel : roi-seul contre roi-seul (1 dame vs 1 dame, rien d'autre),
// ou un seul camp possède une unique dame face à une unique dame → aucune des deux ne
// peut forcer la prise. (On reste conservateur : que les cas réellement nuls.)
export function isMaterialDraw(board) {
  const pP = countPieces(board, P), pM = countPieces(board, M)
  const kP = countKings(board, P), kM = countKings(board, M)
  // une seule dame chacun et rien d'autre
  return pP === 1 && pM === 1 && kP === 1 && kM === 1
}

// Statut enrichi. `ctx` (optionnel) = { halfmoveClock, repetitions } où `repetitions`
// est une Map positionKey -> nombre d'occurrences DÉJÀ vues (>=3 = triple répétition).
// Rétro-compatible : sans ctx, comportement identique à l'ancien gameStatus.
export function gameStatus(board, side, ctx, rules) {
  if (generateMoves(board, side, rules).length === 0) return { over: true, winner: opp(side), draw: false }
  if (isMaterialDraw(board)) return { over: true, winner: null, draw: true, reason: 'Matériel insuffisant — une dame contre une dame.' }
  if (ctx) {
    if ((ctx.halfmoveClock | 0) >= DRAW_PLIES)
      return { over: true, winner: null, draw: true, reason: '25 coups sans prise ni avancée de pion.' }
    const reps = ctx.repetitions && ctx.repetitions.get(positionKey(board, side))
    if (reps && reps >= 3)
      return { over: true, winner: null, draw: true, reason: 'Position répétée trois fois.' }
  }
  return { over: false, winner: opp(side), draw: false }
}

// Deux coups identiques ? (utile pour valider un coup reçu côté serveur)
export function movesEqual(a, b) {
  if (!a || !b) return false
  if (a.from[0] !== b.from[0] || a.from[1] !== b.from[1]) return false
  if (a.to[0] !== b.to[0] || a.to[1] !== b.to[1]) return false
  return (a.caps?.length || 0) === (b.caps?.length || 0)
}

// ── IA : minimax + alpha-beta + garde-temps (porté verbatim) ──────────────────
let searchDeadline = 0
// Évaluation positionnelle (centipions, 1 pion = 100). POV blanc (P positif).
// Termes (pondérés petits devant le matériel pour que les seuils d'analyse en
// pions — 200cp = 2 pions — gardent leur sens) :
//   matériel (dame >> pion), avancement vers la promotion, contrôle du centre,
//   pions de bord, défense de la dernière rangée, soutien/exposition diagonale
//   (pion isolé = pénalité, pion soutenu = bonus), mobilité de la dame, tempo.
export function evaluate(board, rules) {
  const { size } = R(rules)
  const center = (size - 1) / 2   // 4.5 en 10×10, 3.5 en 8×8
  const inB = (rr, cc) => inBounds(rr, cc, size)
  let s = 0
  for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) {
    const p = board[r][c]; if (!p) continue
    let v = p.king ? 340 : 100
    if (!p.king) {
      const adv = p.side === P ? (size - 1 - r) : r; v += adv * 5
      if (c === 0 || c === size - 1) v += 4
      // défense de la dernière rangée : tant qu'un pion y reste, l'adversaire ne peut pas promouvoir ici
      if ((p.side === P && r === size - 1) || (p.side === M && r === 0)) v += 8
      // contrôle du centre (colonnes centrales = plus de mobilité)
      v += (center - 0.5 - Math.abs(c - center)) * 1.5
      // soutien arrière : un pion ami derrière sur une diagonale le protège d'une prise → bonus ;
      // aucun soutien ET un ennemi adjacent devant = pion exposé/isolé → pénalité.
      const back = -fwd(p.side)   // case "derrière" le pion (vers son propre camp)
      let supported = false, threatened = false
      for (const dc of [-1, 1]) {
        const br = r + back, bc = c + dc
        if (inB(br, bc)) { const bp = board[br][bc]; if (bp && bp.side === p.side) supported = true }
        const fr = r + fwd(p.side), fc = c + dc
        if (inB(fr, fc)) { const fp = board[fr][fc]; if (fp && fp.side !== p.side) threatened = true }
      }
      if (supported) v += 6
      if (threatened && !supported) v -= 9   // exposé à une prise diagonale sans backup
    } else {
      const cd = Math.abs(c - center) + Math.abs(r - center); v += (size - cd) * 2
      // mobilité approximative de la dame volante : nombre de cases vides en diagonale.
      let mob = 0
      for (const [dr, dc] of DIAG) { let k = 1; while (true) { const nr = r + dr * k, nc = c + dc * k; if (!inB(nr, nc) || board[nr][nc]) break; mob++; k++ } }
      v += Math.min(mob, 12) * 1.5
    }
    s += p.side === P ? v : -v
  }
  return s
}
// score du point de vue du camp `side` (negamax)
const evalSide = (board, side, rules) => (side === P ? 1 : -1) * evaluate(board, rules)
const sameMove = (a, b) => a && b && a.from[0] === b.from[0] && a.from[1] === b.from[1] && a.to[0] === b.to[0] && a.to[1] === b.to[1]
// Hash compact du plateau (clé de la table de transposition, pour le move ordering).
function hashBoard(board) {
  let s = ''
  for (const row of board) for (const p of row) { s += p ? (p.side === P ? (p.king ? 'A' : 'a') : (p.king ? 'B' : 'b')) : '.' }
  return s
}
// Score statique d'un coup (PAS de clone de plateau) : ordering rapide → on cherche
// plus profond dans le même budget. Capture > avance/promotion > centre.
function moveScore(board, side, m, size) {
  const center = (size - 1) / 2
  let s = 0
  if (m.isCapture) s += 1000 + m.caps.length * 60
  const [fr, fc] = m.from, [tr, tc] = m.to, piece = board[fr][fc]
  if (piece && !piece.king) {
    s += (side === P ? (fr - tr) : (tr - fr)) * 4                 // progression vers la promotion
    if ((side === P && tr === 0) || (side === M && tr === size - 1)) s += 220
    s += center - 0.5 - Math.abs(tc - center)                    // biais centre
  }
  return s
}
// Tri : ttMove (meilleur de l'itération précédente) en tête, puis killer moves
// (coups qui ont provoqué une coupure à cette profondeur), puis heuristique statique.
function orderMoves(board, side, moves, ttMove, depth, size) {
  const killers = _killers[depth] || []
  return moves
    .map(m => { let s = moveScore(board, side, m, size); if (ttMove && sameMove(m, ttMove)) s += 1e6; else if (sameMove(m, killers[0])) s += 9000; else if (sameMove(m, killers[1])) s += 8000; return { m, s } })
    .sort((a, b) => b.s - a.s).map(x => x.m)
}
let _tt, _killers
// Bornes de la table de transposition (fenêtre alpha-bêta).
const TT_EXACT = 0, TT_LOWER = 1, TT_UPPER = 2
const TT_MAX = 200000   // plafond d'entrées : évite que la Map enfle sans fin sur une longue partie
// Negamax + alpha-bêta + table de transposition (coupures réelles {depth,score,flag,move}
// + move ordering) + killer moves + quiescence sur les rafles.
function negamax(board, side, depth, alpha, beta, rules) {
  const { size } = rules
  if (Date.now() > searchDeadline) return evalSide(board, side, rules)
  const key = hashBoard(board) + side
  const alphaOrig = alpha
  // Sonde TT : une entrée recherchée AU MOINS aussi profond peut couper directement.
  const tt = _tt.get(key)
  if (tt && tt.depth >= depth) {
    if (tt.flag === TT_EXACT) return tt.score
    if (tt.flag === TT_LOWER && tt.score > alpha) alpha = tt.score
    else if (tt.flag === TT_UPPER && tt.score < beta) beta = tt.score
    if (alpha >= beta) return tt.score
  }
  const moves = generateMoves(board, side, rules)
  if (moves.length === 0) return -(100000 + depth)            // camp au trait sans coup = perd
  // Quiescence : à profondeur épuisée on s'arrête, SAUF si des rafles sont forcées
  // (sinon effet d'horizon : on couperait au milieu d'une prise).
  if (depth <= 0 && !moves[0].isCapture) return evalSide(board, side, rules)
  const ordered = orderMoves(board, side, moves, tt && tt.move, depth, size)
  let best = -Infinity, bestMove = null
  for (const m of ordered) {
    const nd = m.isCapture ? Math.max(depth - 1, 0) : depth - 1   // les rafles prolongent (quiescence)
    const v = -negamax(applyMove(board, m, rules).board, opp(side), nd, -beta, -alpha, rules)
    if (v > best) { best = v; bestMove = m }
    if (v > alpha) alpha = v
    if (alpha >= beta) {                                          // coupure : mémorise un killer (coup quiet)
      if (!m.isCapture) { const k = _killers[depth] || (_killers[depth] = []); if (!sameMove(k[0], m)) { k[1] = k[0]; k[0] = m } }
      break
    }
  }
  // Stocke l'entrée avec sa borne : EXACT (dans la fenêtre), LOWER (coupure beta = score
  // minoré), UPPER (aucun coup n'a dépassé alpha = score majoré). On ne remplace que si la
  // nouvelle recherche est plus profonde (entrée plus fiable) — schéma "depth-preferred".
  const flag = best <= alphaOrig ? TT_UPPER : (best >= beta ? TT_LOWER : TT_EXACT)
  if (!tt || tt.depth <= depth) {
    if (_tt.size >= TT_MAX && !_tt.has(key)) _tt.clear()
    _tt.set(key, { depth, score: best, flag, move: bestMove })
  }
  return best
}
// Iterative deepening avec budget temps : on garde le meilleur coup de la dernière
// profondeur complétée. Le meilleur coup courant amorce l'ordering de la profondeur suivante.
export function chooseAIMove(board, side, maxDepth, budgetMs, rules) {
  const rr = R(rules)
  const { size } = rr
  const moves = generateMoves(board, side, rr); if (!moves.length) return null
  if (moves.length === 1) return moves[0]
  searchDeadline = Date.now() + (budgetMs || 900); _tt = new Map(); _killers = []
  let best = moves[0]
  for (let d = 1; d <= maxDepth; d++) {
    let curBest = null, curV = -Infinity, alpha = -Infinity
    const ordered = orderMoves(board, side, moves, best, d, size)
    let completed = true
    for (const m of ordered) {
      if (Date.now() > searchDeadline) { completed = false; break }
      const v = -negamax(applyMove(board, m, rr).board, opp(side), d - 1, -Infinity, -alpha, rr)
      if (v > curV) { curV = v; curBest = m }
      if (v > alpha) alpha = v
    }
    if (curBest && completed) best = curBest
    if (!completed || Date.now() > searchDeadline) break
  }
  return best
}
// Profondeurs relevées : la table de transposition (coupures réelles) approfondit la
// recherche dans le même budget. amiral (niveau exposé le plus fort) vise < ~1.5 s/coup.
export const AI_DEPTH = { mousse: 1, marin: 4, capitaine: 8, amiral: 12, legende: 18 }
export const AI_BUDGET = { mousse: 180, marin: 500, capitaine: 1050, amiral: 1500, legende: 2800 }
export function aiMove(board, side, diff, rules) {
  const rr = R(rules)
  const moves = generateMoves(board, side, rr)
  if (!moves.length) return null
  if (diff === 'mousse') {
    // niveau débutant : capture au hasard si forcé, sinon souvent un coup aléatoire (variété d'ouverture)
    if (moves[0].isCapture) return moves[(Math.random() * moves.length) | 0]
    return Math.random() < 0.6 ? moves[(Math.random() * moves.length) | 0] : chooseAIMove(board, side, 1, 200, rr)
  }
  return chooseAIMove(board, side, AI_DEPTH[diff] ?? 6, AI_BUDGET[diff] ?? 950, rr)
}
// Meilleur coup pour l'humain (bouton Indice) — recherche moyenne, rapide.
export function bestHint(board, side, rules) { return chooseAIMove(board, side, 8, 700, rules) }

// Évaluation de la position pour la barre d'éval : negamax peu profond (défaut prof. 6)
// borné dans le temps, renvoyé en "centipions" du POINT DE VUE BLANC (P = Pirates = positif).
// Si la partie est finie : ±MATE selon le vainqueur, 0 si nulle.
const MATE = 100000
export function analysePosition(board, side, depth, budgetMs, rules) {
  const rr = R(rules)
  const moves = generateMoves(board, side, rr)
  if (moves.length === 0) {
    // camp au trait sans coup = perd → score extrême du point de vue blanc
    return { score: side === P ? -MATE : MATE, mate: true, depth: 0 }
  }
  if (isMaterialDraw(board)) return { score: 0, draw: true, depth: 0 }
  searchDeadline = Date.now() + (budgetMs || 500); _tt = new Map(); _killers = []
  const d = depth || 6
  // negamax renvoie le score du point de vue du camp au trait → on reconvertit en POV blanc.
  const sideScore = negamax(board, side, d, -Infinity, Infinity, rr)
  const whiteScore = side === P ? sideScore : -sideScore
  return { score: Math.round(whiteScore), depth: d }
}
