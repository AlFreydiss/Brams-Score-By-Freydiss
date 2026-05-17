/**
 * Mulberry32 — seeded PRNG, reproducible across renders.
 * Returns a function rng(min, max) → float in [min, max).
 * @param {number} seed
 */
export function createRng(seed) {
  let s = (seed >>> 0) || 1
  return function rng(min = 0, max = 1) {
    s += 0x6D2B79F5
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    const f = ((t ^ (t >>> 14)) >>> 0) / 4294967296
    return min + f * (max - min)
  }
}
