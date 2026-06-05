import { useEffect } from 'react'

// Boost de volume au-delà de 100% pour les lecteurs (tournoi + blind test).
// 100% natif d'un <audio>/<video> est souvent trop faible : on route l'élément
// dans un graphe Web Audio (gain > 1) avec un compresseur pour gagner en
// loudness perçue SANS saturer/cracher sur les pistes déjà fortes.

let _ctx = null
const _wired = new WeakMap() // element -> { gain }

function getCtx() {
  if (typeof window === 'undefined') return null
  if (!_ctx) {
    const Ctx = window.AudioContext || window.webkitAudioContext
    if (!Ctx) return null
    try { _ctx = new Ctx() } catch { return null }
    // Filet de sécurité : une fois un élément routé dans le graphe, un contexte
    // suspendu (autoplay) rendrait le média MUET. On le réveille au 1er geste.
    const wake = () => { if (_ctx && _ctx.state === 'suspended') _ctx.resume().catch(() => {}) }
    ;['pointerdown', 'click', 'keydown', 'touchstart'].forEach(ev =>
      window.addEventListener(ev, wake, { passive: true })
    )
  }
  return _ctx
}

// Branche (une seule fois par élément) source → gain → compresseur → sortie.
// Idempotent : un même élément n'est routé qu'une fois (createMediaElementSource
// ne peut être appelé qu'une fois par média).
export function boostElement(el, boost = 1.7) {
  if (!el) return
  const ctx = getCtx()
  if (!ctx) return
  let node = _wired.get(el)
  if (!node) {
    try {
      const source = ctx.createMediaElementSource(el)
      const gain = ctx.createGain()
      const comp = ctx.createDynamicsCompressor()
      comp.threshold.value = -8
      comp.knee.value = 24
      comp.ratio.value = 12
      comp.attack.value = 0.003
      comp.release.value = 0.25
      source.connect(gain)
      gain.connect(comp)
      comp.connect(ctx.destination)
      node = { gain }
      _wired.set(el, node)
    } catch {
      return // routage impossible → on laisse l'élément jouer normalement
    }
  }
  node.gain.gain.value = boost
  if (ctx.state === 'suspended') ctx.resume().catch(() => {})
}

// Hook : applique le boost à l'élément référencé et relance le contexte au play
// (politique autoplay : le contexte démarre suspendu jusqu'à un geste utilisateur).
export function useAudioBoost(mediaRef, { boost = 1.7, active = true } = {}, deps = []) {
  useEffect(() => {
    if (!active) return
    const el = mediaRef?.current
    if (!el) return
    boostElement(el, boost)
    const resume = () => { if (_ctx && _ctx.state === 'suspended') _ctx.resume().catch(() => {}) }
    el.addEventListener('play', resume)
    return () => el.removeEventListener('play', resume)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}
