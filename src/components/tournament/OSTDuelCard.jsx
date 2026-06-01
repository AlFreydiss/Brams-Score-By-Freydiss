import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'

const GOLD   = '#d4a017'
const GOLD_L = '#f0c040'

export default function OSTDuelCard({
  participant, side, voted, isWinner, isLoser,
  votePercent, voteCount, hasVoted, onVote, onListen, onWatch,
  isPlaying, otherIsPlaying,
  showResult, isMobile,
  videoSyncRef,
  vivid = false, // multi split-screen : chaque carte montre SA miniature en plein, pas d'assombrissement
}) {
  const [imgState, setImgState] = useState('loading')
  const videoRef = useRef(null)

  useEffect(() => { setImgState('loading') }, [participant?.id])

  // Quand la lecture démarre, reset la vidéo de fond à 0 pour rester synchro avec le player audio
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    video.muted = !isPlaying
    if (isPlaying) video.currentTime = 0
    video.play().catch(() => {})
  }, [isPlaying])

  // Pause la preview de l'autre card quand un opening est en cours d'écoute
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    if (!isPlaying) video.muted = true
    video.play().catch(() => {})
  }, [otherIsPlaying, isPlaying])

  function handleFullscreen() {
    const el = videoRef.current
    if (!el) return
    if (el.requestFullscreen) el.requestFullscreen()
    else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen()
  }

  if (!participant) {
    return (
      <div style={{
        flex: 1, minHeight: isMobile ? 300 : 540,
        borderRadius: 20, border: '1px solid rgba(255,255,255,.06)',
        background: 'rgba(255,255,255,.015)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ color: 'rgba(255,255,255,.18)', fontSize: 13 }}>À déterminer</span>
      </div>
    )
  }

  const ytOk     = participant?.ytId && !participant.ytId.startsWith('similar')
  const canPlay  = ytOk || !!participant?.audioUrl
  const thumbUrl = ytOk ? `https://img.youtube.com/vi/${participant.ytId}/hqdefault.jpg` : null
  const showThumb = !!thumbUrl && imgState === 'ok'
  const showInlineYoutube = isPlaying && ytOk && !participant?.audioUrl
  const accent   = participant?.color || GOLD
  const myVote   = voted === side

  function hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return `rgba(${r},${g},${b},${alpha})`
  }
  const a60 = hexToRgba(accent, 0.60)
  const a35 = hexToRgba(accent, 0.35)
  const a15 = hexToRgba(accent, 0.15)

  const borderCol = isPlaying
    ? accent
    : isWinner  ? GOLD
    : isLoser   ? 'rgba(255,255,255,.04)'
    : myVote    ? 'rgba(212,160,23,.4)'
    :             'rgba(255,255,255,.1)'

  return (
    <motion.div
      style={{
        flex: 1, minWidth: 0, position: 'relative',
        borderRadius: 20,
        border: `1.5px solid ${borderCol}`,
        overflow: 'hidden',
        cursor: !hasVoted ? 'pointer' : 'default',
        minHeight: isMobile ? 300 : 540,
        display: 'flex', flexDirection: 'column',
        background: '#06070c',
        boxShadow: isPlaying
          ? `0 0 0 1px ${a35}, 0 24px 80px ${a15}`
          : isWinner
            ? `0 0 0 1px rgba(212,160,23,.2), 0 16px 64px rgba(212,160,23,.1)`
            : 'none',
        opacity: (otherIsPlaying && !vivid) ? 0.82 : 1,
        transition: 'border-color .35s, box-shadow .35s, opacity .5s',
      }}
      whileHover={!hasVoted ? { scale: 1.012 } : {}}
      transition={{ duration: 0.18 }}
      onClick={!hasVoted ? () => onVote(side) : undefined}
    >
      {/* ── BACKGROUND PLEINE CARTE ── */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
        {/* Img hidden pour state tracking */}
        {thumbUrl && (
          <img
            src={thumbUrl}
            alt=""
            onLoad={e => { if (e.target.naturalWidth > 120) setImgState('ok') }}
            onError={() => setImgState('failed')}
            style={{ display: 'none' }}
          />
        )}

        {/* Vidéo de fond — preview (opacité réduite) quand inactive, plein quand en lecture */}
        {participant?.audioUrl && (
          <video
            ref={el => {
              videoRef.current = el
              if (videoSyncRef) videoSyncRef.current = el
            }}
            key={participant.audioUrl}
            src={participant.audioUrl}
            autoPlay
            muted={!isPlaying}
            loop={!isPlaying}
            playsInline
            preload={isPlaying ? 'auto' : 'metadata'}
            style={{
              position: 'absolute', inset: 0,
              width: '100%', height: '100%',
              maxWidth: 'none', maxHeight: 'none',
              objectFit: 'cover',
              opacity: isLoser
                ? (isPlaying ? 0.12 : 0.07)
                : isPlaying ? 0.9 : 0.48,
              filter: isPlaying ? 'none' : 'saturate(1.3) brightness(0.85)',
              transition: 'opacity 0.5s, filter 0.5s',
            }}
          />
        )}

        {/* Lecteur visuel YouTube dans la carte active.
            Le son reste gere par le player compact pour garder volume/seek/stop. */}
        {showInlineYoutube && (
          <div style={{
            position: 'absolute',
            inset: 0,
            overflow: 'hidden',
            background: '#05060a',
          }}>
            <iframe
              key={`${participant.ytId}-inline`}
              src={`https://www.youtube-nocookie.com/embed/${participant.ytId}?autoplay=1&mute=1&controls=0&playsinline=1&modestbranding=1&rel=0&loop=1&playlist=${participant.ytId}`}
              title={`${participant.title || 'Opening'} visual`}
              allow="autoplay; encrypted-media; picture-in-picture"
              style={{
                position: 'absolute',
                top: 0,
                left: '50%',
                width: '177.78%',
                height: '100%',
                transform: 'translateX(-50%)',
                border: 'none',
                pointerEvents: 'none',
                opacity: isLoser ? 0.16 : 0.86,
              }}
            />
          </div>
        )}

        {/* Thumbnail YouTube quand pas de audioUrl (toujours visible en mode vivid) */}
        {!showInlineYoutube && !participant?.audioUrl && showThumb && (
          <img
            src={`https://img.youtube.com/vi/${participant.ytId}/maxresdefault.jpg`}
            alt=""
            onError={e => { e.currentTarget.src = thumbUrl }}
            style={{
              position: 'absolute', top: '-8%', left: '-5%',
              width: '110%', height: '116%',
              maxWidth: 'none', maxHeight: 'none',
              objectFit: 'cover', objectPosition: 'center 30%',
              opacity: vivid ? (isLoser ? 0.32 : 0.66) : (isLoser ? 0.08 : 0.48),
              filter: 'saturate(1.3) brightness(0.9)',
            }}
          />
        )}

        {/* Gradient couleur uniquement si aucun media disponible */}
        {!participant?.audioUrl && !showThumb && (
          <div style={{
            position: 'absolute', inset: 0,
            background: isLoser
              ? `radial-gradient(ellipse at 50% 10%, ${a15} 0%, transparent 65%)`
              : `radial-gradient(ellipse at 50% 15%, ${a60} 0%, ${a35} 30%, ${a15} 55%, transparent 80%)`,
          }} />
        )}

        {/* Dégradé sombre : transparent en haut → opaque en bas */}
        <div style={{
          position: 'absolute', inset: 0,
          background: showInlineYoutube || isPlaying
            ? 'linear-gradient(180deg, rgba(6,7,12,.02) 0%, rgba(6,7,12,.05) 28%, rgba(6,7,12,.34) 58%, rgba(6,7,12,.86) 100%)'
            : 'linear-gradient(180deg, rgba(6,7,12,.05) 0%, rgba(6,7,12,.08) 25%, rgba(6,7,12,.55) 52%, rgba(6,7,12,.95) 100%)',
        }} />

        {isWinner && <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(212,160,23,.07) 0%, transparent 50%)' }} />}
        {isLoser  && <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.52)' }} />}
      </div>

      {/* ── CONTENU ── */}
      <div style={{ position: 'relative', zIndex: 1, flex: 1, display: 'flex', flexDirection: 'column' }}>

        {/* Top bar */}
        <div style={{ padding: '13px 14px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{
            fontSize: 9, padding: '3px 10px', borderRadius: 6,
            background: 'rgba(0,0,0,.5)', backdropFilter: 'blur(8px)',
            color: isPlaying ? accent : 'rgba(255,255,255,.35)',
            letterSpacing: '0.12em', fontWeight: 700, textTransform: 'uppercase',
            border: `1px solid ${isPlaying ? accent + '60' : 'transparent'}`,
            transition: 'all 0.3s',
          }}>OPENING</span>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {/* Bouton Lecteur vidéo complet */}
            {ytOk && (
              <button
                onClick={e => { e.stopPropagation(); onWatch?.() }}
                title="Voir l'opening en plein écran"
                style={{
                  background: 'rgba(0,0,0,.5)', backdropFilter: 'blur(8px)',
                  border: `1px solid ${accent}55`,
                  borderRadius: 20, padding: '4px 12px',
                  color: accent,
                  fontSize: 10, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 5,
                  fontWeight: 700, letterSpacing: '0.06em',
                  transition: 'all 0.2s',
                }}
              >
                <span style={{ fontSize: 11 }}>⛶</span> Voir
              </button>
            )}
            {/* Bouton écoute audio */}
            {canPlay && (
              <button
                onClick={e => { e.stopPropagation(); onListen() }}
                style={{
                  background: isPlaying ? hexToRgba(accent, 0.18) : 'rgba(0,0,0,.55)', backdropFilter: 'blur(8px)',
                  border: `1.5px solid ${isPlaying ? accent : 'rgba(255,255,255,.28)'}`,
                  borderRadius: 24, padding: '9px 18px',
                  color: isPlaying ? accent : '#fff',
                  fontSize: 13, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 7,
                  fontWeight: 800, letterSpacing: '0.04em',
                  boxShadow: isPlaying ? `0 4px 18px ${hexToRgba(accent, 0.35)}` : '0 4px 14px rgba(0,0,0,.4)',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.06)' }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)' }}
              >
                <span style={{ fontSize: 15 }}>{isPlaying ? '■' : '▶'}</span>
                {isPlaying ? 'Stop' : 'Écouter'}
              </button>
            )}
          </div>
        </div>

        {/* Zone centrale — emoji quand pas en lecture */}
        <div style={{
          flex: 1,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          paddingBottom: 8,
        }}>
          {!isPlaying && !showThumb && !participant?.audioUrl && participant.emoji && (
            <span style={{
              fontSize: isMobile ? 52 : 68,
              lineHeight: 1,
              filter: `drop-shadow(0 0 18px ${accent}) drop-shadow(0 0 40px ${a35})`,
              opacity: isLoser ? 0.25 : 0.9,
            }}>
              {participant.emoji}
            </span>
          )}
        </div>

        {/* Bloc info bas */}
        <div style={{ padding: isMobile ? '0 16px 16px' : '0 20px 20px' }}>
          <div style={{
            fontSize: 9, color: 'rgba(255,255,255,.4)',
            letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 5,
            fontWeight: 700,
          }}>
            {participant.anime}
          </div>

          <div style={{
            fontSize: isMobile ? 20 : 26,
            fontWeight: 800,
            color: isWinner ? GOLD_L : 'rgba(255,255,255,.97)',
            lineHeight: 1.15, marginBottom: 3,
            textShadow: isWinner
              ? `0 0 32px rgba(212,160,23,.65)`
              : '0 2px 14px rgba(0,0,0,.95)',
          }}>
            {participant.title}
          </div>

          <div style={{ fontSize: 11, color: 'rgba(255,255,255,.32)', marginBottom: 16, fontStyle: 'italic' }}>
            {participant.artist}
          </div>

          {/* Barre de vote */}
          {showResult && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 5 }}>
                <span style={{ fontWeight: 700, color: isWinner ? GOLD : 'rgba(255,255,255,.45)' }}>
                  {votePercent}%
                </span>
                <span style={{ color: 'rgba(255,255,255,.22)' }}>
                  {voteCount} vote{voteCount !== 1 ? 's' : ''}
                </span>
              </div>
              <div style={{ height: 3, borderRadius: 2, background: 'rgba(255,255,255,.1)', overflow: 'hidden' }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${votePercent}%` }}
                  transition={{ delay: 0.3, duration: 1, ease: 'easeOut' }}
                  style={{
                    height: '100%',
                    background: isWinner ? `linear-gradient(90deg, ${GOLD}, ${GOLD_L})` : 'rgba(255,255,255,.22)',
                    borderRadius: 2,
                  }}
                />
              </div>
            </div>
          )}

          {/* CTA */}
          {showResult ? (
            <div style={{
              fontSize: 10, fontWeight: 800, letterSpacing: '0.14em',
              color: isWinner ? GOLD : 'rgba(255,255,255,.18)',
            }}>
              {isWinner ? '✦ QUALIFIÉ →' : 'ÉLIMINÉ'}
            </div>
          ) : myVote ? (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: 'rgba(212,160,23,.1)', border: '1px solid rgba(212,160,23,.28)',
              borderRadius: 8, padding: '6px 14px',
              fontSize: 11, color: GOLD, fontWeight: 700,
            }}>
              ✓ Votre sélection
            </div>
          ) : (
            <button
              onClick={e => { e.stopPropagation(); onVote(side) }}
              style={{
                width: '100%', padding: '12px 0',
                borderRadius: 12, border: `1px solid rgba(212,160,23,.38)`,
                background: 'rgba(212,160,23,.09)',
                color: GOLD, fontSize: 13, fontWeight: 700,
                cursor: 'pointer', letterSpacing: '0.05em',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(212,160,23,.2)'; e.currentTarget.style.borderColor = GOLD }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(212,160,23,.09)'; e.currentTarget.style.borderColor = 'rgba(212,160,23,.38)' }}
            >
              Voter pour cet opening
            </button>
          )}
        </div>
      </div>
    </motion.div>
  )
}
