import { useState } from 'react'
import { motion } from 'framer-motion'

const GOLD       = '#e91e8c'
const CARD_H     = 72
const CARD_W     = 200
const GAP        = 12
const COL_GAP    = 48
const CELL_H     = CARD_H + GAP

// Y position of match i in round r (0-indexed from the largest round)
function matchY(r, i) {
  if (r === 0) return i * CELL_H
  const factor = Math.pow(2, r)
  return (factor * i + (factor - 1) / 2) * CELL_H
}

// ── Match card ─────────────────────────────────────────────────────────────
function MatchCard({ match, isActive, isMobile }) {
  const [imgL, setImgL] = useState(false)
  const [imgR, setImgR] = useState(false)

  const borderColor = isActive ? GOLD
    : match.status === 'closed' ? 'rgba(233,30,140,0.25)'
    : 'rgba(255,255,255,0.07)'

  const bg = isActive ? 'rgba(233,30,140,0.07)'
    : 'rgba(255,255,255,0.025)'

  function Slot({ participant, isWinner, isLoser, imgFailed, setImgFailed }) {
    const thumb = participant?.ytId && !participant.ytId.startsWith('similar') && !imgFailed
      ? `https://img.youtube.com/vi/${participant.ytId}/default.jpg`
      : null

    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 7,
        padding: '6px 8px',
        opacity: isLoser ? 0.3 : 1,
        borderRadius: 6,
        background: isWinner ? 'rgba(233,30,140,0.1)' : 'transparent',
        transition: 'all 0.2s',
        minWidth: 0,
      }}>
        {thumb ? (
          <img
            src={thumb}
            onError={() => setImgFailed(true)}
            style={{ width: 24, height: 18, objectFit: 'cover', borderRadius: 3, flexShrink: 0 }}
          />
        ) : (
          <div style={{
            width: 24, height: 18, borderRadius: 3, flexShrink: 0,
            background: participant?.color ? `${participant.color}44` : 'rgba(255,255,255,.08)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 9, color: 'rgba(255,255,255,.3)',
          }}>♪</div>
        )}
        <div style={{ minWidth: 0 }}>
          <div style={{
            fontSize: 11, fontWeight: isWinner ? 700 : 400,
            color: isWinner ? GOLD : participant ? 'rgba(255,255,255,.78)' : 'rgba(255,255,255,.2)',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            maxWidth: isMobile ? 120 : 150,
          }}>
            {participant?.title || 'À déterminer'}
          </div>
          {participant && (
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,.28)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 140 }}>
              {participant.anime}
            </div>
          )}
        </div>
        {isWinner && <span style={{ fontSize: 9, color: GOLD, marginLeft: 'auto', flexShrink: 0 }}>✦</span>}
      </div>
    )
  }

  return (
    <div style={{
      width: CARD_W,
      borderRadius: 8,
      border: `1px solid ${borderColor}`,
      background: bg,
      overflow: 'hidden',
      boxShadow: isActive ? `0 0 0 1px rgba(233,30,140,.15), 0 4px 20px rgba(233,30,140,.08)` : 'none',
      transition: 'all 0.3s',
    }}>
      <Slot
        participant={match.left}
        isWinner={match.status === 'closed' && match.winnerId === match.left?.id}
        isLoser={match.status === 'closed' && match.winnerId !== match.left?.id && !!match.left}
        imgFailed={imgL}
        setImgFailed={setImgL}
      />
      <div style={{ height: 1, background: 'rgba(255,255,255,.06)' }} />
      <Slot
        participant={match.right}
        isWinner={match.status === 'closed' && match.winnerId === match.right?.id}
        isLoser={match.status === 'closed' && match.winnerId !== match.right?.id && !!match.right}
        imgFailed={imgR}
        setImgFailed={setImgR}
      />
      {isActive && (
        <div style={{
          textAlign: 'center', fontSize: 9,
          color: GOLD, padding: '3px 0 4px',
          letterSpacing: '0.08em', fontWeight: 700,
          background: 'rgba(233,30,140,.05)',
        }}>VOTE EN COURS</div>
      )}
    </div>
  )
}

