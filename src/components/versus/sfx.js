// Bruitages synthétisés (Web Audio) : aucun fichier, tout est généré.
// Coupés par défaut : on les active depuis le bouton Son (localStorage versus_sfx = '1').

const KEY = 'versus_sfx'
let ctx = null
let master = null
let noiseBuf = null

export function sfxEnabled() {
  try { return localStorage.getItem(KEY) === '1' } catch { return false }
}
export function setSfxEnabled(on) {
  try { localStorage.setItem(KEY, on ? '1' : '0') } catch {}
}

function ac() {
  if (!sfxEnabled()) return null
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return null
    ctx = new AC()
    master = ctx.createGain()
    master.gain.value = 0.22
    const comp = ctx.createDynamicsCompressor()
    master.connect(comp).connect(ctx.destination)
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 1.2, ctx.sampleRate)
    const d = noiseBuf.getChannelData(0)
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  }
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

function env(g, t, a, peak, dur) {
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(peak, t + a)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
}

function noise(t, dur, { type = 'bandpass', f0 = 2000, f1 = 400, q = 1, peak = 0.8, a = 0.005 } = {}) {
  const src = ctx.createBufferSource(); src.buffer = noiseBuf
  const f = ctx.createBiquadFilter(); f.type = type; f.Q.value = q
  f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(f1, t + dur)
  const g = ctx.createGain(); env(g, t, a, peak, dur)
  src.connect(f).connect(g).connect(master)
  src.start(t); src.stop(t + dur + 0.05)
}

function tone(t, dur, { type = 'sine', f0 = 440, f1 = f0, peak = 0.5, a = 0.004 } = {}) {
  const o = ctx.createOscillator(); o.type = type
  o.frequency.setValueAtTime(f0, t); if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur)
  const g = ctx.createGain(); env(g, t, a, peak, dur)
  o.connect(g).connect(master)
  o.start(t); o.stop(t + dur + 0.05)
}

export const sfx = {
  // Lame qui fend l'air puis tinte
  slash() {
    if (!ac()) return; const t = ctx.currentTime
    noise(t, 0.22, { f0: 6000, f1: 900, q: 2.5, peak: 0.7 })
    tone(t + 0.05, 0.6, { type: 'triangle', f0: 2600, f1: 2450, peak: 0.12 })
    tone(t + 0.05, 0.45, { type: 'sine', f0: 3900, peak: 0.06 })
  },
  // Coup sourd du gagnant, plus grave quand le combo monte
  impact(boost = 0) {
    if (!ac()) return; const t = ctx.currentTime
    tone(t, 0.32, { f0: 150 + boost * 8, f1: 38, peak: 0.9 })
    noise(t, 0.14, { type: 'lowpass', f0: 1800, f1: 200, peak: 0.6 })
  },
  stamp() {
    if (!ac()) return; const t = ctx.currentTime
    noise(t, 0.06, { type: 'highpass', f0: 2500, f1: 1500, peak: 0.5, a: 0.002 })
    tone(t, 0.08, { type: 'square', f0: 220, f1: 110, peak: 0.12 })
  },
  whoosh() {
    if (!ac()) return; const t = ctx.currentTime
    noise(t, 0.55, { f0: 250, f1: 3200, q: 1.4, peak: 0.45, a: 0.18 })
  },
  combo(n) {
    if (!ac()) return; const t = ctx.currentTime
    const base = 440 * Math.pow(2, Math.min(n, 12) / 12)
    tone(t, 0.12, { type: 'square', f0: base, peak: 0.08 })
    tone(t + 0.07, 0.16, { type: 'square', f0: base * 1.5, peak: 0.08 })
  },
  heartbeat() {
    if (!ac()) return; const t = ctx.currentTime
    tone(t, 0.16, { f0: 70, f1: 45, peak: 0.7 })
    tone(t + 0.2, 0.18, { f0: 62, f1: 40, peak: 0.5 })
  },
  rewind() {
    if (!ac()) return; const t = ctx.currentTime
    tone(t, 0.35, { type: 'sawtooth', f0: 900, f1: 160, peak: 0.06 })
    noise(t, 0.35, { f0: 3000, f1: 400, q: 3, peak: 0.25 })
  },
  // Accord final du champion
  fanfare() {
    if (!ac()) return; const t = ctx.currentTime
    ;[0, 4, 7, 12].forEach((s, i) => tone(t + i * 0.09, 1.6 - i * 0.1, { type: 'triangle', f0: 261.6 * Math.pow(2, s / 12), peak: 0.16, a: 0.02 }))
    tone(t, 0.5, { f0: 110, f1: 55, peak: 0.6 })
  },
}

export function buzz(pattern) {
  try { navigator.vibrate?.(pattern) } catch {}
}
