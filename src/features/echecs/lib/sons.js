// ── Sons du jeu, 100 % WebAudio (zéro asset à charger) ──────────────────────
// Synthèse façon chess.com : « thocks » boisés (transitoire bruité passe-bas +
// corps modal qui plonge + partiel inharmonique), jingles courts et sobres.
// Bus maître : gain (volume/mute) → compresseur léger (colle + anti-clip).
// Volume réglable + mute, persistés.
import { VOLUME_DEFAUT, CLE_VOLUME, CLE_MUTE } from '../constants.js'

let ctx = null
let master = null

function ensureCtx() {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return null
    ctx = new AC()
    master = ctx.createGain()
    master.gain.value = getVolume()
    // compresseur doux : recolle les jingles et empêche les pics de clipper
    const comp = ctx.createDynamicsCompressor()
    comp.threshold.value = -14
    comp.knee.value = 24
    comp.ratio.value = 3
    comp.attack.value = 0.003
    comp.release.value = 0.18
    master.connect(comp)
    comp.connect(ctx.destination)
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {})
  return ctx
}

export function getVolume() {
  try { const v = parseFloat(localStorage.getItem(CLE_VOLUME)); return Number.isFinite(v) ? v : VOLUME_DEFAUT } catch { return VOLUME_DEFAUT }
}
export function setVolume(v) {
  try { localStorage.setItem(CLE_VOLUME, String(v)) } catch {}
  if (master) master.gain.value = isMuted() ? 0 : v
}
export function isMuted() {
  try { return localStorage.getItem(CLE_MUTE) === '1' } catch { return false }
}
export function setMuted(m) {
  try { localStorage.setItem(CLE_MUTE, m ? '1' : '0') } catch {}
  if (master) master.gain.value = m ? 0 : getVolume()
}

// ── Helpers de synthèse ─────────────────────────────────────────────────────
// Petit guard : (ctx, t0) prêts, sinon null (pas de son si muet/indispo).
function start() {
  const c = ensureCtx()
  if (!c || isMuted()) return null
  return { c, t0: c.currentTime + 0.002 } // +2 ms : évite de planifier dans le passé
}

// Buffer de bruit blanc à enveloppe puissance (fade naturel intégré).
function noiseBuffer(c, dur, shape = 2.5) {
  const len = Math.max(1, Math.ceil(c.sampleRate * dur))
  const buf = c.createBuffer(1, len, c.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, shape)
  return buf
}

// « thock » boisé : (1) transitoire bruité passe-bas = claquement sec sans métal,
// (2) corps = sinus qui plonge (résonance modale du bois), (3) partiel inharmonique
// optionnel pour passer du « bip » au « bois ». ~60-100 ms.
function thock(c, t0, { body = 300, partial = 0.25, click = 2300, gain = 0.5, durMs = 80, noiseGain = 0.5 } = {}) {
  const dur = durMs / 1000
  // 1) transitoire
  const nDur = Math.min(dur, 0.05)
  const n = c.createBufferSource(); n.buffer = noiseBuffer(c, nDur, 4)
  const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = click; lp.Q.value = 0.9
  const gn = c.createGain()
  gn.gain.setValueAtTime(gain * noiseGain, t0)
  gn.gain.exponentialRampToValueAtTime(0.0006, t0 + nDur)
  n.connect(lp); lp.connect(gn); gn.connect(master); n.start(t0)
  // 2) corps
  const o = c.createOscillator(); o.type = 'sine'
  o.frequency.setValueAtTime(body, t0)
  o.frequency.exponentialRampToValueAtTime(Math.max(45, body * 0.52), t0 + dur)
  const go = c.createGain()
  go.gain.setValueAtTime(gain, t0)
  go.gain.exponentialRampToValueAtTime(0.0006, t0 + dur)
  o.connect(go); go.connect(master); o.start(t0); o.stop(t0 + dur + 0.02)
  // 3) partiel inharmonique
  if (partial > 0) {
    const o2 = c.createOscillator(); o2.type = 'triangle'
    o2.frequency.setValueAtTime(body * 2.76, t0)
    o2.frequency.exponentialRampToValueAtTime(Math.max(70, body * 1.35), t0 + dur * 0.7)
    const g2 = c.createGain()
    g2.gain.setValueAtTime(gain * partial, t0)
    g2.gain.exponentialRampToValueAtTime(0.0006, t0 + dur * 0.65)
    o2.connect(g2); g2.connect(master); o2.start(t0); o2.stop(t0 + dur)
  }
}

