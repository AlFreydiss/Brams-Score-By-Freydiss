import { useState } from 'react'
import { useGear, GEARS } from '../contexts/GearContext.jsx'
import { useSoundEffect } from '../hooks/useSoundEffect.js'

const GEAR_COLORS = {
  0: 'rgba(255,255,255,0.12)',
  2: '#e0524a',
  3: '#fdcb6e',
  4: '#9b59b6',
  5: '#ffd700',
}

export default function GearModeUI() {
  const { gear, next } = useGear()
  const [open, setOpen]   = useState(false)
  const [hovered, setHovered] = useState(false)
  const { play } = useSoundEffect()

  const info = GEARS[gear]
  const color = GEAR_COLORS[gear]

  const handleNext = () => {
    play(gear === 4 ? 'awakening' : 'click')
    next()
  }

  return (
    <div style={{ position: 'fixed', bottom: 24, left: 24, zIndex: 800, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6 }}>
      {/* Tooltip label quand ouvert */}
      {open && (
        <div style={{
          background: 'rgba(17,18,20,0.95)', border: `1px solid ${color}40`,
          borderRadius: 10, padding: '8px 14px', fontSize: 12, color: '#fff',
          fontWeight: 600, whiteSpace: 'nowrap',
          animation: 'slideDown 0.2s ease-out',
          boxShadow: `0 4px 20px rgba(0,0,0,0.5)`,
        }}>
          {info.emoji} {info.label}
        </div>
      )}

      {/* Bouton principal */}
      <button
        onClick={handleNext}
        onMouseEnter={() => { setHovered(true); setOpen(true) }}
        onMouseLeave={() => { setHovered(false); setOpen(false) }}
        title={`Activer ${GEARS[([0,2,3,4,5][([0,2,3,4,5].indexOf(gear)+1)%5])].name}`}
        style={{
          width: 42, height: 42, borderRadius: 12,
          background: gear === 0 ? 'rgba(255,255,255,0.06)' : color + '25',
          border: `2px solid ${gear === 0 ? 'rgba(255,255,255,0.1)' : color + '60'}`,
          cursor: 'pointer', fontSize: 18,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.25s cubic-bezier(0.34,1.56,0.64,1)',
          transform: hovered ? 'scale(1.15)' : 'scale(1)',
          boxShadow: gear !== 0 ? `0 0 20px ${color}40` : 'none',
          animation: gear !== 0 ? 'pulse 2s infinite' : 'none',
        }}
      >
        {info.emoji}
      </button>
    </div>
  )
}
