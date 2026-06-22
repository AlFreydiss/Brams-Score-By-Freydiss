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

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' }}>
      {/* Barre de contexte d'île — on reste dans le monde, retour en 1 clic */}
      <div style={{
        flexShrink: 0, display: 'flex', alignItems: 'center', gap: nm.space.md,
        padding: `8px ${nm.space.lg}`, zIndex: 2,
        background: 'rgba(6,20,31,0.62)', backdropFilter: 'blur(10px)',
        borderBottom: `1px solid ${nm.color.mist}`,
      }}>
        <button
          type="button"
          onClick={() => navigate(`/nouveau-monde/${jeu}`)}
          style={{
            ...nm.type.button, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '7px 14px', borderRadius: nm.radius.pill, color: nm.color.foam,
            background: 'rgba(6,20,31,0.6)', border: `1px solid ${isl.accent}55`,
          }}
        >← {isl.title}</button>
        <Link to="/nouveau-monde" style={{ ...nm.type.button, color: nm.color.foamDim, textDecoration: 'none' }}>🧭 Carte</Link>
        <span style={{ ...nm.type.eyebrow, color: nm.color.goldHi, marginLeft: 'auto' }}>{isl.tagline}</span>
      </div>

      {/* Le jeu, scrollable dans le cadre du monde */}
      <div style={{ flex: 1, minHeight: 0, overflow: 'auto', position: 'relative', background: nm.color.abyss }}>
        <Suspense fallback={<Centered><div style={{ ...nm.type.eyebrow, color: nm.color.foamDim }}>Chargement de l'île…</div></Centered>}>
          <Game />
        </Suspense>
      </div>
    </div>
  )
}
