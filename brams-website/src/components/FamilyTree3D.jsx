import { Suspense, useMemo, useRef, useState, useEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Html, OrbitControls, Stars } from '@react-three/drei'
import * as THREE from 'three'
import { motion, AnimatePresence } from 'framer-motion'
import { CHARACTERS, RELATIONS, LINK_COLORS, HAKI_COLORS } from '../data/tree-data.js'

const ZONES = [
  {
    id: 'mugiwara',
    name: 'Mugiwara',
    subtitle: 'Noyau Nika',
    position: [0, 0, 0],
    color: '#e0524a',
    accent: '#ffd27a',
    scale: 1.35,
    mood: 'foyer solaire, liberté, promesse',
    filter: (c) => c.crew === 'straw_hats' || c.id === 'luffy',
  },
  {
    id: 'wano',
    name: 'Wano',
    subtitle: 'Brume samouraï',
    position: [-11, -0.8, -5],
    color: '#c74235',
    accent: '#ff9c5a',
    scale: 1.05,
    mood: 'cendres, sakura, volcan endormi',
    filter: (c) => ['kaido', 'yamato', 'zoro'].includes(c.id),
  },
  {
    id: 'marineford',
    name: 'Marineford',
    subtitle: 'Ordre absolu',
    position: [10.5, -0.9, -4.5],
    color: '#4fa3ff',
    accent: '#d8ecff',
    scale: 1.05,
    mood: 'acier froid, lumière militaire',
    filter: (c) => c.org === 'marines',
  },
  {
    id: 'wholecake',
    name: 'Whole Cake',
    subtitle: 'Beauté toxique',
    position: [7, -0.4, 7],
    color: '#e84393',
    accent: '#d5a6ff',
    scale: 0.95,
    mood: 'sucre, malaise, souveraineté',
    filter: (c) => c.family === 'charlotte',
  },
  {
    id: 'revolution',
    name: 'Révolutionnaires',
    subtitle: 'Signal clandestin',
    position: [-8, -0.5, 7.5],
    color: '#37b26c',
    accent: '#c7ffd8',
    scale: 0.98,
    mood: 'fumée verte, réseau caché',
    filter: (c) => c.org === 'revolutionary' || c.id === 'dragon',
  },
  {
    id: 'egghead',
    name: 'Egghead',
    subtitle: 'Archives interdites',
    position: [0, 0.2, 11],
    color: '#86f7ff',
    accent: '#ffffff',
    scale: 0.9,
    mood: 'science blanche, hologrammes',
    filter: (c) => ['law', 'franky', 'robin'].includes(c.id),
  },
  {
    id: 'yonko',
    name: 'Yonko',
    subtitle: 'Mer des empereurs',
    position: [0, -0.7, -12],
    color: '#9b5cff',
    accent: '#ffd166',
    scale: 1.15,
    mood: 'rois pirates, tempête lointaine',
    filter: (c) => ['shanks', 'whitebeard', 'blackbeard', 'bigmom', 'kaido'].includes(c.id),
  },
  {
    id: 'worldgov',
    name: 'Gouvernement Mondial',
    subtitle: 'Carte classifiée',
    position: [14, -0.2, 3],
    color: '#b7c4d6',
    accent: '#ffffff',
    scale: 0.88,
    mood: 'surveillance, protocole, silence',
    filter: (c) => ['akainu', 'sengoku', 'garp', 'kizaru'].includes(c.id),
  },
]

const RELATION_STYLE = {
  parent: { color: '#d4a017', speed: 0.65, width: 1.6 },
  sibling: { color: '#60a5fa', speed: 0.75, width: 1.4 },
  crew: { color: '#34d399', speed: 0.95, width: 1.7 },
  ally: { color: '#a78bfa', speed: 0.8, width: 1.35 },
  enemy: { color: '#e05252', speed: 1.15, width: 1.9 },
  hierarchy: { color: '#94a3b8', speed: 0.55, width: 1.3 },
  rival: { color: '#f97316', speed: 1.0, width: 1.75 },
}

