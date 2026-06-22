// ─────────────────────────────────────────────────────────────────────────────
// DamesAnalyse — panneau d'analyse post-partie (pendant de l'analyse d'échecs).
// Reçoit la partie terminée (suite de positions + résultat) et :
//   • lance analyserPartie() en streaming (async generator) → peint au fil de l'eau,
//   • trace un graphe d'éval cliquable (Pirates en haut / Marine en bas),
//   • liste les coups avec leur classification (Brillant ✨ … Gaffe ?? rouge),
//   • affiche le plateau du ply sélectionné + flèche du « meilleur coup »,
//   • en-tête précision par camp + compteur gaffes/erreurs + tournants,
//   • contrôles ⏮ ◀ ▶ ⏭ + flèches clavier.
//
// Styles inline only. framer-motion pour les micro-anims. Aucun warning console.
//
//   props :
//     positions : [{ board, side, mv }]   position AVANT chaque coup (cf. analyse.js)
//     result    : 'P' | 'M' | 'draw' | null
//     finalBoard: board final (optionnel — sinon dérivé du dernier ply)
//     rules     : règles moteur (optionnel, threadé tel quel)
//     onClose   : () => void   (optionnel — bouton retour)
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { type } from '../../styles/typography.js'
import { P, M, applyMove } from './engine/draughts-engine.js'
import { moveToNotation } from './engine/notation.js'
import { analyserPartie, CLASSES, precisionDepuisACPL } from './lib/analyse.js'
import DamesEvalBar from './DamesEvalBar.jsx'
import { ui, fonts, damesBoard, damesPieces } from '../games/neutralTheme.js'

// ── Tokens NEUTRES (source unique). P = Foncé (graphite), M = Clair (ivoire). ──
const INK = ui.bg, PANEL = ui.surface, GOLD = ui.accent, GOLD_DIM = ui.accentHi
const PARCH = ui.text, FONC = damesPieces.fonce.base, CLAIR = damesPieces.clair.bord, LINE = ui.line
const DISP = fonts.display
const SIDE_COL = { [P]: FONC, [M]: CLAIR }, SIDE_LBL = { [P]: 'Foncé', [M]: 'Clair' }
const BOARD = damesBoard.bois
const SIZE = 10
const isDark = (r, c) => (r + c) % 2 === 1

// ─────────────────────────────────────────────────────────────────────────────
// Mini-plateau autonome (inline-SVG/div) — DamesView2D dépend d'un store externe,
// donc on rend un 10×10 simple ici, avec dernier coup + flèche meilleur coup.
// ─────────────────────────────────────────────────────────────────────────────
function pieceFill(side) {
  const c = side === P ? damesPieces.fonce : damesPieces.clair
  return `radial-gradient(circle at 38% 30%, ${c.haut} 0%, ${c.base} 58%, ${c.bord} 100%)`
}

