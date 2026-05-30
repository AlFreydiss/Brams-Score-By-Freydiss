import { useState, useEffect } from 'react'
import { useOpeningBg } from '../../contexts/OpeningBgContext.jsx'

// Fond d'opening équipé, rendu GLOBALEMENT (monté au niveau App). Lit activeBg
// du contexte. Priorité : vidéo R2 animée (videoUrl) > image (imageUrl) >
// miniature YouTube floutée (ytId). Derrière le contenu, ne bloque pas les clics.
export default function EquippedOpeningBackground() {
  const { activeBg } = useOpeningBg()
  const [imgSrc, setImgSrc] = useState(null)
  const [fallback, setFallback] = useState(false)
  const [videoFailed, setVideoFailed] = useState(false)

  useEffect(() => {
    setFallback(false)
    setVideoFailed(false)
    if (!activeBg) { setImgSrc(null); return }
    if (activeBg.imageUrl) { setImgSrc(activeBg.imageUrl); return }
    if (activeBg.ytId) { setImgSrc(`https://img.youtube.com/vi/${activeBg.ytId}/maxresdefault.jpg`); return }
    setImgSrc(null)
  }, [activeBg])

  if (!activeBg) return null
  const start = activeBg.overlayStart || 'rgba(8,9,13,0.74)'
  const end   = activeBg.overlayEnd   || 'rgba(6,7,11,0.94)'
  const useVideo = Boolean(activeBg.videoUrl) && !videoFailed
  const mediaStyle = { position: 'absolute', inset: '-4%', width: '108%', height: '108%', objectFit: 'cover', filter: 'blur(9px) saturate(1.12) brightness(0.72)', transform: 'scale(1.06)' }

  // Rien à montrer (ni vidéo ni image valide) → ne rend rien plutôt qu'un vide noir.
  if (!useVideo && !imgSrc) return null

  return (
    <div aria-hidden style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden', background: activeBg.dominantColor || '#06070b' }}>
      {useVideo ? (
        <video
          src={activeBg.videoUrl}
          autoPlay muted loop playsInline preload="auto"
          onError={() => setVideoFailed(true)}
          style={mediaStyle}
        />
      ) : (
        <img
          src={imgSrc} alt=""
          onError={() => {
            // fallback hqdefault si maxresdefault n'existe pas
            if (activeBg.ytId && !fallback) { setFallback(true); setImgSrc(`https://img.youtube.com/vi/${activeBg.ytId}/hqdefault.jpg`) }
          }}
          style={mediaStyle}
        />
      )}
      {/* Gradient premium */}
      <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(180deg, ${start} 0%, ${end} 100%)` }} />
      {/* Teinte subtile */}
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 90% 70% at 50% 30%, rgba(120,90,200,0.10), transparent 60%)' }} />
      {/* Vignette */}
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 80% 75% at 50% 45%, transparent 35%, rgba(0,0,0,0.6) 100%)' }} />
    </div>
  )
}
