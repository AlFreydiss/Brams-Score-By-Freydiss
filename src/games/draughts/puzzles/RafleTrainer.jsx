// ─────────────────────────────────────────────────────────────────────────────
// RafleTrainer — entraîneur « Trouve la rafle maximale » (section Tactiques de
// l'onglet Apprendre des Dames). Même colonne vertébrale que le didacticiel :
// boucle locale sélection → coup via generateMoves/applyMove (moteur en LECTURE
// SEULE), DraughtsBoard piloté par props, tokens ui/glass, accent en prop.
//
// Deux jeux de règles, volontairement distincts :
//  - VALIDATION (DEFAULT_RULES, rafle maximale imposée) : chaque puzzle est
//    auto-validé au chargement — le moteur doit renvoyer EXACTEMENT UN coup,
//    une capture de `prisesAttendues` pièces. Puzzle hors contrat = écarté.
//  - JEU (PLAY_RULES = priseMaximale désactivée, prise obligatoire conservée) :
//    les rafles courtes restent jouables → le joueur peut se tromper, sinon le
//    moteur ne proposerait que la bonne réponse et le ✗ n'existerait pas.
// Succès = jouer UN coup qui capture `prisesAttendues` pièces.
// Styles inline only. focus-visible, prefers-reduced-motion. Progression en
// localStorage (ids réussis). Zéro écriture dans le moteur / l'online.
// ─────────────────────────────────────────────────────────────────────────────
import { useCallback, useMemo, useRef, useState } from 'react'
import { ui, fonts } from '../../../features/games/neutralTheme.js'
import { glass } from '../../_shell/arena/arenaTokens.js'
import {
  generateMoves, applyMove, DEFAULT_RULES,
} from '../../../features/dames/engine/draughts-engine.js'
import DraughtsBoard from '../board/DraughtsBoard.jsx'
import { makeBoard } from '../logic/tutorialPositions.js'
import { RAFLES } from './puzzles.js'

const STEEL = '#6f8fb0'
const reduced = () => { try { return window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches } catch { return false } }

// Règles de JEU : prise obligatoire mais SANS rafle maximale imposée (voir header).
const PLAY_RULES = Object.freeze({ ...DEFAULT_RULES, priseMaximale: false })

// ── Auto-validation au chargement (contrat documenté dans puzzles.js) ────────
function isValidPuzzle(p) {
  try {
    const moves = generateMoves(makeBoard(p.pieces), 'P', DEFAULT_RULES)
    return moves.length === 1 && !!moves[0].isCapture &&
      moves[0].caps.length === p.prisesAttendues && p.prisesAttendues >= 2
  } catch { return false }
}
const PUZZLES = RAFLES.filter(isValidPuzzle)
const DIFFS = [1, 2, 3]
const DIFF_LABEL = { 1: 'Facile', 2: 'Moyen', 3: 'Difficile' }
const BY_DIFF = { 1: [], 2: [], 3: [] }
for (const p of PUZZLES) (BY_DIFF[p.difficulte] || (BY_DIFF[p.difficulte] = [])).push(p)

// ── Progression persistée (ids des puzzles réussis) ──────────────────────────
const LS_KEY = 'dames_rafle_trainer_v1'
function loadSolved() {
  try {
    const a = JSON.parse(localStorage.getItem(LS_KEY) || '[]')
    return new Set(Array.isArray(a) ? a : [])
  } catch { return new Set() }
}
function persistSolved(set) {
  try { localStorage.setItem(LS_KEY, JSON.stringify([...set])) } catch { /* stockage indisponible : progression de session seulement */ }
}

