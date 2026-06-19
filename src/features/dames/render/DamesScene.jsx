// ─────────────────────────────────────────────────────────────────────────────
// DamesScene — rendu R3F (React Three Fiber + drei + postprocessing) du plateau
// Pirates vs Marine. Monté par la façade impérative DamesRenderer (racine React
// dédiée). La scène lit un store externe (board, marqueurs, sélection…) et expose
// playMove/resetView/fx via store.api pour la façade.
//   Pipeline : Environment sunset (IBL) + Sky · ombres PCFSoft + ContactShadows
//   EffectComposer : N8AO → SMAA → Bloom sélectif (émissif) → DoF → Vignette + CA
//   Matériaux PBR par faction · océan réfléchissant · particules d'ambiance.
// ─────────────────────────────────────────────────────────────────────────────
import { useRef, useMemo, useEffect, useSyncExternalStore } from 'react'
import { Canvas, useThree, useFrame } from '@react-three/fiber'
import { OrbitControls, Environment, Sky, MeshReflectorMaterial, ContactShadows, Line } from '@react-three/drei'
import { EffectComposer, N8AO, SMAA, Bloom, DepthOfField, Vignette, ChromaticAberration, ToneMapping } from '@react-three/postprocessing'
import { BlendFunction, ToneMappingMode } from 'postprocessing'
import { Leva, useControls } from 'leva'
import * as THREE from 'three'

const DEV = !!(import.meta.env && import.meta.env.DEV)
const SIZE = 10, P = 'P', M = 'M'
const PIECE_Y = 0.18, MARK_Y = 0.105
const isDark = (r, c) => (r + c) % 2 === 1
const worldPos = (r, c) => ({ x: c - 4.5, z: r - 4.5 })
const easeInOut = (p) => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2)
const SUN = [-26, 5, -40]   // soleil couchant bas (chaud) — derrière/à gauche du plateau

// ── ambiances (mood) : ciel/océan/lumières échangés à chaud via store.theme ─────
// Chaque preset reste cohérent avec le pipeline existant (IBL Environment + Sky +
// fog + 4 lampes). 'sunset' = défaut (rendu d'origine, valeurs inchangées).
const THEMES = {
  sunset: {
    env: 'sunset', envInt: 0.72, sun: SUN,
    sky: { turbidity: 10, rayleigh: 1.25, mie: 0.05, mieG: 0.97 },
    fog: 0xc77a44, fogDensity: 0.0072,
    hemi: [0xffdcae, 0x16202c, 0.5],
    key: { pos: [7, 16, 9], int: 1.0, col: 0xfff1da },
    rim: { pos: [-20, 3.5, -28], int: 1.15, col: 0xff9248 },
    point: { pos: [-7, 7, -5], int: 22, col: 0xffc070, dist: 45 },
    fill: { pos: [-6, 8, 6], int: 0.25, col: 0x9fb8e0 },
    ocean: { color: '#22455f', lowColor: 0x2a4258, metalness: 0.9, roughness: 0.16, mirror: 0.82 },
    spray: 0xffe7c4, exposure: 1.08,
  },
  storm: {                      // Tempête : ciel plombé, mer froide agitée, éclairs
    env: 'night', envInt: 0.42, sun: [-30, 2, -60],
    sky: { turbidity: 18, rayleigh: 0.5, mie: 0.03, mieG: 0.85 },
    fog: 0x33424f, fogDensity: 0.018,
    hemi: [0x9fb0bf, 0x0a1014, 0.4],
    key: { pos: [6, 15, 8], int: 0.5, col: 0xbcc9d6 },
    rim: { pos: [-18, 4, -26], int: 0.55, col: 0x6f8aa8 },
    point: { pos: [-7, 8, -5], int: 10, col: 0x8fb0d0, dist: 40 },
    fill: { pos: [-6, 8, 6], int: 0.3, col: 0x5d7390 },
    ocean: { color: '#1b2a35', lowColor: 0x1a2730, metalness: 0.85, roughness: 0.3, mirror: 0.6 },
    spray: 0xcfe0ef, exposure: 0.92, lightning: true,
  },
  night: {                      // Nuit étoilée : ciel sombre, lune froide, reflets argent
    env: 'night', envInt: 0.5, sun: [16, 8, 30],
    sky: { turbidity: 2.5, rayleigh: 0.18, mie: 0.005, mieG: 0.7 },
    fog: 0x0c1422, fogDensity: 0.009,
    hemi: [0x9fb4d8, 0x05080f, 0.45],
    key: { pos: [10, 16, 12], int: 0.7, col: 0xcfd8ff },
    rim: { pos: [18, 5, 28], int: 0.6, col: 0x88a0d8 },
    point: { pos: [-7, 7, -5], int: 9, col: 0x7fa0d8, dist: 42 },
    fill: { pos: [-6, 8, 6], int: 0.22, col: 0x4a5e88 },
    ocean: { color: '#10203a', lowColor: 0x101d33, metalness: 0.92, roughness: 0.12, mirror: 0.9 },
    spray: 0xdfe7ff, exposure: 1.0, stars: true,
  },
}
const getTheme = (k) => THEMES[k] || THEMES.sunset
const FACTION_COL = { [P]: { spark: [0xff7a3a, 0xff5024, 0xffb060], glow: 0xff5a2c }, [M]: { spark: [0x6fb4ff, 0x3a7cff, 0xa8d0ff], glow: 0x4a8cff } }

