// ─────────────────────────────────────────────────────────────────────────────
// EchecsAnalyse — panneau d'analyse post-partie (pendant de DamesAnalyse).
// Reçoit la partie terminée (PGN + historique verbeux) et :
//   • reconstruit les positions (replay chess.js) puis lance analyserPartieEchecs()
//     en streaming sur un moteur Stockfish pleine force (useStockfish),
//   • trace un graphe d'éval cliquable (Blancs en haut / Noirs en bas),
//   • liste les coups (SAN) avec leur classification (Brillant ✨ … Gaffe ?? rouge),
//   • affiche le plateau (react-chessboard) du ply sélectionné + flèche OR du
//     meilleur coup,
//   • en-tête précision par camp + compteur gaffes/erreurs + tournants,
//   • contrôles ⏮ ◀ ▶ ⏭ + flèches clavier (← → Home End Esc).
//
// Styles inline only. framer-motion pour les micro-anims. Aucun warning console.
//
//   props :
//     pgn         : string                 (optionnel — pour rechargement éventuel)
//     historique  : verboseMoves[]          chess.js history({verbose:true})
//     resultat    : 'blanc' | 'noir' | 'nulle' | null
//     orientation : 'white' | 'black'      orientation du plateau de replay
//     onClose     : () => void             (optionnel — bouton retour + Esc)
//     depth       : number (défaut 14)     profondeur Stockfish par position
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Chess } from 'chess.js'
import { Chessboard } from 'react-chessboard'
import { type, fonts } from '../../styles/typography.js'
import { THEME, THEMES_PLATEAU, THEME_PLATEAU_DEFAUT } from './constants.js'
import { useStockfish } from './hooks/useStockfish.js'
import {
  analyserPartieEchecs, CLASSES, ANALYSE_DEPTH, ratioDepuisCpBlanc,
} from './lib/analysePartie.js'

// ── Tokens NEUTRES PREMIUM (charcoal + un accent or, mono pour chiffres) ──
const INK = THEME.bg, PANEL = THEME.surface, GOLD = THEME.goldHi, GOLD_DIM = THEME.gold
const PARCH = THEME.text, BLANC = '#e0c074', NOIR = '#6fa8d6', LINE = THEME.cardBorder
const PIRATA = THEME.fontDisplay

// Niveau « pleine force » pour le moteur d'analyse (skillLevel max, pas de bridage).
const NIVEAU_ANALYSE = { limitStrength: false, skillLevel: 20, movetimeMs: 600 }

// Reconstruit les positions à analyser depuis l'historique verbeux : pour chaque
// ply on capture le FEN AVANT le coup, le FEN APRÈS, le move verbeux et le trait.
function construirePositions(historique) {
  const positions = []
  if (!historique || !historique.length) return positions
  const c = new Chess()   // position de départ standard
  for (const mv of historique) {
    const fenBefore = c.fen()
    const trait = mv.color   // 'w' | 'b'
    let joue = null
    try { joue = c.move({ from: mv.from, to: mv.to, promotion: mv.promotion }) } catch { joue = null }
    if (!joue) break        // historique incohérent → on s'arrête proprement
    positions.push({ fenBefore, fenAfter: c.fen(), move: joue, trait })
  }
  return positions
}

