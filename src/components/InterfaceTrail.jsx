import { useEffect } from 'react'

// ─────────────────────────────────────────────────────────────────────────────
// « Toucher d'Or » — effet sur l'INTERFACE. Le curseur transforme en OR les
// éléments qu'il survole (recolore le contenu via un filter doré, pas un cadre),
// puis les laisse revenir en douceur. Couplé à une traînée de particules d'or
// (rendue à part par CursorTrail). Sobre, premium — et ça change vraiment le site.
//
// Sûr : n'applique qu'un `filter` inline (réversible), mémorise/restaure l'état
// d'origine, ignore <html>/<body>/canvas/svg + les conteneurs pleine page, et
// nettoie tout au démontage.
// ─────────────────────────────────────────────────────────────────────────────
export default function InterfaceTrail({ config, isGlobal = false }) {
  useEffect(() => {
    const fine = window.matchMedia?.('(pointer: fine)')?.matches
    if (!fine) return undefined

    // Recolore vraiment l'élément en or (sépia → teinte chaude, saturate → éclat).
    const gold = config?.filter || 'sepia(1) saturate(2.2) hue-rotate(-12deg) brightness(1.04)'
    const hold = config?.hold || 520

    const touched = new Map() // el -> { filter, trans, timer }

    const restore = (el) => {
      const s = touched.get(el)
      if (!s) return
      touched.delete(el)
      el.style.filter = s.filter // transition encore active → fond en douceur
      window.setTimeout(() => { if (!touched.has(el)) el.style.transition = s.trans }, 340)
    }

    const eligible = (el) => {
      if (!el || el === document.body || el === document.documentElement) return false
      const tag = el.tagName
      if (tag === 'HTML' || tag === 'CANVAS' || tag === 'SVG' || tag === 'PATH') return false
      const r = el.getBoundingClientRect()
      if (r.width < 6 || r.height < 6) return false
      // Conteneur quasi pleine page → on saute (on dore des éléments, pas tout l'écran d'un coup)
      if (r.width > window.innerWidth * 0.88 && r.height > window.innerHeight * 0.5) return false
      return true
    }

    let last = null
    const onMove = (e) => {
      if (isGlobal && document.body.dataset.trailPreview === '1') return
      if (isGlobal && document.body.dataset.drawOpen === 'true') return // pas d'effet pendant le dessin Freydiss Phone
      const el = document.elementFromPoint(e.clientX, e.clientY)
      if (!el || el === last) return
      last = el
      if (!eligible(el)) return
      if (!touched.has(el)) touched.set(el, { filter: el.style.filter, trans: el.style.transition, timer: 0 })
      const s = touched.get(el)
      el.style.transition = 'filter .3s ease'
      el.style.filter = gold
      window.clearTimeout(s.timer)
      s.timer = window.setTimeout(() => restore(el), hold)
    }

    window.addEventListener('pointermove', onMove, { passive: true })
    return () => {
      window.removeEventListener('pointermove', onMove)
      for (const el of [...touched.keys()]) {
        const s = touched.get(el)
        window.clearTimeout(s.timer)
        el.style.filter = s.filter
        el.style.transition = s.trans
        touched.delete(el)
      }
    }
  }, [config, isGlobal])

  return null
}