// Snap : court éclat de bruit passe-haut = le « crac » qui claque par-dessus.
function snap(c, t0, { hp = 2600, gain = 0.3, durMs = 30 } = {}) {
  const dur = durMs / 1000
  const n = c.createBufferSource(); n.buffer = noiseBuffer(c, dur, 2.5)
  const f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp
  const g = c.createGain()
  g.gain.setValueAtTime(gain, t0)
  g.gain.exponentialRampToValueAtTime(0.0006, t0 + dur)
  n.connect(f); f.connect(g); g.connect(master); n.start(t0)
}

// Voix mélodique : attaque douce + release exponentiel (pluck naturel). lp adoucit
// les ondes vives (square/saw), glideTo fait planer la note.
function note(c, t0, freq, durMs, { gain = 0.18, type = 'triangle', glideTo = null, lp = null } = {}) {
  const dur = durMs / 1000
  const o = c.createOscillator(); o.type = type
  o.frequency.setValueAtTime(freq, t0)
  if (glideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, glideTo), t0 + dur)
  let node = o
  if (lp) { const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lp; f.Q.value = 0.6; o.connect(f); node = f }
  const g = c.createGain()
  const atk = Math.min(0.012, dur * 0.3)
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(gain, t0 + atk)
  g.gain.exponentialRampToValueAtTime(0.0008, t0 + dur)
  node.connect(g); g.connect(master); o.start(t0); o.stop(t0 + dur + 0.05)
}

// Cloche douce : fondamentale + partiel aigu à décroissance rapide (timbre « ding »).
function bell(c, t0, freq, { gain = 0.14, durMs = 200 } = {}) {
  note(c, t0, freq, durMs, { gain, type: 'sine' })
  note(c, t0, freq * 2.0, durMs * 0.6, { gain: gain * 0.45, type: 'sine' })
}

