// src/features/nouveau-monde/scene/OceanScene.jsx
// Carte océan 3D crépusculaire (R3F). LAZY : ce module n'entre jamais dans le bundle
// initial (importé via React.lazy depuis CartePage). Cible 60fps.
//
// - Plan d'eau : shader léger maison (vagues douces de Gerstner + reflets ciel + écume).
// - Îles : positionnées depuis ISLANDS.pos. Survol → élévation + halo + label
//   (nom + prime du #1). Clic → onSelect(island) (le parent déclenche téléport+navigate).
// - Brume/fog, profondeur de champ (postprocessing), dérive caméra douce en idle.
//
// default export = <OceanScene onSelect={fn} hour={0..23} leaders={{game:bounty}} />

import { Suspense, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Float, Html } from '@react-three/drei'
import { EffectComposer, Bloom, DepthOfField, Vignette } from '@react-three/postprocessing'
import * as THREE from 'three'
import { ISLANDS } from '../data/islands'
import { nm, skyForHour } from '../theme/tokens'

// ── Eau : shader Gerstner léger ──────────────────────────────────────────────
const WATER_VERT = /* glsl */ `
  uniform float uTime;
  varying vec3 vWorld;
  varying float vWave;
  // 3 vagues directionnelles cumulées (léger, stable 60fps).
  float wave(vec2 p, vec2 dir, float freq, float speed, float amp) {
    return sin(dot(dir, p) * freq + uTime * speed) * amp;
  }
  void main() {
    vec3 pos = position;
    float w = 0.0;
    w += wave(pos.xy, normalize(vec2(1.0, 0.3)), 0.18, 0.7, 0.55);
    w += wave(pos.xy, normalize(vec2(-0.4, 1.0)), 0.27, 0.9, 0.32);
    w += wave(pos.xy, normalize(vec2(0.8, -0.6)), 0.5, 1.5, 0.12);
    pos.z += w;
    vWave = w;
    vec4 world = modelMatrix * vec4(pos, 1.0);
    vWorld = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`
const WATER_FRAG = /* glsl */ `
  precision highp float;
  uniform vec3 uDeep;
  uniform vec3 uShallow;
  uniform vec3 uSky;
  uniform vec3 uFoam;
  uniform float uTime;
  varying vec3 vWorld;
  varying float vWave;
  // Bruit cheap pour l'écume sur les crêtes.
  float hash(vec2 p){ return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5453); }
  void main() {
    float depth = clamp(0.5 + vWave * 0.5, 0.0, 1.0);
    vec3 col = mix(uDeep, uShallow, depth);
    // Reflet ciel sur les crêtes orientées vers le haut.
    float fres = smoothstep(0.35, 1.0, depth);
    col = mix(col, uSky, fres * 0.35);
    // Écume sur les crêtes hautes.
    float crest = smoothstep(0.7, 1.0, depth);
    float spark = hash(floor(vWorld.xz * 3.0) + floor(uTime * 2.0));
    col = mix(col, uFoam, crest * spark * 0.5);
    // Atténuation lointaine (fondu vers l'horizon).
    float dist = length(vWorld.xz);
    col = mix(col, uDeep, smoothstep(20.0, 46.0, dist) * 0.7);
    gl_FragColor = vec4(col, 1.0);
  }
`

function Water({ hour }) {
  const ref = useRef()
  const [top, bottom] = skyForHour(hour)
  const uniforms = useMemo(() => ({
    uTime:    { value: 0 },
    uDeep:    { value: new THREE.Color(nm.color.abyss) },
    uShallow: { value: new THREE.Color(nm.color.current) },
    uSky:     { value: new THREE.Color(top) },
    uFoam:    { value: new THREE.Color(hour >= 20 || hour < 6 ? nm.color.biolum : nm.color.foam) },
  }), [hour, top])

  // uniforms est un objet stable passé au material ; three lit material.uniforms.uTime.value
  // chaque frame → muter l'objet direct (ref.current.uTime n'existe pas sur un ShaderMaterial).
  useFrame((_, dt) => { uniforms.uTime.value += dt })

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.6, 0]} receiveShadow>
      <planeGeometry args={[120, 120, 160, 160]} />
      <shaderMaterial
        ref={ref}
        vertexShader={WATER_VERT}
        fragmentShader={WATER_FRAG}
        uniforms={uniforms}
      />
    </mesh>
  )
}

// ── Île ───────────────────────────────────────────────────────────────────────
function formatBounty(n) {
  if (!n) return null
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)} Md ฿`
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)} M ฿`
  return `${Math.round(n).toLocaleString('fr-FR')} ฿`
}

