// Échiquier vrai 3D (react-three-fiber). MÊME interface que Plateau : drop-in.
// Logique de coup déléguée à useInteractionEchecs ; pièces = nœuds clonés (profond)
// du GLB, auto-ajustés (Box3) à la case. Matériaux d'origine (marbre blanc/noir).
import { Suspense, useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, useGLTF, ContactShadows, Html } from '@react-three/drei'
import * as THREE from 'three'
import { THEME, MODELE_3D_URL, NOEUDS_PIECES_3D, CREDIT_3D } from '../constants.js'
import { squareVers3D, piecesDepuisFen } from '../lib/coords3d.js'
import { useInteractionEchecs } from '../hooks/useInteractionEchecs.js'
import SelecteurPromotion from './SelecteurPromotion.jsx'
import Plateau from './Plateau.jsx'

const FICHIERS = 'abcdefgh'
useGLTF.preload(MODELE_3D_URL)

// Couleurs 3D : flat hex obligatoire (three ne parse pas les gradients/rgba CSS).
// caseClaire / caseFoncee / gold de THEME sont déjà des hex valides → réutilisés.
const C3D = {
  claire: THEME.caseClaire, foncee: THEME.caseFoncee,   // cases (hex)
  selection: THEME.gold, legal: THEME.gold,             // sélection + anneau coups légaux
  dernier: '#b9a44a', echec: '#e05a4e',                 // dernier coup + roi en échec (CSS → hex plat)
}

// Clone profond + normalisation : base à y=0, centré en x/z, mis à l'échelle d'une case.
function normaliserPiece(src) {
  if (!src) return null
  const o = src.clone(true)
  o.position.set(0, 0, 0); o.rotation.set(0, 0, 0); o.scale.set(1, 1, 1)
  o.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true } })
  const box = new THREE.Box3().setFromObject(o)
  const size = new THREE.Vector3(); box.getSize(size)
  const center = new THREE.Vector3(); box.getCenter(center)
  const footprint = Math.max(size.x, size.z) || 1
  const scale = 0.70 / footprint // un peu d'air entre les pièces (la rangée du fond se chevauchait à 0.82)
  o.position.set(-center.x, -box.min.y, -center.z) // recentré, base au sol
  const g = new THREE.Group(); g.add(o); g.scale.setScalar(scale)
  return g
}

// Pièce : objet normalisé dans un group animé qui lerp vers la case cible.
function Piece3D({ nodes, nodeName, cible, type }) {
  const ref = useRef()
  const obj = useMemo(() => normaliserPiece(nodeName && nodes[nodeName]), [nodes, nodeName])
  useFrame((_, dt) => {
    const o = ref.current; if (!o) return
    const k = Math.min(1, dt * 9)
    o.position.x += (cible[0] - o.position.x) * k
    o.position.z += (cible[2] - o.position.z) * k
    const d = Math.hypot(cible[0] - o.position.x, cible[2] - o.position.z)
    o.position.y = type === 'n' ? Math.min(0.6, d) : 0 // petit saut pour le cavalier
  })
  if (!obj) return null
  return <group ref={ref} position={cible}><primitive object={obj} /></group>
}

function Echiquier({ orientation, surbrillances, onCaseClic, pieceSur }) {
  const cases = []
  for (let f = 0; f < 8; f++) for (let r = 0; r < 8; r++) {
    const square = FICHIERS[f] + (r + 1)
    const [x, , z] = squareVers3D(square, orientation)
    const claire = (f + r) % 2 === 1
    const sb = surbrillances[square]
    cases.push(
      <mesh key={square} position={[x, -0.06, z]} receiveShadow
        onClick={(e) => { e.stopPropagation(); onCaseClic(square, pieceSur(square)) }}>
        <boxGeometry args={[1, 0.12, 1]} />
        <meshStandardMaterial color={sb?.color || (claire ? C3D.claire : C3D.foncee)} />
      </mesh>
    )
    if (sb?.legal) cases.push(
      <mesh key={square + '-l'} position={[x, 0.02, z]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.12, 0.2, 28]} />
        <meshStandardMaterial color={C3D.legal} emissive={C3D.legal} emissiveIntensity={0.7} transparent opacity={0.9} />
      </mesh>
    )
  }
  return <group>{cases}</group>
}

