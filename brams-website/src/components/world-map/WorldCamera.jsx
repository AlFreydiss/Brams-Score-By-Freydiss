import { useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { islandPosition, regionCenter } from '../../lib/world-map/islandGenerator.js'

export default function WorldCamera({ selectedIsland, visibleIslands }) {
  const controls = useRef(null)
  const { camera } = useThree()

  const target = useMemo(() => {
    if (selectedIsland) return islandPosition(selectedIsland)
    return regionCenter(visibleIslands)
  }, [selectedIsland, visibleIslands])

  useEffect(() => {
    camera.position.set(-8, 12, 26)
    camera.lookAt(0, 0, 0)
  }, [camera])

  useFrame((_, delta) => {
    const distance = selectedIsland ? 7.8 : 28
    const desired = target.clone().add(new THREE.Vector3(-distance * 0.36, distance * 0.34, distance))
    camera.position.lerp(desired, 1 - Math.pow(0.02, delta))
    controls.current?.target.lerp(target, 1 - Math.pow(0.025, delta))
    controls.current?.update()
  })

  return (
    <OrbitControls
      ref={controls}
      enableDamping
      dampingFactor={0.075}
      minDistance={4.2}
      maxDistance={42}
      maxPolarAngle={Math.PI * 0.48}
      minPolarAngle={Math.PI * 0.18}
    />
  )
}
