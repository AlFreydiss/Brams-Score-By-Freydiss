import { Html } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { CHARACTERS } from '../../data/tree-data.js'
import { characterOrbitPosition } from '../../lib/world-map/islandGenerator.js'

const CHARACTER_BY_ID = new Map(CHARACTERS.map((character) => [character.id, character]))

export default function CharacterOrbit({ island, selectedCharacter, onSelectCharacter }) {
  const refs = useRef([])
  const characters = useMemo(
    () => (island.characters || []).map((id) => CHARACTER_BY_ID.get(id)).filter(Boolean),
    [island.characters],
  )

  useFrame(({ clock }) => {
    characters.forEach((character, index) => {
      const mesh = refs.current[index]
      if (!mesh) return
      const next = characterOrbitPosition(island, character.id, index, clock.elapsedTime)
      mesh.position.lerp(next, 0.12)
      mesh.rotation.y += 0.01
    })
  })

  return (
    <>
      {characters.map((character, index) => {
        const active = selectedCharacter?.id === character.id
        return (
          <group
            key={`${island.id}-${character.id}`}
            ref={(node) => {
              refs.current[index] = node
            }}
            onClick={(event) => {
              event.stopPropagation()
              onSelectCharacter(character, island)
            }}
          >
            <mesh>
              <sphereGeometry args={[character.id === 'luffy' ? 0.22 : 0.15, 24, 16]} />
              <meshStandardMaterial
                color={character.color || '#f6b34b'}
                emissive={character.color || '#f6b34b'}
                emissiveIntensity={active ? 0.82 : 0.42}
                roughness={0.26}
                metalness={0.18}
              />
            </mesh>
            <mesh>
              <torusGeometry args={[character.id === 'luffy' ? 0.32 : 0.23, 0.01, 8, 42]} />
              <meshBasicMaterial color={character.color || '#f6b34b'} transparent opacity={active ? 0.9 : 0.48} blending={THREE.AdditiveBlending} />
            </mesh>
            <Html className="world-map-node-label" center distanceFactor={8} position={[0, 0.36, 0]}>
              <div className={`world-map-node-card ${active ? 'active' : ''}`}>
                <strong>{character.name}</strong>
                <span>{character.alias || character.crew || character.org || 'Dossier'}</span>
              </div>
            </Html>
          </group>
        )
      })}
    </>
  )
}
