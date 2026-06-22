// ── PlateauReglable : pont entre les réglages live et le board (2D/3D) ───────
// Drop-in à la place de <Plateau>/<Plateau3D> dans les modes. Lit les réglages
// résolus (useReglagesEchecs : Nouveau Monde ↔ standalone), choisit la vue 2D/3D
// et injecte toutes les props pilotées par les réglages. Les modes ne changent
// donc qu'un nom d'import + ils n'ont plus à choisir le composant selon `troisD`.
//
// Compat : si `troisD` est passé explicitement (boutons de la barre standalone),
// il prime sur le réglage `plateau3D` (le bouton 2D/3D du hub reste la vérité hors
// Nouveau Monde). Embarqué, `troisD` n'est pas passé → c'est `plateau3D` qui décide.
import Plateau from './Plateau.jsx'
import Plateau3D from './Plateau3D.jsx'
import { useReglagesEchecs } from '../hooks/useReglagesEchecs.js'

export default function PlateauReglable({
  partie,
  orientation = 'white',
  peutJouer,
  onCoup,
  taille = 480,
  interactif = true,
  maCouleur = null,
  troisD,               // override explicite (standalone) ; sinon réglage plateau3D
}) {
  const r = useReglagesEchecs()

  // mesPiecesEnBas : si activé, j'oriente toujours le plateau pour avoir MES pièces
  // en bas. Sans ma couleur (2 joueurs locaux) → on respecte l'orientation passée.
  const orientationEff = r.mesPiecesEnBas && maCouleur
    ? (maCouleur === 'w' ? 'white' : 'black')
    : orientation

  const utiliser3D = troisD !== undefined ? troisD : r.plateau3D
  const Comp = utiliser3D ? Plateau3D : Plateau

  return (
    <Comp
      partie={partie}
      orientation={orientationEff}
      peutJouer={peutJouer}
      onCoup={onCoup}
      taille={taille}
      interactif={interactif}
      maCouleur={maCouleur}
      reglages={r.themeObj}
      animationMs={r.animationMs}
      afficherCoupsLegaux={r.coupsLegaux}
      afficherDernierCoup={r.surbrillanceDernier}
      afficherEchec={r.indicateurEchec}
      premoveActif={r.premove}
      autoPromo={r.autoPromo}
      coordonnees={r.coordonnees}
    />
  )
}
