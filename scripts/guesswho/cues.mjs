// Logique pure du pack de sons Guess Who (testée sans réseau ni ffmpeg).

const TS = /(\d+):(\d{2}):(\d{2})[.,](\d{3})|(\d{2}):(\d{2})[.,](\d{3})/
function toSec(s) {
  const m = s.match(TS)
  if (!m) return NaN
  if (m[1] != null) return +m[1] * 3600 + +m[2] * 60 + +m[3] + +m[4] / 1000
  return +m[5] * 60 + +m[6] + +m[7] / 1000
}

export function parseVtt(text) {
  const out = []
  for (const block of String(text).replace(/\r/g, '').split(/\n\n+/)) {
    const lines = block.split('\n')
    const i = lines.findIndex((l) => l.includes('-->'))
    if (i < 0) continue
    const [a, b] = lines[i].split('-->')
    const body = lines.slice(i + 1).join(' ').replace(/<[^>]+>/g, '').replace(/\{[^}]+\}/g, '').replace(/\s+/g, ' ').trim()
    if (body) out.push({ start: toSec(a), end: toSec(b), text: body })
  }
  return out
}

const fold = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '')

export function findTechniqueCues(cues, keywords, maxPerKeyword = 3) {
  const out = []
  for (const kw of keywords) {
    let n = 0
    for (const c of cues) {
      if (n >= maxPerKeyword) break
      if (kw.patterns.some((re) => re.test(c.text) || re.test(fold(c.text)))) {
        out.push({ label: kw.label, start: c.start, end: c.end, text: c.text })
        n++
      }
    }
  }
  return out
}

const r2 = (x) => Math.round(x * 100) / 100

export function clipWindow(cue, { before = 0.3, after = 0.6, maxLen = 6 } = {}) {
  const start = Math.max(0, cue.start - before)
  const duration = Math.min(maxLen, cue.end + after - start)
  return { start: r2(start), duration: r2(duration) }
}

// Énergie RMS glissante : début (en secondes) de la fenêtre `len` la plus forte.
export function bestWindow(samples, rate, len, minStart = 10) {
  const win = Math.round(len * rate)
  const first = Math.round(minStart * rate)
  if (samples.length < first + win) return Math.min(minStart, Math.max(0, samples.length / rate - len))
  let sum = 0
  for (let i = first; i < first + win; i++) sum += samples[i] * samples[i]
  let best = sum, bestAt = first
  for (let i = first + 1; i + win <= samples.length; i++) {
    sum += samples[i + win - 1] ** 2 - samples[i - 1] ** 2
    if (sum > best) { best = sum; bestAt = i }
  }
  return r2(bestAt / rate)
}

export function clipId(parts) {
  return fold(parts.join('-')).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}
