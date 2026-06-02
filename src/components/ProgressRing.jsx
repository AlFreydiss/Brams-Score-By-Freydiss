import { memo } from 'react'

/**
 * Stylish circular miniature progress ring with anime poster.
 * Used in the info panels of custom anime pages to show video progress.
 * The poster makes it a nice representative "minia" like the hub cards.
 */
export const ProgressRing = memo(function ProgressRing({ 
  pct = 0, 
  size = 72, 
  stroke = 6, 
  color = '#f43f5e', 
  posterSrc = null 
}) {
  const r = (size - stroke * 2) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - Math.max(0, Math.min(100, pct)) / 100 * circ

  return (
    <div 
      style={{
        position: 'relative',
        width: size,
        height: size,
        flexShrink: 0,
        borderRadius: '50%',
        overflow: 'hidden',
        background: posterSrc ? '#111' : 'rgba(255,255,255,.04)',
        border: `1px solid ${color}33`,
        boxShadow: '0 4px 16px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.08)',
      }}
    >
      {/* Stylish anime poster as the minia background (round crop) */}
      {posterSrc && (
        <img 
          src={posterSrc} 
          alt="anime" 
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            filter: 'brightness(0.78) saturate(1.2) contrast(1.08)',
          }} 
        />
      )}

      {/* Gradient veil so the % text stays readable and it feels premium */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: posterSrc 
          ? 'radial-gradient(circle at 40% 30%, rgba(0,0,0,.15) 0%, rgba(0,0,0,.55) 65%)' 
          : 'linear-gradient(180deg, rgba(0,0,0,.2), rgba(0,0,0,.5))',
        borderRadius: '50%',
        zIndex: 1
      }} />

      {/* The actual progress ring (drawn on top) */}
      <svg 
        width={size} 
        height={size} 
        style={{ 
          position: 'absolute', 
          top: 0, 
          left: 0, 
          transform: 'rotate(-90deg)',
          zIndex: 2,
          pointerEvents: 'none'
        }}
      >
        {/* subtle track */}
        <circle 
          cx={size/2} 
          cy={size/2} 
          r={r} 
          fill="none" 
          stroke="rgba(255,255,255,.15)" 
          strokeWidth={stroke} 
        />
        {/* colored progress arc */}
        <circle 
          cx={size/2} 
          cy={size/2} 
          r={r} 
          fill="none" 
          stroke={color} 
          strokeWidth={stroke}
          strokeDasharray={circ} 
          strokeDashoffset={offset} 
          strokeLinecap="round"
          style={{ 
            transition: 'stroke-dashoffset .55s cubic-bezier(0.23, 1.0, 0.32, 1)',
            filter: 'drop-shadow(0 0 3px ' + color + '44)'
          }}
        />
      </svg>

      {/* Centered percentage label */}
      <div style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 3,
        color: '#fff',
        textShadow: '0 1px 4px rgba(0,0,0,.7)',
        pointerEvents: 'none'
      }}>
        <span style={{ 
          fontFamily: "var(--display)", 
          fontWeight: 900, 
          fontSize: pct >= 100 ? 12 : 15, 
          lineHeight: 1,
          letterSpacing: '-0.02em'
        }}>
          {pct}%
        </span>
        <span style={{ 
          fontSize: 7, 
          fontWeight: 700, 
          letterSpacing: '.09em', 
          textTransform: 'uppercase', 
          opacity: 0.75, 
          marginTop: -1 
        }}>
          vu
        </span>
      </div>
    </div>
  )
})
