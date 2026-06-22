// ─────────────────────────────────────────────────────────────────────────────
// DamesView2D — vue 2D top-down (toggle) du plateau, posée par-dessus la scène R3F.
// Lit le MÊME store externe que la scène 3D (board, sélection, coups légaux, dernier
// coup, indice) et émet les MÊMES clics (onSquareClick) → la logique de partie,
// l'IA minimax et le ranked online restent intacts : c'est une simple peau alternative.
// Pour les joueurs qui préfèrent une lecture plane, sans relief ni caméra.
// Styles inline only (repo inline-only). Surbrillance prise obligatoire + coups légaux.
// ─────────────────────────────────────────────────────────────────────────────
import { useSyncExternalStore } from 'react'

const P = 'P', M = 'M'
const isDark = (r, c) => (r + c) % 2 === 1
const PIRATA = "'Pirata One','OnePiece',cursive"

// disque d'une pièce (médaillon plat, cohérent avec les factions 3D)
function Disc({ side, king, small }) {
  const isP = side === P
  const d = small ? 26 : '74%'
  return (
    <div style={{
      width: d, height: d, borderRadius: '50%', position: 'relative',
      background: isP
        ? 'radial-gradient(circle at 34% 28%, #c46658 0%, #8a352c 52%, #4a0f0a 100%)'
        : 'radial-gradient(circle at 34% 28%, #5b82a6 0%, #2c4d6c 52%, #0c2038 100%)',
      boxShadow: `inset 0 2px 4px rgba(255,255,255,.22), inset 0 -3px 6px rgba(0,0,0,.5), 0 3px 7px rgba(0,0,0,.45)`,
      border: `2px solid ${king ? '#e7c46a' : (isP ? '#3c0c08' : '#0a1a30')}`,
      display: 'grid', placeItems: 'center', transition: 'transform .12s',
    }}>
      <div aria-hidden style={{ fontSize: small ? 12 : '1.9vw', lineHeight: 1, filter: 'drop-shadow(0 1px 1px rgba(0,0,0,.6))', maxWidth: 28 }}>
        {king ? '👑' : isP ? '☠️' : '⚓'}
      </div>
    </div>
  )
}

