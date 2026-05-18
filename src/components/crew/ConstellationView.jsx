import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import WantedPoster from './WantedPoster.jsx'
import ConnectionLines from './ConnectionLines.jsx'
import { computeLayout } from '../../lib/crew/computeLayout.js'
import { computeConnections } from '../../lib/crew/computeConnections.js'
import { C } from '../../lib/crew/constants.js'
import css from '../../styles/constellation.module.css'

// ── Pan/zoom constants ────────────────────────────────────────────────────────
const ZOOM_MIN  = 0.5
const ZOOM_MAX  = 2.2
const ZOOM_STEP = 0.15

// ── Corner ornament SVG ────────────────────────────────────────────────────────
function CornerSvg() {
  return (
    <svg viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M4 52 L4 4 L52 4" stroke="#8B6914" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      <path d="M4 4 L14 14" stroke="#8B6914" strokeWidth="1" strokeLinecap="round" />
      <circle cx="4"  cy="4"  r="2.5" fill="#8B6914" />
      <circle cx="4"  cy="52" r="1.5" fill="#8B6914" opacity="0.6" />
      <circle cx="52" cy="4"  r="1.5" fill="#8B6914" opacity="0.6" />
      <path d="M4 20 L8 16 M4 36 L8 32" stroke="#8B6914" strokeWidth="0.8" strokeLinecap="round" opacity="0.5" />
    </svg>
  )
}

// ── Marine seal SVG ────────────────────────────────────────────────────────────
function MarineSeal({ onClick, clickCount }) {
  const isRevolution = clickCount >= 5
  return (
    <button
      className={css.marineSeal}
      onClick={onClick}
      aria-label="Sceau de la Marine"
      title="Sceau officiel — Gouvernement Mondial"
      style={{ background: 'none', border: 'none', padding: 0 }}
    >
      <svg viewBox="0 0 76 76" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <circle cx="38" cy="38" r="35" stroke={isRevolution ? '#991B1B' : '#8B6914'} strokeWidth="2" fill="none" opacity="0.5" />
        <circle cx="38" cy="38" r="30" stroke={isRevolution ? '#991B1B' : '#8B6914'} strokeWidth="1" fill="none" opacity="0.3" />
        {/* Star */}
        <path
          d="M38 12 L41 28 L56 24 L45 35 L52 49 L38 42 L24 49 L31 35 L20 24 L35 28 Z"
          fill={isRevolution ? '#7F1D1D' : '#8B6914'}
          opacity={isRevolution ? '0.9' : '0.55'}
        />
        {/* Circular text (Marine) */}
        <path id="circlePath" d="M38 10 a 28 28 0 1 1 -0.01 0" fill="none" />
        <text fontSize="7" fill={isRevolution ? '#B91C1C' : '#8B6914'} opacity="0.75" fontFamily="'Cinzel', serif" letterSpacing="3">
          <textPath href="#circlePath">
            {isRevolution ? '✦ ARMÉE RÉVOLUTIONNAIRE ✦ ' : '✦ MARINE ✦ GOUVERNEMENT MONDIAL ✦ '}
          </textPath>
        </text>
      </svg>
    </button>
  )
}

// ── Loading skeletons ─────────────────────────────────────────────────────────
function LoadingSkeleton() {
  const positions = [
    { x: '50%', y: '50%', w: 180, h: 256 },
    { x: '28%', y: '30%', w: 138, h: 196 },
    { x: '72%', y: '30%', w: 138, h: 196 },
    { x: '28%', y: '68%', w: 138, h: 196 },
    { x: '72%', y: '68%', w: 138, h: 196 },
  ]
  return (
    <>
      {positions.map((p, i) => (
        <div key={i} className={css.skeletonPoster} style={{
          position: 'absolute',
          left:    `calc(${p.x} - ${p.w/2}px)`,
          top:     `calc(${p.y} - ${p.h/2}px)`,
          width:   p.w,
          height:  p.h,
          opacity: 1 - i * 0.12,
        }} />
      ))}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        pointerEvents: 'none',
      }}>
        <div style={{
          fontFamily:    "'IM Fell English', serif",
          fontStyle:     'italic',
          fontSize:      14,
          color:         C.p600,
          letterSpacing: '0.06em',
          animation:     'pulse 1.5s ease-in-out infinite',
        }}>
          Compilation des avis de recherche...
        </div>
      </div>
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Main constellation canvas.
 *
 * @param {Array}   members      enriched crew members
 * @param {boolean} loading
 * @param {string}  error
 * @param {function} onPosterClick
 * @param {number}  seed
 */
