function EpisodePreview({ video, accent, episode }) {
  if (video.thumbnail) {
    return (
      <img
        src={video.thumbnail}
        alt={video.title}
        loading="lazy"
        decoding="async"
        className="episode-card__media"
      />
    )
  }

  return (
    <div
      className="episode-card__fallback"
      style={{
        background: `radial-gradient(circle at 24% 14%, ${accent}4d, transparent 30%), radial-gradient(circle at 78% 22%, rgba(236,72,153,0.18), transparent 34%), linear-gradient(135deg, rgba(20,20,26,0.96), rgba(4,4,7,0.98))`,
      }}
    >
      <span className="episode-card__fallback-kicker">BRAMS STREAM</span>
      <span className="episode-card__fallback-number">{episode}</span>
    </div>
  )
}

export default function EpisodeCard({ video, onPlay, accent = '#f97316', index = 0 }) {
  const episode = String(video.episode ?? index + 1).padStart(2, '0')
  const arc = video.arc || 'Arc'

  return (
    <button
      type="button"
      className="episode-card"
      onClick={onPlay}
      style={{
        '--episode-accent': accent,
        animationDelay: `${Math.min(index * 35, 420)}ms`,
      }}
    >
      <div className="episode-card__poster">
        <EpisodePreview video={video} accent={accent} episode={episode} />
        <div className="episode-card__overlay" />
        <div className="episode-card__shine" />

        <div className="episode-card__play" aria-hidden="true">
          <span />
        </div>
      </div>

      <div className="episode-card__body">
        <div className="episode-card__arc">
          <span className="episode-card__dot" />
          {arc}
        </div>

        <div className="episode-card__meta">
          <span className="episode-card__number">EP {episode}</span>
          <h3>{video.title || `Episode ${episode}`}</h3>
        </div>
      </div>
    </button>
  )
}