// ── textures procédurales (gravures crâne/ancre + grain de bois) ───────────────
function roundRect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath() }
function drawSkull(ctx, cx, cy, S, light, dark) {
  ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round'
  ctx.fillStyle = light; ctx.strokeStyle = light; ctx.lineWidth = S * 0.13
  for (const ang of [Math.PI / 4, -Math.PI / 4]) {
    ctx.save(); ctx.translate(cx, cy + S * 0.06); ctx.rotate(ang)
    ctx.beginPath(); ctx.moveTo(-S * 0.5, 0); ctx.lineTo(S * 0.5, 0); ctx.stroke()
    for (const ex of [-S * 0.5, S * 0.5]) { ctx.beginPath(); ctx.arc(ex, -S * 0.075, S * 0.08, 0, 7); ctx.fill(); ctx.beginPath(); ctx.arc(ex, S * 0.075, S * 0.08, 0, 7); ctx.fill() }
    ctx.restore()
  }
  ctx.fillStyle = light
  ctx.beginPath(); ctx.ellipse(cx, cy - S * 0.05, S * 0.27, S * 0.30, 0, 0, 7); ctx.fill()
  ctx.beginPath(); roundRect(ctx, cx - S * 0.135, cy + S * 0.15, S * 0.27, S * 0.17, S * 0.06); ctx.fill()
  ctx.fillStyle = dark
  ctx.beginPath(); ctx.ellipse(cx - S * 0.115, cy - S * 0.04, S * 0.078, S * 0.094, 0, 0, 7); ctx.fill()
  ctx.beginPath(); ctx.ellipse(cx + S * 0.115, cy - S * 0.04, S * 0.078, S * 0.094, 0, 0, 7); ctx.fill()
  ctx.beginPath(); ctx.moveTo(cx, cy + S * 0.02); ctx.lineTo(cx - S * 0.05, cy + S * 0.115); ctx.lineTo(cx + S * 0.05, cy + S * 0.115); ctx.closePath(); ctx.fill()
  ctx.strokeStyle = dark; ctx.lineWidth = S * 0.022
  for (const dx of [-S * 0.07, 0, S * 0.07]) { ctx.beginPath(); ctx.moveTo(cx + dx, cy + S * 0.16); ctx.lineTo(cx + dx, cy + S * 0.30); ctx.stroke() }
  ctx.restore()
}
function drawAnchor(ctx, cx, cy, S, light) {
  ctx.save(); ctx.strokeStyle = light; ctx.fillStyle = light; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = S * 0.075
  ctx.beginPath(); ctx.arc(cx, cy - S * 0.34, S * 0.085, 0, 7); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(cx, cy - S * 0.25); ctx.lineTo(cx, cy + S * 0.30); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(cx - S * 0.18, cy - S * 0.12); ctx.lineTo(cx + S * 0.18, cy - S * 0.12); ctx.stroke()
  ctx.beginPath(); ctx.arc(cx, cy + S * 0.04, S * 0.30, Math.PI * 0.16, Math.PI * 0.84); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(cx - S * 0.295, cy + S * 0.10); ctx.lineTo(cx - S * 0.37, cy + S * 0.02); ctx.lineTo(cx - S * 0.30, cy + S * 0.24); ctx.closePath(); ctx.fill()
  ctx.beginPath(); ctx.moveTo(cx + S * 0.295, cy + S * 0.10); ctx.lineTo(cx + S * 0.37, cy + S * 0.02); ctx.lineTo(cx + S * 0.30, cy + S * 0.24); ctx.closePath(); ctx.fill()
  ctx.restore()
}
function makeMedallion(side, king) {
  const S = 256, cv = document.createElement('canvas'); cv.width = cv.height = S
  const ctx = cv.getContext('2d'); const cx = S / 2, cy = S / 2, R = S * 0.46
  const g = ctx.createRadialGradient(cx - R * 0.3, cy - R * 0.35, R * 0.1, cx, cy, R * 1.08)
  if (side === P) { g.addColorStop(0, '#bf5a4e'); g.addColorStop(.55, '#7e2a22'); g.addColorStop(1, '#491310') }
  else { g.addColorStop(0, '#5b82a6'); g.addColorStop(.55, '#2e4f6e'); g.addColorStop(1, '#152f49') }
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.fill()
  ctx.lineWidth = S * 0.035; ctx.strokeStyle = king ? '#e7c878' : (side === P ? '#3c0c0b' : '#0a1c33')
  ctx.beginPath(); ctx.arc(cx, cy, R * 0.9, 0, 7); ctx.stroke()
  if (king) { ctx.lineWidth = S * 0.012; ctx.strokeStyle = '#f4e2a6'; ctx.beginPath(); ctx.arc(cx, cy, R * 0.82, 0, 7); ctx.stroke() }
  const light = king ? '#f6e7b0' : '#f3ead6', dark = side === P ? '#4a0f0d' : '#0c2038'
  if (side === P) drawSkull(ctx, cx, cy + S * 0.01, S * 0.42, light, dark); else drawAnchor(ctx, cx, cy, S * 0.46, light)
  const t = new THREE.CanvasTexture(cv); t.anisotropy = 8; t.colorSpace = THREE.SRGBColorSpace; t.needsUpdate = true
  return t
}
function makeWoodBump() {
  const S = 512, cv = document.createElement('canvas'); cv.width = cv.height = S
  const ctx = cv.getContext('2d'); ctx.fillStyle = '#808080'; ctx.fillRect(0, 0, S, S)
  // veines : sinusoïdes verticales bruitées → relief de planche
  for (let x = 0; x < S; x += 3) {
    const v = 128 + Math.sin(x * 0.06) * 26 + Math.sin(x * 0.17 + 1.3) * 14 + (Math.random() - 0.5) * 18
    ctx.strokeStyle = `rgb(${v | 0},${v | 0},${v | 0})`; ctx.lineWidth = 2
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + Math.sin(x) * 4, S); ctx.stroke()
  }
  for (let i = 0; i < 1600; i++) { const a = Math.random() * 40 - 20; ctx.fillStyle = `rgba(${128 + a | 0},${128 + a | 0},${128 + a | 0},.5)`; ctx.fillRect(Math.random() * S, Math.random() * S, 1, 1) }
  const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2, 2); t.needsUpdate = true
  return t
}
// normal map de vagues (somme de sinus) — anime l'océan via offset défilant
function makeWaveNormal() {
  const S = 256, cv = document.createElement('canvas'); cv.width = cv.height = S
  const ctx = cv.getContext('2d'); const img = ctx.createImageData(S, S), d = img.data
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const hx = Math.cos(x * 0.08) * 0.04 + Math.cos(x * 0.05 + y * 0.07) * 0.025
    const hy = Math.cos(y * 0.11) * 0.033 + Math.cos(x * 0.05 + y * 0.07) * 0.035
    const nx = -hx, ny = -hy, nz = 1, len = Math.hypot(nx, ny, nz), i = (y * S + x) * 4
    d[i] = (nx / len * 0.5 + 0.5) * 255; d[i + 1] = (ny / len * 0.5 + 0.5) * 255; d[i + 2] = (nz / len * 0.5 + 0.5) * 255; d[i + 3] = 255
  }
  ctx.putImageData(img, 0, 0)
  const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(10, 10); t.needsUpdate = true
  return t
}

// ── matériaux partagés par faction ────────────────────────────────────────────
function useMaterials() {
  return useMemo(() => {
    const med = { [P]: makeMedallion(P, false), [M]: makeMedallion(M, false), [P + 'K']: makeMedallion(P, true), [M + 'K']: makeMedallion(M, true) }
    const wood = makeWoodBump()
    // pièces sobres : peu d'émissif, peu d'iridescence, semi-mat (DA premium, pas "RGB")
    const pirateSide = new THREE.MeshPhysicalMaterial({ color: 0x8a352c, metalness: 0.2, roughness: 0.44, clearcoat: 0.5, clearcoatRoughness: 0.3, envMapIntensity: 0.85, emissive: 0x1c0805, emissiveIntensity: 0.05 })
    const marineSide = new THREE.MeshPhysicalMaterial({ color: 0x2c4d6c, metalness: 0.55, roughness: 0.42, clearcoat: 0.45, clearcoatRoughness: 0.3, iridescence: 0.12, iridescenceIOR: 1.3, envMapIntensity: 1.0 })
    const mk = (side, king) => new THREE.MeshStandardMaterial({ map: med[side + (king ? 'K' : '')], bumpMap: med[side + (king ? 'K' : '')], bumpScale: 0.3, metalness: 0.35, roughness: 0.42, envMapIntensity: 0.95 })
    const top = { [P]: mk(P, false), [M]: mk(M, false), [P + 'K']: mk(P, true), [M + 'K']: mk(M, true) }
    const bot = { [P]: new THREE.MeshStandardMaterial({ color: 0x4a0f0a, metalness: 0.3, roughness: 0.6 }), [M]: new THREE.MeshStandardMaterial({ color: 0x0c2038, metalness: 0.3, roughness: 0.6 }) }
    const rim = { [P]: new THREE.MeshStandardMaterial({ color: 0x3c0c08, metalness: 0.5, roughness: 0.45 }), [M]: new THREE.MeshStandardMaterial({ color: 0x0a1a30, metalness: 0.6, roughness: 0.4 }) }
    const gold = new THREE.MeshPhysicalMaterial({ color: 0xe7c46a, metalness: 1, roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.16, envMapIntensity: 1.3, emissive: 0x6a4a12, emissiveIntensity: 0.55, toneMapped: true })
    const gem = { [P]: new THREE.MeshStandardMaterial({ color: 0xb8564a, metalness: 0.6, roughness: 0.28, emissive: 0x3a0d05, emissiveIntensity: 0.3 }), [M]: new THREE.MeshStandardMaterial({ color: 0x5a83ad, metalness: 0.6, roughness: 0.28, emissive: 0x0a2240, emissiveIntensity: 0.3 }) }
    const tileDark = new THREE.MeshStandardMaterial({ color: 0x6b4427, roughness: 0.62, metalness: 0.08, bumpMap: wood, bumpScale: 0.04 })
    const tileLight = new THREE.MeshStandardMaterial({ color: 0xe9d7af, roughness: 0.5, metalness: 0.04, bumpMap: wood, bumpScale: 0.03 })
    const frame = new THREE.MeshStandardMaterial({ color: 0x241710, roughness: 0.55, metalness: 0.2, bumpMap: wood, bumpScale: 0.05 })
    const all = [...Object.values(med), wood, pirateSide, marineSide, ...Object.values(top), ...Object.values(bot), ...Object.values(rim), gold, ...Object.values(gem), tileDark, tileLight, frame]
    return { med, pirateSide, marineSide, top, bot, rim, gold, gem, tileDark, tileLight, frame, _all: all }
  }, [])
}

