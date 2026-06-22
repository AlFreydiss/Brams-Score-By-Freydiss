// src/features/nouveau-monde/PlayFrame.jsx
// « Site dans le site » : embarque le jeu DANS le cadre du Nouveau Monde.
// Route /nouveau-monde/:jeu/jouer — la nav du monde (header du layout) reste au-dessus ;
// ici on ajoute une barre de contexte d'île + le jeu scrollable en dessous.
// Jeux React = embarqués tels quels (composants 100vh autonomes). Fred'isu = page statique
// externe → on bascule en plein écran (audio/pointer/fullscreen marchent mal embarqués).

import { lazy, Suspense, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { islandById } from './data/islands'
import { nm } from './theme/tokens'
import GameShell from './game/GameShell'

// id d'île → composant jeu React embarquable (lazy : hors bundle initial).
const EMBED = {
  echecs:        lazy(() => import('../echecs/EchecsPage.jsx')),
  dames:         lazy(() => import('../dames/DamesPage.jsx')),
  'blind-test':  lazy(() => import('../../components/BlindTestPage.jsx')),
  'brams-phone': lazy(() => import('../garticphone/BramsPhonePage.jsx')),
  'brams-arena': lazy(() => import('../../components/BramsTraitorPage.jsx')),
}
// Jeux non-embarquables → plein écran hors du monde.
const EXTERNAL = { fredisu: '/fredisu.html' }

function Centered({ children }) {
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', textAlign: 'center', padding: nm.space.xl }}>
      <div>{children}</div>
    </div>
  )
}

export default function PlayFrame() {
  const { jeu } = useParams()
  const navigate = useNavigate()
  const isl = islandById(jeu)
  const Game = EMBED[jeu]
  const ext = EXTERNAL[jeu]

  // Jeu externe (Fred'isu) : sortie plein écran.
  useEffect(() => { if (ext) window.location.assign(ext) }, [ext])

  if (!isl) {
    return <Centered>
      <h2 style={{ ...nm.type.h1 ?? nm.type.islandName, color: nm.color.foam }}>Île inconnue</h2>
      <Link to="/nouveau-monde" style={{ ...nm.type.button, color: nm.color.goldHi }}>← Retour à la carte</Link>
    </Centered>
  }
  if (ext) {
    return <Centered>
      <div style={{ ...nm.type.eyebrow, color: nm.color.goldHi, marginBottom: nm.space.sm }}>Accostage</div>
      <div style={{ ...nm.type.islandName, color: nm.color.foam }}>Ouverture de {isl.title}…</div>
    </Centered>
  }
  if (!Game) {
    return <Centered>
      <div style={{ ...nm.type.islandName, color: nm.color.foam, marginBottom: nm.space.sm }}>{isl.title} — bientôt jouable ici</div>
      <Link to={`/nouveau-monde/${jeu}`} style={{ ...nm.type.button, color: nm.color.goldHi }}>← Retour à l'île</Link>
    </Centered>
  }

  // Le jeu vit dans le GameShell (topbar retour/prime/⚙ + panneau Avis de Recherche + réglages).
  return (
    <GameShell jeu={jeu}>
      <Suspense fallback={<Centered><div style={{ ...nm.type.eyebrow, color: nm.color.foamDim }}>Chargement de l'île…</div></Centered>}>
        <Game />
      </Suspense>
    </GameShell>
  )
}
