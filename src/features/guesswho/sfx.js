// Guess Who — effets sonores synthétisés (WebAudio, aucun fichier) + vibrations.
// Coupables par joueur (localStorage « gw_sfx »). Jamais joués pendant l'enregistrement :
// les écrans de prise de son n'appellent rien d'ici.
const KEY = 'gw_sfx'
let ctx = null
let muted = (() => { try { return localStorage.getItem(KEY) === 'off' } catch { return false } })()
const listeners = new Set()

function audio() {
  if (muted || typeof window === 'undefined') return null
  const AC = window.AudioContext || window.webkitAudioContext
  if (!AC) return null
  if (!ctx) { try { ctx = new AC() } catch { return null } }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {})
  return ctx
}

// iOS : le contexte doit naître (ou reprendre) dans un geste utilisateur.
if (typeof window !== 'undefined') {
  const unlock = () => { if (!muted) audio() }
  window.addEventListener('pointerdown', unlock, { passive: true })
  window.addEventListener('keydown', unlock)
}

export const isMuted = () => muted
export function setMuted(v) {
  muted = !!v
  try { localStorage.setItem(KEY, muted ? 'off' : 'on') } catch { /* stockage indisponible */ }
  listeners.forEach((f) => f(muted))
}
export function onMuteChange(f) { listeners.add(f); return () => listeners.delete(f) }

export function vibrate(pattern) {
  try { if (!muted) navigator.vibrate?.(pattern) } catch { /* non supporté (iOS) */ }
}

// Volume général des effets (identité sobre : un cran plus doux qu'avant).
const MASTER = 0.7

// Note brève : forme, fréquence (avec glissando), durée, volume, départ.
function tone(c, { type = 'square', f = 440, to, d = 0.1, v = 0.12, at = 0 }) {
  const t = c.currentTime + at
  const o = c.createOscillator()
  const g = c.createGain()
  o.type = type
  o.frequency.setValueAtTime(f, t)
  if (to) o.frequency.exponentialRampToValueAtTime(to, t + d)
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(v * MASTER, t + 0.008)
  g.gain.exponentialRampToValueAtTime(0.0001, t + d)
  o.connect(g).connect(c.destination)
  o.start(t)
  o.stop(t + d + 0.02)
}

// Souffle de bruit filtré (whoosh / impact).
function noise(c, { d = 0.3, v = 0.18, f = 1200, to = 300, at = 0 }) {
  const t = c.currentTime + at
  const len = Math.max(1, Math.floor(c.sampleRate * d))
  const buf = c.createBuffer(1, len, c.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1
  const src = c.createBufferSource()
  src.buffer = buf
  const flt = c.createBiquadFilter()
  flt.type = 'bandpass'
  flt.frequency.setValueAtTime(f, t)
  flt.frequency.exponentialRampToValueAtTime(to, t + d)
  const g = c.createGain()
  g.gain.setValueAtTime(v * MASTER, t)
  g.gain.exponentialRampToValueAtTime(0.0001, t + d)
  src.connect(flt).connect(g).connect(c.destination)
  src.start(t)
}

const SOUNDS = {
  tick: (c) => tone(c, { type: 'square', f: 1400, d: 0.04, v: 0.06 }),
  tickHi: (c) => tone(c, { type: 'square', f: 1900, d: 0.06, v: 0.09 }),
  pop: (c) => tone(c, { type: 'triangle', f: 520, to: 1100, d: 0.09, v: 0.16 }),
  select: (c) => { tone(c, { type: 'triangle', f: 660, d: 0.07, v: 0.14 }); tone(c, { type: 'triangle', f: 990, d: 0.1, v: 0.14, at: 0.06 }) },
  whoosh: (c) => noise(c, { d: 0.35, v: 0.22, f: 400, to: 2600 }),
  slot: (c) => tone(c, { type: 'square', f: 880, d: 0.025, v: 0.05 }),
  count: (c) => tone(c, { type: 'triangle', f: 700, to: 900, d: 0.06, v: 0.1 }),
  boom: (c) => { tone(c, { type: 'sine', f: 140, to: 40, d: 0.45, v: 0.5 }); noise(c, { d: 0.25, v: 0.25, f: 900, to: 120 }) },
  heartbreak: (c) => { tone(c, { type: 'sawtooth', f: 520, to: 180, d: 0.35, v: 0.09 }); tone(c, { type: 'sawtooth', f: 390, to: 120, d: 0.45, v: 0.07, at: 0.12 }) },
  fanfare: (c) => [523, 659, 784, 1047].forEach((f, i) => tone(c, { type: 'square', f, d: i === 3 ? 0.45 : 0.12, v: 0.08, at: i * 0.11 })),
}

export function play(name) {
  const c = audio()
  if (!c || !SOUNDS[name]) return
  try { SOUNDS[name](c) } catch { /* contexte fermé */ }
}
