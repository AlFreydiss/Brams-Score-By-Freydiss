import { Html } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import IslandAtmosphere from './IslandAtmosphere.jsx'
import IslandParticles from './IslandParticles.jsx'
import { islandMaterial } from '../../lib/world-map/materialFactory.js'
import { islandPosition, islandRadius, islandStyle } from '../../lib/world-map/islandGenerator.js'

function Landmark({ type, color, accent, scale }) {
  if (type.includes('tower') || type.includes('fortress') || type.includes('marine')) {
    return (
      <group>
        <mesh position={[0, scale * 0.48, 0]}>
          <cylinderGeometry args={[scale * 0.22, scale * 0.28, scale * 0.92, 8]} />
          <meshStandardMaterial color={accent} emissive={color} emissiveIntensity={0.14} roughness={0.48} />
        </mesh>
        <mesh position={[0, scale * 0.98, 0]}>
          <boxGeometry args={[scale * 0.7, scale * 0.14, scale * 0.24]} />
          <meshStandardMaterial color={accent} emissive={color} emissiveIntensity={0.2} />
        </mesh>
      </group>
    )
  }

  if (type.includes('volcano') || type.includes('mountain') || type.includes('drum')) {
    return (
      <mesh position={[0, scale * 0.42, 0]}>
        <coneGeometry args={[scale * 0.42, scale * 1.08, 7]} />
        <meshStandardMaterial color={color} emissive={accent} emissiveIntensity={0.18} roughness={0.78} />
      </mesh>
    )
  }

  if (type.includes('dome') || type.includes('bubble')) {
    return (
      <mesh position={[0, scale * 0.42, 0]}>
        <sphereGeometry args={[scale * 0.52, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshPhysicalMaterial color={accent} emissive={color} emissiveIntensity={0.22} transparent opacity={0.72} roughness={0.18} metalness={0.12} />
      </mesh>
    )
  }

  if (type.includes('tree') || type.includes('forest') || type.includes('woods')) {
    return (
      <group>
        {[0, 1, 2].map((i) => (
          <mesh key={i} position={[(i - 1) * scale * 0.23, scale * 0.48, Math.sin(i) * scale * 0.2]}>
            <coneGeometry args={[scale * 0.18, scale * 0.72, 6]} />
            <meshStandardMaterial color={color} emissive={accent} emissiveIntensity={0.12} />
          </mesh>
        ))}
      </group>
    )
  }

  return (
    <mesh position={[0, scale * 0.34, 0]}>
      <boxGeometry args={[scale * 0.42, scale * 0.48, scale * 0.42]} />
      <meshStandardMaterial color={accent} emissive={color} emissiveIntensity={0.12} roughness={0.64} />
    </mesh>
  )
}

function WholeCakeSignature({ scale }) {
  const colors = ['#f7b0d8', '#e84393', '#d5a6ff', '#ffe3a3']
  return (
    <group>
      {[0, 1, 2].map((layer) => (
        <mesh key={layer} position={[0, scale * (0.15 + layer * 0.24), 0]}>
          <cylinderGeometry args={[scale * (0.98 - layer * 0.18), scale * (1.08 - layer * 0.16), scale * 0.22, 36]} />
          <meshStandardMaterial color={colors[layer]} emissive="#4a1231" emissiveIntensity={0.28} roughness={0.36} metalness={0.06} />
        </mesh>
      ))}
      <mesh position={[0, scale * 0.98, 0]}>
        <cylinderGeometry args={[scale * 0.19, scale * 0.28, scale * 0.84, 9]} />
        <meshStandardMaterial color="#fff2fb" emissive="#e84393" emissiveIntensity={0.36} roughness={0.28} />
      </mesh>
      <mesh position={[0, scale * 1.45, 0]}>
        <coneGeometry args={[scale * 0.34, scale * 0.62, 9]} />
        <meshStandardMaterial color="#ff75bd" emissive="#d5a6ff" emissiveIntensity={0.38} roughness={0.3} />
      </mesh>
      {[-0.7, -0.3, 0.35, 0.78].map((x, i) => (
        <mesh key={x} position={[x * scale, scale * 0.28, (i % 2 ? -0.82 : 0.82) * scale]} rotation={[0, i, 0]}>
          <boxGeometry args={[scale * 0.16, scale * 0.18, scale * 0.18]} />
          <meshStandardMaterial color={i % 2 ? '#ffd1e8' : '#f8c45f'} emissive="#e84393" emissiveIntensity={0.22} roughness={0.24} />
        </mesh>
      ))}
      <mesh position={[-scale * 0.68, scale * 0.08, scale * 0.1]} rotation={[-Math.PI / 2, 0, 0.35]}>
        <torusGeometry args={[scale * 0.32, scale * 0.018, 8, 50]} />
        <meshBasicMaterial color="#ff9bd4" transparent opacity={0.65} />
      </mesh>
      <mesh position={[scale * 0.55, scale * 0.1, -scale * 0.28]} rotation={[-Math.PI / 2, 0, -0.4]}>
        <torusGeometry args={[scale * 0.22, scale * 0.015, 8, 40]} />
        <meshBasicMaterial color="#f8c45f" transparent opacity={0.58} />
      </mesh>
    </group>
  )
}

function IslandBody({ island, selected, hovered, quality }) {
  const style = islandStyle(island)
  const radius = islandRadius(island, quality)
  const material = islandMaterial({
    color: island.colorPalette?.primary || style.color,
    emissive: style.emissive,
    selected,
    hovered,
  })

  if (island.id === 'whole-cake') {
    return <WholeCakeSignature scale={radius} />
  }

  if (style.geometry === 'fortress' || style.geometry === 'tower') {
    return (
      <group>
        <mesh>
          <cylinderGeometry args={[radius * 0.8, radius, radius * 0.28, 8]} />
          <meshStandardMaterial {...material} />
        </mesh>
        <Landmark type="fortress" color={style.color} accent={style.accent} scale={radius} />
      </group>
    )
  }

  if (style.geometry === 'cloud' || style.geometry === 'bubble') {
    return (
      <group>
        <mesh>
          <sphereGeometry args={[radius, 32, 16]} />
          <meshPhysicalMaterial {...material} transparent opacity={0.78} />
        </mesh>
        <Landmark type={style.geometry} color={style.color} accent={style.accent} scale={radius} />
      </group>
    )
  }

  return (
    <group>
      <mesh scale={[1.18, 0.32, 0.88]}>
        <sphereGeometry args={[radius, 32, 16]} />
        <meshStandardMaterial {...material} />
      </mesh>
      {(island.landmarks || []).slice(0, 2).map((landmark, index) => (
        <group key={landmark} position={[(index - 0.5) * radius * 0.52, 0.12, (index % 2 ? -0.2 : 0.22) * radius]}>
          <Landmark type={landmark} color={style.color} accent={style.accent} scale={radius * 0.72} />
        </group>
      ))}
    </group>
  )
}

export default function IslandMesh({ island, selected, hovered, quality, onSelect, onHover }) {
  const group = useRef(null)
  const style = islandStyle(island)
  const position = useMemo(() => islandPosition(island), [island])

  useFrame(({ clock }) => {
    if (!group.current) return
    group.current.rotation.y = Math.sin(clock.elapsedTime * 0.08 + island.scale) * 0.045
    group.current.position.y = position.y + Math.sin(clock.elapsedTime * 0.45 + island.scale) * 0.035
  })

  return (
    <group
      ref={group}
      position={position}
      onClick={(event) => {
        event.stopPropagation()
        onSelect(island)
      }}
      onPointerEnter={(event) => {
        event.stopPropagation()
        onHover(island)
      }}
      onPointerLeave={() => onHover(null)}
    >
      <IslandAtmosphere island={island} color={style.accent} selected={selected} hovered={hovered} />
      <IslandBody island={island} selected={selected} hovered={hovered} quality={quality} />
      <IslandParticles island={island} color={style.accent} quality={quality} />
      <Html className="world-map-label" center distanceFactor={10} position={[0, island.scale * 1.55, 0]}>
        <div className={`world-map-label-card ${selected ? 'active' : ''}`}>
          <strong>{island.name}</strong>
          <span>{island.region} / danger {island.dangerLevel}</span>
        </div>
      </Html>
    </group>
  )
}
