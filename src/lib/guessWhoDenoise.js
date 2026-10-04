// Guess Who — réduction de bruit façon Krisp : RNNoise (réseau de neurones de
// Xiph, celui qu'utilisent Jitsi et consorts) en AudioWorklet, via
// @sapphi-red/web-noise-suppressor. Ce module est chargé à la demande (import
// dynamique) : le WASM (~150 ko) ne part qu'à l'ouverture du micro.
//
// micro brut → AudioContext 48 kHz → RNNoise → MediaStreamDestination
// Le flux de sortie remplace le micro partout (prise, onde, réglage).
// Tout échec (pas d'AudioWorklet, Firefox qui refuse un contexte à 48 kHz sur
// un micro à 44,1, contexte bloqué sur iPhone hors geste…) → null, et
// l'appelant garde le micro brut : on ne casse jamais l'enregistrement.
import { RnnoiseWorkletNode, loadRnnoise } from '@sapphi-red/web-noise-suppressor'
import workletUrl from '@sapphi-red/web-noise-suppressor/rnnoiseWorklet.js?url'
import wasmUrl from '@sapphi-red/web-noise-suppressor/rnnoise.wasm?url'
import simdUrl from '@sapphi-red/web-noise-suppressor/rnnoise_simd.wasm?url'

let wasm = null
const loadWasm = () => (wasm ??= loadRnnoise({ url: wasmUrl, simdUrl }).catch((e) => { wasm = null; throw e }))
const modules = new WeakSet()
const timeout = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))])

// shared : contexte audio déjà débloqué par un geste (iPhone). Utilisé s'il
// tourne à 48 kHz, sinon on en crée un à nous (fermé avec le micro).
export async function denoiseStream(raw, shared = null) {
  if (typeof AudioWorkletNode === 'undefined') return null
  let ctx = null, owned = false
  try {
    if (shared && shared.sampleRate === 48000 && shared.state === 'running') ctx = shared
    else {
      const AC = window.AudioContext || window.webkitAudioContext
      ctx = new AC({ sampleRate: 48000, latencyHint: 'interactive' })
      owned = true
    }
    if (ctx.state !== 'running') await timeout(ctx.resume(), 800).catch(() => {})
    if (ctx.state !== 'running' || !ctx.audioWorklet) throw new Error('ctx_blocked')
    const [bin] = await Promise.all([
      timeout(loadWasm(), 8000),
      modules.has(ctx) ? null : timeout(ctx.audioWorklet.addModule(workletUrl), 8000).then(() => modules.add(ctx)),
    ])
    const src = ctx.createMediaStreamSource(raw)
    const node = new RnnoiseWorkletNode(ctx, { maxChannels: 1, wasmBinary: bin })
    const dest = ctx.createMediaStreamDestination()
    dest.channelCount = 1
    src.connect(node).connect(dest)
    let closed = false
    return {
      stream: dest.stream,
      close() {
        if (closed) return
        closed = true
        try { src.disconnect(); node.disconnect() } catch { /* déjà coupé */ }
        try { node.destroy() } catch { /* idem */ }
        dest.stream.getTracks().forEach((t) => t.stop())
        if (owned) ctx.close().catch(() => {})
      },
    }
  } catch {
    if (owned) ctx?.close().catch(() => {})
    return null
  }
}
