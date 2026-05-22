/**
 * ProfilePageYonkou.jsx
 * Al Freydiss — Yonkou du Chaos | One Piece Next-Gen Profile
 *
 * Stack: React Three Fiber + @react-three/rapier + @react-three/postprocessing
 *        + leva + gsap + custom GLSL shaders + Web Audio API
 *
 * npm install @react-three/rapier leva gsap @react-three/postprocessing postprocessing --legacy-peer-deps
 */

import { useRef, useState, useEffect, useMemo, useCallback, Suspense } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Stars, Float, AdaptiveDpr } from '@react-three/drei'
import { EffectComposer, Bloom, ChromaticAberration, Vignette } from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'
import { Physics, RigidBody, CuboidCollider, BallCollider } from '@react-three/rapier'
import { useControls, folder, Leva } from 'leva'
import { gsap } from 'gsap'
import * as THREE from 'three'

// ═══════════════════════════════════════════════════════════════════════════════
// ██  GLSL SHADERS
// ═══════════════════════════════════════════════════════════════════════════════

/** Ocean: vertex — Gerstner-style multi-wave displacement */
const OCEAN_VERT = /* glsl */`
  uniform float uTime;
  uniform float uHeight;
  uniform float uFreq;
  varying vec2  vUv;
  varying float vElev;

  float wave(vec2 p, float t, float f, float ph) {
    return sin(p.x * f + t + ph) * cos(p.y * f * 0.73 + t * 0.87 + ph);
  }

  void main() {
    vUv = uv;
    vec3 pos = position;
    float e = wave(pos.xz, uTime, uFreq,       0.0 ) * uHeight
            + wave(pos.xz, uTime, uFreq * 1.9,  1.3 ) * uHeight * 0.42
            + wave(pos.xz, uTime, uFreq * 3.7,  2.7 ) * uHeight * 0.22
            + wave(pos.xz, uTime, uFreq * 0.4,  4.1 ) * uHeight * 0.18;
    pos.y += e;
    vElev = e;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`

/** Ocean: fragment — caustics + foam + depth gradient */
const OCEAN_FRAG = /* glsl */`
  uniform float uTime;
  uniform float uOpacity;
  uniform vec3  uDeep;
  uniform vec3  uShallow;
  varying vec2  vUv;
  varying float vElev;

  void main() {
    float t = smoothstep(-0.45, 0.45, vElev);
    vec3 col = mix(uDeep, uShallow, t);

    float c = sin(vUv.x * 26.0 + uTime * 0.85) * sin(vUv.y * 26.0 + uTime * 0.65);
    col += vec3(0.04, 0.10, 0.35) * pow(abs(c), 2.2) * 0.28;

    float foam = smoothstep(0.28, 0.55, t);
    col = mix(col, vec3(0.35, 0.42, 0.80), foam * 0.22);

    gl_FragColor = vec4(col, uOpacity);
  }
`

/** Haki aura: vertex — breathing vertex displacement */
const HAKI_VERT = /* glsl */`
  uniform float uTime;
  uniform float uDistortion;
  varying vec3  vNormal;
  varying vec3  vViewDir;
  varying vec2  vUv;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i),                hash(i + vec2(1.0, 0.0)), f.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
      f.y
    );
  }

  void main() {
    vUv      = uv;
    vNormal  = normalize(normalMatrix * normal);
    float n  = noise(uv * 7.0 + uTime * 0.75);
    vec3  pos = position + normal * n * uDistortion;
    vec4  mv  = modelViewMatrix * vec4(pos, 1.0);
    vViewDir  = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`

/** Haki aura: fragment — fresnel rim + black lightning veins + pulse */
const HAKI_FRAG = /* glsl */`
  uniform float uTime;
  uniform float uIntensity;
  uniform float uFresnelPow;
  uniform vec3  uInner;
  uniform vec3  uOuter;
  varying vec3  vNormal;
  varying vec3  vViewDir;
  varying vec2  vUv;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i),                hash(i + vec2(1.0, 0.0)), f.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
      f.y
    );
  }

  void main() {
    float fr    = pow(1.0 - max(dot(vNormal, vViewDir), 0.0), uFresnelPow);
    float pulse = sin(uTime * 2.8) * 0.28 + 0.72;

    /* black lightning veins */
    float v1 = noise(vUv * 38.0 + uTime * 2.2);
    float v2 = noise(vUv * 20.0 - uTime * 1.4);
    float vein = step(0.80, v1) * step(0.70, v2);

    vec3 col = mix(uInner, uOuter, fr) * uIntensity * pulse;
    col = mix(col, vec3(0.0), vein * 0.85);

    float alpha = (fr * 0.88 + 0.08) * uIntensity * pulse;
    gl_FragColor = vec4(col, clamp(alpha, 0.0, 1.0));
  }
`

/** GPU Particles: vertex — spiral lifetime orbit */
const PART_VERT = /* glsl */`
  attribute float aRand;
  attribute float aSize;
  uniform float   uTime;
  uniform float   uPixelRatio;
  varying float   vAlpha;
  varying float   vRand;

  void main() {
    vRand       = aRand;
    float life  = fract(uTime * 0.28 + aRand);
    vAlpha      = smoothstep(0.0, 0.12, life) * smoothstep(1.0, 0.78, life);

    vec3  pos   = position;
    float angle = life * 12.566 + aRand * 6.283;
    float r     = (1.0 - life) * 2.2 * aRand;
    pos.x += cos(angle) * r;
    pos.y += life * 4.5 + sin(uTime * 1.8 + aRand * 6.28) * 0.18;
    pos.z += sin(angle) * r;

    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = aSize * uPixelRatio * clamp(130.0 / -mv.z, 0.4, 5.0);
    gl_Position  = projectionMatrix * mv;
  }
`

/** GPU Particles: fragment — soft glow disc */
const PART_FRAG = /* glsl */`
  uniform vec3  uColor;
  uniform vec3  uColor2;
  varying float vAlpha;
  varying float vRand;

  void main() {
    vec2  uv = gl_PointCoord - 0.5;
    float d  = length(uv);
    float a  = smoothstep(0.5, 0.08, d) * vAlpha;
    if (a < 0.01) discard;
    vec3 col = mix(uColor, uColor2, vRand * 0.6);
    col     += vec3(1.0) * smoothstep(0.15, 0.0, d) * 0.4; /* bright core */
    gl_FragColor = vec4(col, a);
  }
`

