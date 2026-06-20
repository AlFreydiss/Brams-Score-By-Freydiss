// ── AnimeCard — LE composant central de la section Animés & Scans v2 ────────
// Affiche portrait 2:3, skeleton pendant le chargement, badge sobre unique,
// hover : scale 1.04 + overlay bas (note, genres, actions icône). La
// progression n'apparaît QUE si > 0 (barre laiton fine en bas de l'affiche).
import { useState } from 'react'
import { C, FONT_BODY, RADIUS_CARD, SHADOW_CARD } from './tokens.js'
import { TitleArt } from './HeroCinematic.jsx'

const KEYART_R2 = 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/anime/keyart'

// ── BackdropCard — carte PAYSAGE 16:9 des rows (réf. Netflix web) ────────────
// Image backdrop (convention R2 anime/keyart/<id>.jpg, fallback affiche),
// title-art ou titre en bas-gauche, badge « NOUVEL ÉPISODE » laiton si à jour.
export function BackdropCard({ anime, progressPct = 0, width = 300, onOpen }) {
  const [hover, setHover] = useState(false)
  const [bdBroken, setBdBroken] = useState(false)
  const backdrop = bdBroken ? (anime.coverImage) : (anime.backdropUrl || `${KEYART_R2}/${anime.id}.jpg`)
  const fresh = anime.badge === 'À JOUR' || anime.badge === 'NOUVEAU'
  return (
    <div
      role="button" tabIndex={0} aria-label={anime.title} className="ah2-card"
      onClick={() => onOpen?.(anime)}
      onKeyDown={e => { if (e.key === 'Enter') onOpen?.(anime) }}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ width, flexShrink: 0, cursor: 'pointer', fontFamily: FONT_BODY, outline: 'none' }}
    >
      <div style={{
        position: 'relative', aspectRatio: '16 / 9', borderRadius: RADIUS_CARD, overflow: 'hidden',
        background: 'rgba(255,255,255,0.04)',
        transform: hover ? 'scale(1.04)' : 'scale(1)',
        boxShadow: hover ? SHADOW_CARD : 'none',
        transition: 'transform 180ms ease, box-shadow 180ms ease',
      }}>
        <img
          src={backdrop} alt="" loading="lazy" decoding="async"
          onError={() => setBdBroken(true)}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: anime.coverPosition || 'center 25%' }}
        />
        {/* Scrim bas : titre lisible même sur backdrop clair (Your Name) */}
        <div aria-hidden style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 55%, rgba(11,14,20,.8))' }} />
        {/* Bas-gauche : title-art (fallback titre) + badge épisode */}
        <div style={{ position: 'absolute', left: 10, right: 10, bottom: 10 }}>
          <TitleArt anime={anime} maxWidth={width * 0.62} maxHeight={44} fallback={
            <span style={{ fontSize: 14, fontWeight: 700, color: C.text, textShadow: '0 1px 6px rgba(0,0,0,.7)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{anime.title}</span>
          } />
          {fresh && (
            <span style={{
              display: 'inline-block', marginTop: 7, padding: '3px 8px', borderRadius: 4,
              background: C.brass, color: '#14110A', fontSize: 10, fontWeight: 800, letterSpacing: '0.02em',
            }}>NOUVEL ÉPISODE</span>
          )}
        </div>
        {progressPct > 0 && (
          <div aria-hidden style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 3, background: 'rgba(255,255,255,0.15)' }}>
            <div style={{ width: `${Math.min(100, progressPct)}%`, height: '100%', background: C.brass }} />
          </div>
        )}
      </div>
    </div>
  )
}

