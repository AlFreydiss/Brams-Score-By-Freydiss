import { Suspense, useMemo, useRef, useState, useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Text, Stars, Sparkles, Line } from '@react-three/drei'
import * as THREE from 'three'
import { CHARACTERS, RELATIONS, LINK_COLORS, HAKI_COLORS } from '../data/tree-data.js'

const ZONES = [
  { id: 'mugiwara', label: 'Mugiwara', subtitle: 'Point de rupture du monde', color: '#e0524a', accent: '#ffd166', position: [0, 0, 0], radius: 2.9, filter: c => c.crew === 'straw_hats' || c.id === 'luffy', mood: 'flame' },
  { id: 'wano', label: 'Wano', subtitle: 'Brume samourai', color: '#ff6b35', accent: '#ffcf99', position: [-8.8, -0.4, -3.2], radius: 2.25, filter: c => ['kaido', 'yamato', 'oden', 'zoro'].includes(c.id), mood: 'sakura' },
  { id: 'marineford', label: 'Marineford', subtitle: 'Justice absolue', color: '#8ecaff', accent: '#ffffff', position: [8.7, -0.2, -2.8], radius: 2.35, filter: c => c.org === 'marines' || ['garp', 'akainu', 'aokiji', 'kizaru'].includes(c.id), mood: 'marine' },
  { id: 'wholecake', label: 'Whole Cake', subtitle: 'Empire sucre malsain', color: '#f472b6', accent: '#c084fc', position: [-7.4, 0.2, 5.5], radius: 2.05, filter: c => c.crew === 'big_mom_pirates' || c.family === 'charlotte', mood: 'candy' },
  { id: 'egghead', label: 'Egghead', subtitle: 'Laboratoire interdit', color: '#60f6ff', accent: '#a78bfa', position: [7.1, 0.25, 5.8], radius: 2.0, filter: c => ['vegapunk', 'kizaru', 'sentomaru', 'franky', 'robin'].includes(c.id), mood: 'tech' },
  { id: 'revolution', label: 'Revolutionnaires', subtitle: 'Signal clandestin', color: '#34d399', accent: '#a7f3d0', position: [-1.6, 0.6, 9.4], radius: 2.05, filter: c => c.org === 'revolutionary' || ['dragon', 'sabo'].includes(c.id), mood: 'rebel' },
  { id: 'yonko', label: 'Yonko', subtitle: 'Gravites imperiales', color: '#d4a017', accent: '#ff7455', position: [0.8, 0.3, -9.2], radius: 2.45, filter: c => ['shanks', 'blackbeard', 'bigmom', 'kaido', 'whitebeard', 'roger'].includes(c.id), mood: 'royal' },
  { id: 'government', label: 'Gouvernement', subtitle: 'Carte secrete', color: '#d9e4ff', accent: '#7dd3fc', position: [11.6, 0.7, 2.2], radius: 1.9, filter: c => c.org === 'world_government' || ['imu', 'gorosei', 'cp0'].includes(c.id), mood: 'cipher' },
  { id: 'dressrosa', label: 'Dressrosa', subtitle: 'Theatre royal brise', color: '#a78bfa', accent: '#f0abfc', position: [-11.5, 0.4, 1.8], radius: 1.85, filter: c => ['doflamingo', 'law', 'sabo', 'luffy'].includes(c.id), mood: 'royal' },
  { id: 'impeldown', label: 'Impel Down', subtitle: 'Abysses de la Marine', color: '#818cf8', accent: '#ef4444', position: [3.6, -0.8, -13.6], radius: 1.8, filter: c => ['crocodile', 'buggy', 'jinbe', 'blackbeard'].includes(c.id), mood: 'prison' },
  { id: 'elbaf', label: 'Elbaf', subtitle: 'Royaume des geants', color: '#fbbf24', accent: '#86efac', position: [-4.5, 0.3, -13.2], radius: 1.95, filter: c => ['saul', 'usopp', 'shanks'].includes(c.id), mood: 'ancient' },
]

const FALLBACK_IDS = ['luffy', 'zoro', 'sanji', 'nami', 'robin', 'jinbe', 'law', 'ace', 'sabo', 'dragon', 'garp', 'roger', 'shanks', 'blackbeard', 'bigmom', 'kaido']

function zoneMembers(zone) {
  const members = CHARACTERS.filter(zone.filter)
  if (members.length) return members.slice(0, zone.id === 'mugiwara' ? 11 : 7)
  return CHARACTERS.filter(c => FALLBACK_IDS.includes(c.id)).slice(0, 4)
}