// ═══════════════════════════════════════════════════════════════════════════════
// ██  3D COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

/** Animated ocean plane with custom GLSL waves */
function OceanMesh({ height, freq, opacity, deep, shallow }) {
  const mat = useRef()

  const uniforms = useMemo(() => ({
    uTime:    { value: 0 },
    uHeight:  { value: height },
    uFreq:    { value: freq },
    uOpacity: { value: opacity },
    uDeep:    { value: new THREE.Color(deep) },
    uShallow: { value: new THREE.Color(shallow) },
  }), []) // eslint-disable-line

  // Keep uniforms in sync with Leva values
  useEffect(() => {
    if (!mat.current) return
    mat.current.uniforms.uHeight.value  = height
    mat.current.uniforms.uFreq.value    = freq
    mat.current.uniforms.uOpacity.value = opacity
    mat.current.uniforms.uDeep.value.set(deep)
    mat.current.uniforms.uShallow.value.set(shallow)
  }, [height, freq, opacity, deep, shallow])

  useFrame(({ clock }) => {
    if (mat.current) mat.current.uniforms.uTime.value = clock.elapsedTime * 0.45
  })

  return (
    <mesh rotation-x={-Math.PI / 2} position={[0, -2.2, 0]}>
      <planeGeometry args={[70, 70, 140, 140]} />
      <shaderMaterial ref={mat}
        vertexShader={OCEAN_VERT} fragmentShader={OCEAN_FRAG}
        uniforms={uniforms} transparent depthWrite={false} side={THREE.DoubleSide}
      />
    </mesh>
  )
}

/** Stylised One Piece character placeholder — primitive art + Haki aura shader */
function HakiCharacter({ intensity, fresnelPow, innerColor, outerColor, distortion, onHover }) {
  const group    = useRef()
  const auraMat  = useRef()
  const bodyGrp  = useRef()
  const mouse    = useRef({ x: 0, y: 0 })
  const [hov, setHov] = useState(false)
  const hovTarget = useRef(1)

  const hakiUniforms = useMemo(() => ({
    uTime:       { value: 0 },
    uIntensity:  { value: intensity },
    uFresnelPow: { value: fresnelPow },
    uDistortion: { value: distortion },
    uInner:      { value: new THREE.Color(innerColor) },
    uOuter:      { value: new THREE.Color(outerColor) },
  }), []) // eslint-disable-line

  useEffect(() => {
    const mv = (e) => {
      mouse.current.x = (e.clientX / window.innerWidth  - 0.5) * 2
      mouse.current.y = -(e.clientY / window.innerHeight - 0.5) * 2
    }
    window.addEventListener('mousemove', mv)
    return () => window.removeEventListener('mousemove', mv)
  }, [])

  useEffect(() => {
    if (!auraMat.current) return
    auraMat.current.uniforms.uIntensity.value  = intensity
    auraMat.current.uniforms.uFresnelPow.value = fresnelPow
    auraMat.current.uniforms.uDistortion.value = distortion
    auraMat.current.uniforms.uInner.value.set(innerColor)
    auraMat.current.uniforms.uOuter.value.set(outerColor)
  }, [intensity, fresnelPow, innerColor, outerColor, distortion])

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    if (auraMat.current)  auraMat.current.uniforms.uTime.value = t
    if (group.current) {
      group.current.rotation.y += (mouse.current.x * 0.5  - group.current.rotation.y) * 0.025
      group.current.rotation.x += (mouse.current.y * 0.18 - group.current.rotation.x) * 0.025
      group.current.position.y  = Math.sin(t * 0.45) * 0.12
    }
    if (bodyGrp.current) {
      hovTarget.current = hov ? 1.07 : 1.0
      bodyGrp.current.scale.lerp(
        new THREE.Vector3(hovTarget.current, hovTarget.current, hovTarget.current),
        0.07
      )
    }
  })

  return (
    <group ref={group}>

      {/* Outer Haki aura — back face (backlit glow) */}
      <mesh>
        <sphereGeometry args={[1.52, 48, 48]} />
        <shaderMaterial ref={auraMat}
          vertexShader={HAKI_VERT} fragmentShader={HAKI_FRAG}
          uniforms={hakiUniforms} transparent depthWrite={false} side={THREE.BackSide}
        />
      </mesh>

      {/* Primitive character body */}
      <group ref={bodyGrp}
        onPointerEnter={() => { setHov(true);  onHover?.(true)  }}
        onPointerLeave={() => { setHov(false); onHover?.(false) }}
      >
        {/* Torso / cloak base */}
        <mesh position={[0, 0, 0]}>
          <capsuleGeometry args={[0.36, 0.72, 8, 16]} />
          <meshStandardMaterial color="#140025" metalness={0.25} roughness={0.65}
            emissive="#380060" emissiveIntensity={0.5} />
        </mesh>
        {/* Head */}
        <mesh position={[0, 0.88, 0]}>
          <sphereGeometry args={[0.30, 20, 20]} />
          <meshStandardMaterial color="#1a0035" metalness={0.2} roughness={0.7}
            emissive="#280050" emissiveIntensity={0.55} />
        </mesh>
        {/* Flowing cloak */}
        <mesh position={[0, -0.15, -0.06]} rotation-x={0.08}>
          <coneGeometry args={[0.62, 1.25, 8, 1, true]} />
          <meshStandardMaterial color="#090012" side={THREE.DoubleSide} roughness={0.95} transparent opacity={0.92} />
        </mesh>
        {/* Left pauldron */}
        <mesh position={[-0.50, 0.18, 0]} rotation-z={0.32}>
          <sphereGeometry args={[0.19, 10, 10]} />
          <meshStandardMaterial color="#250040" metalness={0.65} roughness={0.25}
            emissive="#6800bb" emissiveIntensity={0.55} />
        </mesh>
        {/* Right pauldron */}
        <mesh position={[0.50, 0.18, 0]} rotation-z={-0.32}>
          <sphereGeometry args={[0.19, 10, 10]} />
          <meshStandardMaterial color="#250040" metalness={0.65} roughness={0.25}
            emissive="#6800bb" emissiveIntensity={0.55} />
        </mesh>
        {/* Crown ring */}
        <mesh position={[0, 1.17, 0]}>
          <torusGeometry args={[0.26, 0.04, 8, 24]} />
          <meshStandardMaterial color="#FFD700" metalness={0.98} roughness={0.04}
            emissive="#FF8C00" emissiveIntensity={0.9} />
        </mesh>
        {/* Sword hilt hint */}
        <mesh position={[0.44, -0.2, 0.1]} rotation-z={0.6}>
          <cylinderGeometry args={[0.025, 0.025, 0.55, 8]} />
          <meshStandardMaterial color="#888" metalness={0.9} roughness={0.1} emissive="#00e5ff" emissiveIntensity={0.3} />
        </mesh>
      </group>

      {/* Front Haki layer — front face */}
      <mesh>
        <sphereGeometry args={[1.54, 48, 48]} />
        <shaderMaterial
          vertexShader={HAKI_VERT} fragmentShader={HAKI_FRAG}
          uniforms={hakiUniforms} transparent depthWrite={false} side={THREE.FrontSide}
        />
      </mesh>

    </group>
  )
}

