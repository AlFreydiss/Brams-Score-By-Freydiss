import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { C, ROLE_COLORS, ROLE_LABELS, ROLE_LEVEL } from '../../lib/crew/constants.js'
import { formatBounty, getBountyTier } from '../../lib/crew/bountyFormatter.js'
import css from '../../styles/constellation.module.css'

function defaultAvatar(userId) {
  return `https://cdn.discordapp.com/embed/avatars/${parseInt(userId) % 5}.png`
}

const drawerVariants = {
  hidden:  { x: '100%', opacity: 0.6 },
  visible: { x: 0,      opacity: 1, transition: { type: 'spring', damping: 26, stiffness: 300 } },
  exit:    { x: '100%', opacity: 0.6, transition: { duration: 0.25, ease: [0.4, 0, 1, 1] } },
}

const mobileVariants = {
  hidden:  { y: '100%', opacity: 0.6 },
  visible: { y: 0,      opacity: 1, transition: { type: 'spring', damping: 28, stiffness: 320 } },
  exit:    { y: '100%', opacity: 0.6, transition: { duration: 0.22, ease: [0.4, 0, 1, 1] } },
}

/**
 * Slide-in drawer modal for poster details.
 * @param {object|null} member    selected crew member (or null to close)
 * @param {function}    onClose
 */
export default function PosterDetailModal({ member, onClose }) {
  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose?.() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  // Lock body scroll
  useEffect(() => {
    if (member) {
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = '' }
    }
  }, [member])

  return (
    <AnimatePresence>
      {member && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            className={css.backdrop}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
          />

          {/* Drawer */}
          <ModalContent member={member} onClose={onClose} />
        </>
      )}
    </AnimatePresence>
  )
}

