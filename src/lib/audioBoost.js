// Boost de loudness au-delà de 100% pour le lecteur du tournoi (openings).
// 100% natif d'un <video> est souvent trop faible : on route l'élément dans un
// graphe Web Audio (gain > 1) avec un compresseur pour gagner en puissance
// perçue SANS saturer les pistes déjà fortes.
//
// PRÉREQUIS : l'élément média doit avoir crossOrigin="anonymous" ET la source
// (R2) doit renvoyer Access-Control-Allow-Origin, sinon le média est "tainted"
// et Web Audio le rend MUET. R2 (pub-*.r2.dev) renvoie bien ACAO:* sur GET.

let _ctx = null
const _wired = new WeakMap() // element -> { gain }

// URL dédiée CORS : évite la "pollution de cache" où une réponse R2 mise en
// cache SANS en-tête Origin (aperçu non-cors) est réutilisée par une requête
// crossOrigin → échec CORS → la vidéo ne charge plus. Le paramètre force une
// entrée de cache distincte toujours récupérée avec Origin (donc ACAO:*).
export function corsUrl(u) {
  if (!u) return u
  return u + (u.includes('?') ? '&' : '?') + 'cors=1'
}

function getCtx() {
  if (typeof window === 'undefined') return null
  if (!_ctx) {
    const Ctx = window.AudioContext || window.webkitAudioContext
    if (!Ctx) return null
    try { _ctx = new Ctx() } catch { return null }
    // Un contexte suspendu (autoplay) rendrait le média routé muet : on le
    // réveille au 1er geste utilisateur.
    const wake = () => { if (_ctx && _ctx.state === 'suspended') _ctx.resume().catch(() => {}) }
    ;['pointerdown', 'click', 'keydown', 'touchstart'].forEach(ev =>
      window.addEventListener(ev, wake, { passive: true })
    )
  }
  return _ctx
}

// Branche (une seule fois par élément) source → gain → compresseur → sortie.
// createMediaElementSource ne peut être appelé qu'une fois par média → WeakMap.
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
      return // routage impossible → l'élément joue normalement (volume natif)
    }
  }
  node.gain.gain.value = boost
  if (ctx.state === 'suspended') ctx.resume().catch(() => {})
}

// Ajuste le gain d'un élément SANS le router inutilement : si l'élément n'a
// jamais été boosté et que boost<=1, on ne touche à rien (zéro risque pour les
// pistes normales). Sinon on route/ajuste. Prérequis identiques (crossOrigin+CORS).
export function setBoost(el, boost = 1) {
  if (!el) return
  if (_wired.has(el) || boost > 1) boostElement(el, boost)
}