/** GPU-based Haki particle system (300 gold particles, additive blending) */
const PART_COUNT = 300

function HakiParticles({ color, color2 }) {
  const mat = useRef()

  const { positions, rands, sizes } = useMemo(() => {
    const positions = new Float32Array(PART_COUNT * 3)
    const rands     = new Float32Array(PART_COUNT)
    const sizes     = new Float32Array(PART_COUNT)
    for (let i = 0; i < PART_COUNT; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi   = Math.acos(2 * Math.random() - 1)
      const r     = 0.75 + Math.random() * 0.65
      positions[i * 3]     = r * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = r * Math.cos(phi)
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta)
      rands[i] = Math.random()
      sizes[i] = 0.4 + Math.random() * 1.8
    }
    return { positions, rands, sizes }
  }, [])

  const uniforms = useMemo(() => ({
    uTime:       { value: 0 },
    uColor:      { value: new THREE.Color(color)  },
    uColor2:     { value: new THREE.Color(color2) },
    uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
  }), []) // eslint-disable-line

  useEffect(() => {
    if (!mat.current) return
    mat.current.uniforms.uColor.value.set(color)
    mat.current.uniforms.uColor2.value.set(color2)
  }, [color, color2])

  useFrame(({ clock }) => {
    if (mat.current) mat.current.uniforms.uTime.value = clock.elapsedTime
  })

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-aRand"    args={[rands,     1]} />
        <bufferAttribute attach="attributes-aSize"    args={[sizes,     1]} />
      </bufferGeometry>
      <shaderMaterial ref={mat}
        vertexShader={PART_VERT} fragmentShader={PART_FRAG}
        uniforms={uniforms} transparent depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}

/** Berry coins rain — 25 RigidBody cylinders with Rapier physics */
const COIN_COUNT = 25

function BerryCoins({ burst, friction, restitution, coinScale, coinForce }) {
  const refs = useRef([])

  const coins = useMemo(() =>
    Array.from({ length: COIN_COUNT }, (_, i) => ({
      id: i,
      x: (Math.random() - 0.5) * 5,
      z: (Math.random() - 0.5) * 5,
      y: 5 + Math.random() * 4,
    })), []
  )

  // Trigger burst: reset each coin and apply upward impulse with stagger
  useEffect(() => {
    if (!burst) return
    refs.current.forEach((rb, i) => {
      if (!rb) return
      setTimeout(() => {
        try {
          rb.setTranslation({ x: (Math.random()-0.5)*3, y: 4+Math.random()*3, z: (Math.random()-0.5)*3 }, true)
          rb.setLinvel({ x: (Math.random()-.5)*4, y: coinForce, z: (Math.random()-.5)*4 }, true)
          rb.setAngvel({ x: Math.random()*8, y: Math.random()*8, z: Math.random()*8 }, true)
          rb.wakeUp()
        } catch (_) {}
      }, i * 55)
    })
  }, [burst, coinForce])

  return (
    <>
      {/* Invisible floor */}
      <RigidBody type="fixed" position={[0, -2.6, 0]}>
        <CuboidCollider args={[18, 0.1, 18]} />
      </RigidBody>

      {coins.map((c, i) => (
        <RigidBody
          key={c.id}
          ref={el => { refs.current[i] = el }}
          type="dynamic"
          position={[c.x, c.y, c.z]}
          restitution={restitution}
          friction={friction}
          linearDamping={0.25}
          angularDamping={0.2}
          colliders={false}
        >
          <BallCollider args={[coinScale * 0.5]} />
          <mesh castShadow>
            <cylinderGeometry args={[coinScale * 0.5, coinScale * 0.5, coinScale * 0.15, 16]} />
            <meshStandardMaterial
              color="#FFD700" metalness={0.97} roughness={0.04}
              emissive="#FF8C00" emissiveIntensity={0.28}
            />
          </mesh>
        </RigidBody>
      ))}
    </>
  )
}

/** Floating island mini-objects (oscillatory buoyancy, no physics needed) */
function FloatingIsland({ pos, phase }) {
  const ref = useRef()
  useFrame(({ clock }) => {
    if (!ref.current) return
    ref.current.position.y  = pos[1] + Math.sin(clock.elapsedTime * 0.28 + phase) * 0.18
    ref.current.rotation.y += 0.0018
  })
  return (
    <group ref={ref} position={pos}>
      <mesh>
        <cylinderGeometry args={[0.85, 1.25, 0.45, 14]} />
        <meshStandardMaterial color="#160820" roughness={0.92} emissive="#250840" emissiveIntensity={0.3} />
      </mesh>
      <mesh position={[0.18, 0.28, 0.1]}>
        <coneGeometry args={[0.14, 0.42, 6]} />
        <meshStandardMaterial color="#0a2515" roughness={1} emissive="#003300" emissiveIntensity={0.35} />
      </mesh>
      <mesh position={[-0.15, 0.22, -0.12]}>
        <sphereGeometry args={[0.1, 8, 8]} />
        <meshStandardMaterial color="#1a0830" emissive="#4b00cc" emissiveIntensity={0.6} />
      </mesh>
    </group>
  )
}