function ModalContent({ member, onClose }) {
  const navigate = useNavigate()
  const roleColor = ROLE_COLORS[member.position] || ROLE_COLORS.mousse
  const roleLabel = ROLE_LABELS[member.position] || member.position || 'Mousse'
  const tier      = getBountyTier(member.contribution)
  const name      = member.username || `Pirate #${String(member.user_id).slice(-4)}`
  const bountyStr = formatBounty(member.contribution)
  const avatarSrc = member.avatar_url || defaultAvatar(member.user_id)
  const joinDate  = member.joined_at
    ? new Date(member.joined_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    : 'Inconnue'

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640
  const variants = isMobile ? mobileVariants : drawerVariants

  return (
    <motion.aside
      key="drawer"
      className={css.modalDrawer}
      variants={variants}
      initial="hidden"
      animate="visible"
      exit="exit"
      role="dialog"
      aria-label={`Détails — ${name}`}
      aria-modal="true"
    >
      {/* Close button */}
      <button
        onClick={onClose}
        aria-label="Fermer"
        style={{
          position:   'absolute',
          top:        16,
          right:      20,
          background: 'none',
          border:     `1px solid rgba(92,66,38,0.4)`,
          borderRadius: '50%',
          width:      32,
          height:     32,
          display:    'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor:     'pointer',
          color:      C.p700,
          fontSize:   18,
          lineHeight: 1,
          transition: 'all 0.15s ease',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(31,20,10,0.12)' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
      >
        ✕
      </button>

      {/* Role color top stripe */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: roleColor, borderRadius: '12px 12px 0 0' }} />

      {/* ── Large portrait ── */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 20, marginTop: 8 }}>
        <div style={{
          width:       120,
          height:      120,
          border:      `3px solid ${roleColor}`,
          borderRadius: 4,
          overflow:    'hidden',
          boxShadow:   `0 4px 16px rgba(31,20,10,0.25), 0 0 0 1px rgba(92,66,38,0.3)`,
          marginBottom: 12,
        }}>
          <img src={avatarSrc} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        </div>

        <div style={{ fontFamily: "'Cinzel', serif", fontSize: 22, fontWeight: 900, color: C.ink, textAlign: 'center', lineHeight: 1.2 }}>
          {name}
        </div>
        <div style={{ fontFamily: "'Cinzel', serif", fontSize: 11, fontWeight: 600, color: roleColor, letterSpacing: '0.12em', marginTop: 4 }}>
          {roleLabel.toUpperCase()}
        </div>

        {/* Tier badge */}
        {tier !== 'unknown' && (
          <div style={{
            marginTop:   8,
            padding:     '3px 12px',
            background:  tier === 'yonkou' ? 'rgba(212,175,55,0.2)' : 'rgba(92,66,38,0.12)',
            border:      `1px solid ${tier === 'yonkou' ? C.goldDark : 'rgba(92,66,38,0.3)'}`,
            borderRadius: 20,
            fontFamily:  "'IM Fell English', serif",
            fontStyle:   'italic',
            fontSize:    11,
            color:       tier === 'yonkou' ? C.goldDark : C.p600,
            letterSpacing: '0.08em',
          }}>
            {tier === 'yonkou' ? 'Niveau Yonkou' : tier === 'supernova' ? 'Supernova' : tier === 'standard' ? 'Pirate reconnu' : 'Rookie'}
          </div>
        )}
      </div>

      {/* ── Divider ── */}
      <ModalDivider />

      {/* ── Stats ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 20px', marginBottom: 16 }}>
        <StatItem label="Prime" value={bountyStr} accent />
        <StatItem label="Rang équipage" value={`${roleLabel}`} />
        <StatItem label="Arrivée" value={joinDate} />
        <StatItem label="Contribution" value={formatBounty(member.contribution)} />
      </div>

      {/* ── Divider ── */}
      <ModalDivider />

      {/* ── Actions ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16 }}>
        <a
          href={`/u/${member.user_id}`}
          style={{
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
            gap:            8,
            padding:        '10px 16px',
            background:     roleColor,
            border:         'none',
            borderRadius:   6,
            color:          '#fff',
            fontFamily:     "'Cinzel', serif",
            fontSize:       12,
            fontWeight:     700,
            letterSpacing:  '0.08em',
            textDecoration: 'none',
            cursor:         'pointer',
            transition:     'opacity 0.15s ease',
          }}
          onMouseEnter={e => { e.currentTarget.style.opacity = '0.88' }}
          onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}
        >
          VOIR LE PROFIL COMPLET
        </a>

        {member.crew_id && (
          <button
            onClick={() => { onClose(); navigate(`/equipage/${member.crew_id}`) }}
            style={{
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'center',
              gap:            8,
              padding:        '10px 16px',
              background:     'rgba(139,105,20,0.12)',
              border:         `1px solid ${C.goldDark}`,
              borderRadius:   6,
              color:          C.goldDark,
              fontFamily:     "'Cinzel', serif",
              fontSize:       12,
              fontWeight:     700,
              letterSpacing:  '0.08em',
              cursor:         'pointer',
              transition:     'all 0.15s ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(139,105,20,0.24)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(139,105,20,0.12)' }}
          >
            ⚓ QG DE L'ÉQUIPAGE
          </button>
        )}

        <button
          onClick={onClose}
          style={{
            padding:    '9px 16px',
            background: 'none',
            border:     `1px solid rgba(92,66,38,0.35)`,
            borderRadius: 6,
            color:      C.p700,
            fontFamily: "'Cinzel', serif",
            fontSize:   11,
            fontWeight: 600,
            letterSpacing: '0.06em',
            cursor:     'pointer',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(31,20,10,0.06)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
        >
          FERMER
        </button>
      </div>

      {/* Bottom ornamental note */}
      <div style={{
        marginTop:   24,
        textAlign:   'center',
        fontFamily:  "'IM Fell English', serif",
        fontStyle:   'italic',
        fontSize:    10,
        color:       C.p400,
        lineHeight:  1.5,
      }}>
        Avis émis par la Marine du Gouvernement Mondial.
        <br />Toute résistance sera traitée avec la plus grande sévérité.
      </div>
    </motion.aside>
  )
}

function StatItem({ label, value, accent }) {
  return (
    <div>
      <div style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', fontSize: 10, letterSpacing: '0.14em', color: C.p500, marginBottom: 3, textTransform: 'uppercase' }}>
        {label}
      </div>
      <div style={{ fontFamily: "'EB Garamond', serif", fontSize: 14, fontWeight: 700, color: accent ? C.goldDark : C.p800, lineHeight: 1.3 }}>
        {value}
      </div>
    </div>
  )
}

function ModalDivider() {
  return (
    <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, rgba(139,105,20,0.5), transparent)', margin: '12px 0' }} />
  )
}
