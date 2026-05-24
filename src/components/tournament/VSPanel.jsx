const GOLD   = '#d4a017'
const GOLD_L = '#f0c040'

export default function VSPanel({ hasVoted, isMobile, qualifiesFor }) {
  if (isMobile) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '10px 0',
      }}>
        <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,.07)' }} />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <div style={{
            fontSize: 20, fontWeight: 900,
            color: 'rgba(255,255,255,.14)',
            letterSpacing: '0.1em',
          }}>
            VS
          </div>
          {!hasVoted && qualifiesFor && (
            <div style={{
              fontSize: 9, color: 'rgba(255,255,255,.2)',
              textAlign: 'center', lineHeight: 1.4,
              letterSpacing: '0.04em',
            }}>
              → {qualifiesFor}
            </div>
          )}
        </div>
        <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,.07)' }} />
      </div>
    )
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: 14, flexShrink: 0, width: 72,
    }}>
      <div style={{
        flex: 1, width: 1,
        background: 'linear-gradient(180deg, transparent, rgba(255,255,255,.08))',
        maxHeight: 120,
      }} />

      <div style={{
        fontSize: 28, fontWeight: 900,
        color: 'rgba(255,255,255,.12)',
        letterSpacing: '0.08em', lineHeight: 1,
        filter: 'drop-shadow(0 0 10px rgba(212,160,23,.12))',
      }}>
        VS
      </div>

      {!hasVoted && qualifiesFor && (
        <div style={{
          fontSize: 9, color: 'rgba(255,255,255,.2)',
          textAlign: 'center', maxWidth: 62,
          lineHeight: 1.5, letterSpacing: '0.04em',
        }}>
          → Qualifie pour {qualifiesFor}
        </div>
      )}

      <div style={{
        flex: 1, width: 1,
        background: 'linear-gradient(180deg, rgba(255,255,255,.08), transparent)',
        maxHeight: 120,
      }} />
    </div>
  )
}