/** Volumetric aurora plane in the background */
function Aurora() {
  const ref = useRef()
  useFrame(({ clock }) => {
    if (!ref.current) return
    ref.current.material.opacity = 0.28 + Math.sin(clock.elapsedTime * 0.22) * 0.08
    ref.current.position.x       = Math.sin(clock.elapsedTime * 0.08) * 2
  })
  return (
    <mesh ref={ref} position={[0, 11, -22]} rotation-x={-0.18}>
      <planeGeometry args={[60, 18]} />
      <meshBasicMaterial color="#5500ee" transparent opacity={0.28} depthWrite={false}
        blending={THREE.AdditiveBlending} />
    </mesh>
  )
}

/** Post-processing stack: Bloom + ChromaticAberration + Vignette */
function PostFX({ bloomInt, bloomRad, caOff }) {
  return (
    <EffectComposer>
      <Bloom intensity={bloomInt} luminanceThreshold={0.18} luminanceSmoothing={0.92} radius={bloomRad} />
      <ChromaticAberration
        offset={new THREE.Vector2(caOff, caOff)}
        blendFunction={BlendFunction.NORMAL}
      />
      <Vignette offset={0.32} darkness={0.88} />
    </EffectComposer>
  )
}

/** Master 3D scene (lives inside Canvas) */
function Scene({ cfg, coinBurst, onCharHover }) {
  return (
    <>
      <color attach="background" args={['#020008']} />
      <fog attach="fog" args={['#060015', 14, 48]} />

      {/* Lighting rig */}
      <ambientLight intensity={0.12} color="#14002a" />
      <pointLight position={[0,  4,  0]} intensity={4}   color="#7b00ff" distance={14} />
      <pointLight position={[-4, 2,  3]} intensity={2.5} color="#ff0033" distance={12} />
      <pointLight position={[4,  1, -3]} intensity={2.2} color="#00e5ff" distance={12} />
      <pointLight position={[0,  2,  5]} intensity={1.5} color="#FFD700" distance={10} />
      <directionalLight position={[6, 10, 6]} intensity={0.55} color="#ffffff" castShadow />

      {/* Stars + aurora */}
      <Stars radius={65} depth={35} count={3500} factor={3.2} fade speed={0.25} />
      <Aurora />

      {/* Ocean */}
      <OceanMesh
        height={cfg.ocean.h} freq={cfg.ocean.f} opacity={cfg.ocean.op}
        deep={cfg.ocean.deep} shallow={cfg.ocean.shallow}
      />

      {/* Floating islands */}
      <FloatingIsland pos={[-6, -1.1, -7]}  phase={0}   />
      <FloatingIsland pos={[6.5, -0.7, -9]}  phase={2.1} />
      <FloatingIsland pos={[0,   -1.6, -13]} phase={4.3} />

      {/* Physics world — timeStep 1/30 for perf, simple colliders */}
      <Physics gravity={[0, cfg.phys.g, 0]} timeStep={1 / 30}>

        {/* Character + Haki particles — floating */}
        <Float speed={1.1} rotationIntensity={0.08} floatIntensity={0.14}>
          <HakiCharacter
            intensity={cfg.haki.int} fresnelPow={cfg.haki.fp}
            innerColor={cfg.haki.ci} outerColor={cfg.haki.co}
            distortion={cfg.haki.d} onHover={onCharHover}
          />
          <HakiParticles color={cfg.part.c1} color2={cfg.part.c2} />
        </Float>

        {/* Berry coin rain */}
        <BerryCoins
          burst={coinBurst}
          friction={cfg.phys.fr} restitution={cfg.phys.rest}
          coinScale={cfg.phys.cs} coinForce={cfg.phys.cf}
        />

      </Physics>

      <PostFX bloomInt={cfg.fx.bi} bloomRad={cfg.fx.br} caOff={cfg.fx.ca} />
      <AdaptiveDpr pixelated />
    </>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// ██  UI COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

const GLASS = (accent = '#7b00ff') => ({
  background: 'linear-gradient(135deg, rgba(7,0,18,0.92) 0%, rgba(14,0,32,0.88) 100%)',
  backdropFilter: 'blur(18px)',
  border: `1px solid ${accent}35`,
  borderRadius: 8,
  padding: '20px 22px',
  position: 'relative',
  overflow: 'hidden',
})

const TOP_LINE = (color = '#7b00ff') => ({
  position: 'absolute', top: 0, left: 0, right: 0, height: 1,
  background: `linear-gradient(90deg, transparent, ${color}90, transparent)`,
})

function StatCard({ icon, label, subLabel, value, unit, color, onClick }) {
  const ref = useRef()

  useEffect(() => {
    if (!ref.current) return
    gsap.from(ref.current, { y: 50, opacity: 0, duration: 0.85, ease: 'power3.out', delay: 0.35 })
  }, [])

  return (
    <div
      ref={ref}
      onClick={onClick}
      style={{
        ...GLASS(color),
        cursor: onClick ? 'pointer' : 'default',
        transition: 'transform .25s, box-shadow .25s, border-color .25s',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform     = 'translateY(-4px)'
        e.currentTarget.style.borderColor   = `${color}90`
        e.currentTarget.style.boxShadow     = `0 0 28px ${color}40, 0 10px 40px rgba(0,0,0,.7)`
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform   = ''
        e.currentTarget.style.borderColor = `${color}35`
        e.currentTarget.style.boxShadow   = ''
      }}
    >
      <div style={TOP_LINE(color)} />
      <div style={{ fontSize: 28, marginBottom: 7, filter: `drop-shadow(0 0 8px ${color})` }}>{icon}</div>
      <div style={{ fontSize: 9, letterSpacing: 3, color: 'rgba(232,224,240,.32)', textTransform: 'uppercase', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 8, letterSpacing: 1, color: `${color}88`, fontStyle: 'italic', marginBottom: 10 }}>{subLabel}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
        <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 38, color, textShadow: `0 0 14px ${color}` }}>{value}</span>
        <span style={{ fontSize: 12, color: 'rgba(232,224,240,.38)' }}>{unit}</span>
      </div>
      {onClick && (
        <div style={{ marginTop: 10, fontSize: 9, letterSpacing: 2, color: `${color}70` }}>
          ▲ CLIQUER POUR DÉCLENCHER
        </div>
      )}
    </div>
  )
}

