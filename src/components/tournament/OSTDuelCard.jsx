import { useState } from 'react'
import { motion } from 'framer-motion'

const GOLD   = '#d4a017'
const GOLD_L = '#f0c040'

function MusicIcon({ color }) {
  return (
    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M9 18V5l12-2v13" stroke={color} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" opacity="0.6"/>
      <circle cx="6" cy="18" r="3" stroke={color} strokeWidth="1.4" opacity="0.6"/>
      <circle cx="18" cy="16" r="3" stroke={color} strokeWidth="1.4" opacity="0.6"/>
    </svg>
  )
}

export default function OSTDuelCard({
  participant, side, voted, isWinner, isLoser,
  votePercent, voteCount, hasVoted, onVote, onListen,
  isPlaying, otherIsPlaying,
  showResult, isMobile,
}) {
  const [imgState, setImgState] = useState('loading')

  const ytOk    = participant?.ytId && !participant.ytId.startsWith('similar')
  const canPlay = ytOk || !!participant?.audioUrl
  const thumbUrl = ytOk ? `https://img.youtube.com/vi/${participant.ytId}/hqdefault.jpg` : null
  const showThumb = !!thumbUrl && imgState === 'ok'
  const accent  = participant?.color || GOLD
  const myVote  = voted === side

  function hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return `rgba(${r},${g},${b},${alpha})`
  }
  const accentA70 = hexToRgba(accent, 0.70)
  const accentA40 = hexToRgba(accent, 0.40)
  const accentA15 = hexToRgba(accent, 0.15)

  function handleImgLoad(e) {
    if (e.target.naturalWidth <= 120) setImgState('failed')
    else setImgState('ok')
  }

  if (!participant) {
    return (
      <div style={{
        flex: 1, minHeight: isMobile ? 280 : 560,
        borderRadius: 20, border: '1px solid rgba(255,255,255,.06)',
        background: 'rgba(255,255,255,.015)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ color: 'rgba(255,255,255,.18)', fontSize: 13 }}>À déterminer</span>
      </div>
    )
  }

  const borderColor = isPlaying
    ? `${accent}90`
    : isWinner  ? GOLD
    : isLoser   ? 'rgba(255,255,255,.04)'
    : myVote    ? 'rgba(212,160,23,.42)'
    :             'rgba(255,255,255,.1)'

  return (
    <motion.div
      style={{
        flex: 1, minWidth: 0, position: 'relative',
        borderRadius: 20,
        border: `1px solid ${borderColor}`,
        overflow: 'hidden',
        cursor: !hasVoted ? 'pointer' : 'default',
        minHeight: isMobile ? 300 : 560,
        display: 'flex', flexDirection: 'column',
        background: '#08090e',
        boxShadow: isPlaying
          ? `0 0 0 1px ${accent}40, 0 16px 64px ${accentA15}`
          : isWinner
            ? `0 0 0 1px rgba(212,160,23,.18), 0 16px 64px rgba(212,160,23,.1)`
            : 'none',
        opacity: otherIsPlaying ? 0.4 : 1,
        transition: 'border-color .4s, box-shadow .4s, opacity .5s',
      }}
      whileHover={!hasVoted ? { scale: 1.01 } : {}}
      transition={{ duration: 0.2 }}
      onClick={!hasVoted ? () => onVote(side) : undefined}
    >
      {/* ── Background pleine carte ── */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 0 }}>
        {/* Vidéo plein fond quand en lecture */}
        {isPlaying && participant?.audioUrl && (
          <video
            key={participant.audioUrl}
            src={participant.audioUrl}
            autoPlay muted loop playsInline
            style={{
              position: 'absolute', top: '-5%', left: '-5%',
              width: '110%', height: '110%',
              objectFit: 'cover',
              filter: isLoser ? 'brightness(0.18)' : 'brightness(0.72) saturate(1.2)',
              transition: 'filter 0.5s ease',
            }}
          />
        )}

        {/* Thumbnail YouTube quand pas en lecture */}
        {!isPlaying && thumbUrl && (
          <img
            src={thumbUrl}
            onLoad={handleImgLoad}
            onError={() => setImgState('failed')}
            alt=""
            style={{
              position: 'absolute', top: '-5%', left: '-5%',
              width: '110%', height: '110%',
              objectFit: 'cover',
              filter: `brightness(${isLoser ? 0.18 : 0.55}) saturate(1.3)`,
              display: imgState === 'failed' ? 'none' : 'block',
            }}
          />
        )}

        {/* Gradient couleur quand pas de media */}
        {!isPlaying && !thumbUrl && (
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            background: isLoser
              ? `radial-gradient(ellipse at 50% 40%, ${accentA15} 0%, transparent 70%)`
              : `radial-gradient(ellipse at 50% 40%, ${accentA40} 0%, ${accentA15} 45%, transparent 75%)`,
          }} />
        )}

        {/* Dégradé sombre en bas pour lisibilité */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          background: 'linear-gradient(180deg, rgba(8,9,14,.3) 0%, transparent 35%, rgba(8,9,14,.75) 58%, rgba(8,9,14,.98) 100%)',
        }} />

        {isWinner && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'linear-gradient(180deg, rgba(212,160,23,.1) 0%, transparent 40%)' }} />}
        {isLoser  && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,.45)' }} />}
      </div>

      {/* ── Contenu ── */}
      <div style={{ position: 'relative', zIndex: 1, flex: 1, display: 'flex', flexDirection: 'column' }}>

        {/* Top bar */}
        <div style={{ padding: '12px 14px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{
            fontSize: 9, padding: '3px 9px', borderRadius: 6,
            background: 'rgba(255,255,255,.08)',
            color: 'rgba(255,255,255,.38)',
            letterSpacing: '0.1em', fontWeight: 700, textTransform: 'uppercase',
          }}>
            OP
          </span>

          {canPlay && (
            <button
              onClick={e => { e.stopPropagation(); onListen() }}
              style={{
                background: 'none', border: 'none',
                color: isPlaying ? accent : 'rgba(255,255,255,.45)',
                fontSize: 13, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '2px 6px', borderRadius: 6,
                transition: 'color 0.2s',
                fontWeight: 600,
              }}
              onMouseEnter={e => { e.currentTarget.style.color = accent }}
              onMouseLeave={e => { if (!isPlaying) e.currentTarget.style.color = 'rgba(255,255,255,.45)' }}
            >
              <span style={{ fontSize: 11 }}>{isPlaying ? '■' : '▶'}</span>
              <span style={{ fontSize: 10, letterSpacing: '0.04em' }}>{isPlaying ? 'Stop' : 'Play'}</span>
            </button>
          )}
        </div>

        {/* Espace vide pour pousser le bas vers le bas */}
        <div style={{ flex: 1 }} />

        {/* Bottom info */}
        <div style={{ padding: isMobile ? '0 16px 16px' : '0 20px 20px' }}>
          <div style={{
            fontSize: 10, color: 'rgba(255,255,255,.36)',
            letterSpacing: '0.09em', textTransform: 'uppercase', marginBottom: 5,
          }}>
            {participant.anime}
          </div>

          <div style={{
            fontSize: isMobile ? 18 : 24,
            fontWeight: 800,
            color: isWinner ? GOLD_L : isPlaying ? accent : 'rgba(255,255,255,.96)',
            lineHeight: 1.15, marginBottom: 4,
            textShadow: isWinner
              ? `0 0 32px rgba(212,160,23,.55)`
              : isPlaying
                ? `0 0 24px ${accent}60`
                : '0 2px 10px rgba(0,0,0,.9)',
          }}>
            {participant.title}
          </div>

          <div style={{ fontSize: 11, color: 'rgba(255,255,255,.32)', marginBottom: 16, fontStyle: 'italic' }}>
            {participant.artist}
          </div>

          {/* Vote bar */}
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
              background: 'rgba(212,160,23,.1)', border: '1px solid rgba(212,160,23,.25)',
              borderRadius: 8, padding: '5px 12px',
              fontSize: 11, color: GOLD, fontWeight: 700,
            }}>
              ✓ Votre sélection
            </div>
          ) : (
            <button
              onClick={e => { e.stopPropagation(); onVote(side) }}
              style={{
                width: '100%', padding: '12px 0',
                borderRadius: 12, border: `1px solid rgba(212,160,23,.4)`,
                background: 'rgba(212,160,23,.1)',
                color: GOLD, fontSize: 13, fontWeight: 700,
                cursor: 'pointer', letterSpacing: '0.05em',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(212,160,23,.22)'; e.currentTarget.style.borderColor = GOLD }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(212,160,23,.1)'; e.currentTarget.style.borderColor = 'rgba(212,160,23,.4)' }}
            >
              Voter pour cet opening
            </button>
          )}
        </div>
      </div>
    </motion.div>
  )
}
