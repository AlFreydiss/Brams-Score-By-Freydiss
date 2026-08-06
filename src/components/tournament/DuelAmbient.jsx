// Fond d'ambiance d'un duel : collage flouté des miniatures des 2 openings,
// remplit toute la page (plus de zone noire) même quand aucune vidéo ne joue.
// Partagé entre le tournoi solo (TournamentPage) et multi (TournamentRoomPage).
const PINK = '#9d174d'
const hexA = (c, a) => {
  const n = parseInt(String(c || '#9d174d').replace('#', ''), 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`
}

export default function DuelAmbient({ left, right }) {
  const leftColor = left?.color || PINK
  const rightColor = right?.color || PINK
  return (
    <div aria-hidden style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(72% 44% at 50% 0%, ${hexA(leftColor, 0.16)}, transparent 70%), radial-gradient(72% 44% at 50% 100%, ${hexA(rightColor, 0.16)}, transparent 70%), radial-gradient(58% 90% at 100% 52%, ${hexA(rightColor, 0.2)}, transparent 74%), radial-gradient(46% 90% at 0% 52%, ${hexA(leftColor, 0.16)}, transparent 72%), linear-gradient(180deg, rgba(8,7,11,.34), rgba(8,7,11,.28) 50%, rgba(8,7,11,.46)), radial-gradient(60% 50% at 50% 50%, rgba(8,7,11,.2), transparent 75%)` }} />
    </div>
  )
}
