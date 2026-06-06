import { useState, useEffect } from 'react'
import { getCachedSynopsis, fetchEpisodeSynopsis } from '../lib/episodeSynopsis.js'

// Interface "détail épisode" premium (glassmorphism) affichée en pré-lecture.
// Inspirée du screenshot utilisateur + luxury glass modal : panneau droit avec
// Titre épisode, Synopsis épisode, Note épisode (étoiles), Trailer de l'anime.
// Le reste de la vidéo reste cliquable pour lancer la lecture.
export default function EpisodeDetailOverlay({ animeId, animeTitle, video, note, youtube, color = '#a78bfa', onPlay }) {
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
    <div style={{ position: 'absolute', inset: 0, zIndex: 7, pointerEvents: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      {/* Carte centrale glass premium — tout est regroupé, centré sur le visuel flouté */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: 'relative',
          pointerEvents: 'auto',
          width: 'min(560px, 92%)',
          maxHeight: '82%',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          gap: 18,
          padding: '34px 34px 30px',
          overflowY: 'auto',
          textAlign: 'center',
          alignItems: 'center',
          borderRadius: 24,
          background: 'linear-gradient(160deg, rgba(20,22,28,0.82), rgba(9,10,14,0.74))',
          border: `1px solid ${color}3a`,
          backdropFilter: 'blur(26px) saturate(1.2)',
          boxShadow: `0 40px 110px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.10), 0 0 0 1px rgba(255,255,255,0.02)`,
          animation: 'fadeIn .35s ease-out',
        }}
      >
        {/* Label */}
        <div style={{ fontSize: 10.5, fontWeight: 900, letterSpacing: '2px', textTransform: 'uppercase', color }}>
          {isFilm ? 'Film' : 'Épisode'}
        </div>

        {/* Titre */}
        <h2 style={{
          margin: 0,
          fontFamily: "'Pirata One', cursive",
          fontWeight: 900,
          fontSize: 'clamp(28px, 3.4vw, 44px)',
          color: '#fff',
          lineHeight: 1.04,
          letterSpacing: '-0.3px',
          textShadow: '0 2px 22px rgba(0,0,0,0.7)',
        }}>
          {epTitle || (isFilm ? animeTitle : `Épisode ${ep}`)}
        </h2>

        {/* Meta : saison/épisode + note sur une ligne */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, flexWrap: 'wrap', fontSize: 12.5, color: 'rgba(255,255,255,0.6)', fontWeight: 700 }}>
          <span>{epLabel}</span>
          {Number.isFinite(note) && (
            <>
              <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'rgba(255,255,255,0.3)' }} />
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                {renderStars(note)}
                <span style={{ color: '#fff', fontWeight: 800, marginLeft: 3 }}>{note}<span style={{ color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>/10</span></span>
              </span>
            </>
          )}
        </div>

        {/* Synopsis */}
        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.62, color: 'rgba(255,255,255,0.82)', maxWidth: 460 }}>
          {synopsis || (loading ? 'Génération du synopsis…' : 'Synopsis indisponible pour le moment.')}
        </p>

        {/* Actions : Lecture (primaire) + Bande-annonce (secondaire) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', maxWidth: 360, marginTop: 4 }}>
          <button
            type="button"
            onClick={e => { e.stopPropagation(); onPlay?.() }}
            style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 11,
              width: '100%', height: 52, borderRadius: 15, cursor: 'pointer',
              background: `linear-gradient(135deg, ${color}, ${color}cc)`,
              border: `1px solid ${color}`,
              color: '#fff', fontSize: 16, fontWeight: 900, letterSpacing: '0.3px',
              boxShadow: `0 14px 40px ${color}44`,
              transition: 'transform .12s ease, box-shadow .12s ease, filter .12s ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.filter = 'brightness(1.08)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.filter = 'none' }}
          >
            <span style={{ fontSize: 18 }}>▶</span> Lecture
          </button>

          <a
            href={trailerHref}
            target="_blank"
            rel="noreferrer"
            onClick={e => e.stopPropagation()}
            style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 9,
              width: '100%', height: 42, borderRadius: 13,
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.14)',
              color: 'rgba(255,255,255,0.82)', textDecoration: 'none',
              fontSize: 13, fontWeight: 700, letterSpacing: '0.2px',
              transition: 'background .15s ease, border-color .15s ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.11)'; e.currentTarget.style.borderColor = `${color}66` }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.14)' }}
          >
            <span style={{ fontSize: 14 }}>⤓</span> {trailerLabel}
          </a>
        </div>
      </div>
    </div>
  )
}