export default function ConstellationView({ members, loading, error, onPosterClick, seed = 42 }) {
  const wrapRef   = useRef(null)
  const [dims, setDims]           = useState({ w: 900, h: 580 })
  const [hoveredId, setHoveredId] = useState(null)
  const [pan, setPan]             = useState({ x: 0, y: 0 })
  const [zoom, setZoom]           = useState(1)
  const [sealClicks, setSealClicks] = useState(0)
  const dragRef = useRef({ active: false, startX: 0, startY: 0, panX: 0, panY: 0 })

  // ── Resize observer ────────────────────────────────────────────────────────
  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      setDims({ w: Math.max(300, width), h: Math.max(300, height) })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // ── Keyboard shortcuts ──────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (e.key === '+' || e.key === '=') setZoom(z => Math.min(ZOOM_MAX, z + ZOOM_STEP))
      if (e.key === '-')                  setZoom(z => Math.max(ZOOM_MIN, z - ZOOM_STEP))
      if (e.key === '0')                  { setZoom(1); setPan({ x: 0, y: 0 }) }
      if (e.key === 'ArrowLeft')          setPan(p => ({ ...p, x: p.x + 40 }))
      if (e.key === 'ArrowRight')         setPan(p => ({ ...p, x: p.x - 40 }))
      if (e.key === 'ArrowUp')            setPan(p => ({ ...p, y: p.y + 40 }))
      if (e.key === 'ArrowDown')          setPan(p => ({ ...p, y: p.y - 40 }))
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // ── Pan drag handlers ──────────────────────────────────────────────────────
  const onMouseDown = useCallback((e) => {
    if (e.button !== 0) return
    dragRef.current = { active: true, startX: e.clientX, startY: e.clientY, panX: pan.x, panY: pan.y }
  }, [pan])

  const onMouseMove = useCallback((e) => {
    if (!dragRef.current.active) return
    setPan({
      x: dragRef.current.panX + (e.clientX - dragRef.current.startX),
      y: dragRef.current.panY + (e.clientY - dragRef.current.startY),
    })
  }, [])

  const onMouseUp = useCallback(() => { dragRef.current.active = false }, [])

  // ── Wheel zoom ─────────────────────────────────────────────────────────────
  const onWheel = useCallback((e) => {
    e.preventDefault()
    setZoom(z => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z - e.deltaY * 0.001)))
  }, [])

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [onWheel])

  // ── Double-click to reset ──────────────────────────────────────────────────
  const onDblClick = useCallback((e) => {
    if (e.target === wrapRef.current || e.target.tagName === 'svg') {
      setZoom(1); setPan({ x: 0, y: 0 })
    }
  }, [])

  // ── Touch pan/pinch ────────────────────────────────────────────────────────
  const touchRef = useRef({ lastDist: null, lastX: null, lastY: null })

  const onTouchStart = useCallback((e) => {
    if (e.touches.length === 1) {
      touchRef.current = { lastDist: null, lastX: e.touches[0].clientX, lastY: e.touches[0].clientY }
    } else if (e.touches.length === 2) {
      const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY)
      touchRef.current = { lastDist: d, lastX: null, lastY: null }
    }
  }, [])

  const onTouchMove = useCallback((e) => {
    e.preventDefault()
    if (e.touches.length === 1 && touchRef.current.lastX !== null) {
      const dx = e.touches[0].clientX - touchRef.current.lastX
      const dy = e.touches[0].clientY - touchRef.current.lastY
      setPan(p => ({ x: p.x + dx, y: p.y + dy }))
      touchRef.current.lastX = e.touches[0].clientX
      touchRef.current.lastY = e.touches[0].clientY
    } else if (e.touches.length === 2 && touchRef.current.lastDist !== null) {
      const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY)
      const delta = (d - touchRef.current.lastDist) * 0.005
      setZoom(z => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z + delta)))
      touchRef.current.lastDist = d
    }
  }, [])

  const onTouchEnd = useCallback(() => { touchRef.current = { lastDist: null, lastX: null, lastY: null } }, [])

  // ── Layout computation ─────────────────────────────────────────────────────
  const positioned = useMemo(
    () => members.length ? computeLayout(members, dims.w, dims.h, seed) : [],
    [members, dims.w, dims.h, seed]
  )

  const connections = useMemo(
    () => positioned.length ? computeConnections(positioned, seed) : [],
    [positioned, seed]
  )

  // Build related-ids set for hover highlighting
  const relatedIds = useMemo(() => {
    if (!hoveredId) return new Set()
    const set = new Set()
    for (const c of connections) {
      if (c.fromId === hoveredId) set.add(String(c.toId))
      if (c.toId   === hoveredId) set.add(String(c.fromId))
    }
    return set
  }, [hoveredId, connections])

  const sealClicked = () => {
    const next = sealClicks + 1
    setSealClicks(next)
    if (next >= 5) setTimeout(() => setSealClicks(0), 8000)
  }

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      {/* ── Canvas wrap ─────────────────────────────────────────────────────── */}
      <div
        ref={wrapRef}
        className={`${css.canvasWrap} ${css.pageBackground}`}
        style={{ height: 'clamp(420px, 65vh, 720px)', touchAction: 'none' }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onDoubleClick={onDblClick}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Pannable/zoomable inner canvas */}
        <div style={{
          position:  'absolute',
          inset:     0,
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: 'center center',
          willChange: 'transform',
        }}>
          {/* Loading state */}
          {loading && <LoadingSkeleton />}

          {/* Error state */}
          {!loading && error && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
              <div style={{ fontFamily: "'Cinzel', serif", fontSize: 18, color: C.crimson, letterSpacing: '0.06em' }}>DOCUMENTS PERDUS</div>
              <div style={{ fontFamily: "'EB Garamond', serif", fontSize: 13, color: C.p600 }}>Les archives de la Marine sont inaccessibles.</div>
            </div>
          )}

          {/* Empty state */}
          {!loading && !error && positioned.length === 0 && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <div style={{ fontFamily: "'Cinzel', serif", fontSize: 16, color: C.p600, letterSpacing: '0.08em' }}>AUCUN PIRATE RECENSÉ</div>
              <div style={{ fontFamily: "'EB Garamond', serif", fontSize: 13, color: C.p400, fontStyle: 'italic' }}>Le bureau de la Marine n'a aucun avis à afficher.</div>
            </div>
          )}

          {/* Connection lines (behind posters) */}
          {!loading && positioned.length > 0 && (
            <ConnectionLines
              connections={connections}
              hoveredId={hoveredId}
              relatedIds={relatedIds}
              width={dims.w}
              height={dims.h}
            />
          )}

          {/* Wanted posters */}
          {!loading && positioned.map((m, i) => (
            <WantedPoster
              key={m.user_id}
              member={m}
              hoveredId={hoveredId}
              relatedIds={relatedIds}
              onHoverStart={(id) => setHoveredId(id)}
              onHoverEnd={() => setHoveredId(null)}
              onClick={() => onPosterClick?.(m)}
              motionDelay={i * 0.075}
            />
          ))}
        </div>

        {/* ── Decorative overlays (not panned) ──────────────────────────────── */}
        {/* Corner ornaments */}
        {['tl','tr','bl','br'].map(pos => (
          <div key={pos} className={`${css.cornerOrnament} ${css[pos]}`}>
            <CornerSvg />
          </div>
        ))}

        {/* Marine seal */}
        <MarineSeal onClick={sealClicked} clickCount={sealClicks} />

        {/* Zoom controls */}
        <ZoomControls zoom={zoom} onZoom={setZoom} onReset={() => { setZoom(1); setPan({ x: 0, y: 0 }) }} />
      </div>
    </div>
  )
}

