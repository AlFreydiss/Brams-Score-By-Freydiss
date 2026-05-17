import { useState, useRef, useMemo, useEffect, Suspense } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Text, Stars } from '@react-three/drei'
import * as THREE from 'three'
import { CHARACTERS, RELATIONS, TREE_CONFIGS, LINK_COLORS, HAKI_COLORS } from '../data/tree-data.js'

// ── Ocean (simple animated plane — no custom shader) ──────────────────────────

function Ocean({ mangaMode }) {
  const meshRef = useRef()
  const posRef  = useRef(null)

  useFrame(({ clock }) => {
    const mesh = meshRef.current
    if (!mesh) return
    const geo = mesh.geometry
    if (!posRef.current) posRef.current = geo.attributes.position.array.slice()
    const orig = posRef.current
    const pos  = geo.attributes.position.array
    const t    = clock.getElapsedTime()
    for (let i = 0; i < pos.length; i += 3) {
      const x = orig[i], z = orig[i + 2]
      pos[i + 1] = Math.sin(x * 0.45 + t * 0.65) * 0.45
                 + Math.sin(z * 0.35 + t * 0.48) * 0.32
                 + Math.sin((x + z) * 0.18 + t * 0.55) * 0.22
    }
    geo.attributes.position.needsUpdate = true
    geo.computeVertexNormals()
  })

  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -3.5, 0]}>
      <planeGeometry args={[120, 120, 40, 40]} />
      <meshStandardMaterial
        color={mangaMode ? '#7aaac8' : '#041630'}
        transparent
        opacity={0.88}
        side={THREE.DoubleSide}
        roughness={0.2}
        metalness={0.1}
      />
    </mesh>
  )
}

// ── Poster canvas texture ─────────────────────────────────────────────────────

function makePosterTexture(char, mangaMode) {
  const W = 256, H = 384
  const cv = document.createElement('canvas')
  cv.width = W; cv.height = H
  const ctx = cv.getContext('2d')

  // Paper
  const grad = ctx.createLinearGradient(0, 0, 0, H)
  grad.addColorStop(0, mangaMode ? '#f0e4c0' : '#c8aa78')
  grad.addColorStop(1, mangaMode ? '#ddd0a0' : '#a88848')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, W, H)

  // Aged texture overlay
  ctx.fillStyle = 'rgba(0,0,0,0.04)'
  for (let i = 0; i < 40; i++) {
    ctx.fillRect(Math.random() * W, Math.random() * H, Math.random() * 30 + 5, 1)
  }

  // Header band
  ctx.fillStyle = char.color || '#8b0000'
  ctx.fillRect(0, 0, W, 82)

  // "WANTED" text
  ctx.fillStyle = '#f8f0d8'
  ctx.font = 'bold 40px Georgia, serif'
  ctx.textAlign = 'center'
  ctx.shadowColor = 'rgba(0,0,0,0.6)'
  ctx.shadowBlur = 6
  ctx.fillText('WANTED', W / 2, 50)
  ctx.font = 'bold 13px Georgia, serif'
  ctx.fillText('DEAD OR ALIVE', W / 2, 72)
  ctx.shadowBlur = 0

  // Photo frame
  ctx.strokeStyle = char.color || '#8b4513'
  ctx.lineWidth = 4
  ctx.strokeRect(18, 92, W - 36, 180)
  ctx.fillStyle = 'rgba(0,0,0,0.18)'
  ctx.fillRect(20, 94, W - 40, 176)

  // Big emoji
  ctx.font = '72px serif'
  ctx.textAlign = 'center'
  ctx.fillText(char.emoji || '?', W / 2, 200)

  // Dead overlay
  if (char.status === 'dead') {
    ctx.save()
    ctx.globalAlpha = 0.55
    ctx.translate(W / 2, 182)
    ctx.rotate(-0.25)
    ctx.font = 'bold 30px Georgia, serif'
    ctx.fillStyle = '#666'
    ctx.fillText('DÉCÉDÉ', 0, 0)
    ctx.restore()
  }

  // Name
  ctx.fillStyle = '#1a0800'
  ctx.font = 'bold 16px Georgia, serif'
  ctx.textAlign = 'center'
  const name = char.name.length > 18 ? char.name.substring(0, 16) + '…' : char.name
  ctx.fillText(name, W / 2, 294)

  // Alias
  if (char.alias) {
    ctx.font = 'italic 11px Georgia, serif'
    ctx.fillStyle = '#3a1800'
    const alias = char.alias.length > 22 ? char.alias.substring(0, 20) + '…' : char.alias
    ctx.fillText(`"${alias}"`, W / 2, 312)
  }

  // Bounty
  if (char.bounty) {
    ctx.fillStyle = '#1a0800'
    ctx.font = 'bold 12px Georgia, serif'
    ctx.fillText(char.bounty, W / 2, 334)
    ctx.font = '10px Georgia, serif'
    ctx.fillText('PRIME', W / 2, 348)
  }

  // Haki dots
  if (char.haki.length > 0) {
    char.haki.forEach((h, i) => {
      ctx.beginPath()
      ctx.arc(18 + i * 14, H - 16, 5, 0, Math.PI * 2)
      ctx.fillStyle = h === 'conqueror' ? '#d4a017' : h === 'armament' ? '#64748b' : '#60a5fa'
      ctx.fill()
    })
  }

  // Outer border
  ctx.strokeStyle = char.color || '#8b4513'
  ctx.lineWidth = 7
  ctx.strokeRect(4, 4, W - 8, H - 8)
  ctx.strokeStyle = 'rgba(255,255,255,0.15)'
  ctx.lineWidth = 2
  ctx.strokeRect(10, 10, W - 20, H - 20)

  const tex = new THREE.CanvasTexture(cv)
  return tex
}