// ── une pièce (groupe) ─────────────────────────────────────────────────────────
function Piece({ side, king, mats }) {
  const sideMat = side === P ? mats.pirateSide : mats.marineSide
  return (
    <group>
      <mesh castShadow receiveShadow material={[sideMat, mats.top[side + (king ? 'K' : '')], mats.bot[side]]}>
        <cylinderGeometry args={[0.40, 0.43, 0.17, 56, 1]} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0.055, 0]} material={mats.rim[side]}>
        <torusGeometry args={[0.405, 0.022, 12, 56]} />
      </mesh>
      {king && (
        <group>
          <mesh position={[0, 0.135, 0]} castShadow material={sideMat}><cylinderGeometry args={[0.30, 0.34, 0.10, 48, 1]} /></mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0.205, 0]} material={mats.gold}><torusGeometry args={[0.235, 0.03, 14, 48]} /></mesh>
          {Array.from({ length: 6 }, (_, i) => { const a = (i / 6) * Math.PI * 2; return (
            <mesh key={i} position={[Math.cos(a) * 0.235, 0.265, Math.sin(a) * 0.235]} material={mats.gold}><coneGeometry args={[0.036, 0.10, 12]} /></mesh>) })}
          <mesh position={[0, 0.27, 0]} material={mats.gem[side]}><sphereGeometry args={[0.052, 16, 16]} /></mesh>
        </group>
      )}
    </group>
  )
}

