// Freydiss Phone — sons synthétisés (Web Audio, zéro asset) + haptique, avec mute
// persistant. Un seul AudioContext partagé, repris à chaque jeu (le navigateur le
// suspend tant qu'il n'y a pas eu de geste utilisateur — nos blips partent dès le
// premier clic Créer/Rejoindre/Prêt). Le même toggle coupe sons ET vibrations.
let _ctx = null
let _muted = (() => { try { return localStorage.getItem('bp_muted') === '1' } catch { return false } })()

function ctx() {
  if (typeof window === 'undefined') return null
  if (!_ctx) {
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return null
    try { _ctx = new AC() } catch { return null }
  }
  if (_ctx.state === 'suspended') _ctx.resume().catch(() => {})
  return _ctx
}

export function isMuted() { return _muted }
export function setMuted(m) { _muted = !!m; try { localStorage.setItem('bp_muted', m ? '1' : '0') } catch {} }
export function toggleMuted() { setMuted(!_muted); return _muted }

// Enveloppe courte sur un oscillateur (attaque rapide, extinction exponentielle).
function blip({ freq = 440, dur = 0.12, type = 'sine', gain = 0.1, slideTo = null }) {
  const ac = ctx(); if (!ac || _muted) return
  const t = ac.currentTime
  const osc = ac.createOscillator(), g = ac.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t)
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur)
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(gain, t + 0.012)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  osc.connect(g); g.connect(ac.destination)
  osc.start(t); osc.stop(t + dur + 0.03)
}

const SOUNDS = {
  join:   () => blip({ freq: 520, slideTo: 780, dur: 0.14, type: 'triangle', gain: 0.07 }),
  submit: () => blip({ freq: 660, slideTo: 990, dur: 0.12, type: 'sine', gain: 0.09 }),
  phase:  () => blip({ freq: 392, slideTo: 588, dur: 0.18, type: 'triangle', gain: 0.09 }),
  tick:   () => blip({ freq: 880, dur: 0.06, type: 'square', gain: 0.045 }),
  reveal: () => { blip({ freq: 523, dur: 0.16, type: 'triangle', gain: 0.09 }); setTimeout(() => blip({ freq: 784, dur: 0.24, type: 'triangle', gain: 0.09 }), 130) },
  // Fanfare montante (do-mi-sol-do) au grand final / podium.
  win: () => { [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => setTimeout(() => blip({ freq, dur: i === 3 ? 0.42 : 0.18, type: 'triangle', gain: 0.1 }), i * 110)) },
}

export function playSound(name) { try { SOUNDS[name]?.() } catch {} }

// Vibration mobile (gated par le même mute). Pattern = nombre ou tableau ms.
export function vibrate(pattern) {
  if (_muted) return
  try { navigator.vibrate?.(pattern) } catch {}
}
