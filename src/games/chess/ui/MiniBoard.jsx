// ── MiniBoard : échiquier 2D lecture seule (react-chessboard v5) ────────────
// Sert aux diagrammes des Règles et à la revue d'historique (position figée).
// Aucune interaction (pas de drag, pas de clic). Thème via boards.js.
import { useMemo } from 'react'
import { Chessboard } from 'react-chessboard'
import { fonts } from '../../../features/games/neutralTheme.js'
import { boardParId, BOARD_DEFAUT } from '../logic/boards.js'
import { PIECES } from './pieces.jsx'

export const FEN_INITIALE = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

export default function MiniBoard({
  fen = FEN_INITIALE,
  taille = 240,
  boardId = BOARD_DEFAUT,
  orientation = 'white',
  surbrillances = null,   // { case: styleObj } (flèches simulées via squareStyles)
  coords = false,
}) {
  const tema = boardParId(boardId)
  const options = useMemo(() => ({
    id: `mini-${boardId}-${taille}`,
    pieces: PIECES,
    position: fen,
    boardOrientation: orientation,
    allowDragging: false,
    showNotation: coords,
    squareStyles: surbrillances || {},
    boardStyle: { borderRadius: 8, overflow: 'hidden', boxShadow: '0 10px 28px -16px rgba(0,0,0,.7)' },
    darkSquareStyle: { backgroundColor: tema.foncee },
    lightSquareStyle: { backgroundColor: tema.claire },
    lightSquareNotationStyle: { fontSize: Math.max(8, taille * 0.03), fontFamily: fonts.body, fontWeight: 700, color: tema.notationClaire },
    darkSquareNotationStyle: { fontSize: Math.max(8, taille * 0.03), fontFamily: fonts.body, fontWeight: 700, color: tema.notationFoncee },
  }), [fen, orientation, boardId, taille, coords, surbrillances, tema])

  return (
    <div style={{ width: taille, height: taille, flexShrink: 0 }}>
      <Chessboard options={options} />
    </div>
  )
}
