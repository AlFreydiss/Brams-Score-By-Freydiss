// ─────────────────────────────────────────────────────────────────────────────
// DamesView2D — plateau 2D PREMIUM NEUTRE (vue par défaut), façon site de dames
// internationales sérieux (lichess-clean). Lit le MÊME store externe que la scène
// 3D (board, sélection, coups légaux, dernier coup, indice, rafle) et émet les
// MÊMES clics (onSquareClick) → logique de partie / IA / ranked online intactes :
// c'est une simple peau plane et élégante. Pas de factions, pas d'emoji.
//   • bois/marbre/ardoise (damesBoard) · pions Foncé (graphite) vs Clair (ivoire)
//   • dame = liseré or (damesPieces.roi) · marques neutres (marks)
//   • déplacement fluide + rafle (multi-capture) + couronnement animés, sobres
//   • coordonnées (numérotation internationale) + rangées/colonnes
// Styles inline only (repo inline-only). Tokens = neutralTheme (source unique).
// ─────────────────────────────────────────────────────────────────────────────
import { useSyncExternalStore, useRef, useLayoutEffect, useState } from 'react'
import { ui, fonts, damesBoard, damesPieces, marks, DAMES_BOARD_DEFAUT } from '../../games/neutralTheme.js'

const P = 'P', M = 'M'
const isDark = (r, c) => (r + c) % 2 === 1
const reduced = () => { try { return window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches } catch { return false } }

// Foncé = P (graphite), Clair = M (ivoire). Neutre, cohérent partout.
const SIDE = { [P]: damesPieces.fonce, [M]: damesPieces.clair }

// ── Pion (médaillon mat) ── disque biseauté, dame = anneau or + couronne gravée.
function Disc({ side, king, scale = 1 }) {
  const c = SIDE[side]
  const isFonce = side === P
  return (
    <div style={{
      width: '76%', height: '76%', borderRadius: '50%', position: 'relative',
      // empilement de disques concentriques (rainures de pion) + biseau mat
      background: `radial-gradient(circle at 38% 30%, ${c.haut} 0%, ${c.base} 58%, ${c.bord} 100%)`,
      boxShadow: [
        'inset 0 2px 3px rgba(255,255,255,.16)',
        'inset 0 -4px 8px rgba(0,0,0,.42)',
        `inset 0 0 0 2px ${c.bord}`,
        '0 4px 9px rgba(0,0,0,.46)',
      ].join(', '),
      display: 'grid', placeItems: 'center',
      transform: `scale(${scale})`, transition: 'transform .14s ease',
    }}>
      {/* rainure intérieure (lecture "jeton de dames") */}
      <div aria-hidden style={{
        position: 'absolute', inset: '16%', borderRadius: '50%',
        boxShadow: `inset 0 0 0 1.5px ${isFonce ? 'rgba(255,255,255,.07)' : 'rgba(0,0,0,.10)'}`,
      }} />
      {king && (
        <>
          {/* liseré or de la dame */}
          <span aria-hidden style={{ position: 'absolute', inset: '6%', borderRadius: '50%', boxShadow: `inset 0 0 0 2.5px ${damesPieces.roi}, 0 0 8px rgba(200,164,92,.45)` }} />
          {/* couronne gravée minimaliste (SVG, pas d'emoji) */}
          <svg viewBox="0 0 24 24" aria-hidden style={{ width: '42%', height: '42%', position: 'relative', filter: 'drop-shadow(0 1px 1px rgba(0,0,0,.5))' }}>
            <path d="M3 8l3.5 3L12 5l5.5 6L21 8l-1.6 9H4.6L3 8z" fill="none" stroke={damesPieces.roi} strokeWidth="1.7" strokeLinejoin="round" strokeLinecap="round" />
          </svg>
        </>
      )}
    </div>
  )
}

