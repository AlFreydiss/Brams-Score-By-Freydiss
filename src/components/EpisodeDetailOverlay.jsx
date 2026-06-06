import { useState, useEffect } from 'react'
import { getCachedSynopsis, fetchEpisodeSynopsis } from '../lib/episodeSynopsis.js'

// Interface "détail épisode" premium (glassmorphism) affichée en pré-lecture.
// Inspirée du screenshot utilisateur + luxury glass modal : panneau droit avec
// Titre épisode, Synopsis épisode, Note épisode (étoiles), Trailer de l'anime.
// Le reste de la vidéo reste cliquable pour lancer la lecture.
export default function EpisodeDetailOverlay({ animeId, animeTitle, video, note, youtube, color = '#a78bfa' }) {
  const ep = video?.episode
  const isFilm = video?.kind === 'film' || (video?.season && String(video.season).toLowerCase().includes('film'))
  const epLabel = isFilm ? (video?.episodeLabel || 'Film') : (video?.season ? `Saison ${String(video.season).replace(/^S/i, '')} · Épisode ${ep}` : `Épisode ${ep}`)
  const epTitle = video?.title && !/^episode\s/i.test(String(video.title)) ? video.title : null

  const [synopsis, setSynopsis] = useState(() => getCachedSynopsis(animeId, ep) || video?.synopsis || '')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (video?.synopsis) {
      setSynopsis(video.synopsis)
      setLoading(false)
      return
    }
    let alive = true
    const cached = getCachedSynopsis(animeId, ep)
    if (cached) { setSynopsis(cached); setLoading(false); return }
    setSynopsis(''); setLoading(true)
    fetchEpisodeSynopsis(animeId, animeTitle, ep).then(txt => {
      if (!alive) return
      const final = txt || video?.synopsis || ''
      setSynopsis(final)
      setLoading(false)
    })
    return () => { alive = false }
  }, [animeId, animeTitle, ep, video?.synopsis])

  // Construire un bon lien trailer (utilise youtube id si dispo, sinon recherche "Violet Evergarden trailer" etc.)
  const buildTrailerHref = () => {
    if (youtube) return `https://www.youtube.com/watch?v=${youtube}`
    const q = encodeURIComponent(`${animeTitle || 'anime'} ${isFilm ? 'movie' : 'episode ' + ep} trailer bande annonce official`)
    return `https://www.youtube.com/results?search_query=${q}`
  }
  const trailerHref = buildTrailerHref()
  const trailerLabel = isFilm ? "Bande-annonce du film" : "Trailer de l'anime"

  // Note → étoiles (jusqu'à 5 ou 10 selon l'échelle)
  const renderStars = (n) => {
    if (!Number.isFinite(n)) return null
    const max = n <= 5 ? 5 : 10
    const filled = Math.round(n <= 5 ? n : n / 2)
    return Array.from({ length: 5 }).map((_, i) => (
      <span key={i} style={{ color: i < filled ? '#fbbf24' : 'rgba(255,255,255,0.25)', fontSize: 15, lineHeight: 1 }}>★</span>
    ))
  }

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 7, pointerEvents: 'none', display: 'flex', justifyContent: 'flex-end' }}>
      {/* Dégradé + voile pour lisibilité (le centre reste cliquable) */}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, rgba(6,7,11,0.08) 0%, rgba(6,7,11,0) 32%, rgba(8,9,12,0.72) 68%, rgba(8,9,12,0.92) 100%)', pointerEvents: 'none' }} />

      {/* Panneau droit glassmorphism premium (style luxury modal + screenshot) */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: 'relative',
          pointerEvents: 'auto',
          width: 'min(440px, 46%)',
          height: '100%',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          padding: '28px 26px 24px',
          overflowY: 'auto',
          background: 'linear-gradient(145deg, rgba(18,20,25,0.78), rgba(9,10,14,0.62))',
          borderLeft: `1px solid ${color}33`,
          backdropFilter: 'blur(24px) saturate(1.15)',
          boxShadow: '0 30px 90px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.08)',
        }}
      >
        {/* En-tête / label */}
        <div>
          <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: '1.6px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.55)', marginBottom: 4 }}>
            {isFilm ? 'Film' : 'Épisode'}
          </div>

          {/* Titre épisode (gros, élégant) */}
          <h2 style={{
            margin: 0,
            fontFamily: "'Pirata One', cursive",
            fontWeight: 900,
            fontSize: 'clamp(26px, 3.2vw, 40px)',
            color: '#fff',
            lineHeight: 1.02,
            letterSpacing: '-0.3px',
            textShadow: '0 2px 16px rgba(0,0,0,0.65)'
          }}>
            {epTitle || (isFilm ? animeTitle : `Épisode ${ep}`)}
          </h2>

          <div style={{ marginTop: 6, fontSize: 12, color: 'rgba(255,255,255,0.55)', fontWeight: 700 }}>
            {epLabel}
          </div>

          {/* Note épisode avec étoiles (comme le screenshot + luxury modal) */}
          {Number.isFinite(note) && (
            <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: '1.3px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.42)' }}>
                Note épisode
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {renderStars(note)}
              </div>
              <div style={{ color: '#fff', fontSize: 15, fontWeight: 800, marginLeft: 4 }}>
                {note}<span style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12, fontWeight: 600 }}>/10</span>
              </div>
            </div>
          )}
        </div>

        {/* Synopsis épisode */}
        <div>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '1.4px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.42)', marginBottom: 6 }}>
            Synopsis épisode
          </div>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.58, color: 'rgba(255,255,255,0.85)' }}>
            {synopsis || (loading ? 'Génération du synopsis…' : 'Synopsis indisponible pour le moment.')}
          </p>
          {synopsis && !video?.synopsis && (
            <div style={{ marginTop: 6, fontSize: 10, color: 'rgba(255,255,255,0.28)', fontWeight: 600 }}>
              ✦ résumé généré par IA
            </div>
          )}
        </div>

        {/* Trailer de l'anime / du film (bouton premium glass) */}
        <div style={{ marginTop: 'auto', paddingTop: 8 }}>
          <a
            href={trailerHref}
            target="_blank"
            rel="noreferrer"
            onClick={e => e.stopPropagation()}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              width: '100%',
              height: 44,
              borderRadius: 14,
              background: `linear-gradient(135deg, ${color}dd, ${color}99)`,
              border: `1px solid ${color}bb`,
              color: '#fff',
              textDecoration: 'none',
              fontSize: 14,
              fontWeight: 800,
              letterSpacing: '0.3px',
              boxShadow: `0 10px 30px ${color}33`,
              transition: 'transform .1s ease, box-shadow .1s ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'none' }}
          >
            <span style={{ fontSize: 16 }}>▶</span>
            {trailerLabel}
          </a>
          <div style={{ marginTop: 8, fontSize: 10, color: 'rgba(255,255,255,0.35)', textAlign: 'center', fontWeight: 600 }}>
            {isFilm ? 'Voir la bande-annonce officielle' : 'Découvrir le trailer de la saison'}
          </div>
        </div>
      </div>
    </div>
  )
}