function Island({ island, leaderBounty, onSelect }) {
  const [hover, setHover] = useState(false)
  const grp = useRef()
  const live = island.status === 'live'
  const accent = useMemo(() => new THREE.Color(island.accent), [island.accent])

  useFrame((state) => {
    if (!grp.current) return
    const target = hover && live ? 0.9 : 0
    grp.current.position.y = THREE.MathUtils.lerp(grp.current.position.y, target, 0.12)
    grp.current.rotation.y += 0.0015
  })

  return (
    <group position={[island.pos[0], 0, island.pos[1]]}>
      <Float speed={1.1} rotationIntensity={0.05} floatIntensity={0.35}>
        <group
          ref={grp}
          onPointerOver={(e) => { e.stopPropagation(); setHover(true); document.body.style.cursor = live ? 'pointer' : 'default' }}
          onPointerOut={(e) => { e.stopPropagation(); setHover(false); document.body.style.cursor = 'default' }}
          onClick={(e) => { e.stopPropagation(); if (live) onSelect?.(island) }}
        >
          {/* Socle rocheux */}
          <mesh castShadow position={[0, 0.1, 0]}>
            <coneGeometry args={[1.5, 1.4, 6]} />
            <meshStandardMaterial color={live ? '#2a3b3f' : '#26303a'} roughness={0.95} metalness={0.05} flatShading />
          </mesh>
          {/* Plateau / verdure (ou pierre grise si soon) */}
          <mesh castShadow position={[0, 0.85, 0]}>
            <cylinderGeometry args={[1.05, 1.35, 0.5, 6]} />
            <meshStandardMaterial color={live ? '#3f6b4a' : '#3a4750'} roughness={0.9} flatShading />
          </mesh>
          {/* Mât / fanion accent */}
          <mesh position={[0, 1.7, 0]}>
            <cylinderGeometry args={[0.04, 0.04, 1.2, 6]} />
            <meshStandardMaterial color="#1a1208" />
          </mesh>
          <mesh position={[0.35, 2.0, 0]}>
            <planeGeometry args={[0.6, 0.34]} />
            <meshStandardMaterial color={island.accent} side={THREE.DoubleSide} emissive={island.accent} emissiveIntensity={hover ? 0.6 : 0.2} />
          </mesh>

          {/* Halo au survol */}
          {hover && live && (
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
              <ringGeometry args={[1.8, 2.6, 48]} />
              <meshBasicMaterial color={accent} transparent opacity={0.45} side={THREE.DoubleSide} />
            </mesh>
          )}
        </group>
      </Float>

      {/* Label HTML (nom + prime #1) */}
      <Html position={[0, hover && live ? 3.1 : 2.6, 0]} center distanceFactor={14} zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
        <div style={{
          transition: 'opacity .25s, transform .25s',
          opacity: hover || !live ? 1 : 0.82,
          transform: `translateY(${hover ? '-2px' : '0'}) scale(${hover ? 1.04 : 1})`,
          textAlign: 'center', whiteSpace: 'nowrap', userSelect: 'none',
        }}>
          <div style={{
            ...nm.type.islandName, color: nm.color.foam,
            textShadow: '0 2px 14px rgba(2,8,13,0.9)',
          }}>{island.title}</div>
          {!live && (
            <div style={{ ...nm.type.eyebrow, color: nm.color.foamDim, marginTop: 2 }}>Bientôt</div>
          )}
          {live && leaderBounty != null && (
            <div style={{
              marginTop: 3, display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '2px 10px', borderRadius: nm.radius.pill,
              background: 'rgba(6,20,31,0.7)', border: `1px solid ${island.accent}55`,
              backdropFilter: 'blur(6px)',
            }}>
              <span style={{ fontSize: '0.7rem', color: nm.color.goldHi, fontWeight: 700, letterSpacing: '0.04em' }}>
                #1 · {formatBounty(leaderBounty)}
              </span>
            </div>
          )}
        </div>
      </Html>
    </group>
  )
}

// ── Dérive caméra idle ────────────────────────────────────────────────────────
function CameraDrift() {
  const { camera } = useThree()
  const t0 = useRef(0)
  useFrame((state) => {
    const t = state.clock.elapsedTime
    camera.position.x = Math.sin(t * 0.06) * 3.5
    camera.position.z = 26 + Math.cos(t * 0.05) * 2.5
    camera.position.y = 16 + Math.sin(t * 0.08) * 0.8
    camera.lookAt(0, 0, 0)
  })
  return null
}

function SceneContent({ hour, leaders, onSelect }) {
  const [top] = skyForHour(hour)
  const night = hour >= 20 || hour < 6
  return (
    <>
      <fog attach="fog" args={[nm.color.abyss, 24, 52]} />
      <ambientLight intensity={night ? 0.35 : 0.6} />
      <directionalLight
        position={[10, 18, 6]} intensity={night ? 0.5 : 1.1}
        color={top} castShadow shadow-mapSize={[1024, 1024]}
      />
      <hemisphereLight args={[top, nm.color.abyss, night ? 0.3 : 0.55]} />

      <Water hour={hour} />

      {ISLANDS.map((isl) => (
        <Island
          key={isl.id}
          island={isl}
          leaderBounty={leaders?.[isl.ratingKey] ?? null}
          onSelect={onSelect}
        />
      ))}

      <CameraDrift />

      <EffectComposer disableNormalPass>
        <DepthOfField focusDistance={0.012} focalLength={0.04} bokehScale={2.2} height={480} />
        <Bloom intensity={night ? 0.9 : 0.5} luminanceThreshold={0.55} luminanceSmoothing={0.3} mipmapBlur />
        <Vignette eskil={false} offset={0.25} darkness={0.85} />
      </EffectComposer>
    </>
  )
}

export default function OceanScene({ hour = 18, leaders = {}, onSelect }) {
  return (
    <Canvas
      shadows
      dpr={[1, 1.75]}
      gl={{ antialias: true, powerPreference: 'high-performance', alpha: false }}
      camera={{ position: [0, 16, 26], fov: 42, near: 0.1, far: 120 }}
      style={{ position: 'absolute', inset: 0, zIndex: nm.z.ocean }}
    >
      <color attach="background" args={[nm.color.abyss]} />
      <Suspense fallback={null}>
        <SceneContent hour={hour} leaders={leaders} onSelect={onSelect} />
      </Suspense>
    </Canvas>
  )
}
