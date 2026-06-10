import { useEffect, useRef, useState } from 'react'
import { useCart } from '../../contexts/CartContext.jsx'
import { useHoverVideo, startTimeOf } from '../../hooks/useHoverVideo.js'
import { openingBgPriceCents, openingBgPriceLabel } from '../../lib/openingBgPricing.js'

// Carte « fond d'opening » pour les rangées Netflix. 200px, ratio 3:4.
// PERF (134 vidéos) : src monté seulement quand la carte est visible, retiré
// quand elle sort largement du viewport ; lecture au survol uniquement (desktop),
// 1 seule vidéo en lecture à la fois (useHoverVideo). Mobile : poster, tap = aperçu.

const CARD_W = 200
const CARD_RATIO = 3 / 4 // largeur / hauteur

const RARITY_COLORS = {
  Commun: '#8a93a6', Rare: '#5481d6', Epique: '#9170c8', Legendaire: '#c9a227',
  Mythique: '#c77dc4', Secret: '#c8313b', Interdit: '#b1413d',
}
const RARITY_LABELS = {
  Commun: 'Commun', Rare: 'Rare', Epique: 'Épique', Legendaire: 'Légendaire',
  Mythique: 'Mythique', Secret: 'Secret', Interdit: 'Interdit',
}

const GOLD = '#bfa46a'
const HAIR = 'rgba(255,255,255,0.08)'

const coarse = () => typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches
const reduced = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

