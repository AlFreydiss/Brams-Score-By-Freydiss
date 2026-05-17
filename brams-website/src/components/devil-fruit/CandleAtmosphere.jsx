import { useMemo } from 'react'
import s from '../../styles/parchment.module.css'

const DUST_COUNT = 20

function Candle({ style }) {
  return (
    <div className={s.candle} style={style}>
      <div className={s.candleGlow} />
      <div style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
        <div className={s.flame}>
          <div className={s.flameFill} />
        </div>
      </div>
      <div className={s.candleWick} />
      <div className={s.candleBody} />
      <div className={s.candleBase} />
    </div>
  )
}

// Seeded simple random for stable SSR-like output
function seededRandom(seed) {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) & 0xFFFFFFFF
    return (s >>> 0) / 0xFFFFFFFF
  }
}

export default function CandleAtmosphere() {
  const dust = useMemo(() => {
    const rng = seededRandom(42)
    return Array.from({ length: DUST_COUNT }, (_, i) => ({
      id: i,
      left:    `${10 + rng() * 80}%`,
      top:     `${20 + rng() * 70}%`,
      size:    1 + rng() * 3,
      dur:     `${7 + rng() * 9}s`,
      delay:   `${-(rng() * 8)}s`,
      dx:      `${(rng() - 0.5) * 60}px`,
      dy:      `${-(20 + rng() * 60)}px`,
      dx2:     `${(rng() - 0.5) * 100}px`,
      dy2:     `${-(60 + rng() * 100)}px`,
      opacity: (0.2 + rng() * 0.35).toFixed(2),
    }))
  }, [])

  return (
    <>
      <div className={s.candleLeft} />
      <div className={s.candleRight} />
      <Candle style={{ position: 'absolute', left: '2%', bottom: 0, zIndex: 5 }} />
      <Candle style={{ position: 'absolute', right: '2%', bottom: 0, zIndex: 5 }} />
      {dust.map(p => (
        <div
          key={p.id}
          className={s.dustParticle}
          style={{
            left:        p.left,
            top:         p.top,
            width:       p.size,
            height:      p.size,
            '--dur':     p.dur,
            '--delay':   p.delay,
            '--dx':      p.dx,
            '--dy':      p.dy,
            '--dx2':     p.dx2,
            '--dy2':     p.dy2,
            '--opacity': p.opacity,
          }}
        />
      ))}
    </>
  )
}