export default function DamesView2D({ store, onSquareClick }) {
  const s = useSyncExternalStore(store.subscribe, store.getState)
  // animation positions (px) du pion qui se déplace — mesurées sur le DOM, FLIP-like.
  const boardRef = useRef(null)
  const animRef = useRef(null)          // élément du pion animé
  const [anim, setAnim] = useState(null) // { from:{x,y}, path:[{x,y}], side, king, cells:[r_c] }
  const prevLast = useRef(null)

  // ── animation du dernier coup (déplacement + rafle), pilotée par s.last ──
  useLayoutEffect(() => {
    if (!s.view2D || !s.last || !boardRef.current) return
    const sig = JSON.stringify(s.last)
    if (prevLast.current === sig) return
    prevLast.current = sig
    if (reduced()) return
    const mv = s.last
    const grid = boardRef.current
    const cellOf = (r, c) => {
      const el = grid.querySelector(`[data-cell="${r}_${c}"]`)
      if (!el) return null
      const gr = grid.getBoundingClientRect(), cr = el.getBoundingClientRect()
      return { x: cr.left - gr.left + cr.width / 2, y: cr.top - gr.top + cr.height / 2, w: cr.width }
    }
    const fromPt = cellOf(mv.from[0], mv.from[1])
    const path = (mv.path || [mv.to]).map(([r, c]) => cellOf(r, c)).filter(Boolean)
    const dest = path[path.length - 1]
    if (!fromPt || !dest) return
    const destCell = (mv.path || [mv.to])[ (mv.path || [mv.to]).length - 1 ]
    const piece = s.board?.[destCell[0]]?.[destCell[1]]
    setAnim({ from: fromPt, path, side: piece?.side || (s.last.side), king: piece?.king, w: fromPt.w,
      capCells: new Set((mv.caps || []).map(([r, c]) => r + '_' + c)) })
  }, [s.last, s.view2D, s.board])

  // joue l'animation WAAPI une fois `anim` posé, puis nettoie.
  useLayoutEffect(() => {
    if (!anim || !animRef.current) return
    const el = animRef.current
    const segs = [anim.from, ...anim.path]
    const isCap = anim.path.length > 1 || anim.capCells.size > 0
    const frames = []
    segs.forEach((p, i) => {
      const offset = i / (segs.length - 1)
      const lift = (isCap && i > 0 && i < segs.length - 1) ? -anim.w * 0.18 : 0
      frames.push({ transform: `translate(${p.x - anim.from.x}px, ${p.y - anim.from.y + lift}px)`, offset })
    })
    const dur = isCap ? 230 * Math.max(1, anim.path.length) : 220
    const a = el.animate(frames.length > 1 ? frames : [{ transform: 'translate(0,0)' }, { transform: 'translate(0,0)' }],
      { duration: dur, easing: 'cubic-bezier(.4,.05,.2,1)', fill: 'forwards' })
    let cancelled = false
    a.finished.then(() => { if (!cancelled) setAnim(null) }).catch(() => {})
    return () => { cancelled = true; try { a.cancel() } catch { /* */ } }
  }, [anim])

  if (!s.view2D || !s.board) return null

  const board = s.board
  const SIZE = board.length
  const theme = damesBoard[s.boardTheme] || damesBoard[DAMES_BOARD_DEFAUT]
  const selKey = s.selected ? s.selected[0] + '_' + s.selected[1] : null
  const own = s.selected ? (s.legalMoves || []).filter(mv => mv.from[0] === s.selected[0] && mv.from[1] === s.selected[1]) : []
  const targetKind = {}
  for (const mv of own) targetKind[mv.to[0] + '_' + mv.to[1]] = mv.isCapture ? 'cap' : 'move'
  const raids = own.filter(mv => mv.isCapture && mv.path && mv.path.length >= 2)
  const hopKeys = new Set()
  if (raids.length === 1) raids[0].path.slice(0, -1).forEach(([r, c]) => hopKeys.add(r + '_' + c))
  const lastKeys = new Set()
  if (s.last) { lastKeys.add(s.last.from[0] + '_' + s.last.from[1]); (s.last.path || [s.last.to]).forEach(([r, c]) => lastKeys.add(r + '_' + c)) }
  const lastDest = s.last ? (s.last.path || [s.last.to]).slice(-1)[0] : null
  const lastDestKey = lastDest ? lastDest[0] + '_' + lastDest[1] : null
  const hintKeys = new Set()
  if (s.hint) { hintKeys.add(s.hint.from[0] + '_' + s.hint.from[1]); hintKeys.add(s.hint.to[0] + '_' + s.hint.to[1]) }
  const hasCaptures = (s.legalMoves || []).some(mv => mv.isCapture)
  const interactive = s.interactive && !s.gameOver
  const movable = s.movableKeys || new Set()
  const coordsOn = s.coordonnees !== false
  const cursorKey = s.cursor ? s.cursor[0] + '_' + s.cursor[1] : null
  // pendant l'animation du dernier coup, on masque la pièce posée sur la case d'arrivée
  // (le clone animé la remplace) pour éviter le "double".
  const animDestKey = anim && lastDestKey

  return (
    <div role="grid" aria-label="Plateau de dames internationales"
      style={{
        position: 'absolute', inset: 0, zIndex: 7, display: 'grid', placeItems: 'center',
        pointerEvents: 'auto', padding: 'clamp(8px,2vmin,22px)',
        background: `radial-gradient(120% 90% at 50% 14%, ${ui.bgElev} 0%, ${ui.bg} 62%, #08090c 100%)`,
      }}>
      <div ref={boardRef} style={{
        position: 'relative', width: 'min(92vmin, 660px)', aspectRatio: '1',
        display: 'grid', gridTemplateColumns: `repeat(${SIZE}, 1fr)`, gridTemplateRows: `repeat(${SIZE}, 1fr)`,
        borderRadius: 8, overflow: 'hidden',
        // cadre bois/pierre sobre + liseré accent discret
        boxShadow: [
          `0 0 0 1px ${theme.sombre}`,
          `0 0 0 11px ${theme.sombre}`,
          `0 0 0 12px ${ui.line}`,
          `0 0 0 13px rgba(200,164,92,.20)`,
          ui.shadow,
        ].join(', '),
      }}>
        {board.flatMap((row, r) => row.map((cell, c) => {
          const key = r + '_' + c
          const dark = isDark(r, c)
          const isMovablePiece = interactive && movable.has(key)
          const mandatory = hasCaptures && cell && isMovablePiece
          const kind = targetKind[key]
          const isHop = hopKeys.has(key)
          const isLast = lastKeys.has(key)
          const isHint = hintKeys.has(key)
          const isSel = key === selKey
          const isCursor = key === cursorKey
          const clickable = interactive && (isMovablePiece || kind)
          const hideForAnim = key === animDestKey
          return (
            <div key={key} role="gridcell" data-cell={key}
              aria-label={dark ? `Case ${Math.floor((r * SIZE + c) / 2) + 1}${cell ? `, pion ${cell.side === P ? 'foncé' : 'clair'}${cell.king ? ' dame' : ''}` : ''}` : undefined}
              onClick={() => { if (interactive) onSquareClick?.(r, c) }}
              style={{
                position: 'relative', display: 'grid', placeItems: 'center',
                background: dark ? theme.sombre : theme.clair,
                cursor: clickable ? 'pointer' : 'default',
                // subtil grain de surface (lumière douce en haut-gauche)
                boxShadow: dark
                  ? 'inset 0 1px 0 rgba(255,255,255,.04), inset 0 -2px 6px rgba(0,0,0,.22)'
                  : 'inset 0 1px 0 rgba(255,255,255,.30), inset 0 -2px 6px rgba(0,0,0,.07)',
              }}>
              {/* dernier coup : voile accent sur from + trajet */}
              {isLast && <div aria-hidden style={{ position: 'absolute', inset: 0, background: marks.dernier, pointerEvents: 'none' }} />}
              {/* sélection : cadre accent net */}
              {isSel && <div aria-hidden style={{ position: 'absolute', inset: 0, boxShadow: `inset 0 0 0 3px ${ui.accent}`, background: marks.selection, pointerEvents: 'none' }} />}
              {/* curseur clavier (a11y) */}
              {isCursor && !isSel && <div aria-hidden style={{ position: 'absolute', inset: 0, boxShadow: `inset 0 0 0 2px ${ui.accentHi}`, pointerEvents: 'none' }} />}
              {/* indice : cadre info doux */}
              {isHint && <div aria-hidden style={{ position: 'absolute', inset: 2, borderRadius: 5, boxShadow: `inset 0 0 0 2px ${ui.info}`, pointerEvents: 'none' }} />}
              {/* cible de coup simple : pastille centrale */}
              {kind === 'move' && !cell && <div aria-hidden style={{ width: '30%', height: '30%', borderRadius: '50%', background: 'rgba(200,164,92,.55)', boxShadow: `0 0 0 2px rgba(200,164,92,.22)`, pointerEvents: 'none' }} />}
              {/* cible de capture : anneau rouge */}
              {kind === 'cap' && <div aria-hidden style={{ position: 'absolute', inset: '15%', borderRadius: '50%', boxShadow: `inset 0 0 0 3px ${marks.capture}`, pointerEvents: 'none' }} />}
              {/* case intermédiaire de rafle */}
              {isHop && <div aria-hidden style={{ width: '16%', height: '16%', borderRadius: '50%', background: marks.capture, opacity: .85, pointerEvents: 'none' }} />}
              {/* coordonnée (numérotation internationale, case jouable) */}
              {coordsOn && dark && (
                <span aria-hidden style={{ position: 'absolute', top: 2, left: 4, fontSize: 'clamp(7px,1.05vmin,11px)', fontWeight: 700, color: 'rgba(236,238,242,.34)', pointerEvents: 'none', fontFamily: fonts.mono }}>
                  {Math.floor((r * SIZE + c) / 2) + 1}
                </span>
              )}
              {/* pièce */}
              {cell && !hideForAnim && (
                <div style={{ width: '88%', height: '88%', display: 'grid', placeItems: 'center', position: 'relative' }}>
                  {mandatory && <span aria-hidden style={{ position: 'absolute', inset: '4%', borderRadius: '50%', boxShadow: `0 0 0 2.5px ${marks.capture}`, animation: 'dames2dPulse 1.15s ease-in-out infinite', pointerEvents: 'none' }} />}
                  <Disc side={cell.side} king={cell.king} scale={isSel ? 1.05 : 1} />
                </div>
              )}
            </div>
          )
        }))}

        {/* pion animé (clone) superposé pendant le déplacement / la rafle */}
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
      </div>

      {/* bandeau prise obligatoire (neutre) */}
      {hasCaptures && interactive && (
        <div role="status" style={{
          position: 'absolute', top: 'clamp(6px,2vmin,18px)', left: '50%', transform: 'translateX(-50%)',
          padding: '6px 16px', borderRadius: ui.radius.pill,
          background: ui.surface, border: `1px solid ${ui.lineHi}`, color: ui.text,
          fontFamily: fonts.body, fontWeight: 700, fontSize: 12.5, letterSpacing: '.3px',
          boxShadow: ui.shadow, pointerEvents: 'none', display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span aria-hidden style={{ width: 7, height: 7, borderRadius: '50%', background: ui.bad, boxShadow: `0 0 8px ${ui.bad}` }} />
          Prise obligatoire — rafle maximale
        </div>
      )}

      <style>{`@keyframes dames2dPulse{0%,100%{opacity:1}50%{opacity:.3}}`}</style>
    </div>
  )
}
