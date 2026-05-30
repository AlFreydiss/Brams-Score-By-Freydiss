import { useState, useEffect } from 'react'

// Rend le média d'un fond d'opening pour un objet `bg` du catalogue.
// Priorité : vidéo R2 animée (videoUrl) > image (imageUrl) > miniature YouTube
// (ytId, maxresdefault avec fallback hqdefault). Si la vidéo échoue, bascule sur
// l'image. Le flou / cadrage est piloté par `className` + `style` du parent, ce
// qui permet de réutiliser ce composant aussi bien pour le fond global (très
// flou) que pour la bannière du hero (net). Rend `null` si aucun média valide.
// stillOnly : ignore videoUrl et affiche une image figée (évite un 2e décodage
// vidéo quand un autre élément joue déjà la même vidéo).
export default function OpeningBgMedia({ bg, className, style, stillOnly = false }) {
  const [imgSrc, setImgSrc] = useState(null)
  const [fallback, setFallback] = useState(false)
  const [videoFailed, setVideoFailed] = useState(false)

  useEffect(() => {
    setFallback(false)
    setVideoFailed(false)
    if (!bg) { setImgSrc(null); return }
    if (bg.imageUrl) { setImgSrc(bg.imageUrl); return }
    if (bg.ytId) { setImgSrc(`https://img.youtube.com/vi/${bg.ytId}/maxresdefault.jpg`); return }
    setImgSrc(null)
  }, [bg])

  if (!bg) return null
  const useVideo = Boolean(bg.videoUrl) && !videoFailed && !stillOnly
  if (!useVideo && !imgSrc) return null

  return useVideo ? (
    <video
      className={className}
      src={bg.videoUrl}
      autoPlay muted loop playsInline preload="auto"
      onError={() => setVideoFailed(true)}
      style={style}
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
      style={style}
    />
  )
}
