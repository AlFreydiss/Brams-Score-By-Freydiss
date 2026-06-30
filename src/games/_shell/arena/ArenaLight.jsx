// ArenaLight — lumière d'ambiance plein écran derrière le plateau.
// Vignette fixe + halo qui bascule (chaud/froid) selon le trait. Purement décoratif
// (aria-hidden), sous le contenu (zIndex 0). Respecte prefers-reduced-motion :
// la transition de halo est coupée, le halo statique reste.
import { light } from './arenaTokens.js'
import { useReducedMotion } from 'framer-motion'

// turn : 'warm' (camp clair actif) | 'cool' (camp sombre actif) | null (neutre)
export default function ArenaLight({ turn = null }) {
  const reduce = useReducedMotion()
  const halo = turn === 'warm' ? light.warm : turn === 'cool' ? light.cool : 'transparent'
  return (
    <div aria-hidden style={{ position: 'absolute', inset: 0, zIndex: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      <div style={{ position: 'absolute', inset: 0, background: light.floor }} />
      <div style={{
        position: 'absolute', inset: 0, background: halo,
        transition: reduce ? 'none' : 'background 900ms cubic-bezier(.4,0,.2,1)',
      }} />
      <div style={{ position: 'absolute', inset: 0, background: light.vignette }} />
    </div>
  )
}