function hashValue(id) {
  let h = 2166136261
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619)
  return Math.abs(h >>> 0) / 4294967295
}

function findZoneForChar(char) {
  return ZONES.find((zone) => zone.filter(char)) || ZONES[0]
}

const ZONE_BY_CHAR_ID = new Map(CHARACTERS.map((char) => [char.id, findZoneForChar(char)]))
const ORBIT_META = new Map(CHARACTERS.map((char) => {
  const zone = ZONE_BY_CHAR_ID.get(char.id)
  const seed = hashValue(char.id)
  return [char.id, {
    zone,
    seed,
    baseX: zone.position[0],
    baseY: zone.position[1],
    baseZ: zone.position[2],
    radius: char.id === 'luffy' ? 2.15 : 1.65 + seed * 1.65,
    speed: char.id === 'luffy' ? 0.22 : 0.12 + seed * 0.18,
    angleOffset: seed * Math.PI * 2,
    ySpeed: 0.42 + seed * 0.3,
    yOffset: seed * 6,
  }]
}))

function orbitPositionTo(target, char, time = 0) {
  const meta = ORBIT_META.get(char.id)
  if (!meta) return target.set(0, 0, 0)
  const angle = meta.angleOffset + time * meta.speed
  target.set(
    meta.baseX + Math.cos(angle) * meta.radius,
    meta.baseY + 1.25 + Math.sin(time * meta.ySpeed + meta.yOffset) * 0.34,
    meta.baseZ + Math.sin(angle) * meta.radius * 0.72,
  )
  return target
}

function zoneForChar(char) {
  return ZONE_BY_CHAR_ID.get(char.id) || ZONES[0]
}

function zoneCharacters(zone) {
  return CHARACTERS.filter(zone.filter).slice(0, zone.id === 'mugiwara' ? 10 : 6)
}

function AtmosphereParticles() {
  const points = useRef()
  const { positions, colors } = useMemo(() => {
    const count = 700
    const pos = new Float32Array(count * 3)
    const col = new Float32Array(count * 3)
    const palette = ['#ffd27a', '#e0524a', '#86f7ff', '#37b26c', '#ffffff']

    for (let i = 0; i < count; i++) {
      const r = 9 + Math.random() * 22
      const a = Math.random() * Math.PI * 2
      pos[i * 3] = Math.cos(a) * r
      pos[i * 3 + 1] = -1 + Math.random() * 8
      pos[i * 3 + 2] = Math.sin(a) * r
      const c = new THREE.Color(palette[Math.floor(Math.random() * palette.length)])
      col[i * 3] = c.r
      col[i * 3 + 1] = c.g
      col[i * 3 + 2] = c.b
    }

    return { positions: pos, colors: col }
  }, [])

  useFrame(({ clock }) => {
    if (!points.current) return
    points.current.rotation.y = clock.elapsedTime * 0.012
    points.current.rotation.x = Math.sin(clock.elapsedTime * 0.08) * 0.025
  })

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={positions.length / 3} array={positions} itemSize={3} />
        <bufferAttribute attach="attributes-color" count={colors.length / 3} array={colors} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={0.035} vertexColors transparent opacity={0.58} depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  )
}

function HolographicOcean() {
  const grid = useRef()
  const ringA = useRef()
  const ringB = useRef()

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    if (grid.current) {
      grid.current.rotation.y = t * 0.018
      grid.current.material.opacity = 0.1 + Math.sin(t * 0.35) * 0.025
    }
    if (ringA.current) ringA.current.rotation.z = t * 0.08
    if (ringB.current) ringB.current.rotation.z = -t * 0.05
  })

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.55, 0]}>
        <circleGeometry args={[34, 128]} />
        <meshBasicMaterial color="#071018" transparent opacity={0.48} depthWrite={false} />
      </mesh>
      <gridHelper ref={grid} args={[62, 62, '#4da3ff', '#1b3248']} position={[0, -1.48, 0]} />
      <mesh ref={ringA} rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.42, 0]}>
        <torusGeometry args={[13.8, 0.012, 8, 160]} />
        <meshBasicMaterial color="#d4a017" transparent opacity={0.25} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh ref={ringB} rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.38, 0]}>
        <torusGeometry args={[21, 0.01, 8, 160]} />
        <meshBasicMaterial color="#86f7ff" transparent opacity={0.16} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  )
}