export default function AnimeCard({
  anime,            // { id, title, coverImage, coverPosition, genres, year, type, badge }
  progressPct = 0,  // 0-100 (affiché seulement si > 0)
  rating = null,    // note moyenne (★) ou null
  width = 180,      // largeur de la carte (les rows fixent leur taille)
  onOpen,           // ouvrir la fiche / page anime
  onPlay,           // lecture directe (optionnel)
  onToggleList,     // + ma liste / favori (optionnel)
  inList = false,
}) {
  const [hover, setHover] = useState(false)
  const [loaded, setLoaded] = useState(false)

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={anime.title}
      onClick={() => onOpen?.(anime)}
      onKeyDown={e => { if (e.key === 'Enter') onOpen?.(anime) }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ width, flexShrink: 0, cursor: 'pointer', fontFamily: FONT_BODY, outline: 'none' }}
      className="ah2-card"
    >
      {/* Affiche 2:3 */}
      <div style={{
        position: 'relative', aspectRatio: '2 / 3', borderRadius: RADIUS_CARD, overflow: 'hidden',
        background: 'rgba(255,255,255,0.04)',
        transform: hover ? 'scale(1.04)' : 'scale(1)',
        boxShadow: hover ? SHADOW_CARD : 'none',
        transition: 'transform 180ms ease, box-shadow 180ms ease',
      }}>
        {/* Skeleton shimmer tant que l'image n'est pas là */}
        {!loaded && (
          <div aria-hidden style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(100deg, rgba(255,255,255,0.04) 40%, rgba(255,255,255,0.09) 50%, rgba(255,255,255,0.04) 60%)',
            backgroundSize: '200% 100%', animation: 'ah2-shimmer 1.4s linear infinite',
          }} />
        )}
        <img
          src={anime.coverImage}
          alt=""
          loading="lazy" decoding="async"
          onLoad={() => setLoaded(true)}
          style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%',
            objectFit: 'cover', objectPosition: anime.coverPosition || 'center',
            opacity: loaded ? 1 : 0, transition: 'opacity 240ms ease',
          }}
        />

        {/* Badge coin haut — UN seul, sobre (pill blanche 10%, bordure fine) */}
        {anime.badge && (
          <span style={{
            position: 'absolute', top: 8, left: 8,
            padding: '3px 8px', borderRadius: 6,
            background: 'rgba(255,255,255,0.10)', border: `1px solid ${C.hair2}`,
            backdropFilter: 'blur(4px)',
            fontSize: 10, fontWeight: 600, letterSpacing: '0.04em', color: C.text,
          }}>{anime.badge}</span>
        )}

        {/* Overlay hover : dégradé bas + note/genres + actions */}
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
          background: 'linear-gradient(180deg, transparent 45%, rgba(11,14,20,0.92) 100%)',
          opacity: hover ? 1 : 0, transition: 'opacity 180ms ease',
          padding: 10, pointerEvents: hover ? 'auto' : 'none',
        }}>
          <div style={{ fontSize: 11.5, color: C.dim, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            {rating != null && <span style={{ color: C.brass, fontWeight: 600 }}>★ {Number(rating).toFixed(1)}</span>}
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {(anime.genres || []).slice(0, 2).join(' · ')}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              aria-label={`Regarder ${anime.title}`}
              onClick={e => { e.stopPropagation(); (onPlay || onOpen)?.(anime) }}
              style={{
                width: 34, height: 34, borderRadius: 8, cursor: 'pointer',
                background: C.brass, border: 'none', color: '#14110A',
                fontSize: 13, display: 'grid', placeItems: 'center', fontWeight: 700,
              }}
            >▶</button>
            {onToggleList && (
              <button
                aria-label={inList ? 'Retirer de ma liste' : 'Ajouter à ma liste'}
                onClick={e => { e.stopPropagation(); onToggleList(anime) }}
                style={{
                  width: 34, height: 34, borderRadius: 8, cursor: 'pointer',
                  background: 'rgba(255,255,255,0.08)', border: `1px solid ${C.hair2}`,
                  color: inList ? C.brass : C.text, fontSize: 15, display: 'grid', placeItems: 'center',
                }}
              >{inList ? '✓' : '+'}</button>
            )}
          </div>
        </div>

        {/* Progression — UNIQUEMENT si > 0 */}
        {progressPct > 0 && (
          <div aria-hidden style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 3, background: 'rgba(255,255,255,0.15)' }}>
            <div style={{ width: `${Math.min(100, progressPct)}%`, height: '100%', background: C.brass }} />
          </div>
        )}
      </div>

      {/* Sous la carte : titre + méta */}
      <div style={{ marginTop: 8, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {anime.title}
        </div>
        <div style={{ fontSize: 11.5, color: C.faint, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {[anime.year, anime.type || 'Série'].filter(Boolean).join(' · ')}
        </div>
      </div>
    </div>
  )
}