// ── couche pièces + juice (hover, squash/stretch, capture FX, cérémonie) ───────
function Pieces({ store, audio, events }) {
  const state = useSyncExternalStore(store.subscribe, store.getState)
  const mats = useMaterials()
  const refs = useRef({})            // `${r}_${c}` -> THREE.Group
  const anim = useRef(null)          // animation de coup en cours
  const sparkRef = useRef(null)      // InstancedMesh des éclats
  const sparks = useRef([])          // état JS des éclats
  const hoverKey = useRef(null)      // case survolée (pièce jouable)
  const glowMesh = useRef(null)      // halo émissif sous la pièce sélectionnée
  const hoverMesh = useRef(null)     // ring de survol
  const beamRef = useRef(null)       // faisceau de lumière vertical (couronnement)
  const beamState = useRef(null)     // { t0, x, z }
  const sinkRef = useRef(null)       // InstancedMesh des pièces capturées qui sombrent
  const sinks = useRef([])           // état JS des pièces qui sombrent
  const splashRef = useRef(null)     // InstancedMesh des anneaux d'éclaboussure
  const splashes = useRef([])        // état JS des anneaux
  const reduced = state.reduced
  const quality = state.quality
  const SPARKS = 200
  const SINKS = 14                   // pièces capturées simultanément en vol (rafle longue)
  const SPLASH = 14
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const sinkGeo = useMemo(() => new THREE.CylinderGeometry(0.40, 0.43, 0.17, 24, 1), [])
  const splashGeo = useMemo(() => new THREE.TorusGeometry(0.5, 0.06, 8, 28), [])
  const sinkMatP = useMemo(() => new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.35, roughness: 0.48 }), [])

  // pièce capturée : éjectée du plateau, tournoie, plonge et SOMBRE dans l'océan
  // (geste sur 'high'/'medium' ; sur 'low' ou reduced → simple disparition d'origine)
  const fxSink = (r, c, side) => {
    if (reduced || quality === 'low') return false
    const slot = sinks.current.find(x => x.life <= 0); if (!slot) return false
    const w = worldPos(r, c)
    const dir = Math.atan2(w.z, w.x) + (Math.random() - 0.5) * 0.8   // éjectée vers le large
    const sp = 3.4 + Math.random() * 2.2
    slot.x = w.x; slot.y = PIECE_Y; slot.z = w.z
    slot.vx = Math.cos(dir) * sp; slot.vz = Math.sin(dir) * sp; slot.vy = 4.6 + Math.random() * 1.6
    slot.rx = (Math.random() - 0.5) * 9; slot.rz = (Math.random() - 0.5) * 9
    slot.ax = Math.random() * 7; slot.az = Math.random() * 7
    slot.life = slot.max = 2.6; slot.side = side; slot.splashed = false
    return true
  }
  const fxSplash = (x, z) => {
    const sl = splashes.current.find(s => s.life <= 0); if (!sl) return
    sl.x = x; sl.z = z; sl.life = sl.max = 0.7
  }

  // éclats : scale ↑ avec le combo (l'intensité monte à chaque prise d'une rafle)
  const fxBurst = (r, c, hue, scale = 1) => {
    if (reduced) return
    const w = worldPos(r, c); const n = Math.min(40, Math.round(18 * scale))
    for (let k = 0; k < n; k++) {
      const s = sparks.current.find(x => x.life <= 0); if (!s) break
      s.x = w.x; s.y = 0.22; s.z = w.z
      s.vx = (Math.random() - 0.5) * 2.0 * scale; s.vy = (0.9 + Math.random() * 1.3) * scale; s.vz = (Math.random() - 0.5) * 2.0 * scale
      s.life = s.max = 0.55 + Math.random() * 0.35; s.col = hue === 'gold' ? (Math.random() < 0.5 ? 0xf2d27a : 0xffae4d) : (Math.random() < 0.5 ? 0xe6c878 : 0xff6a2c)
    }
  }

  // expose l'API impérative à la façade
  useEffect(() => {
    store.api.playMove = (move, before, { promoted = false, ai = false } = {}) => new Promise((resolve) => {
      const fromKey = move.from[0] + '_' + move.from[1]
      const grp = refs.current[fromKey]
      const caps = move.caps || [], path = move.path || [move.to], isCap = caps.length > 0
      // côté du joueur qui joue ce coup (lu sur le plateau AVANT) → routage des HUD promotion.
      const moverSide = (before && before[move.from[0]] && before[move.from[0]][move.from[1]] && before[move.from[0]][move.from[1]].side) || grp?.userData?.side || P
      if (ai && store.api.focusMove) store.api.focusMove(move.from, move.to)  // caméra suit le coup IA/adverse
      if (!grp || reduced) {
        if (isCap) { caps.forEach(([r, c], idx) => { const m = refs.current[r + '_' + c]; const sd = m?.userData?.side; if (m) m.visible = false; if (sd) fxSink(r, c, sd); fxBurst(r, c, 'fire', 1 + idx * 0.3); if (idx >= 1) { store.api.combo?.(idx + 1); events?.combo?.(idx + 1) } }); audio.capture(); store.api.shake?.(0.12); store.api.flash?.(0.3) }
        if (promoted) { fxBurst(move.to[0], move.to[1], 'gold', 2); store.api.flash?.(0.4); audio.king(); events?.promote?.(moverSide) } else audio.move()
        resolve(); return
      }
      audio.move()
      anim.current = { grp, path, caps, isCap, i: 0, seg0: { ...worldPos(move.from[0], move.from[1]) }, t0: performance.now(), promoted, to: move.to, resolve, capDone: new Set(), combo: 0, phase: 'hop', moverSide }
    })
    return () => { store.api.playMove = null }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced])

  useFrame(() => {
    const now = performance.now()
    mats.pirateSide.emissiveIntensity = 0.05 + 0.025 * Math.sin(now * 0.0016)  // braise très subtile (Pirates)
    const sel = state.selected ? state.selected[0] + '_' + state.selected[1] : null
    const hk = hoverKey.current
    // repos / hover lift / bob de la sélection (le mover écrasera sa propre transform plus bas)
    for (const k in refs.current) {
      const m = refs.current[k]; if (!m) continue
      let y = PIECE_Y
      if (k === sel && state.interactive) y = PIECE_Y + 0.12 + Math.sin(now * 0.005) * 0.04
      else if (k === hk && state.movableKeys.has(k) && state.interactive) y = PIECE_Y + 0.07
      m.position.y = y; m.scale.set(1, 1, 1)
    }
    // halo émissif (outline qui passe dans le bloom) sous la pièce sélectionnée
    if (glowMesh.current) {
      if (sel && state.interactive && !anim.current) { const w = worldPos(state.selected[0], state.selected[1]); glowMesh.current.position.set(w.x, 0.12, w.z); glowMesh.current.visible = true; glowMesh.current.material.opacity = 0.6 + 0.35 * Math.sin(now * 0.006); const s = 1 + 0.05 * Math.sin(now * 0.006); glowMesh.current.scale.set(s, s, 1) }
      else glowMesh.current.visible = false
    }
    // ring de survol
    if (hoverMesh.current) {
      if (hk && state.movableKeys.has(hk) && hk !== sel && state.interactive && !anim.current) { const [r, c] = hk.split('_').map(Number); const w = worldPos(r, c); hoverMesh.current.position.set(w.x, MARK_Y, w.z); hoverMesh.current.visible = true; hoverMesh.current.material.opacity = 0.4 + 0.25 * Math.sin(now * 0.008) }
      else hoverMesh.current.visible = false
    }
    // animation d'un coup
    const a = anim.current
    if (a) {
      if (a.phase === 'hop') {
        const b = worldPos(a.path[a.i][0], a.path[a.i][1]), s0 = a.seg0
        const dist = Math.hypot(b.x - s0.x, b.z - s0.z)
        const dur = a.isCap ? 320 : Math.max(240, dist * 70), hopH = a.isCap ? 0.55 : 0.16
        let p = (now - a.t0) / dur; if (p > 1) p = 1
        const e = easeInOut(p)
        a.grp.position.set(s0.x + (b.x - s0.x) * e, PIECE_Y + Math.sin(p * Math.PI) * hopH, s0.z + (b.z - s0.z) * e)
        const stretch = 1 + 0.16 * Math.sin(p * Math.PI)             // stretch en vol (squash/stretch)
        a.grp.scale.set(1 / Math.sqrt(stretch), stretch, 1 / Math.sqrt(stretch))
        if (a.isCap && p > 0.5 && !a.capDone.has(a.i)) {
          a.capDone.add(a.i); const cap = a.caps[a.i]
          if (cap) { const cm = refs.current[cap[0] + '_' + cap[1]]; const sd = cm?.userData?.side; if (cm) cm.visible = false; if (sd) fxSink(cap[0], cap[1], sd); a.combo++; fxBurst(cap[0], cap[1], 'fire', 1 + a.combo * 0.28); audio.capture(); store.api.shake?.(0.13 + a.combo * 0.05); store.api.flash?.(0.28 + a.combo * 0.07); if (a.combo >= 2) { store.api.combo?.(a.combo); events?.combo?.(a.combo) } }
        }
        if (p >= 1) {
          a.seg0 = b; a.i++; a.t0 = now
          if (a.i >= a.path.length) { const wt = worldPos(a.to[0], a.to[1]); a.grp.position.set(wt.x, PIECE_Y, wt.z); a.phase = a.promoted ? 'ceremony' : 'settle'; a.t0 = now; if (a.promoted) { audio.king(); store.api.flash?.(0.5); fxBurst(a.to[0], a.to[1], 'gold', 2.4); if (!reduced && quality !== 'low') beamState.current = { t0: now, x: wt.x, z: wt.z }; store.api.shake?.(0.18); events?.promote?.(a.moverSide) } }
        }
      } else if (a.phase === 'settle') {                            // petit rebond d'atterrissage (overshoot)
        let p = (now - a.t0) / 150; if (p > 1) p = 1
        const sy = 1 - 0.16 * Math.sin(p * Math.PI); a.grp.scale.set(1 / Math.sqrt(sy), sy, 1 / Math.sqrt(sy))
        if (p >= 1) { a.grp.scale.set(1, 1, 1); const r = a.resolve; anim.current = null; r() }
      } else if (a.phase === 'ceremony') {                          // cérémonie de promotion (~900ms) : s'élève + tourne
        let p = (now - a.t0) / 900; if (p > 1) p = 1
        const wt = worldPos(a.to[0], a.to[1])
        a.grp.position.set(wt.x, PIECE_Y + Math.sin(p * Math.PI) * 0.55, wt.z)
        a.grp.rotation.y = p * Math.PI * 3
        const s = 1 + 0.12 * Math.sin(p * Math.PI); a.grp.scale.set(s, s, s)
        if (!a.cerBurst && p > 0.45) { a.cerBurst = true; fxBurst(a.to[0], a.to[1], 'gold', 3); store.api.flash?.(0.55) }
        if (!a.cerBurst2 && p > 0.72) { a.cerBurst2 = true; fxBurst(a.to[0], a.to[1], 'gold', 2.2) }   // 2e gerbe de paillettes
        if (p >= 1) { a.grp.rotation.y = 0; a.grp.position.set(wt.x, PIECE_Y, wt.z); a.grp.scale.set(1, 1, 1); const r = a.resolve; anim.current = null; r() }
      }
    }
    // faisceau de couronnement : colonne de lumière qui jaillit puis s'estompe
    if (beamRef.current) {
      const bs = beamState.current
      if (bs) {
        const p = (now - bs.t0) / 1400
        if (p >= 1) { beamState.current = null; beamRef.current.visible = false }
        else {
          beamRef.current.visible = true
          beamRef.current.position.set(bs.x, 4.0, bs.z)
          beamRef.current.rotation.y = now * 0.002
          const rise = Math.min(1, p * 3), fade = 1 - Math.max(0, (p - 0.45) / 0.55)
          beamRef.current.scale.set(0.6 + rise * 0.4, rise, 0.6 + rise * 0.4)
          beamRef.current.material.opacity = 0.55 * fade
        }
      } else beamRef.current.visible = false
    }
    // éclats
    const im = sparkRef.current
    if (im && sparks.current.length) {
      let any = false
      for (let k = 0; k < SPARKS; k++) {
        const s = sparks.current[k]
        if (!s) continue
        if (s.life > 0) { any = true; s.life -= 0.016; const t = 1 - s.life / s.max; s.x += s.vx * 0.016; s.z += s.vz * 0.016; s.y += (s.vy - 3.1 * t) * 0.016; const sc = Math.max(0.001, (1 - t) * 0.09); dummy.position.set(s.x, Math.max(0, s.y), s.z); dummy.scale.setScalar(sc); dummy.updateMatrix(); im.setMatrixAt(k, dummy.matrix); im.setColorAt(k, new THREE.Color(s.col)) }
        else { dummy.scale.setScalar(0); dummy.position.set(0, -50, 0); dummy.updateMatrix(); im.setMatrixAt(k, dummy.matrix) }
      }
      im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true; if (any) im.visible = true
    }
    // pièces capturées qui sombrent dans l'océan
    const sm = sinkRef.current
    if (sm && sinks.current.length) {
      let any = false
      for (let k = 0; k < SINKS; k++) {
        const s = sinks.current[k]; if (!s) continue
        if (s.life > 0) {
          any = true; s.life -= 0.016; const t = 1 - s.life / s.max
          s.x += s.vx * 0.016; s.z += s.vz * 0.016; s.vy -= 9.0 * 0.016; s.y += s.vy * 0.016
          s.ax += s.rx * 0.016; s.az += s.rz * 0.016
          if (!s.splashed && s.y <= -0.45 && s.vy < 0) { s.splashed = true; fxSplash(s.x, s.z); store.api.plonk?.() }  // impact eau
          if (s.y < -0.5) { s.vy *= 0.4; s.vx *= 0.86; s.vz *= 0.86 }   // traînée sous l'eau (descente molle)
          const sc = s.y < -0.5 ? Math.max(0.001, 1 - (-0.5 - s.y) * 0.55) : 1   // se dissout en profondeur
          dummy.position.set(s.x, Math.min(s.y, 1.6), s.z); dummy.rotation.set(s.ax, 0, s.az); dummy.scale.setScalar(sc); dummy.updateMatrix(); sm.setMatrixAt(k, dummy.matrix)
          if (sm.instanceColor) sm.setColorAt(k, s.side === P ? new THREE.Color(0x8a352c) : new THREE.Color(0x2c4d6c))
        } else { dummy.scale.setScalar(0); dummy.position.set(0, -60, 0); dummy.updateMatrix(); sm.setMatrixAt(k, dummy.matrix) }
      }
      sm.instanceMatrix.needsUpdate = true; if (sm.instanceColor) sm.instanceColor.needsUpdate = true; sm.visible = any
    }
    // anneaux d'éclaboussure à l'impact
    const pm = splashRef.current
    if (pm && splashes.current.length) {
      let any = false
      for (let k = 0; k < SPLASH; k++) {
        const s = splashes.current[k]; if (!s) continue
        if (s.life > 0) { any = true; s.life -= 0.016; const t = 1 - s.life / s.max; const sc = 0.5 + t * 2.6; dummy.position.set(s.x, -0.46, s.z); dummy.rotation.set(Math.PI / 2, 0, 0); dummy.scale.set(sc, sc, Math.max(0.05, 1 - t)); dummy.updateMatrix(); pm.setMatrixAt(k, dummy.matrix) }
        else { dummy.scale.setScalar(0); dummy.position.set(0, -60, 0); dummy.updateMatrix(); pm.setMatrixAt(k, dummy.matrix) }
      }
      pm.instanceMatrix.needsUpdate = true; pm.visible = any
      const mat = pm.material; if (mat) mat.opacity = 0.7
    }
  })

  // init du pool d'éclats + pièces qui sombrent + éclaboussures
  useEffect(() => { sparks.current = Array.from({ length: SPARKS }, () => ({ life: 0, max: 1, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, col: 0xffffff })) }, [])
  useEffect(() => {
    sinks.current = Array.from({ length: SINKS }, () => ({ life: 0, max: 1, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, ax: 0, az: 0, rx: 0, rz: 0, side: P, splashed: false }))
    splashes.current = Array.from({ length: SPLASH }, () => ({ life: 0, max: 1, x: 0, z: 0 }))
  }, [])

  const board = state.board
  const click = store._click
  return (
    <group>
      {board && board.flatMap((row, r) => row.map((cell, c) => {
        if (!cell) return null
        const key = r + '_' + c, w = worldPos(r, c)
        const movable = state.interactive && state.movableKeys.has(key)
        return (
          <group key={key} position={[w.x, PIECE_Y, w.z]}
            ref={(el) => { if (el) { el.userData.side = cell.side; refs.current[key] = el } else delete refs.current[key] }}
            onClick={(e) => click(e, r, c)}
            onPointerOver={(e) => { if (movable) { e.stopPropagation(); hoverKey.current = key; document.body.style.cursor = 'pointer' } }}
            onPointerOut={() => { if (hoverKey.current === key) { hoverKey.current = null; document.body.style.cursor = '' } }}>
            <Piece side={cell.side} king={cell.king} mats={mats} />
          </group>
        )
      }))}
      <mesh ref={glowMesh} visible={false} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.47, 0.05, 14, 48]} />
        <meshBasicMaterial color={0xffe6a0} transparent opacity={0.9} toneMapped={false} />
      </mesh>
      <mesh ref={hoverMesh} visible={false} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.44, 0.022, 10, 40]} />
        <meshBasicMaterial color={0xd9b870} transparent opacity={0.5} toneMapped={false} />
      </mesh>
      <instancedMesh ref={sparkRef} args={[null, null, SPARKS]} frustumCulled={false}>
        <icosahedronGeometry args={[1, 0]} />
        <meshBasicMaterial toneMapped={false} vertexColors={false} />
      </instancedMesh>
      <mesh ref={beamRef} visible={false}>
        <cylinderGeometry args={[0.18, 0.62, 8, 24, 1, true]} />
        <meshBasicMaterial color={0xfff0b8} transparent opacity={0.5} side={THREE.DoubleSide} depthWrite={false} toneMapped={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <instancedMesh ref={sinkRef} args={[sinkGeo, sinkMatP, SINKS]} frustumCulled={false} castShadow visible={false} />
      <instancedMesh ref={splashRef} args={[splashGeo, undefined, SPLASH]} frustumCulled={false} visible={false}>
        <meshBasicMaterial color={0xdff0ff} transparent opacity={0.7} depthWrite={false} toneMapped={false} />
      </instancedMesh>
    </group>
  )
}

