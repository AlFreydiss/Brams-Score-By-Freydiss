import { useEffect, useRef, memo } from 'react'
import { motion } from 'framer-motion'
import css from '../../styles/constellation.module.css'

/**
 * Full-canvas SVG layer that draws Bézier connection lines between posters.
 * Lines animate in one by one on mount (draw-on effect via stroke-dashoffset).
 *
 * @param {Array}       connections   output of computeConnections()
 * @param {string|null} hoveredId     user_id of hovered poster
 * @param {Set<string>} relatedIds    connected poster ids
 * @param {number}      width         canvas width
 * @param {number}      height        canvas height
 */
function ConnectionLines({ connections, hoveredId, relatedIds, width, height }) {
  return (
    <svg
      width={width}
      height={height}
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1, overflow: 'visible' }}
      aria-hidden="true"
    >
      <defs>
        {/* Gold gradient for hierarchy lines */}
        <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor="#D4AF37" stopOpacity="0.9" />
          <stop offset="50%"  stopColor="#B8860B" stopOpacity="1"   />
          <stop offset="100%" stopColor="#D4AF37" stopOpacity="0.9" />
        </linearGradient>
        {/* Drop shadow for hierarchy */}
        <filter id="lineShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor="#8B6914" floodOpacity="0.3" />
        </filter>
      </defs>

      {connections.map((conn, i) => {
        const isHierarchy = conn.type === 'hierarchy'
        const isActive = hoveredId !== null && (
          conn.fromId === hoveredId || conn.toId === hoveredId ||
          relatedIds?.has(conn.fromId) || relatedIds?.has(conn.toId)
        )
        const isDimmed = hoveredId !== null && !isActive

        return (
          <AnimatedPath
            key={conn.id}
            conn={conn}
            isHierarchy={isHierarchy}
            isActive={isActive}
            isDimmed={isDimmed}
            delay={i * 0.06 + 0.3}
          />
        )
      })}
    </svg>
  )
}

function AnimatedPath({ conn, isHierarchy, isActive, isDimmed, delay }) {
  const pathRef = useRef(null)

  // Compute stroke-dasharray on mount once the path is in the DOM
  useEffect(() => {
    const el = pathRef.current
    if (!el) return
    const len = el.getTotalLength?.() ?? conn.length
    el.style.strokeDasharray  = `${len}`
    el.style.strokeDashoffset = `${len}`
    // Force reflow
    el.getBoundingClientRect()
    el.style.transition = `stroke-dashoffset 1.2s cubic-bezier(0.25,0.46,0.45,0.94) ${delay}s`
    el.style.strokeDashoffset = '0'
  }, [conn.path, delay, conn.length])

  const baseOpacity    = isHierarchy ? 0.70 : 0.48
  const activeOpacity  = isHierarchy ? 1.00 : 0.75
  const dimmedOpacity  = 0.10
  const opacity        = isDimmed ? dimmedOpacity : isActive ? activeOpacity : baseOpacity

  const strokeColor  = isHierarchy ? 'url(#goldGrad)' : '#7A5A32'
  const strokeWidth  = isHierarchy ? (isActive ? 3.0 : 2.2) : (isActive ? 2.2 : 1.6)
  const dashArray    = isHierarchy ? 'none' : '5 5'
  const filter_      = isHierarchy ? 'url(#lineShadow)' : undefined

  // Endpoint dots (only visible when active)
  const dotR = isHierarchy ? 3.5 : 2.5

  return (
    <g style={{ transition: 'opacity 0.25s ease', opacity }}>
      <path
        ref={pathRef}
        d={conn.path}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={isHierarchy ? undefined : '5 5'}
        fill="none"
        filter={filter_}
        className={isHierarchy ? css.lineHierarchy : css.lineTeam}
        style={{ transition: 'stroke-width 0.2s ease, opacity 0.2s ease' }}
      />
      {/* Endpoint dots */}
      {isActive && (
        <>
          <circle cx={conn.from.x} cy={conn.from.y} r={dotR} fill={isHierarchy ? '#D4AF37' : '#9C7649'} className={css.endpointDot} />
          <circle cx={conn.to.x}   cy={conn.to.y}   r={dotR} fill={isHierarchy ? '#D4AF37' : '#9C7649'} className={css.endpointDot} />
        </>
      )}
    </g>
  )
}

export default memo(ConnectionLines)