// ── Zoom control buttons ───────────────────────────────────────────────────────
function ZoomControls({ zoom, onZoom, onReset }) {
  const btnStyle = {
    width:      32,
    height:     32,
    background: 'rgba(232, 212, 160, 0.85)',
    border:     '1px solid rgba(92,66,38,0.4)',
    borderRadius: 4,
    color:      C.p700,
    fontFamily: 'monospace',
    fontSize:   18,
    lineHeight: '1',
    cursor:     'pointer',
    display:    'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background 0.15s ease, transform 0.1s ease',
    backdropFilter: 'blur(4px)',
  }

  return (
    <div style={{
      position:  'absolute',
      top:       12,
      right:     12,
      display:   'flex',
      flexDirection: 'column',
      gap:       4,
      zIndex:    50,
      pointerEvents: 'auto',
    }}>
      <button style={btnStyle} onClick={() => onZoom(z => Math.min(ZOOM_MAX, z + ZOOM_STEP))} title="Zoom +" aria-label="Zoom avant">+</button>
      <button style={{ ...btnStyle, fontSize: 11, fontFamily: "'Cinzel', serif", letterSpacing: '0.04em' }} onClick={onReset} title="Réinitialiser (0)" aria-label="Réinitialiser la vue">
        {Math.round(zoom * 100)}%
      </button>
      <button style={btnStyle} onClick={() => onZoom(z => Math.max(ZOOM_MIN, z - ZOOM_STEP))} title="Zoom -" aria-label="Zoom arrière">−</button>
    </div>
  )
}
