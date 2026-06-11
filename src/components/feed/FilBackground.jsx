// Fond dédié à la section « Le Fil » — sobre, premium, identité propre (bleu-nuit
// légèrement violacé + lueur dorée discrète + particules or + texture scanlines +
// vignette + fondus). Inline styles uniquement. Fixe sous la navbar (z-index 0).
import { useMemo } from 'react'
import ParticleField from './ParticleField.jsx'

const NAV_H = 72

// Décors générés (Flux + vidéos Grok de Freydiss) sur R2 — un au hasard par
// visite, fondu dans le haut du fond, très discret (l'ambiance, pas le sujet).
// Les .mp4 sont rendus en <video> muted/loop (2-3 Mo, egress R2 gratuit).
const R2 = 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/fil-bg'
const HERO_BGS = [
  `${R2}/fil01.jpg`,  // galion au clair de lune
  `${R2}/fil02.jpg`,  // carte au trésor
  `${R2}/fil03.jpg`,  // compas doré
  `${R2}/fil04.jpg`,  // kraken
  `${R2}/fil05.jpg`,  // chapeau de paille
  `${R2}/vid01.mp4`,  // vidéos Grok Imagine
  `${R2}/vid02.mp4`,
  `${R2}/vid03.mp4`,
  `${R2}/vid04.mp4`,
  `${R2}/vid05.mp4`,
]
const isVideoBg = (u) => /\.mp4$/i.test(u)

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
  const heroBg = useMemo(() => HERO_BGS[Math.floor(Math.random() * HERO_BGS.length)], [])
  return (
    <div aria-hidden style={{ position: 'fixed', top: NAV_H, left: 0, right: 0, bottom: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      <div style={{ ...layer, background: BASE }} />
      {/* Décor illustré en haut, fondu vers le fond uni (masque) — reste sous les
          autres couches (vignette/scanlines) pour garder la sobriété du Fil. */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: '52vh', overflow: 'hidden',
        opacity: 0.34,
        maskImage: 'linear-gradient(180deg, black 0%, black 35%, transparent 100%)',
        WebkitMaskImage: 'linear-gradient(180deg, black 0%, black 35%, transparent 100%)',
      }}>
        {isVideoBg(heroBg) ? (
          <video src={heroBg} muted loop autoPlay playsInline preload="metadata"
            style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 30%' }} />
        ) : (
          <div style={{ position: 'absolute', inset: 0, backgroundImage: `url("${heroBg}")`, backgroundSize: 'cover', backgroundPosition: 'center 30%' }} />
        )}
      </div>
      <div style={{ ...layer, background: GOLD_GLOW }} />
      {/* Particules or dérivantes — l'ambiance, pas le sujet */}
      <ParticleField style={{ ...layer, opacity: 0.5 }} />
      <div style={{ ...layer, backgroundImage: `url("${SCANLINE_SVG}")`, backgroundSize: '100% 3px', opacity: 1 }} />
      <div style={{ ...layer, background: SIDE_VIGNETTE }} />
      {/* COUCHE 5 — fondus haut/bas pour fondre la section dans la page */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 80, background: 'linear-gradient(180deg, #08080e 0%, transparent 100%)' }} />
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 80, background: 'linear-gradient(0deg, #08080e 0%, transparent 100%)' }} />
    </div>
  )
}
