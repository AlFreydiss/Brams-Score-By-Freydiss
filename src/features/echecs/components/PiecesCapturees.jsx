// ── Pièces capturées (par un camp) + avantage matériel « +N » ────────────────
import { THEME, GLYPHES_PIECES, ORDRE_CAPTURES } from '../constants.js'

export default function PiecesCapturees({ pieces = [], couleurPieces, avantage = 0 }) {
  const triees = [...pieces].sort((a, b) => ORDRE_CAPTURES.indexOf(a) - ORDRE_CAPTURES.indexOf(b))
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 2, minHeight: 20, flexWrap: 'wrap' }}>
      {triees.map((p, i) => (
        <span key={i} style={{ fontSize: 17, lineHeight: 1, color: THEME.muted, textShadow: '0 1px 2px rgba(0,0,0,.6)' }}>
          {GLYPHES_PIECES[couleurPieces][p]}
        </span>
      ))}
      {avantage > 0 && (
        <span style={{ marginLeft: 5, fontSize: 12, fontWeight: 700, color: THEME.success, fontFamily: THEME.fontBody }}>
          +{avantage}
        </span>
      )}
    </div>
  )
}
