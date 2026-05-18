import * as THREE from 'three'
import { islandPosition } from './islandGenerator.js'

export function buildRouteSegments(routes, islands, routeSegments = 30) {
  const byId = new Map(islands.map((island) => [island.id, island]))

  return routes.flatMap((route) => {
    const validIslands = route.islands.map((id) => byId.get(id)).filter(Boolean)
    if (validIslands.length < 2) return []

    return validIslands.slice(0, -1).map((fromIsland, index) => {
      const toIsland = validIslands[index + 1]
      const from = islandPosition(fromIsland)
      const to = islandPosition(toIsland)
      const mid = from.clone().lerp(to, 0.5)
      mid.y += 0.65 + from.distanceTo(to) * 0.08
      const curve = new THREE.CatmullRomCurve3([from, mid, to])
      return {
        id: `${route.id}-${fromIsland.id}-${toIsland.id}`,
        route,
        from: fromIsland,
        to: toIsland,
        curve,
        points: curve.getPoints(routeSegments),
      }
    })
  })
}