function SeaFloor() {
  const mat = useRef()
  useFrame(({ clock }) => {
    if (mat.current) mat.current.uniforms.uTime.value = clock.elapsedTime
  })

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.85, 0]}>
      <planeGeometry args={[90, 90, 160, 160]} />
      <shaderMaterial
        ref={mat}
        transparent
        depthWrite={false}
        uniforms={{ uTime: { value: 0 } }}
        vertexShader={`
          uniform float uTime;
          varying vec2 vUv;
          varying float vWave;
          void main() {
            vUv = uv;
            vec3 p = position;
            float w = sin(p.x * .22 + uTime * .42) + sin(p.y * .28 + uTime * .35);
            p.z += w * .22;
            vWave = w;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
          }
        `}
        fragmentShader={`
          varying vec2 vUv;
          varying float vWave;
          void main() {
            float grid = smoothstep(.018, .0, abs(fract(vUv.x * 18.0) - .5)) + smoothstep(.018, .0, abs(fract(vUv.y * 18.0) - .5));
            vec3 ocean = mix(vec3(.005,.025,.045), vec3(.035,.11,.14), vUv.y + vWave * .04);
            vec3 mapInk = vec3(.82,.52,.25) * grid * .08;
            gl_FragColor = vec4(ocean + mapInk, .72);
          }
        `}
      />
    </mesh>
  )
}

function Island({ zone, active, onHover }) {
  const group = useRef()
  const color = new THREE.Color(zone.color)
  const accent = new THREE.Color(zone.accent)

  useFrame(({ clock }) => {
    if (!group.current) return
    const t = clock.elapsedTime
    group.current.position.y = zone.position[1] + Math.sin(t * 0.42 + zone.position[0]) * 0.12
    group.current.rotation.y += 0.0018
  })

  return (
    <group ref={group} position={zone.position} onPointerEnter={(e) => { e.stopPropagation(); onHover(zone) }} onPointerLeave={(e) => { e.stopPropagation(); onHover(null) }}>
      <mesh position={[0, -0.42, 0]} scale={[zone.radius * 1.25, 0.48, zone.radius * 1.25]}>
        <cylinderGeometry args={[1, 1.2, 1.2, 7]} />
        <meshStandardMaterial color={color.clone().multiplyScalar(0.42)} roughness={0.74} metalness={0.08} emissive={color} emissiveIntensity={active ? 0.18 : 0.07} />
      </mesh>
      <mesh position={[0, 0.18, 0]} scale={[zone.radius, 0.55, zone.radius]}>
        <dodecahedronGeometry args={[1, 1]} />
        <meshStandardMaterial color={color.clone().lerp(new THREE.Color('#0b0d14'), 0.35)} roughness={0.58} metalness={0.16} emissive={color} emissiveIntensity={active ? 0.34 : 0.13} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} scale={[zone.radius * 1.18, zone.radius * 1.18, 1]}>
        <ringGeometry args={[0.92, 1, 128]} />
        <meshBasicMaterial color={accent} transparent opacity={active ? 0.54 : 0.24} />
      </mesh>
      <Sparkles count={active ? 52 : 26} scale={zone.radius * 2.2} size={active ? 3.2 : 2.1} speed={0.18} color={zone.accent} opacity={active ? 0.85 : 0.45} />
      <Text position={[0, 1.62, 0]} fontSize={0.34} anchorX="center" anchorY="middle" color="#fff" outlineWidth={0.018} outlineColor="#05070d">
        {zone.label}
      </Text>
      <Text position={[0, 1.24, 0]} fontSize={0.12} anchorX="center" anchorY="middle" color={zone.accent}>
        {zone.subtitle.toUpperCase()}
      </Text>
    </group>
  )
}

