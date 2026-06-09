// Mode cinéma AFK (accueil) : après 60s sans activité, on efface en fondu les
// textes/cartes/UI (.cinema-hide) + la navbar → il ne reste que l'opening en fond.
// Au moindre mouvement, tout revient en fondu. Aucun canvas/rAF (zéro coût).
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
    const wake = () => {
      if (root.dataset.cinema === '1') root.dataset.cinema = ''
      clearTimeout(timer)
      timer = setTimeout(() => { root.dataset.cinema = '1' }, IDLE_MS)
    }
    const evs = ['mousemove', 'keydown', 'scroll', 'touchstart', 'wheel', 'pointerdown']
    evs.forEach(e => window.addEventListener(e, wake, { passive: true }))
    wake()
    return () => {
      evs.forEach(e => window.removeEventListener(e, wake))
      clearTimeout(timer); root.dataset.cinema = ''
    }
  }, [pathname])
  return null
}