// ── Wanted Poster Node ────────────────────────────────────────────────────────

function WantedNode({ char, position, onClick, selected, mangaMode }) {
  const groupRef = useRef()
  const meshRef  = useRef()
  const [hovered, setHovered] = useState(false)

  const texture = useMemo(() => makePosterTexture(char, mangaMode), [char, mangaMode])

  const emissiveMat = useMemo(() => ({
    color: selected ? new THREE.Color(char.color).multiplyScalar(0.6) :
           hovered  ? new THREE.Color('#ffffff').multiplyScalar(0.12) :
                      new THREE.Color('#000000'),
    intensity: selected ? 0.35 : hovered ? 0.12 : 0,
  }), [selected, hovered, char.color])

  useFrame(({ clock }) => {
    if (!groupRef.current) return
    const t = clock.getElapsedTime()
    const seed = position[0] * 0.31 + position[2] * 0.17

    // Gentle floating oscillation (simulated physics)
    groupRef.current.rotation.z = Math.sin(t * 0.7 + seed) * 0.06
    groupRef.current.rotation.x = Math.cos(t * 0.5 + seed) * 0.03
    groupRef.current.position.y = position[1] + Math.sin(t * 0.4 + seed) * 0.12

    // Hover lift
    const targetY = hovered ? position[1] + 0.4 : position[1]
    groupRef.current.position.y += (targetY - groupRef.current.position.y) * 0.08
  })

  return (
    <group ref={groupRef} position={position}>
      {/* Drop shadow */}
      <mesh position={[0.06, -0.06, -0.05]} rotation={[0, 0, 0.04]}>
        <planeGeometry args={[1.45, 2.15]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.35} />
      </mesh>

      {/* Conqueror Haki glow aura */}
      {char.haki.includes('conqueror') && (
        <mesh position={[0, 0, -0.04]}>
          <planeGeometry args={[1.9, 2.6]} />
          <meshBasicMaterial color="#d4a017" transparent opacity={selected ? 0.28 : 0.1} />
        </mesh>
      )}

      {/* Selected ring */}
      {selected && (
        <mesh position={[0, 0, -0.03]}>
          <ringGeometry args={[0.95, 1.08, 64]} />
          <meshBasicMaterial color={char.color || '#d4a017'} transparent opacity={0.9} />
        </mesh>
      )}

      {/* Main poster */}
      <mesh
        ref={meshRef}
        onClick={e => { e.stopPropagation(); onClick(char) }}
        onPointerEnter={e => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer' }}
        onPointerLeave={e => { e.stopPropagation(); setHovered(false); document.body.style.cursor = 'default' }}
      >
        <planeGeometry args={[1.4, 2.1]} />
        <meshStandardMaterial
          map={texture}
          side={THREE.DoubleSide}
          roughness={0.75}
          metalness={0.05}
          emissive={emissiveMat.color}
          emissiveIntensity={emissiveMat.intensity}
        />
      </mesh>

      {/* Name label */}
      <Text
        position={[0, 1.25, 0.08]}
        fontSize={0.17}
        color={mangaMode ? '#1a0800' : '#ffffff'}
        anchorX="center"
        anchorY="bottom"
        outlineWidth={0.025}
        outlineColor={mangaMode ? '#f0e4c0' : '#000000'}
        maxWidth={2}
      >
        {char.name.split(' ').pop()}
      </Text>
    </group>
  )
}

// ── Relation Line ─────────────────────────────────────────────────────────────

function RelLine({ from, to, type }) {
  const color = LINK_COLORS[type] || '#ffffff'

  const lineObj = useMemo(() => {
    const A = new THREE.Vector3(...from)
    const B = new THREE.Vector3(...to)
    const mid = new THREE.Vector3().lerpVectors(A, B, 0.5)
    mid.y += type === 'enemy' ? -1.2 : type === 'crew' ? 0.8 : 0.5
    const pts = new THREE.CatmullRomCurve3([A, mid, B]).getPoints(28)
    const geo  = new THREE.BufferGeometry().setFromPoints(pts)
    const mat  = new THREE.LineBasicMaterial({
      color: new THREE.Color(color),
      transparent: true,
      opacity: type === 'enemy' ? 0.85 : 0.65,
    })
    return new THREE.Line(geo, mat)
  }, [from, to, type, color])

  return <primitive object={lineObj} />
}

// ── Layout algorithms ─────────────────────────────────────────────────────────

function computeTreeLayout(charIds, rels, rootId) {
  const children = {}
  charIds.forEach(id => { children[id] = [] })

  rels
    .filter(r => charIds.includes(r.from) && charIds.includes(r.to) && r.type === 'parent')
    .forEach(r => { children[r.from].push(r.to) })

  const levels = {}
  const queue = [rootId]
  levels[rootId] = 0
  const visited = new Set([rootId])

  while (queue.length) {
    const id = queue.shift()
    ;(children[id] || []).forEach(kid => {
      if (!visited.has(kid)) {
        visited.add(kid)
        levels[kid] = (levels[id] || 0) + 1
        queue.push(kid)
      }
    })
  }

  // Orphaned nodes (no parent relation) → last level
  const maxLevel = Math.max(...Object.values(levels), 0)
  charIds.forEach(id => {
    if (levels[id] === undefined) levels[id] = maxLevel + 1
  })

  const byLevel = {}
  charIds.forEach(id => {
    const lv = levels[id]
    byLevel[lv] = byLevel[lv] || []
    byLevel[lv].push(id)
  })

  const positions = {}
  Object.entries(byLevel).forEach(([lv, ids]) => {
    const totalW = (ids.length - 1) * 3.8
    ids.forEach((id, i) => {
      positions[id] = [i * 3.8 - totalW / 2, -parseInt(lv) * 3.6 + 4, 0]
    })
  })
  return positions
}

function computeRadialLayout(charIds, rootId) {
  const others = charIds.filter(id => id !== rootId)
  const radius = Math.max(4, others.length * 0.85)
  const positions = { [rootId]: [0, 0, 0] }
  others.forEach((id, i) => {
    const angle = (i / others.length) * Math.PI * 2
    positions[id] = [Math.cos(angle) * radius, 0, Math.sin(angle) * radius]
  })
  return positions
}

// ── 3D Scene ──────────────────────────────────────────────────────────────────

function Scene({ cfg, selectedChar, onSelect, mangaMode, filterStatus, filterHaki }) {
  const chars = useMemo(() => {
    let list = CHARACTERS.filter(cfg.charFilter)
    if (filterStatus !== 'all') list = list.filter(c => c.status === filterStatus)
    if (filterHaki) list = list.filter(c => c.haki.includes(filterHaki))
    return list
  }, [cfg, filterStatus, filterHaki])

  const rels = useMemo(() =>
    RELATIONS.filter(r =>
      chars.find(c => c.id === r.from) &&
      chars.find(c => c.id === r.to) &&
      cfg.relFilter(r)
    ), [chars, cfg])

  const positions = useMemo(() => {
    const ids = chars.map(c => c.id)
    const root = ids.includes(cfg.root) ? cfg.root : ids[0]
    if (!root) return {}
    return cfg.layout === 'radial'
      ? computeRadialLayout(ids, root)
      : computeTreeLayout(ids, rels, root)
  }, [chars, rels, cfg])

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={mangaMode ? 1.1 : 0.55} />
      <directionalLight
        position={[12, 18, 8]}
        intensity={mangaMode ? 1.6 : 1.3}
        color={mangaMode ? '#ffffff' : '#ffb060'}
        castShadow
      />
      <pointLight position={[-14, 10, -10]} intensity={0.5} color={mangaMode ? '#ccddff' : '#4060ff'} />
      <pointLight position={[10, 4, 12]} intensity={0.35} color={mangaMode ? '#ffddcc' : '#ff6030'} />

      {/* Background */}
      {!mangaMode && <Stars radius={90} depth={50} count={2500} factor={4} saturation={0} fade />}
      <Ocean mangaMode={mangaMode} />

      {/* Fog */}
      {!mangaMode && <fog attach="fog" args={['#0a0e1a', 22, 85]} />}

      {/* Relation lines */}
      {rels.map(rel => {
        const fp = positions[rel.from]
        const tp = positions[rel.to]
        if (!fp || !tp) return null
        return <RelLine key={rel.id} from={fp} to={tp} type={rel.type} />
      })}

      {/* Character nodes */}
      {chars.map(char => {
        const pos = positions[char.id]
        if (!pos) return null
        return (
          <WantedNode
            key={char.id}
            char={char}
            position={pos}
            onClick={onSelect}
            selected={selectedChar?.id === char.id}
            mangaMode={mangaMode}
          />
        )
      })}

      <OrbitControls
        enableDamping
        dampingFactor={0.06}
        minDistance={4}
        maxDistance={45}
        maxPolarAngle={Math.PI / 1.75}
        enablePan
      />
    </>
  )
}

