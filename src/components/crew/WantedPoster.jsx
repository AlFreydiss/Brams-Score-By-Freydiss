import { useState } from 'react'
import { motion } from 'framer-motion'
import { C, ROLE_COLORS, ROLE_LABELS, ROLE_LEVEL, POSTER_W, POSTER_H } from '../../lib/crew/constants.js'
import { formatBounty, getBountyTier } from '../../lib/crew/bountyFormatter.js'
import css from '../../styles/constellation.module.css'

function defaultAvatar(userId) {
  return `https://cdn.discordapp.com/embed/avatars/${parseInt(userId) % 5}.png`
}

// Ink stain position is deterministic per user_id so it doesn't jump on re-render
function stainStyle(userId, scale) {
  const id = parseInt(userId) || 0
  return {
    width:  Math.round((22 + (id % 18)) * scale),
    height: Math.round((14 + (id % 12)) * scale),
    top:    `${28 + (id % 28)}%`,
    right:  `${8  + (id % 14)}%`,
  }
}

// ── Framer Motion variants ────────────────────────────────────────────────

const spring = { type: 'spring', damping: 20, stiffness: 260 }
const fast   = { type: 'spring', damping: 22, stiffness: 340 }

// ─────────────────────────────────────────────────────────────────────────────

/**
 * @param {object}   member        enriched member with _pos
 * @param {string|null} hoveredId  user_id of currently hovered poster
 * @param {Set<string>} relatedIds user_ids of posters connected to hovered one
 * @param {function} onHoverStart
 * @param {function} onHoverEnd
 * @param {function} onClick
 * @param {number}   motionDelay   stagger delay in seconds
 */
