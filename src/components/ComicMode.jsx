import { useState, useEffect, useCallback } from 'react'
import { useSoundEffect } from '../hooks/useSoundEffect.js'

const ONOMATOPEES = ['POW!', 'BAM!', 'CRASH!', 'BOOM!', 'ZAP!', 'SMASH!', 'WHAM!', 'KAPOW!', 'SLICE!', 'THUD!']
const COLORS = ['#ff0000', '#ffcc00', '#00ccff', '#ff6600', '#cc00ff']

const CSS_COMIC = `
  .comic-mode img { filter: contrast(1.15) saturate(0.7); }
  .comic-mode section { border: 2px solid rgba(255,255,255,0.06) !important; }
  .comic-mode .card { border: 2px solid rgba(0,0,0,0.8) !important; box-shadow: 4px 4px 0 rgba(0,0,0,0.6) !important; }
  .comic-mode h2, .comic-mode .h2 { text-shadow: 3px 3px 0 rgba(0,0,0,0.5) !important; }
  .comic-onomatopee {
    position: fixed; z-index: 9000; pointer-events: none;
    font-family: 'Impact', 'Arial Black', sans-serif;
    font-size: 48px; font-weight: 900;
    letter-spacing: 2px;
    text-shadow: 3px 3px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000;
    animation: bounceIn 0.3s ease-out, fadeIn 0.1s ease-out reverse 0.7s both;
    transform-origin: center;
  }
  .halftone-comic {
    position: fixed; inset: 0; z-index: 2; pointer-events: none;
    background-image: radial-gradient(circle, rgba(0,0,0,0.08) 1px, transparent 1px);
    background-size: 8px 8px;
  }
  .comic-border {
    position: fixed; inset: 0; z-index: 3; pointer-events: none;
    border: 8px solid #000;
    box-shadow: inset 0 0 0 3px rgba(255,255,255,0.1);
  }
`

let popId = 0

export default function ComicMode() {
  const [active, setActive] = useState(false)
  const [pops, setPops]     = useState([])
  const { play } = useSoundEffect()

  useEffect(() => {
    const el = document.getElementById('comic-css')
    if (!el) {
      const s = document.createElement('style')
      s.id = 'comic-css'
      s.textContent = CSS_COMIC
      document.head.appendChild(s)
    }
  }, [])

  useEffect(() => {
    document.body.classList.toggle('comic-mode', active)
  }, [active])

  const addPop = useCallback((x, y) => {
    if (!active) return
    const id = ++popId
    const word = ONOMATOPEES[Math.floor(Math.random() * ONOMATOPEES.length)]
    const color = COLORS[Math.floor(Math.random() * COLORS.length)]
    const rot = (Math.random() - 0.5) * 30
    setPops(p => [...p, { id, x, y, word, color, rot }])
    play('click')
    setTimeout(() => setPops(p => p.filter(v => v.id !== id)), 800)
  }, [active, play])

  useEffect(() => {
    const onClick = (e) => addPop(e.clientX, e.clientY)
    if (active) window.addEventListener('click', onClick)
    return () => window.removeEventListener('click', onClick)
  }, [active, addPop])

  return (
    <>
      {active && <div className="halftone-comic" />}
      {active && <div className="comic-border" />}

      {pops.map(p => (
        <div key={p.id} className="comic-onomatopee" style={{
          left: p.x - 40, top: p.y - 30,
          color: p.color,
          transform: `rotate(${p.rot}deg)`,
        }}>{p.word}</div>
      ))}

      {/* Bouton toggle — discret en bas à droite */}
      <button
        onClick={() => { setActive(a => !a); play('click') }}
        title={active ? 'Désactiver Comic Mode' : 'Activer Comic Mode'}
        style={{
          position: 'fixed', bottom: 90, right: 24, zIndex: 800,
          width: 34, height: 34, borderRadius: 9,
          background: active ? '#ffcc00' : 'rgba(255,255,255,.05)',
          border: active ? '2px solid #000' : '1px solid rgba(255,255,255,.08)',
          color: active ? '#000' : 'rgba(255,255,255,.4)',
          cursor: 'pointer', fontSize: 15,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all .2s',
          fontFamily: active ? "'Impact', sans-serif" : 'inherit',
          fontWeight: active ? 900 : 400,
          boxShadow: active ? '2px 2px 0 #000' : 'none',
        }}
        onMouseEnter={e => { e.currentTarget.style.opacity = '0.8' }}
        onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}
      >
        💬
      </button>
    </>
  )
}
