import { useState, useEffect, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import s from '../../styles/parchment.module.css'
import ScrollFront from './ScrollFront.jsx'
import ScrollBack from './ScrollBack.jsx'

export const CARD_W = 380
export const CARD_H = 520

export default function CharacterScroll({ character, isActive }) {
  const [flipped, setFlipped] = useState(false)
  const [tilt,    setTilt]    = useState({ x: 0, y: 0 })
  const cardRef = useRef(null)

  // Reset flip when character changes
  useEffect(() => { setFlipped(false) }, [character.id])

  const handleMouseMove = useCallback(e => {
    if (!isActive || !cardRef.current) return
    const rect = cardRef.current.getBoundingClientRect()
    const cx = rect.left + rect.width  / 2
    const cy = rect.top  + rect.height / 2
    const dx = (e.clientX - cx) / (rect.width  / 2)
    const dy = (e.clientY - cy) / (rect.height / 2)
    setTilt({ x: dy * -5, y: dx * 5 })
  }, [isActive])

  const handleMouseLeave = useCallback(() => setTilt({ x: 0, y: 0 }), [])

  const handleClick = () => { if (isActive) setFlipped(f => !f) }

  return (
    <div
      ref={cardRef}
      className={s.perspective}
      style={{
        width:    CARD_W,
        height:   CARD_H,
        maxWidth: '88vw',
        cursor:   'pointer',
        position: 'relative',
        userSelect: 'none',
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      {/* Tilt wrapper — fast */}
      <motion.div
        style={{ transformStyle: 'preserve-3d', width: '100%', height: '100%' }}
        animate={{ rotateX: tilt.x, rotateZ: tilt.y * 0.18 }}
        transition={{ duration: 0.14, ease: 'easeOut' }}
      >
        {/* Flip container — slow */}
        <motion.div
          style={{ transformStyle: 'preserve-3d', position: 'relative', width: '100%', height: '100%' }}
          animate={{ rotateY: flipped ? 180 : 0 }}
          transition={{ duration: 0.72, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          {/* Front face */}
          <div style={{
            position: 'absolute',
            inset: 0,
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
          }}>
            <ScrollFront character={character} />
          </div>

          {/* Back face */}
          <div style={{
            position: 'absolute',
            inset: 0,
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
          }}>
            <ScrollBack character={character} />
          </div>
        </motion.div>
      </motion.div>

      {/* Flip hint */}
      {isActive && !flipped && (
        <div className={s.flipHint}>
          Cliquer pour révéler le fruit ↩
        </div>
      )}
    </div>
  )
}
