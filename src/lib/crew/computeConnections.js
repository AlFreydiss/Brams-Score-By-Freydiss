import { ROLE_LEVEL } from './constants.js'
import { createRng } from './seedRandom.js'

/**
 * Build a quadratic Bézier SVG path string between two points.
 * The control point is offset perpendicular to the segment mid-point.
 *
 * @param {{ x: number, y: number }} from
 * @param {{ x: number, y: number }} to
 * @param {number} curvature  signed — positive = left of direction
 * @returns {string}
 */
export function buildBezierPath(from, to, curvature = 0.25) {
  const dx   = to.x - from.x
  const dy   = to.y - from.y
  const dist = Math.hypot(dx, dy)
  if (dist < 1) return `M ${from.x},${from.y}`

  const midX  = (from.x + to.x) / 2
  const midY  = (from.y + to.y) / 2
  const perpX = -dy / dist
  const perpY =  dx / dist
  const off   = dist * curvature

  return `M ${from.x},${from.y} Q ${midX + perpX * off},${midY + perpY * off} ${to.x},${to.y}`
}

/**
 * Approximate path length (Bézier is ≈ 1.15× chord length).
 */
export function estimateLength(from, to) {
  return Math.hypot(to.x - from.x, to.y - from.y) * 1.18
}

/**
 * Generate connection descriptors between positioned members.
 *
 * Returns an array of:
 *   { id, type, path, length, fromId, toId }
 *
 * Types:
 *   'hierarchy' — capitaine → officier  (gold line)
 *   'team'      — officier  → membre   (brown dashed)
 *
 * @param {Array<object>} positioned  members with _pos
 * @param {number}        [seed=42]
 * @returns {Array<object>}
 */
export function computeConnections(positioned, seed = 42) {
  const rng  = createRng(seed + 7)
  const conns = []

  const captain  = positioned.find(m => ROLE_LEVEL[m.position] === 0)
  const officers = positioned.filter(m => ROLE_LEVEL[m.position] === 1)
  const crew     = positioned.filter(m => {
    const lv = ROLE_LEVEL[m.position]
    return lv === 2 || lv === 3 || (lv == null && m.position !== 'capitaine')
  })

  if (!captain) return conns

  const usedSigns = new Set()

  function uniqueCurvature(base) {
    // Alternate sign to prevent symmetric line stacking
    let sign = rng() > 0.5 ? 1 : -1
    let c    = base * sign
    // If this curvature bucket is used, flip sign
    const bucket = Math.round(c * 20)
    if (usedSigns.has(bucket)) {
      sign = -sign
      c    = base * sign
    }
    usedSigns.add(Math.round(c * 20))
    return c
  }

  // Captain → officers
  for (const off of officers) {
    const base = rng(0.18, 0.32)
    const curv = uniqueCurvature(base)
    const from = { x: captain._pos.x, y: captain._pos.y }
    const to   = { x: off._pos.x,     y: off._pos.y }
    conns.push({
      id:     `h-${off.user_id}`,
      type:   'hierarchy',
      fromId: captain.user_id,
      toId:   off.user_id,
      from, to,
      path:   buildBezierPath(from, to, curv),
      length: estimateLength(from, to),
    })
  }

  // Officers → crew members (each crew member connected to nearest officer)
  for (const m of crew) {
    // If no officers, connect to captain
    const anchor = officers.length > 0
      ? officers.reduce((best, o) => {
          const d = Math.hypot(o._pos.x - m._pos.x, o._pos.y - m._pos.y)
          return d < Math.hypot(best._pos.x - m._pos.x, best._pos.y - m._pos.y) ? o : best
        })
      : captain

    const base = rng(0.10, 0.22)
    const curv = uniqueCurvature(base)
    const from = { x: anchor._pos.x, y: anchor._pos.y }
    const to   = { x: m._pos.x,      y: m._pos.y }
    conns.push({
      id:     `t-${m.user_id}`,
      type:   'team',
      fromId: anchor.user_id,
      toId:   m.user_id,
      from, to,
      path:   buildBezierPath(from, to, curv),
      length: estimateLength(from, to),
    })
  }

  return conns
}