function InfoRow({ label, value, color = 'rgba(232,224,240,.88)' }) {
  return (
    <div style={{ marginBottom: 11 }}>
      <div style={{ fontSize: 8, letterSpacing: 2, color: 'rgba(232,224,240,.28)', textTransform: 'uppercase', marginBottom: 2 }}>{label}</div>
      <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 14, fontWeight: 600, color }}>{value}</div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// ██  MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════════

const RANKS = [
  { label: 'Moussaillon du Chaos',   done: true },
  { label: 'Pirate Sanglant',        done: true },
  { label: 'Shichibukai Dément',     done: true },
  { label: 'YONKOU DU CHAOS ⚡',     curr: true },
  { label: 'ROI DES PIRATES 🏴‍☠️',  ult:  true },
]

export default function ProfilePageYonkou() {
  const [audioOn, setAudioOn]     = useState(false)
  const [coinBurst, setCoinBurst] = useState(false)
  const [charHov, setCharHov]     = useState(false)
  const audioRef  = useRef(null)
  const pageRef   = useRef()
  const cursorRef = useRef()

  // ─── Leva controls ───────────────────────────────────────────────────────────
  const { waveH, waveF, oceanOp, oceanDeep, oceanShallow } = useControls('🌊 Ocean', {
    waveH:        { label: 'Wave Height',    value: 0.32, min: 0,   max: 1.8,   step: 0.01 },
    waveF:        { label: 'Wave Frequency', value: 1.6,  min: 0.1, max: 6,     step: 0.05 },
    oceanOp:      { label: 'Opacity',        value: 0.78, min: 0,   max: 1 },
    oceanDeep:    { label: 'Deep Color',     value: '#040028' },
    oceanShallow: { label: 'Shallow Color',  value: '#180060' },
  })

  const { hakiInt, hakiFP, hakiCI, hakiCO, hakiD } = useControls('⚡ Haki', {
    hakiInt: { label: 'Intensity',      value: 1.45, min: 0,  max: 5,   step: 0.05 },
    hakiFP:  { label: 'Fresnel Power',  value: 2.6,  min: 0.5,max: 9 },
    hakiCI:  { label: 'Inner Color',    value: '#18003a' },
    hakiCO:  { label: 'Outer Color',    value: '#7b00ff' },
    hakiD:   { label: 'Distortion',     value: 0.045,min: 0,  max: 0.25, step: 0.005 },
  })

  const { partC1, partC2 } = useControls('✨ Particles', {
    partC1: { label: 'Color 1 (gold)',  value: '#FFD700' },
    partC2: { label: 'Color 2 (white)', value: '#ffffff' },
  })

  const { physG, physFR, physRest, physCS, physCF } = useControls('🪙 Physics', {
    physG:    { label: 'Gravity',         value: -7,   min: -20, max: -1 },
    physFR:   { label: 'Friction',        value: 0.4,  min: 0,   max: 1  },
    physRest: { label: 'Restitution',     value: 0.55, min: 0,   max: 1  },
    physCS:   { label: 'Coin Scale',      value: 0.28, min: 0.1, max: 0.8 },
    physCF:   { label: 'Rain Force',      value: 5,    min: 1,   max: 18 },
  })

  const { bloomInt, bloomRad, caOff } = useControls('🎆 Post-FX', {
    bloomInt: { label: 'Bloom Intensity', value: 2.6,    min: 0,  max: 12 },
    bloomRad: { label: 'Bloom Radius',    value: 0.72,   min: 0,  max: 1  },
    caOff:    { label: 'Chromatic Ab.',   value: 0.0009, min: 0,  max: 0.006, step: 0.0001 },
  })

  const cfg = {
    ocean: { h: waveH, f: waveF, op: oceanOp, deep: oceanDeep, shallow: oceanShallow },
    haki:  { int: hakiInt, fp: hakiFP, ci: hakiCI, co: hakiCO, d: hakiD },
    part:  { c1: partC1, c2: partC2 },
    phys:  { g: physG, fr: physFR, rest: physRest, cs: physCS, cf: physCF },
    fx:    { bi: bloomInt, br: bloomRad, ca: caOff },
  }

  // ─── GSAP entry animation ─────────────────────────────────────────────────
  useEffect(() => {
    if (!pageRef.current) return
    const targets = pageRef.current.querySelectorAll('[data-anim]')
    gsap.from(targets, { y: 55, opacity: 0, duration: 0.95, stagger: 0.09, ease: 'power3.out', delay: 0.5 })
  }, [audioOn])

  // ─── Custom cursor ─────────────────────────────────────────────────────────
  useEffect(() => {
    const move = (e) => {
      if (!cursorRef.current) return
      cursorRef.current.style.transform = `translate(${e.clientX - 18}px, ${e.clientY - 18}px)`
    }
    window.addEventListener('mousemove', move)
    return () => window.removeEventListener('mousemove', move)
  }, [])

  // ─── Web Audio API ─────────────────────────────────────────────────────────
  const enableAudio = useCallback(() => {
    if (audioRef.current) return
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    audioRef.current = ctx

    // Ocean ambient: band-pass filtered white noise
    const bufLen = ctx.sampleRate * 4
    const buf    = ctx.createBuffer(1, bufLen, ctx.sampleRate)
    const data   = buf.getChannelData(0)
    for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1
    const src  = ctx.createBufferSource()
    src.buffer = buf; src.loop = true
    const bpf  = ctx.createBiquadFilter()
    bpf.type   = 'bandpass'; bpf.frequency.value = 260; bpf.Q.value = 0.4
    const gain = ctx.createGain()
    gain.gain.value = 0.045
    src.connect(bpf).connect(gain).connect(ctx.destination)
    src.start()

    setAudioOn(true)
  }, [])

  // Play coin sound on berry burst
  const triggerCoinBurst = useCallback(() => {
    setCoinBurst(true)
    setTimeout(() => setCoinBurst(false), 200)
    if (!audioRef.current) return
    const ctx = audioRef.current
    for (let i = 0; i < 6; i++) {
      setTimeout(() => {
        const osc = ctx.createOscillator()
        const g   = ctx.createGain()
        osc.frequency.value = 700 + Math.random() * 600
        osc.type = 'sine'
        g.gain.setValueAtTime(0.12, ctx.currentTime)
        g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35)
        osc.connect(g).connect(ctx.destination)
        osc.start(); osc.stop(ctx.currentTime + 0.35)
      }, i * 60)
    }
  }, [])

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: '#020008', fontFamily: "'Share Tech Mono', monospace", position: 'relative', overflowX: 'hidden' }}>

      {/* Leva debug panel — themed */}
      <Leva collapsed theme={{
        colors: {
          elevation1: '#080018', elevation2: '#100028', elevation3: '#180038',
          accent1: '#7b00ff', accent2: '#9b20ff',
          highlight1: '#ff0033', highlight2: '#ff4466',
        },
      }} />

      {/* ⚔️ Custom cursor */}
      <div ref={cursorRef} style={{
        position: 'fixed', top: 0, left: 0, zIndex: 99999,
        width: 36, height: 36, fontSize: 24, lineHeight: 1,
        pointerEvents: 'none', transition: 'transform .05s linear',
        filter: `drop-shadow(0 0 8px ${charHov ? '#FFD700' : '#7b00ff'})`,
      }}>⚔️</div>

      {/* ══ Full-screen R3F Canvas ══ */}
      <Canvas
        style={{ position: 'fixed', inset: 0, zIndex: 0 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
        shadows
      >
        <Suspense fallback={null}>
          <Scene cfg={cfg} coinBurst={coinBurst} onCharHover={setCharHov} />
        </Suspense>
      </Canvas>

      {/* ══ Audio gate overlay ══ */}
      {!audioOn && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 500,
          background: 'rgba(2,0,8,.88)', backdropFilter: 'blur(10px)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 22,
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 52, letterSpacing: 8,
              color: 'rgba(232,224,240,.95)',
              textShadow: '-3px 0 #ff003380, 3px 0 #00e5ff80, 0 0 40px rgba(255,255,255,.15)' }}>
              AL FREYDISS
            </div>
            <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 16, letterSpacing: 5,
              color: '#7b00ff', textShadow: '0 0 14px #7b00ff', textTransform: 'uppercase' }}>
              Yonkou du Chaos
            </div>
          </div>
          <div style={{ fontSize: 11, letterSpacing: 2, color: 'rgba(255,255,255,.38)', textAlign: 'center', maxWidth: 340 }}>
            Activez l'expérience complète — audio spatial 3D, physique Rapier et effets Haki
          </div>
          <button onClick={enableAudio} style={{
            background: 'linear-gradient(135deg, #7b00ff, #4b00cc)',
            border: '1.5px solid #9b30ff', borderRadius: 5,
            padding: '15px 42px', color: '#fff',
            fontFamily: "'Bebas Neue', sans-serif", fontSize: 20, letterSpacing: 5,
            cursor: 'pointer', boxShadow: '0 0 35px rgba(123,0,255,.55)',
            transition: 'box-shadow .3s',
          }}
            onMouseOver={e => e.target.style.boxShadow = '0 0 60px rgba(123,0,255,.9)'}
            onMouseOut={e  => e.target.style.boxShadow = '0 0 35px rgba(123,0,255,.55)'}
          >
            ⚡ ACTIVER L'EXPÉRIENCE
          </button>
          <button onClick={() => setAudioOn(true)} style={{
            background: 'none', border: 'none',
            color: 'rgba(255,255,255,.2)', fontSize: 10, letterSpacing: 2, cursor: 'pointer',
          }}>Continuer sans audio</button>
        </div>
      )}

      {/* ══ UI Overlay ══ */}
      <div ref={pageRef} style={{ position: 'relative', zIndex: 10, maxWidth: 1160, margin: '0 auto', padding: '0 20px 80px' }}>

        {/* ─── HEADER ─────────────────────────────────────────────────────── */}
        <header data-anim style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 26px', margin: '0 -20px',
          background: 'linear-gradient(90deg, rgba(0,0,0,.82) 0%, rgba(8,0,22,.82) 50%, rgba(0,0,0,.82) 100%)',
          backdropFilter: 'blur(22px)',
          borderBottom: '2px solid rgba(123,0,255,.45)',
          boxShadow: '0 0 35px rgba(123,0,255,.15), 0 4px 28px rgba(0,0,0,.85)',
          position: 'sticky', top: 0, zIndex: 50,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 30, filter: 'drop-shadow(0 0 12px #7b00ff)' }}>🏴‍☠️</span>
            <div>
              <div style={{
                fontFamily: "'Bebas Neue', sans-serif", fontSize: 30, letterSpacing: 6,
                color: 'rgba(232,224,240,.95)',
                textShadow: '-2px 0 rgba(255,0,51,.5), 2px 0 rgba(0,229,255,.5), 0 0 24px rgba(255,255,255,.18)',
              }}>BRAMS</div>
              <div style={{ fontSize: 9, letterSpacing: 3, color: 'rgba(123,0,255,.8)', marginTop: -5 }}>COMMUNAUTÉ — v2.0</div>
            </div>
          </div>

          <nav style={{ display: 'flex', gap: 26 }}>
            {['ACCUEIL', 'DOSSIERS', 'PROFIL', 'ARCHIVES', 'CLASSEMENT'].map(n => (
              <a key={n} href="#" style={{
                fontFamily: "'Rajdhani', sans-serif", fontSize: 12, fontWeight: 600, letterSpacing: 2,
                color: n === 'PROFIL' ? 'rgba(232,224,240,.92)' : 'rgba(232,224,240,.42)',
                textDecoration: 'none', textTransform: 'uppercase',
                ...(n === 'PROFIL' ? { textShadow: '0 0 10px #7b00ff' } : {}),
              }}>{n}</a>
            ))}
          </nav>

          <button onClick={triggerCoinBurst} style={{
            background: 'linear-gradient(135deg, #7b00ff, #4b00cc)',
            border: '1px solid #9b30ff', borderRadius: 5,
            padding: '9px 20px', color: '#fff',
            fontFamily: "'Rajdhani', sans-serif", fontSize: 12, fontWeight: 600,
            letterSpacing: 2, cursor: 'pointer',
            boxShadow: '0 0 18px rgba(123,0,255,.45)',
          }}>⚡ PLUIE DE BERRYS</button>
        </header>

        {/* Sub-title */}
        <div style={{ textAlign: 'center', padding: '26px 0 18px' }}>
          <div style={{ fontSize: 10, letterSpacing: 8, color: 'rgba(255,0,51,.65)', marginBottom: 5 }}>◈ DOSSIER CLASSIFIÉ</div>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 13, letterSpacing: 5, color: 'rgba(123,0,255,.48)' }}>
            CARTE MEMBRE — BRAMS COMMUNITY
          </div>
        </div>

        {/* ─── CARTE PROFIL ───────────────────────────────────────────────── */}
        <div data-anim style={{ ...GLASS('#ff0033'), marginBottom: 18 }}>
          <div style={TOP_LINE('#ff0033')} />

          <div style={{ display: 'flex', gap: 30, alignItems: 'center' }}>

            {/* 3D preview window */}
            <div style={{
              width: 190, height: 230, flexShrink: 0, borderRadius: 6,
              border: `2px solid rgba(123,0,255,${charHov ? '.7' : '.35'})`,
              background: 'radial-gradient(circle at 50% 50%, rgba(123,0,255,.1) 0%, transparent 70%)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end',
              padding: '0 0 14px', position: 'relative', transition: 'box-shadow .4s, border-color .4s',
              boxShadow: charHov ? '0 0 60px rgba(123,0,255,.5)' : '0 0 24px rgba(123,0,255,.18)',
            }}>
              {/* Live indicator */}
              <div style={{
                position: 'absolute', top: 10, right: 10,
                width: 10, height: 10, borderRadius: '50%',
                background: '#ff0033', boxShadow: '0 0 8px #ff0033',
              }} />
              <div style={{ position: 'absolute', top: 10, left: 10, fontSize: 8, letterSpacing: 2, color: 'rgba(255,0,51,.6)' }}>LIVE 3D</div>
              <div style={{ textAlign: 'center', fontSize: 9, letterSpacing: 1, color: 'rgba(123,0,255,.5)', lineHeight: 1.6 }}>
                Modèle 3D interactif<br />
                <span style={{ fontSize: 8, color: 'rgba(255,255,255,.28)' }}>Bougez la souris ↑</span>
              </div>
            </div>

            {/* Profile info */}
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 9, letterSpacing: 4, color: 'rgba(255,0,51,.65)', marginBottom: 9 }}>
                ◈ CARTE JOUEUR — DOSSIER YONKOU
              </div>
              <div style={{
                fontFamily: "'Rajdhani', sans-serif", fontSize: 52, fontWeight: 700,
                letterSpacing: 2, lineHeight: 1, marginBottom: 5,
                color: 'rgba(232,224,240,.95)',
                textShadow: '-2px 0 rgba(255,0,51,.45), 2px 0 rgba(0,229,255,.45), 0 0 42px rgba(255,255,255,.12)',
              }}>
                Al Freydiss
              </div>
              <div style={{
                fontFamily: "'Rajdhani', sans-serif", fontSize: 14, letterSpacing: 5,
                color: '#7b00ff', textShadow: '0 0 14px #7b00ff',
                marginBottom: 20, textTransform: 'uppercase',
              }}>
                ⚡ Yonkou du Chaos — Maître de la Déraison
              </div>
              <div style={{ height: 1, background: 'linear-gradient(90deg, #ff0033, #7b00ff, transparent)', marginBottom: 20, boxShadow: '0 0 10px rgba(255,0,51,.3)' }} />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {[
                  { lbl: 'Pseudo',      val: 'AlFreydiss#1337', acc: '#ff0033' },
                  { lbl: 'Discord ID',  val: '1337 007 666 420', sm: true },
                  { lbl: 'Rang actuel', val: '⚡ Yonkou du Chaos', acc: '#7b00ff' },
                  { lbl: 'Statut',      val: '🟢 Actif — Dangereux', acc: '#39ff14' },
                ].map(({ lbl, val, acc, sm }) => (
                  <div key={lbl} style={{
                    background: 'rgba(123,0,255,.06)', border: '1px solid rgba(123,0,255,.18)',
                    borderLeft: `3px solid ${acc || '#7b00ff'}`, borderRadius: 3, padding: '10px 13px',
                  }}>
                    <div style={{ fontSize: 8, letterSpacing: 3, color: 'rgba(232,224,240,.28)', marginBottom: 3, textTransform: 'uppercase' }}>{lbl}</div>
                    <div style={{
                      fontFamily: "'Rajdhani', sans-serif", fontWeight: 600,
                      fontSize: sm ? 11 : 15,
                      color: acc || 'rgba(232,224,240,.9)',
                      ...(acc ? { textShadow: `0 0 8px ${acc}60` } : {}),
                    }}>{val}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ─── STATS CARDS ────────────────────────────────────────────────── */}
        <div data-anim style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 18 }}>
          <StatCard
            icon="🎤" label="VOCAL" subLabel='"Heures de torture vocale"'
            value="114.3" unit="heures" color="#ff0033"
          />
          <StatCard
            icon="🪙" label="BERRYS" subLabel='"Fortune maudite — cliquez pour la pluie"'
            value="95.9M" unit="💀" color="#FFD700"
            onClick={triggerCoinBurst}
          />
          <StatCard
            icon="🌍" label="POSITION" subLabel='"Prédateur Suprême"'
            value="#30" unit="mondial" color="#00e5ff"
          />
        </div>

        {/* ─── PROGRESSION ────────────────────────────────────────────────── */}
        <div data-anim style={{ ...GLASS('#ff0033'), border: '1px solid rgba(255,0,51,.3)', marginBottom: 18 }}>
          <div style={TOP_LINE('#ff0033')} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 12, fontWeight: 600,
              letterSpacing: 3, color: 'rgba(232,224,240,.52)', textTransform: 'uppercase' }}>
              PROGRESSION VERS →&nbsp;
              <span style={{ color: '#ff0033', textShadow: '0 0 8px rgba(255,0,51,.5)' }}>ROI DES PIRATES</span>
            </div>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 24, color: '#ff0033',
              textShadow: '0 0 12px rgba(255,0,51,.65)' }}>74%</div>
          </div>
          <div style={{ height: 11, background: 'rgba(255,0,51,.08)', borderRadius: 6,
            border: '1px solid rgba(255,0,51,.15)', position: 'relative' }}>
            <div style={{
              height: '100%', width: '74%', borderRadius: 6,
              background: 'linear-gradient(90deg, #660000, #cc0022 38%, #ff0033 78%, #ff4466)',
              boxShadow: '0 0 14px rgba(255,0,51,.55), 0 0 30px rgba(255,0,51,.22)',
              position: 'relative',
            }}>
              <span style={{ position: 'absolute', right: -10, top: -10, fontSize: 20,
                filter: 'drop-shadow(0 0 8px #ff0033)' }}>🏴‍☠️</span>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 9 }}>
            {['MOUSSAILLON', 'PIRATE', 'SHICHIBUKAI', 'YONKOU ✓', 'ROI 🏴‍☠️'].map((t, i) => (
              <span key={t} style={{
                fontSize: 8, letterSpacing: 1,
                color: i < 4 ? (i === 3 ? '#7b00ff' : 'rgba(255,255,255,.35)') : '#ff0033',
                fontWeight: i >= 3 ? 700 : 400,
              }}>{t}</span>
            ))}
          </div>
        </div>

        {/* ─── BOTTOM PANELS ──────────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>

          {/* IDENTITÉ */}
          <div data-anim style={GLASS()}>
            <div style={TOP_LINE()} />
            <div style={{ fontSize: 8, letterSpacing: 4, color: '#7b00ff',
              textShadow: '0 0 6px rgba(123,0,255,.4)', marginBottom: 16, textTransform: 'uppercase' }}>
              💀 Identité
            </div>
            <InfoRow label="Pseudo"            value="AlFreydiss" />
            <InfoRow label="Discord ID"        value="1337007666420" />
            <InfoRow label="Rang actuel"       value="⚡ Yonkou du Chaos" color="#9b30ff" />
            <InfoRow label="Membre depuis"     value="Le commencement" />
            <InfoRow label="Dernière activité" value="Il y a 2 min" color="#39ff14" />
          </div>

          {/* TRÉSOR */}
          <div data-anim style={GLASS('#FFD700')}>
            <div style={TOP_LINE('#FFD700')} />
            <div style={{ fontSize: 8, letterSpacing: 4, color: '#FFD700',
              textShadow: '0 0 6px rgba(255,215,0,.4)', marginBottom: 16, textTransform: 'uppercase' }}>
              🪙 Trésor
            </div>
            <div style={{ fontSize: 8, letterSpacing: 2, color: 'rgba(255,215,0,.42)', textTransform: 'uppercase', marginBottom: 4 }}>Solde en Berrys</div>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 36, color: '#FFD700',
              textShadow: '0 0 16px rgba(255,215,0,.55)', letterSpacing: 2, marginBottom: 5 }}>95.9M</div>
            <div style={{ fontSize: 10, color: 'rgba(255,215,0,.38)', marginBottom: 16 }}>🪙 berrys en circulation</div>
            <div style={{ borderTop: '1px solid rgba(123,0,255,.12)', paddingTop: 14 }}>
              <div style={{ fontSize: 9, color: 'rgba(232,224,240,.22)', fontStyle: 'italic', marginBottom: 12 }}>
                ⬡ Inventaire : 0 objet(s)
              </div>
              <button onClick={triggerCoinBurst} style={{
                width: '100%',
                background: 'linear-gradient(135deg, rgba(255,215,0,.15), rgba(255,140,0,.1))',
                border: '1px solid rgba(255,215,0,.35)', borderRadius: 4,
                padding: '9px 0', color: '#FFD700', fontSize: 10, letterSpacing: 2,
                cursor: 'pointer', fontFamily: "'Share Tech Mono', monospace",
                transition: 'box-shadow .25s',
              }}
                onMouseOver={e => e.currentTarget.style.boxShadow = '0 0 20px rgba(255,215,0,.4)'}
                onMouseOut={e  => e.currentTarget.style.boxShadow = ''}
              >
                💰 DÉCLENCHER PLUIE DE BERRYS
              </button>
            </div>
          </div>

          {/* RANGS DÉBLOQUÉS */}
          <div data-anim style={GLASS()}>
            <div style={TOP_LINE()} />
            <div style={{ fontSize: 8, letterSpacing: 4, color: '#7b00ff',
              textShadow: '0 0 6px rgba(123,0,255,.4)', marginBottom: 16, textTransform: 'uppercase' }}>
              ⚡ Rangs Débloqués
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {RANKS.map(({ label, done, curr, ult }) => (
                <div key={label} style={{
                  display: 'flex', alignItems: 'center', gap: 9,
                  padding: '6px 9px', borderRadius: 3,
                  borderLeft: `2px solid ${ult ? '#ff0033' : curr ? '#7b00ff' : done ? '#880022' : 'rgba(255,255,255,.06)'}`,
                  background: ult ? 'rgba(255,0,51,.08)' : curr ? 'rgba(123,0,255,.11)' : 'transparent',
                  fontFamily: "'Rajdhani', sans-serif", fontSize: 12,
                  fontWeight: ult || curr ? 700 : 500,
                  color: ult ? '#ff4444' : curr ? '#9b30ff' : done ? 'rgba(232,224,240,.8)' : 'rgba(255,255,255,.22)',
                  textShadow: curr ? '0 0 8px rgba(123,0,255,.4)' : ult ? '0 0 8px rgba(255,0,51,.4)' : 'none',
                  letterSpacing: ult ? 1.5 : 0,
                }}>
                  <span style={{ fontSize: 11 }}>{ult ? '🩸' : curr ? '◉' : done ? '✓' : '○'}</span>
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* ═══ Global styles ═══ */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Rajdhani:wght@400;500;600;700&family=Bebas+Neue&display=swap');
        * { cursor: none !important; box-sizing: border-box; }
        [data-anim] { opacity: 0; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.25} }
      `}</style>
    </div>
  )
}
