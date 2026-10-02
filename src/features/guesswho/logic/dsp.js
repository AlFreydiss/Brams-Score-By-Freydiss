// Guess Who — traitement de la prise (logique PURE, testée sous Node) :
// mono, coupe des silences début/fin, volume ramené à un niveau commun,
// rééchantillonnage, encodage WAV, et pics pour dessiner l'onde.

const FRAME_MS = 20

export function mixToMono(channels) {
  if (!channels?.length) return new Float32Array(0)
  if (channels.length === 1) return Float32Array.from(channels[0])
  const n = channels[0].length
  const out = new Float32Array(n)
  for (const ch of channels) for (let i = 0; i < n; i++) out[i] += ch[i] / channels.length
  return out
}

// Niveau RMS par tranche de 20 ms.
export function frameLevels(samples, rate, frameMs = FRAME_MS) {
  const size = Math.max(1, Math.round((rate * frameMs) / 1000))
  const out = new Float32Array(Math.ceil(samples.length / size))
  for (let f = 0; f < out.length; f++) {
    let sum = 0
    const a = f * size, b = Math.min(samples.length, a + size)
    for (let i = a; i < b; i++) sum += samples[i] * samples[i]
    out[f] = Math.sqrt(sum / Math.max(1, b - a))
  }
  return out
}

// Seuil de voix : au-dessus du bruit de fond (10e centile) et d'un plancher absolu.
function voiceThreshold(levels) {
  const sorted = Float32Array.from(levels).sort()
  const floor = sorted[Math.floor(sorted.length * 0.1)] || 0
  const max = sorted[sorted.length - 1] || 0
  return Math.min(Math.max(0.012, floor * 2.5), max * 0.5)
}

// Bornes [start, end[ (en échantillons) de la partie utile, avec une marge.
// null si la prise est muette (rien au-dessus de ~-44 dBFS).
export function voicedBounds(samples, rate, { padStartMs = 120, padEndMs = 220, silentRms = 0.006 } = {}) {
  const levels = frameLevels(samples, rate)
  if (!levels.length) return null
  let peak = 0
  for (const v of levels) peak = Math.max(peak, v)
  if (peak < silentRms) return null
  const th = voiceThreshold(levels)
  let first = -1, last = -1
  for (let f = 0; f < levels.length; f++) {
    if (levels[f] >= th) { if (first < 0) first = f; last = f }
  }
  const size = Math.round((rate * FRAME_MS) / 1000)
  const start = Math.max(0, first * size - Math.round((rate * padStartMs) / 1000))
  const end = Math.min(samples.length, (last + 1) * size + Math.round((rate * padEndMs) / 1000))
  return { start, end }
}

// Gain pour amener la voix (tranches au-dessus du seuil) à un RMS cible,
// borné pour ne pas transformer un souffle en vacarme.
export function normalizeGain(samples, rate, { targetRms = 0.16, maxGain = 10, minGain = 0.4 } = {}) {
  const levels = frameLevels(samples, rate)
  if (!levels.length) return 1
  const th = voiceThreshold(levels)
  let sum = 0, n = 0
  for (const v of levels) if (v >= th) { sum += v * v; n++ }
  if (!n || sum === 0) return 1
  const rms = Math.sqrt(sum / n)
  return Math.min(maxGain, Math.max(minGain, targetRms / rms))
}

// Limiteur doux : linéaire jusqu'à `knee`, puis approche 1 sans jamais écrêter.
export function softClip(x, knee = 0.7) {
  const a = Math.abs(x)
  if (a <= knee) return x
  const room = 1 - knee
  return Math.sign(x) * (knee + room * Math.tanh((a - knee) / room))
}

// Rééchantillonnage : moyenne par fenêtre en descente (anti-repliement
// sommaire), interpolation linéaire sinon.
export function resample(samples, from, to) {
  if (from === to || !samples.length) return Float32Array.from(samples)
  const ratio = from / to
  const out = new Float32Array(Math.max(1, Math.floor(samples.length / ratio)))
  for (let i = 0; i < out.length; i++) {
    const pos = i * ratio
    if (ratio > 1) {
      const a = Math.floor(pos), b = Math.min(samples.length, Math.max(a + 1, Math.floor(pos + ratio)))
      let s = 0
      for (let j = a; j < b; j++) s += samples[j]
      out[i] = s / (b - a)
    } else {
      const a = Math.floor(pos), t = pos - a
      out[i] = samples[a] * (1 - t) + (samples[Math.min(a + 1, samples.length - 1)] * t)
    }
  }
  return out
}

// Prise complète → échantillons prêts à encoder. `silent` : rien d'audible.
export function processTake(channels, rate, { outRate = 22050, fadeMs = 12 } = {}) {
  const mono = mixToMono(channels)
  const bounds = voicedBounds(mono, rate)
  if (!bounds) {
    const out = resample(mono, rate, outRate)
    return { samples: out, rate: outRate, duration: out.length / outRate, gain: 1, silent: true }
  }
  const cut = mono.subarray(bounds.start, bounds.end)
  const gain = normalizeGain(cut, rate)
  const out = resample(cut, rate, outRate)
  const fade = Math.min(Math.floor(out.length / 2), Math.round((outRate * fadeMs) / 1000))
  for (let i = 0; i < out.length; i++) {
    let v = softClip(out[i] * gain)
    if (i < fade) v *= i / fade
    else if (i >= out.length - fade) v *= (out.length - 1 - i) / fade
    out[i] = v
  }
  return { samples: out, rate: outRate, duration: out.length / outRate, gain, silent: false }
}

// WAV PCM 16 bits mono : lisible partout (iPhone compris), contrairement au webm.
export function encodeWav(samples, rate) {
  const bytes = new Uint8Array(44 + samples.length * 2)
  const v = new DataView(bytes.buffer)
  const str = (o, s) => { for (let i = 0; i < s.length; i++) bytes[o + i] = s.charCodeAt(i) }
  str(0, 'RIFF'); v.setUint32(4, 36 + samples.length * 2, true); str(8, 'WAVE')
  str(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true)
  v.setUint32(24, rate, true); v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true)
  str(36, 'data'); v.setUint32(40, samples.length * 2, true)
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]))
    v.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true)
  }
  return bytes
}

// Pics 0..1 par barre (onde dessinée), mis à l'échelle du plus fort.
export function peaksOf(samples, bars = 64) {
  const out = new Array(bars).fill(0)
  if (!samples?.length) return out
  const size = samples.length / bars
  let max = 0
  for (let b = 0; b < bars; b++) {
    let p = 0
    const a = Math.floor(b * size), e = Math.max(a + 1, Math.floor((b + 1) * size))
    for (let i = a; i < e && i < samples.length; i++) p = Math.max(p, Math.abs(samples[i]))
    out[b] = p
    max = Math.max(max, p)
  }
  return max > 0 ? out.map((p) => p / max) : out
}
