import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { ROUTE_STYLES } from '../../data/worldMap.js'
import { buildRouteSegments } from '../../lib/world-map/routeGenerator.js'
import { routeMaterial } from '../../lib/world-map/materialFactory.js'

function RouteSegment({ segment, active, quality }) {
  const pulse = useRef(null)
  const lineGeometry = useMemo(() => new THREE.BufferGeometry().setFromPoints(segment.points), [segment.points])
  const style = ROUTE_STYLES[segment.route.type] || ROUTE_STYLES.unknown
  const material = useMemo(() => routeMaterial(style.color, active ? 0.8 : 0.34), [active, style.color])

  useFrame(({ clock }) => {
    if (!pulse.current) return
    const phase = (clock.elapsedTime * style.speed + segment.id.length * 0.03) % 1
    pulse.current.position.copy(segment.curve.getPointAt(phase))
  })

  return (
    <group>
      <line geometry={lineGeometry} material={material} />
      <mesh ref={pulse}>
        <sphereGeometry args={[active ? 0.07 : 0.045, 12, 8]} />
        <meshBasicMaterial color={style.color} transparent opacity={active ? 0.9 : 0.55} blending={THREE.AdditiveBlending} />
      </mesh>
      {quality.routeSegments > 35 && (
        <line geometry={lineGeometry}>
          <lineBasicMaterial color={style.color} transparent opacity={0.12} linewidth={2} />
        </line>
      )}
    </group>
  )
}

export default function SeaRoutes({ routes, islands, selectedIsland, visibleIslands, quality }) {
  const visibleIds = useMemo(() => new Set(visibleIslands.map((island) => island.id)), [visibleIslands])
  const segments = useMemo(() => buildRouteSegments(routes, islands, quality.routeSegments), [routes, islands, quality.routeSegments])

  return (
    <>
      {segments
        .filter((segment) => visibleIds.has(segment.from.id) || visibleIds.has(segment.to.id))
        .map((segment) => {
          const active = selectedIsland && (segment.from.id === selectedIsland.id || segment.to.id === selectedIsland.id)
          return <RouteSegment key={segment.id} segment={segment} active={active} quality={quality} />
        })}
    </>
  )
}
