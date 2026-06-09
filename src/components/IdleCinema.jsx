// Mode cinéma AFK (accueil) : après 60s sans activité, on efface en fondu les
// textes/cartes/UI (.cinema-hide) + la navbar → il ne reste que l'opening en fond.
// Au moindre mouvement, tout revient en fondu. Aucun canvas/rAF (zéro coût).
// Raccourci clavier « C » : bascule le mode cinéma INSTANTANÉMENT (sans attendre
// la minute). « Échap » en sort. Ignoré quand on saisit dans un champ.
import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

const IDLE_MS = 60000

export default function IdleCinema() {
  const { pathname } = useLocation()
  useEffect(() => {
    const root = document.documentElement
    root.dataset.cinema = ''
    if (pathname !== '/') return
    let timer

    const isCinemaKey = (e) => e.key === 'c' || e.key === 'C'
    const isTyping = (e) => {
      const t = e.target
      const tag = (t?.tagName || '').toLowerCase()
      return tag === 'input' || tag === 'textarea' || tag === 'select' || t?.isContentEditable
    }

    const wake = (e) => {
      // La touche « C » pilote le cinéma → ne pas la traiter comme un réveil.
      if (e && e.type === 'keydown' && isCinemaKey(e)) return
      if (root.dataset.cinema === '1') root.dataset.cinema = ''
      clearTimeout(timer)
      timer = setTimeout(() => { root.dataset.cinema = '1' }, IDLE_MS)
    }

    const onKey = (e) => {
      if (isTyping(e) || e.metaKey || e.ctrlKey || e.altKey) return
      if (isCinemaKey(e)) {
        e.preventDefault()
        root.dataset.cinema = root.dataset.cinema === '1' ? '' : '1'
        clearTimeout(timer)
        if (root.dataset.cinema === '') timer = setTimeout(() => { root.dataset.cinema = '1' }, IDLE_MS)
      } else if (e.key === 'Escape' && root.dataset.cinema === '1') {
        wake()
      }
    }

    const evs = ['mousemove', 'scroll', 'touchstart', 'wheel', 'pointerdown']
    evs.forEach(e => window.addEventListener(e, wake, { passive: true }))
    window.addEventListener('keydown', wake, { passive: true })
    window.addEventListener('keydown', onKey)
    wake()
    return () => {
      evs.forEach(e => window.removeEventListener(e, wake))
      window.removeEventListener('keydown', wake)
      window.removeEventListener('keydown', onKey)
      clearTimeout(timer); root.dataset.cinema = ''
    }
  }, [pathname])
  return null
}
