import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { usePointerParallax } from '../../hooks/usePointerParallax.js'

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

function OceanPlane() {
  const mesh = useRef(null)
  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uMouse: { value: new THREE.Vector2(0, 0) },
  }), [])

  useFrame(({ clock, pointer }) => {
    uniforms.uTime.value = clock.elapsedTime
    uniforms.uMouse.value.lerp(pointer, 0.035)
  })

  return (
    <mesh ref={mesh} position={[0, -1.22, -2.8]} rotation={[-Math.PI / 2.55, 0, 0]}>
      <planeGeometry args={[12, 5.6, 42, 18]} />
      <shaderMaterial
        transparent
        depthWrite={false}
        uniforms={uniforms}
        vertexShader={`
          uniform float uTime;
          varying vec2 vUv;
          varying float vWave;
          void main() {
            vUv = uv;
            vec3 p = position;
            float w = sin((p.x * 1.8 + uTime * .65)) * .035;
            w += sin((p.x * 4.2 + p.y * 1.2 + uTime * 1.05)) * .018;
            p.z += w;
            vWave = w;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
          }
        `}
        fragmentShader={`
          uniform float uTime;
          uniform vec2 uMouse;
          varying vec2 vUv;
          varying float vWave;
          void main() {
            float horizon = smoothstep(.06, .72, vUv.y);
            float ripples = sin((vUv.x * 34.0) + uTime * 1.15) * .5 + .5;
            ripples *= sin((vUv.y * 18.0) - uTime * .72) * .5 + .5;
            vec3 deep = vec3(.015, .055, .078);
            vec3 blue = vec3(.065, .19, .24);
            vec3 ember = vec3(.98, .44, .18);
            vec3 col = mix(deep, blue, horizon);
            col += ember * pow(max(0.0, 1.0 - abs(vUv.x - .62 - uMouse.x * .03) * 3.8), 5.0) * .23 * horizon;
            col += vec3(.60, .82, .90) * ripples * .045 * horizon;
            col += vec3(.96, .72, .40) * (vWave + .04) * 1.6;
            float alpha = smoothstep(.02, .22, vUv.y) * .78;
            gl_FragColor = vec4(col, alpha);
          }
        `}
      />
    </mesh>
  )
}

function FogSheet({ y, z, scale, opacity, speed }) {
  const ref = useRef(null)
  useFrame(({ clock, pointer }) => {
    if (!ref.current) return
    ref.current.position.x = Math.sin(clock.elapsedTime * speed) * 0.18 + pointer.x * 0.12
    ref.current.position.y = y + Math.cos(clock.elapsedTime * speed * .7) * 0.04
  })

  return (
    <mesh ref={ref} position={[0, y, z]} scale={scale}>
      <planeGeometry args={[1, 1, 1, 1]} />
      <meshBasicMaterial
        transparent
        depthWrite={false}
        opacity={opacity}
        blending={THREE.AdditiveBlending}
        map={useMemo(() => {
          const canvas = document.createElement('canvas')
          canvas.width = 256
          canvas.height = 96
          const ctx = canvas.getContext('2d')
          const grad = ctx.createRadialGradient(128, 52, 8, 128, 52, 120)
          grad.addColorStop(0, 'rgba(220,235,240,.72)')
          grad.addColorStop(.42, 'rgba(130,170,180,.22)')
          grad.addColorStop(1, 'rgba(0,0,0,0)')
          ctx.fillStyle = grad
          ctx.fillRect(0, 0, 256, 96)
          const texture = new THREE.CanvasTexture(canvas)
          texture.colorSpace = THREE.SRGBColorSpace
          return texture
        }, [])}
      />
    </mesh>
  )
}

function ParticleField() {
  const points = useRef(null)
  const { viewport } = useThree()
  const particles = useMemo(() => {
    const count = 95
    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)
    for (let i = 0; i < count; i += 1) {
      positions[i * 3] = (Math.random() - .5) * viewport.width * 1.35
      positions[i * 3 + 1] = (Math.random() - .5) * viewport.height * 1.2
      positions[i * 3 + 2] = -1 - Math.random() * 3.5
      const warm = Math.random() > .68
      colors[i * 3] = warm ? 1 : .42
      colors[i * 3 + 1] = warm ? .56 : .78
      colors[i * 3 + 2] = warm ? .22 : .92
    }
    return { positions, colors, count }
  }, [viewport.height, viewport.width])

  useFrame(({ clock, pointer }) => {
    const pos = points.current?.geometry.attributes.position
    if (!pos) return
    for (let i = 0; i < particles.count; i += 1) {
      const base = i * 3
      pos.array[base] += Math.sin(clock.elapsedTime * .18 + i) * .0009 + pointer.x * .0007
      pos.array[base + 1] += .002 + Math.cos(clock.elapsedTime * .22 + i) * .0008
      if (pos.array[base + 1] > viewport.height * .64) pos.array[base + 1] = -viewport.height * .62
    }
    pos.needsUpdate = true
  })

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={particles.count} array={particles.positions} itemSize={3} />
        <bufferAttribute attach="attributes-color" count={particles.count} array={particles.colors} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={0.022} vertexColors transparent opacity={0.58} depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  )
}

function Scene() {
  return (
    <>
      <color attach="background" args={['#05070a']} />
      <ambientLight intensity={0.42} />
      <directionalLight position={[2.4, 2.2, 1.8]} intensity={1.4} color="#ffb15b" />
      <OceanPlane />
      <FogSheet y={0.04} z={-3.2} scale={[7.6, 1.6, 1]} opacity={0.18} speed={0.06} />
      <FogSheet y={-0.42} z={-2.1} scale={[5.9, 1.2, 1]} opacity={0.13} speed={0.09} />
      <ParticleField />
    </>
  )
}

export default function CinematicPirateBackground() {
  const reduced = prefersReducedMotion()
  const ref = usePointerParallax({ strength: 16, damp: 0.055, disabled: reduced })

  return (
    <div ref={ref} className="cinematic-bg" aria-hidden="true">
      <div className="cinematic-sky" />
      <div className="cinematic-sun" />
      <div className="cinematic-cloud cinematic-cloud-a" />
      <div className="cinematic-cloud cinematic-cloud-b" />
      <div className="cinematic-ship cinematic-ship-a" />
      <div className="cinematic-ship cinematic-ship-b" />
      {!reduced && (
        <Canvas
          className="cinematic-webgl"
          frameloop="always"
          dpr={[1, 1.35]}
          gl={{ antialias: false, alpha: true, powerPreference: 'low-power' }}
          camera={{ position: [0, 0.05, 4.4], fov: 48 }}
        >
          <Scene />
        </Canvas>
      )}
      <div className="cinematic-rain" />
      <div className="cinematic-grain" />
      <div className="cinematic-vignette" />
    </div>
  )
}
