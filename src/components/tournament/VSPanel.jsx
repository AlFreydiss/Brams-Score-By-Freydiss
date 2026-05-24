const GOLD = '#d4a017'

export default function VSPanel({ hasVoted, isMobile, qualifiesFor, matchNum, totalMatches }) {
  if (isMobile) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 16, padding: '14px 0',
      }}>
        <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,.08)' }} />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
          <div style={{ fontSize: 22, fontWeight: 900, color: 'rgba(255,255,255,.16)', letterSpacing: '0.1em' }}>
            VS
          </div>
          {!hasVoted && qualifiesFor && (
            <div style={{
              fontSize: 9, color: 'rgba(255,255,255,.22)', textAlign: 'center',
              lineHeight: 1.4, letterSpacing: '0.04em', maxWidth: 130,
            }}>
              → {qualifiesFor}
            </div>
          )}
        </div>
        <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,.08)' }} />
      </div>
    )
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: 14, flexShrink: 0, width: 120,
      alignSelf: 'stretch',
    }}>
      <div style={{
        flex: 1, width: 1,
        background: 'linear-gradient(180deg, transparent, rgba(255,255,255,.1))',
        maxHeight: 180,
      }} />

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
        {matchNum != null && totalMatches != null && (
          <div style={{
            fontSize: 9, color: 'rgba(255,255,255,.2)',
            letterSpacing: '0.1em', textTransform: 'uppercase',
          }}>
            {matchNum} / {totalMatches}
          </div>
        )}

        <div style={{
          fontSize: 56, fontWeight: 900,
          color: 'rgba(255,255,255,.1)',
          letterSpacing: '0.04em', lineHeight: 1,
          userSelect: 'none',
        }}>
          VS
        </div>

        {!hasVoted && qualifiesFor && (
          <div style={{
            fontSize: 9, color: 'rgba(255,255,255,.22)',
            textAlign: 'center', maxWidth: 88,
            lineHeight: 1.55, letterSpacing: '0.04em',
          }}>
            → {qualifiesFor}
          </div>
        )}
      </div>

      <div style={{
        flex: 1, width: 1,
        background: 'linear-gradient(180deg, rgba(255,255,255,.1), transparent)',
        maxHeight: 180,
      }} />
    </div>
  )
}