// ── UI Components ─────────────────────────────────────────────────────────────

function CharDetail({ char, onClose, mangaMode }) {
  if (!char) return null
  const txt = mangaMode ? '#1a0800' : '#fff'
  const sub = mangaMode ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.5)'

  return (
    <div style={{ background: `${char.color}18`, border: `1px solid ${char.color}50`, borderRadius: 14, padding: '16px 18px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
        <div>
          <div style={{ fontFamily: "'Pirata One', cursive", fontSize: 19, color: txt, lineHeight: 1.2 }}>
            {char.emoji} {char.name}
          </div>
          {char.alias && <div style={{ fontSize: 12, color: char.color, fontStyle: 'italic', marginTop: 3 }}>"{char.alias}"</div>}
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: sub, cursor: 'pointer', fontSize: 16, padding: 2 }}>✕</button>
      </div>

      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 10 }}>
        {char.haki.map(h => (
          <span key={h} style={{ fontSize: 10, fontWeight: 700, background: HAKI_COLORS[h] + '22', color: h === 'armament' ? '#94a3b8' : HAKI_COLORS[h], border: `1px solid ${HAKI_COLORS[h]}44`, borderRadius: 100, padding: '2px 9px' }}>
            {h === 'conqueror' ? '⚡ Conquérant' : h === 'armament' ? '⚫ Armement' : '👁 Observation'}
          </span>
        ))}
      </div>

      {char.devilFruit && (
        <div style={{ fontSize: 12, color: sub, marginBottom: 4 }}>🍎 <b style={{ color: txt }}>{char.devilFruit}</b></div>
      )}
      {char.bounty && (
        <div style={{ fontSize: 13, color: '#d4a017', fontWeight: 800, marginBottom: 4 }}>💰 {char.bounty}</div>
      )}
      <div style={{ fontSize: 11, fontWeight: 700, color: char.status === 'alive' ? '#34d399' : '#9ca3af', marginTop: 4 }}>
        {char.status === 'alive' ? '✅ Vivant' : '💀 Décédé'}
      </div>
    </div>
  )
}