// ── Composant ─────────────────────────────────────────────────────────────────
export default function RafleTrainer({ accent = STEEL }) {
  const acc = accent || STEEL
  const noMotion = reduced()

  const [solvedIds, setSolvedIds] = useState(loadSolved)
  const [diff, setDiff] = useState(() => DIFFS.find(d => BY_DIFF[d].length) || 1)
  const [idx, setIdx] = useState(0)
  const list = BY_DIFF[diff] || []
  const puzzle = list[idx] || null

  const [board, setBoard] = useState(() => (puzzle ? makeBoard(puzzle.pieces) : makeBoard([])))
  const [selected, setSelected] = useState(null)
  const [last, setLast] = useState(null)
  const [feedback, setFeedback] = useState(null)   // {kind:'ok'|'bad', text}
  const [solved, setSolved] = useState(false)
  const [failed, setFailed] = useState(false)
  const seqRef = useRef(0)

  // coups légaux du camp FONCÉ avec les règles de jeu (rafles courtes incluses)
  const legalMoves = useMemo(() => generateMoves(board, 'P', PLAY_RULES), [board])
  const movableKeys = useMemo(() => new Set(legalMoves.map(m => m.from[0] + '_' + m.from[1])), [legalMoves])

  const loadPuzzle = useCallback((d, i) => {
    const p = (BY_DIFF[d] || [])[i]
    if (!p) return
    seqRef.current++
    setDiff(d); setIdx(i)
    setBoard(makeBoard(p.pieces))
    setSelected(null); setLast(null); setFeedback(null)
    setSolved(false); setFailed(false)
  }, [])

  const changeDiff = useCallback((d) => {
    const l = BY_DIFF[d] || []
    if (!l.length) return
    // atterrit sur le premier puzzle non résolu de la difficulté (sinon le premier)
    const i = Math.max(0, l.findIndex(p => !solvedIds.has(p.id)))
    loadPuzzle(d, i)
  }, [solvedIds, loadPuzzle])

  const restart = useCallback(() => loadPuzzle(diff, idx), [diff, idx, loadPuzzle])
  const goNext = useCallback(() => {
    if (list.length > 1) loadPuzzle(diff, (idx + 1) % list.length)
  }, [diff, idx, list.length, loadPuzzle])

  const markSolved = useCallback((id) => {
    setSolvedIds(prev => {
      const n = new Set(prev); n.add(id); persistSolved(n); return n
    })
  }, [])

  // boucle d'interaction clic → clic, miroir du didacticiel (un seul coup décide)
  const onSquareClick = useCallback((r, c) => {
    if (!puzzle || solved || failed) return
    const key = r + '_' + c
    if (selected) {
      const matches = legalMoves.filter(m =>
        m.from[0] === selected[0] && m.from[1] === selected[1] && m.to[0] === r && m.to[1] === c)
      if (matches.length) {
        // plusieurs chemins vers la même case : on crédite le plus long (bénéfice du doute)
        const mv = matches.reduce((a, b) => (b.caps.length > a.caps.length ? b : a))
        const { board: nb } = applyMove(board, mv, PLAY_RULES)
        setBoard(nb); setLast(mv); setSelected(null)
        const n = puzzle.prisesAttendues, k = mv.caps.length
        if (mv.isCapture && k === n) {
          setSolved(true)
          setFeedback({ kind: 'ok', text: `Rafle maximale trouvée — ${n} pièces capturées d’un seul coup !` })
          markSolved(puzzle.id)
        } else {
          setFailed(true)
          setFeedback({ kind: 'bad', text: `${k} prise${k > 1 ? 's' : ''} seulement — la rafle maximale en capture ${n}. Recommence et cherche le chemin le plus long.` })
        }
        return
      }
      if (movableKeys.has(key)) { setSelected([r, c]); return }
      setSelected(null); return
    }
    if (movableKeys.has(key)) setSelected([r, c])
  }, [board, legalMoves, movableKeys, selected, solved, failed, puzzle, markSolved])

  const totalSolved = useMemo(() => PUZZLES.reduce((n, p) => n + (solvedIds.has(p.id) ? 1 : 0), 0), [solvedIds])
  const diffSolved = useMemo(() => list.reduce((n, p) => n + (solvedIds.has(p.id) ? 1 : 0), 0), [list, solvedIds])
  const diffDone = list.length > 0 && diffSolved === list.length
  const allDone = PUZZLES.length > 0 && totalSolved === PUZZLES.length

  if (!puzzle) {
    return (
      <p style={{ margin: 0, fontFamily: fonts.body, fontSize: 13.5, color: ui.textMute }}>
        Aucun puzzle valide n’est disponible pour le moment.
      </p>
    )
  }

  return (
    <div>
      <style>{`
        .dRafFocus:focus-visible{ outline:2px solid ${acc}; outline-offset:2px; border-radius:${ui.radius.md}px; }
        .dRafChip{ appearance:none; cursor:pointer; border:1px solid ${ui.line}; background:${ui.surface};
          color:${ui.textDim}; font-family:${fonts.body}; font-weight:600; font-size:12.5px;
          padding:7px 12px; border-radius:${ui.radius.pill}px; transition:background .15s,border-color .15s,color .15s; }
        .dRafChip:hover{ border-color:${ui.lineHi}; background:${ui.surfaceHi}; color:${ui.text}; }
        .dRafDot{ appearance:none; cursor:pointer; border:1px solid ${ui.line}; background:${ui.surface};
          color:${ui.textDim}; font-family:${fonts.mono}; font-weight:600; font-size:12px;
          width:30px; height:30px; border-radius:50%; display:grid; place-items:center;
          transition:background .15s,border-color .15s,color .15s; }
        .dRafDot:hover{ border-color:${ui.lineHi}; background:${ui.surfaceHi}; color:${ui.text}; }
        .dRafLayout{ display:grid; grid-template-columns:minmax(0,1fr); gap:clamp(16px,2.4vw,28px); align-items:start; }
        @media(min-width:980px){ .dRafLayout{ grid-template-columns:minmax(0,1fr) minmax(360px,460px); } }
        @keyframes dRafPop{ 0%{ transform:scale(.96); opacity:0 } 100%{ transform:scale(1); opacity:1 } }
        @media(prefers-reduced-motion:reduce){ .dRafPop{ animation:none !important } }
      `}</style>

      {/* Chips de difficulté + compteur de réussite */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', marginBottom: 12 }}>
        <div role="group" aria-label="Difficulté des puzzles" style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
          {DIFFS.map(d => {
            const on = d === diff
            const l = BY_DIFF[d]
            const s = l.reduce((n, p) => n + (solvedIds.has(p.id) ? 1 : 0), 0)
            return (
              <button key={d} className="dRafChip dRafFocus" onClick={() => changeDiff(d)}
                aria-pressed={on} disabled={!l.length}
                style={{
                  background: on ? acc : (s === l.length && l.length ? `${ui.good}1c` : ui.surface),
                  color: on ? '#0c1115' : (s === l.length && l.length ? ui.good : ui.textDim),
                  borderColor: on ? acc : (s === l.length && l.length ? `${ui.good}55` : ui.line),
                }}>
                {DIFF_LABEL[d]}
                <span aria-hidden style={{ marginLeft: 7, opacity: .75, fontVariantNumeric: 'tabular-nums' }}>{s}/{l.length}</span>
              </button>
            )
          })}
        </div>
        <div style={{ marginLeft: 'auto', fontFamily: fonts.mono, fontSize: 12.5, color: ui.textDim, fontVariantNumeric: 'tabular-nums' }}>
          {totalSolved}/{PUZZLES.length} rafles réussies
        </div>
      </div>

      {/* Pastilles des puzzles de la difficulté courante */}
      <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 14 }}>
        {list.map((p, i) => {
          const on = i === idx, ok = solvedIds.has(p.id)
          return (
            <button key={p.id} className="dRafDot dRafFocus" onClick={() => loadPuzzle(diff, i)}
              aria-current={on ? 'true' : undefined} aria-label={`Puzzle ${i + 1}${ok ? ' (réussi)' : ''}`}
              title={ok ? 'Réussi' : `Puzzle ${i + 1}`}
              style={{
                background: on ? acc : (ok ? `${ui.good}1c` : ui.surface),
                color: on ? '#0c1115' : (ok ? ui.good : ui.textDim),
                borderColor: on ? acc : (ok ? `${ui.good}55` : ui.line),
              }}>
              {ok && !on ? '✓' : i + 1}
            </button>
          )
        })}
      </div>

      {/* Damier + panneau consigne */}
      <div className="dRafLayout">
        <div style={{
          borderRadius: glass.radius, background: glass.bg, border: `1px solid ${glass.border}`,
          boxShadow: glass.shadow, padding: 'clamp(14px,2vw,26px)', display: 'grid', placeItems: 'center',
          backdropFilter: glass.blur, WebkitBackdropFilter: glass.blur, minHeight: 320,
        }}>
          <DraughtsBoard
            key={`${puzzle.id}-${seqRef.current}`}
            board={board}
            accent={acc}
            selected={selected}
            legalMoves={legalMoves}
            last={last}
            movableKeys={movableKeys}
            interactive={!solved && !failed}
            gameOver={solved || failed}
            coordsOn
            highlightsOn
            animOn={!noMotion}
            maxSize={560}
            onSquareClick={onSquareClick}
          />
        </div>

        <aside key={`${puzzle.id}-panel-${seqRef.current}`} style={{
          borderRadius: glass.radius, background: glass.bg, border: `1px solid ${glass.border}`,
          boxShadow: glass.shadow, padding: 'clamp(16px,2vw,22px)', display: 'flex', flexDirection: 'column',
          gap: 14, backdropFilter: glass.blur, WebkitBackdropFilter: glass.blur, position: 'sticky', top: 14,
        }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: acc, fontWeight: 700 }}>
              Puzzle {idx + 1} / {list.length} · {DIFF_LABEL[diff]}
            </div>
            <h4 style={{ margin: '7px 0 0', fontFamily: fonts.display, fontWeight: 800, fontSize: 21, color: ui.text, letterSpacing: '-.3px' }}>
              {puzzle.titre}
            </h4>
          </div>

          {/* Consigne + objectif */}
          <div style={{
            display: 'flex', gap: 11, padding: '12px 14px', borderRadius: ui.radius.md,
            background: ui.surface, border: `1px solid ${ui.line}`,
          }}>
            <span aria-hidden style={{ width: 4, borderRadius: 2, background: acc, flexShrink: 0 }} />
            <div>
              <div style={{ fontFamily: fonts.body, fontWeight: 700, fontSize: 12, letterSpacing: '.4px', textTransform: 'uppercase', color: ui.textMute, marginBottom: 4 }}>Consigne</div>
              <div style={{ fontFamily: fonts.body, fontSize: 13.5, lineHeight: 1.55, color: ui.text }}>
                Trouve la rafle maximale et joue-la d’un seul coup. Ici, les prises courtes restent jouables : à toi de repérer le chemin le plus long.
              </div>
              <div style={{ marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: ui.radius.pill, background: `${acc}14`, border: `1px solid ${acc}44`, fontFamily: fonts.mono, fontSize: 12, color: ui.text, fontVariantNumeric: 'tabular-nums' }}>
                <span aria-hidden style={{ width: 6, height: 6, borderRadius: '50%', background: acc }} />
                Objectif · {puzzle.prisesAttendues} prises
              </div>
            </div>
          </div>

          {/* Feedback ✓ / ✗ */}
          {feedback && (
            <div className="dRafPop" role="status" style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', borderRadius: ui.radius.md,
              background: feedback.kind === 'ok' ? `${ui.good}16` : `${ui.bad}16`,
              border: `1px solid ${feedback.kind === 'ok' ? ui.good : ui.bad}55`,
              animation: noMotion ? 'none' : 'dRafPop .22s ease',
            }}>
              <span aria-hidden style={{
                width: 22, height: 22, borderRadius: '50%', display: 'grid', placeItems: 'center', flexShrink: 0,
                background: feedback.kind === 'ok' ? ui.good : ui.bad, color: '#0c1115', fontWeight: 900, fontSize: 13,
              }}>{feedback.kind === 'ok' ? '✓' : '✗'}</span>
              <span style={{ fontFamily: fonts.body, fontSize: 13.5, lineHeight: 1.5, color: feedback.kind === 'ok' ? '#bfe3b0' : '#f0a99e' }}>{feedback.text}</span>
            </div>
          )}

          {/* Astuce repliée */}
          {!solved && puzzle.astuce && (
            <details style={{ fontFamily: fonts.body }}>
              <summary className="dRafFocus" style={{ cursor: 'pointer', fontSize: 13, color: ui.textDim, fontWeight: 600, listStyle: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span aria-hidden style={{ color: acc }}>›</span> Besoin d’un indice ?
              </summary>
              <p style={{ margin: '8px 0 0', fontSize: 13, lineHeight: 1.55, color: ui.textMute }}>{puzzle.astuce}</p>
            </details>
          )}

          {/* Actions */}
          <div style={{ marginTop: 'auto', display: 'flex', gap: 10, flexWrap: 'wrap', paddingTop: 4 }}>
            <button className="dRafFocus" onClick={restart}
              style={btn(ui.surface, failed ? ui.text : ui.textDim, failed ? ui.lineHi : ui.line)}>Recommencer</button>
            <button className="dRafFocus" onClick={goNext} disabled={list.length <= 1}
              style={btn(solved ? acc : ui.surface, solved ? '#0c1115' : ui.text, solved ? acc : ui.line, list.length <= 1)}>
              Suivant →
            </button>
          </div>

          {(diffDone || allDone) && (
            <div style={{
              marginTop: 4, padding: '12px 14px', borderRadius: ui.radius.md,
              background: `${acc}14`, border: `1px solid ${acc}44`,
              fontFamily: fonts.body, fontSize: 13.5, lineHeight: 1.55, color: ui.text,
            }}>
              {allDone
                ? <><strong style={{ color: acc }}>Œil de lynx !</strong> Les {PUZZLES.length} rafles maximales sont dans la poche — plus rien ne t’échappera en partie.</>
                : <><strong style={{ color: acc }}>Difficulté maîtrisée !</strong> Tous les puzzles « {DIFF_LABEL[diff]} » sont réussis — passe au niveau suivant.</>}
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}

// bouton inline réutilisable (même recette que le didacticiel)
function btn(bg, color, border, disabled) {
  return {
    appearance: 'none', cursor: disabled ? 'not-allowed' : 'pointer', fontFamily: fonts.body,
    fontWeight: 700, fontSize: 13.5, letterSpacing: '.2px', padding: '10px 16px', borderRadius: ui.radius.md,
    border: `1px solid ${border}`, background: bg, color, opacity: disabled ? 0.45 : 1,
    transition: 'background .15s, border-color .15s, opacity .15s',
  }
}