// ── Graphe d'éval — area chart inline-SVG, Blancs positif vers le haut ──
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
  const area = `M0,${H / 2} ` + pts.map((p) => `L${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ') + ` L${W},${H / 2} Z`
  const curX = pts[Math.min(current, pts.length - 1)]?.x ?? 0

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
          <linearGradient id="echEvalArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={BLANC} stopOpacity="0.55" />
            <stop offset="50%" stopColor={BLANC} stopOpacity="0.05" />
            <stop offset="50%" stopColor={NOIR} stopOpacity="0.05" />
            <stop offset="100%" stopColor={NOIR} stopOpacity="0.55" />
          </linearGradient>
        </defs>
        <line x1="0" y1={H / 2} x2={W} y2={H / 2} stroke={GOLD_DIM} strokeWidth="0.4" opacity="0.4" />
        <path d={area} fill="url(#echEvalArea)" />
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
          {Math.floor(hover / 2) + 1}. {records[hover].trait === 'w' ? '♙' : '♟'} {records[hover].san}
          {'  '}<span style={{ color: records[hover].classe.color }}>{(records[hover].evalApres / 100).toFixed(1)}</span>
        </div>
      )}
    </div>
  )
}

// ── Eval bar verticale (Blancs en bas, Noirs en haut, façon lichess) ──
function EvalBar({ cpBlanc, hauteur = 'min(56vh, 480px)' }) {
  const ratio = cpBlanc == null ? 0.5 : ratioDepuisCpBlanc(cpBlanc)   // 0..1 d'avantage blanc
  const pctBlanc = Math.round(ratio * 100)
  const v = cpBlanc == null ? 0 : cpBlanc / 100
  const texte = cpBlanc == null ? '' : `${v > 0 ? '+' : ''}${v.toFixed(Math.abs(v) >= 10 ? 0 : 1)}`
  return (
    <div aria-label="Évaluation" style={{ width: 26, height: hauteur, borderRadius: 8, overflow: 'hidden',
      position: 'relative', background: '#11151c', border: `1px solid ${LINE}`, boxShadow: 'inset 0 0 0 1px rgba(0,0,0,.4)' }}>
      <motion.div animate={{ height: `${pctBlanc}%` }} transition={{ ease: 'easeOut', duration: 0.3 }}
        style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(180deg,#f3ead2,#d8c79c)' }} />
      <div style={{ position: 'absolute', bottom: 4, left: 0, right: 0, textAlign: 'center', fontSize: 9,
        fontWeight: 800, color: '#1a1304', fontVariantNumeric: 'tabular-nums', pointerEvents: 'none' }}>
        {pctBlanc > 14 ? texte : ''}
      </div>
      <div style={{ position: 'absolute', top: 4, left: 0, right: 0, textAlign: 'center', fontSize: 9,
        fontWeight: 800, color: PARCH, fontVariantNumeric: 'tabular-nums', pointerEvents: 'none' }}>
        {pctBlanc <= 14 ? texte : ''}
      </div>
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
export default function EchecsAnalyse({ pgn = null, historique = [], resultat = null, orientation = 'white', onClose, depth = ANALYSE_DEPTH }) {
  const { pret, analyser } = useStockfish(NIVEAU_ANALYSE)

  // Positions reconstruites une seule fois depuis l'historique.
  const positions = useMemo(() => construirePositions(historique), [historique])
  const total = positions.length

  const [records, setRecords] = useState([])
  const [done, setDone] = useState(false)
  const [resume, setResume] = useState(null)
  const [cur, setCur] = useState(0)   // ply sélectionné (0..total) ; total = position finale

  // ── lance l'analyse en streaming dès que le moteur est prêt, annulable ──
  useEffect(() => {
    if (!pret) return
    if (!total) { setDone(true); return }
    const ctrl = new AbortController()
    setRecords([]); setDone(false); setResume(null)
    let alive = true
    const acc = []
    analyserPartieEchecs(positions, {
      analyser, depth, signal: ctrl.signal,
      onProgress: (rec) => { if (!alive) return; acc.push(rec); setRecords(acc.slice()) },
    }).then(({ resume }) => { if (alive) { setResume(resume); setDone(true) } })
      .catch(() => {})
    return () => { alive = false; ctrl.abort() }
  }, [pret, positions, total, analyser, depth])

  // ── plateau affiché : FEN du ply courant ──
  // cur < total : on montre la position AVANT le coup `cur` (fenBefore), avec la
  //   flèche du meilleur coup du moteur dans cette position.
  // cur >= total : position finale (fenAfter du dernier coup), sans flèche.
  const view = useMemo(() => {
    if (!total) return { fen: new Chess().fen(), arrows: [] }
    if (cur >= total) {
      const last = positions[total - 1]
      return { fen: last.fenAfter, arrows: [] }
    }
    const pos = positions[cur]
    const rec = records[cur]
    const arrows = rec?.bestCoup
      ? [{ startSquare: rec.bestCoup.from, endSquare: rec.bestCoup.to, color: GOLD }]
      : []
    return { fen: pos.fenBefore, arrows }
  }, [cur, positions, records, total])

  // éval pour la barre : avant le coup courant, ou finale.
  const cpBar = useMemo(() => {
    if (!total) return null
    if (cur >= total) { const r = records[total - 1]; return r ? r.evalApres : null }
    const r = records[cur]
    return r ? r.evalAvant : null
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
  useEffect(() => {
    const el = moveListRef.current?.querySelector(`[data-ply="${cur}"]`)
    el?.scrollIntoView({ block: 'nearest' })
  }, [cur])

  const pct = total ? Math.round((records.length / total) * 100) : 100

  const titre = resultat === 'nulle' ? 'Partie nulle — analyse'
    : resultat === 'blanc' ? 'Victoire des Blancs — analyse'
    : resultat === 'noir' ? 'Victoire des Noirs — analyse'
    : 'Analyse de la partie'

  // Options react-chessboard (lecture seule, flèche du meilleur coup).
  const tema = THEMES_PLATEAU[THEME_PLATEAU_DEFAUT]
  const boardOptions = useMemo(() => ({
    id: 'plateau-analyse',
    position: view.fen,
    boardOrientation: orientation,
    arrows: view.arrows,
    allowDragging: false,
    allowDrawingArrows: false,
    showNotation: true,
    darkSquareStyle: { backgroundColor: tema.foncee },
    lightSquareStyle: { backgroundColor: tema.claire },
    lightSquareNotationStyle: { fontSize: 11, fontFamily: THEME.fontBody, fontWeight: 700, color: tema.notationClaire },
    darkSquareNotationStyle: { fontSize: 11, fontFamily: THEME.fontBody, fontWeight: 700, color: tema.notationFoncee },
    boardStyle: { borderRadius: 12, overflow: 'hidden', boxShadow: '0 30px 70px -28px rgba(0,0,0,.85), 0 0 0 1px rgba(255,255,255,.05)' },
  }), [view.fen, view.arrows, orientation, tema])

  return (
    <div style={{ minHeight: '100%', background: `radial-gradient(120% 90% at 50% 0%, ${THEME.bgElev} 0%, ${INK} 60%)`, color: PARCH, padding: 'clamp(12px,2.5vw,28px)' }}>
      <div style={{ maxWidth: 1180, margin: '0 auto' }}>

        {/* en-tête */}
        <header style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 16 }}>
          <div>
            <div style={{ ...type.eyebrow, color: GOLD_DIM, marginBottom: 6 }}>Analyse moteur</div>
            <h1 style={{ fontFamily: PIRATA, fontSize: 'clamp(1.6rem,4vw,2.4rem)', margin: 0, color: PARCH, letterSpacing: '.5px' }}>{titre}</h1>
          </div>
          {onClose && (
            <button onClick={onClose} style={{ appearance: 'none', cursor: 'pointer', ...type.button, padding: '9px 18px',
              borderRadius: 999, color: PARCH, background: 'transparent', border: `1px solid ${GOLD_DIM}66` }}>← Retour</button>
          )}
        </header>

        {/* précision par camp */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 12, marginBottom: 18 }}>
          {[['w', 'Blancs', '♙', BLANC], ['b', 'Noirs', '♟', NOIR]].map(([s, name, emo, col]) => {
            const a = resume?.[s]
            return (
              <div key={s} style={{ background: PANEL, border: `1px solid ${LINE}`, borderRadius: 12, padding: '12px 16px' }}>
                <div style={{ ...type.eyebrow, color: col, marginBottom: 6 }}>{emo} {name}</div>
                <div style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: 30, lineHeight: 1 }}>
                  {a ? <PrecCount value={a.precision} color={col} /> : <span style={{ color: '#6b6f78' }}>—</span>}
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
            <div style={{ ...type.small, color: GOLD_DIM, marginBottom: 6 }}>
              {pret ? `Analyse en cours… ${records.length}/${total} (${pct}%)` : 'Démarrage du moteur…'}
            </div>
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
            <EvalBar cpBlanc={cpBar} hauteur="min(56vh, 480px)" />
          </div>

          {/* plateau + graphe + contrôles */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>
            <div style={{ width: '100%', maxWidth: 480, margin: '0 auto' }}>
              <Chessboard options={boardOptions} />
            </div>

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
                const showNum = r.trait === 'w'
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
                    <span aria-hidden style={{ fontSize: 14 }}>{r.trait === 'w' ? '♙' : '♟'}</span>
                    <span style={{ ...type.small, fontFamily: fonts.body, fontWeight: 600, flex: 1, fontVariantNumeric: 'tabular-nums' }}>
                      {r.san}
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
              {!records.length && done && (
                <div style={{ ...type.small, color: '#7f858f', padding: 14, textAlign: 'center' }}>aucun coup à analyser</div>
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
                  <span>{t.trait === 'w' ? '♙' : '♟'}</span>
                  <span style={{ fontWeight: 700 }}>{Math.floor(t.ply / 2) + 1}. {t.san}</span>
                  <span style={{ color: t.delta < 0 ? NOIR : BLANC }}>{t.delta > 0 ? '+' : ''}{(t.delta / 100).toFixed(1)}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
