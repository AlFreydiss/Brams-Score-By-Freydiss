import { Canvas, useFrame } from '@react-three/fiber'
import { Image } from '@react-three/drei'
import { Suspense, useRef, useMemo, Component } from 'react'

// Barrière silencieuse : si WebGL/three échoue, on n'affiche rien (le fond bleu
// reste). Surtout pas remonter l'erreur jusqu'à l'app.
class SilentBoundary extends Component {
  constructor(p) { super(p); this.state = { dead: false } }
  static getDerivedStateFromError() { return { dead: true } }
  componentDidCatch() {}
  render() { return this.state.dead ? null : this.props.children }
}

// Un poster d'anime qui dérive doucement dans l'espace (fond cinématique).
// Tinté bleu nuit + très faible opacité → sobre, jamais flashy.
function DriftingPoster({ url, seed }) {
  const ref = useRef()
  const d = useMemo(() => {
    const r = (n) => (Math.sin(seed * 999.7 + n * 37.3) * 0.5 + 0.5)
    return {
      x: r(1) * 15 - 7.5,
      y: r(2) * 9 - 4.5,
      z: -3 - r(3) * 5,
      ampY: 0.5 + r(4) * 0.6,
      ampX: 0.5 + r(5) * 0.5,
      speed: 0.12 + r(6) * 0.18,
      drift: 0.08 + r(7) * 0.12,
      rot: (r(8) - 0.5) * 0.5,
      scale: 2.0 + r(9) * 1.4,
    }
  }, [seed])

  useFrame((state) => {
    const t = state.clock.elapsedTime
    const m = ref.current
    if (!m) return
    m.position.x = d.x + Math.cos(t * d.drift + seed * 6) * d.ampX
    m.position.y = d.y + Math.sin(t * d.speed + seed * 9) * d.ampY
    m.rotation.z = d.rot + Math.sin(t * 0.13 + seed) * 0.06
    m.rotation.y = Math.sin(t * 0.1 + seed * 2) * 0.18
  })

  return (
    <Image
      ref={ref}
      url={url}
      transparent
      opacity={0.14}
      color="#8fb0ff"
      scale={[d.scale, d.scale * 1.45, 1]}
      position={[d.x, d.y, d.z]}
    />
  )
}

// Fond 3D : quelques posters d'animés qui vagabondent derrière le contenu.
// pointer-events:none, dpr plafonné, low-power → discret et performant.
export default function AnimeDrift3D({ images = [] }) {
  const picks = useMemo(() => Array.from(new Set(images.filter(Boolean))).slice(0, 9), [images])
  if (!picks.length) return null
  return (
    <SilentBoundary>
      <Canvas
        dpr={[1, 1.5]}
        camera={{ position: [0, 0, 9], fov: 52 }}
        gl={{ alpha: true, antialias: true, powerPreference: 'low-power' }}
        style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
      >
        <Suspense fallback={null}>
          {picks.map((url, i) => (
            <DriftingPoster key={url} url={url} seed={(i + 1) / (picks.length + 1)} />
          ))}
        </Suspense>
      </Canvas>
    </SilentBoundary>
  )
}