function IslandCore({ zone, selected, hovered, onSelect, onHover }) {
  const group = useRef()
  const color = useMemo(() => new THREE.Color(zone.color), [zone.color])
  const accent = useMemo(() => new THREE.Color(zone.accent), [zone.accent])
  const zoneSeed = useMemo(() => hashValue(zone.id), [zone.id])

  useFrame(({ clock }) => {
    if (!group.current) return
    const t = clock.elapsedTime
    group.current.position.y = zone.position[1] + Math.sin(t * 0.5 + zoneSeed * 6) * 0.12
    group.current.rotation.y = t * 0.08 + zoneSeed * 2
  })

  return (
    <group
      ref={group}
      position={zone.position}
      onClick={(event) => { event.stopPropagation(); onSelect(zone) }}
      onPointerEnter={(event) => { event.stopPropagation(); onHover(zone.id) }}
      onPointerLeave={(event) => { event.stopPropagation(); onHover(null) }}
    >
      <pointLight color={zone.color} intensity={selected || hovered ? 2.2 : 1.2} distance={8.5} />
      <mesh position={[0, -0.25, 0]}>
        <cylinderGeometry args={[1.7 * zone.scale, 2.15 * zone.scale, 0.52, 7]} />
        <meshStandardMaterial color={color} roughness={0.52} metalness={0.18} emissive={color} emissiveIntensity={selected || hovered ? 0.42 : 0.16} />
      </mesh>
      <mesh position={[0, 0.12, 0]}>
        <icosahedronGeometry args={[1.42 * zone.scale, 2]} />
        <meshStandardMaterial color={color} roughness={0.46} metalness={0.28} emissive={color} emissiveIntensity={selected || hovered ? 0.36 : 0.1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[2.22 * zone.scale, 0.018, 8, 120]} />
        <meshBasicMaterial color={accent} transparent opacity={selected || hovered ? 0.75 : 0.36} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh scale={selected || hovered ? 1.35 : 1.05}>
        <sphereGeometry args={[2.42 * zone.scale, 24, 24]} />
        <meshBasicMaterial color={zone.color} transparent opacity={selected || hovered ? 0.13 : 0.055} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      <Html center distanceFactor={10} position={[0, 2.2 * zone.scale, 0]} className="world-map-label">
        <button className={selected ? 'world-map-label-card active' : 'world-map-label-card'}>
          <strong>{zone.name}</strong>
          <span>{zone.subtitle}</span>
        </button>
      </Html>
    </group>
  )
}

