// ── Sons du jeu, 100 % WebAudio (zéro asset à charger) ──────────────────────
// Petits « tocs » boisés synthétisés : coup, capture, roque, échec, début/fin
// de partie, tic d'horloge basse. Volume réglable + mute, persistés.
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
    master.connect(ctx.destination)
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

// toc boisé : bruit court filtré passe-bande + sinus grave
function toc(freq = 1100, gain = 0.5, durMs = 70, sinFreq = 190) {
  const c = ensureCtx(); if (!c || isMuted()) return
  const t0 = c.currentTime
  const dur = durMs / 1000
  // claquement (bruit filtré)
  const n = c.createBufferSource()
  const buf = c.createBuffer(1, Math.ceil(c.sampleRate * dur), c.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2.2)
  n.buffer = buf
  const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = freq; bp.Q.value = 1.1
  const g1 = c.createGain(); g1.gain.setValueAtTime(gain, t0); g1.gain.exponentialRampToValueAtTime(0.001, t0 + dur)
  n.connect(bp); bp.connect(g1); g1.connect(master); n.start(t0)
  // corps grave
  const o = c.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(sinFreq, t0)
  o.frequency.exponentialRampToValueAtTime(Math.max(40, sinFreq * 0.55), t0 + dur)
  const g2 = c.createGain(); g2.gain.setValueAtTime(gain * 0.7, t0); g2.gain.exponentialRampToValueAtTime(0.001, t0 + dur)
  o.connect(g2); g2.connect(master); o.start(t0); o.stop(t0 + dur + 0.02)
}

function note(freq, t0Off, durMs, gain = 0.18, type = 'triangle') {
  const c = ensureCtx(); if (!c || isMuted()) return
  const t0 = c.currentTime + t0Off
  const dur = durMs / 1000
  const o = c.createOscillator(); o.type = type; o.frequency.value = freq
  const g = c.createGain()
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.015)
  g.gain.exponentialRampToValueAtTime(0.001, t0 + dur)
  o.connect(g); g.connect(master); o.start(t0); o.stop(t0 + dur + 0.05)
}

export const sons = {
  debloquer() { ensureCtx() },                      // à appeler sur 1er geste utilisateur
  coup()    { toc(1100, 0.5, 70, 190) },
  capture() { toc(700, 0.62, 95, 150); toc(1500, 0.3, 50, 240) },
  roque()   { toc(1100, 0.42, 60, 190); setTimeout(() => toc(900, 0.42, 60, 170), 90) },
  echec()   { note(740, 0, 130, 0.16, 'square'); note(622, 0.1, 170, 0.14, 'square') },
  illegal() { note(180, 0, 110, 0.12, 'sawtooth') },
  debut()   { note(392, 0, 140); note(523, 0.1, 140); note(659, 0.2, 220) },
  victoire(){ note(523, 0, 150); note(659, 0.12, 150); note(784, 0.24, 150); note(1046, 0.36, 320, 0.2) },
  defaite() { note(392, 0, 200); note(311, 0.16, 220); note(233, 0.32, 380, 0.16) },
  nulle()   { note(440, 0, 180); note(440, 0.18, 240, 0.12) },
  tic()     { toc(2200, 0.16, 30, 600) },
  notif()   { note(880, 0, 110, 0.14); note(1108, 0.09, 150, 0.12) },
}
