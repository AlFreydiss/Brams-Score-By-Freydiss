import { useEffect } from 'react'

// Fred'isu est une page statique 100% autonome (public/fredisu.html). On l'ouvre
// en TOP-LEVEL (pas en iframe : audio/pointer/fullscreen marchent mal embarqués).
// Cette route /fredisu redirige vers le jeu pour les anciens liens/bookmarks.
export default function FredisuPage() {
  useEffect(() => { window.location.replace('/fredisu.html') }, [])
  return (
    <div style={{ position: 'fixed', inset: 0, display: 'grid', placeItems: 'center', background: '#08090d', color: '#f0d27a', fontFamily: 'system-ui, sans-serif' }}>
      Ouverture de Fred'isu…
    </div>
  )
}