function CharacterOrb({ char, selected, hovered, dimmed, onSelect, onHover }) {
  const group = useRef()
  const aura = useRef()
  const color = char.color || zoneForChar(char).color
  const isLuffy = char.id === 'luffy'
  const seed = useMemo(() => hashValue(char.id), [char.id])

  useFrame(({ clock, camera }) => {
    if (!group.current) return
    const t = clock.elapsedTime
    orbitPositionTo(group.current.position, char, t)
    group.current.quaternion.copy(camera.quaternion)
    const s = isLuffy ? 1.45 : selected || hovered ? 1.12 : 1
    group.current.scale.setScalar(s + Math.sin(t * 1.4 + seed * 4) * 0.035)
    if (aura.current) aura.current.rotation.z = t * (isLuffy ? 0.35 : 0.22)
  })

  return (
    <group
      ref={group}
      onClick={(event) => { event.stopPropagation(); onSelect(char) }}
      onPointerEnter={(event) => { event.stopPropagation(); onHover(char.id) }}
      onPointerLeave={(event) => { event.stopPropagation(); onHover(null) }}
    >
      {(isLuffy || hovered || selected) && (
        <pointLight color={color} intensity={isLuffy ? 0.9 : 0.75} distance={3.2} />
      )}
      <mesh ref={aura}>
        <torusGeometry args={[0.54, 0.014, 8, 56]} />
        <meshBasicMaterial color={char.haki?.includes('conqueror') ? HAKI_COLORS.conqueror : color} transparent opacity={dimmed ? 0.08 : selected || hovered ? 0.86 : 0.42} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh>
        <sphereGeometry args={[isLuffy ? 0.48 : 0.34, 24, 24]} />
        <meshStandardMaterial
          color="#0d1118"
          roughness={0.24}
          metalness={0.58}
          emissive={color}
          emissiveIntensity={dimmed ? 0.04 : selected || hovered || isLuffy ? 0.78 : 0.34}
          transparent
          opacity={dimmed ? 0.36 : 0.96}
        />
      </mesh>
      <mesh scale={isLuffy ? 1.28 : 1}>
        <sphereGeometry args={[0.62, 24, 24]} />
        <meshBasicMaterial color={color} transparent opacity={dimmed ? 0.025 : selected || hovered ? 0.18 : 0.08} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      {(isLuffy || selected || hovered) && (
        <Html center distanceFactor={9} position={[0, isLuffy ? 0.84 : 0.68, 0]} className="world-map-node-label">
          <div className={selected || hovered ? 'world-map-node-card active' : 'world-map-node-card'}>
            <strong>{char.name}</strong>
            <span>{char.alias || char.crew || char.org || 'Grand Line'}</span>
          </div>
        </Html>
      )}
    </group>
  )
}

function EnergyRelation({ relation, selectedChar, hoveredChar }) {
  const line = useRef()
  const pulse = useRef()
  const from = useMemo(() => CHARACTERS.find((char) => char.id === relation.from), [relation.from])
  const to = useMemo(() => CHARACTERS.find((char) => char.id === relation.to), [relation.to])
  const style = RELATION_STYLE[relation.type] || RELATION_STYLE.ally
  const seed = useMemo(() => hashValue(relation.id), [relation.id])
  const scratch = useMemo(() => ({
    a: new THREE.Vector3(),
    b: new THREE.Vector3(),
    mid: new THREE.Vector3(),
    point: new THREE.Vector3(),
    curve: new THREE.CatmullRomCurve3([new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()]),
    points: Array.from({ length: 34 }, () => new THREE.Vector3()),
  }), [])
  const active = selectedChar && (relation.from === selectedChar.id || relation.to === selectedChar.id)
  const hover = hoveredChar && (relation.from === hoveredChar || relation.to === hoveredChar)

  useFrame(({ clock }) => {
    if (!from || !to || !line.current) return
    const t = clock.elapsedTime
    orbitPositionTo(scratch.a, from, t)
    orbitPositionTo(scratch.b, to, t)
    scratch.mid.copy(scratch.a).lerp(scratch.b, 0.5)
    scratch.mid.y += 1.2 + Math.sin(t * 0.6 + seed * 4) * 0.34
    scratch.curve.points[0].copy(scratch.a)
    scratch.curve.points[1].copy(scratch.mid)
    scratch.curve.points[2].copy(scratch.b)
    const divisions = scratch.points.length - 1
    for (let i = 0; i < scratch.points.length; i++) {
      scratch.curve.getPoint(i / divisions, scratch.points[i])
    }
    line.current.geometry.setFromPoints(scratch.points)
    line.current.material.opacity = active || hover ? 0.76 : selectedChar || hoveredChar ? 0.07 : 0.2

    if (pulse.current) {
      scratch.curve.getPoint((t * style.speed + seed) % 1, scratch.point)
      pulse.current.position.copy(scratch.point)
      pulse.current.visible = active || hover || (!selectedChar && !hoveredChar)
      pulse.current.material.opacity = active || hover ? 0.92 : 0.34
    }
  })

  if (!from || !to) return null

  return (
    <group>
      <line ref={line}>
        <bufferGeometry />
        <lineBasicMaterial color={LINK_COLORS[relation.type] || style.color} transparent opacity={0.22} blending={THREE.AdditiveBlending} />
      </line>
      <mesh ref={pulse}>
        <sphereGeometry args={[active || hover ? 0.09 : 0.055, 12, 12]} />
        <meshBasicMaterial color={style.color} transparent opacity={0.35} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
    </group>
  )
}

