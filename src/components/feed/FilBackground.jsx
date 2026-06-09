// Fond dédié à la section « Le Fil » — sobre, premium, identité propre (bleu-nuit
// légèrement violacé + lueur dorée discrète + texture scanlines + vignette + fondus).
// Inline styles uniquement. Fixe sous la navbar, derrière le contenu (z-index 0).
const NAV_H = 72

// COUCHE 1 — base profonde (bleu-nuit violacé, distinct du noir pur du reste du site)
const BASE = 'linear-gradient(180deg, #08080e 0%, #0d0b14 50%, #0a0a10 100%)'
// COUCHE 2 — lueur dorée top-center (référence One Piece douce)
const GOLD_GLOW = 'radial-gradient(ellipse 60% 25% at 50% 0%, rgba(245,181,10,0.06) 0%, transparent 100%)'
// COUCHE 3 — scanlines ultra-fines (texture parchemin/journal)
const SCANLINE_SVG = `data:image/svg+xml,${encodeURIComponent(
  "<svg xmlns='http://www.w3.org/2000/svg' width='4' height='3'><line x1='0' y1='0.5' x2='4' y2='0.5' stroke='rgba(255,255,255,0.018)' stroke-width='0.5'/></svg>"
)}`
// COUCHE 4 — vignette latérale (concentre le regard au centre)
const SIDE_VIGNETTE = 'linear-gradient(90deg, rgba(0,0,0,0.4) 0%, transparent 20%, transparent 80%, rgba(0,0,0,0.4) 100%)'

const layer = { position: 'absolute', inset: 0, pointerEvents: 'none' }

export default function FilBackground() {
  return (
    <div aria-hidden style={{ position: 'fixed', top: NAV_H, left: 0, right: 0, bottom: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      <div style={{ ...layer, background: BASE }} />
      <div style={{ ...layer, background: GOLD_GLOW }} />
      <div style={{ ...layer, backgroundImage: `url("${SCANLINE_SVG}")`, backgroundSize: '100% 3px', opacity: 1 }} />
      <div style={{ ...layer, background: SIDE_VIGNETTE }} />
      {/* COUCHE 5 — fondus haut/bas pour fondre la section dans la page */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 80, background: 'linear-gradient(180deg, #08080e 0%, transparent 100%)' }} />
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 80, background: 'linear-gradient(0deg, #08080e 0%, transparent 100%)' }} />
    </div>
  )
}
