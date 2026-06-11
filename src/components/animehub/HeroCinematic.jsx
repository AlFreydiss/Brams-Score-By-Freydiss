// ── HeroCinematic — hero plein écran façon Netflix ───────────────────────────
// Phase 1 : hero STATIQUE (un anime). La rotation auto 8s + segments arrive en
// Phase 3 (l'API est déjà prête : passer plusieurs slides).
// Full-bleed, double scrim (bas→haut + gauche→droite), le bas FOND dans la page.
import { C, FONT_BODY, FONT_DISPLAY } from './tokens.js'

export default function HeroCinematic({ anime, rating = null, onWatch, onMyList, inList = false, onInfo }) {
  if (!anime) return null
  const keyart = anime.keyart || anime.coverImage

  const meta = [
    rating != null ? `★ ${Number(rating).toFixed(1)}` : null,
    anime.year || null,
    anime.seasons ? `${anime.seasons} saison${anime.seasons > 1 ? 's' : ''}` : null,
  ].filter(Boolean)

  const btn = (filled) => ({
    display: 'inline-flex', alignItems: 'center', gap: 9,
    padding: '12px 22px', borderRadius: 10, cursor: 'pointer',
    fontFamily: FONT_BODY, fontSize: 14.5, fontWeight: 600,
    background: filled ? C.brass : 'rgba(255,255,255,0.08)',
    border: filled ? 'none' : `1px solid ${C.hair2}`,
    color: filled ? '#14110A' : C.text,
    transition: 'background 160ms ease',
  })

  return (
    <section aria-label={`À la une : ${anime.title}`} style={{
      position: 'relative', width: '100%', height: 'min(72vh, 720px)', minHeight: 420,
      fontFamily: FONT_BODY, overflow: 'hidden',
    }}>
      {/* Keyart plein cadre */}
      <img
        src={keyart}
        alt=""
        decoding="async"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: anime.keyartPosition || 'center 20%' }}
      />
      {/* Double scrim : bas→haut (fond dans la page) + gauche→droite (lisibilité) */}
      <div aria-hidden style={{ position: 'absolute', inset: 0, background: `linear-gradient(0deg, ${C.scrim} 0%, rgba(11,14,20,0.6) 28%, transparent 55%)` }} />
      <div aria-hidden style={{ position: 'absolute', inset: 0, background: `linear-gradient(90deg, rgba(11,14,20,0.88) 0%, rgba(11,14,20,0.45) 38%, transparent 68%)` }} />

      {/* Contenu aligné gauche */}
      <div style={{
        position: 'absolute', left: 'clamp(18px, 4vw, 56px)', right: 18, bottom: 'clamp(28px, 7vh, 72px)',
        maxWidth: 560,
      }}>
        <h1 style={{
          margin: 0, fontFamily: FONT_BODY, fontWeight: 800,
          fontSize: 'clamp(30px, 4.2vw, 54px)', lineHeight: 1.04, letterSpacing: '-0.02em', color: C.text,
        }}>{anime.title}</h1>

        {/* Ligne méta : note · année · saisons · genres en pills outline grises */}
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginTop: 14, fontSize: 13.5, color: C.dim }}>
          {meta.map((m, i) => (
            <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
              {i > 0 && <span aria-hidden style={{ color: C.faint }}>·</span>}
              <span style={m.startsWith('★') ? { color: C.brass, fontWeight: 600 } : null}>{m}</span>
            </span>
          ))}
          {(anime.genres || []).slice(0, 3).map(g => (
            <span key={g} style={{ padding: '3px 10px', borderRadius: 999, border: `1px solid ${C.hair2}`, fontSize: 12, color: C.dim }}>{g}</span>
          ))}
        </div>

        {/* Synopsis 2 lignes max */}
        {anime.description && (
          <p style={{
            margin: '14px 0 0', fontSize: 15, lineHeight: 1.55, color: C.dim, maxWidth: 520,
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>{anime.description}</p>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 22, flexWrap: 'wrap' }}>
          <button style={btn(true)} onClick={() => onWatch?.(anime)}
            onMouseEnter={e => { e.currentTarget.style.background = C.brassHi }}
            onMouseLeave={e => { e.currentTarget.style.background = C.brass }}>
            <span aria-hidden style={{ fontSize: 12 }}>▶</span> Regarder
          </button>
          {onMyList && (
            <button style={btn(false)} onClick={() => onMyList(anime)} aria-pressed={inList}>
              {inList ? '✓ Dans ma liste' : '+ Ma liste'}
            </button>
          )}
          {onInfo && (
            <button aria-label="Détails" onClick={() => onInfo(anime)} style={{
              width: 44, height: 44, borderRadius: '50%', cursor: 'pointer',
              background: 'rgba(255,255,255,0.08)', border: `1px solid ${C.hair2}`,
              color: C.text, fontSize: 17, display: 'grid', placeItems: 'center', fontFamily: FONT_DISPLAY,
            }}>ⓘ</button>
          )}
        </div>
      </div>
    </section>
  )
}
