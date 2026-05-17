import { motion } from 'framer-motion'
import { C } from '../../lib/crew/constants.js'
import { formatBounty } from '../../lib/crew/bountyFormatter.js'

const fadeDown = {
  hidden:  { opacity: 0, y: -18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] } },
}

/**
 * Page header: title, crew name, total prime counter, member count.
 */
export default function ConstellationHeader({ crew, memberCount }) {
  const total = formatBounty(crew?.total_bounty)

  return (
    <motion.header
      variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
      initial="hidden"
      animate="visible"
      style={{ textAlign: 'center', marginBottom: 28, padding: '0 16px' }}
    >
      {/* Marine seal label */}
      <motion.div variants={fadeDown} style={{
        fontFamily:    "'IM Fell English', serif",
        fontStyle:     'italic',
        fontSize:      11,
        letterSpacing: '0.35em',
        color:         C.p600,
        marginBottom:  6,
        textTransform: 'uppercase',
      }}>
        — Marine · Gouvernement Mondial —
      </motion.div>

      {/* Main title */}
      <motion.h1 variants={fadeDown} style={{
        fontFamily:    "'Cinzel', 'Trajan Pro', serif",
        fontWeight:    900,
        fontSize:      'clamp(28px, 4.5vw, 52px)',
        lineHeight:    1,
        letterSpacing: '0.06em',
        color:         C.ink,
        margin:        0,
        textShadow:    `2px 3px 0 ${C.p300}, 0 1px 2px rgba(31,20,10,0.2)`,
      }}>
        ÉQUIPAGE RECHERCHÉ
      </motion.h1>

      {/* Divider with ornament */}
      <motion.div variants={fadeDown} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, margin: '10px 0' }}>
        <div style={{ flex: 1, maxWidth: 120, height: 1, background: `linear-gradient(90deg, transparent, ${C.goldDark})` }} />
        <span style={{ color: C.goldDark, fontSize: 16, lineHeight: 1 }}>⚓</span>
        <div style={{ flex: 1, maxWidth: 120, height: 1, background: `linear-gradient(90deg, ${C.goldDark}, transparent)` }} />
      </motion.div>

      {/* Crew name */}
      {crew && (
        <motion.div variants={fadeDown} style={{
          fontFamily: "'EB Garamond', Garamond, serif",
          fontStyle:  'italic',
          fontSize:   'clamp(18px, 2.5vw, 26px)',
          fontWeight: 700,
          color:      C.p700,
          marginBottom: 12,
          letterSpacing: '0.02em',
        }}>
          « {crew.name} »
          <span style={{ fontStyle: 'normal', fontSize: '0.7em', fontWeight: 400, color: C.p500, marginLeft: 10 }}>
            [{crew.tag}]
          </span>
        </motion.div>
      )}

      {/* Stats row */}
      <motion.div variants={fadeDown} style={{ display: 'flex', justifyContent: 'center', gap: 'clamp(16px, 3vw, 40px)', flexWrap: 'wrap' }}>
        <Stat label="Membres" value={memberCount ?? '—'} />
        <StatSep />
        <Stat label="Niveau" value={crew?.level ?? '—'} />
        <StatSep />
        <Stat label="Prime totale" value={total} accent />
      </motion.div>
    </motion.header>
  )
}

function Stat({ label, value, accent }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', fontSize: 10, letterSpacing: '0.18em', color: C.p500, marginBottom: 2 }}>
        {label}
      </div>
      <div style={{
        fontFamily:    "'Cinzel', serif",
        fontSize:      'clamp(13px, 1.6vw, 17px)',
        fontWeight:    700,
        color:         accent ? C.goldDark : C.p700,
        letterSpacing: '0.04em',
      }}>
        {value}
      </div>
    </div>
  )
}

function StatSep() {
  return <div style={{ width: 1, background: `linear-gradient(180deg, transparent, ${C.goldDark}60, transparent)`, alignSelf: 'stretch', minHeight: 28 }} />
}
