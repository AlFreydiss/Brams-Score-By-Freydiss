// Échiquier vrai 3D (react-three-fiber). MÊME interface que Plateau : drop-in.
// Logique de coup déléguée à useInteractionEchecs ; pièces = nœuds clonés (profond)
// du GLB, auto-ajustés (Box3) à la case. Matériaux d'origine (marbre blanc/noir).
import { Suspense, useMemo, useRef, useEffect, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, useGLTF, ContactShadows, Html, Line } from '@react-three/drei'
import * as THREE from 'three'
import { THEME, MODELE_3D_URL, NOEUDS_PIECES_3D, CREDIT_3D } from '../constants.js'
import { squareVers3D, piecesDepuisFen } from '../lib/coords3d.js'
import { useInteractionEchecs } from '../hooks/useInteractionEchecs.js'
import SelecteurPromotion from './SelecteurPromotion.jsx'
import Plateau from './Plateau.jsx'

const FICHIERS = 'abcdefgh'
useGLTF.preload(MODELE_3D_URL)

// Préférence système « réduire les animations » → effets atténués / désactivés.
function prefersReducedMotion() {
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches } catch { return false }
}

// Couleurs 3D : flat hex obligatoire (three ne parse pas les gradients/rgba CSS).
// caseClaire / caseFoncee / gold de THEME sont déjà des hex valides → réutilisés.
const C3D = {
  claire: THEME.caseClaire, foncee: THEME.caseFoncee,   // cases (hex)
  selection: THEME.gold, legal: THEME.gold,             // sélection + anneau coups légaux
  dernier: '#b9a44a', echec: '#e05a4e',                 // dernier coup + roi en échec (CSS → hex plat)
  or: '#ffd700',                                         // or pirate (particules / éclats)
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

// Pièce vivante : lerp vers la case cible. `roiTombe` = roi maté qui bascule lentement.
function Piece3D({ nodes, nodeName, cible, type, roiTombe = false, selectionnee = false }) {
  const ref = useRef()
  const obj = useMemo(() => normaliserPiece(nodeName && nodes[nodeName]), [nodes, nodeName])
  const tombeRef = useRef(0)
  useFrame(({ clock }, dt) => {
    const o = ref.current; if (!o) return
    const k = Math.min(1, dt * 9)
    o.position.x += (cible[0] - o.position.x) * k
    o.position.z += (cible[2] - o.position.z) * k
    const d = Math.hypot(cible[0] - o.position.x, cible[2] - o.position.z)
    o.position.y = type === 'n' ? Math.min(0.6, d) : 0 // petit saut pour le cavalier
    // Sélection : légère lévitation oscillante (cosmétique, n'affecte pas la cible/logique).
    if (selectionnee && !roiTombe) o.position.y += 0.18 + Math.sin(clock.elapsedTime * 4) * 0.04
    // Mat : le roi perdant bascule lentement (jusqu'à ~couché sur le flanc).
    if (roiTombe) {
      tombeRef.current = Math.min(1, tombeRef.current + dt * 1.4)
      o.rotation.x = -tombeRef.current * (Math.PI / 2.1)
      o.position.y = Math.sin(tombeRef.current * Math.PI / 2) * 0.12
    }
  })
  if (!obj) return null
  return <group ref={ref} position={cible}><primitive object={obj} /></group>
}

// Trajectoire du dernier coup : arc laser de la case de départ à la case d'arrivée,
// via le MÊME squareVers3D que les pièces (donc correct + même flip d'orientation).
// S'efface en ~1.4s et se relance à chaque nouveau coup.
function TrajectoireCoup({ dernierCoup, orientation }) {
  const ref = useRef()
  const tRef = useRef(0)
  const points = useMemo(() => {
    if (!dernierCoup?.from || !dernierCoup?.to) return null
    const a = squareVers3D(dernierCoup.from, orientation)
    const b = squareVers3D(dernierCoup.to, orientation)
    const N = 28, pts = []
    for (let i = 0; i <= N; i++) {
      const t = i / N
      pts.push([
        a[0] + (b[0] - a[0]) * t,
        0.08 + Math.sin(Math.PI * t) * 0.6,   // arc relevé, ancré aux deux cases
        a[2] + (b[2] - a[2]) * t,
      ])
    }
    return pts
  }, [dernierCoup?.from, dernierCoup?.to, orientation])
  useEffect(() => { tRef.current = 0 }, [dernierCoup?.from, dernierCoup?.to])
  useFrame((_, dt) => {
    const o = ref.current; if (!o?.material) return
    tRef.current += dt
    o.material.opacity = Math.max(0, 1 - tRef.current / 1.4)
  })
  if (!points) return null
  return <Line ref={ref} points={points} color="#ff3b3b" lineWidth={4} transparent opacity={1} />
}

// Éclat de capture : courte gerbe de particules (InstancedMesh) qui jaillit de la case,
// + un flash doré (sprite additif) qui s'estompe. Auto-démonté via onTermine après ~1s.
function EclatCapture({ position, reduit, onTermine }) {
  const inst = useRef()
  const flash = useRef()
  const tRef = useRef(0)
  const N = reduit ? 10 : 26
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const parts = useMemo(() => (
    Array.from({ length: N }, () => {
      const a = Math.random() * Math.PI * 2
      const sp = 1.4 + Math.random() * 2.0
      return {
        vx: Math.cos(a) * sp * 0.6,
        vy: 2.2 + Math.random() * 2.4,
        vz: Math.sin(a) * sp * 0.6,
        s: 0.04 + Math.random() * 0.05,
      }
    })
  ), [N])
  const DUREE = 0.95
  useFrame((_, dt) => {
    tRef.current += dt
    const t = tRef.current
    const im = inst.current
    if (im) {
      for (let i = 0; i < N; i++) {
        const p = parts[i]
        const px = position[0] + p.vx * t
        const py = Math.max(0, 0.1 + p.vy * t - 6.5 * t * t) // gravité
        const pz = position[2] + p.vz * t
        dummy.position.set(px, py, pz)
        const sc = p.s * Math.max(0, 1 - t / DUREE)
        dummy.scale.setScalar(sc)
        dummy.updateMatrix()
        im.setMatrixAt(i, dummy.matrix)
      }
      im.instanceMatrix.needsUpdate = true
    }
    if (flash.current?.material) {
      const k = Math.max(0, 1 - t / 0.4)
      flash.current.material.opacity = k * 0.9
      const s = 0.6 + (1 - k) * 1.6
      flash.current.scale.setScalar(s)
    }
    if (t >= DUREE) onTermine?.()
  })
  return (
    <group>
      <instancedMesh ref={inst} args={[null, null, N]}>
        <icosahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color={C3D.or} emissive={C3D.or} emissiveIntensity={1.4} toneMapped={false} />
      </instancedMesh>
      <mesh ref={flash} position={[position[0], 0.4, position[2]]}>
        <sphereGeometry args={[1, 12, 12]} />
        <meshBasicMaterial color={C3D.or} transparent opacity={0.9} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  )
}

// Pluie d'or de victoire : pièces d'or (cylindres aplatis) qui tombent du ciel
// au-dessus du plateau. Modeste, nettoyée par useState côté Scene après ~3.5s.
function PluieOr({ reduit }) {
  const inst = useRef()
  const tRef = useRef(0)
  const N = reduit ? 24 : 70
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const coins = useMemo(() => (
    Array.from({ length: N }, () => ({
      x: (Math.random() - 0.5) * 9,
      z: (Math.random() - 0.5) * 9,
      y0: 6 + Math.random() * 6,
      vy: 2.5 + Math.random() * 2.5,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 6,
      s: 0.1 + Math.random() * 0.08,
      delay: Math.random() * 0.8,
    }))
  ), [N])
  useFrame((_, dt) => {
    tRef.current += dt
    const im = inst.current; if (!im) return
    for (let i = 0; i < N; i++) {
      const c = coins[i]
      const t = Math.max(0, tRef.current - c.delay)
      const y = c.y0 - c.vy * t
      dummy.position.set(c.x, Math.max(-0.1, y), c.z)
      dummy.rotation.set(Math.PI / 2, c.rot + c.vr * t, 0)
      dummy.scale.setScalar(y < -0.05 ? 0 : c.s)
      dummy.updateMatrix()
      im.setMatrixAt(i, dummy.matrix)
    }
    im.instanceMatrix.needsUpdate = true
  })
  return (
    <instancedMesh ref={inst} args={[null, null, N]}>
      <cylinderGeometry args={[1, 1, 0.18, 14]} />
      <meshStandardMaterial color={C3D.or} emissive={C3D.or} emissiveIntensity={0.55} metalness={0.9} roughness={0.25} toneMapped={false} />
    </instancedMesh>
  )
}

// Caméra : amortissement OrbitControls + secousse d'échec + dolly de mat.
function CameraRig({ controlsRef, secousse, matVers, reduit }) {
  const { camera } = useThree()
  const baseRef = useRef(null)
  const shakeRef = useRef(0)
  const dollyRef = useRef(0)

  useEffect(() => { if (secousse && !reduit) shakeRef.current = 1 }, [secousse, reduit])
  useEffect(() => { if (matVers) dollyRef.current = 0.0001 }, [matVers])

  useFrame((_, dt) => {
    // Secousse d'échec : petit offset décroissant appliqué après damping d'OrbitControls.
    if (shakeRef.current > 0) {
      shakeRef.current = Math.max(0, shakeRef.current - dt * 2.2)
      const a = shakeRef.current * 0.14
      camera.position.x += (Math.random() - 0.5) * a
      camera.position.y += (Math.random() - 0.5) * a
    }
    // Dolly de mat : on glisse doucement vers le camp vainqueur + on se rapproche.
    if (dollyRef.current > 0) {
      dollyRef.current = Math.min(1, dollyRef.current + dt * (reduit ? 1.2 : 0.4))
      const c = controlsRef.current
      if (c && matVers) {
        const k = dt * 1.4
        c.target.x += (matVers[0] * 0.6 - c.target.x) * k
        c.target.z += (matVers[2] * 0.6 - c.target.z) * k
        const d = camera.position.length()
        const dCible = reduit ? d : 9
        camera.position.multiplyScalar(1 + (dCible / d - 1) * k * 0.5)
        c.update()
      }
    }
  })
  return null
}

function Echiquier({ orientation, surbrillances, onCaseClic, pieceSur, caseEchec }) {
  const echecRef = useRef()
  // Throb rouge émissif sur la case du roi en échec.
  useFrame(({ clock }) => {
    const m = echecRef.current; if (!m) return
    const v = 0.5 + 0.5 * Math.sin(clock.elapsedTime * 7)
    m.emissiveIntensity = 0.4 + v * 1.1
  })
  const cases = []
  for (let f = 0; f < 8; f++) for (let r = 0; r < 8; r++) {
    const square = FICHIERS[f] + (r + 1)
    const [x, , z] = squareVers3D(square, orientation)
    const claire = (f + r) % 2 === 1
    const sb = surbrillances[square]
    const estEchec = square === caseEchec
    const cliquable = !!pieceSur(square) || !!sb?.legal
    cases.push(
      <mesh key={square} position={[x, -0.06, z]} receiveShadow
        onClick={(e) => { e.stopPropagation(); onCaseClic(square, pieceSur(square)) }}
        onPointerOver={cliquable ? (e) => { e.stopPropagation(); document.body.style.cursor = 'pointer' } : undefined}
        onPointerOut={cliquable ? () => { document.body.style.cursor = 'auto' } : undefined}>
        <boxGeometry args={[1, 0.12, 1]} />
        <meshStandardMaterial
          ref={estEchec ? echecRef : undefined}
          color={sb?.color || (claire ? C3D.claire : C3D.foncee)}
          emissive={estEchec ? C3D.echec : '#000000'}
          emissiveIntensity={estEchec ? 1 : 0}
        />
      </mesh>
    )
    if (sb?.legal) cases.push(
      <mesh key={square + '-l'} position={[x, 0.02, z]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={sb.capture ? [0.34, 0.46, 28] : [0.12, 0.2, 28]} />
        <meshStandardMaterial color={sb.capture ? C3D.echec : C3D.legal} emissive={sb.capture ? C3D.echec : C3D.legal} emissiveIntensity={0.7} transparent opacity={0.9} />
      </mesh>
    )
  }
  return <group>{cases}</group>
}

function Scene({ partie, orientation, inter, pieceSur, controlsRef, reduit }) {
  const { nodes } = useGLTF(MODELE_3D_URL)
  const pieces = useMemo(() => piecesDepuisFen(partie.fen), [partie.fen])

  // ── Détection de capture par diff de FEN ──────────────────────────────────
  // dernierCoup.captured (chess.js) signale une prise ; la case de prise = `to`
  // (sauf en passant, où c'est derrière, mais l'éclat à `to` reste lisible).
  const [eclats, setEclats] = useState([])      // [{ id, position }]
  const lastMoveRef = useRef(null)
  useEffect(() => {
    const dc = partie.dernierCoup
    const sig = dc ? dc.from + dc.to + (dc.san || '') : null
    if (sig && sig !== lastMoveRef.current) {
      lastMoveRef.current = sig
      if (dc.captured) {
        // Son de capture déjà joué par chaque mode (onCoup local + onCoupRecu/IA adverse) :
        // on ne garde ici que l'éclat visuel pour éviter un double-son en 3D.
        const pos = squareVers3D(dc.to, orientation)
        const id = sig + ':' + Math.random()
        setEclats((e) => [...e, { id, position: pos }])
      }
    }
  }, [partie.dernierCoup, orientation])

  // ── Roi maté : quelle case + couleur perdante (FEN turn = camp maté) ───────
  const matInfo = useMemo(() => {
    if (partie.fin?.cause !== 'mat') return null
    const camp = String(partie.fen).split(' ')[1] === 'w' ? 'w' : 'b'
    const roi = pieces.find((p) => p.type === 'k' && p.couleur === camp)
    return roi ? { square: roi.square, camp } : null
  }, [partie.fin?.cause, partie.fen, pieces])

  const surbrillances = useMemo(() => {
    const s = {}
    if (partie.dernierCoup) { s[partie.dernierCoup.from] = { color: C3D.dernier }; s[partie.dernierCoup.to] = { color: C3D.dernier } }
    if (inter.selection) s[inter.selection] = { color: C3D.selection }
    for (const m of inter.coupsLegauxSel) s[m.to] = { ...(s[m.to] || {}), legal: true, capture: !!(m.captured || m.flags?.includes('e')) }
    return s
  }, [partie.dernierCoup, inter.selection, inter.coupsLegauxSel])

  const matVers = matInfo ? squareVers3D(matInfo.square, orientation) : null

  return (
    <>
      <CameraRig controlsRef={controlsRef} secousse={partie.caseRoiEnEchec} matVers={matVers} reduit={reduit} />
      <Echiquier orientation={orientation} surbrillances={surbrillances} onCaseClic={inter.onCaseClic}
        pieceSur={pieceSur} caseEchec={partie.caseRoiEnEchec} />
      {pieces.map((p) => (
        <Piece3D key={p.square} nodes={nodes} nodeName={NOEUDS_PIECES_3D?.[p.couleur]?.[p.type]}
          cible={squareVers3D(p.square, orientation)} type={p.type}
          selectionnee={inter.selection === p.square}
          roiTombe={!!matInfo && p.square === matInfo.square && p.couleur === matInfo.camp} />
      ))}
      {eclats.map((e) => (
        <EclatCapture key={e.id} position={e.position} reduit={reduit}
          onTermine={() => setEclats((cur) => cur.filter((x) => x.id !== e.id))} />
      ))}
      {matInfo && <PluieOr reduit={reduit} />}
      <TrajectoireCoup dernierCoup={partie.dernierCoup} orientation={orientation} />
    </>
  )
}

export default function Plateau3D({ partie, orientation = 'white', peutJouer, onCoup, interactif = true }) {
  const inter = useInteractionEchecs(partie, { peutJouer, onCoup, interactif })
  const controlsRef = useRef()
  const reduit = useMemo(() => prefersReducedMotion(), [])
  // Restaure le curseur si on démonte le plateau en plein survol (sinon curseur bloqué).
  useEffect(() => () => { document.body.style.cursor = 'auto' }, [])
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
    <div data-testid="plateau3d-wrap" style={{ position: 'relative', width: '100%', height: 'min(82vh, 820px)' }}>
      <Canvas shadows dpr={[1, 1.6]} camera={{ position: orientation === 'black' ? [0, 8, -8] : [0, 8, 8], fov: 42 }}>
        <color attach="background" args={['#0b0a0e']} />
        <ambientLight intensity={0.6} />
        <directionalLight position={[6, 12, 6]} intensity={1.4} castShadow shadow-mapSize={[1024, 1024]} />
        <directionalLight position={[-6, 8, -4]} intensity={0.4} />
        <Suspense fallback={<Html center style={{ color: '#cbb26b', font: '700 14px sans-serif', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6 }}>
          <style>{`@keyframes echecsBlink{0%,80%,100%{opacity:.25}40%{opacity:1}}`}</style>
          Chargement de l'échiquier 3D
          <span style={{ display: 'inline-flex', gap: 3 }}>
            <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#cbb26b', animation: 'echecsBlink 1s infinite 0s' }} />
            <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#cbb26b', animation: 'echecsBlink 1s infinite .2s' }} />
            <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#cbb26b', animation: 'echecsBlink 1s infinite .4s' }} />
          </span>
        </Html>}>
          <Scene partie={partie} orientation={orientation} inter={inter} pieceSur={pieceSur} controlsRef={controlsRef} reduit={reduit} />
        </Suspense>
        <ContactShadows position={[0, -0.12, 0]} opacity={0.5} scale={14} blur={2.4} far={5} />
        <OrbitControls ref={controlsRef} enableDamping dampingFactor={0.08} enablePan={false} minDistance={6} maxDistance={18} maxPolarAngle={Math.PI / 2.15} target={[0, 0, 0]} />
      </Canvas>
      <div style={{ position: 'absolute', bottom: 6, right: 10, fontSize: 9, color: 'rgba(255,255,255,0.32)', pointerEvents: 'none' }}>{CREDIT_3D}</div>
      {inter.promo && (
        <SelecteurPromotion couleur={partie.trait} onChoisir={inter.choisirPromotion} onAnnuler={inter.annulerPromo} />
      )}
    </div>
  )
}
