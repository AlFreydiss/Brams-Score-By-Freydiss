import * as THREE from 'three'

export function islandMaterial({ color, emissive, selected = false, hovered = false }) {
  return {
    color: new THREE.Color(color),
    emissive: new THREE.Color(emissive || color),
    emissiveIntensity: selected ? 0.52 : hovered ? 0.34 : 0.18,
    roughness: 0.62,
    metalness: 0.12,
  }
}

export function auraMaterial(color, opacity = 0.24) {
  return {
    color: new THREE.Color(color),
    transparent: true,
    opacity,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  }
}

export function routeMaterial(color, opacity = 0.62) {
  return new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })
}
