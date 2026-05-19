import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import ConstellationView from './crew/ConstellationView.jsx'
import ConstellationHeader from './crew/ConstellationHeader.jsx'
import PosterDetailModal from './crew/PosterDetailModal.jsx'
import { fetchCrews, fetchCrewMembersEnriched } from '../lib/crew/supabaseCrewQueries.js'
import { C } from '../lib/crew/constants.js'

// Seed stable based on crew id to get consistent layout per crew
function crewSeed(id) { return (parseInt(id) || 1) * 31 }

// ── Crew selector button ───────────────────────────────────────────────────────
function CrewTab({ crew, isActive, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding:    '8px 18px',
        background: isActive ? 'rgba(139,105,20,0.2)' : 'rgba(31,20,10,0.06)',
        border:     `2px solid ${isActive ? C.goldDark : 'rgba(92,66,38,0.3)'}`,
        borderRadius: 6,
        color:      isActive ? C.goldDark : C.p600,
        fontFamily: "'Cinzel', 'Trajan Pro', serif",
        fontSize:   12,
        fontWeight: isActive ? 700 : 400,
        letterSpacing: '0.06em',
        cursor:     'pointer',
        whiteSpace: 'nowrap',
        transition: 'all 0.18s ease',
        boxShadow:  isActive ? `0 2px 8px rgba(139,105,20,0.2)` : 'none',
      }}
      onMouseEnter={e => { if (!isActive) e.currentTarget.style.borderColor = 'rgba(139,105,20,0.5)' }}
      onMouseLeave={e => { if (!isActive) e.currentTarget.style.borderColor = 'rgba(92,66,38,0.3)' }}
    >
      [{crew.tag}] {crew.name}
    </button>
  )
}

