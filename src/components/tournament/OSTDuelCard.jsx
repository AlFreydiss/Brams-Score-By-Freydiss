import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'

const GOLD   = '#d4a017'
const GOLD_L = '#f0c040'

export default function OSTDuelCard({
  participant, side, voted, isWinner, isLoser,
  votePercent, voteCount, hasVoted, onVote, onListen,
  isPlaying, otherIsPlaying,
  showResult, isMobile,
}) {
  const [imgState, setImgState] = useState('loading')

  useEffect(() => { setImgState('loading') }, [participant?.id])

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
        opacity: otherIsPlaying ? 0.45 : 1,
        transition: 'border-color .35s, box-shadow .35s, opacity .4s',
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

        {/* Vidéo pleine carte quand en lecture */}
        {isPlaying && participant?.audioUrl && (
          <video
            key={participant.audioUrl}
            src={participant.audioUrl}
            autoPlay muted loop playsInline
            style={{
              position: 'absolute', inset: 0,
              width: '100%', height: '100%',
              objectFit: 'cover',
              opacity: isLoser ? 0.12 : 0.78,
              transition: 'opacity 0.5s',
            }}
          />
        )}

        {/* Thumbnail quand pas en lecture */}
        {!isPlaying && showThumb && (
          <img
            src={thumbUrl}
            alt=""
            style={{
              position: 'absolute', top: '-5%', left: '-5%',
              width: '110%', height: '110%',
              objectFit: 'cover',
              opacity: isLoser ? 0.1 : 0.5,
              filter: 'saturate(1.4)',
            }}
          />
        )}

        {/* Gradient couleur quand pas de media visuel */}
        {(!isPlaying || !participant?.audioUrl) && !showThumb && (
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
          background: 'linear-gradient(180deg, rgba(6,7,12,.05) 0%, rgba(6,7,12,.08) 25%, rgba(6,7,12,.55) 52%, rgba(6,7,12,.95) 100%)',
        }} />

        {isWinner && <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(212,160,23,.07) 0%, transparent 50%)' }} />}
        {isLoser  && <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.52)' }} />}
      </div>

      {/* ── CONTENU ── */}
      <div style={{ position: 'relative', zIndex: 1, flex: 1, display: 'flex', flexDirection: 'column' }}>

        {/* Top bar */}
        <div style={{ padding: '13px 14px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{
            fontSize: 9, padding: '3px 9px', borderRadius: 6,
            background: 'rgba(0,0,0,.5)', backdropFilter: 'blur(8px)',
            color: 'rgba(255,255,255,.35)',
            letterSpacing: '0.12em', fontWeight: 700, textTransform: 'uppercase',
          }}>OP</span>

          {canPlay && (
            <button
              onClick={e => { e.stopPropagation(); onListen() }}
              style={{
                background: isPlaying ? `${a35}` : 'rgba(0,0,0,.5)',
                backdropFilter: 'blur(8px)',
                border: `1px solid ${isPlaying ? accent : 'rgba(255,255,255,.18)'}`,
                borderRadius: 20, padding: '4px 12px',
                color: isPlaying ? accent : 'rgba(255,255,255,.55)',
                fontSize: 10, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 5,
                fontWeight: 700, letterSpacing: '0.06em',
                transition: 'all 0.2s',
              }}
            >
              <span style={{ fontSize: 9 }}>{isPlaying ? '■' : '▶'}</span>
              {isPlaying ? 'Stop' : 'Play'}
            </button>
          )}
        </div>

        {/* Zone centrale — emoji + waveform */}
        <div style={{
          flex: 1,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexDirection: 'column', gap: 14, paddingBottom: 8,
        }}>
          {/* Emoji grand quand pas en lecture et pas de thumbnail */}
          {!isPlaying && !showThumb && participant.emoji && (
            <span style={{
              fontSize: isMobile ? 52 : 68,
              lineHeight: 1,
              filter: `drop-shadow(0 0 18px ${accent}) drop-shadow(0 0 40px ${a35})`,
              opacity: isLoser ? 0.25 : 0.9,
            }}>
              {participant.emoji}
            </span>
          )}

          {/* Waveform animée quand en lecture */}
          {isPlaying && (
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 36 }}>
              {Array.from({ length: 14 }).map((_, i) => (
                <div key={i} style={{
                  width: 3, borderRadius: 2,
                  background: `linear-gradient(180deg, #fff, ${accent})`,
                  opacity: 0.85,
                  height: `${25 + (i % 6) * 14}%`,
                  minHeight: 4,
                  animation: `arWave ${0.38 + (i % 6) * 0.11}s ${i * 0.038}s ease-in-out infinite`,
                }} />
              ))}
            </div>
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
