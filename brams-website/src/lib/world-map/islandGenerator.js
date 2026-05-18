import * as THREE from 'three'
import { BIOME_PRESETS } from '../../data/worldMap.js'

export function hashValue(input) {
  const text = String(input)
  let hash = 0
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash << 5) - hash + text.charCodeAt(index)
    hash |= 0
  }
  return Math.abs(hash)
}

export function islandPosition(island) {
  const { x, y, z } = island.coordinates
  return new THREE.Vector3(x, y, z)
}

export function islandStyle(island) {
  return BIOME_PRESETS[island.biome] || BIOME_PRESETS.unknown
}

export function islandRadius(island, quality = { islandDetail: 1 }) {
  return Math.max(0.42, island.scale * (quality?.islandDetail || 1))
}

export function characterOrbitPosition(island, characterId, index, elapsed = 0) {
  const seed = hashValue(`${island.id}-${characterId}`)
  const base = islandPosition(island)
  const radius = island.scale * (1.25 + (seed % 7) * 0.09)
  const speed = 0.09 + (seed % 5) * 0.012
  const angle = elapsed * speed + index * 1.47 + seed * 0.003
  const height = 0.75 + ((seed % 9) - 4) * 0.045
  return base.add(new THREE.Vector3(Math.cos(angle) * radius, height, Math.sin(angle) * radius))
}

export function regionCenter(islands) {
  if (!islands.length) return new THREE.Vector3(0, 0, 0)
  const center = islands.reduce((acc, island) => acc.add(islandPosition(island)), new THREE.Vector3())
  return center.multiplyScalar(1 / islands.length)
}