function Scene({ partie, orientation, inter, pieceSur }) {
  const { nodes } = useGLTF(MODELE_3D_URL)
  const pieces = useMemo(() => piecesDepuisFen(partie.fen), [partie.fen])
  const surbrillances = useMemo(() => {
    const s = {}
    if (partie.dernierCoup) { s[partie.dernierCoup.from] = { color: C3D.dernier }; s[partie.dernierCoup.to] = { color: C3D.dernier } }
    if (inter.selection) s[inter.selection] = { color: C3D.selection }
    for (const m of inter.coupsLegauxSel) s[m.to] = { ...(s[m.to] || {}), legal: true }
    if (partie.caseRoiEnEchec) s[partie.caseRoiEnEchec] = { color: C3D.echec }
    return s
  }, [partie.dernierCoup, partie.caseRoiEnEchec, inter.selection, inter.coupsLegauxSel])

  return (
    <>
      <Echiquier orientation={orientation} surbrillances={surbrillances} onCaseClic={inter.onCaseClic} pieceSur={pieceSur} />
      {pieces.map((p) => (
        <Piece3D key={p.square} nodes={nodes} nodeName={NOEUDS_PIECES_3D?.[p.couleur]?.[p.type]}
          cible={squareVers3D(p.square, orientation)} type={p.type} />
      ))}
    </>
  )
}

export default function Plateau3D({ partie, orientation = 'white', peutJouer, onCoup, interactif = true }) {
  const inter = useInteractionEchecs(partie, { peutJouer, onCoup, interactif })
  const pieceSur = useMemo(() => {
    const m = {}; for (const p of piecesDepuisFen(partie.fen)) m[p.square] = p.couleur
    return (sq) => m[sq] || null
  }, [partie.fen])

  // Fallback 2D si WebGL absent (sinon <Canvas> crash). Après tous les hooks.
  const webgl = useMemo(() => {
    try { const c = document.createElement('canvas'); return !!(window.WebGLRenderingContext && (c.getContext('webgl') || c.getContext('experimental-webgl'))) } catch { return false }
  }, [])
  if (!webgl) return <Plateau partie={partie} orientation={orientation} peutJouer={peutJouer} onCoup={onCoup} interactif={interactif} taille={480} />

  return (
    <div data-testid="plateau3d-wrap" style={{ position: 'relative', width: '100%', height: 'min(72vh, 560px)' }}>
      <Canvas shadows dpr={[1, 1.6]} camera={{ position: orientation === 'black' ? [0, 8, -8] : [0, 8, 8], fov: 42 }}>
        <color attach="background" args={['#0b0a0e']} />
        <ambientLight intensity={0.6} />
        <directionalLight position={[6, 12, 6]} intensity={1.4} castShadow shadow-mapSize={[1024, 1024]} />
        <directionalLight position={[-6, 8, -4]} intensity={0.4} />
        <Suspense fallback={<Html center style={{ color: '#cbb26b', font: '700 14px sans-serif', whiteSpace: 'nowrap' }}>Chargement de l'échiquier 3D…</Html>}>
          <Scene partie={partie} orientation={orientation} inter={inter} pieceSur={pieceSur} />
        </Suspense>
        <ContactShadows position={[0, -0.12, 0]} opacity={0.5} scale={14} blur={2.4} far={5} />
        <OrbitControls enablePan={false} minDistance={6} maxDistance={18} maxPolarAngle={Math.PI / 2.15} target={[0, 0, 0]} />
      </Canvas>
      <div style={{ position: 'absolute', bottom: 6, right: 10, fontSize: 9, color: 'rgba(255,255,255,0.32)', pointerEvents: 'none' }}>{CREDIT_3D}</div>
      {inter.promo && (
        <SelecteurPromotion couleur={partie.trait} onChoisir={inter.choisirPromotion} onAnnuler={inter.annulerPromo} />
      )}
    </div>
  )
}
