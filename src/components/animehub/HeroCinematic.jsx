// ── HeroCinematic — hero plein écran façon Netflix ───────────────────────────
// Phase 1 : hero STATIQUE (un anime). La rotation auto 8s + segments arrive en
// Phase 3 (l'API est déjà prête : passer plusieurs slides).
// Full-bleed, double scrim (bas→haut + gauche→droite), le bas FOND dans la page.
import { useEffect, useState } from 'react'
import { C, FONT_BODY, FONT_DISPLAY, themeFor, onAccent, rgba } from './tokens.js'

// Audit dev des keyarts : un log par fichier (largeur native + alerte < 1920px)
const keyartLogged = new Set()

// Title-art officiel (PNG transparent déposé sur R2 logos/<id>.png) avec
// fallback automatique sur le titre texte si le logo n'existe pas (onError).
export const LOGOS_R2 = 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/anime/logos'

export function TitleArt({ anime, maxWidth = 560, maxHeight = 210, fallback }) {
  const [broken, setBroken] = useState(false)
  const url = anime.logoUrl || `${LOGOS_R2}/${anime.id}.png`
  if (broken) return fallback
  return (
    <img loading="lazy" decoding="async"
      src={url} alt={anime.title}
      onError={() => setBroken(true)}
      style={{ maxWidth, maxHeight, width: 'auto', height: 'auto', display: 'block', filter: 'drop-shadow(0 4px 18px rgba(0,0,0,.55))' }}
    />
  )
}

