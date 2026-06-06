// Fiche d'un épisode affichée DANS la page d'un animé (pas en plein écran).
// Partagée par toutes les pages d'animés : clic sur un épisode → ce détail
// s'affiche en haut de la liste ; le plein écran n'arrive qu'au bouton Lecture.
import { useState, useEffect } from 'react'
import { getCachedSynopsis, fetchEpisodeSynopsis } from '../lib/episodeSynopsis.js'
import { getAnimeMeta } from '../data/anime-meta.js'

export default function EpisodeDetailInline({
  video, ns, animeTitle, note,
  color = '#8b7cff', color2 = '#b8a8ff',
  onPlay, onClose,
}) {
  // Titre + note dérivés de anime-meta si non fournis → l'insertion par page reste
  // une chaîne constante (mêmes props partout), sans avoir à écrire le titre à la main.
  const meta = getAnimeMeta(ns) || {}
  const title0 = animeTitle || meta.title || 'cet animé'
  const noteVal = Number.isFinite(note) ? note : (Number.isFinite(meta.note) ? meta.note : 8.5)
  animeTitle = title0
  note = noteVal
  const isFilm = video?.kind === 'film'
  const ep = video?.episode
  const seasonLabel = video?.season ? `Saison ${String(video.season).replace(/^S/i, '')}` : 'Saison 1'
  const label = isFilm ? (video?.episodeLabel || 'Film') : `${seasonLabel} · Épisode ${ep}`
  const title = video?.title && !/^episode\s/i.test(String(video.title))
    ? video.title
    : (isFilm ? animeTitle : `Épisode ${ep}`)

  const [synopsis, setSynopsis] = useState(() => getCachedSynopsis(ns, ep) || video?.synopsis || '')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (video?.synopsis) { setSynopsis(video.synopsis); setLoading(false); return }
    const cached = getCachedSynopsis(ns, ep)
    if (cached) { setSynopsis(cached); setLoading(false); return }
    let alive = true; setSynopsis(''); setLoading(true)
    fetchEpisodeSynopsis(ns, animeTitle, ep).then(txt => {
      if (alive) { setSynopsis(txt || video?.synopsis || ''); setLoading(false) }
    })
    return () => { alive = false }
  }, [ns, animeTitle, ep, video?.synopsis])

  return (
    <div className="edi-wrap" style={{
      display: 'grid', gridTemplateColumns: 'minmax(0,300px) minmax(0,1fr)', gap: 22, marginBottom: 26,
      borderRadius: 20, padding: 18,
      background: `linear-gradient(135deg, ${color}1f, rgba(14,12,24,.82))`,
      border: `1px solid ${color}4d`,
      boxShadow: '0 20px 60px rgba(0,0,0,.4), inset 0 1px 0 rgba(255,255,255,.06)',
      animation: 'ediFadeUp .3s ease-out both', position: 'relative',
    }}>
      <style>{`@keyframes ediFadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:none} }
        @media (max-width:720px){ .edi-wrap { grid-template-columns: 1fr !important } }`}</style>

      {/* Visuel */}
      <div style={{ position: 'relative', borderRadius: 14, overflow: 'hidden', background: '#0a0814', aspectRatio: '16/9' }}>
        {video?.thumbnail
          ? <img src={video.thumbnail} alt={title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <div style={{ width: '100%', height: '100%', background: `linear-gradient(135deg,${color}2e,rgba(0,0,0,.9))` }} />}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,transparent 55%,rgba(0,0,0,.55))' }} />
        <div style={{ position: 'absolute', bottom: 8, left: 10, fontSize: 9, fontWeight: 800, background: `${color}38`, color: color2, border: `1px solid ${color}4d`, borderRadius: 100, padding: '2px 8px' }}>{video?.badge || 'VOSTFR'}</div>
      </div>

      {/* Infos */}
      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: '1.6px', textTransform: 'uppercase', color: color2 }}>{isFilm ? 'Film' : 'Épisode'}</div>
          <button onClick={onClose} aria-label="Fermer le détail"
            style={{ flexShrink: 0, width: 26, height: 26, borderRadius: 8, border: '1px solid rgba(255,255,255,.12)', background: 'rgba(255,255,255,.05)', color: 'rgba(255,255,255,.6)', cursor: 'pointer', fontSize: 13, lineHeight: 1 }}>✕</button>
        </div>
        <h3 style={{ margin: '6px 0 2px', fontFamily: "'Pirata One',cursive", fontSize: 'clamp(22px,2.6vw,32px)', fontWeight: 900, color: '#fff', lineHeight: 1.05 }}>{title}</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: 'rgba(255,255,255,.55)', fontWeight: 700, marginBottom: 10 }}>
          <span>{label}</span>
          <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'rgba(255,255,255,.3)' }} />
          <span style={{ color: '#fbbf24' }}>★ <span style={{ color: '#fff' }}>{note}</span><span style={{ color: 'rgba(255,255,255,.4)' }}>/10</span></span>
        </div>
        <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.6, color: 'rgba(255,255,255,.8)', flex: 1 }}>
          {synopsis || (loading ? 'Génération du synopsis…' : 'Synopsis indisponible pour le moment.')}
        </p>
        <button onClick={onPlay} style={{
          marginTop: 14, alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: 9,
          padding: '11px 24px', borderRadius: 13, cursor: 'pointer',
          background: `linear-gradient(135deg, ${color}, ${color2})`, border: `1px solid ${color}`,
          color: '#fff', fontSize: 14, fontWeight: 900, letterSpacing: '.3px', boxShadow: `0 12px 34px ${color}66`,
          transition: 'transform .12s ease, filter .12s ease',
        }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.filter = 'brightness(1.08)' }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.filter = 'none' }}
        ><span style={{ fontSize: 16 }}>▶</span> Lecture</button>
      </div>
    </div>
  )
}
