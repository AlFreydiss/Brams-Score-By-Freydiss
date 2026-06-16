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
function Pieces({ store, audio }) {
  const state = useSyncExternalStore(store.subscribe, store.getState)
  const mats = useMaterials()
  const refs = useRef({})            // `${r}_${c}` -> THREE.Group
  const anim = useRef(null)          // animation de coup en cours
  const sparkRef = useRef(null)      // InstancedMesh des éclats
  const sparks = useRef([])          // état JS des éclats
  const hoverKey = useRef(null)      // case survolée (pièce jouable)
  const glowMesh = useRef(null)      // halo émissif sous la pièce sélectionnée
  const hoverMesh = useRef(null)     // ring de survol
  const reduced = state.reduced
  const SPARKS = 200
  const dummy = useMemo(() => new THREE.Object3D(), [])

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
      if (ai && store.api.focusMove) store.api.focusMove(move.from, move.to)  // caméra suit le coup IA/adverse
      if (!grp || reduced) {
        if (isCap) { caps.forEach(([r, c], idx) => { const m = refs.current[r + '_' + c]; if (m) m.visible = false; fxBurst(r, c, 'fire', 1 + idx * 0.3); if (idx >= 1) store.api.combo?.(idx + 1) }); audio.capture(); store.api.shake?.(0.12); store.api.flash?.(0.3) }
        if (promoted) { fxBurst(move.to[0], move.to[1], 'gold', 2); store.api.flash?.(0.4); audio.king() } else audio.move()
        resolve(); return
      }
      audio.move()
      anim.current = { grp, path, caps, isCap, i: 0, seg0: { ...worldPos(move.from[0], move.from[1]) }, t0: performance.now(), promoted, to: move.to, resolve, capDone: new Set(), combo: 0, phase: 'hop' }
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
          if (cap) { const cm = refs.current[cap[0] + '_' + cap[1]]; if (cm) cm.visible = false; a.combo++; fxBurst(cap[0], cap[1], 'fire', 1 + a.combo * 0.28); audio.capture(); store.api.shake?.(0.13 + a.combo * 0.05); store.api.flash?.(0.28 + a.combo * 0.07); if (a.combo >= 2) store.api.combo?.(a.combo) }
        }
        if (p >= 1) {
          a.seg0 = b; a.i++; a.t0 = now
          if (a.i >= a.path.length) { const wt = worldPos(a.to[0], a.to[1]); a.grp.position.set(wt.x, PIECE_Y, wt.z); a.phase = a.promoted ? 'ceremony' : 'settle'; a.t0 = now; if (a.promoted) { audio.king(); store.api.flash?.(0.5); fxBurst(a.to[0], a.to[1], 'gold', 2.4) } }
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
        if (p >= 1) { a.grp.rotation.y = 0; a.grp.position.set(wt.x, PIECE_Y, wt.z); a.grp.scale.set(1, 1, 1); const r = a.resolve; anim.current = null; r() }
      }
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
  })

  // init du pool d'éclats
  useEffect(() => { sparks.current = Array.from({ length: SPARKS }, () => ({ life: 0, max: 1, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, col: 0xffffff })) }, [])

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
            ref={(el) => { if (el) refs.current[key] = el; else delete refs.current[key] }}
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
function Ocean({ quality }) {
  const normal = useMemo(() => makeWaveNormal(), [])
  useFrame((st) => { const t = st.clock.elapsedTime; normal.offset.set(t * 0.03, t * 0.017) })
  if (quality === 'low') {
    return <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}><planeGeometry args={[400, 400]} /><meshStandardMaterial color={0x2a4258} roughness={0.25} metalness={0.7} normalMap={normal} /></mesh>
  }
  // miroir net + faible roughness → reflète le ciel couchant chaud (glint sur l'eau)
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
      <planeGeometry args={[400, 400]} />
      <MeshReflectorMaterial resolution={quality === 'high' ? 1024 : 512} mixBlur={1.4} mixStrength={3.2} blur={[140, 50]} minDepthThreshold={0.2} maxDepthThreshold={1.4} depthScale={0.9} depthToBlurRatioBias={0.2} mirror={0.82} color="#22455f" metalness={0.9} roughness={0.16} normalMap={normal} normalScale={[0.22, 0.22]} />
    </mesh>
  )
}
function Spray({ quality }) {
  const ref = useRef()
  const N = quality === 'high' ? 220 : 110
  const geo = useMemo(() => { const g = new THREE.BufferGeometry(); const pos = new Float32Array(N * 3); for (let i = 0; i < N; i++) { pos[i * 3] = (Math.random() - 0.5) * 60; pos[i * 3 + 1] = Math.random() * 16 + 0.5; pos[i * 3 + 2] = (Math.random() - 0.5) * 60 } g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); return g }, [N])
  useFrame((st) => { if (ref.current) ref.current.rotation.y = st.clock.elapsedTime * 0.012 })
  return <points ref={ref} geometry={geo}><pointsMaterial size={0.08} color={0xffe7c4} transparent opacity={0.5} depthWrite={false} toneMapped={false} /></points>
}

