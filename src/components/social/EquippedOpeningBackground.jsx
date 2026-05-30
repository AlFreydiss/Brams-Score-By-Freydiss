import { useOpeningBg } from '../../contexts/OpeningBgContext.jsx'
import OpeningBgMedia from './OpeningBgMedia.jsx'

// Fond d'opening équipé, rendu GLOBALEMENT (monté au niveau App). Lit activeBg
// du contexte et délègue le média (vidéo R2 > image > miniature YouTube) à
// OpeningBgMedia. Très flouté : sert d'ambiance derrière tout le contenu.
const MEDIA_STYLE = { position: 'absolute', inset: '-4%', width: '108%', height: '108%', objectFit: 'cover', filter: 'blur(9px) saturate(1.12) brightness(0.72)', transform: 'scale(1.06)' }

export default function EquippedOpeningBackground() {
  const { activeBg, ambientStill } = useOpeningBg()
  if (!activeBg) return null

  const start = activeBg.overlayStart || 'rgba(8,9,13,0.74)'
  const end   = activeBg.overlayEnd   || 'rgba(6,7,11,0.94)'

  return (
    <div aria-hidden style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden', background: activeBg.dominantColor || '#06070b' }}>
      <OpeningBgMedia bg={activeBg} style={MEDIA_STYLE} stillOnly={ambientStill} />
      {/* Gradient premium */}
      <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(180deg, ${start} 0%, ${end} 100%)` }} />
      {/* Teinte subtile */}
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 90% 70% at 50% 30%, rgba(120,90,200,0.10), transparent 60%)' }} />
      {/* Vignette */}
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 80% 75% at 50% 45%, transparent 35%, rgba(0,0,0,0.6) 100%)' }} />
    </div>
  )
}