// ── Main Export ───────────────────────────────────────────────────────────────

export default function FamilyTree3D({ onClose }) {
  const [activeTree,    setActiveTree]    = useState('straw_hats')
  const [selectedChar,  setSelectedChar]  = useState(null)
  const [mangaMode,     setMangaMode]     = useState(false)
  const [filterStatus,  setFilterStatus]  = useState('all')
  const [filterHaki,    setFilterHaki]    = useState(null)
  const [panelOpen,     setPanelOpen]     = useState(true)

  const cfg = TREE_CONFIGS[activeTree]

  const bg    = mangaMode ? '#f5f0e8' : '#080c18'
  const panel = mangaMode ? 'rgba(245,240,232,0.97)' : 'rgba(8,12,24,0.94)'
  const txt   = mangaMode ? '#1a0800' : '#ffffff'
  const muted = mangaMode ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.35)'
  const border= mangaMode ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.07)'

  useEffect(() => {
    document.title = 'Arbre 3D — Brams'
    document.body.style.overflow = 'hidden'
    return () => { document.title = 'Brams Community'; document.body.style.overflow = '' }
  }, [])

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 600, background: bg, display: 'flex', flexDirection: 'column' }}>

      {/* ── Header ── */}
      <div style={{ flexShrink: 0, height: 58, display: 'flex', alignItems: 'center', gap: 12, padding: '0 18px', background: panel, backdropFilter: 'blur(22px)', borderBottom: `1px solid ${border}`, zIndex: 10 }}>
        <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.07)', border: `1px solid ${border}`, borderRadius: 9, color: txt, cursor: 'pointer', padding: '7px 14px', fontSize: 13, fontWeight: 700 }}>
          ← Retour
        </button>

        <div style={{ flex: 1, textAlign: 'center' }}>
          <span style={{ fontFamily: "'Pirata One', cursive", fontSize: 22, color: txt }}>🌊 Arbre des Personnages 3D</span>
          <span style={{ fontSize: 11, color: muted, marginLeft: 10 }}>{cfg.emoji} {cfg.label}</span>
        </div>

        <button onClick={() => setMangaMode(m => !m)} style={{ background: mangaMode ? '#1a0800' : 'rgba(212,160,23,0.15)', border: `1px solid ${mangaMode ? 'transparent' : 'rgba(212,160,23,0.35)'}`, borderRadius: 9, color: mangaMode ? '#fff' : '#d4a017', cursor: 'pointer', padding: '7px 14px', fontSize: 12, fontWeight: 700 }}>
          {mangaMode ? '🌙 Sombre' : '📖 Manga'}
        </button>

        <button onClick={() => setPanelOpen(p => !p)} style={{ background: 'rgba(255,255,255,0.07)', border: `1px solid ${border}`, borderRadius: 9, color: txt, cursor: 'pointer', padding: '7px 10px', fontSize: 15 }}>
          {panelOpen ? '◀' : '▶'}
        </button>
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* ── Side Panel ── */}
        <div style={{ width: panelOpen ? 270 : 0, overflow: 'hidden', transition: 'width 0.28s cubic-bezier(.4,0,.2,1)', flexShrink: 0, background: panel, backdropFilter: 'blur(22px)', borderRight: `1px solid ${border}`, display: 'flex', flexDirection: 'column' }}>
          <div style={{ width: 270, flex: 1, overflowY: 'auto' }}>

            {/* Tree selector */}
            <div style={{ padding: '14px 14px 6px' }}>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', color: muted, marginBottom: 8, textTransform: 'uppercase' }}>Arbres</div>
              {Object.values(TREE_CONFIGS).map(c => (
                <button key={c.id} onClick={() => { setActiveTree(c.id); setSelectedChar(null) }} style={{ width: '100%', textAlign: 'left', padding: '9px 12px', borderRadius: 10, border: `1px solid ${activeTree === c.id ? c.color + '55' : border}`, background: activeTree === c.id ? `${c.color}15` : 'transparent', color: activeTree === c.id ? c.color : muted, cursor: 'pointer', marginBottom: 5, fontSize: 13, fontWeight: activeTree === c.id ? 700 : 500, display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.15s' }}>
                  <span style={{ fontSize: 17 }}>{c.emoji}</span>
                  <span>{c.label}</span>
                  {activeTree === c.id && <span style={{ marginLeft: 'auto', fontSize: 9, background: c.color, color: '#fff', borderRadius: 100, padding: '2px 7px', fontWeight: 800 }}>ACTIF</span>}
                </button>
              ))}
            </div>

            {/* Filters */}
            <div style={{ padding: '12px 14px', borderTop: `1px solid ${border}` }}>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', color: muted, marginBottom: 8, textTransform: 'uppercase' }}>Filtres</div>

              <div style={{ fontSize: 11, color: muted, marginBottom: 5 }}>Statut</div>
              <div style={{ display: 'flex', gap: 5, marginBottom: 12 }}>
                {[['all','Tous'],['alive','✅ Vivant'],['dead','💀 Mort']].map(([v, l]) => (
                  <button key={v} onClick={() => setFilterStatus(v)} style={{ flex: 1, padding: '6px 2px', borderRadius: 7, border: `1px solid ${filterStatus === v ? '#34d399' : border}`, background: filterStatus === v ? 'rgba(52,211,153,0.14)' : 'transparent', color: filterStatus === v ? '#34d399' : muted, cursor: 'pointer', fontSize: 10, fontWeight: 600 }}>
                    {l}
                  </button>
                ))}
              </div>

              <div style={{ fontSize: 11, color: muted, marginBottom: 5 }}>Haki</div>
              {[[null,'🌊 Tous'],['conqueror','⚡ Conquérant'],['armament','⚫ Armement'],['observation','👁 Observation']].map(([v, l]) => (
                <button key={String(v)} onClick={() => setFilterHaki(v)} style={{ width: '100%', padding: '7px 10px', borderRadius: 7, border: `1px solid ${filterHaki === v ? '#d4a017' : border}`, background: filterHaki === v ? 'rgba(212,160,23,0.13)' : 'transparent', color: filterHaki === v ? '#d4a017' : muted, cursor: 'pointer', fontSize: 11, fontWeight: filterHaki === v ? 700 : 500, textAlign: 'left', marginBottom: 4 }}>
                  {l}
                </button>
              ))}
            </div>

            {/* Legend */}
            <div style={{ padding: '12px 14px', borderTop: `1px solid ${border}` }}>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', color: muted, marginBottom: 8, textTransform: 'uppercase' }}>Légende des liens</div>
              {Object.entries(LINK_COLORS).map(([type, color]) => (
                <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                  <div style={{ width: 22, height: 3, background: color, borderRadius: 2, flexShrink: 0 }} />
                  <span style={{ fontSize: 11, color: muted }}>
                    {({ parent:'Parent', sibling:'Frères', crew:'Équipage', ally:'Allié', enemy:'Ennemi', hierarchy:'Hiérarchie', rival:'Rival' })[type]}
                  </span>
                </div>
              ))}
            </div>

            {/* Haki legend */}
            <div style={{ padding: '12px 14px', borderTop: `1px solid ${border}` }}>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', color: muted, marginBottom: 8, textTransform: 'uppercase' }}>Points Haki</div>
              {[['conqueror','⚡ Conquérant','#d4a017'],['armament','⚫ Armement','#64748b'],['observation','👁 Observation','#60a5fa']].map(([k, l, c]) => (
                <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: c, flexShrink: 0 }} />
                  <span style={{ fontSize: 11, color: muted }}>{l}</span>
                </div>
              ))}
              <div style={{ fontSize: 10, color: muted, marginTop: 6, lineHeight: 1.5 }}>Aura dorée = Haki du Conquérant</div>
            </div>

            {/* Selected char */}
            {selectedChar && (
              <div style={{ padding: '12px 14px', borderTop: `1px solid ${border}` }}>
                <CharDetail char={selectedChar} onClose={() => setSelectedChar(null)} mangaMode={mangaMode} />
              </div>
            )}
          </div>
        </div>

        {/* ── Canvas ── */}
        <div style={{ flex: 1, position: 'relative' }}>
          <Canvas
            camera={{ position: [0, 4, 14], fov: 58 }}
            style={{ background: bg }}
            onPointerMissed={() => setSelectedChar(null)}
            shadows
          >
            <Suspense fallback={null}>
              <Scene
                cfg={cfg}
                selectedChar={selectedChar}
                onSelect={setSelectedChar}
                mangaMode={mangaMode}
                filterStatus={filterStatus}
                filterHaki={filterHaki}
              />
            </Suspense>
          </Canvas>

          {/* Controls hint */}
          <div style={{ position: 'absolute', bottom: 16, right: 16, fontSize: 11, color: mangaMode ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.2)', textAlign: 'right', pointerEvents: 'none', lineHeight: 1.7 }}>
            🖱️ Glisser : tourner &nbsp;·&nbsp; Molette : zoomer &nbsp;·&nbsp; Clic droit : déplacer<br />
            Clic sur un poster : voir les détails
          </div>

          {/* Selected name badge */}
          {selectedChar && (
            <div style={{ position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)', background: `${selectedChar.color}dd`, color: '#fff', borderRadius: 100, padding: '6px 18px', fontSize: 13, fontWeight: 800, pointerEvents: 'none', backdropFilter: 'blur(8px)', boxShadow: `0 4px 20px ${selectedChar.color}66` }}>
              {selectedChar.emoji} {selectedChar.name}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
