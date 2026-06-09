import { useState } from 'react'
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
  maxWidth: 'none',
  transformOrigin: 'top left', transform: 'scale(3.5)',
  objectFit: 'cover',
  filter: 'blur(3px) saturate(1.12) brightness(0.72)',
  willChange: 'transform',
}
// Vidéo animée plein écran (profil) : cover net, léger flou pour la lisibilité.
const VIDEO_STYLE = {
  position: 'absolute', inset: 0,
  width: '100%', height: '100%',
  maxWidth: 'none',
  objectFit: 'cover',
  filter: 'saturate(1.08) brightness(0.7) blur(1px)',
}

export default function EquippedOpeningBackground() {
  const { activeBg, ambientStill, hideAmbient, ambientMuted, setAmbientMuted, ambientVolume, setAmbientVolume } = useOpeningBg()
  const [hovered, setHovered] = useState(false)
  if (!activeBg || hideAmbient) return null

  const end = activeBg.overlayEnd || 'rgba(6,7,11,0.94)'
  // Le son n'est possible que sur un fond ANIMÉ (vidéo) — pas une image figée.
  const canSound = !ambientStill && Boolean(activeBg.videoUrl)

  return (
    <>
      <div aria-hidden style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden', contain: 'layout paint size', isolation: 'isolate', background: activeBg.dominantColor || '#06070b' }}>
        <OpeningBgMedia
          bg={activeBg}
          style={ambientStill ? STILL_STYLE : VIDEO_STYLE}
          stillOnly={ambientStill}
          muted={ambientMuted}
          volume={(ambientVolume ?? 45) / 100}
        />
        {/* Voile allégé : on baisse l'opacité du voile (≈0.68 effectif au lieu de
            0.94) pour que l'opening respire sur l'accueil. .cinema-veil → s'efface
            en mode AFK pour voir l'opening en plein. */}
        <div className="cinema-veil" style={{ position: 'absolute', inset: 0, background: end, opacity: 0.72 }} />
        <div className="cinema-veil" style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 90% 70% at 50% 30%, rgba(120,90,200,0.08), transparent 60%)' }} />
      </div>

      {/* Contrôle son global du fond d'opening (accueil & pages au fond animé). */}
      {canSound && (
        <div
          className="cinema-hide ambient-sound-ctl"
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          style={{
            position: 'fixed', bottom: 90, left: 16, zIndex: 850,
            display: 'flex', alignItems: 'center', gap: 8,
            background: hovered ? 'rgba(14,14,16,0.85)' : 'transparent',
            border: `1px solid ${hovered ? 'rgba(255,255,255,0.08)' : 'transparent'}`,
            borderRadius: 12, padding: hovered ? '6px 10px' : '6px 6px',
            backdropFilter: hovered ? 'blur(12px)' : 'none', transition: 'all .2s',
          }}
        >
          <button
            onClick={() => setAmbientMuted(!ambientMuted)}
            title={ambientMuted ? "Activer le son de l'opening" : "Couper le son de l'opening"}
            aria-label="Son du fond d'opening"
            style={{
              width: 30, height: 30, borderRadius: 8, flexShrink: 0, background: 'transparent', border: 'none',
              color: ambientMuted ? 'rgba(255,255,255,0.32)' : '#e8c878', cursor: 'pointer', fontSize: 16,
              display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'color .2s',
            }}
          >
            {ambientMuted ? '🔇' : '🔊'}
          </button>
          {hovered && (
            <input
              type="range" min="0" max="100" value={ambientVolume ?? 45}
              onChange={e => { const v = parseInt(e.target.value); setAmbientVolume(v); if (v === 0) setAmbientMuted(true); else if (ambientMuted) setAmbientMuted(false) }}
              aria-label="Volume du fond d'opening"
              style={{ width: 90, accentColor: '#e8c878', cursor: 'pointer' }}
            />
          )}
        </div>
      )}
    </>
  )
}
