// Mode Parchemin — overlay sépia/papier vieilli appliqué sur TOUT le site quand
// activé (depuis l'accueil). Donne le vibe carte au trésor One Piece. Inline
// styles, aucun canvas/rAF (zéro impact perf) : juste un overlay fixe en blend.
import { useEffect, useState } from 'react'

const KEY = 'brams_parchment'
const EVT = 'brams-parchment-change'

export function isParchmentOn() {
  try { return localStorage.getItem(KEY) === '1' } catch { return false }
}
export function toggleParchment() {
  const next = !isParchmentOn()
  try { next ? localStorage.setItem(KEY, '1') : localStorage.removeItem(KEY) } catch {}
  window.dispatchEvent(new Event(EVT))
  return next
}

// Texture fibre de papier (SVG bruit, encodé) — discrète.
const PAPER = `data:image/svg+xml,${encodeURIComponent(
  "<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='p'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(#p)' opacity='0.5'/></svg>"
)}`

export default function ParchmentMode() {
  const [on, setOn] = useState(isParchmentOn)
  useEffect(() => {
    const read = () => setOn(isParchmentOn())
    window.addEventListener(EVT, read)
    window.addEventListener('storage', read)
    return () => { window.removeEventListener(EVT, read); window.removeEventListener('storage', read) }
  }, [])
  if (!on) return null
  return (
    <>
      {/* Teinte chaude sépia (réchauffe tout le site) */}
      <div aria-hidden style={{
        position: 'fixed', inset: 0, zIndex: 70, pointerEvents: 'none',
        background: 'radial-gradient(120% 90% at 50% 0%, rgba(196,154,74,0.30), rgba(120,86,38,0.22) 55%, rgba(60,40,16,0.30) 100%)',
        mixBlendMode: 'overlay',
      }} />
      {/* Vignette + grain papier */}
      <div aria-hidden style={{
        position: 'fixed', inset: 0, zIndex: 71, pointerEvents: 'none', opacity: 0.5,
        backgroundImage: `url("${PAPER}")`, backgroundSize: '180px 180px', mixBlendMode: 'multiply',
      }} />
      <div aria-hidden style={{
        position: 'fixed', inset: 0, zIndex: 72, pointerEvents: 'none',
        boxShadow: 'inset 0 0 220px rgba(60,38,12,0.55)',
      }} />
    </>
  )
}