export default function DamesView2D({ store, onSquareClick }) {
  const s = useSyncExternalStore(store.subscribe, store.getState)
  if (!s.view2D || !s.board) return null

  const board = s.board
  const SIZE = board.length   // taille de grille variable (8×8, 10×10…) dérivée du plateau
  const selKey = s.selected ? s.selected[0] + '_' + s.selected[1] : null
  // coups partant de la pièce sélectionnée (cases d'arrivée + nature capture)
  const own = s.selected ? (s.legalMoves || []).filter(mv => mv.from[0] === s.selected[0] && mv.from[1] === s.selected[1]) : []
  const targetKind = {}   // key arrivée -> 'cap' | 'move'
  for (const mv of own) targetKind[mv.to[0] + '_' + mv.to[1]] = mv.isCapture ? 'cap' : 'move'
  // cases intermédiaires de la (seule) rafle proposée → aperçu du trajet
  const raids = own.filter(mv => mv.isCapture && mv.path && mv.path.length >= 2)
  const hopKeys = new Set()
  if (raids.length === 1) raids[0].path.slice(0, -1).forEach(([r, c]) => hopKeys.add(r + '_' + c))
  const lastKeys = new Set()
  if (s.last) { lastKeys.add(s.last.from[0] + '_' + s.last.from[1]); (s.last.path || [s.last.to]).forEach(([r, c]) => lastKeys.add(r + '_' + c)) }
  const hintKeys = new Set()
  if (s.hint) { hintKeys.add(s.hint.from[0] + '_' + s.hint.from[1]); hintKeys.add(s.hint.to[0] + '_' + s.hint.to[1]) }
  // surbrillance "prise obligatoire" : si des captures existent, les pièces concernées pulsent
  const hasCaptures = (s.legalMoves || []).some(mv => mv.isCapture)
  const interactive = s.interactive && !s.gameOver
  const movable = s.movableKeys || new Set()

  return (
    <div aria-hidden={false} role="grid" aria-label="Plateau de dames — vue 2D"
      style={{ position: 'absolute', inset: 0, zIndex: 7, display: 'grid', placeItems: 'center', pointerEvents: 'auto', background: 'radial-gradient(120% 90% at 50% 18%, #1b140c 0%, #0e0a06 55%, #070504 100%)' }}>
      <div style={{
        width: 'min(92vmin, 640px)', aspectRatio: '1', display: 'grid',
        gridTemplateColumns: `repeat(${SIZE}, 1fr)`, gridTemplateRows: `repeat(${SIZE}, 1fr)`,
        borderRadius: 14, overflow: 'hidden', position: 'relative',
        border: '6px solid #241710', boxShadow: '0 26px 70px rgba(0,0,0,.7), inset 0 0 0 2px rgba(217,184,112,.4), 0 0 0 1px rgba(0,0,0,.6)',
      }}>
        {board.flatMap((row, r) => row.map((cell, c) => {
          const key = r + '_' + c
          const dark = isDark(r, c)
          const isMovablePiece = interactive && movable.has(key)
          const mandatory = hasCaptures && cell && isMovablePiece    // pièce qui DOIT pouvoir prendre
          const kind = targetKind[key]
          const isHop = hopKeys.has(key)
          const isLast = lastKeys.has(key)
          const isHint = hintKeys.has(key)
          const isSel = key === selKey
          const clickable = interactive && (isMovablePiece || kind)
          return (
            <div key={key} role="gridcell"
              onClick={() => { if (interactive) onSquareClick?.(r, c) }}
              style={{
                position: 'relative', display: 'grid', placeItems: 'center',
                background: dark
                  ? 'linear-gradient(150deg, #6b4427, #533318)'
                  : 'linear-gradient(150deg, #ead8b0, #d8c194)',
                cursor: clickable ? 'pointer' : 'default',
                boxShadow: isSel ? 'inset 0 0 0 3px #f6e6b0, inset 0 0 18px rgba(246,230,176,.4)'
                  : isLast ? 'inset 0 0 0 2px rgba(217,184,112,.55)' : 'none',
              }}>
              {/* tapis "dernier coup" */}
              {isLast && !isSel && <div style={{ position: 'absolute', inset: 4, borderRadius: 6, background: 'radial-gradient(circle, rgba(242,214,138,.28), transparent 70%)', pointerEvents: 'none' }} />}
              {/* indice (cyan) */}
              {isHint && <div style={{ position: 'absolute', inset: 3, borderRadius: 8, boxShadow: 'inset 0 0 0 2px #6fe0ff', pointerEvents: 'none' }} />}
              {/* cible de coup légal */}
              {kind === 'move' && !cell && <div style={{ width: '34%', height: '34%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(217,184,112,.85), rgba(217,184,112,.35))', boxShadow: '0 0 10px rgba(217,184,112,.6)', pointerEvents: 'none' }} />}
              {kind === 'cap' && <div style={{ position: 'absolute', inset: '14%', borderRadius: '50%', boxShadow: 'inset 0 0 0 3px #ff7a52, 0 0 12px rgba(255,122,82,.6)', pointerEvents: 'none' }} />}
              {/* case intermédiaire de rafle */}
              {isHop && <div style={{ width: '18%', height: '18%', borderRadius: '50%', background: '#ff8a5a', opacity: .8, pointerEvents: 'none' }} />}
              {/* pièce */}
              {cell && (
                <div style={{ width: '78%', height: '78%', display: 'grid', placeItems: 'center', position: 'relative', transform: isSel ? 'scale(1.06)' : 'none', transition: 'transform .12s' }}>
                  {mandatory && <span style={{ position: 'absolute', inset: -4, borderRadius: '50%', boxShadow: '0 0 0 3px rgba(255,122,82,.9)', animation: 'dames2dPulse 1.1s ease-in-out infinite', pointerEvents: 'none' }} />}
                  <Disc side={cell.side} king={cell.king} />
                </div>
              )}
            </div>
          )
        }))}
      </div>
      {hasCaptures && interactive && (
        <div style={{ position: 'absolute', top: 14, left: '50%', transform: 'translateX(-50%)', padding: '6px 16px', borderRadius: 999, background: 'rgba(120,30,10,.82)', border: '1px solid rgba(255,122,82,.5)', color: '#ffd2c0', fontFamily: PIRATA, fontSize: 15, letterSpacing: '.5px', boxShadow: '0 6px 20px rgba(0,0,0,.5)', pointerEvents: 'none' }}>
          ⚔️ Prise obligatoire — rafle maximale
        </div>
      )}
      <style>{`@keyframes dames2dPulse{0%,100%{opacity:1}50%{opacity:.35}}`}</style>
    </div>
  )
}