// ── cinématique de victoire : orbite + feux d'artifice + halo doré ─────────────
// Détecte la transition winner=null→'P'/'M', lance l'orbite caméra (store.api.orbit)
// puis tire des salves de feux d'artifice colorés faction au-dessus du couchant.
function Celebration({ store, quality }) {
  const s = useSyncExternalStore(store.subscribe, store.getState)
  const fwRef = useRef(null)          // InstancedMesh des étincelles de feux d'artifice
  const fw = useRef([])               // état JS
  const glowRef = useRef(null)        // halo doré au sol
  const active = useRef(null)         // { side, t0, nextBurst }
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const N = quality === 'high' ? 360 : quality === 'medium' ? 200 : 0
  const prevWinner = useRef(null)

  useEffect(() => { fw.current = Array.from({ length: N }, () => ({ life: 0, max: 1, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, col: 0xffffff })) }, [N])

  // salve : N étincelles en sphère depuis un point haut au-dessus de l'horizon
  const burst = (cx, cy, cz, palette, power = 1) => {
    let spawned = 0
    for (let k = 0; k < N && spawned < 70 * power; k++) {
      const p = fw.current[k]; if (!p || p.life > 0) continue
      const th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1), sp = (2.6 + Math.random() * 2.2) * power
      p.x = cx; p.y = cy; p.z = cz
      p.vx = Math.sin(ph) * Math.cos(th) * sp; p.vy = Math.sin(ph) * Math.sin(th) * sp * 0.7 + 1; p.vz = Math.cos(ph) * sp
      p.life = p.max = 1.1 + Math.random() * 0.7; p.col = palette[(Math.random() * palette.length) | 0]
      spawned++
    }
  }

  useEffect(() => {
    const w = s.winner
    if (w && prevWinner.current !== w && s.gameOver) {
      active.current = { side: w, t0: performance.now(), nextBurst: 0 }
      store.api.orbit?.(w)
    }
    if (!w) active.current = null
    prevWinner.current = w
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.winner, s.gameOver])

  useFrame(() => {
    const now = performance.now()
    const a = active.current
    const goldPal = [0xffd56a, 0xffe9a8, 0xffb24d, 0xfff3c8]
    const facPal = a ? (a.side === P ? [0xff7a3a, 0xffb060, 0xffd56a, 0xff5024] : [0x6fb4ff, 0xa8d0ff, 0xffd56a, 0x3a7cff]) : goldPal
    // tirs périodiques pendant ~7s
    if (a && N > 0) {
      const el = now - a.t0
      if (el < 7400 && el >= a.nextBurst) {
        a.nextBurst = el + 520 + Math.random() * 380
        const cx = (Math.random() - 0.5) * 26, cy = 7 + Math.random() * 6, cz = -8 - Math.random() * 16
        burst(cx, cy, cz, Math.random() < 0.6 ? facPal : goldPal, 1)
        if (Math.random() < 0.4) burst((Math.random() - 0.5) * 18, 6 + Math.random() * 5, -4 - Math.random() * 10, facPal, 0.7)
      }
      if (el >= 9000) active.current = null
    }
    // halo doré pulsé au sol sous le plateau pendant la célébration
    if (glowRef.current) {
      if (a) { const k = 0.5 + 0.5 * Math.sin(now * 0.004); glowRef.current.visible = true; glowRef.current.material.opacity = 0.12 + 0.16 * k; const sc = 6.5 + 0.6 * k; glowRef.current.scale.set(sc, sc, 1) }
      else glowRef.current.visible = false
    }
    const im = fwRef.current
    if (im && fw.current.length) {
      let any = false
      for (let k = 0; k < N; k++) {
        const p = fw.current[k]; if (!p) continue
        if (p.life > 0) { any = true; p.life -= 0.016; const t = 1 - p.life / p.max; p.x += p.vx * 0.016; p.y += (p.vy - 2.4 * t) * 0.016; p.z += p.vz * 0.016; const sc = Math.max(0.001, (1 - t * t) * 0.12); dummy.position.set(p.x, p.y, p.z); dummy.scale.setScalar(sc); dummy.updateMatrix(); im.setMatrixAt(k, dummy.matrix); im.setColorAt(k, new THREE.Color(p.col)) }
        else { dummy.scale.setScalar(0); dummy.position.set(0, -80, 0); dummy.updateMatrix(); im.setMatrixAt(k, dummy.matrix) }
      }
      im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true; im.visible = any
    }
  })

  if (N === 0) return null
  return (
    <group>
      <mesh ref={glowRef} visible={false} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.12, 0]}>
        <circleGeometry args={[1, 48]} />
        <meshBasicMaterial color={0xffd56a} transparent opacity={0.2} depthWrite={false} toneMapped={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <instancedMesh ref={fwRef} args={[null, null, N]} frustumCulled={false} visible={false}>
        <icosahedronGeometry args={[1, 0]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
    </group>
  )
}

