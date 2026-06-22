// SFX synthétiques (WebAudio) — pas d'asset, pas de dépendance. Sons sobres :
// déplacement (clic mat), capture (thud court), promotion (accord montant), fin.
// Respecte volume + on/off (réglages). Tolérant si l'AudioContext est indispo.
let ctx = null
function ac() {
  if (typeof window === 'undefined') return null
  if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)() } catch { ctx = null } }
  if (ctx && ctx.state === 'suspended') { try { ctx.resume() } catch { /* */ } }
  return ctx
}
function tone(freq, t0, dur, type, gain, vol) {
  const a = ac(); if (!a) return
  const o = a.createOscillator(), g = a.createGain()
  o.type = type || 'sine'; o.frequency.value = freq
  g.gain.setValueAtTime(0, t0)
  g.gain.linearRampToValueAtTime(gain * vol, t0 + 0.008)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  o.connect(g); g.connect(a.destination); o.start(t0); o.stop(t0 + dur + 0.02)
}
export const sfx = {
  move(vol = 0.7) { const a = ac(); if (!a) return; const t = a.currentTime; tone(330, t, 0.08, 'triangle', 0.18, vol) },
  capture(vol = 0.7) { const a = ac(); if (!a) return; const t = a.currentTime; tone(150, t, 0.14, 'square', 0.16, vol); tone(90, t, 0.18, 'sine', 0.2, vol) },
  promote(vol = 0.7) { const a = ac(); if (!a) return; const t = a.currentTime;[392, 523, 659].forEach((f, i) => tone(f, t + i * 0.07, 0.18, 'triangle', 0.16, vol)) },
  win(vol = 0.7) { const a = ac(); if (!a) return; const t = a.currentTime;[523, 659, 784, 1046].forEach((f, i) => tone(f, t + i * 0.09, 0.22, 'triangle', 0.15, vol)) },
  lose(vol = 0.7) { const a = ac(); if (!a) return; const t = a.currentTime;[392, 311, 233].forEach((f, i) => tone(f, t + i * 0.12, 0.26, 'sine', 0.16, vol)) },
  select(vol = 0.7) { const a = ac(); if (!a) return; const t = a.currentTime; tone(520, t, 0.05, 'sine', 0.1, vol) },
}