// ── Help tooltip (keyboard shortcuts) ─────────────────────────────────────────
function ShortcutHint() {
  const [show, setShow] = useState(false)
  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setShow(s => !s)}
        aria-label="Aide clavier"
        style={{
          width:      28,
          height:     28,
          borderRadius: '50%',
          background: 'rgba(31,20,10,0.08)',
          border:     '1px solid rgba(92,66,38,0.35)',
          color:      C.p600,
          fontSize:   13,
          fontWeight: 700,
          cursor:     'pointer',
          fontFamily: "'Cinzel', serif",
          lineHeight: 1,
          display:    'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        ?
      </button>
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.18 }}
            style={{
              position:  'absolute',
              top:       '100%',
              right:     0,
              marginTop: 8,
              background: '#F5E6C8',
              border:    '1px solid rgba(92,66,38,0.4)',
              borderRadius: 8,
              padding:   '12px 16px',
              zIndex:    200,
              minWidth:  180,
              boxShadow: '0 4px 20px rgba(31,20,10,0.2)',
              fontFamily: "'EB Garamond', serif",
              fontSize:  12,
              color:     C.p700,
              lineHeight: 2,
              whiteSpace: 'nowrap',
            }}
          >
            <div style={{ fontFamily: "'Cinzel', serif", fontSize: 10, letterSpacing: '0.1em', marginBottom: 8, color: C.p500 }}>RACCOURCIS</div>
            {[
              ['+/-', 'Zoom avant/arrière'],
              ['0',   'Réinitialiser la vue'],
              ['←→↑↓', 'Déplacer'],
              ['2×clic', 'Recentrer'],
              ['Esc', 'Fermer modal'],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <span style={{ fontFamily: "'Cinzel', serif", fontSize: 11, fontWeight: 700, color: C.goldDark, minWidth: 50 }}>{k}</span>
                <span>{v}</span>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

export default function ConstellationPage() {
  const navigate = useNavigate()
  const [crews,       setCrews]       = useState([])
  const [selectedId,  setSelectedId]  = useState(null)
  const [activeCrew,  setActiveCrew]  = useState(null)
  const [members,     setMembers]     = useState([])
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState(null)
  const [modalMember, setModalMember] = useState(null)
  const [pageReady,   setPageReady]   = useState(false)

  // ── Fetch crews on mount ─────────────────────────────────────────────────────
  useEffect(() => {
    fetchCrews()
      .then(data => {
        if (!data) { setError('Impossible de charger les équipages.'); setLoading(false); return }
        setCrews(data)
        if (data.length) setSelectedId(data[0].id)
        else setLoading(false)
      })
      .catch(e => { setError(e.message); setLoading(false) })
    // Short delay before showing content (intro effect)
    const t = setTimeout(() => setPageReady(true), 200)
    return () => clearTimeout(t)
  }, [])

  // ── Fetch members when crew changes ──────────────────────────────────────────
  useEffect(() => {
    if (!selectedId) return
    setLoading(true)
    setError(null)
    setMembers([])
    setActiveCrew(crews.find(c => c.id === selectedId) ?? null)

    fetchCrewMembersEnriched(selectedId)
      .then(data => {
        if (!data) { setError('Impossible de charger les membres.'); setLoading(false); return }
        setMembers(data)
        setLoading(false)
      })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [selectedId, crews])

  const seed = useMemo(() => crewSeed(selectedId), [selectedId])

  // ── Page intro animation ──────────────────────────────────────────────────────
  const pageVariants = {
    hidden:  { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration:       0.8,
        ease:           [0.25, 0.46, 0.45, 0.94],
        staggerChildren: 0.12,
      },
    },
  }

  const sectionVariant = {
    hidden:  { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.25, 0.46, 0.45, 0.94] } },
  }

  return (
    <motion.div
      variants={pageVariants}
      initial="hidden"
      animate={pageReady ? 'visible' : 'hidden'}
      style={{
        minHeight: '100vh',
        background: '#E8D4A0',
        backgroundImage: `
          radial-gradient(ellipse at 50% 20%, rgba(255,245,220,0.6) 0%, transparent 55%),
          radial-gradient(ellipse at 50% 100%, rgba(90,60,20,0.12) 0%, transparent 60%)
        `,
        paddingTop:  80,
        paddingBottom: 64,
      }}
    >
      <div style={{ maxWidth: 1360, margin: '0 auto', padding: '0 clamp(12px, 3vw, 32px)' }}>

        {/* ── Header ── */}
        <motion.div variants={sectionVariant}>
          <ConstellationHeader crew={activeCrew} memberCount={members.length} />
        </motion.div>

        {/* ── Crew selector ── */}
        {crews.length > 1 && (
          <motion.div
            variants={sectionVariant}
            style={{ display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}
          >
            {crews.map(c => (
              <CrewTab
                key={c.id}
                crew={c}
                isActive={c.id === selectedId}
                onClick={() => setSelectedId(c.id)}
              />
            ))}
          </motion.div>
        )}

        {/* ── Toolbar (zoom hint + shortcuts) ── */}
        <motion.div
          variants={sectionVariant}
          style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 8, marginBottom: 8, paddingRight: 4 }}
        >
          <span style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', fontSize: 11, color: C.p500 }}>
            Glisser pour déplacer · Molette pour zoomer · Double-clic pour recentrer
          </span>
          <ShortcutHint />
        </motion.div>

        {/* ── Constellation canvas ── */}
        <motion.div variants={sectionVariant}>
          <ConstellationView
            members={members}
            loading={loading}
            error={error}
            onPosterClick={setModalMember}
            seed={seed}
          />
        </motion.div>

        {/* ── Bottom info bar ── */}
        {activeCrew && !loading && (
          <motion.div
            variants={sectionVariant}
            style={{
              marginTop:   16,
              display:     'flex',
              justifyContent: 'center',
              alignItems:  'center',
              gap:         8,
              flexWrap:    'wrap',
            }}
          >
            <StatusBadge label="Recrutement" value={activeCrew.is_recruiting ? 'Ouvert' : 'Fermé'} active={activeCrew.is_recruiting} />
            <StatusBadge label="Guerres gagnées" value={activeCrew.wars_won ?? '0'} />
            <button
              onClick={() => navigate(`/equipage/${activeCrew.id}`)}
              style={{
                padding:       '5px 16px',
                background:    'rgba(139,105,20,0.15)',
                border:        `1px solid ${C.goldDark}`,
                borderRadius:  6,
                color:         C.goldDark,
                fontFamily:    "'Cinzel', serif",
                fontSize:      11,
                fontWeight:    700,
                letterSpacing: '0.08em',
                cursor:        'pointer',
                transition:    'all 0.15s ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(139,105,20,0.28)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(139,105,20,0.15)' }}
            >
              ⚓ QG de l'Équipage
            </button>
          </motion.div>
        )}

        {/* ── Emission note ── */}
        <motion.div
          variants={sectionVariant}
          style={{
            textAlign:  'center',
            marginTop:  24,
            fontFamily: "'IM Fell English', serif",
            fontStyle:  'italic',
            fontSize:   11,
            color:      C.p500,
            letterSpacing: '0.04em',
          }}
        >
          Émis par le Bureau Central de la Marine · Grand Line · Ces informations sont confidentielles
        </motion.div>
      </div>

      {/* ── Poster detail modal ── */}
      <PosterDetailModal
        member={modalMember}
        onClose={() => setModalMember(null)}
      />
    </motion.div>
  )
}

function StatusBadge({ label, value, active }) {
  return (
    <div style={{
      display:    'flex',
      alignItems: 'center',
      gap:        8,
      padding:    '5px 14px',
      background: 'rgba(31,20,10,0.06)',
      border:     '1px solid rgba(92,66,38,0.25)',
      borderRadius: 6,
    }}>
      <span style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', fontSize: 11, color: C.p500 }}>{label} :</span>
      <span style={{
        fontFamily: "'Cinzel', serif",
        fontSize:   11,
        fontWeight: 700,
        color:      active === undefined ? C.p700 : active ? '#065F46' : C.crimson,
        letterSpacing: '0.06em',
      }}>
        {value}
      </span>
    </div>
  )
}