// ── plateau (cases + cadre + liseré or) ────────────────────────────────────────
function Board({ store }) {
  const mats = useMaterials()
  const click = store._click
  const tiles = []
  for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) {
    const w = worldPos(r, c)
    tiles.push(<mesh key={r + '_' + c} position={[w.x, 0, w.z]} receiveShadow material={isDark(r, c) ? mats.tileDark : mats.tileLight} onClick={(e) => click(e, r, c)}><boxGeometry args={[0.96, 0.18, 0.96]} /></mesh>)
  }
  return (
    <group>
      {tiles}
      <mesh position={[0, -0.20, 0]} receiveShadow material={mats.frame}><boxGeometry args={[11.4, 0.55, 11.4]} /></mesh>
      {[[0, 5.43, 11.0, 0.14], [0, -5.43, 11.0, 0.14]].map(([x, z, lw, ld], i) => (
        <mesh key={'h' + i} position={[x, 0.08, z]} material={mats.gold}><boxGeometry args={[lw, 0.06, ld]} /></mesh>))}
      {[[5.43, 0, 0.14, 11.0], [-5.43, 0, 0.14, 11.0]].map(([x, z, lw, ld], i) => (
        <mesh key={'v' + i} position={[x, 0.08, z]} material={mats.gold}><boxGeometry args={[lw, 0.06, ld]} /></mesh>))}
    </group>
  )
}

// ── marqueurs (sélection, coups, captures, indice, dernier coup, curseur) ──────
const RING = {
  sel: { col: 0xf6e6b0, inner: 0.36, tube: 0.045, op: 0.95, pulse: true },
  move: { col: 0xd9b870, inner: 0.30, tube: 0.04, op: 0.9, pulse: true },
  cap: { col: 0xff7a52, inner: 0.30, tube: 0.045, op: 0.95, pulse: true },
  hint: { col: 0x6fe0ff, inner: 0.36, tube: 0.045, op: 0.95, pulse: true },
  last: { col: 0xd9b870, inner: 0.40, tube: 0.03, op: 0.4, pulse: false },
  dot: { col: 0xd9b870, inner: 0.17, tube: 0.028, op: 0.5, pulse: false },
  cursor: { col: 0xffffff, inner: 0.40, tube: 0.05, op: 0.95, pulse: true },
}
function Ring({ r, c, kind, blink }) {
  const ref = useRef()
  const cfg = RING[kind]
  const w = worldPos(r, c)
  useFrame(() => { if (cfg.pulse && ref.current) ref.current.material.opacity = 0.55 + 0.4 * Math.sin(performance.now() * 0.0064 + (blink || 0)) })
  return (
    <mesh ref={ref} rotation={[Math.PI / 2, 0, 0]} position={[w.x, MARK_Y, w.z]}>
      <torusGeometry args={[cfg.inner, cfg.tube, 12, 40]} />
      <meshBasicMaterial color={cfg.col} transparent opacity={cfg.op} toneMapped={false} />
    </mesh>
  )
}
function Markers({ store }) {
  const s = useSyncExternalStore(store.subscribe, store.getState)
  const rings = []
  if (s.last) { rings.push(<Ring key="lf" r={s.last.from[0]} c={s.last.from[1]} kind="last" />); (s.last.path || []).forEach(([r, c], i) => rings.push(<Ring key={'lp' + i} r={r} c={c} kind="last" />)) }
  if (s.selected) {
    rings.push(<Ring key="sel" r={s.selected[0]} c={s.selected[1]} kind="sel" />)
    for (const mv of s.legalMoves) if (mv.from[0] === s.selected[0] && mv.from[1] === s.selected[1]) rings.push(<Ring key={'m' + mv.to[0] + '_' + mv.to[1]} r={mv.to[0]} c={mv.to[1]} kind={mv.isCapture ? 'cap' : 'move'} blink={mv.to[0]} />)
  } else if (s.interactive && !s.gameOver) {
    s.movableKeys.forEach(k => { const [r, c] = k.split('_').map(Number); rings.push(<Ring key={'d' + k} r={r} c={c} kind="dot" />) })
  }
  if (s.hint) {
    rings.push(<Ring key="hf" r={s.hint.from[0]} c={s.hint.from[1]} kind="hint" />); rings.push(<Ring key="ht" r={s.hint.to[0]} c={s.hint.to[1]} kind="hint" blink={2} />)
    const pts = [s.hint.from, ...(s.hint.path || [s.hint.to])].map(([r, c]) => { const w = worldPos(r, c); return [w.x, MARK_Y + 0.06, w.z] })
    if (pts.length >= 2) rings.push(<HintPath key="hpath" points={pts} />)
  }
  if (s.cursor) rings.push(<Ring key="cur" r={s.cursor[0]} c={s.cursor[1]} kind="cursor" />)
  return <group>{rings}</group>
}
// chemin d'indice : ligne cyan lumineuse pulsée du coup suggéré
function HintPath({ points }) {
  const ref = useRef()
  useFrame(() => { if (ref.current && ref.current.material) ref.current.material.opacity = 0.5 + 0.4 * Math.sin(performance.now() * 0.006) })
  return <Line ref={ref} points={points} color="#6fe0ff" lineWidth={3} transparent opacity={0.9} toneMapped={false} dashed dashSize={0.22} gapSize={0.12} />
}

