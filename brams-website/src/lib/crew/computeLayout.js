import {
  ROLE_LEVEL, POSTER_W, POSTER_H, POSTER_MARGIN,
  RING_RADII, RING_SCALES, RING_ROT_MAX, RING_OPACITY, RING_Z, RING_MAX,
} from './constants.js'
import { createRng } from './seedRandom.js'

/**
 * Assign crew members to rings based on role hierarchy, then position them
 * on the constellation canvas. Returns a new array with `_pos` added.
 *
 * @param {Array<object>} members      enriched crew members
 * @param {number}        canvasW      canvas width in px
 * @param {number}        canvasH      canvas height in px
 * @param {number}        [seed=42]    reproducibility seed
 * @returns {Array<object>}
 */
export function computeLayout(members, canvasW, canvasH, seed = 42) {
  if (!members.length) return []

  const rng = createRng(seed)
  const cx  = canvasW / 2
  const cy  = canvasH / 2
  const r   = Math.min(canvasW, canvasH)  // reference dimension for radii

  // ── 1. Sort: level asc, bounty desc ──────────────────────────────────────
  const sorted = [...members].sort((a, b) => {
    const la = ROLE_LEVEL[a.position] ?? 2
    const lb = ROLE_LEVEL[b.position] ?? 2
    if (la !== lb) return la - lb
    return (b.contribution || 0) - (a.contribution || 0)
  })

  // ── 2. Assign rings ────────────────────────────────────────────────────────
  const rings = [[], [], [], []]
  for (const m of sorted) {
    const lv = ROLE_LEVEL[m.position] ?? 2
    if (lv === 0) {
      rings[0].push(m)
    } else if (lv === 1 && rings[1].length < RING_MAX[1]) {
      rings[1].push(m)
    } else if (rings[2].length < RING_MAX[2]) {
      rings[2].push(m)
    } else {
      rings[3].push(m)
    }
  }

  const result = []

  // ── 3. Position per ring ───────────────────────────────────────────────────
  for (let ri = 0; ri < 4; ri++) {
    const ring = rings[ri]
    if (!ring.length) continue

    const radius  = RING_RADII[ri] * r
    const scale   = RING_SCALES[ri]
    const rotMax  = RING_ROT_MAX[ri]
    const opacity = RING_OPACITY[ri]
    const zIndex  = RING_Z[ri]
    const n       = ring.length

    for (let i = 0; i < n; i++) {
      let x, y

      if (ri === 0) {
        if (n === 1) {
          x = cx; y = cy
        } else {
          // Multiple capitaines → petit sous-cercle
          const a = (i / n) * Math.PI * 2 - Math.PI / 2
          x = cx + Math.cos(a) * (r * 0.07)
          y = cy + Math.sin(a) * (r * 0.07)
        }
      } else {
        // Angle de départ : -90° (haut) + léger décalage aléatoire reproductible
        const startOffset = -Math.PI / 2 + rng(-0.15, 0.15)
        const a = startOffset + (i / n) * Math.PI * 2
        x = cx + Math.cos(a) * radius
        y = cy + Math.sin(a) * radius
      }

      const rotation = rotMax === 0 ? 0 : Math.round(rng(-rotMax, rotMax) * 10) / 10

      result.push({
        ...ring[i],
        _pos: {
          x:       Math.round(x),
          y:       Math.round(y),
          scale,
          rotation,
          opacity,
          zIndex,
          ring:    ri,
        },
      })
    }
  }

  // ── 4. Collision resolution (max 8 iterations) ─────────────────────────────
  resolveCollisions(result, 8)

  // ── 5. Clamp to canvas bounds ──────────────────────────────────────────────
  for (const m of result) {
    const hw = (POSTER_W * m._pos.scale) / 2
    const hh = (POSTER_H * m._pos.scale) / 2
    m._pos.x = Math.max(hw + 8, Math.min(canvasW - hw - 8, m._pos.x))
    m._pos.y = Math.max(hh + 8, Math.min(canvasH - hh - 8, m._pos.y))
  }

  return result
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function resolveCollisions(members, maxIter) {
  for (let iter = 0; iter < maxIter; iter++) {
    let collision = false

    for (let i = 0; i < members.length; i++) {
      for (let j = i + 1; j < members.length; j++) {
        const a = members[i]._pos
        const b = members[j]._pos

        const aw = (POSTER_W * a.scale) / 2 + POSTER_MARGIN / 2
        const ah = (POSTER_H * a.scale) / 2 + POSTER_MARGIN / 2
        const bw = (POSTER_W * b.scale) / 2 + POSTER_MARGIN / 2
        const bh = (POSTER_H * b.scale) / 2 + POSTER_MARGIN / 2

        const dx = Math.abs(a.x - b.x)
        const dy = Math.abs(a.y - b.y)

        const ox = (aw + bw) - dx
        const oy = (ah + bh) - dy

        if (ox > 0 && oy > 0) {
          collision = true
          // Move the lower-priority poster (higher ring index)
          const tgt = a.ring >= b.ring ? a : b
          const other = tgt === a ? b : a

          if (ox < oy) {
            tgt.x += (tgt.x > other.x ? 1 : -1) * (ox * 0.6)
          } else {
            tgt.y += (tgt.y > other.y ? 1 : -1) * (oy * 0.6)
          }
        }
      }
    }

    if (!collision) break
  }
}
