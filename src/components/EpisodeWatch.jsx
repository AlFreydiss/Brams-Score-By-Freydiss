// Page de visionnage d'un épisode, intégrée DANS la page de l'animé :
//  - lecteur vidéo en haut à gauche (intégré, pas plein écran)
//  - titre + note + synopsis de l'épisode à droite
//  - bande-annonce de l'anime + épisodes suivants en bas
// Partagée par toutes les pages d'animés.
import { useState, useEffect, useMemo } from 'react'
import VideoPlayer from './VideoPlayer.jsx'
import { getCachedSynopsis, fetchEpisodeSynopsis } from '../lib/episodeSynopsis.js'
import { getAnimeMeta } from '../data/anime-meta.js'

export default function EpisodeWatch({
  videos, startIdx, ns, storageKey,
  color = '#8b7cff', color2 = '#b8a8ff',
  onSelect, onClose,
}) {
  const video = videos[startIdx]
  const meta = getAnimeMeta(ns) || {}
  const animeTitle = meta.title || 'cet animé'
  const note = Number.isFinite(meta.note) ? meta.note : 8.5
  const isFilm = video?.kind === 'film'
  const ep = video?.episode
  const seasonLabel = video?.season ? `Saison ${String(video.season).replace(/^S/i, '')}` : 'Saison 1'
  const label = isFilm ? (video?.episodeLabel || 'Film') : `${seasonLabel} · Épisode ${ep}`
  const title = video?.title && !/^episode\s/i.test(String(video.title)) ? video.title : (isFilm ? animeTitle : `Épisode ${ep}`)
  const trailerHref = meta.youtube
    ? `https://www.youtube.com/watch?v=${meta.youtube}`
    : `https://www.youtube.com/results?search_query=${encodeURIComponent(`${animeTitle} ${isFilm ? 'film' : 'anime'} trailer bande annonce`)}`

  const [synopsis, setSynopsis] = useState(() => getCachedSynopsis(ns, ep) || video?.synopsis || '')
  const [loading, setLoading] = useState(false)
  useEffect(() => {
    if (video?.synopsis) { setSynopsis(video.synopsis); setLoading(false); return }
    const cached = getCachedSynopsis(ns, ep)
    if (cached) { setSynopsis(cached); setLoading(false); return }
    let alive = true; setSynopsis(''); setLoading(true)
    fetchEpisodeSynopsis(ns, animeTitle, ep).then(txt => { if (alive) { setSynopsis(txt || video?.synopsis || ''); setLoading(false) } })
    return () => { alive = false }
  }, [ns, animeTitle, ep, video?.synopsis])

  // Épisodes suivants (puis les autres) — l'épisode courant exclu.
  const upNext = useMemo(() => {
    const after = videos.map((v, i) => ({ v, i })).filter(x => x.i > startIdx)
    const before = videos.map((v, i) => ({ v, i })).filter(x => x.i < startIdx)
    return [...after, ...before]
  }, [videos, startIdx])

  return (
    <div style={{ marginBottom: 30, animation: 'ewFade .3s ease-out both' }}>
      <style>{`
        @keyframes ewFade { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:none} }
        .ew-grid { display:grid; grid-template-columns:minmax(0,1.75fr) minmax(0,1fr); gap:18; align-items:stretch; }
        @media (max-width:920px){ .ew-grid{ grid-template-columns:1fr } }
        .ew-strip::-webkit-scrollbar{ height:6px } .ew-strip::-webkit-scrollbar-thumb{ background:${color}66; border-radius:6px } .ew-strip::-webkit-scrollbar-track{ background:transparent }
      `}</style>

      <div className="ew-grid">
        {/* Lecteur — haut gauche */}
        <div style={{ aspectRatio: '16 / 9', borderRadius: 16, overflow: 'hidden', border: `1px solid ${color}3a`, boxShadow: '0 24px 70px rgba(0,0,0,.5)', background: '#000', minWidth: 0 }}>
          <VideoPlayer key={startIdx} videos={videos} startIdx={startIdx} onClose={onClose} color={color} storageKey={storageKey} autoStart embedded hideDetail />
        </div>

        {/* Infos — droite */}
        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, borderRadius: 16, padding: '20px 22px', background: `linear-gradient(160deg, ${color}16, rgba(12,10,20,.72))`, border: `1px solid ${color}33` }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
            <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: '1.6px', textTransform: 'uppercase', color: color2 }}>{isFilm ? 'Film' : 'Épisode'}</div>
            <button onClick={onClose} aria-label="Fermer" style={{ flexShrink: 0, width: 26, height: 26, borderRadius: 8, border: '1px solid rgba(255,255,255,.12)', background: 'rgba(255,255,255,.05)', color: 'rgba(255,255,255,.6)', cursor: 'pointer', fontSize: 13 }}>✕</button>
          </div>
          <h2 style={{ margin: '6px 0 4px', fontFamily: "'Pirata One',cursive", fontSize: 'clamp(24px,2.6vw,34px)', fontWeight: 900, color: '#fff', lineHeight: 1.05 }}>{title}</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12.5, color: 'rgba(255,255,255,.55)', fontWeight: 700, marginBottom: 14 }}>
            <span>{label}</span>
            <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'rgba(255,255,255,.3)' }} />
            <span style={{ color: '#fbbf24' }}>★ <span style={{ color: '#fff' }}>{note}</span><span style={{ color: 'rgba(255,255,255,.4)' }}>/10</span></span>
          </div>
          <div style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: '1.2px', textTransform: 'uppercase', color: 'rgba(255,255,255,.42)', marginBottom: 6 }}>Synopsis de l'épisode</div>
          <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.62, color: 'rgba(255,255,255,.82)', flex: 1, overflowY: 'auto' }}>
            {synopsis || (loading ? 'Génération du synopsis…' : 'Synopsis indisponible pour le moment.')}
          </p>
          <a href={trailerHref} target="_blank" rel="noreferrer" style={{
            marginTop: 16, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 9,
            padding: '12px 0', borderRadius: 12, textDecoration: 'none',
            background: `linear-gradient(135deg, ${color}, ${color2})`, border: `1px solid ${color}`,
            color: '#fff', fontSize: 13.5, fontWeight: 800, letterSpacing: '.2px', boxShadow: `0 10px 30px ${color}44`,
          }}>▶ Trailer de l'anime</a>
        </div>
      </div>

      {/* Épisodes suivants — bas */}
      <div style={{ marginTop: 22 }}>
        <div style={{ fontSize: 14, fontWeight: 900, color: '#fff', marginBottom: 12 }}>Épisodes suivants</div>
        <div className="ew-strip" style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 6 }}>
          {upNext.map(({ v, i }) => (
            <button key={v.progressKey || v.id || `e${i}`} onClick={() => onSelect(i)} style={{
              flexShrink: 0, width: 210, textAlign: 'left', cursor: 'pointer', padding: 0,
              background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 12, overflow: 'hidden',
              transition: 'transform .15s ease, border-color .15s ease',
            }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.borderColor = `${color}66` }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.borderColor = 'rgba(255,255,255,.08)' }}
            >
              <div style={{ position: 'relative', aspectRatio: '16 / 9', background: '#0a0814' }}>
                {v.thumbnail
                  ? <img src={v.thumbnail} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <div style={{ width: '100%', height: '100%', background: `linear-gradient(135deg,${color}26,rgba(0,0,0,.9))` }} />}
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,transparent 60%,rgba(0,0,0,.5))' }} />
              </div>
              <div style={{ padding: '8px 11px 10px' }}>
                <div style={{ fontSize: 9, fontWeight: 800, color: color2, letterSpacing: '.06em', marginBottom: 2 }}>{v.kind === 'film' ? 'FILM' : `ÉPISODE ${v.episode}`}</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.title || `Épisode ${v.episode}`}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
