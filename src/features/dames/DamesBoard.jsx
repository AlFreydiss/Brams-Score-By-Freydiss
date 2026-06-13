// ── Plateau de dames — rendu + interaction, branché sur le moteur ────────────
// Thème One Piece : red = Pirates (☠), black = Marine (⚓), dames = couronne.
// Styles inline (convention Brams). La rafle max est gérée par le moteur :
// getLegalMoves ne renvoie QUE les coups légaux → on ne peut sélectionner qu'une
// pièce qui a un coup légal, et seules ses arrivées légales sont cliquables.
import { useMemo, useState } from 'react'
import { getLegalMoves, DEFAULT_RULESET } from '../../lib/dames/damesEngine.js'

const DARK = '#2a1f15'
const DARK_ALT = '#332619'
const LIGHT = '#b8a07a'
const LIGHT_ALT = '#c4ad88'
const GOLD = '#d4a017'

function Piece({ piece }) {
  const isRed = piece.color === 'red'
  const grad = isRed
    ? 'radial-gradient(circle at 36% 30%, #ff7d70, #c01f1a 68%, #7c1410)'
    : 'radial-gradient(circle at 36% 30%, #54688f, #1b2740 68%, #0b1120)'
  const rim = isRed ? 'rgba(255,180,165,.5)' : 'rgba(150,170,205,.5)'
  return (
    <div style={{
      width: '78%', height: '78%', borderRadius: '50%', background: grad,
      border: `1px solid ${rim}`,
      boxShadow: 'inset 0 2px 5px rgba(255,255,255,.28), inset 0 -4px 7px rgba(0,0,0,.5), 0 3px 7px rgba(0,0,0,.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <span style={{ fontSize: 'min(4.2vw, 22px)', lineHeight: 1, filter: 'drop-shadow(0 1px 1px rgba(0,0,0,.55))' }}>
        {piece.type === 'king' ? '👑' : isRed ? '☠️' : '⚓'}
      </span>
    </div>
  )
}

export default function DamesBoard({ board, turn, ruleset = DEFAULT_RULESET, onMove, myColor = null, lastMove = null, disabled = false }) {
  const size = ruleset.size
  const [selected, setSelected] = useState(null)
  const legal = useMemo(() => getLegalMoves(board, turn, ruleset), [board, turn, ruleset])
  const myTurn = !disabled && (!myColor || myColor === turn)

  const fromSet = useMemo(() => new Set(legal.map((m) => m.from.join(','))), [legal])
  const destMap = useMemo(() => {
    const m = new Map()
    if (selected) {
      for (const mv of legal) if (mv.from[0] === selected[0] && mv.from[1] === selected[1]) m.set(mv.to.join(','), mv)
    }
    return m
  }, [legal, selected])

  function onCell(r, c) {
    if (!myTurn) return
    const dest = destMap.get(`${r},${c}`)
    if (dest) { onMove?.(dest); setSelected(null); return }
    const p = board[r][c]
    if (p && p.color === turn && fromSet.has(`${r},${c}`)) setSelected([r, c])
    else setSelected(null)
  }

  return (
    <div style={{
      width: 'min(92vw, 540px)', aspectRatio: '1', display: 'grid',
      gridTemplateColumns: `repeat(${size}, 1fr)`,
      borderRadius: 12, overflow: 'hidden', border: '7px solid #1a120b',
      boxShadow: '0 26px 70px rgba(0,0,0,.55), inset 0 0 0 1px rgba(212,160,23,.15)',
    }}>
      {board.map((row, r) => row.map((cell, c) => {
        const dark = (r + c) % 2 === 1
        const key = `${r},${c}`
        const isSel = selected && selected[0] === r && selected[1] === c
        const isDest = destMap.has(key)
        const isLast = lastMove && ((lastMove.from[0] === r && lastMove.from[1] === c) || (lastMove.to[0] === r && lastMove.to[1] === c))
        const base = dark ? ((r + c) % 4 === 1 ? DARK : DARK_ALT) : ((r + c) % 4 === 0 ? LIGHT : LIGHT_ALT)
        return (
          <div
            key={key}
            onClick={() => dark && onCell(r, c)}
            style={{
              position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: base, cursor: dark && myTurn && (isDest || (cell && cell.color === turn && fromSet.has(key))) ? 'pointer' : 'default',
              boxShadow: isLast ? `inset 0 0 0 3px ${GOLD}66` : 'none',
            }}
          >
            {isSel && <div style={{ position: 'absolute', inset: '6%', borderRadius: '50%', boxShadow: `inset 0 0 0 3px ${GOLD}`, pointerEvents: 'none' }} />}
            {cell && <Piece piece={cell} />}
            {isDest && (
              <div style={{
                position: 'absolute', width: cell ? '92%' : '30%', height: cell ? '92%' : '30%',
                borderRadius: '50%',
                background: cell ? 'transparent' : 'rgba(212,160,23,.55)',
                boxShadow: cell ? `inset 0 0 0 3px ${GOLD}` : `0 0 10px ${GOLD}88`,
                pointerEvents: 'none',
              }} />
            )}
          </div>
        )
      }))}
    </div>
  )
}
