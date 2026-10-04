// ── HoverPreview — fiche qui s'ouvre au survol d'une carte (réf. Netflix web) ─
// Une seule fiche pour tout le hub : le hub écoute le survol par délégation
// (data-preview="<id>" sur les cartes) et passe ici la série + le rectangle de
// la carte. La fiche part de la taille de la carte et grandit vers l'avant.
// Souris seulement : au doigt, les cartes gardent l'appui long.
import { motion } from 'framer-motion'
import { C, FONT_BODY, themeFor, onAccent, rgba } from './tokens.js'
import { TitleArt } from './HeroCinematic.jsx'

const W = 340

export default function HoverPreview({ anime, rect, art, meta, progressPct = 0, inList, onWatch, onToggleList, onRead, onEnter, onLeave }) {
  if (!anime || !rect) return null
  const theme = themeFor(anime)
  const vw = window.innerWidth
  const vh = window.innerHeight
  const width = Math.max(W, rect.width * 1.25)
  const left = Math.min(vw - width - 14, Math.max(14, rect.left + rect.width / 2 - width / 2))
  // La fiche se pose sur la carte ; trop bas, elle remonte pour tenir à l'écran.
  const top = Math.max(76, Math.min(vh - 420, rect.top - 24))
  const originX = Math.min(100, Math.max(0, ((rect.left + rect.width / 2 - left) / width) * 100))

  const btn = (filled) => ({
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, height: 36,
    padding: filled ? '0 16px' : '0 12px', borderRadius: 9, cursor: 'pointer', fontFamily: FONT_BODY,
    fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap',
    background: filled ? theme.accent : 'rgba(255,255,255,0.08)',
    border: filled ? 'none' : `1px solid ${C.hair2}`,
    color: filled ? onAccent(theme.accent) : C.text,
  })

  return (
    <motion.div
      className="ah2-pv"
      role="dialog" aria-label={`Aperçu : ${anime.title}`}
      onMouseEnter={onEnter} onMouseLeave={onLeave}
      initial={{ opacity: 0, scale: 0.82, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.14 } }}
      transition={{ type: 'spring', stiffness: 380, damping: 30, mass: 0.7 }}
      style={{
        position: 'fixed', left, top, width, zIndex: 70, transformOrigin: `${originX}% 30%`,
        borderRadius: 14, overflow: 'hidden', fontFamily: FONT_BODY, color: C.text,
        background: '#10141E', border: `1px solid ${C.hair2}`,
        boxShadow: `0 30px 70px -20px rgba(0,0,0,.85), 0 0 0 1px ${rgba(theme.accent, 0.12)}`,
      }}
    >
      <div style={{ position: 'relative', aspectRatio: '16 / 9', background: 'rgba(255,255,255,.04)', cursor: 'pointer' }} onClick={() => onWatch(anime)}>
        <img src={art} alt="" decoding="async" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 25%' }} />
        <div aria-hidden style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 45%, #10141E 98%)' }} />
        <div style={{ position: 'absolute', left: 14, right: 14, bottom: 8 }}>
          <TitleArt anime={anime} maxWidth={width * 0.6} maxHeight={56} fallback={
            <span style={{ fontSize: 19, fontWeight: 800, textShadow: '0 2px 10px rgba(0,0,0,.8)' }}>{anime.title}</span>
          } />
        </div>
        {progressPct > 0 && (
          <div aria-hidden style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 3, background: 'rgba(255,255,255,.12)' }}>
            <div style={{ width: `${Math.min(100, progressPct)}%`, height: '100%', background: theme.accent }} />
          </div>
        )}
      </div>

      <div style={{ padding: '12px 14px 15px' }}>
        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
          <button style={btn(true)} onClick={() => onWatch(anime)}>
            <span aria-hidden style={{ fontSize: 11 }}>▶</span>{progressPct > 0 ? 'Reprendre' : 'Regarder'}
          </button>
          <button style={btn(false)} onClick={() => onToggleList(anime)} aria-pressed={inList}
            aria-label={inList ? 'Retirer de ma liste' : 'Ajouter à ma liste'}>
            {inList ? '✓ Ma liste' : '+ Ma liste'}
          </button>
          {onRead && <button style={btn(false)} onClick={onRead}>📖 Scan</button>}
        </div>

        {meta.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginTop: 11, fontSize: 12.5, color: C.dim }}>
            {meta.map((m, i) => (
              <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                {i > 0 && <span aria-hidden style={{ color: C.faint }}>·</span>}
                <span style={i === 0 && progressPct > 0 ? { color: theme.accent, fontWeight: 700 } : null}>{m}</span>
              </span>
            ))}
          </div>
        )}

        {anime.description && (
          <p style={{
            margin: '9px 0 0', fontSize: 13, lineHeight: 1.5, color: 'rgba(238,240,246,.82)',
            display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>{anime.description}</p>
        )}

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
          {(anime.genres || []).slice(0, 4).map(g => (
            <span key={g} style={{ padding: '2px 9px', borderRadius: 999, border: `1px solid ${rgba(theme.accent, 0.35)}`, fontSize: 11, color: C.dim }}>{g}</span>
          ))}
        </div>
      </div>
    </motion.div>
  )
}
