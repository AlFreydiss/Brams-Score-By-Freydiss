import { useState, useEffect } from 'react'
import { getCachedSynopsis, fetchEpisodeSynopsis } from '../lib/episodeSynopsis.js'

// Interface "détail épisode" affichée en pré-lecture, par-dessus la zone vidéo.
// Panneau à droite : titre + note (gens) + synopsis (IA) + trailer YouTube.
// Le conteneur laisse passer les clics (pointerEvents:none) → cliquer ailleurs lance
// la lecture (le <video> a onClick=togglePlay). Seul le panneau capte les clics.
export default function EpisodeDetailOverlay({ animeId, animeTitle, video, note, youtube, color = '#a78bfa' }) {
  const ep = video?.episode
  const epTitle = video?.title && !/^episode\s/i.test(String(video.title)) ? video.title : null
  const [synopsis, setSynopsis] = useState(() => getCachedSynopsis(animeId, ep) || '')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let alive = true
    const cached = getCachedSynopsis(animeId, ep)
    if (cached) { setSynopsis(cached); setLoading(false); return }
    setSynopsis(''); setLoading(true)
    fetchEpisodeSynopsis(animeId, animeTitle, ep).then(txt => {
      if (!alive) return            // épisode changé entre-temps → on ignore (anti-stale)
      setSynopsis(txt || '')
      setLoading(false)
    })
    return () => { alive = false }
  }, [animeId, animeTitle, ep])

  const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent((animeTitle || '') + ' trailer')}`

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 7, pointerEvents: 'none', display: 'flex', justifyContent: 'flex-end' }}>
      {/* Dégradé pour lisibilité du panneau, n'empêche pas le clic central */}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, rgba(6,7,11,0.10) 0%, rgba(6,7,11,0) 38%, rgba(6,7,11,0.78) 72%, rgba(6,7,11,0.94) 100%)', pointerEvents: 'none' }} />

      {/* Panneau droite */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: 'relative', pointerEvents: 'auto',
          width: 'min(420px, 44%)', height: '100%', boxSizing: 'border-box',
          display: 'flex', flexDirection: 'column', gap: 14,
          padding: '26px 26px 22px', overflowY: 'auto',
        }}
      >
        <div>
          <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.18em', textTransform: 'uppercase', color, marginBottom: 6 }}>
            {video?.season ? `Saison ${String(video.season).replace(/^S/i, '')} · ` : ''}Épisode {ep}
          </div>
          <h2 style={{ margin: 0, fontFamily: "'Pirata One', cursive", fontWeight: 900, fontSize: 'clamp(24px,3vw,38px)', color: '#fff', lineHeight: 1.05, textShadow: '0 2px 14px rgba(0,0,0,0.7)' }}>
            {epTitle || `Épisode ${ep}`}
          </h2>
          {Number.isFinite(note) && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, marginTop: 10, padding: '4px 12px', borderRadius: 999, background: 'rgba(255,216,107,0.12)', border: '1px solid rgba(255,216,107,0.3)' }}>
              <span style={{ color: '#ffd86b', fontSize: 14 }}>★</span>
              <span style={{ color: '#fff', fontSize: 13, fontWeight: 800 }}>{note}</span>
              <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11, fontWeight: 700 }}>/ 10</span>
            </div>
          )}
        </div>

        {/* Synopsis IA */}
        <div>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.42)', marginBottom: 6 }}>Synopsis</div>
          <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.65, color: 'rgba(255,255,255,0.82)' }}>
            {synopsis || (loading ? 'Génération du synopsis…' : 'Synopsis indisponible.')}
            {synopsis && <span style={{ display: 'block', marginTop: 6, fontSize: 10, color: 'rgba(255,255,255,0.30)' }}>✦ résumé généré par IA</span>}
          </p>
        </div>

        {/* Trailer */}
        <div style={{ marginTop: 'auto' }}>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.42)', marginBottom: 6 }}>Trailer</div>
          {youtube ? (
            <div style={{ position: 'relative', width: '100%', aspectRatio: '16 / 9', borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
              <iframe
                src={`https://www.youtube.com/embed/${youtube}?rel=0`}
                loading="lazy"
                title={`Trailer ${animeTitle}`}
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }}
                allow="encrypted-media; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : (
            <a href={searchUrl} target="_blank" rel="noopener noreferrer"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, width: '100%', aspectRatio: '16 / 9', borderRadius: 12, textDecoration: 'none', background: 'rgba(255,255,255,0.04)', border: '1px dashed rgba(255,255,255,0.18)', color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: 800 }}>
              <span style={{ fontSize: 22, color: '#ff3b3b' }}>▶</span> Voir le trailer sur YouTube
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