export default function FondCard({ bg, owned, equipped, equipCount = 0, onSelect, onPreview, onEquip, onGift }) {
  const color = RARITY_COLORS[bg.rarity] || RARITY_COLORS.Commun
  const cardRef = useRef(null)
  const [inView, setInView] = useState(false)
  const [hover, setHover] = useState(false)
  const [failed, setFailed] = useState(false)
  const hv = useHoverVideo()
  const isCoarse = coarse()
  const noMotion = reduced()

  // Lazy strict : src monté quand visible (±300px), démonté quand loin (±900px).
  useEffect(() => {
    const el = cardRef.current
    if (!el || typeof IntersectionObserver === 'undefined') { setInView(true); return }
    const ioIn = new IntersectionObserver(([e]) => { if (e.isIntersecting) setInView(true) }, { rootMargin: '300px 0px' })
    const ioOut = new IntersectionObserver(([e]) => { if (!e.isIntersecting) setInView(false) }, { rootMargin: '900px 0px' })
    ioIn.observe(el); ioOut.observe(el)
    return () => { ioIn.disconnect(); ioOut.disconnect() }
  }, [])

  const cart = useCart()
  const inCart = cart.has(bg.id)
  const cartItem = { id: bg.id, label: bg.opTitle, emoji: '🎞️', priceCents: openingBgPriceCents(bg), rarity: bg.rarity }
  const priceLabel = openingBgPriceLabel(bg)

  // Mobile : tap = aperçu plein écran. Desktop : possédé → sélection hero, sinon panier.
  const onCard = () => {
    if (isCoarse) { onPreview(bg); return }
    if (owned || equipped) onSelect(bg)
    else if (!inCart) cart.add(cartItem)
    else cart.setOpen(true)
  }

  const enter = () => setHover(true)
  const leave = () => setHover(false)

  // Les cartes VIVENT : autoplay muet dès qu'elles sont à l'écran (desktop).
  // Le lazy mount/unmount (IntersectionObserver) borne le nombre de décodages.
  const showVideo = Boolean(bg.videoUrl) && !failed && inView && !isCoarse && !noMotion
  const t0 = startTimeOf(bg.videoUrl || '')

  return (
    <div
      ref={cardRef}
      onClick={onCard}
      onMouseEnter={enter}
      onMouseLeave={leave}
      onFocus={() => !isCoarse && hv.onFocus()}
      onBlur={() => !isCoarse && hv.onBlur()}
      tabIndex={0}
      role="button"
      aria-label={`${bg.opTitle} — ${bg.anime}`}
      style={{
        position: 'relative',
        flex: `0 0 ${CARD_W}px`,
        width: CARD_W,
        aspectRatio: `${CARD_RATIO}`,
        borderRadius: 12,
        overflow: 'hidden',
        cursor: 'pointer',
        border: `1px solid ${equipped ? `${color}66` : HAIR}`,
        transform: hover && !noMotion ? 'scale(1.04)' : 'none',
        boxShadow: hover ? `0 12px 32px -8px ${color}59` : '0 8px 22px rgba(0,0,0,.4)',
        transition: noMotion ? 'none' : 'transform .25s cubic-bezier(.2,.7,.3,1), box-shadow .25s ease, border-color .25s ease',
        background: `linear-gradient(160deg, ${bg.overlayStart || '#1a1320'}, ${bg.overlayEnd || '#0a0810'})`,
      }}
    >
      {/* Média */}
      {showVideo && (
        <video
          ref={hv.videoRef}
          src={bg.videoUrl}
          muted
          loop
          playsInline
          preload="metadata"
          onLoadedMetadata={e => { try { if (e.currentTarget.currentTime < 0.1) e.currentTarget.currentTime = t0 } catch {} }}
          onError={() => setFailed(true)}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        />
      )}
      {/* Dégradé bas pour la lisibilité */}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 42%, rgba(0,0,0,.4) 68%, rgba(0,0,0,.78) 100%)' }} />

      {/* Badge rareté */}
      <span style={{
        position: 'absolute', top: 8, left: 8, zIndex: 2,
        fontSize: 9, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase',
        color, background: 'rgba(8,9,13,0.6)', border: `1px solid ${color}55`,
        padding: '2px 7px', borderRadius: 999, backdropFilter: 'blur(4px)',
      }}>{RARITY_LABELS[bg.rarity] || bg.rarity}</span>

      {/* Badge possédé / équipé */}
      {(equipped || owned) && (
        <span style={{
          position: 'absolute', top: 8, right: 8, zIndex: 2,
          fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 999,
          color: equipped ? '#7fd6a0' : GOLD,
          background: 'rgba(8,9,13,0.6)',
          border: `1px solid ${equipped ? 'rgba(127,214,160,0.4)' : `${GOLD}44`}`,
          backdropFilter: 'blur(4px)',
        }}>{equipped ? '✓ Équipé' : 'Possédé'}</span>
      )}

      {/* Pied : titre + anime + bouton */}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 2, padding: '10px 10px 11px' }}>
        <div style={{ fontSize: 13.5, fontWeight: 800, color: '#fff', lineHeight: 1.15, textShadow: '0 2px 8px rgba(0,0,0,.8)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{bg.opTitle}</div>
        <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.6)', marginTop: 1, textShadow: '0 1px 6px rgba(0,0,0,.85)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{bg.anime}{equipCount > 0 ? ` · ${equipCount} équipé${equipCount > 1 ? 's' : ''}` : ''}</div>

        <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
          {equipped ? (
            <span style={{ flex: 1, textAlign: 'center', fontSize: 11.5, fontWeight: 800, color: '#7fd6a0', padding: '7px 0' }}>Équipé</span>
          ) : owned ? (
            <button onClick={e => { e.stopPropagation(); onEquip(bg) }}
              style={{ flex: 1, fontSize: 11.5, fontWeight: 800, color: '#0b0c0e', background: GOLD, border: 'none', borderRadius: 8, padding: '7px 0', cursor: 'pointer' }}>Équiper</button>
          ) : (
            <button onClick={e => { e.stopPropagation(); inCart ? cart.setOpen(true) : cart.add(cartItem) }}
              style={{ flex: 1, fontSize: 11.5, fontWeight: 800, color: '#0b0c0e', background: inCart ? '#7fd6a0' : GOLD, border: 'none', borderRadius: 8, padding: '7px 0', cursor: 'pointer', whiteSpace: 'nowrap', overflow: 'hidden' }}>
              {inCart ? '✓ Panier' : `+ ${priceLabel}`}
            </button>
          )}
          {!owned && onGift && (
            <button aria-label="Offrir" title="Offrir à un membre" onClick={e => { e.stopPropagation(); onGift(bg) }}
              style={{ flexShrink: 0, width: 30, height: 30, display: 'grid', placeItems: 'center', borderRadius: 8, background: 'rgba(0,0,0,0.45)', border: `1px solid ${HAIR}`, color: GOLD, cursor: 'pointer', fontSize: 13 }}>🎁</button>
          )}
          <button aria-label="Aperçu plein écran" onClick={e => { e.stopPropagation(); onPreview(bg) }}
            style={{ flexShrink: 0, width: 30, height: 30, display: 'grid', placeItems: 'center', borderRadius: 8, background: 'rgba(0,0,0,0.45)', border: `1px solid ${HAIR}`, color: 'rgba(255,255,255,0.78)', cursor: 'pointer', fontSize: 12 }}>⛶</button>
        </div>
      </div>
    </div>
  )
}
