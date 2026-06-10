import { useEffect, useRef, useState } from 'react'
import { useCart } from '../../contexts/CartContext.jsx'
import { startTimeOf } from '../../hooks/useHoverVideo.js'
import { openingBgPriceCents, openingBgPriceLabel } from '../../lib/openingBgPricing.js'

// Carte « fond d'opening » format VITRINE : grand aperçu vidéo en haut,
// infos + actions en dessous. Toutes les dimensions viennent des constantes
// ci-dessous (aucune taille en dur dans le JSX).
// PERF (134 vidéos) : src monté seulement près du viewport, retiré quand la
// carte s'éloigne ; autoplay muet à l'écran ; mobile = poster, tap = aperçu.

export const CARD_WIDTH = 280 // largeur cible d'une carte (px)
export const CARD_MIN_WIDTH = 260 // largeur mini pour le grid responsive (px)
export const CARD_IMG_HEIGHT = 200 // hauteur de l'aperçu du fond (px)
export const CARD_GAP = 20 // espace entre les cartes (px)
export const CARD_RADIUS = 14 // arrondi des cartes (px)
export const CARD_TITLE_SIZE = 16 // taille du titre (px)
export const CARD_SUB_SIZE = 13 // taille du sous-titre / anime (px)

const ICON_BTN = 38 // boutons cadeau / agrandir (px)

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

export default function FondCard({ bg, owned, equipped, equipCount = 0, onSelect, onPreview, onEquip, onGift, fluid = false }) {
  const color = RARITY_COLORS[bg.rarity] || RARITY_COLORS.Commun
  const cardRef = useRef(null)
  const videoRef = useRef(null)
  const [inView, setInView] = useState(false)
  const [hover, setHover] = useState(false)
  const [failed, setFailed] = useState(false)
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

  const showVideo = Boolean(bg.videoUrl) && !failed && inView && !isCoarse && !noMotion
  const t0 = startTimeOf(bg.videoUrl || '')

  const badge = (text, c, extra = {}) => (
    <span style={{
      fontSize: 10, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase',
      color: c, background: 'rgba(8,9,13,0.62)', border: `1px solid ${c}55`,
      padding: '3px 9px', borderRadius: 999, backdropFilter: 'blur(4px)', ...extra,
    }}>{text}</span>
  )

  return (
    <div
      ref={cardRef}
      onClick={onCard}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      tabIndex={0}
      role="button"
      aria-label={`${bg.opTitle} — ${bg.anime}`}
      style={{
        // fluid = grille responsive (la colonne dicte la largeur) ; sinon slide fixe.
        width: fluid ? '100%' : CARD_WIDTH,
        flex: fluid ? undefined : `0 0 ${CARD_WIDTH}px`,
        flexShrink: fluid ? undefined : 0,
        borderRadius: CARD_RADIUS,
        overflow: 'hidden',
        cursor: 'pointer',
        background: 'linear-gradient(180deg, rgba(20,22,30,0.92), rgba(12,13,18,0.95))',
        border: `1px solid ${equipped ? `${color}66` : HAIR}`,
        transform: hover && !noMotion ? 'translateY(-4px)' : 'none',
        boxShadow: hover ? `0 14px 36px -10px ${color}55` : '0 8px 22px rgba(0,0,0,.4)',
        transition: noMotion ? 'none' : 'transform .25s cubic-bezier(.2,.7,.3,1), box-shadow .25s ease, border-color .25s ease',
      }}
    >
      {/* Aperçu — pleine largeur, hauteur fixe, arrondi en haut (hérité du overflow). */}
      <div style={{ position: 'relative', width: '100%', height: CARD_IMG_HEIGHT, background: `linear-gradient(160deg, ${bg.overlayStart || '#1a1320'}, ${bg.overlayEnd || '#0a0810'})` }}>
        {showVideo && (
          <video
            ref={videoRef}
            src={bg.videoUrl}
            muted
            loop
            autoPlay
            playsInline
            preload="metadata"
            onLoadedMetadata={e => { try { if (e.currentTarget.currentTime < 0.1) e.currentTarget.currentTime = t0 } catch {} }}
            onError={() => setFailed(true)}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
          />
        )}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 60%, rgba(0,0,0,.42) 100%)' }} />
        {/* Badge rareté (haut-gauche) + statut (haut-droite) */}
        <div style={{ position: 'absolute', top: 10, left: 10 }}>{badge(RARITY_LABELS[bg.rarity] || bg.rarity, color)}</div>
        {(equipped || owned) && (
          <div style={{ position: 'absolute', top: 10, right: 10 }}>
            {badge(equipped ? '✓ Équipé' : 'Possédé', equipped ? '#7fd6a0' : GOLD)}
          </div>
        )}
      </div>

      {/* Corps : titre, anime, actions. */}
      <div style={{ padding: '12px 14px 14px' }}>
        <div style={{ fontSize: CARD_TITLE_SIZE, fontWeight: 800, color: '#fff', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{bg.opTitle}</div>
        <div style={{ fontSize: CARD_SUB_SIZE, color: 'rgba(255,255,255,0.58)', marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {bg.anime}{equipCount > 0 ? ` · ${equipCount} équipé${equipCount > 1 ? 's' : ''}` : ''}
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          {equipped ? (
            <span style={{ flex: 1, textAlign: 'center', fontSize: 13, fontWeight: 800, color: '#7fd6a0', padding: '9px 0' }}>Équipé</span>
          ) : owned ? (
            <button onClick={e => { e.stopPropagation(); onEquip(bg) }}
              style={{ flex: 1, fontSize: 13, fontWeight: 800, color: '#0b0c0e', background: GOLD, border: 'none', borderRadius: 10, padding: '9px 0', cursor: 'pointer' }}>Équiper</button>
          ) : (
            <button onClick={e => { e.stopPropagation(); inCart ? cart.setOpen(true) : cart.add(cartItem) }}
              style={{ flex: 1, fontSize: 13, fontWeight: 800, color: '#0b0c0e', background: inCart ? '#7fd6a0' : GOLD, border: 'none', borderRadius: 10, padding: '9px 0', cursor: 'pointer', whiteSpace: 'nowrap', overflow: 'hidden' }}>
              {inCart ? '✓ Panier' : `+ ${priceLabel}`}
            </button>
          )}
          {!owned && onGift && (
            <button aria-label="Offrir" title="Offrir à un membre" onClick={e => { e.stopPropagation(); onGift(bg) }}
              style={{ flexShrink: 0, width: ICON_BTN, height: ICON_BTN, display: 'grid', placeItems: 'center', borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: `1px solid ${HAIR}`, color: GOLD, cursor: 'pointer', fontSize: 16 }}>🎁</button>
          )}
          <button aria-label="Aperçu plein écran" onClick={e => { e.stopPropagation(); onPreview(bg) }}
            style={{ flexShrink: 0, width: ICON_BTN, height: ICON_BTN, display: 'grid', placeItems: 'center', borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: `1px solid ${HAIR}`, color: 'rgba(255,255,255,0.78)', cursor: 'pointer', fontSize: 15 }}>⛶</button>
        </div>
      </div>
    </div>
  )
}
