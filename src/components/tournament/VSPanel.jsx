const GOLD = '#d4a017'

function WaveBar({ color, active }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 2.5, height: 28, justifyContent: 'center' }}>
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} style={{
          width: 2.5, borderRadius: 2,
          background: color || GOLD,
          opacity: active ? 0.7 : 0.18,
          animation: active
            ? `arWave ${0.45 + (i % 5) * 0.12}s ${i * 0.05}s ease-in-out infinite`
            : `arWaveIdle ${1.8 + (i % 3) * 0.4}s ${i * 0.09}s ease-in-out infinite`,
        }} />
      ))}
    </div>
  )
}

export default function VSPanel({
  hasVoted, isMobile, qualifiesFor, matchNum, totalMatches,
  roundLabel, playingColor, isPlaying,
}) {
  const accentColor = playingColor || GOLD

  if (isMobile) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 0' }}>
        <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,.07)' }} />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <div style={{ fontSize: 20, fontWeight: 900, color: 'rgba(255,255,255,.14)', letterSpacing: '0.1em' }}>VS</div>
          {isPlaying && <WaveBar color={accentColor} active />}
        </div>
        <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,.07)' }} />
      </div>
    )
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: 10, flexShrink: 0, width: 96,
      alignSelf: 'stretch', padding: '20px 0',
    }}>
      {/* Separateur haut */}
      <div style={{ flex: 1, width: 1, background: 'linear-gradient(180deg, transparent, rgba(255,255,255,.08))', maxHeight: 100 }} />

      {/* Phase */}
      {roundLabel && (
        <div style={{
          fontSize: 8, fontWeight: 800, letterSpacing: '0.14em',
          color: 'rgba(255,255,255,.28)', textTransform: 'uppercase',
          textAlign: 'center', lineHeight: 1.4,
        }}>
          {roundLabel}
        </div>
      )}

      {/* Duel X/Y */}
      {matchNum != null && totalMatches != null && (
        <div style={{
          fontSize: 9, color: 'rgba(255,255,255,.18)',
          letterSpacing: '0.08em', fontWeight: 600,
        }}>
          {matchNum} / {totalMatches}
        </div>
      )}

      {/* VS */}
      <div style={{
        fontSize: 44, fontWeight: 900,
        color: isPlaying ? `${accentColor}30` : 'rgba(255,255,255,.08)',
        letterSpacing: '0.02em', lineHeight: 1,
        userSelect: 'none',
        transition: 'color 0.6s',
      }}>
        VS
      </div>

      {/* Waveform colorée */}
      <WaveBar color={accentColor} active={isPlaying} />

      {/* Qualifie pour */}
      {!hasVoted && qualifiesFor && (
        <div style={{
          fontSize: 8, color: 'rgba(255,255,255,.18)',
          textAlign: 'center', maxWidth: 80,
          lineHeight: 1.5, letterSpacing: '0.04em',
        }}>
          → {qualifiesFor}
        </div>
      )}

      {/* Separateur bas */}
      <div style={{ flex: 1, width: 1, background: 'linear-gradient(180deg, rgba(255,255,255,.08), transparent)', maxHeight: 100 }} />
    </div>
  )
}