function MiniBoard({ board, lastMv, bestMv }) {
  // cases du dernier coup (trajet) + du meilleur coup (flèche from→to)
  const lastKeys = useMemo(() => {
    const s = new Set()
    if (lastMv) { s.add(lastMv.from[0] + '_' + lastMv.from[1]); (lastMv.path || [lastMv.to]).forEach(([r, c]) => s.add(r + '_' + c)) }
    return s
  }, [lastMv])

  // centre d'une case en % (pour la flèche SVG)
  const center = (r, c) => ({ x: (c + 0.5) * 10, y: (r + 0.5) * 10 })
  const arrow = bestMv ? { a: center(bestMv.from[0], bestMv.from[1]), b: center(bestMv.to[0], bestMv.to[1]) } : null

  return (
    <div style={{ position: 'relative', width: '100%', aspectRatio: '1', borderRadius: 8, overflow: 'hidden',
      boxShadow: `0 0 0 1px ${BOARD.sombre}, 0 0 0 8px ${BOARD.sombre}, 0 0 0 9px rgba(200,164,92,.18), 0 18px 50px rgba(0,0,0,.55)` }}>
      <div style={{ position: 'absolute', inset: 0, display: 'grid',
        gridTemplateColumns: `repeat(${SIZE},1fr)`, gridTemplateRows: `repeat(${SIZE},1fr)` }}>
        {board.flatMap((row, r) => row.map((cell, c) => {
          const key = r + '_' + c
          const dark = isDark(r, c)
          const isLast = lastKeys.has(key)
          return (
            <div key={key} style={{ position: 'relative', display: 'grid', placeItems: 'center',
              background: dark ? BOARD.sombre : BOARD.clair,
              boxShadow: isLast ? `inset 0 0 0 2px ${ui.accent}99` : 'none' }}>
              {isLast && <div aria-hidden style={{ position: 'absolute', inset: 0, background: 'rgba(200,164,92,.22)' }} />}
              {cell && (
                <div style={{ width: '76%', height: '76%', borderRadius: '50%', background: pieceFill(cell.side),
                  boxShadow: `inset 0 2px 3px rgba(255,255,255,.16), inset 0 -4px 7px rgba(0,0,0,.42), inset 0 0 0 2px ${(cell.side === P ? damesPieces.fonce : damesPieces.clair).bord}, 0 3px 6px rgba(0,0,0,.4)`,
                  display: 'grid', placeItems: 'center' }}>
                  {cell.king && <span aria-hidden style={{ position: 'absolute', inset: '8%', borderRadius: '50%', boxShadow: `inset 0 0 0 2px ${damesPieces.roi}` }} />}
                </div>
              )}
            </div>
          )
        }))}
      </div>
      {arrow && (
        <svg aria-hidden viewBox="0 0 100 100" preserveAspectRatio="none"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
          <defs>
            <marker id="dmsBest" markerWidth="5" markerHeight="5" refX="2.6" refY="2.5" orient="auto">
              <path d="M0,0 L5,2.5 L0,5 Z" fill={GOLD} />
            </marker>
          </defs>
          <line x1={arrow.a.x} y1={arrow.a.y} x2={arrow.b.x} y2={arrow.b.y}
            stroke={GOLD} strokeWidth="2.2" strokeLinecap="round" opacity="0.92"
            markerEnd="url(#dmsBest)" />
        </svg>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Graphe d'éval — area chart inline-SVG, Pirates positif vers le haut.
// `records[i].evalApres` (POV blanc, cp). Hover + clic → jump ply.
// ─────────────────────────────────────────────────────────────────────────────
const CAP = 600   // plafond d'affichage (cp) — au-delà c'est gagné/perdu
function EvalGraph({ records, current, onPick }) {
  const W = 100, H = 60
  const [hover, setHover] = useState(null)
  const n = records.length
  const pts = useMemo(() => records.map((r, i) => {
    const x = n <= 1 ? 0 : (i / (n - 1)) * W
    const v = Math.max(-CAP, Math.min(CAP, r.evalApres))
    const y = H / 2 - (v / CAP) * (H / 2)
    return { x, y, i }
  }), [records, n])

  if (!n) return null
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ')
  const area = `M0,${H / 2} ` + pts.map(p => `L${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ') + ` L${W},${H / 2} Z`
  const curX = pts[current]?.x ?? 0

  const handleMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const rel = (e.clientX - rect.left) / rect.width
    const idx = Math.max(0, Math.min(n - 1, Math.round(rel * (n - 1))))
    setHover(idx)
  }

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img"
        aria-label="Graphe d'évaluation de la partie"
        style={{ width: '100%', height: 90, display: 'block', cursor: 'crosshair', borderRadius: 8, background: '#05060a', border: `1px solid ${LINE}` }}
        onMouseMove={handleMove} onMouseLeave={() => setHover(null)}
        onClick={() => hover != null && onPick(hover)}>
        <defs>
          <linearGradient id="dmsArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={ui.accent} stopOpacity="0.5" />
            <stop offset="50%" stopColor={ui.accent} stopOpacity="0.04" />
            <stop offset="50%" stopColor={ui.textMute} stopOpacity="0.04" />
            <stop offset="100%" stopColor={ui.textMute} stopOpacity="0.5" />
          </linearGradient>
        </defs>
        <line x1="0" y1={H / 2} x2={W} y2={H / 2} stroke={GOLD_DIM} strokeWidth="0.4" opacity="0.4" />
        <path d={area} fill="url(#dmsArea)" />
        <path d={line} fill="none" stroke={GOLD} strokeWidth="0.8" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        <line x1={curX} y1="0" x2={curX} y2={H} stroke={PARCH} strokeWidth="0.5" opacity="0.85" vectorEffect="non-scaling-stroke" />
        {hover != null && pts[hover] && (
          <circle cx={pts[hover].x} cy={pts[hover].y} r="1.4" fill={PARCH} vectorEffect="non-scaling-stroke" />
        )}
      </svg>
      {hover != null && records[hover] && (
        <div style={{ position: 'absolute', top: -2, left: `${(hover / Math.max(1, n - 1)) * 100}%`,
          transform: 'translate(-50%,-100%)', pointerEvents: 'none', whiteSpace: 'nowrap',
          background: 'rgba(8,9,13,.94)', border: `1px solid ${LINE}`, borderRadius: 6, padding: '3px 7px',
          ...type.small, fontSize: 11, color: PARCH }}>
          {Math.floor(hover / 2) + 1}. <span style={{ color: SIDE_COL[records[hover].side], fontWeight: 700 }}>{SIDE_LBL[records[hover].side]}</span> {moveToNotation(records[hover].mv)}
          {'  '}<span style={{ color: records[hover].classe.color }}>{(records[hover].evalApres / 100).toFixed(1)}</span>
        </div>
      )}
    </div>
  )
}

// ── compteur animé (précision) ──
function PrecCount({ value, color }) {
  const [shown, setShown] = useState(0)
  useEffect(() => {
    let raf; const t0 = performance.now()
    const tick = (now) => { const t = Math.min(1, (now - t0) / 700); setShown(value * (1 - Math.pow(1 - t, 3))); if (t < 1) raf = requestAnimationFrame(tick) }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value])
  return <span style={{ color, fontVariantNumeric: 'tabular-nums' }}>{shown.toFixed(1)}%</span>
}

// ─────────────────────────────────────────────────────────────────────────────
export default function DamesAnalyse({ positions = [], result = null, finalBoard = null, rules, onClose }) {
  const [records, setRecords] = useState([])
  const [done, setDone] = useState(false)
  const [resume, setResume] = useState(null)
  const [cur, setCur] = useState(0)   // ply sélectionné (index dans positions)

  // ── lance l'analyse en streaming, annulable au démontage ──
  useEffect(() => {
    if (!positions.length) { setDone(true); return }
    const ctrl = new AbortController()
    setRecords([]); setDone(false); setResume(null)
    let alive = true
    const acc = []
    analyserPartie(positions, {
      rules, signal: ctrl.signal,
      onProgress: (rec) => { if (!alive) return; acc.push(rec); setRecords(acc.slice()) },
    }).then(({ resume }) => { if (alive) { setResume(resume); setDone(true) } })
      .catch(() => {})
    return () => { alive = false; ctrl.abort() }
  }, [positions, rules])

  const total = positions.length
  // plateau affiché : position du ply courant (= board AVANT le coup `cur`),
  // ou plateau final si on est "après le dernier coup".
  const view = useMemo(() => {
    if (!total) return null
    if (cur >= total) {
      const last = positions[total - 1]
      return { board: finalBoard || applyMove(last.board, last.mv).board, lastMv: last.mv, best: null }
    }
    const rec = records[cur]
    const lastMv = cur > 0 ? positions[cur - 1].mv : null
    return { board: positions[cur].board, lastMv, best: rec?.best || null }
  }, [cur, positions, records, total, finalBoard])

  const evForBar = useMemo(() => {
    if (!total) return null
    if (cur >= total) { const r = records[total - 1]; return r ? { score: r.evalApres } : null }
    const r = records[cur]
    return r ? { score: r.evalAvant } : null
  }, [cur, records, total])

  // ── navigation ──
  const go = useCallback((i) => setCur(Math.max(0, Math.min(total, i))), [total])
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(cur - 1) }
      else if (e.key === 'ArrowRight') { e.preventDefault(); go(cur + 1) }
      else if (e.key === 'Home') { e.preventDefault(); go(0) }
      else if (e.key === 'End') { e.preventDefault(); go(total) }
      else if (e.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [cur, go, total, onClose])

  const moveListRef = useRef(null)
  // garde le coup courant visible dans la liste
  useEffect(() => {
    const el = moveListRef.current?.querySelector(`[data-ply="${cur}"]`)
    el?.scrollIntoView({ block: 'nearest' })
  }, [cur])

  const pct = total ? Math.round((records.length / total) * 100) : 100

  const titre = result === 'draw' ? 'Partie nulle — analyse' : result === P ? 'Victoire Foncé — analyse'
    : result === M ? 'Victoire Clair — analyse' : 'Analyse de la partie'

  return (
    <div style={{ minHeight: '100%', background: `radial-gradient(120% 90% at 50% 0%, ${ui.bgElev} 0%, ${INK} 60%)`, color: PARCH, padding: 'clamp(12px,2.5vw,28px)' }}>
      <div style={{ maxWidth: 1180, margin: '0 auto' }}>

        {/* en-tête */}
        <header style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 16 }}>
          <div>
            <div style={{ ...type.eyebrow, color: GOLD, marginBottom: 6 }}>Analyse de partie</div>
            <h1 style={{ fontFamily: DISP, fontWeight: 800, fontSize: 'clamp(1.6rem,4vw,2.4rem)', margin: 0, color: PARCH, letterSpacing: '-.01em' }}>{titre}</h1>
          </div>
          {onClose && (
            <button onClick={onClose} style={{ appearance: 'none', cursor: 'pointer', ...type.button, padding: '9px 18px',
              borderRadius: 999, color: PARCH, background: 'transparent', border: `1px solid ${GOLD_DIM}66` }}>← Retour</button>
          )}
        </header>

        {/* précision par camp */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 12, marginBottom: 18 }}>
          {[[P, SIDE_LBL[P], FONC], [M, SIDE_LBL[M], CLAIR]].map(([s, name, col]) => {
            const a = resume?.[s]
            return (
              <div key={s} style={{ background: PANEL, border: `1px solid ${LINE}`, borderRadius: 12, padding: '12px 16px' }}>
                <div style={{ ...type.eyebrow, color: ui.textDim, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 7 }}><span aria-hidden style={{ width: 10, height: 10, borderRadius: '50%', background: col, border: `1px solid ${ui.lineHi}` }} />{name}</div>
                <div style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: 30, lineHeight: 1 }}>
                  {a ? <PrecCount value={a.precision} color={ui.text} /> : <span style={{ color: ui.textMute }}>—</span>}
                </div>
                <div style={{ ...type.small, color: '#9aa0aa', marginTop: 6, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  {a ? <>
                    <span>✨ {a.brillants}</span>
                    <span style={{ color: CLASSES.imprecision.color }}>?! {a.imprecisions}</span>
                    <span style={{ color: CLASSES.erreur.color }}>? {a.erreurs}</span>
                    <span style={{ color: CLASSES.gaffe.color }}>?? {a.gaffes}</span>
                  </> : <span>analyse…</span>}
                </div>
              </div>
            )
          })}
        </div>

        {/* barre de progression d'analyse */}
        {!done && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ ...type.small, color: GOLD_DIM, marginBottom: 6 }}>Analyse en cours… {pct}%</div>
            <div style={{ height: 5, borderRadius: 999, background: '#1a1c24', overflow: 'hidden' }}>
              <motion.div animate={{ width: `${pct}%` }} transition={{ ease: 'easeOut', duration: 0.3 }}
                style={{ height: '100%', background: `linear-gradient(90deg,${GOLD_DIM},${GOLD})` }} />
            </div>
          </div>
        )}

        {/* corps : eval bar | plateau | liste */}
        <div style={{ display: 'grid', gridTemplateColumns: 'auto minmax(280px,1fr) minmax(240px,340px)', gap: 18, alignItems: 'start' }}>

          {/* eval bar */}
          <div style={{ display: 'grid', placeItems: 'center' }}>
            <DamesEvalBar ev={evForBar} height="min(56vh, 480px)" />
          </div>

          {/* plateau + graphe + contrôles */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>
            {view && <MiniBoard board={view.board} lastMv={view.lastMv} bestMv={view.best} />}

            <EvalGraph records={records} current={Math.min(cur, Math.max(0, records.length - 1))} onPick={go} />

            {/* contrôles */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              {[['⏮', () => go(0), 'Début'], ['◀', () => go(cur - 1), 'Précédent'],
                ['▶', () => go(cur + 1), 'Suivant'], ['⏭', () => go(total), 'Fin']].map(([ic, fn, lab]) => (
                <button key={lab} onClick={fn} aria-label={lab} title={lab}
                  style={{ appearance: 'none', cursor: 'pointer', width: 44, height: 38, borderRadius: 9,
                    fontSize: 16, color: PARCH, background: '#15171f', border: `1px solid ${LINE}` }}>{ic}</button>
              ))}
              <div style={{ ...type.small, color: '#9aa0aa', marginLeft: 8, fontVariantNumeric: 'tabular-nums', minWidth: 64 }}>
                {Math.min(cur + 1, total)} / {total}
              </div>
            </div>
          </div>

          {/* liste des coups */}
          <div style={{ background: PANEL, border: `1px solid ${LINE}`, borderRadius: 12, overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: 'min(64vh, 560px)' }}>
            <div style={{ ...type.eyebrow, color: GOLD_DIM, padding: '11px 14px', borderBottom: `1px solid ${LINE}` }}>Coups</div>
            <div ref={moveListRef} role="list" aria-label="Liste des coups" style={{ overflowY: 'auto', padding: 6 }}>
              {records.map((r) => {
                const sel = r.ply === cur
                const num = Math.floor(r.ply / 2) + 1
                const showNum = r.side === P
                return (
                  <button key={r.ply} data-ply={r.ply} role="listitem"
                    onClick={() => go(r.ply)} aria-current={sel}
                    style={{ appearance: 'none', cursor: 'pointer', width: '100%', textAlign: 'left',
                      display: 'flex', alignItems: 'center', gap: 8, padding: '7px 9px', borderRadius: 7, border: 0,
                      background: sel ? 'rgba(217,184,112,.14)' : 'transparent',
                      boxShadow: sel ? `inset 0 0 0 1px ${LINE}` : 'none', color: PARCH, marginBottom: 1 }}>
                    <span style={{ ...type.small, width: 26, color: '#6b6f78', fontVariantNumeric: 'tabular-nums', textAlign: 'right' }}>
                      {showNum ? num + '.' : ''}
                    </span>
                    <span aria-hidden style={{ width: 10, height: 10, borderRadius: '50%', background: SIDE_COL[r.side], border: `1px solid ${ui.lineHi}`, flexShrink: 0 }} />
                    <span style={{ ...type.small, fontFamily: fonts.body, fontWeight: 600, flex: 1, fontVariantNumeric: 'tabular-nums' }}>
                      {moveToNotation(r.mv)}
                      {r.classe.symbole && <span style={{ color: r.classe.color, marginLeft: 3 }}>{r.classe.symbole}</span>}
                    </span>
                    <span title={r.classe.label} aria-label={r.classe.label}
                      style={{ fontSize: 12, color: r.classe.color, minWidth: 18, textAlign: 'center' }}>{r.classe.icon}</span>
                    <span style={{ ...type.small, fontSize: 11, color: '#7f858f', width: 40, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                      {(r.evalApres / 100).toFixed(1)}
                    </span>
                  </button>
                )
              })}
              {!records.length && !done && (
                <div style={{ ...type.small, color: '#7f858f', padding: 14, textAlign: 'center' }}>analyse en cours…</div>
              )}
            </div>
          </div>
        </div>

        {/* tournants clés */}
        {resume?.tournants?.length > 0 && (
          <div style={{ marginTop: 20, background: PANEL, border: `1px solid ${LINE}`, borderRadius: 12, padding: '14px 16px' }}>
            <div style={{ ...type.eyebrow, color: GOLD_DIM, marginBottom: 10 }}>Tournants de la partie</div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {resume.tournants.map((t) => (
                <button key={t.ply} onClick={() => go(t.ply)}
                  style={{ appearance: 'none', cursor: 'pointer', ...type.small, padding: '7px 12px', borderRadius: 9,
                    color: PARCH, background: 'rgba(217,89,77,.1)', border: `1px solid ${CLASSES.gaffe.color}44`,
                    display: 'flex', alignItems: 'center', gap: 7 }}>
                  <span aria-hidden style={{ width: 10, height: 10, borderRadius: '50%', background: SIDE_COL[t.side], border: `1px solid ${ui.lineHi}`, flexShrink: 0 }} />
                  <span style={{ fontWeight: 700 }}>{Math.floor(t.ply / 2) + 1}. {moveToNotation(t.mv)}</span>
                  <span style={{ color: t.delta < 0 ? ui.bad : ui.good }}>{t.delta > 0 ? '+' : ''}{(t.delta / 100).toFixed(1)}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
