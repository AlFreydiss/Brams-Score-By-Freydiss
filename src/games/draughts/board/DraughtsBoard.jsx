// ─────────────────────────────────────────────────────────────────────────────
// DraughtsBoard — plateau 2D PREMIUM NEUTRE, autonome (piloté par props, pas de
// store externe ni R3F). Visuels portés de DamesView2D (bois/ivoire, médaillons
// mats, dame liseré or + couronne SVG, FLIP du dernier coup, surbrillance prise
// obligatoire), mais l'accent CHROME passe au bleu-acier (#6f8fb0) — univers Dames
// distinct de l'univers Échecs (laiton chaud). Pions restent neutres graphite/ivoire.
//   • drag-and-drop + clic · cibles de coup / anneaux de capture · aperçu de rafle
//   • coordonnées internationales (1–50) · a11y (curseur clavier, focus visible)
// Styles inline only (repo inline-only). Tokens = neutralTheme (source unique).
// ─────────────────────────────────────────────────────────────────────────────
import { useRef, useLayoutEffect, useState, useCallback } from 'react'
import { ui, fonts, damesBoard, damesPieces, marks, DAMES_BOARD_DEFAUT } from '../../../features/games/neutralTheme.js'

const P = 'P', M = 'M'
const isDark = (r, c) => (r + c) % 2 === 1
const reduced = () => { try { return window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches } catch { return false } }
const SIDE = { [P]: damesPieces.fonce, [M]: damesPieces.clair }

// ── Pion (médaillon mat) ── disque biseauté ; dame = anneau or + couronne gravée.
function Disc({ side, king, scale = 1, dragging = false }) {
  const c = SIDE[side]
  const isFonce = side === P
  return (
    <div style={{
      width: '76%', height: '76%', borderRadius: '50%', position: 'relative',
      background: `radial-gradient(circle at 38% 30%, ${c.haut} 0%, ${c.base} 58%, ${c.bord} 100%)`,
      boxShadow: [
        'inset 0 2px 3px rgba(255,255,255,.16)',
        'inset 0 -4px 8px rgba(0,0,0,.42)',
        `inset 0 0 0 2px ${c.bord}`,
        dragging ? '0 12px 22px rgba(0,0,0,.5)' : '0 4px 9px rgba(0,0,0,.46)',
      ].join(', '),
      display: 'grid', placeItems: 'center',
      transform: `scale(${scale})`, transition: 'transform .14s ease',
    }}>
      <div aria-hidden style={{
        position: 'absolute', inset: '16%', borderRadius: '50%',
        boxShadow: `inset 0 0 0 1.5px ${isFonce ? 'rgba(255,255,255,.07)' : 'rgba(0,0,0,.10)'}`,
      }} />
      {king && (
        <>
          <span aria-hidden style={{ position: 'absolute', inset: '6%', borderRadius: '50%', boxShadow: `inset 0 0 0 2.5px ${damesPieces.roi}, 0 0 8px rgba(200,164,92,.45)` }} />
          <svg viewBox="0 0 24 24" aria-hidden style={{ width: '42%', height: '42%', position: 'relative', filter: 'drop-shadow(0 1px 1px rgba(0,0,0,.5))' }}>
            <path d="M3 8l3.5 3L12 5l5.5 6L21 8l-1.6 9H4.6L3 8z" fill="none" stroke={damesPieces.roi} strokeWidth="1.7" strokeLinejoin="round" strokeLinecap="round" />
          </svg>
        </>
      )}
    </div>
  )
}

