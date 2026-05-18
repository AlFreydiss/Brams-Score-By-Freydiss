import { Canvas } from '@react-three/fiber'
import { Stars } from '@react-three/drei'
import { Suspense, useMemo, useState } from 'react'
import * as THREE from 'three'
import { WORLD_ISLANDS, SEA_ROUTES } from '../../data/worldMap.js'
import { getQualityPreset } from '../../lib/world-map/performance.js'
import WorldCamera from './WorldCamera.jsx'
import IslandMesh from './IslandMesh.jsx'
import CharacterOrbit from './CharacterOrbit.jsx'
import SeaRoutes from './SeaRoutes.jsx'
import ClassifiedPanel from './ClassifiedPanel.jsx'
import WorldMapHUD from './WorldMapHUD.jsx'

function HolographicOcean({ quality }) {
  const gridSize = quality.islandDetail > 1.1 ? 72 : 54
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[5, -0.55, 0]}>
        <planeGeometry args={[78, 26, 1, 1]} />
        <meshBasicMaterial color="#05111b" transparent opacity={0.72} depthWrite={false} />
      </mesh>
      <gridHelper args={[gridSize, gridSize, '#2a6f8f', '#143044']} position={[5, -0.5, 0]} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[5, -0.48, 0]}>
        <ringGeometry args={[9, 31, 128]} />
        <meshBasicMaterial color="#d4a017" transparent opacity={0.035} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

function WorldStage({
  visibleIslands,
  quality,
  selectedIsland,
  hoveredIsland,
  selectedCharacter,
  onSelectIsland,
  onHoverIsland,
  onSelectCharacter,
}) {
  return (
    <>
      <color attach="background" args={['#02050a']} />
      <fog attach="fog" args={['#07111c', 10, 48]} />
      <ambientLight intensity={0.34} />
      <directionalLight position={[-8, 10, 8]} intensity={1.15} color="#fff2d0" />
      <pointLight position={[18, 8, -10]} intensity={1.2} color="#e84393" distance={34} />
      <pointLight position={[-12, 7, 8]} intensity={0.92} color="#49d6ff" distance={32} />
      <Stars radius={58} depth={36} count={quality.particles} factor={2.8} saturation={0.18} fade speed={0.22} />
      <HolographicOcean quality={quality} />
      <SeaRoutes routes={SEA_ROUTES} islands={WORLD_ISLANDS} selectedIsland={selectedIsland} visibleIslands={visibleIslands} quality={quality} />
      {visibleIslands.map((island) => (
        <group key={island.id}>
          <IslandMesh
            island={island}
            selected={selectedIsland?.id === island.id}
            hovered={hoveredIsland?.id === island.id}
            quality={quality}
            onSelect={onSelectIsland}
            onHover={onHoverIsland}
          />
          <CharacterOrbit island={island} selectedCharacter={selectedCharacter} onSelectCharacter={onSelectCharacter} />
        </group>
      ))}
      <WorldCamera selectedIsland={selectedIsland} visibleIslands={visibleIslands} />
    </>
  )
}

export default function WorldMapScene({ onClose }) {
  const [activeRegion, setActiveRegion] = useState('All')
  const [qualityMode, setQualityMode] = useState('balanced')
  const [selectedIsland, setSelectedIsland] = useState(() => WORLD_ISLANDS.find((island) => island.id === 'whole-cake'))
  const [hoveredIsland, setHoveredIsland] = useState(null)
  const [selectedCharacter, setSelectedCharacter] = useState(null)
  const quality = getQualityPreset(qualityMode)

  const visibleIslands = useMemo(() => {
    if (activeRegion === 'All') return WORLD_ISLANDS
    return WORLD_ISLANDS.filter((island) => island.region === activeRegion)
  }, [activeRegion])

  return (
    <section className="world-map-shell">
      <Canvas dpr={quality.dpr} camera={{ position: [-8, 12, 26], fov: 48 }} gl={{ antialias: true, powerPreference: 'high-performance' }}>
        <Suspense fallback={null}>
          <WorldStage
            visibleIslands={visibleIslands}
            quality={quality}
            selectedIsland={selectedIsland}
            hoveredIsland={hoveredIsland}
            selectedCharacter={selectedCharacter}
            onSelectIsland={(island) => {
              setSelectedIsland(island)
              setSelectedCharacter(null)
            }}
            onHoverIsland={setHoveredIsland}
            onSelectCharacter={(character, island) => {
              setSelectedIsland(island)
              setSelectedCharacter(character)
            }}
          />
        </Suspense>
      </Canvas>
      <div className="world-map-vignette" />
      <div className="world-map-scanlines" />
      <ClassifiedPanel selectedIsland={selectedIsland} selectedCharacter={selectedCharacter} onClose={onClose} />
      <WorldMapHUD
        activeRegion={activeRegion}
        onChangeRegion={(region) => {
          setActiveRegion(region)
          setSelectedCharacter(null)
          if (region !== 'All') setSelectedIsland(WORLD_ISLANDS.find((island) => island.region === region) || null)
        }}
        qualityMode={qualityMode}
        onChangeQuality={setQualityMode}
        selectedIsland={selectedIsland}
        islandCount={visibleIslands.length}
      />
    </section>
  )
}