// ── océan + ciel + particules d'ambiance ───────────────────────────────────────
function Ocean({ quality, theme }) {
  const t = getTheme(theme)
  const normal = useMemo(() => makeWaveNormal(), [])
  // tempête : vagues plus rapides/marquées · nuit : eau plus calme
  const speed = theme === 'storm' ? 1.9 : theme === 'night' ? 0.7 : 1
  useFrame((st) => { const e = st.clock.elapsedTime; normal.offset.set(e * 0.03 * speed, e * 0.017 * speed) })
  if (quality === 'low') {
    return <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}><planeGeometry args={[400, 400]} /><meshStandardMaterial color={t.ocean.lowColor} roughness={0.25} metalness={0.7} normalMap={normal} /></mesh>
  }
  // miroir net + faible roughness → reflète le ciel (glint sur l'eau)
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
      <planeGeometry args={[400, 400]} />
      <MeshReflectorMaterial key={theme} resolution={quality === 'high' ? 1024 : 512} mixBlur={1.4} mixStrength={3.2} blur={[140, 50]} minDepthThreshold={0.2} maxDepthThreshold={1.4} depthScale={0.9} depthToBlurRatioBias={0.2} mirror={t.ocean.mirror} color={t.ocean.color} metalness={t.ocean.metalness} roughness={t.ocean.roughness} normalMap={normal} normalScale={theme === 'storm' ? [0.4, 0.4] : [0.22, 0.22]} />
    </mesh>
  )
}
function Spray({ quality, theme }) {
  const ref = useRef()
  const t = getTheme(theme)
  const N = quality === 'high' ? 220 : 110
  const geo = useMemo(() => { const g = new THREE.BufferGeometry(); const pos = new Float32Array(N * 3); for (let i = 0; i < N; i++) { pos[i * 3] = (Math.random() - 0.5) * 60; pos[i * 3 + 1] = Math.random() * 16 + 0.5; pos[i * 3 + 2] = (Math.random() - 0.5) * 60 } g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); return g }, [N])
  useFrame((st) => { if (ref.current) ref.current.rotation.y = st.clock.elapsedTime * (theme === 'storm' ? 0.03 : 0.012) })
  return <points ref={ref} geometry={geo}><pointsMaterial size={theme === 'night' ? 0.1 : 0.08} color={t.spray} transparent opacity={theme === 'night' ? 0.7 : 0.5} depthWrite={false} toneMapped={false} /></points>
}

// ── champ d'étoiles (ambiance Nuit) : points scintillants haut dans le ciel ─────
function Stars({ quality }) {
  const ref = useRef()
  const N = quality === 'high' ? 900 : 500
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry(); const pos = new Float32Array(N * 3)
    for (let i = 0; i < N; i++) { const r = 120 + Math.random() * 80, th = Math.random() * Math.PI * 2, ph = Math.random() * Math.PI * 0.45; pos[i * 3] = Math.cos(th) * Math.sin(ph + 0.15) * r; pos[i * 3 + 1] = Math.cos(ph) * r * 0.9 + 20; pos[i * 3 + 2] = Math.sin(th) * Math.sin(ph + 0.15) * r }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); return g
  }, [N])
  useFrame((st) => { if (ref.current) ref.current.material.opacity = 0.75 + 0.2 * Math.sin(st.clock.elapsedTime * 0.7) })
  return <points ref={ref} geometry={geo}><pointsMaterial size={0.55} color={0xeaf0ff} transparent opacity={0.85} sizeAttenuation depthWrite={false} toneMapped={false} /></points>
}

// ── lumières + ciel + IBL pilotés par l'ambiance (theme) ───────────────────────
function WorldEnvironment({ theme }) {
  const t = getTheme(theme)
  const flashLight = useRef()    // éclair (tempête) : flash directionnel sporadique
  const next = useRef(1500)
  useFrame((st, dt) => {
    if (!t.lightning || !flashLight.current) { if (flashLight.current) flashLight.current.intensity = 0; return }
    next.current -= dt * 1000
    if (next.current <= 0) { next.current = 2600 + Math.random() * 5000; flashLight.current.userData.f = 1 }
    const f = flashLight.current.userData.f || 0
    if (f > 0) { flashLight.current.userData.f = Math.max(0, f - dt * 6); flashLight.current.intensity = (Math.random() < 0.6 ? f : f * 0.3) * 5 }
    else flashLight.current.intensity = 0
  })
  return (
    <group>
      <fogExp2 attach="fog" args={[t.fog, t.fogDensity]} />
      <Sky distance={3000} sunPosition={t.sun} turbidity={t.sky.turbidity} rayleigh={t.sky.rayleigh} mieCoefficient={t.sky.mie} mieDirectionalG={t.sky.mieG} />
      <Environment preset={t.env} environmentIntensity={t.envInt} />
      <hemisphereLight args={[t.hemi[0], t.hemi[1], t.hemi[2]]} />
      <directionalLight position={t.key.pos} intensity={t.key.int} color={t.key.col} castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-0.0004} shadow-camera-left={-9} shadow-camera-right={9} shadow-camera-top={9} shadow-camera-bottom={-9} shadow-camera-near={1} shadow-camera-far={50} />
      <directionalLight position={t.rim.pos} intensity={t.rim.int} color={t.rim.col} />
      <pointLight position={t.point.pos} intensity={t.point.int} color={t.point.col} distance={t.point.dist} decay={1.4} />
      <directionalLight position={t.fill.pos} intensity={t.fill.int} color={t.fill.col} />
      {t.lightning && <directionalLight ref={flashLight} position={[-12, 22, -30]} intensity={0} color={0xdfeaff} />}
    </group>
  )
}