export default function HeroCinematic({ anime, rating = null, topRank = null, onWatch, onMyList, inList = false, onInfo }) {
  const keyart = anime ? (anime.keyart || anime.coverImage) : null
  // Dimensions natives du keyart courant — pilote le fallback anti-étirement
  const [nat, setNat] = useState(null)
  useEffect(() => { setNat(null) }, [keyart])

  // Preload du keyart du slide actif (le navigateur le charge en priorité)
  useEffect(() => {
    if (!keyart) return
    const link = document.createElement('link')
    link.rel = 'preload'
    link.as = 'image'
    link.href = keyart
    document.head.appendChild(link)
    return () => { try { document.head.removeChild(link) } catch {} }
  }, [keyart])

  if (!anime) return null

  // Thème par animé : accent + police d'affichage (le chrome suit l'œuvre)
  const theme = themeFor(anime)
  const accentText = onAccent(theme.accent)

  const onKeyartLoad = (e) => {
    const { naturalWidth: w, naturalHeight: h } = e.currentTarget
    setNat({ w, h })
    if (import.meta.env.DEV && !keyartLogged.has(keyart)) {
      keyartLogged.add(keyart)
      const warn = w < 1920 ? ` ⚠️ < 1920px — À REMPLACER sur R2` : ''
      console.log(`[hero keyart] ${anime.title}: ${w}x${h}px${warn}`)
    }
  }
  // Jamais d'étirement au-delà du natif : si le fichier est trop petit pour le
  // hero (largeur < 1920 ou bandeau peu haut type bannière AniList 1900x400),
  // fond flouté + image nette centrée à sa taille max en attendant le remplacement.
  const lowRes = nat != null && (nat.w < 1920 || nat.h < 720)

  const meta = [
    rating != null ? `★ ${Number(rating).toFixed(1)}` : null,
    anime.year || null,
    anime.seasons ? `${anime.seasons} saison${anime.seasons > 1 ? 's' : ''}` : null,
  ].filter(Boolean)

  const btn = (filled) => ({
    display: 'inline-flex', alignItems: 'center', gap: 9,
    padding: '12px 22px', borderRadius: 10, cursor: 'pointer',
    fontFamily: FONT_BODY, fontSize: 14.5, fontWeight: 600,
    background: filled ? theme.accent : 'rgba(255,255,255,0.08)',
    border: filled ? 'none' : `1px solid ${C.hair2}`,
    color: filled ? accentText : C.text,
    transition: 'background 160ms ease, filter 160ms ease',
  })

  return (
    <section aria-label={`À la une : ${anime.title}`} className="ah2-hero" style={{
      position: 'relative', width: '100%',
      padding: 0, fontFamily: FONT_BODY, overflow: 'hidden',
    }}>
      {/* Keyart plein cadre — fichier R2 servi tel quel (aucun resize/compression
          côté code, le seul filtre est un saturate CSS non destructif) */}
      {/* Le keyart FOND dans la page via un masque (plus de bande opaque qui
          tranche entre l'image et le contenu — la transition est continue). */}
      <div aria-hidden style={{
        position: 'absolute', inset: 0,
        // L'image est complètement éteinte AVANT la fin du hero (94%) : le bas du
        // hero et le haut du contenu montrent exactement le même fond de page →
        // aucune couture possible.
        WebkitMaskImage: 'linear-gradient(180deg, #000 45%, rgba(0,0,0,.85) 62%, rgba(0,0,0,.35) 80%, transparent 94%)',
        maskImage: 'linear-gradient(180deg, #000 45%, rgba(0,0,0,.85) 62%, rgba(0,0,0,.35) 80%, transparent 94%)',
      }}>
        {lowRes && (
          <img loading="lazy" decoding="async"
            src={keyart} alt="" aria-hidden
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(30px) saturate(1.05)', transform: 'scale(1.1)' }}
          />
        )}
        <img loading="lazy" decoding="async"
          src={keyart}
          alt=""
          onLoad={onKeyartLoad}
          style={lowRes ? {
            position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            maxWidth: nat.w, maxHeight: '100%', width: 'auto', height: 'auto', filter: 'saturate(1.05)',
          } : { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: anime.keyartPosition || 'center 20%', filter: 'saturate(1.05)' }}
        />
      </div>
      {/* Scrim gauche (lisibilité du synopsis) + voile bas LÉGER (le masque fait
          le gros du fondu) + lueur d'accent au ras du contenu. */}
      <div aria-hidden style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, rgba(11,14,20,.78), rgba(11,14,20,.45) 38%, transparent 62%)' }} />
      {/* Voile bas qui se RELÂCHE à 100% : il assombrit la zone texte/indicateurs
          puis redevient transparent au ras du bord — pas de marche avec la page. */}
      <div aria-hidden style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 300, background: 'linear-gradient(180deg, transparent 0%, rgba(9,12,19,.5) 42%, rgba(9,12,19,.52) 70%, transparent 100%)' }} />
      <div aria-hidden style={{ position: 'absolute', left: 0, right: 0, bottom: 40, height: 220, background: `radial-gradient(55% 110% at 18% 80%, ${rgba(theme.accent, 0.08)}, transparent 70%)` }} />

      {/* Contenu aligné gauche */}
      <div style={{
        // aligné sur le conteneur commun (1320px / 24px de padding latéral) ;
        // bottom haut : la première row vient chevaucher le bas du hero (-120px)
        position: 'absolute', left: 'max(24px, calc((100vw - 1320px) / 2 + 24px))', right: 18, bottom: 'clamp(150px, 22vh, 220px)',
        maxWidth: 560,
      }}>
        {/* Eyebrow de marque : mark épées laiton + type (seule exception capitales espacées) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <span aria-hidden style={{ color: theme.accent, fontSize: 16, lineHeight: 1 }}>⚔</span>
          <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.22em', color: C.dim }}>
            {anime.type === 'Film' ? 'FILM' : 'SÉRIE'}
          </span>
        </div>

        {/* Title-art officiel si dispo, sinon titre texte */}
        <TitleArt anime={anime} fallback={
          <h1 style={{
            margin: 0, fontFamily: theme.font,
            fontWeight: theme.font === FONT_DISPLAY || theme.font.includes('Unbounded') ? 700 : 400,
            // Tailles calibrées par famille : les condensées (Bebas/Anton) encaissent
            // du très grand, les larges (Unbounded/Bungee) doivent rester contenues
            // sinon « Kaguya-sama: Love is War » déborde et fait cheap.
            fontSize: theme.font.includes('Unbounded') ? 'clamp(24px, 3vw, 42px)'
              : theme.font.includes('Bungee') ? 'clamp(34px, 4.4vw, 60px)'
              : /Russo|Audiowide|Special/.test(theme.font) ? 'clamp(30px, 3.8vw, 54px)'
              : theme.font === FONT_DISPLAY ? 'clamp(32px, 4.2vw, 56px)'
              : 'clamp(40px, 5.4vw, 74px)',
            lineHeight: theme.font.includes('Unbounded') ? 1.14 : 1.02,
            letterSpacing: /Bebas|Anton/.test(theme.font) ? '0.02em' : /Bungee|Audiowide/.test(theme.font) ? '0.01em' : '-0.01em',
            // Titre façon logo : haut blanc pour le punch, la couleur de l'œuvre
            // prend la moitié basse (rendu logo officiel, pas texte teinté).
            background: `linear-gradient(180deg, #FFFFFF 0%, #FFFFFF 28%, ${theme.accent2} 55%, ${theme.accent} 100%)`,
            WebkitBackgroundClip: 'text', backgroundClip: 'text',
            WebkitTextFillColor: 'transparent', color: 'transparent',
            filter: `drop-shadow(0 3px 10px rgba(0,0,0,.55)) drop-shadow(0 0 26px ${rgba(theme.accent, 0.38)})`,
            paddingBottom: '0.08em', // les descendantes (g, y) se font rogner par background-clip sinon
          }}>{anime.title}</h1>
        } />

        {/* Badge classement façon Netflix */}
        {topRank != null && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginTop: 16 }}>
            <span style={{
              display: 'inline-grid', placeItems: 'center', padding: '4px 6px', borderRadius: 4,
              background: theme.accent, color: accentText, fontSize: 10, fontWeight: 800, lineHeight: 1.1, textAlign: 'center',
            }}>TOP<br />10</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: C.text }}>
              N°{topRank} dans les animés aujourd'hui
            </span>
          </div>
        )}

        {/* Ligne méta : note · année · saisons */}
        {meta.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginTop: 12, fontSize: 13.5, color: C.dim }}>
            {meta.map((m, i) => (
              <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                {i > 0 && <span aria-hidden style={{ color: C.faint }}>·</span>}
                <span style={m.startsWith('★') ? { color: theme.accent, fontWeight: 600 } : null}>{m}</span>
              </span>
            ))}
          </div>
        )}

        {/* Synopsis 2 lignes max (coupe 100% CSS) */}
        {anime.description && (
          <p style={{
            margin: '14px 0 0', fontSize: 15.5, lineHeight: 1.55, color: 'rgba(238,240,246,.92)', maxWidth: 520,
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
            textShadow: '0 1px 10px rgba(0,0,0,.75)',
          }}>{anime.description}</p>
        )}

        {/* Genres APRÈS le synopsis, discrets */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
          {(anime.genres || []).slice(0, 3).map(g => (
            <span key={g} style={{ padding: '2px 9px', borderRadius: 999, border: `1px solid ${rgba(theme.accent, 0.38)}`, fontSize: 11, color: C.dim }}>{g}</span>
          ))}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 22, flexWrap: 'wrap' }}>
          <button style={btn(true)} onClick={() => onWatch?.(anime)}
            onMouseEnter={e => { e.currentTarget.style.filter = 'brightness(1.15)' }}
            onMouseLeave={e => { e.currentTarget.style.filter = 'none' }}>
            <span aria-hidden style={{ fontSize: 12 }}>▶</span> Regarder
          </button>
          {onMyList && (
            <button style={btn(false)} onClick={() => onMyList(anime)} aria-pressed={inList}>
              {inList ? '✓ Dans ma liste' : '+ Ma liste'}
            </button>
          )}
        </div>
      </div>
    </section>
  )
}
