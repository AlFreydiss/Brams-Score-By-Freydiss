// ── AnimeRow — row horizontale embla (Netflix/Crunchyroll) ───────────────────
// Titre Space Grotesk + compteur + « Tout voir › », flèches en bords au hover,
// masques dégradés latéraux pour suggérer la suite. embla-carousel-react gère
// le drag tactile et l'inertie (ne PAS réécrire de carrousel maison).
//
// Deux points de mouvement :
//  · le survol de la row est en CSS (.ah2-row:hover .ah2-nav). En état React,
//    entrer dans une row re-rendait ses vingt cartes à chaque aller-retour.
//  · la row se révèle quand on l'atteint, et non au montage de la page : avant,
//    toutes les entrées jouaient d'un coup au chargement, donc les rows du bas
//    étaient déjà installées quand on arrivait dessus.
import { useCallback, useEffect, useState } from 'react'
import useEmblaCarousel from 'embla-carousel-react'
import { C, sectionTitleStyle, FONT_BODY } from './tokens.js'
import { useReveal } from '../../lib/motion.js'

export default function AnimeRow({ title, count = null, onSeeAll, children }) {
  const [emblaRef, embla] = useEmblaCarousel({ align: 'start', dragFree: true, containScroll: 'trimSnaps' })
  const [canPrev, setCanPrev] = useState(false)
  const [canNext, setCanNext] = useState(false)
  const [revealRef, shown] = useReveal()

  const refresh = useCallback(() => {
    if (!embla) return
    setCanPrev(embla.canScrollPrev())
    setCanNext(embla.canScrollNext())
  }, [embla])

  useEffect(() => {
    if (!embla) return
    refresh()
    embla.on('select', refresh)
    embla.on('reInit', refresh)
    return () => { embla.off('select', refresh); embla.off('reInit', refresh) }
  }, [embla, refresh])

  const arrow = (dir) => ({
    position: 'absolute', top: 0, bottom: 26, [dir < 0 ? 'left' : 'right']: 0, width: 44,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: `linear-gradient(${dir < 0 ? 90 : 270}deg, ${C.bg0} 10%, transparent)`,
    border: 'none', cursor: 'pointer', color: C.text, fontSize: 22, zIndex: 2,
  })

  const mask = `linear-gradient(90deg, ${canPrev ? 'transparent, black 80px' : 'black'}, black calc(100% - 80px), ${canNext ? 'transparent' : 'black'})`

  return (
    <section
      ref={revealRef}
      className={`ah2-row mo-rise${shown ? ' mo-in' : ''}`}
      // padding:0 obligatoire : index.css applique un gros padding vertical
      // global aux <section> (home) — c'était le « vide géant » sous la toolbar.
      style={{ marginBottom: 34, padding: 0, fontFamily: FONT_BODY }}
    >
      {/* En-tête de row */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 14 }}>
        <h2 style={{ ...sectionTitleStyle, margin: 0 }}>{title}</h2>
        {count != null && <span style={{ fontSize: 12.5, color: C.faint }}>{count}</span>}
        {/* Beau trait de séparation doré, prolonge le titre jusqu'au bord */}
        <span aria-hidden style={{ flex: 1, alignSelf: 'center', height: 1, marginLeft: 6, borderRadius: 1, background: `linear-gradient(90deg, ${C.brass}59, ${C.brass}14 45%, transparent)` }} />
        {onSeeAll && (
          <button
            onClick={onSeeAll}
            className="ah2-seeall"
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: FONT_BODY, fontSize: 12.5, fontWeight: 500, color: C.dim, padding: 0 }}
          >Tout voir ›</button>
        )}
      </div>

      {/* Viewport embla + flèches + masques */}
      <div style={{ position: 'relative' }}>
        <div ref={emblaRef} style={{
          overflow: 'hidden',
          // fondu de bord : les cartes coupées fondent au lieu d'être tranchées
          maskImage: mask,
          WebkitMaskImage: mask,
        }}>
          <div style={{ display: 'flex', gap: 14 }}>
            {children}
          </div>
        </div>
        {canPrev && <button className="ah2-nav" aria-label="Défiler à gauche" onClick={() => embla?.scrollPrev()} style={arrow(-1)}>‹</button>}
        {canNext && <button className="ah2-nav" aria-label="Défiler à droite" onClick={() => embla?.scrollNext()} style={arrow(1)}>›</button>}
      </div>
    </section>
  )
}
