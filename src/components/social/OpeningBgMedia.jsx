import { useState, useEffect, useRef } from 'react'

// Rend le média d'un fond d'opening pour un objet `bg` du catalogue.
// Priorité : vidéo R2 animée (videoUrl) > image (imageUrl) > miniature YouTube
// (ytId, maxresdefault avec fallback hqdefault). Si la vidéo échoue, bascule sur
// l'image. Le flou / cadrage est piloté par `className` + `style` du parent, ce
// qui permet de réutiliser ce composant aussi bien pour le fond global (très
// flou) que pour la bannière du hero (net). Rend `null` si aucun média valide.
// stillOnly : ignore videoUrl et affiche une image figée (évite un 2e décodage
// vidéo quand un autre élément joue déjà la même vidéo).
export default function OpeningBgMedia({ bg, className, style, stillOnly = false, muted = true }) {
  const [imgSrc, setImgSrc] = useState(null)
  const [fallback, setFallback] = useState(false)
  const [videoFailed, setVideoFailed] = useState(false)
  const videoRef = useRef(null)

  useEffect(() => {
    setFallback(false)
    setVideoFailed(false)
    if (!bg) { setImgSrc(null); return }
    if (bg.imageUrl) { setImgSrc(bg.imageUrl); return }
    if (bg.ytId) { setImgSrc(`https://img.youtube.com/vi/${bg.ytId}/hqdefault.jpg`); return }
    setImgSrc(null)
  }, [bg])

  // Synchronise le mute quand l'utilisateur (dé)active le son sans remonter la vidéo.
  useEffect(() => {
    const el = videoRef.current
    if (!el) return
    el.muted = muted
    if (!muted) { const p = el.play?.(); if (p?.catch) p.catch(() => {}) }
  }, [muted])

  if (!bg) return null
  const useVideo = Boolean(bg.videoUrl) && !videoFailed && !stillOnly
  if (!useVideo && !imgSrc) return null

  // Poster = image d'attente : si l'autoplay est bloqué, on voit ça au lieu d'un
  // cadre noir.
  const poster = bg.imageUrl || (bg.ytId ? `https://img.youtube.com/vi/${bg.ytId}/hqdefault.jpg` : undefined)
  const mediaStyle = { pointerEvents: 'none', maxWidth: 'none', ...style }

  return useVideo ? (
    <video
      key={bg.videoUrl}
      poster={poster}
      ref={el => {
        videoRef.current = el
        // React n'applique pas toujours `muted` sur le DOM → l'autoplay est alors
        // bloqué et la vidéo reste un cadre noir. On force l'état muet voulu + play().
        if (el) { el.muted = muted; el.defaultMuted = muted; const p = el.play?.(); if (p?.catch) p.catch(() => {}) }
      }}
      className={className}
      src={bg.videoUrl}
      autoPlay muted={muted} loop playsInline preload="auto"
      onLoadedData={e => { e.currentTarget.muted = muted; const p = e.currentTarget.play?.(); if (p?.catch) p.catch(() => {}) }}
      onError={() => setVideoFailed(true)}
      style={mediaStyle}
    />
  ) : (
    <img
      className={className}
      src={imgSrc}
      alt=""
      onError={() => {
        // fallback hqdefault si maxresdefault n'existe pas
        if (bg.ytId && !fallback) { setFallback(true); setImgSrc(`https://img.youtube.com/vi/${bg.ytId}/hqdefault.jpg`) }
      }}
      style={mediaStyle}
    />
  )
}
