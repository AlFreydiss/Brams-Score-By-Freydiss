import { useState } from 'react'
import { motion } from 'framer-motion'

const GOLD   = '#d4a017'
const GOLD_L = '#f0c040'

function MusicIcon({ color }) {
  return (
    <svg width="72" height="72" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M9 18V5l12-2v13" stroke={color} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.45"/>
      <circle cx="6" cy="18" r="3" stroke={color} strokeWidth="1.2" opacity="0.45"/>
      <circle cx="18" cy="16" r="3" stroke={color} strokeWidth="1.2" opacity="0.45"/>
    </svg>
  )
}

export default function OSTDuelCard({
  participant, side, voted, isWinner, isLoser,
  votePercent, voteCount, hasVoted, onVote, onListen,
  isListening, showResult, isMobile,
}) {
  const [imgState, setImgState] = useState('loading') // 'loading' | 'ok' | 'failed'

  const ytOk    = participant?.ytId && !participant.ytId.startsWith('similar')
  const mediaUrl = participant?.mediaUrl || participant?.url || null
  const canListen = !!mediaUrl || ytOk
  const thumbUrl = ytOk
    ? `https://img.youtube.com/vi/${participant.ytId}/hqdefault.jpg`
    : null
  const showImg  = !!thumbUrl && imgState !== 'failed'
  const accent   = participant?.color || GOLD
  const myVote   = voted === side

  function handleImgLoad(e) {
    // YouTube returns a 120×90 grey placeholder when thumbnail is unavailable
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

  return (
    <motion.div
      style={{
        flex: 1, minWidth: 0, position: 'relative',
        borderRadius: 20,
        border: `1px solid ${
          isWinner  ? GOLD
          : isLoser ? 'rgba(255,255,255,.04)'
          : myVote  ? 'rgba(212,160,23,.42)'
          :           'rgba(255,255,255,.1)'
        }`,
        overflow: 'hidden',
        cursor: !hasVoted ? 'pointer' : 'default',
        minHeight: isMobile ? 300 : 560,
        display: 'flex', flexDirection: 'column',
        boxShadow: isWinner
          ? `0 0 0 1px rgba(212,160,23,.18), 0 16px 64px rgba(212,160,23,.1)`
          : 'none',
        transition: 'border-color .35s, box-shadow .35s',
      }}
      whileHover={!hasVoted ? { scale: 1.01 } : {}}
      transition={{ duration: 0.2 }}
      onClick={!hasVoted ? () => onVote(side) : undefined}
    >
      {/* ── Background ── */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
        {showImg ? (
          <>
            <img
              src={thumbUrl}
              onLoad={handleImgLoad}
              onError={() => setImgState('failed')}
              alt=""
              style={{
                position: 'absolute', inset: '-5%',
                width: '110%', height: '110%',
                objectFit: 'cover',
                filter: `blur(22px) brightness(${isLoser ? 0.16 : 0.27}) saturate(1.3)`,
              }}
            />
            <div style={{
              position: 'absolute', inset: 0,
              background: `linear-gradient(165deg, ${accent}28 0%, transparent 35%, rgba(5,7,12,.88) 65%, rgba(5,7,12,.98) 100%)`,
            }} />
          </>
        ) : (
          /* Premium gradient fallback — never a grey square */
          <div style={{
            position: 'absolute', inset: 0,
            background: `radial-gradient(ellipse at 38% 28%, ${accent}60 0%, ${accent}22 38%, rgba(5,7,12,.98) 68%)`,
          }}>
            <div style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(180deg, transparent 42%, rgba(5,7,12,.98) 100%)',
            }} />
          </div>
        )}

        {isWinner && (
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(180deg, rgba(212,160,23,.08) 0%, transparent 42%)',
          }} />
        )}
        {isLoser && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.5)' }} />
        )}

        {isListening && mediaUrl && (
          <>
            <video
              key={mediaUrl}
              src={mediaUrl}
              autoPlay
              playsInline
              loop
              style={{
                position: 'absolute', inset: '-4%',
                width: '108%', height: '108%',
                objectFit: 'cover',
                opacity: 0.46,
                filter: 'blur(10px) brightness(.62) saturate(1.25)',
                transform: 'scale(1.03)',
              }}
            />
            <div style={{
              position: 'absolute', inset: 0,
              background: `linear-gradient(180deg, ${accent}18 0%, rgba(5,7,12,.58) 58%, rgba(5,7,12,.92) 100%)`,
            }} />
          </>
        )}
      </div>

      {/* ── Content ── */}
      <div style={{ position: 'relative', zIndex: 1, flex: 1, display: 'flex', flexDirection: 'column' }}>

        {/* Top bar */}
        <div style={{
          padding: '16px 18px 0',
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        }}>
          <span style={{
            fontSize: 9, padding: '3px 9px', borderRadius: 6,
            background: participant.type === 'insert' ? 'rgba(212,160,23,.18)' : 'rgba(255,255,255,.08)',
            color: participant.type === 'insert' ? GOLD : 'rgba(255,255,255,.38)',
            letterSpacing: '0.1em', fontWeight: 700, textTransform: 'uppercase',
            backdropFilter: 'blur(4px)',
          }}>
            {participant.type === 'insert' ? 'INSERT' : participant.type || 'BGM'}
          </span>

          {canListen && (
            <button
              onClick={e => { e.stopPropagation(); onListen(side, participant) }}
              style={{
                background: isListening ? 'rgba(212,160,23,.20)' : 'rgba(0,0,0,.68)',
                border: `1px solid ${isListening ? 'rgba(212,160,23,.58)' : 'rgba(255,255,255,.22)'}`,
                borderRadius: 20, padding: '6px 14px',
                color: isListening ? GOLD_L : 'rgba(255,255,255,.88)', fontSize: 12,
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                backdropFilter: 'blur(8px)', fontWeight: 600,
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = isListening ? 'rgba(212,160,23,.28)' : 'rgba(255,255,255,.14)'
                e.currentTarget.style.borderColor = isListening ? 'rgba(212,160,23,.72)' : 'rgba(255,255,255,.4)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = isListening ? 'rgba(212,160,23,.20)' : 'rgba(0,0,0,.68)'
                e.currentTarget.style.borderColor = isListening ? 'rgba(212,160,23,.58)' : 'rgba(255,255,255,.22)'
              }}
            >
              <span style={{ fontSize: 10 }}>{isListening ? '■' : '▶'}</span> {isListening ? 'Stop' : 'Écouter'}
            </button>
          )}
        </div>

        {/* Center music icon for gradient fallback */}
        {!showImg && (imgState !== 'loading' || !thumbUrl) && (
          <div style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
            paddingTop: 20,
          }}>
            <MusicIcon color={accent} />
          </div>
        )}
        {(showImg || (imgState === 'loading' && thumbUrl)) && <div style={{ flex: 1 }} />}

        {/* Bottom info */}
        <div style={{ padding: isMobile ? '0 16px 18px' : '0 22px 22px' }}>
          <div style={{
            fontSize: 10, color: 'rgba(255,255,255,.38)',
            letterSpacing: '0.09em', textTransform: 'uppercase', marginBottom: 6,
          }}>
            {participant.anime}
          </div>

          <div style={{
            fontSize: isMobile ? 20 : 27,
            fontWeight: 800,
            color: isWinner ? GOLD_L : 'rgba(255,255,255,.96)',
            lineHeight: 1.15, marginBottom: 5,
            textShadow: isWinner ? `0 0 32px rgba(212,160,23,.55)` : '0 2px 10px rgba(0,0,0,.85)',
          }}>
            {participant.title}
          </div>

          <div style={{
            fontSize: 12, color: 'rgba(255,255,255,.35)', marginBottom: 18,
            fontStyle: 'italic',
          }}>
            {participant.artist}
          </div>

          {/* Vote bar after voting */}
          {showResult && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
                <span style={{ fontWeight: 700, color: isWinner ? GOLD : 'rgba(255,255,255,.45)' }}>
                  {votePercent}%
                </span>
                <span style={{ color: 'rgba(255,255,255,.25)' }}>
                  {voteCount} vote{voteCount !== 1 ? 's' : ''}
                </span>
              </div>
              <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,.1)', overflow: 'hidden' }}>
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

          {/* CTA area */}
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
                width: '100%', padding: '13px 0',
                borderRadius: 12, border: `1px solid rgba(212,160,23,.4)`,
                background: 'rgba(212,160,23,.1)',
                color: GOLD, fontSize: 13, fontWeight: 700,
                cursor: 'pointer', letterSpacing: '0.05em',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(212,160,23,.24)'; e.currentTarget.style.borderColor = GOLD }}
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