export default function WantedPoster({
  member,
  hoveredId,
  relatedIds,
  onHoverStart,
  onHoverEnd,
  onClick,
  motionDelay = 0,
}) {
  const [imgError, setImgError] = useState(false)

  const pos        = member._pos
  const scale      = pos.scale
  const w          = Math.round(POSTER_W * scale)
  const h          = Math.round(POSTER_H * scale)
  const roleColor  = ROLE_COLORS[member.position] || ROLE_COLORS.mousse
  const roleLabel  = ROLE_LABELS[member.position] || member.position || 'Mousse'
  const tier       = getBountyTier(member.contribution)
  const isCapitaine = ROLE_LEVEL[member.position] === 0
  const name       = member.username || `Pirate #${String(member.user_id).slice(-4)}`
  const bountyStr  = formatBounty(member.contribution)
  const avatarSrc  = member.avatar_url && !imgError ? member.avatar_url : defaultAvatar(member.user_id)

  // Dimming logic
  const isSelf    = hoveredId === String(member.user_id)
  const isRelated = relatedIds?.has(String(member.user_id))
  const isDimmed  = hoveredId !== null && !isSelf && !isRelated

  // Base shadow
  const shadow = isCapitaine
    ? `0 6px 12px rgba(185,28,28,0.22), 0 14px 28px rgba(31,20,10,0.32), inset 0 1px 2px rgba(255,255,255,0.55)`
    : `0 4px 8px rgba(31,20,10,0.18), 0 8px 16px rgba(31,20,10,0.10), inset 0 1px 2px rgba(255,255,255,0.55)`

  // Outer tier decoration class
  const tierCls = tier === 'yonkou' ? css.yonkouPulse : tier === 'supernova' ? css.supernovaRing : ''

  // Font sizes (scaled)
  const fs = (base) => Math.round(base * scale)

  return (
    // Outer wrapper: handles position + z-index
    <div
      style={{
        position: 'absolute',
        left:    pos.x - w / 2,
        top:     pos.y - h / 2,
        width:   w,
        height:  h,
        zIndex:  isSelf ? 999 : pos.zIndex,
        // Hard pin shadow
        filter:  isDimmed ? 'none' : undefined,
      }}
    >
      {/* Framer Motion wrapper: handles rotation, scale, dim, hover */}
      <motion.article
        role="article"
        aria-label={`Avis WANTED — ${name} — ${roleLabel} — ${bountyStr}`}
        tabIndex={0}
        className={`${css.posterFocus} ${tierCls}`}
        style={{ width: '100%', height: '100%', transformOrigin: 'top center', position: 'relative' }}
        initial={{ opacity: 0, scale: 0.55, rotate: pos.rotation }}
        animate={{
          opacity:  isDimmed ? 0.22 : pos.opacity,
          scale:    1,
          rotate:   pos.rotation,
          filter:   isDimmed ? 'saturate(0.15) brightness(0.85)' : 'saturate(1) brightness(1)',
          transition: { opacity: { duration: 0.22 }, filter: { duration: 0.22 } },
        }}
        whileHover={{
          scale:  1.08,
          rotate: 0,
          filter: 'saturate(1.05) brightness(1.02)',
          transition: fast,
        }}
        whileTap={{ scale: 0.97, transition: { duration: 0.08 } }}
        transition={{ ...spring, delay: motionDelay }}
        onHoverStart={() => onHoverStart?.(String(member.user_id))}
        onHoverEnd={onHoverEnd}
        onClick={onClick}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick?.() } }}
        cursor="pointer"
      >
        {/* Punaise */}
        <div className={css.pin} />

        {/* ── Poster body ── */}
        <div
          className={css.paperTexture}
          style={{
            width: '100%',
            height: '100%',
            background: 'linear-gradient(175deg, #FAF3E0 0%, #F0E4C8 45%, #E8D4A0 100%)',
            borderRadius: 4,
            boxShadow: shadow,
            border: `${Math.max(1, Math.round(1.5 * scale))}px solid rgba(92,66,38,0.55)`,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            cursor: 'pointer',
            position: 'relative',
          }}
        >
          {/* Role color stripe */}
          <div style={{
            height:     Math.max(3, fs(5.5)),
            background: roleColor,
            flexShrink: 0,
            boxShadow:  `0 1px 3px ${roleColor}70`,
          }} />

          {/* ── WANTED header ── */}
          <div style={{
            textAlign:      'center',
            paddingTop:     fs(5),
            paddingBottom:  fs(2),
            paddingLeft:    fs(4),
            paddingRight:   fs(4),
            flexShrink:     0,
            background:     'linear-gradient(180deg, rgba(31,20,10,0.04) 0%, transparent 100%)',
          }}>
            <div style={{
              fontFamily:    "'Cinzel', 'Trajan Pro', serif",
              fontSize:      fs(6),
              fontWeight:    400,
              letterSpacing: '0.22em',
              color:         C.p600,
              lineHeight:    1,
              marginBottom:  fs(1),
            }}>
              AVIS DE RECHERCHE
            </div>

            <div style={{
              fontFamily:    "'Cinzel', 'Trajan Pro', serif",
              fontSize:      fs(isCapitaine ? 27 : 24),
              fontWeight:    900,
              color:         C.ink,
              lineHeight:    1,
              letterSpacing: '0.06em',
            }}>
              WANTED
            </div>

            <div style={{
              fontFamily:    "'Cinzel', serif",
              fontSize:      fs(5.5),
              fontWeight:    600,
              letterSpacing: '0.16em',
              color:         C.crimson,
              lineHeight:    1,
              marginTop:     fs(1),
            }}>
              DEAD OR ALIVE
            </div>
          </div>

          {/* Separator */}
          <Divider scale={scale} />

          {/* ── Portrait ── */}
          <div style={{
            flex:           1,
            minHeight:      0,
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
            padding:        `0 ${fs(8)}px`,
          }}>
            <div style={{
              width:    '100%',
              aspectRatio: '1',
              border:   `${Math.max(1, fs(1.8))}px solid ${C.p500}`,
              borderRadius: 2,
              overflow: 'hidden',
              background: `${roleColor}14`,
              boxShadow: 'inset 0 2px 6px rgba(31,20,10,0.2)',
            }}>
              <img
                src={avatarSrc}
                alt={`Portrait de ${name}`}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                onError={() => setImgError(true)}
                loading="lazy"
              />
            </div>
          </div>

          {/* Separator */}
          <Divider scale={scale} />

          {/* ── Name + role ── */}
          <div style={{
            textAlign: 'center',
            padding:   `${fs(3)}px ${fs(6)}px ${fs(2)}px`,
            flexShrink: 0,
          }}>
            <div style={{
              fontFamily:    "'EB Garamond', Garamond, serif",
              fontSize:      fs(9.5),
              fontWeight:    700,
              color:         C.inkSepia,
              lineHeight:    1.2,
              overflow:      'hidden',
              textOverflow:  'ellipsis',
              whiteSpace:    'nowrap',
              maxWidth:      '100%',
            }}>
              {name}
            </div>

            <div style={{
              fontFamily:    "'Cinzel', serif",
              fontSize:      fs(5.5),
              fontWeight:    600,
              color:         roleColor,
              letterSpacing: '0.1em',
              marginTop:     fs(1),
              textTransform: 'uppercase',
            }}>
              {roleLabel}
            </div>
          </div>

          {/* ── Prime ── */}
          <div style={{
            textAlign:   'center',
            padding:     `${fs(2)}px ${fs(6)}px ${fs(6)}px`,
            flexShrink:  0,
            background:  'linear-gradient(180deg, transparent 0%, rgba(31,20,10,0.04) 100%)',
          }}>
            <div style={{
              fontFamily:    "'IM Fell English', 'Palatino Linotype', serif",
              fontStyle:     'italic',
              fontSize:      fs(5),
              letterSpacing: '0.18em',
              color:         C.p500,
              marginBottom:  fs(1),
            }}>
              P R I M E
            </div>
            <div style={{
              fontFamily:    "'Cinzel', serif",
              fontSize:      fs(tier === 'yonkou' ? 7.5 : 8.5),
              fontWeight:    700,
              color:         tier === 'yonkou' || tier === 'supernova' ? C.goldDark : C.p700,
              lineHeight:    1.1,
              letterSpacing: '0.02em',
            }}>
              {bountyStr}
            </div>
          </div>

          {/* Ink stain overlay */}
          <div className={css.stain} style={stainStyle(member.user_id, scale)} />

          {/* Fold corner */}
          <div className={css.fold} />
        </div>
      </motion.article>
    </div>
  )
}

function Divider({ scale }) {
  return (
    <div style={{
      height:     1,
      margin:     `${Math.round(3 * scale)}px ${Math.round(8 * scale)}px`,
      background: 'linear-gradient(90deg, transparent, #8B6914, transparent)',
      flexShrink: 0,
    }} />
  )
}
