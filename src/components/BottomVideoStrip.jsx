import { useRef } from 'react'

export default function BottomVideoStrip() {
  const videoRef = useRef(null)
  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      height: 180, zIndex: 3, pointerEvents: 'none', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: '60%',
        background: 'linear-gradient(to bottom, rgba(4,7,10,1) 0%, transparent 100%)',
        zIndex: 1,
      }} />
      <video
        ref={videoRef}
        autoPlay muted loop playsInline preload="metadata"
        onLoadedMetadata={e => { e.target.currentTime = 90 }}
        style={{
          width: '100%', height: '100%',
          objectFit: 'cover', objectPosition: 'center 60%',
          opacity: 0.09,
        }}
      >
        <source src="/bg-video.mp4" type="video/mp4" />
      </video>
    </div>
  )
}
