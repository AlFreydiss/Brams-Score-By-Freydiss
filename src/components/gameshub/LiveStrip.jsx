// ── LiveStrip : bandeau fin « EN DIRECT » du hub des jeux ────────────────────
// Rangée horizontale sobre : pastille verte (pulse doux) + « N en vocal » ·
// meilleur ELO échecs (♔) · meilleur ELO dames (◉). Chaque segment est masqué
// si sa donnée est null ; si rien à afficher → return null (le parent gère).
// DA : dark premium — or #d4a017 sur #08090d, 12px, tabular-nums. Inline only
// (le <style> ne sert qu'au pulse, coupé si prefers-reduced-motion).

const GOLD = '#d4a017'
const TEXT = 'rgba(235, 237, 242, 0.88)'
const MUTE = 'rgba(235, 237, 242, 0.42)'
const GREEN = '#3ddc84'

const CSS = `
@keyframes lvstrip-pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.45;transform:scale(.78)}}
.lvstrip-dot{animation:lvstrip-pulse 2.4s ease-in-out infinite}
@media (prefers-reduced-motion: reduce){.lvstrip-dot{animation:none}}
`

const segStyle = { display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap', color: TEXT }
const numStyle = { fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: TEXT }
const nameStyle = { fontWeight: 600, color: TEXT, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis' }
const iconStyle = { color: GOLD, fontSize: 13, lineHeight: 1, flexShrink: 0 }

export default function LiveStrip({ voice, echecsTop, damesTop }) {
  const chess = Array.isArray(echecsTop) && echecsTop.length > 0 ? echecsTop[0] : null
  const dames = Array.isArray(damesTop) && damesTop.length > 0 ? damesTop[0] : null
  const showVoice = typeof voice === 'number' && voice > 0
  if (!showVoice && !chess && !dames) return null

  const segments = []
  if (showVoice) {
    segments.push(
      <span key="voice" style={segStyle}>
        <span aria-hidden className="lvstrip-dot" style={{
          width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
          background: GREEN, boxShadow: `0 0 8px ${GREEN}66`,
        }} />
        <span style={numStyle}>{voice}</span>
        <span style={{ color: MUTE }}>en vocal</span>
      </span>
    )
  }
  if (chess) {
    segments.push(
      <span key="echecs" style={segStyle} title="Meilleur ELO échecs">
        <span aria-hidden style={iconStyle}>♔</span>
        <span style={nameStyle}>{chess.pseudo}</span>
        <span style={numStyle}>{chess.elo}</span>
      </span>
    )
  }
  if (dames) {
    segments.push(
      <span key="dames" style={segStyle} title="Meilleur ELO dames">
        <span aria-hidden style={iconStyle}>◉</span>
        <span style={nameStyle}>{dames.pseudo}</span>
        <span style={numStyle}>{dames.elo}</span>
      </span>
    )
  }

  return (
    <div role="status" aria-label="Activité en direct" style={{
      display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px 14px',
      padding: '8px 16px', borderRadius: 10,
      background: '#08090d', border: '1px solid rgba(212, 160, 23, 0.16)',
      fontSize: 12, lineHeight: 1.2,
      fontFamily: 'inherit',
    }}>
      <style>{CSS}</style>
      <span style={{
        fontWeight: 800, fontSize: 10.5, letterSpacing: '0.18em',
        textTransform: 'uppercase', color: GOLD, flexShrink: 0,
      }}>En direct</span>
      {segments.map((seg, i) => (
        <span key={seg.key} style={{ display: 'inline-flex', alignItems: 'center', gap: 14 }}>
          {i > 0 && <span aria-hidden style={{ color: MUTE, fontSize: 11 }}>·</span>}
          {seg}
        </span>
      ))}
    </div>
  )
}