function CharacterNode({ character, zone, index, total, selected, hovered, onHover, onSelect }) {
  const ref = useRef()
  const aura = useRef()
  const orbitRadius = zone.radius + 0.9 + (index % 3) * 0.34
  const color = character.id === 'luffy' ? '#ffdf7e' : character.color || zone.accent

  useFrame(({ clock }) => {
    if (!ref.current) return
    const t = clock.elapsedTime
    const base = (index / Math.max(total, 1)) * Math.PI * 2
    const speed = character.id === 'luffy' ? 0.1 : 0.055 + (index % 4) * 0.01
    const angle = base + t * speed
    const y = zone.position[1] + 1.0 + Math.sin(t * 0.9 + index) * 0.18
    ref.current.position.set(
      zone.position[0] + Math.cos(angle) * orbitRadius,
      y,
      zone.position[2] + Math.sin(angle) * orbitRadius
    )
    ref.current.rotation.y += 0.018
    const scale = character.id === 'luffy' ? 1.55 : selected || hovered ? 1.22 : 1
    ref.current.scale.lerp(new THREE.Vector3(scale, scale, scale), 0.09)
    if (aura.current) aura.current.rotation.z -= 0.01
  })

  return (
    <group
      ref={ref}
      onPointerEnter={(e) => { e.stopPropagation(); onHover(character) }}
      onPointerLeave={(e) => { e.stopPropagation(); onHover(null) }}
      onClick={(e) => { e.stopPropagation(); onSelect(character) }}
    >
      <mesh ref={aura} scale={[1.45, 1.45, 1.45]}>
        <torusGeometry args={[0.42, 0.012, 8, 64]} />
        <meshBasicMaterial color={color} transparent opacity={selected || hovered ? 0.72 : 0.28} />
      </mesh>
      <mesh>
        <sphereGeometry args={[character.id === 'luffy' ? 0.46 : 0.28, 32, 32]} />
        <meshStandardMaterial color="#101521" emissive={color} emissiveIntensity={character.id === 'luffy' ? 0.8 : selected || hovered ? 0.52 : 0.26} roughness={0.18} metalness={0.48} />
      </mesh>
      <mesh scale={[0.78, 0.78, 0.78]}>
        <sphereGeometry args={[character.id === 'luffy' ? 0.42 : 0.24, 32, 32]} />
        <meshBasicMaterial color={color} transparent opacity={0.18} />
      </mesh>
      {(selected || hovered || character.id === 'luffy') && (
        <Text position={[0, character.id === 'luffy' ? 0.82 : 0.56, 0]} fontSize={0.12} anchorX="center" color="#fff" outlineWidth={0.01} outlineColor="#03050a">
          {character.name}
        </Text>
      )}
    </group>
  )
}

function EnergyLink({ from, to, type, active }) {
  const pulse = useRef()
  const curve = useMemo(() => {
    const a = new THREE.Vector3(...from)
    const b = new THREE.Vector3(...to)
    const mid = a.clone().lerp(b, 0.5)
    mid.y += 2.2 + a.distanceTo(b) * 0.05
    return new THREE.CatmullRomCurve3([a, mid, b])
  }, [from, to])
  const points = useMemo(() => curve.getPoints(42), [curve])
  const color = LINK_COLORS[type] || '#ffffff'

  useFrame(({ clock }) => {
    if (!pulse.current) return
    const p = (clock.elapsedTime * (type === 'enemy' ? 0.28 : 0.18) + from[0] * 0.02) % 1
    pulse.current.position.copy(curve.getPointAt(p))
  })

  return (
    <group>
      <Line points={points} color={color} transparent opacity={active ? 0.78 : 0.22} lineWidth={active ? 2.2 : 1.1} />
      <mesh ref={pulse}>
        <sphereGeometry args={[active ? 0.09 : 0.055, 12, 12]} />
        <meshBasicMaterial color={color} transparent opacity={active ? 0.88 : 0.34} />
      </mesh>
    </group>
  )
}

