import { useState } from 'react'
import { motion } from 'framer-motion'

const GOLD   = '#d4a017'
const GOLD_L = '#f0c040'

export default function OSTCard({
  participant,
  side,
  voted,
  isWinner,
  isLoser,
  votePercent,
  voteCount,
  hasVoted,
  onVote,
  onListen,
  showResult,
  isMobile,
}) {
  const [imgFailed, setImgFailed] = useState(false)
  const ytOk  = participant?.ytId && !participant.ytId.startsWith('similar')
  const thumb = ytOk && !imgFailed
    ? `https://img.youtube.com/vi/${participant.ytId}/hqdefault.jpg`
    : null

  const accent = participant?.color || GOLD
  const myVote = voted === side

  if (!participant) {
    return (
      <div style={{
        flex: 1, minWidth: 0,
        minHeight: isMobile ? 180 : 420,
        borderRadius: 20,
        border: '1px solid rgba(255,255,255,.06)',
        background: 'rgba(255,255,255,.015)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ color: 'rgba(255,255,255,.18)', fontSize: 13 }}>À déterminer</span>
      </div>
    )
  }

  return (
    <motion.div
      style={{
        flex: 1, minWidth: 0, position: 'relative',
        borderRadius: 20,
        border: `1px solid ${
          isWinner  ? GOLD
          : isLoser ? 'rgba(255,255,255,.04)'
          : myVote  ? 'rgba(212,160,23,.4)'
          :           'rgba(255,255,255,.09)'
        }`,
        overflow: 'hidden',
        cursor: !hasVoted ? 'pointer' : 'default',
        minHeight: isMobile ? 260 : 440,
        display: 'flex', flexDirection: 'column',
        boxShadow: isWinner
          ? `0 0 0 1px rgba(212,160,23,.25), 0 8px 48px rgba(212,160,23,.12)`
          : 'none',
        transition: 'border-color 0.35s, box-shadow 0.35s',
      }}
      whileHover={!hasVoted ? { scale: 1.012 } : {}}
      transition={{ duration: 0.2 }}
      onClick={!hasVoted ? () => onVote(side) : undefined}
    >
      {/* ── Background ── */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
        {thumb ? (
          <>
            <img loading="lazy" decoding="async"
              src={thumb}
              onError={() => setImgFailed(true)}
              alt=""
              style={{
                position: 'absolute', inset: '-5%',
                width: '110%', height: '110%',
                maxWidth: 'none', maxHeight: 'none',
                objectFit: 'cover',
                filter: `blur(18px) brightness(${isLoser ? 0.18 : 0.30}) saturate(1.2)`,
              }}
            />
            <div style={{
              position: 'absolute', inset: 0,
              background: `linear-gradient(170deg, ${accent}22 0%, transparent 40%, rgba(7,9,14,0.88) 72%, rgba(7,9,14,0.97) 100%)`,
            }} />
          </>
        ) : (
          <div style={{
            position: 'absolute', inset: 0,
            background: `radial-gradient(ellipse at 35% 25%, ${accent}55 0%, ${accent}20 38%, rgba(7,9,14,0.97) 72%)`,
          }} />
        )}

        {isWinner && (
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(180deg, rgba(212,160,23,.07) 0%, transparent 50%)',
          }} />
        )}
        {isLoser && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.48)' }} />
        )}
      </div>

      {/* ── Content ── */}
      <div style={{ position: 'relative', zIndex: 1, flex: 1, display: 'flex', flexDirection: 'column' }}>

        {/* Top bar */}
        <div style={{
          padding: '14px 16px 0',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{
            fontSize: 9, padding: '3px 9px', borderRadius: 6,
            background: participant.type === 'insert'
              ? 'rgba(212,160,23,.18)'
              : 'rgba(255,255,255,.07)',
            color: participant.type === 'insert' ? GOLD : 'rgba(255,255,255,.35)',
            letterSpacing: '0.08em', fontWeight: 700, textTransform: 'uppercase',
          }}>
            {participant.type === 'insert' ? 'INSERT' : 'BGM'}
          </span>

          {ytOk && (
            <button
              onClick={e => { e.stopPropagation(); onListen(participant.ytId) }}
              style={{
                background: 'rgba(0,0,0,.62)',
                border: '1px solid rgba(255,255,255,.18)',
                borderRadius: 20, padding: '5px 13px',
                color: 'rgba(255,255,255,.8)', fontSize: 11,
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
                backdropFilter: 'blur(6px)',
                transition: 'background 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,.1)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,.62)'}
            >
              <span style={{ fontSize: 10 }}>▶</span> Écouter
            </button>
          )}
        </div>

        {/* Spacer — reveals the blurred BG as "poster" area */}
        <div style={{ flex: 1 }} />

        {/* Bottom info */}
        <div style={{ padding: '0 18px 18px' }}>
          <div style={{
            fontSize: 10, color: 'rgba(255,255,255,.4)',
            letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 5,
          }}>
            {participant.anime}
          </div>

          <div style={{
            fontSize: isMobile ? 17 : 21,
            fontWeight: 800,
            color: isWinner ? GOLD_L : 'rgba(255,255,255,.94)',
            lineHeight: 1.2, marginBottom: 4,
            textShadow: isWinner
              ? `0 0 24px rgba(212,160,23,.5)`
              : '0 1px 6px rgba(0,0,0,.7)',
          }}>
            {participant.title}
          </div>

          <div style={{ fontSize: 12, color: 'rgba(255,255,255,.38)', marginBottom: 14 }}>
            {participant.artist}
          </div>

          {/* Vote result bar */}
          {showResult && (
            <div style={{ marginBottom: 12 }}>
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                fontSize: 12, marginBottom: 5,
              }}>
                <span style={{ fontWeight: 700, color: isWinner ? GOLD : 'rgba(255,255,255,.45)' }}>
                  {votePercent}%
                </span>
                <span style={{ color: 'rgba(255,255,255,.28)' }}>
                  {voteCount} vote{voteCount !== 1 ? 's' : ''}
                </span>
              </div>
              <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,.08)', overflow: 'hidden' }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${votePercent}%` }}
                  transition={{ delay: 0.3, duration: 0.9, ease: 'easeOut' }}
                  style={{
                    height: '100%',
                    background: isWinner
                      ? `linear-gradient(90deg, ${GOLD}, ${GOLD_L})`
                      : 'rgba(255,255,255,.22)',
                    borderRadius: 2,
                  }}
                />
              </div>
            </div>
          )}

          {/* Status badge */}
          {showResult && (
            <div style={{
              fontSize: 10, fontWeight: 800, letterSpacing: '0.12em',
              color: isWinner ? GOLD : 'rgba(255,255,255,.18)',
            }}>
              {isWinner ? '✦ QUALIFIÉ →' : 'ÉLIMINÉ'}
            </div>
          )}

          {/* My vote indicator */}
          {myVote && !showResult && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              background: 'rgba(212,160,23,.12)',
              border: '1px solid rgba(212,160,23,.25)',
              borderRadius: 8, padding: '4px 10px',
              fontSize: 11, color: GOLD, fontWeight: 700,
            }}>
              ✓ Votre sélection
            </div>
          )}

          {/* Vote button */}
          {!hasVoted && (
            <button
              onClick={e => { e.stopPropagation(); onVote(side) }}
              style={{
                width: '100%', padding: '12px 0',
                borderRadius: 12,
                border: `1px solid rgba(212,160,23,.35)`,
                background: 'rgba(212,160,23,.1)',
                color: GOLD, fontSize: 13, fontWeight: 700,
                cursor: 'pointer', letterSpacing: '0.04em',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(212,160,23,.22)'
                e.currentTarget.style.borderColor = GOLD
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'rgba(212,160,23,.1)'
                e.currentTarget.style.borderColor = 'rgba(212,160,23,.35)'
              }}
            >
              Voter pour cette OST
            </button>
          )}
        </div>
      </div>
    </motion.div>
  )
}