function CameraDirector({ focusZone, focusChar }) {
  const { camera } = useThree()
  const target = useMemo(() => new THREE.Vector3(), [])
  const desired = useMemo(() => new THREE.Vector3(0, 8, 18), [])
  const focus = useMemo(() => new THREE.Vector3(), [])
  const zoneOffset = useMemo(() => new THREE.Vector3(4.5, 4.2, 6.5), [])
  const charOffset = useMemo(() => new THREE.Vector3(2.8, 2.5, 4), [])

  useFrame(({ clock }) => {
    desired.set(0, 8, 18)
    if (focusZone) {
      focus.set(focusZone.position[0], focusZone.position[1], focusZone.position[2])
      target.lerp(focus, 0.04)
      desired.copy(focus).add(zoneOffset)
    } else if (focusChar) {
      orbitPositionTo(focus, focusChar, clock.elapsedTime)
      target.lerp(focus, 0.045)
      desired.copy(focus).add(charOffset)
    } else {
      focus.set(0, 0.2, 0)
      target.lerp(focus, 0.025)
    }

    camera.position.lerp(desired, focusZone || focusChar ? 0.018 : 0.006)
    camera.lookAt(target)
  })

  return null
}

function WorldScene({ selectedZone, selectedChar, hoveredZone, hoveredChar, onSelectZone, onSelectChar, onHoverZone, onHoverChar }) {
  const visibleCharacters = useMemo(() => {
    const seen = new Map()
    ZONES.forEach((zone) => zoneCharacters(zone).forEach((char) => seen.set(char.id, char)))
    return Array.from(seen.values())
  }, [])

  return (
    <>
      <color attach="background" args={['#02050b']} />
      <fog attach="fog" args={['#08111a', 10, 42]} />
      <ambientLight intensity={0.16} />
      <directionalLight position={[0, 10, 6]} intensity={1.25} color="#d8ecff" />
      <pointLight position={[0, 4, 0]} intensity={1.6} color="#ffd27a" distance={16} />

      <Stars radius={72} depth={38} count={1200} factor={3.4} saturation={0.35} fade speed={0.22} />
      <HolographicOcean />
      <AtmosphereParticles />

      {ZONES.map((zone) => (
        <IslandCore
          key={zone.id}
          zone={zone}
          selected={selectedZone?.id === zone.id}
          hovered={hoveredZone === zone.id}
          onSelect={onSelectZone}
          onHover={onHoverZone}
        />
      ))}

      {RELATIONS.slice(0, 30).map((relation) => (
        <EnergyRelation
          key={relation.id}
          relation={relation}
          selectedChar={selectedChar}
          hoveredChar={hoveredChar}
        />
      ))}

      {visibleCharacters.map((char) => {
        const dimmed = Boolean(selectedZone) && zoneForChar(char).id !== selectedZone.id
        return (
          <CharacterOrb
            key={char.id}
            char={char}
            selected={selectedChar?.id === char.id}
            hovered={hoveredChar === char.id}
            dimmed={dimmed}
            onSelect={onSelectChar}
            onHover={onHoverChar}
          />
        )
      })}

      <CameraDirector focusZone={selectedZone} focusChar={selectedChar} />
      <OrbitControls
        enableDamping
        dampingFactor={0.055}
        rotateSpeed={0.42}
        zoomSpeed={0.65}
        panSpeed={0.42}
        minDistance={7}
        maxDistance={34}
        maxPolarAngle={Math.PI * 0.47}
      />
    </>
  )
}

