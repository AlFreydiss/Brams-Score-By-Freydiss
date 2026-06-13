import { useEffect } from 'react'

// ─────────────────────────────────────────────────────────────────────────────
// Traînée INTERACTIVE « Toucher d'Or » : pas de particules. Le curseur laisse un
// SILLAGE sur l'INTERFACE — chaque élément qu'il survole se teinte d'or (film
// interne + liseré lumineux) puis revient en douceur. Sobre, premium, réversible.
//
// Sûr par construction :
//  • n'applique qu'un box-shadow inline (zéro impact layout, n'altère pas les vraies couleurs),
//  • mémorise puis restaure le box-shadow/transition d'origine de chaque élément,
//  • ignore <html>/<body>, le canvas, et les conteneurs pleine page,
//  • nettoie tout au démontage.
// ─────────────────────────────────────────────────────────────────────────────
export default function InterfaceTrail({ config, isGlobal = false }) {
  useEffect(() => {
    const fine = window.matchMedia?.('(pointer: fine)')?.matches
    if (!fine) return undefined

    const film = config?.film || 'rgba(201,168,106,0.26)'
    const glow = config?.glow || 'rgba(212,180,131,0.55)'
    const hold = config?.hold || 650
    const lit = `inset 0 0 70px ${film}, 0 0 0 1px ${glow}, 0 4px 26px ${glow}`

    // el -> { box, trans, timer } (état d'origine + minuteur de restauration)
    const touched = new Map()
    let last = null

    const restore = (el) => {
      const s = touched.get(el)
      if (!s) return
      touched.delete(el)
      el.style.boxShadow = s.box        // transition encore active → fond en douceur
      window.setTimeout(() => { if (!touched.has(el)) el.style.transition = s.trans }, 320)
    }

    const eligible = (el) => {
      if (!el || el === document.body || el === document.documentElement) return false
      const tag = el.tagName
      if (tag === 'HTML' || tag === 'CANVAS' || tag === 'SVG' || tag === 'PATH') return false
      const r = el.getBoundingClientRect()
      if (r.width < 8 || r.height < 8) return false
      // Conteneur pleine page → on saute (on veut éclairer des éléments, pas le fond)
      if (r.width > window.innerWidth * 0.9 && r.height > window.innerHeight * 0.55) return false
      return true
    }

    const onMove = (e) => {
      // En boutique : la traînée GLOBALE se masque pendant qu'on prévisualise une autre.
      if (isGlobal && document.body.dataset.trailPreview === '1') return
      const el = document.elementFromPoint(e.clientX, e.clientY)
      if (!el || el === last) return
      last = el
      if (!eligible(el)) return
      if (!touched.has(el)) touched.set(el, { box: el.style.boxShadow, trans: el.style.transition, timer: 0 })
      const s = touched.get(el)
      el.style.transition = 'box-shadow .3s ease'
      el.style.boxShadow = lit
      window.clearTimeout(s.timer)
      s.timer = window.setTimeout(() => restore(el), hold)
    }

    window.addEventListener('pointermove', onMove, { passive: true })
    return () => {
      window.removeEventListener('pointermove', onMove)
      for (const el of [...touched.keys()]) {
        const s = touched.get(el)
        window.clearTimeout(s.timer)
        el.style.boxShadow = s.box
        el.style.transition = s.trans
        touched.delete(el)
      }
    }
  }, [config, isGlobal])

  return null
}
