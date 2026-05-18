import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { hashValue } from '../../lib/world-map/islandGenerator.js'

export default function IslandParticles({ island, color, quality }) {
  const points = useRef(null)
  const count = Math.max(18, Math.round((quality.particles / 42) * island.scale))

  const geometry = useMemo(() => {
    const seed = hashValue(island.id)
    const positions = new Float32Array(count * 3)
    for (let i = 0; i < count; i += 1) {
      const angle = (i / count) * Math.PI * 2 + seed * 0.01
      const radius = island.scale * (0.72 + ((seed + i * 19) % 100) / 115)
      positions[i * 3] = Math.cos(angle) * radius
      positions[i * 3 + 1] = 0.22 + ((seed + i * 11) % 100) / 150
      positions[i * 3 + 2] = Math.sin(angle) * radius
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    return geo
  }, [count, island.id, island.scale])

  useFrame(({ clock }) => {
    if (!points.current) return
    points.current.rotation.y = clock.elapsedTime * 0.035
    points.current.position.y = Math.sin(clock.elapsedTime * 0.8 + island.scale) * 0.025
  })

  return (
    <points ref={points} geometry={geometry}>
      <pointsMaterial color={color} size={0.045} transparent opacity={0.58} depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  )
}