// ── caméra + contrôles + intro ────────────────────────────────────────────────
function CameraRig({ store }) {
  const { camera } = useThree()
  const ctrl = useRef()
  const intro = useRef({ t: 0, on: !store.getState().reduced })
  const shakeMag = useRef(0)
  const focus = useRef(null)   // { mid:{x,y,z}, t0, dur }
  useEffect(() => {
    store.api.resetView = () => { camera.position.set(0, 11.5, 13.5); if (ctrl.current) { ctrl.current.target.set(0, 0, 0); ctrl.current.update() } }
    store.api.shake = (amt = 0.15) => { shakeMag.current = Math.min(0.55, Math.max(shakeMag.current, amt)) }   // micro-shake (capture)
    store.api.focusMove = (from, to) => { const a = worldPos(from[0], from[1]), b = worldPos(to[0], to[1]); focus.current = { mid: { x: (a.x + b.x) / 2, y: 0.3, z: (a.z + b.z) / 2 }, t0: performance.now(), dur: 1100 } }
    if (intro.current.on) camera.position.set(-9.5, 18.5, 16.5)
    else store.api.resetView()
    return () => { store.api.resetView = null; store.api.shake = null; store.api.focusMove = null }
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
function Effects({ quality }) {
  const { gl } = useThree()
  const tune = useControls('Dames · rendu', {
    exposure: { value: 1.08, min: 0.6, max: 1.6, step: 0.01 },
    bloom: { value: 0.7, min: 0, max: 2, step: 0.05 },
    bloomThreshold: { value: 0.72, min: 0, max: 1, step: 0.01 },
    ao: { value: 1.0, min: 0, max: 3, step: 0.1 },
    dof: { value: 1, min: 0, max: 4, step: 0.1 },
  }, { collapsed: true })
  useEffect(() => { gl.toneMappingExposure = tune.exposure }, [gl, tune.exposure])
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
export default function DamesScene({ store, onSquareClick, audio }) {
  const down = useRef({ x: 0, y: 0 })
  const flashRef = useRef(null)
  const comboRef = useRef(null)
  // garde clic-vs-drag : on n'émet le clic que si le pointeur n'a quasi pas bougé
  store._click = (e, r, c) => { const d = Math.abs(e.clientX - down.current.x) + Math.abs(e.clientY - down.current.y); if (d < 7) { e.stopPropagation(); onSquareClick(r, c) } }
  const s = useSyncExternalStore(store.subscribe, store.getState)
  const quality = s.quality
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
        <fogExp2 attach="fog" args={[0xc77a44, 0.0072]} />{/* lueur d'horizon couchant chaude — fond l'océan lointain dans le soleil */}
        <Sky distance={3000} sunPosition={SUN} turbidity={10} rayleigh={1.25} mieCoefficient={0.05} mieDirectionalG={0.97} />
        <Environment preset="sunset" environmentIntensity={0.72} />
        <hemisphereLight args={[0xffdcae, 0x16202c, 0.5]} />
        <directionalLight position={[7, 16, 9]} intensity={1.0} color={0xfff1da} castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-0.0004} shadow-camera-left={-9} shadow-camera-right={9} shadow-camera-top={9} shadow-camera-bottom={-9} shadow-camera-near={1} shadow-camera-far={50} />
        <directionalLight position={[-20, 3.5, -28]} intensity={1.15} color={0xff9248} />{/* soleil couchant : rim chaud + glint sur l'eau */}
        <pointLight position={[-7, 7, -5]} intensity={22} color={0xffc070} distance={45} decay={1.4} />
        <directionalLight position={[-6, 8, 6]} intensity={0.25} color={0x9fb8e0} />

        <Board store={store} />
        <Pieces store={store} audio={audio} />
        <Markers store={store} />
        {quality !== 'low' && <ContactShadows position={[0, 0.1, 0]} scale={16} resolution={1024} blur={2.6} opacity={0.5} far={6} color="#0a0604" />}
        <Ocean quality={quality} />
        {quality !== 'low' && <Spray quality={quality} />}

        <CameraRig store={store} />
        <Effects quality={quality} />
      </Canvas>
    </>
  )
}
