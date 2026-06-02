import { useOpeningBg } from '../../contexts/OpeningBgContext.jsx'
import OpeningBgMedia from './OpeningBgMedia.jsx'

// Fond d'opening équipé, rendu GLOBALEMENT (monté au niveau App). Lit activeBg
// du contexte et délègue le média à OpeningBgMedia.
// PERF : l'ambiance plein écran est TOUJOURS une image figée (stillOnly), jamais
// une vidéo. Décoder une vidéo taille-écran floutée (blur 9px) en continu sur
// chaque page — et la re-décoder à chaque survol de card boutique — faisait
// ramer tout le site. La vidéo animée ne joue plus que dans la bannière du hero
// profil (contenue, instance unique, blur léger), via OpeningBgMedia sans stillOnly.
//
// PERF SCROLL : le flou est appliqué via downscale — l'image est rendue à 30% de
// la taille puis agrandie au GPU (scale 3.5). Du coup blur(3px) sur 30% de pixels
// ≈ blur(10px) visuel mais ~11× moins coûteux à rasteriser. Crucial car la Navbar
// (backdrop-filter) ré-échantillonne cette couche fixe à chaque frame de scroll —
// un blur(9px) plein écran ici faisait saccader tout le site. willChange isole la
// couche pour qu'elle ne se re-rasterise pas pendant le scroll.
// Image figée (perf) : downscale 30% puis scale GPU → blur peu coûteux.
const STILL_STYLE = {
  position: 'absolute', top: 0, left: 0,
  width: '30%', height: '30%',
  transformOrigin: 'top left', transform: 'scale(3.5)',
  objectFit: 'cover',
  filter: 'blur(3px) saturate(1.12) brightness(0.72)',
  willChange: 'transform',
}
// Vidéo animée plein écran (profil) : cover net, léger flou pour la lisibilité.
const VIDEO_STYLE = {
  position: 'absolute', inset: 0,
  width: '100%', height: '100%',
  objectFit: 'cover',
  filter: 'saturate(1.08) brightness(0.7) blur(1px)',
}

export default function EquippedOpeningBackground() {
  const { activeBg, ambientStill, hideAmbient } = useOpeningBg()
  if (!activeBg || hideAmbient) return null

  const start = activeBg.overlayStart || 'rgba(8,9,13,0.74)'
  const end   = activeBg.overlayEnd   || 'rgba(6,7,11,0.94)'

  return (
    <div aria-hidden style={{ position: 'fixed', inset: 0, zIndex: -1, pointerEvents: 'none', overflow: 'hidden', background: activeBg.dominantColor || '#06070b' }}>
      <OpeningBgMedia bg={activeBg} style={ambientStill ? STILL_STYLE : VIDEO_STYLE} stillOnly={ambientStill} />
      {/* Gradient premium */}
      <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(180deg, ${start} 0%, ${end} 100%)` }} />
      {/* Teinte subtile */}
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 90% 70% at 50% 30%, rgba(120,90,200,0.10), transparent 60%)' }} />
      {/* Vignette */}
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 80% 75% at 50% 45%, transparent 35%, rgba(0,0,0,0.6) 100%)' }} />
    </div>
  )
}
