// MiniBoard — petit damier 2D statique pour illustrer les règles (non interactif).
// Accepte un sous-plateau NxN avec pièces ('p'=pion foncé, 'P'=dame foncée,
// 'c'=pion clair, 'C'=dame claire) et des marques (flèches/anneaux). Cohérent avec
// le board principal (mêmes pions/tokens), mais léger. Inline styles only.
import { ui, damesBoard, damesPieces, DAMES_BOARD_DEFAUT } from '../../../features/games/neutralTheme.js'

const isDark = (r, c) => (r + c) % 2 === 1
const PIECE = {
  p: { side: 'P', king: false }, P: { side: 'P', king: true },
  c: { side: 'M', king: false }, C: { side: 'M', king: true },
}
const SIDE = { P: damesPieces.fonce, M: damesPieces.clair }

function MiniDisc({ side, king }) {
  const c = SIDE[side]
  return (
    <div style={{
      width: '74%', height: '74%', borderRadius: '50%', position: 'relative',
      background: `radial-gradient(circle at 38% 30%, ${c.haut} 0%, ${c.base} 58%, ${c.bord} 100%)`,
      boxShadow: `inset 0 1px 2px rgba(255,255,255,.16), inset 0 -3px 6px rgba(0,0,0,.42), inset 0 0 0 1.5px ${c.bord}, 0 2px 5px rgba(0,0,0,.4)`,
      display: 'grid', placeItems: 'center',
    }}>
      {king && <span aria-hidden style={{ position: 'absolute', inset: '14%', borderRadius: '50%', boxShadow: `inset 0 0 0 2px ${damesPieces.roi}` }} />}
    </div>
  )
}

// rows : array de chaînes (chaque char = case ; '.'/' ' = vide).
// marks : { ring:[[r,c]...], dot:[[r,c]...], cap:[[r,c]...], to:[[r,c]...] }
export default function MiniBoard({ rows, marks = {}, accent = ui.accent, size = 220 }) {
  const N = rows.length
  const theme = damesBoard[DAMES_BOARD_DEFAUT] || damesBoard.bois
  const has = (list, r, c) => (list || []).some(([rr, cc]) => rr === r && cc === c)
  return (
    <div style={{
      width: size, maxWidth: '100%', aspectRatio: '1', display: 'grid',
      gridTemplateColumns: `repeat(${N}, 1fr)`, gridTemplateRows: `repeat(${N}, 1fr)`,
      borderRadius: 6, overflow: 'hidden', boxShadow: `0 0 0 1px ${theme.sombre}, 0 0 0 6px ${theme.sombre}, 0 0 0 7px ${accent}30, ${ui.shadow}`,
    }}>
      {rows.flatMap((rowStr, r) => Array.from({ length: N }, (_, c) => {
        const ch = rowStr[c] || '.'
        const piece = PIECE[ch]
        const dark = isDark(r, c)
        const key = r + '_' + c
        return (
          <div key={key} style={{
            position: 'relative', display: 'grid', placeItems: 'center',
            background: dark ? theme.sombre : theme.clair,
            boxShadow: dark ? 'inset 0 -2px 5px rgba(0,0,0,.22)' : 'inset 0 1px 0 rgba(255,255,255,.28)',
          }}>
            {has(marks.to, r, c) && <div aria-hidden style={{ position: 'absolute', inset: 0, background: `${accent}38`, boxShadow: `inset 0 0 0 2px ${accent}` }} />}
            {has(marks.dot, r, c) && <div aria-hidden style={{ width: '28%', height: '28%', borderRadius: '50%', background: `${accent}cc`, boxShadow: `0 0 0 2px ${accent}40` }} />}
            {has(marks.cap, r, c) && <div aria-hidden style={{ position: 'absolute', inset: '14%', borderRadius: '50%', boxShadow: `inset 0 0 0 3px ${ui.bad}` }} />}
            {has(marks.ring, r, c) && <div aria-hidden style={{ position: 'absolute', inset: '6%', borderRadius: '50%', boxShadow: `0 0 0 2.5px ${ui.bad}` }} />}
            {piece && (
              <div style={{ width: '86%', height: '86%', display: 'grid', placeItems: 'center' }}>
                <MiniDisc side={piece.side} king={piece.king} />
              </div>
            )}
          </div>
        )
      }))}
    </div>
  )
}
