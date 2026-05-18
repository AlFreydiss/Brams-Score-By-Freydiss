import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import s from '../../styles/parchment.module.css'
import { CHARACTERS } from './character-data.js'
import CandleAtmosphere from './CandleAtmosphere.jsx'
import CharacterScroll from './CharacterScroll.jsx'

const TOTAL = CHARACTERS.length

export default function DevilFruitPage() {
  const [current,   setCurrent]   = useState(0)
  const [direction, setDirection] = useState(1)

  const go = useCallback((next) => {
    setDirection(next > current ? 1 : -1)
    setCurrent(next)
  }, [current])

  const prev = useCallback(() => go((current - 1 + TOTAL) % TOTAL), [go, current])
  const next = useCallback(() => go((current + 1) % TOTAL),         [go, current])

  useEffect(() => {
    const onKey = e => {
      if (e.key === 'ArrowLeft')  prev()
      if (e.key === 'ArrowRight') next()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [prev, next])

  const char = CHARACTERS[current]

  return (
    <div
      className={s.scene}
      style={{ paddingTop: 80, paddingBottom: 64, position: 'relative' }}
    >
      {/* Atmosphere — candles + dust */}
      <CandleAtmosphere />

      {/* Page header */}
      <motion.div
        initial={{ opacity: 0, y: -24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.85, ease: [0.25, 0.46, 0.45, 0.94] }}
        style={{ textAlign: 'center', marginBottom: 36, position: 'relative', zIndex: 10 }}
      >
        <div style={{
          fontFamily: "'IM Fell English', serif",
          fontStyle: 'italic',
          fontSize: 11,
          letterSpacing: '0.22em',
          color: 'rgba(220,190,120,0.45)',
          marginBottom: 8,
          textTransform: 'uppercase',
        }}>
          Archives Secrètes · Gouvernement Mondial
        </div>
        <h1 style={{
          fontFamily: "'Cinzel', 'Trajan Pro', serif",
          fontSize: 'clamp(24px, 5vw, 44px)',
          fontWeight: 900,
          letterSpacing: '0.16em',
          color: 'rgba(240,215,145,0.93)',
          margin: 0,
          lineHeight: 1.1,
          textShadow: '0 0 50px rgba(220,180,80,0.28), 0 2px 4px rgba(0,0,0,0.5)',
        }}>
          FRUITS DU DÉMON
        </h1>
        <div style={{
          fontFamily: "'EB Garamond', serif",
          fontStyle: 'italic',
          fontSize: 13,
          color: 'rgba(200,160,80,0.5)',
          marginTop: 7,
          letterSpacing: '0.06em',
        }}>
          {TOTAL} pouvoirs surnaturels répertoriés
        </div>
      </motion.div>

      {/* Card stage */}
      <div style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 580,
        zIndex: 10,
      }}>
        {/* Left arrow */}
        <button
          className={`${s.navArrow} ${s.left}`}
          onClick={prev}
          aria-label="Personnage précédent"
        >
          ‹
        </button>

        {/* Animated card */}
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={char.id}
            custom={direction}
            variants={{
              enter:   d => ({ opacity: 0, x: d * 60, rotateY: d * -12 }),
              visible:      { opacity: 1, x: 0,        rotateY: 0 },
              exit:    d => ({ opacity: 0, x: d * -60, rotateY: d * 12 }),
            }}
            initial="enter"
            animate="visible"
            exit="exit"
            transition={{ duration: 0.42, ease: [0.25, 0.46, 0.45, 0.94] }}
            style={{ position: 'relative', zIndex: 1 }}
          >
            <CharacterScroll character={char} isActive />
          </motion.div>
        </AnimatePresence>

        {/* Right arrow */}
        <button
          className={`${s.navArrow} ${s.right}`}
          onClick={next}
          aria-label="Personnage suivant"
        >
          ›
        </button>
      </div>

      {/* Page counter */}
      <div className={s.pageCounter} style={{ position: 'relative', zIndex: 10 }}>
        {current + 1} / {TOTAL}
      </div>

      {/* Dot indicators */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: 6,
        marginTop: 12,
        position: 'relative',
        zIndex: 10,
        flexWrap: 'wrap',
        padding: '0 24px',
      }}>
        {CHARACTERS.map((c, i) => (
          <div
            key={c.id}
            className={i === current ? `${s.dot} ${s.active}` : s.dot}
            onClick={() => go(i)}
            role="button"
            tabIndex={0}
            aria-label={c.name}
            onKeyDown={e => e.key === 'Enter' && go(i)}
            style={{ cursor: 'pointer' }}
          />
        ))}
      </div>

      {/* Bottom note */}
      <div style={{
        textAlign: 'center',
        marginTop: 28,
        fontFamily: "'IM Fell English', serif",
        fontStyle: 'italic',
        fontSize: 11,
        color: 'rgba(180,140,60,0.38)',
        letterSpacing: '0.07em',
        position: 'relative',
        zIndex: 10,
      }}>
        Données issues des archives secrètes de la Marine · Grand Line · Toute reproduction est passible de poursuites
      </div>
    </div>
  )
}
