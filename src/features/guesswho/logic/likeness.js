// Guess Who — score de ressemblance d'une imitation (logique PURE, testée).
// Mode Entraînement : on compare la prise à l'original sur trois axes.
//  · rythme  : enveloppe d'énergie (quand ça crie, quand ça se tait), alignée
//              par DTW pour pardonner un léger décalage ;
//  · mélodie : contour de hauteur en demi-tons, recentré sur sa médiane —
//              une voix grave qui imite une voix aiguë n'est pas pénalisée,
//              seul le dessin (monte, descend, tient) compte ;
//  · durée   : rapport des longueurs utiles.
import { frameLevels, resample } from './dsp.js'

const clamp01 = (x) => Math.max(0, Math.min(1, x))

// Partie utile d'une enveloppe : du premier au dernier niveau ≥ 15 % du max.
function trimEnvelope(levels) {
  let max = 0
  for (const v of levels) max = Math.max(max, v)
  if (max < 0.004) return null
  const th = max * 0.15
  let a = 0, b = levels.length - 1
  while (a < b && levels[a] < th) a++
  while (b > a && levels[b] < th) b--
  return { env: Array.from(levels.slice(a, b + 1), (v) => v / max), from: a, to: b + 1 }
}

// Rééchantillonne une suite de nombres sur n points (interpolation linéaire).
export function stretch(arr, n) {
  if (!arr.length) return new Array(n).fill(0)
  if (arr.length === 1) return new Array(n).fill(arr[0])
  const out = new Array(n)
  for (let i = 0; i < n; i++) {
    const pos = (i * (arr.length - 1)) / (n - 1)
    const a = Math.floor(pos), t = pos - a
    out[i] = arr[a] * (1 - t) + arr[Math.min(a + 1, arr.length - 1)] * t
  }
  return out
}

// Distance DTW moyenne (|a-b|) le long du meilleur chemin, bande de Sakoe-Chiba.
export function dtw(a, b, band = Math.max(4, Math.round(Math.max(a.length, b.length) * 0.2))) {
  const n = a.length, m = b.length
  if (!n || !m) return Infinity
  const INF = Infinity
  let prev = new Float64Array(m + 1).fill(INF)
  let prevLen = new Float64Array(m + 1)
  prev[0] = 0
  for (let i = 1; i <= n; i++) {
    const cur = new Float64Array(m + 1).fill(INF)
    const curLen = new Float64Array(m + 1)
    const center = Math.round((i * m) / n)
    for (let j = Math.max(1, center - band); j <= Math.min(m, center + band); j++) {
      const cost = Math.abs(a[i - 1] - b[j - 1])
      let best = prev[j - 1], len = prevLen[j - 1]
      if (prev[j] < best) { best = prev[j]; len = prevLen[j] }
      if (cur[j - 1] < best) { best = cur[j - 1]; len = curLen[j - 1] }
      cur[j] = best + cost
      curLen[j] = len + 1
    }
    prev = cur; prevLen = curLen
  }
  return prevLen[m] ? prev[m] / prevLen[m] : Infinity
}

// Hauteur (Hz) par trame de 40 ms (pas de 20 ms) par autocorrélation
// normalisée, 70–700 Hz. null quand la trame est faible ou pas assez périodique.
export function pitchTrack(samples, rate) {
  const R = 11025
  const x = resample(samples, rate, R)
  const size = Math.round(R * 0.04), hop = Math.round(R * 0.02)
  const minLag = Math.floor(R / 700), maxLag = Math.ceil(R / 70)
  let peak = 0
  for (const v of x) peak = Math.max(peak, Math.abs(v))
  const out = []
  for (let s = 0; s + size + maxLag < x.length; s += hop) {
    let e0 = 0
    for (let i = 0; i < size; i++) e0 += x[s + i] * x[s + i]
    if (Math.sqrt(e0 / size) < peak * 0.08) { out.push(null); continue }
    const rs = new Float64Array(maxLag + 1)
    let best = 0
    for (let lag = minLag; lag <= maxLag; lag++) {
      let num = 0, e1 = 0
      for (let i = 0; i < size; i++) { num += x[s + i] * x[s + i + lag]; e1 += x[s + i + lag] * x[s + i + lag] }
      rs[lag] = num / Math.sqrt(e0 * e1 || 1)
      if (rs[lag] > best) best = rs[lag]
    }
    if (best <= 0.55) { out.push(null); continue }
    // Premier pic proche du meilleur : un multiple de la période corrèle
    // presque aussi bien, le prendre ferait sauter le contour d'une octave.
    let lag = minLag
    while (lag < maxLag && !(rs[lag] >= best * 0.9 && rs[lag] >= rs[lag - 1] && rs[lag] >= rs[lag + 1])) lag++
    out.push(R / lag)
  }
  return out
}

// Contour en demi-tons autour de sa médiane (trames voisées seulement).
function contour(track) {
  const st = track.filter((f) => f != null).map((f) => 12 * Math.log2(f))
  if (st.length < 5) return null
  const med = [...st].sort((a, b) => a - b)[Math.floor(st.length / 2)]
  return st.map((v) => v - med)
}

export function verdictOf(score) {
  if (score >= 85) return 'Copie conforme'
  if (score >= 72) return 'Très proche'
  if (score >= 58) return 'On reconnaît bien'
  if (score >= 40) return "Il y a l'idée"
  return 'Pas encore ça'
}

// orig / take : { samples: Float32Array (mono), rate }.
// → { score 0..100, rhythm, melody (null si pas de hauteur exploitable), length, verdict }
export function likeness(orig, take) {
  const lo = trimEnvelope(frameLevels(orig.samples, orig.rate))
  const lt = trimEnvelope(frameLevels(take.samples, take.rate))
  if (!lo || !lt) return { score: 0, rhythm: 0, melody: null, length: 0, verdict: verdictOf(0), silent: !lt }

  const N = 48
  const rhythm = clamp01(1 - dtw(stretch(lo.env, N), stretch(lt.env, N)) / 0.28)
  const length = Math.pow(Math.min(lo.env.length, lt.env.length) / Math.max(lo.env.length, lt.env.length), 0.7)

  // Hauteur sur la partie utile seulement (même découpe que l'enveloppe).
  const frame = (r) => Math.round(r * 0.02)
  const co = contour(pitchTrack(orig.samples.subarray(lo.from * frame(orig.rate), lo.to * frame(orig.rate)), orig.rate))
  const ct = contour(pitchTrack(take.samples.subarray(lt.from * frame(take.rate), lt.to * frame(take.rate)), take.rate))
  const melody = co && ct ? clamp01(1 - dtw(stretch(co, 32), stretch(ct, 32)) / 5) : null

  // La durée pèse peu : être aussi long que l'original ne prouve rien.
  const raw = melody == null
    ? 0.8 * rhythm + 0.2 * length
    : 0.48 * rhythm + 0.4 * melody + 0.12 * length
  const score = Math.round(100 * clamp01(raw))
  return { score, rhythm, melody, length, verdict: verdictOf(score), silent: false }
}