export const sons = {
  debloquer() { ensureCtx() },                      // à appeler sur 1er geste utilisateur

  // coup : thock boisé court et sec (la pièce se pose)
  coup() {
    const s = start(); if (!s) return
    thock(s.c, s.t0, { body: 300, partial: 0.25, click: 2400, gain: 0.5, durMs: 80 })
  },

  // capture : plus sourd et percussif que coup + un « crac » par-dessus
  capture() {
    const s = start(); if (!s) return
    thock(s.c, s.t0, { body: 200, partial: 0.3, click: 1600, gain: 0.62, durMs: 105, noiseGain: 0.6 })
    snap(s.c, s.t0, { hp: 2600, gain: 0.26, durMs: 32 })
  },

  // roque : double-thock (roi puis tour qui se posent)
  roque() {
    const s = start(); if (!s) return
    thock(s.c, s.t0, { body: 320, partial: 0.22, gain: 0.45, durMs: 66 })
    thock(s.c, s.t0 + 0.085, { body: 250, partial: 0.26, gain: 0.45, durMs: 78 })
  },

  // échec : alerte brève et montante (danger sur le roi)
  echec() {
    const s = start(); if (!s) return
    note(s.c, s.t0, 740, 95, { gain: 0.15, type: 'square', lp: 2400 })
    note(s.c, s.t0 + 0.085, 988, 150, { gain: 0.16, type: 'square', lp: 2600 })
  },

  // promotion : petit toc puis arpège ascendant brillant (la pièce « monte en grade »)
  promotion() {
    const s = start(); if (!s) return
    thock(s.c, s.t0, { body: 300, partial: 0.2, gain: 0.32, durMs: 55 })
    note(s.c, s.t0 + 0.04, 523, 110, { gain: 0.14 })
    note(s.c, s.t0 + 0.13, 659, 110, { gain: 0.14 })
    note(s.c, s.t0 + 0.22, 784, 120, { gain: 0.14 })
    note(s.c, s.t0 + 0.31, 1047, 220, { gain: 0.16 })
    note(s.c, s.t0 + 0.33, 1568, 160, { gain: 0.07, type: 'sine' }) // paillette
  },

  // temps bas : double tic aigu et insistant (distinct du tic d'horloge normal)
  tempsBas() {
    const s = start(); if (!s) return
    snap(s.c, s.t0, { hp: 3200, gain: 0.18, durMs: 22 })
    note(s.c, s.t0, 2200, 30, { gain: 0.08, type: 'sine' })
    snap(s.c, s.t0 + 0.13, { hp: 3200, gain: 0.18, durMs: 22 })
    note(s.c, s.t0 + 0.13, 2200, 30, { gain: 0.08, type: 'sine' })
  },

  // illegal : « nope » sourd et grave (coup interdit)
  illegal() {
    const s = start(); if (!s) return
    note(s.c, s.t0, 165, 120, { gain: 0.13, type: 'sawtooth', lp: 700, glideTo: 120 })
    note(s.c, s.t0 + 0.02, 110, 90, { gain: 0.08, type: 'sine' })
  },

  // début : triade ascendante chaude et sobre
  debut() {
    const s = start(); if (!s) return
    note(s.c, s.t0, 392, 150, { gain: 0.16 })
    note(s.c, s.t0 + 0.1, 494, 150, { gain: 0.16 })
    note(s.c, s.t0 + 0.2, 587, 240, { gain: 0.18 })
  },

  // victoire : arpège majeur triomphant + paillette finale
  victoire() {
    const s = start(); if (!s) return
    note(s.c, s.t0, 523, 150, { gain: 0.16 })
    note(s.c, s.t0 + 0.12, 659, 150, { gain: 0.16 })
    note(s.c, s.t0 + 0.24, 784, 150, { gain: 0.16 })
    note(s.c, s.t0 + 0.36, 1046, 340, { gain: 0.2 })
    note(s.c, s.t0 + 0.38, 1568, 240, { gain: 0.08, type: 'sine' })
  },

  // défaite : descente mineure sombre, dernière note grave et longue
  defaite() {
    const s = start(); if (!s) return
    note(s.c, s.t0, 392, 200, { gain: 0.16 })
    note(s.c, s.t0 + 0.16, 311, 230, { gain: 0.16 })
    note(s.c, s.t0 + 0.34, 233, 440, { gain: 0.17, lp: 1400 })
    note(s.c, s.t0 + 0.36, 116.5, 460, { gain: 0.1, type: 'sine' }) // poids grave
  },

  // nulle : deux notes neutres qui retombent doucement (ni gagné ni perdu)
  nulle() {
    const s = start(); if (!s) return
    note(s.c, s.t0, 466, 200, { gain: 0.13 })
    note(s.c, s.t0 + 0.18, 415, 280, { gain: 0.12 })
  },

  // tic : tic d'horloge discret et net
  tic() {
    const s = start(); if (!s) return
    snap(s.c, s.t0, { hp: 3000, gain: 0.1, durMs: 16 })
    note(s.c, s.t0, 1800, 20, { gain: 0.05, type: 'sine' })
  },

  // notif : petit « ding-ding » de cloche agréable (appariement / message)
  notif() {
    const s = start(); if (!s) return
    bell(s.c, s.t0, 880, { gain: 0.13, durMs: 160 })
    bell(s.c, s.t0 + 0.1, 1174, { gain: 0.12, durMs: 220 })
  },
}