// ── caméra + contrôles + intro ────────────────────────────────────────────────
function CameraRig({ store }) {
  const { camera } = useThree()
  const ctrl = useRef()
  const intro = useRef({ t: 0, on: !store.getState().reduced })
  const shakeMag = useRef(0)
  const focus = useRef(null)   // { mid:{x,y,z}, t0, dur }
  const orbit = useRef(null)   // cinématique de victoire : { t0, dur, side }
  useEffect(() => {
    store.api.resetView = () => { orbit.current = null; camera.position.set(0, 11.5, 13.5); if (ctrl.current) { ctrl.current.target.set(0, 0, 0); ctrl.current.update() } }
    store.api.shake = (amt = 0.15) => { shakeMag.current = Math.min(0.55, Math.max(shakeMag.current, amt)) }   // micro-shake (capture)
    store.api.focusMove = (from, to) => { const a = worldPos(from[0], from[1]), b = worldPos(to[0], to[1]); focus.current = { mid: { x: (a.x + b.x) / 2, y: 0.3, z: (a.z + b.z) / 2 }, t0: performance.now(), dur: 1100 } }
    // orbite de victoire : ~8s autour du plateau (désactivée en reduced-motion)
    store.api.orbit = (side) => { if (store.getState().reduced) return; orbit.current = { t0: performance.now(), dur: 8200, side: side || P, a0: Math.atan2(camera.position.z, camera.position.x) } }
    store.api.stopOrbit = () => { orbit.current = null }
    if (intro.current.on) camera.position.set(-9.5, 18.5, 16.5)
    else store.api.resetView()
    return () => { store.api.resetView = null; store.api.shake = null; store.api.focusMove = null; store.api.orbit = null; store.api.stopOrbit = null }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useFrame((st, dt) => {
    if (intro.current.on) {
      intro.current.t = Math.min(1, intro.current.t + dt / 1.4)
      const e = 1 - Math.pow(1 - intro.current.t, 3)
      camera.position.set(-9.5 + 9.5 * e, 18.5 + (11.5 - 18.5) * e, 16.5 + (13.5 - 16.5) * e)
      camera.lookAt(0, 0, 0)
      if (intro.current.t >= 1) { intro.current.on = false; if (ctrl.current) { ctrl.current.target.set(0, 0, 0); ctrl.current.enabled = true; ctrl.current.update() } }
      return
    }
    if (!ctrl.current) return
    const now = performance.now()
    // cinématique de victoire : orbite lente montante autour du plateau
    const ob = orbit.current
    if (ob) {
      ctrl.current.enabled = false
      const p = Math.min(1, (now - ob.t0) / ob.dur)
      const ang = ob.a0 + p * Math.PI * 1.6
      const rad = 15.5 - 3.0 * Math.sin(p * Math.PI)            // plonge un peu au milieu puis ressort
      const ht = 9.5 + 5.5 * Math.sin(p * Math.PI)               // s'élève au sommet de l'orbite
      camera.position.set(Math.cos(ang) * rad, ht, Math.sin(ang) * rad)
      ctrl.current.target.set(0, 0.4, 0)
      camera.lookAt(0, 0.4, 0)
      if (p >= 1) { orbit.current = null; ctrl.current.enabled = true; ctrl.current.update() }
      return
    } else if (!ctrl.current.enabled && !intro.current.on) ctrl.current.enabled = true
    // suivi du coup : la cible glisse vers le milieu du coup puis revient au centre
    let bx = 0, by = 0, bz = 0; const f = focus.current
    if (f) { const p = (now - f.t0) / f.dur; if (p >= 1) focus.current = null; else { const k = p < 0.4 ? p / 0.4 : 1 - (p - 0.4) / 0.6; const e = k * k * (3 - 2 * k); bx = f.mid.x * e; by = f.mid.y * e; bz = f.mid.z * e } }
    // micro-shake : jitter décroissant appliqué sur la cible (indépendant de l'ordre des contrôles)
    let jx = 0, jy = 0, jz = 0
    if (shakeMag.current > 0.002) { shakeMag.current *= 0.85; const m = shakeMag.current; jx = (Math.random() - 0.5) * m; jy = (Math.random() - 0.5) * m * 0.6; jz = (Math.random() - 0.5) * m } else shakeMag.current = 0
    ctrl.current.target.set(bx + jx, by + jy, bz + jz)
  })
  return <OrbitControls ref={ctrl} makeDefault enabled={!intro.current.on} enableDamping dampingFactor={0.08} enablePan={false} minDistance={9} maxDistance={28} minPolarAngle={0.2} maxPolarAngle={1.45} rotateSpeed={0.8} zoomSpeed={0.9} />
}

// ── stack post-processing (gated par quality + tunable en dev via leva) ─────────
function Effects({ quality, theme }) {
  const { gl } = useThree()
  const baseExp = getTheme(theme).exposure
  const tune = useControls('Dames · rendu', {
    exposure: { value: 1.08, min: 0.6, max: 1.6, step: 0.01 },
    bloom: { value: 0.7, min: 0, max: 2, step: 0.05 },
    bloomThreshold: { value: 0.72, min: 0, max: 1, step: 0.01 },
    ao: { value: 1.0, min: 0, max: 3, step: 0.1 },
    dof: { value: 1, min: 0, max: 4, step: 0.1 },
  }, { collapsed: true })
  // l'ambiance fixe l'exposition de base ; en DEV le leva (≠ défaut) reprend la main
  useEffect(() => { gl.toneMappingExposure = (DEV && tune.exposure !== 1.08) ? tune.exposure : baseExp }, [gl, tune.exposure, baseExp])
  useEffect(() => {
    if (quality === 'low') return
    const prev = gl.toneMapping; gl.toneMapping = THREE.NoToneMapping  // le composer fait le tonemap
    return () => { gl.toneMapping = prev }
  }, [gl, quality])
  if (quality === 'low') return null
  const high = quality === 'high'
  return (
    <EffectComposer multisampling={0} enableNormalPass>
      <N8AO halfRes aoRadius={1.4} intensity={tune.ao} distanceFalloff={1} />
      <SMAA />
      <Bloom intensity={high ? tune.bloom : tune.bloom * 0.6} luminanceThreshold={tune.bloomThreshold} luminanceSmoothing={0.2} mipmapBlur />
      {high && <DepthOfField focusDistance={0.012} focalLength={0.05} bokehScale={2.2 * tune.dof} />}
      <Vignette eskil={false} offset={0.25} darkness={0.72} />
      {high && <ChromaticAberration blendFunction={BlendFunction.NORMAL} offset={[0.0006, 0.0009]} radialModulation modulationOffset={0.4} />}
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
    </EffectComposer>
  )
}

// ── scène complète ──────────────────────────────────────────────────────────────
export default function DamesScene({ store, onSquareClick, audio, events }) {
  const down = useRef({ x: 0, y: 0 })
  const flashRef = useRef(null)
  const comboRef = useRef(null)
  // garde clic-vs-drag : on n'émet le clic que si le pointeur n'a quasi pas bougé
  store._click = (e, r, c) => { const d = Math.abs(e.clientX - down.current.x) + Math.abs(e.clientY - down.current.y); if (d < 7) { e.stopPropagation(); onSquareClick(r, c) } }
  const s = useSyncExternalStore(store.subscribe, store.getState)
  const quality = s.quality
  const theme = s.theme || 'sunset'
  // overlays 2D : flash écran (capture) + compteur de combo (rafle)
  useEffect(() => {
    store.api.flash = (intensity = 0.35) => { const el = flashRef.current; if (el && el.animate) el.animate([{ opacity: Math.min(0.7, intensity) }, { opacity: 0 }], { duration: 230, easing: 'ease-out' }) }
    store.api.combo = (n) => { const el = comboRef.current; if (!el) return; el.textContent = '×' + n + ' !'; if (el.animate) el.animate([{ transform: 'translate(-50%,-50%) scale(.4) rotate(-6deg)', opacity: 0 }, { transform: 'translate(-50%,-50%) scale(1.5) rotate(3deg)', opacity: 1, offset: 0.3 }, { transform: 'translate(-50%,-50%) scale(1) rotate(0)', opacity: 1, offset: 0.62 }, { opacity: 0 }], { duration: 850, easing: 'cubic-bezier(.2,1.4,.4,1)' }) }
    return () => { store.api.flash = null; store.api.combo = null }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return (
    <>
      {DEV && <Leva collapsed />}
      <div ref={flashRef} aria-hidden style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 50% 55%, #fff,rgba(255,238,200,.6) 55%,transparent 75%)', opacity: 0, pointerEvents: 'none', mixBlendMode: 'screen', zIndex: 3 }} />
      <div ref={comboRef} aria-hidden style={{ position: 'absolute', top: '42%', left: '50%', transform: 'translate(-50%,-50%) scale(.4)', opacity: 0, pointerEvents: 'none', zIndex: 4, fontFamily: "'Pirata One','Cinzel',serif", fontSize: 'clamp(38px,7vw,82px)', fontWeight: 700, color: '#ffd56a', textShadow: '0 0 22px rgba(255,180,60,.85), 0 4px 14px rgba(0,0,0,.6)', WebkitTextStroke: '1px rgba(90,30,5,.5)' }} />
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ fov: 42, position: [0, 11.5, 13.5], near: 0.1, far: 400 }}
        gl={{ antialias: false, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.08, outputColorSpace: THREE.SRGBColorSpace }}
        onPointerDown={(e) => { down.current = { x: e.clientX, y: e.clientY } }}
        onPointerMissed={() => { if (store.api.onMiss) store.api.onMiss() }}
        style={{ width: '100%', height: '100%', display: 'block' }}
      >
        <WorldEnvironment theme={theme} />

        <Board store={store} />
        <Pieces store={store} audio={audio} events={events} />
        <Markers store={store} />
        <Celebration store={store} quality={quality} />
        {quality !== 'low' && <ContactShadows position={[0, 0.1, 0]} scale={16} resolution={1024} blur={2.6} opacity={0.5} far={6} color="#0a0604" />}
        <Ocean quality={quality} theme={theme} />
        {quality !== 'low' && <Spray quality={quality} theme={theme} />}
        {theme === 'night' && quality !== 'low' && <Stars quality={quality} />}

        <CameraRig store={store} />
        <Effects quality={quality} theme={theme} />
      </Canvas>
    </>
  )
}