// Plateau 2D autonome.
//  Props :
//   board, size, boardTheme, accent
//   selected [r,c]|null, legalMoves[], last (mv)|null, hint (mv)|null, cursor [r,c]|null
//   movableKeys (Set), interactive (bool), gameOver (bool)
//   coordsOn, highlightsOn, animOn, animMult
//   onSquareClick(r,c)
export default function DraughtsBoard({
  board, size = 10, boardTheme = DAMES_BOARD_DEFAUT, accent = ui.accent,
  selected = null, legalMoves = [], last = null, hint = null, cursor = null,
  movableKeys, interactive = true, gameOver = false,
  coordsOn = true, highlightsOn = true, animOn = true, animMult = 1,
  onSquareClick,
}) {
  const boardRef = useRef(null)
  const animRef = useRef(null)
  const [anim, setAnim] = useState(null)
  const prevLast = useRef(null)
  const [drag, setDragState] = useState(null)   // miroir visuel du glisser
  const dragRef = useRef(null)                   // source de vérité (handlers pointeur)
  const movedRef = useRef(false)                 // un vrai glisser a-t-il eu lieu ?
  const setDrag = useCallback((v) => { dragRef.current = typeof v === 'function' ? v(dragRef.current) : v; setDragState(dragRef.current) }, [])

  const SIZE = board?.length || size
  const theme = damesBoard[boardTheme] || damesBoard[DAMES_BOARD_DEFAUT]
  const movable = movableKeys || new Set()
  const noMotion = reduced()

  // Numérotation des cases sombres : 1–50 en 10×10, 1–32 en 8×8 (variante).
  const squareNo = (r, c) => Math.floor((r * SIZE + c) / 2) + 1

  // ── animation FLIP du dernier coup (déplacement + rafle) ──
  useLayoutEffect(() => {
    if (!animOn || !last?.from || !last?.to || !board || !boardRef.current) { setAnim(null); return }
    const sig = JSON.stringify(last)
    if (prevLast.current === sig) return
    prevLast.current = sig
    if (reduced()) return
    const grid = boardRef.current
    const cellOf = (r, c) => {
      const el = grid.querySelector(`[data-cell="${r}_${c}"]`)
      if (!el) return null
      const gr = grid.getBoundingClientRect(), cr = el.getBoundingClientRect()
      return { x: cr.left - gr.left + cr.width / 2, y: cr.top - gr.top + cr.height / 2, w: cr.width }
    }
    const fromPt = cellOf(last.from[0], last.from[1])
    const pathCells = last.path || [last.to]
    const path = pathCells.map(([r, c]) => cellOf(r, c)).filter(Boolean)
    const dest = path[path.length - 1]
    if (!fromPt || !dest) return
    const destCell = pathCells[pathCells.length - 1]
    const piece = board?.[destCell[0]]?.[destCell[1]]
    setAnim({
      from: fromPt, path, side: piece?.side || last.side, king: piece?.king, w: fromPt.w,
      capCells: new Set((last.caps || []).map(([r, c]) => r + '_' + c)),
    })
  }, [last, board, animOn])

  // joue l'animation WAAPI une fois `anim` posé, puis nettoie.
  useLayoutEffect(() => {
    if (!anim || !animRef.current) return
    const el = animRef.current
    const segs = [anim.from, ...anim.path]
    const isCap = anim.path.length > 1 || anim.capCells.size > 0
    const frames = []
    segs.forEach((p, i) => {
      const offset = segs.length > 1 ? i / (segs.length - 1) : 0
      const lift = (isCap && i > 0 && i < segs.length - 1) ? -anim.w * 0.18 : 0
      frames.push({ transform: `translate(${p.x - anim.from.x}px, ${p.y - anim.from.y + lift}px)`, offset })
    })
    const base = isCap ? 230 * Math.max(1, anim.path.length) : 220
    const dur = base * (animMult || 1)
    const a = el.animate(frames.length > 1 ? frames : [{ transform: 'translate(0,0)' }, { transform: 'translate(0,0)' }],
      { duration: dur, easing: 'cubic-bezier(.4,.05,.2,1)', fill: 'forwards' })
    let cancelled = false
    a.finished.then(() => { if (!cancelled) setAnim(null) }).catch(() => {})
    return () => { cancelled = true; try { a.cancel() } catch { /* */ } }
  }, [anim, animMult])

  // ── derivations de surbrillance ──
  const selKey = selected ? selected[0] + '_' + selected[1] : null
  const own = selected ? (legalMoves || []).filter(mv => mv.from[0] === selected[0] && mv.from[1] === selected[1]) : []
  const targetKind = {}
  for (const mv of own) targetKind[mv.to[0] + '_' + mv.to[1]] = mv.isCapture ? 'cap' : 'move'
  const raids = own.filter(mv => mv.isCapture && mv.path && mv.path.length >= 2)
  const hopKeys = new Set()
  if (raids.length === 1) raids[0].path.slice(0, -1).forEach(([r, c]) => hopKeys.add(r + '_' + c))
  const lastKeys = new Set()
  if (last?.from && last?.to) { lastKeys.add(last.from[0] + '_' + last.from[1]); (last.path || [last.to]).forEach(([r, c]) => lastKeys.add(r + '_' + c)) }
  const lastDest = last?.to ? (last.path || [last.to]).slice(-1)[0] : null
  const lastDestKey = lastDest ? lastDest[0] + '_' + lastDest[1] : null
  const hintKeys = new Set()
  if (hint?.from && hint?.to) { hintKeys.add(hint.from[0] + '_' + hint.from[1]); hintKeys.add(hint.to[0] + '_' + hint.to[1]) }
  const hasCaptures = (legalMoves || []).some(mv => mv.isCapture)
  const cursorKey = cursor ? cursor[0] + '_' + cursor[1] : null
  const animDestKey = anim && lastDestKey
  const canPlay = interactive && !gameOver

  // ── drag-and-drop (pointer events) ──
  const pickCellFromPoint = useCallback((clientX, clientY) => {
    const grid = boardRef.current; if (!grid) return null
    const gr = grid.getBoundingClientRect()
    const cw = gr.width / SIZE, ch = gr.height / SIZE
    const c = Math.floor((clientX - gr.left) / cw)
    const r = Math.floor((clientY - gr.top) / ch)
    if (r < 0 || r >= SIZE || c < 0 || c >= SIZE) return null
    return [r, c]
  }, [SIZE])

  const onPointerDownPiece = useCallback((e, r, c) => {
    if (!canPlay || !movable.has(r + '_' + c)) return
    if (e.button !== undefined && e.button !== 0) return
    e.preventDefault()
    onSquareClick?.(r, c)                       // sélectionne (révèle les cibles)
    const grid = boardRef.current; if (!grid) return
    const gr = grid.getBoundingClientRect()
    try { e.currentTarget.setPointerCapture?.(e.pointerId) } catch { /* */ }
    movedRef.current = false
    setDrag({ r, c, x: e.clientX - gr.left, y: e.clientY - gr.top, w: gr.width / SIZE })
  }, [canPlay, movable, onSquareClick, SIZE, setDrag])

  const onPointerMove = useCallback((e) => {
    if (!dragRef.current) return
    const grid = boardRef.current; if (!grid) return
    const gr = grid.getBoundingClientRect()
    movedRef.current = true   // au-delà d'un simple appui : c'est un glisser
    setDrag(d => d && ({ ...d, x: e.clientX - gr.left, y: e.clientY - gr.top }))
  }, [setDrag])

  const onPointerUp = useCallback((e) => {
    const dropped = dragRef.current
    if (!dropped) return
    setDrag(null)
    const wasDrag = movedRef.current
    // le click natif suit le pointerup : on neutralise movedRef juste après pour
    // qu'un éventuel onClick de la case déposée soit ignoré, sans bloquer le clic suivant.
    setTimeout(() => { movedRef.current = false }, 0)
    if (!wasDrag) return                      // simple clic : la sélection au pointerdown suffit
    const target = pickCellFromPoint(e.clientX, e.clientY)
    if (!target) return
    const [tr, tc] = target
    if (tr === dropped.r && tc === dropped.c) return
    onSquareClick?.(tr, tc)                    // dépose = joue le coup vers la case visée
  }, [pickCellFromPoint, onSquareClick, setDrag])

  if (!board) return null

  return (
    <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', position: 'relative' }}>
      <div ref={boardRef}
        onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={() => setDrag(null)}
        role="grid" aria-label="Plateau de dames internationales"
        style={{
          position: 'relative', width: 'min(78vmin, 620px)', maxWidth: '100%', aspectRatio: '1',
          display: 'grid', gridTemplateColumns: `repeat(${SIZE}, 1fr)`, gridTemplateRows: `repeat(${SIZE}, 1fr)`,
          borderRadius: 8, overflow: 'hidden', touchAction: 'none',
          boxShadow: [
            `0 0 0 1px ${theme.sombre}`,
            `0 0 0 11px ${theme.sombre}`,
            `0 0 0 12px ${ui.line}`,
            `0 0 0 13px ${accent}33`,
            ui.shadow,
          ].join(', '),
        }}>
        {board.flatMap((row, r) => row.map((cell, c) => {
          const key = r + '_' + c
          const dark = isDark(r, c)
          const isMovablePiece = canPlay && movable.has(key)
          const mandatory = highlightsOn && hasCaptures && cell && isMovablePiece
          const kind = highlightsOn ? targetKind[key] : undefined
          const isHop = highlightsOn && hopKeys.has(key)
          const isLast = highlightsOn && lastKeys.has(key)
          const isHint = hintKeys.has(key)
          const isSel = key === selKey
          const isCursor = key === cursorKey
          const clickable = canPlay && (isMovablePiece || kind)
          const hideForAnim = key === animDestKey
          const hideForDrag = drag && drag.r === r && drag.c === c
          return (
            <div key={key} role="gridcell" data-cell={key}
              aria-label={dark ? `Case ${squareNo(r, c)}${cell ? `, pion ${cell.side === P ? 'foncé' : 'clair'}${cell.king ? ' dame' : ''}` : ''}` : undefined}
              onClick={() => { if (canPlay && !dragRef.current && !movedRef.current) onSquareClick?.(r, c) }}
              onPointerDown={(e) => { if (cell) onPointerDownPiece(e, r, c) }}
              style={{
                position: 'relative', display: 'grid', placeItems: 'center',
                background: dark ? theme.sombre : theme.clair,
                cursor: clickable ? (drag ? 'grabbing' : 'pointer') : 'default',
                boxShadow: dark
                  ? 'inset 0 1px 0 rgba(255,255,255,.04), inset 0 -2px 6px rgba(0,0,0,.22)'
                  : 'inset 0 1px 0 rgba(255,255,255,.30), inset 0 -2px 6px rgba(0,0,0,.07)',
              }}>
              {isLast && <div aria-hidden style={{ position: 'absolute', inset: 0, background: `${accent}30`, pointerEvents: 'none' }} />}
              {isSel && <div aria-hidden style={{ position: 'absolute', inset: 0, boxShadow: `inset 0 0 0 3px ${accent}`, background: `${accent}33`, pointerEvents: 'none' }} />}
              {isCursor && !isSel && <div aria-hidden style={{ position: 'absolute', inset: 0, boxShadow: `inset 0 0 0 2px ${accent}aa`, pointerEvents: 'none' }} />}
              {isHint && <div aria-hidden style={{ position: 'absolute', inset: 2, borderRadius: 5, boxShadow: `inset 0 0 0 2px ${ui.info}`, pointerEvents: 'none' }} />}
              {kind === 'move' && !cell && <div aria-hidden style={{ width: '30%', height: '30%', borderRadius: '50%', background: `${accent}8c`, boxShadow: `0 0 0 2px ${accent}38`, pointerEvents: 'none' }} />}
              {kind === 'cap' && <div aria-hidden style={{ position: 'absolute', inset: '15%', borderRadius: '50%', boxShadow: `inset 0 0 0 3px ${marks.capture}`, pointerEvents: 'none' }} />}
              {isHop && <div aria-hidden style={{ width: '16%', height: '16%', borderRadius: '50%', background: marks.capture, opacity: .85, pointerEvents: 'none' }} />}
              {coordsOn && dark && (
                <span aria-hidden style={{ position: 'absolute', top: 2, left: 4, fontSize: 'clamp(7px,1.05vmin,11px)', fontWeight: 700, color: 'rgba(236,238,242,.34)', pointerEvents: 'none', fontFamily: fonts.mono, fontVariantNumeric: 'tabular-nums' }}>
                  {squareNo(r, c)}
                </span>
              )}
              {cell && !hideForAnim && !hideForDrag && (
                <div style={{ width: '88%', height: '88%', display: 'grid', placeItems: 'center', position: 'relative' }}>
                  {mandatory && <span aria-hidden style={{ position: 'absolute', inset: '4%', borderRadius: '50%', boxShadow: `inset 0 0 0 1px ${marks.capture}`, animation: noMotion ? 'none' : 'draughtsPulse 1.15s ease-in-out infinite', pointerEvents: 'none' }} />}
                  <Disc side={cell.side} king={cell.king} scale={isSel ? 1.05 : 1} />
                </div>
              )}
            </div>
          )
        }))}

        {/* clone du dernier coup (déplacement / rafle) */}
        {anim && (
          <div aria-hidden ref={animRef} style={{
            position: 'absolute', left: anim.from.x, top: anim.from.y, width: anim.w, height: anim.w,
            transform: 'translate(0,0)', marginLeft: -anim.w / 2, marginTop: -anim.w / 2,
            display: 'grid', placeItems: 'center', pointerEvents: 'none', zIndex: 5,
            filter: 'drop-shadow(0 6px 10px rgba(0,0,0,.45))',
          }}>
            <Disc side={anim.side} king={anim.king} />
          </div>
        )}

        {/* pion glissé (suit le pointeur) */}
        {drag && (() => {
          const cell = board[drag.r]?.[drag.c]; if (!cell) return null
          return (
            <div aria-hidden style={{
              position: 'absolute', left: drag.x, top: drag.y, width: drag.w, height: drag.w,
              marginLeft: -drag.w / 2, marginTop: -drag.w / 2, display: 'grid', placeItems: 'center',
              pointerEvents: 'none', zIndex: 9,
            }}>
              <Disc side={cell.side} king={cell.king} scale={1.06} dragging />
            </div>
          )
        })()}
      </div>

      {/* bandeau prise obligatoire (neutre) */}
      {highlightsOn && hasCaptures && canPlay && (
        <div role="status" style={{
          position: 'absolute', top: 'clamp(4px,1.5vmin,14px)', left: '50%', transform: 'translateX(-50%)',
          padding: '6px 16px', borderRadius: ui.radius.pill,
          background: ui.surface, border: `1px solid ${ui.lineHi}`, color: ui.text,
          fontFamily: fonts.body, fontWeight: 700, fontSize: 12.5, letterSpacing: '.3px',
          boxShadow: ui.shadow, pointerEvents: 'none', display: 'flex', alignItems: 'center', gap: 8, zIndex: 8,
        }}>
          <span aria-hidden style={{ width: 7, height: 7, borderRadius: '50%', background: ui.bad, boxShadow: `0 0 0 1px ${ui.bad}66` }} />
          Prise obligatoire — rafle maximale
        </div>
      )}

      <style>{`@keyframes draughtsPulse{0%,100%{opacity:1}50%{opacity:.3}}`}</style>
    </div>
  )
}
