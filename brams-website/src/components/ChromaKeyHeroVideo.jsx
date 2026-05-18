import { useEffect, useRef, useState } from 'react'

const DEFAULT_KEY = { r: 0, g: 177, b: 64 }
const DEFAULT_THRESHOLD = 92
const DEFAULT_SMOOTHNESS = 46

function removeGreenScreen(frame, keyColor, threshold, smoothness) {
  const data = frame.data

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    const distance = Math.hypot(r - keyColor.r, g - keyColor.g, b - keyColor.b)
    const greenDominance = g - Math.max(r, b)

    if (greenDominance > 34 && distance < threshold + smoothness) {
      const edge = Math.max(0, Math.min(1, (distance - threshold) / smoothness))
      data[i + 3] = Math.round(255 * edge)
    }
  }
}

export default function ChromaKeyHeroVideo({
  src = '/cover-green-screen.mp4',
  keyColor = DEFAULT_KEY,
  threshold = DEFAULT_THRESHOLD,
  smoothness = DEFAULT_SMOOTHNESS,
}) {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const frameRef = useRef(null)
  const [ready, setReady] = useState(false)
  const [available, setAvailable] = useState(true)

  useEffect(() => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || !available) return

    const context = canvas.getContext('2d', { willReadFrequently: true })
    if (!context) return

    const draw = () => {
      if (video.readyState >= 2 && video.videoWidth && video.videoHeight) {
        const width = video.videoWidth
        const height = video.videoHeight

        if (canvas.width !== width || canvas.height !== height) {
          canvas.width = width
          canvas.height = height
        }

        context.drawImage(video, 0, 0, width, height)
        const frame = context.getImageData(0, 0, width, height)
        removeGreenScreen(frame, keyColor, threshold, smoothness)
        context.putImageData(frame, 0, 0)
      }

      frameRef.current = requestAnimationFrame(draw)
    }

    frameRef.current = requestAnimationFrame(draw)
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current)
    }
  }, [available, keyColor, smoothness, threshold])

  if (!available) return null

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        right: 'clamp(-120px, -6vw, -40px)',
        bottom: '-5vh',
        width: 'min(54vw, 720px)',
        height: 'min(82vh, 760px)',
        zIndex: 0,
        pointerEvents: 'none',
        opacity: ready ? 0.92 : 0,
        transition: 'opacity 600ms ease',
        transform: 'translate3d(var(--hero-parallax-x, 0px), var(--hero-parallax-y, 0px), 0)',
        filter: 'contrast(1.08) saturate(1.08) drop-shadow(0 32px 60px rgba(0,0,0,.62)) drop-shadow(0 0 34px rgba(224,82,74,.18))',
      }}
    >
      <div
        style={{
          position: 'absolute',
          right: '4%',
          bottom: '14%',
          width: '58%',
          height: '62%',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(224,82,74,.22), rgba(255,126,54,.08) 45%, transparent 72%)',
          filter: 'blur(18px)',
          opacity: ready ? 1 : 0,
        }}
      />
      <span className="hero-haki-line hero-haki-line-a" />
      <span className="hero-haki-line hero-haki-line-b" />
      <video
        ref={videoRef}
        src={src}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        onCanPlay={() => setReady(true)}
        onError={() => setAvailable(false)}
        style={{ display: 'none' }}
      />
      <canvas
        ref={canvasRef}
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          objectPosition: 'right bottom',
        }}
      />
    </div>
  )
}