function DetailPanel({ selectedZone, selectedChar, onClear }) {
  const title = selectedChar?.name || selectedZone?.name || 'Carte mondiale classifiée'
  const subtitle = selectedChar?.alias || selectedZone?.subtitle || 'Hologramme pirate du Gouvernement Mondial'
  const color = selectedChar?.color || selectedZone?.color || '#d4a017'
  const mood = selectedZone?.mood || selectedChar?.devilFruit || 'Exploration libre, relations vivantes, territoires en orbite.'

  return (
    <motion.aside
      className="world-map-panel"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="world-map-panel-top">
        <span>BRAMS COMMUNITY / GRAND LINE OS</span>
        <button onClick={onClear}>Réinitialiser</button>
      </div>
      <h1>{title}</h1>
      <p>{subtitle}</p>
      <div className="world-map-signal" style={{ '--signal': color }}>
        <i />
        <span>{mood}</span>
      </div>

      {selectedChar ? (
        <div className="world-map-character-card active">
          <div className="world-map-character-orb" style={{ background: selectedChar.color }}>{selectedChar.emoji}</div>
          <div>
            <strong>{selectedChar.name}</strong>
            <span>{selectedChar.bounty || 'Prime inconnue'}</span>
            <small>{selectedChar.devilFruit || 'Aucun fruit confirmé'}</small>
            <div className="world-map-haki-row">
              {selectedChar.haki.map((haki) => <i key={haki} style={{ background: HAKI_COLORS[haki] }} />)}
            </div>
          </div>
        </div>
      ) : (
        <div className="world-map-zone-grid">
          {ZONES.map((zone) => (
            <button key={zone.id} className="world-map-zone-card" style={{ '--zone': zone.color }}>
              <strong>{zone.name}</strong>
              <span>{zone.subtitle}</span>
            </button>
          ))}
        </div>
      )}

      <div className="world-map-legend">
        {Object.entries(RELATION_STYLE).map(([type, style]) => (
          <span key={type}><i style={{ background: style.color }} />{type}</span>
        ))}
      </div>
    </motion.aside>
  )
}

export default function FamilyTree3D({ onClose }) {
  const [selectedZone, setSelectedZone] = useState(null)
  const [selectedChar, setSelectedChar] = useState(null)
  const [hoveredZone, setHoveredZone] = useState(null)
  const [hoveredChar, setHoveredChar] = useState(null)

  useEffect(() => {
    document.title = 'Carte mondiale One Piece — Brams'
    document.body.style.overflow = 'hidden'
    return () => {
      document.title = 'Brams Community'
      document.body.style.overflow = ''
    }
  }, [])

  const clearFocus = () => {
    setSelectedZone(null)
    setSelectedChar(null)
  }

  return (
    <div className="world-map-shell">
      <Canvas camera={{ position: [0, 8, 19], fov: 46 }} dpr={[1, 1.4]} gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}>
        <Suspense fallback={null}>
          <WorldScene
            selectedZone={selectedZone}
            selectedChar={selectedChar}
            hoveredZone={hoveredZone}
            hoveredChar={hoveredChar}
            onSelectZone={(zone) => { setSelectedZone(zone); setSelectedChar(null) }}
            onSelectChar={(char) => { setSelectedChar(char); setSelectedZone(zoneForChar(char)) }}
            onHoverZone={setHoveredZone}
            onHoverChar={setHoveredChar}
          />
        </Suspense>
      </Canvas>

      <div className="world-map-vignette" />
      <div className="world-map-scanlines" />

      <AnimatePresence>
        <DetailPanel selectedZone={selectedZone} selectedChar={selectedChar} onClear={clearFocus} />
      </AnimatePresence>

      <div className="world-map-controls">
        <button onClick={onClose}>Retour</button>
        <span>Glisser pour orbiter · Molette pour zoomer · Cliquer pour focaliser</span>
      </div>
    </div>
  )
}
