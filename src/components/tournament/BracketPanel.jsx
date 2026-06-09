// Mini-bracket du tournoi (parcours vers la finale), affiché en sidebar à côté
// du duel. Partagé entre le tournoi solo et multi.
const PINK = '#9d174d', PINK_L = '#f9a8d4'
const hexA = (c, a) => {
  const n = parseInt(String(c || '#9d174d').replace('#', ''), 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`
}

export default function BracketPanel({ rounds, currentId, isMobile }) {
  if (!rounds?.length) return null
  return (
    <aside style={{
      width: isMobile ? '100%' : 248, flexShrink: 0,
      background: 'rgba(12,13,20,0.55)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
      border: '1px solid rgba(255,255,255,.10)', borderRadius: 16, padding: isMobile ? '10px 12px' : 16,
    }}>
      <style>{`@keyframes troom-pulse{0%,100%{opacity:.5}50%{opacity:1}} .brk-strip::-webkit-scrollbar{height:0}`}</style>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: isMobile ? 8 : 14 }}>
        <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.12em', color: PINK_L, textTransform: 'uppercase' }}>🏆 Bracket</span>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,.4)' }}>vers la finale</span>
      </div>
      {/* Mobile : bande horizontale compacte (ne mange plus toute la hauteur). */}
      <div className={isMobile ? 'brk-strip' : ''} style={{
        display: 'flex', flexDirection: isMobile ? 'row' : 'column', gap: 6,
        overflowX: isMobile ? 'auto' : 'visible', scrollbarWidth: 'none', paddingBottom: isMobile ? 2 : 0,
      }}>
        {rounds.map(r => {
          const playable = r.matches.filter(m => m.left && m.right)
          const total = playable.length
          const done = playable.filter(m => m.status === 'closed').length
          const isCurrent = r.matches.some(m => m.id === currentId)
          const allDone = total > 0 && done === total
          const isFinal = r.size === 2
          const pct = total ? Math.round((done / total) * 100) : 0
          const accent = isFinal ? '#d4a017' : PINK
          const itemBorder = `1px solid ${isCurrent ? accent : 'rgba(255,255,255,.06)'}`
          const itemBg = isCurrent ? hexA(accent, 0.14) : 'rgba(255,255,255,.02)'
          const icon = isFinal ? '👑' : allDone ? '✓' : isCurrent ? '⚔️' : '•'
          if (isMobile) {
            // Chip compacte horizontale
            return (
              <div key={r.id} style={{
                flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 999,
                border: itemBorder, background: itemBg, whiteSpace: 'nowrap',
                animation: isCurrent ? 'troom-pulse 2.4s ease-in-out infinite' : 'none',
              }}>
                <span style={{ fontSize: 12 }}>{icon}</span>
                <strong style={{ fontSize: 11.5, color: isCurrent ? '#fff' : 'rgba(255,255,255,.55)', fontWeight: 700 }}>{r.short}</strong>
                <span style={{ fontSize: 10.5, color: allDone ? '#34d399' : 'rgba(255,255,255,.35)', fontWeight: 700 }}>{done}/{total}</span>
              </div>
            )
          }
          return (
            <div key={r.id} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '8px 11px', borderRadius: 10,
              border: itemBorder, background: itemBg,
              boxShadow: isCurrent ? `0 0 16px ${hexA(accent, 0.22)}` : 'none',
              animation: isCurrent ? 'troom-pulse 2.4s ease-in-out infinite' : 'none',
            }}>
              <span style={{ fontSize: 13, width: 16, textAlign: 'center' }}>{icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5 }}>
                  <strong style={{ color: isCurrent ? '#fff' : allDone ? 'rgba(255,255,255,.6)' : 'rgba(255,255,255,.45)', fontWeight: 700 }}>{r.short}</strong>
                  <span style={{ color: allDone ? '#34d399' : 'rgba(255,255,255,.35)', fontWeight: 700 }}>{done}/{total}</span>
                </div>
                <div style={{ height: 3, borderRadius: 99, background: 'rgba(255,255,255,.08)', overflow: 'hidden', marginTop: 4 }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: allDone ? '#34d399' : accent, transition: 'width .5s' }} />
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </aside>
  )
}
