import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import * as THREE from 'three'
import { auraMaterial } from '../../lib/world-map/materialFactory.js'

export default function IslandAtmosphere({ island, color, selected, hovered }) {
  const aura = useRef(null)
  const ring = useRef(null)
  const intensity = selected ? 1.8 : hovered ? 1.25 : 0.7

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    if (aura.current) {
      const pulse = 1 + Math.sin(t * 1.25 + island.scale) * 0.035
      aura.current.scale.setScalar((1.72 + island.scale * 0.2) * pulse)
    }
    if (ring.current) {
      ring.current.rotation.z += 0.0018
      ring.current.material.opacity = 0.18 + Math.sin(t * 1.4) * 0.04
    }
  })

  return (
    <group>
      <pointLight color={color} intensity={intensity} distance={7 + island.scale * 3} />
      <mesh ref={aura}>
        <sphereGeometry args={[island.scale, 32, 16]} />
        <meshBasicMaterial {...auraMaterial(color, selected || hovered ? 0.18 : 0.09)} />
      </mesh>
      <mesh ref={ring} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[island.scale * 1.22, 0.01, 8, 96]} />
        <meshBasicMaterial {...auraMaterial(color, 0.16)} />
      </mesh>
    </group>
  )
}