// ── Desktop bracket (absolute positioning, SVG connectors) ────────────────
function DesktopBracket({ rounds, currentMatchId }) {
  const leafCount = rounds[0]?.matches.length || 0
  const totalH    = leafCount * CELL_H - GAP + 32

  return (
    <div style={{ overflowX: 'auto', overflowY: 'auto', paddingBottom: 20 }}>
      <div style={{ position: 'relative', height: totalH, width: rounds.length * (CARD_W + COL_GAP) - COL_GAP + 40 }}>

        {rounds.map((round, r) => (
          <div key={round.id}>
            {/* Round label */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: r * (CARD_W + COL_GAP),
              width: CARD_W,
              textAlign: 'center',
              fontSize: 10,
              color: 'rgba(255,255,255,.35)',
              letterSpacing: '0.08em',
              paddingBottom: 8,
            }}>
              {round.short.toUpperCase()}
            </div>

            {round.matches.map((match, mi) => {
              const y   = matchY(r, mi) + 24 // +24 for the label
              const x   = r * (CARD_W + COL_GAP)
              const isA = match.id === currentMatchId

              return (
                <div key={match.id}>
                  <div style={{ position: 'absolute', left: x, top: y }}>
                    <MatchCard match={match} isActive={isA} isMobile={false} />
                  </div>

                  {/* Connector line to next round */}
                  {r < rounds.length - 1 && (
                    <ConnectorLine
                      x1={x + CARD_W}
                      y1={y + CARD_H / 2}
                      x2={x + CARD_W + COL_GAP}
                      y2={matchY(r + 1, Math.floor(mi / 2)) + 24 + CARD_H / 2}
                      active={match.status === 'closed'}
                    />
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

function ConnectorLine({ x1, y1, x2, y2, active }) {
  const midX = x1 + (x2 - x1) / 2
  const d = `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`
  return (
    <svg
      style={{ position: 'absolute', top: 0, left: 0, overflow: 'visible', pointerEvents: 'none' }}
      width={1} height={1}
    >
      <path
        d={d}
        fill="none"
        stroke={active ? `rgba(233,30,140,0.4)` : `rgba(255,255,255,0.07)`}
        strokeWidth={1.5}
      />
    </svg>
  )
}

// ── Mobile bracket (accordion by round) ──────────────────────────────────
function MobileBracket({ rounds, currentMatchId }) {
  const [open, setOpen] = useState(() => {
    const cur = rounds.findIndex(r => r.matches.some(m => m.status === 'voting'))
    return cur >= 0 ? cur : 0
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {rounds.map((round, ri) => {
        const isDone   = round.matches.every(m => m.status === 'closed' || (!m.left || !m.right))
        const isCur    = round.matches.some(m => m.status === 'voting')
        const isExpand = open === ri

        return (
          <div key={round.id} style={{
            borderRadius: 12,
            border: `1px solid ${isCur ? 'rgba(233,30,140,.3)' : 'rgba(255,255,255,.07)'}`,
            overflow: 'hidden',
          }}>
            <button
              onClick={() => setOpen(isExpand ? -1 : ri)}
              style={{
                width: '100%', padding: '12px 16px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                background: isCur ? 'rgba(233,30,140,.06)' : 'rgba(255,255,255,.02)',
                border: 'none', cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: isCur ? GOLD : 'rgba(255,255,255,.7)' }}>
                  {round.label}
                </span>
                {isCur && (
                  <span style={{
                    fontSize: 9, background: GOLD, color: '#000',
                    borderRadius: 4, padding: '2px 6px', fontWeight: 800,
                    letterSpacing: '0.06em',
                  }}>EN COURS</span>
                )}
                {isDone && (
                  <span style={{ fontSize: 9, color: 'rgba(255,255,255,.3)' }}>TERMINÉ</span>
                )}
              </div>
              <span style={{ color: 'rgba(255,255,255,.3)', fontSize: 11, transform: isExpand ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▼</span>
            </button>

            {isExpand && (
              <div style={{ padding: '8px 12px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {round.matches.map(match => (
                  <div key={match.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 8, background: match.id === currentMatchId ? 'rgba(233,30,140,.06)' : 'rgba(255,255,255,.02)', border: `1px solid ${match.id === currentMatchId ? 'rgba(233,30,140,.25)' : 'rgba(255,255,255,.06)'}` }}>
                    <MobileMatchRow match={match} isActive={match.id === currentMatchId} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function MobileMatchRow({ match, isActive }) {
  function Slot({ p, isWinner, isLoser }) {
    return (
      <div style={{
        flex: 1, minWidth: 0, opacity: isLoser ? 0.3 : 1,
        padding: '2px 4px',
        borderRadius: 4,
        background: isWinner ? 'rgba(233,30,140,.08)' : 'transparent',
      }}>
        <div style={{ fontSize: 12, fontWeight: isWinner ? 700 : 400, color: isWinner ? GOLD : 'rgba(255,255,255,.78)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {p?.title || <span style={{ color: 'rgba(255,255,255,.2)' }}>TBD</span>}
        </div>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,.3)' }}>{p?.anime}</div>
      </div>
    )
  }

  return (
    <>
      <Slot p={match.left}  isWinner={match.status==='closed'&&match.winnerId===match.left?.id}  isLoser={match.status==='closed'&&match.winnerId!==match.left?.id&&!!match.left}  />
      <span style={{ fontSize: 10, color: 'rgba(255,255,255,.2)', flexShrink: 0 }}>vs</span>
      <Slot p={match.right} isWinner={match.status==='closed'&&match.winnerId===match.right?.id} isLoser={match.status==='closed'&&match.winnerId!==match.right?.id&&!!match.right} />
      {isActive && <span style={{ fontSize: 8, color: GOLD, fontWeight: 800, flexShrink: 0, letterSpacing: '0.06em' }}>VOTE</span>}
      {match.status==='closed' && <span style={{ fontSize: 9, color: 'rgba(255,255,255,.25)', flexShrink: 0 }}>✓</span>}
    </>
  )
}

// ── Export ─────────────────────────────────────────────────────────────────
export default function TournamentBracket({ rounds, currentMatchId, isMobile }) {
  if (!rounds?.length) return null

  return (
    <div>
      <p style={{ fontSize: 12, color: 'rgba(255,255,255,.3)', marginBottom: 20, lineHeight: 1.5 }}>
        {isMobile
          ? 'Sélectionne un round pour voir les matchs. Le round en cours est surligné en or.'
          : 'Les matchs actifs sont surlignés. Les lignes or représentent les vainqueurs qui avancent.'}
      </p>
      {isMobile
        ? <MobileBracket rounds={rounds} currentMatchId={currentMatchId} />
        : <DesktopBracket rounds={rounds} currentMatchId={currentMatchId} />}
    </div>
  )
}