function WorldScene({ selected, hovered, setHovered, setSelected, activeZone, setActiveZone }) {
  const zoneData = useMemo(() => ZONES.map(zone => ({ ...zone, members: zoneMembers(zone) })), [])
  const nodePositions = useMemo(() => {
    const map = new Map()
    zoneData.forEach(zone => {
      zone.members.forEach((character, index) => {
        const angle = (index / Math.max(zone.members.length, 1)) * Math.PI * 2
        const radius = zone.radius + 1.25
        map.set(character.id, [
          zone.position[0] + Math.cos(angle) * radius,
          zone.position[1] + 1.05,
          zone.position[2] + Math.sin(angle) * radius,
        ])
      })
    })
    map.set('luffy', [0, 1.25, 0])
    return map
  }, [zoneData])

  const relations = useMemo(() => RELATIONS
    .filter(rel => nodePositions.has(rel.from) && nodePositions.has(rel.to))
    .slice(0, 42), [nodePositions])

  return (
    <>
      <color attach="background" args={['#03050a']} />
      <fog attach="fog" args={['#03050a', 12, 46]} />
      <ambientLight intensity={0.36} />
      <directionalLight position={[8, 14, 10]} intensity={1.3} color="#ffd2a0" />
      <pointLight position={[0, 6, 0]} intensity={2.3} color="#e0524a" distance={16} />
      <pointLight position={[9, 5, 6]} intensity={1.5} color="#69e8ff" distance={18} />
      <Stars radius={80} depth={34} count={1800} factor={4} saturation={0.4} fade speed={0.28} />
      <Sparkles count={240} scale={[42, 16, 42]} size={1.5} speed={0.12} color="#ffb05f" opacity={0.34} />
      <SeaFloor />

      {zoneData.map(zone => (
        <Island key={zone.id} zone={zone} active={activeZone?.id === zone.id} onHover={setActiveZone} />
      ))}

      {relations.map(rel => (
        <EnergyLink
          key={rel.id}
          from={nodePositions.get(rel.from)}
          to={nodePositions.get(rel.to)}
          type={rel.type}
          active={selected?.id === rel.from || selected?.id === rel.to || hovered?.id === rel.from || hovered?.id === rel.to}
        />
      ))}

      {zoneData.map(zone => zone.members.map((character, index) => (
        <CharacterNode
          key={`${zone.id}-${character.id}`}
          character={character}
          zone={zone}
          index={index}
          total={zone.members.length}
          selected={selected?.id === character.id}
          hovered={hovered?.id === character.id}
          onHover={setHovered}
          onSelect={setSelected}
        />
      )))}

      <OrbitControls enableDamping dampingFactor={0.045} rotateSpeed={0.48} zoomSpeed={0.62} panSpeed={0.45} minDistance={8} maxDistance={36} maxPolarAngle={Math.PI / 2.05} />
    </>
  )
}

function DetailPanel({ selected, hovered, activeZone, onClose }) {
  const character = selected || hovered
  return (
    <aside className="world-map-panel">
      <div className="world-map-panel-top">
        <span>Gouvernement Mondial</span>
        <button onClick={onClose}>Fermer</button>
      </div>
      <h1>Carte secrete du monde</h1>
      <p>Territoires vivants, liens d'energie, factions et gravites relationnelles de Grand Line.</p>
      {activeZone && (
        <div className="world-map-zone-card">
          <strong>{activeZone.label}</strong>
          <span>{activeZone.subtitle}</span>
        </div>
      )}
      {character && (
        <div className="world-map-character-card">
          <div className="world-map-character-orb" style={{ background: character.color }} />
          <div>
            <strong>{character.name}</strong>
            <span>{character.alias || 'Figure cle'}</span>
            <small>{character.bounty || 'Prime inconnue'} · {character.status === 'alive' ? 'Vivant' : 'Legende'}</small>
            <div className="world-map-haki-row">
              {character.haki?.map(haki => <i key={haki} style={{ background: HAKI_COLORS[haki] }} title={haki} />)}
            </div>
          </div>
        </div>
      )}
      <div className="world-map-legend">
        {Object.entries(LINK_COLORS).map(([type, color]) => <span key={type}><i style={{ background: color }} />{type}</span>)}
      </div>
    </aside>
  )
}

export default function FamilyTree3D({ onClose }) {
  const [selected, setSelected] = useState(null)
  const [hovered, setHovered] = useState(null)
  const [activeZone, setActiveZone] = useState(null)

  useEffect(() => {
    document.title = 'Carte Monde 3D - Brams'
    document.body.style.overflow = 'hidden'
    return () => {
      document.title = 'Brams Community'
      document.body.style.overflow = ''
      document.body.style.cursor = 'default'
    }
  }, [])

  return (
    <div className="world-map-shell">
      <Canvas camera={{ position: [0, 12, 22], fov: 52 }} gl={{ antialias: true, powerPreference: 'high-performance' }} dpr={[1, 1.75]} onPointerMissed={() => setSelected(null)}>
        <Suspense fallback={null}>
          <WorldScene
            selected={selected}
            hovered={hovered}
            setHovered={setHovered}
            setSelected={setSelected}
            activeZone={activeZone}
            setActiveZone={setActiveZone}
          />
        </Suspense>
      </Canvas>
      <div className="world-map-vignette" />
      <DetailPanel selected={selected} hovered={hovered} activeZone={activeZone} onClose={onClose} />
      <div className="world-map-controls">Glisser pour orbiter · Molette pour zoomer · Clic sur un node pour verrouiller</div>
    </div>
  )
}
