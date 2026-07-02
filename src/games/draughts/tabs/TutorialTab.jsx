// ─────────────────────────────────────────────────────────────────────────────
// TutorialTab (Dames) — onglet « Apprendre » : DIDACTICIEL INTERACTIF jouable
// pas-à-pas + RÈGLES ILLUSTRÉES. Dames internationales 10×10 (prise obligatoire,
// rafle maximale, dame volante). Plein écran, dense, sobre premium, bleu-acier.
//
// Le didacticiel RÉUTILISE le moteur (generateMoves / applyMove en LECTURE SEULE)
// et le rendu DraughtsBoard piloté par props. On NE recode PAS le moteur, on NE
// touche PAS au format board/coups (l'online en dépend) : on construit des
// plateaux 10×10 au format attendu et on valide le coup joué via generateMoves.
//
// Boucle de jeu locale (sélection → coup), miroir minimal de useDraughtsGame :
//  - clic sur une pièce mobile = sélection ; clic sur une cible = on cherche le
//    coup légal correspondant (generateMoves) et on l'applique (applyMove).
//  - chaque leçon attend un coup précis (case d'arrivée, et nb de prises pour la
//    rafle) → feedback succès / erreur, puis « Suivant ».
// Styles inline only. focus-visible, prefers-reduced-motion. Accent = props.accent.
// ─────────────────────────────────────────────────────────────────────────────
import { useCallback, useMemo, useRef, useState } from 'react'
import { ui, fonts } from '../../../features/games/neutralTheme.js'
import { glass } from '../../_shell/arena/arenaTokens.js'
import {
  generateMoves, applyMove, DEFAULT_RULES,
} from '../../../features/dames/engine/draughts-engine.js'
import DraughtsBoard from '../board/DraughtsBoard.jsx'
import MiniBoard from '../ui/MiniBoard.jsx'
import { SectionTitle } from '../ui/controls.jsx'
import { makeBoard } from '../logic/tutorialPositions.js'
import RafleTrainer from '../puzzles/RafleTrainer.jsx'

const STEEL = '#6f8fb0'
const reduced = () => { try { return window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches } catch { return false } }

// ── Définition des leçons jouables ───────────────────────────────────────────
// goal(mv) → bool : le coup joué satisfait-il la consigne ? (mv vient de generateMoves)
// done : leçon de lecture seule (pas de coup à jouer), validée par le bouton.
const LESSONS = [
  {
    id: 'plateau',
    title: 'Le plateau et le but',
    intro: 'On joue uniquement sur les 50 cases foncées d’un damier 10×10. Foncé (graphite) contre Clair (ivoire). Le but : priver l’adversaire de tout coup légal — en capturant ses pièces ou en le bloquant.',
    task: 'Observe la position de départ, puis avance d’un pion foncé pour commencer.',
    pieces: startish(),
    goal: () => true, // n'importe quel coup légal valide la prise en main
    hintText: 'Clique un pion foncé surligné, puis une case d’arrivée surlignée.',
    okText: 'Parfait — tu as joué ton premier coup.',
  },
  {
    id: 'deplacement',
    title: 'Déplacer un pion',
    intro: 'Un pion avance d’une seule case en diagonale, vers l’avant (le camp Foncé monte). Il ne recule jamais — sauf pour capturer.',
    task: 'Avance le pion foncé d’une case en diagonale.',
    pieces: [[6, 4, 'p']],
    goal: (mv) => !mv.isCapture && mv.to[0] === 5,
    hintText: 'Deux cases libres devant le pion sont surlignées : choisis-en une.',
    okText: 'Bien joué — le pion progresse en diagonale.',
  },
  {
    id: 'prise',
    title: 'La prise (obligatoire)',
    intro: 'Si une prise est possible, elle est OBLIGATOIRE. Le pion saute par-dessus une pièce adverse adjacente vers la case vide juste derrière, et la retire. Le pion capture dans les quatre diagonales — y compris en arrière.',
    task: 'Capture le pion clair. C’est le seul coup permis.',
    pieces: [[6, 4, 'p'], [5, 5, 'c']],
    goal: (mv) => mv.isCapture && mv.caps.length === 1,
    hintText: 'Saute par-dessus le pion clair : la case derrière lui est surlignée.',
    okText: 'Capture réussie — la pièce sautée est retirée.',
  },
  {
    id: 'arriere',
    title: 'Capturer en arrière',
    intro: 'Un pion ne se déplace que vers l’avant, mais il PEUT capturer en arrière. C’est une particularité des dames internationales.',
    task: 'Le pion clair est derrière le tien : capture-le quand même.',
    pieces: [[5, 5, 'p'], [6, 4, 'c']],
    goal: (mv) => mv.isCapture && mv.to[0] === 7,
    hintText: 'La prise se fait vers le bas (en arrière), case d’arrivée surlignée.',
    okText: 'Exact — la prise en arrière est autorisée.',
  },
  {
    id: 'rafle',
    title: 'La rafle (prises enchaînées)',
    intro: 'Tant qu’une nouvelle prise est possible depuis la case d’arrivée, on continue avec la même pièce : c’est une rafle. Les pions sautés ne sont retirés qu’à la fin.',
    task: 'Joue la rafle : enchaîne les deux prises d’un seul coup.',
    pieces: [[7, 1, 'p'], [6, 2, 'c'], [4, 2, 'c']],
    goal: (mv) => mv.isCapture && mv.caps.length >= 2,
    hintText: 'Une seule case d’arrivée mène à la rafle complète : clique-la.',
    okText: 'Magnifique — deux pièces tombent dans une seule rafle.',
  },
  {
    id: 'maximale',
    title: 'La rafle maximale',
    intro: 'Quand plusieurs rafles existent, on est OBLIGÉ de prendre celle qui capture le plus de pièces. Le moteur ne te proposera donc que la plus longue.',
    task: 'Une seule rafle est légale : la plus grosse. Joue-la.',
    pieces: [[7, 3, 'p'], [6, 2, 'c'], [4, 2, 'c'], [6, 4, 'c']],
    goal: (mv) => mv.isCapture && mv.caps.length >= 2,
    hintText: 'La direction qui prend 2 pièces est forcée ; l’autre n’apparaît même pas.',
    okText: 'C’est ça — seule la rafle maximale était permise.',
  },
  {
    id: 'promotion',
    title: 'La promotion en dame',
    intro: 'Un pion qui s’arrête sur la dernière rangée adverse devient DAME (liseré et couronne dorés). S’il ne fait que traverser cette rangée pendant une rafle, il reste pion.',
    task: 'Avance le pion sur la dernière rangée pour le couronner.',
    pieces: [[1, 3, 'p']],
    goal: (mv) => mv.to[0] === 0,
    hintText: 'La case de promotion (rangée du haut) est surlignée.',
    okText: 'Couronné ! Le pion est désormais une dame.',
  },
  {
    id: 'dame',
    title: 'La dame volante',
    intro: 'La dame glisse de plusieurs cases en diagonale, dans les deux sens. Sa portée est longue — elle balaie toute une diagonale libre.',
    task: 'Déplace la dame loin sur une diagonale (au moins 3 cases).',
    pieces: [[7, 3, 'P']],
    goal: (mv) => !mv.isCapture && diagLen(mv) >= 3,
    hintText: 'Choisis une case d’arrivée bien éloignée sur la diagonale surlignée.',
    okText: 'Voilà la portée de la dame volante.',
  },
  {
    id: 'priseDame',
    title: 'La prise par la dame',
    intro: 'En prenant, la dame capture une pièce située loin sur sa diagonale et se pose sur n’importe quelle case libre AU-DELÀ. Sa puissance offensive est redoutable.',
    task: 'Capture le pion clair avec la dame, à distance.',
    pieces: [[8, 2, 'P'], [4, 6, 'c']],
    goal: (mv) => mv.isCapture && mv.caps.length === 1,
    hintText: 'La dame saute par-dessus le pion clair ; plusieurs cases d’arrivée s’ouvrent derrière.',
    okText: 'Prise à distance réussie — la marque de fabrique de la dame.',
  },
  {
    id: 'nulle',
    title: 'La partie nulle',
    intro: 'Toutes les parties ne se gagnent pas. C’est nul après 25 coups de chaque camp sans prise ni avancée de pion, par triple répétition de la position, ou lorsqu’il ne reste qu’une dame contre une dame — aucun camp ne pouvant forcer le gain.',
    task: 'Rien à jouer ici : retiens simplement les trois cas de nulle.',
    pieces: [[3, 3, 'P'], [6, 6, 'C']],
    done: true,
    okText: 'Tu connais maintenant les fins de partie nulles.',
  },
]

// position d'ouverture allégée pour la 1re leçon (lisible, pas le board complet)
function startish() {
  const out = []
  // 3 rangées de chaque camp au centre du plateau pour rester clair
  for (let r = 0; r <= 2; r++) for (let c = 0; c < 10; c++) if ((r + c) % 2 === 1) out.push([r, c, 'c'])
  for (let r = 7; r <= 9; r++) for (let c = 0; c < 10; c++) if ((r + c) % 2 === 1) out.push([r, c, 'p'])
  return out
}

// longueur (cases) d'un déplacement diagonal de dame
function diagLen(mv) { return Math.abs(mv.to[0] - mv.from[0]) }

// ── Composant principal ───────────────────────────────────────────────────────
export default function TutorialTab({ accent = STEEL }) {
  const acc = accent || STEEL
  const [idx, setIdx] = useState(0)
  const [done, setDone] = useState(() => new Set())   // ids de leçons réussies
  const lesson = LESSONS[idx]

  // état de plateau LOCAL de la leçon (clone du moteur, jamais partagé avec l'online)
  const [board, setBoard] = useState(() => makeBoard(lesson.pieces))
  const [selected, setSelected] = useState(null)
  const [last, setLast] = useState(null)
  const [feedback, setFeedback] = useState(null)       // {kind:'ok'|'bad', text}
  const [solved, setSolved] = useState(false)
  const seqRef = useRef(0)

  // coups légaux du camp FONCÉ (le joueur incarne toujours Foncé dans le didacticiel)
  const legalMoves = useMemo(() => generateMoves(board, 'P', DEFAULT_RULES), [board])
  const movableKeys = useMemo(() => new Set(legalMoves.map(m => m.from[0] + '_' + m.from[1])), [legalMoves])

  // (re)charge une leçon
  const loadLesson = useCallback((i) => {
    const L = LESSONS[i]
    seqRef.current++
    setIdx(i)
    setBoard(makeBoard(L.pieces))
    setSelected(null); setLast(null); setFeedback(null)
    setSolved(!!L.done)   // les leçons "lecture seule" sont validables immédiatement
  }, [])

  const reset = useCallback(() => {
    seqRef.current++
    setBoard(makeBoard(lesson.pieces))
    setSelected(null); setLast(null); setFeedback(null); setSolved(!!lesson.done)
  }, [lesson])

  // boucle d'interaction (clic case → case), miroir minimal de useDraughtsGame.handleSquare
  const onSquareClick = useCallback((r, c) => {
    if (solved || lesson.done) return
    const key = r + '_' + c
    if (selected) {
      const mv = legalMoves.find(m =>
        m.from[0] === selected[0] && m.from[1] === selected[1] && m.to[0] === r && m.to[1] === c)
      if (mv) {
        const { board: nb } = applyMove(board, mv, DEFAULT_RULES)
        setBoard(nb); setLast(mv); setSelected(null)
        if (lesson.goal(mv)) {
          setSolved(true); setFeedback({ kind: 'ok', text: lesson.okText })
          setDone(d => { const n = new Set(d); n.add(lesson.id); return n })
        } else {
          setFeedback({ kind: 'bad', text: 'Pas tout à fait — ce coup ne répond pas à la consigne. Réessaie.' })
        }
        return
      }
      if (movableKeys.has(key)) { setSelected([r, c]); return }
      setSelected(null); return
    }
    if (movableKeys.has(key)) setSelected([r, c])
  }, [board, legalMoves, movableKeys, selected, solved, lesson])

  const validateReadOnly = useCallback(() => {
    setSolved(true); setFeedback({ kind: 'ok', text: lesson.okText })
    setDone(d => { const n = new Set(d); n.add(lesson.id); return n })
  }, [lesson])

  const goNext = useCallback(() => { if (idx < LESSONS.length - 1) loadLesson(idx + 1) }, [idx, loadLesson])
  const goPrev = useCallback(() => { if (idx > 0) loadLesson(idx - 1) }, [idx, loadLesson])

  const progress = Math.round((done.size / LESSONS.length) * 100)
  const allDone = done.size === LESSONS.length
  const isLast = idx === LESSONS.length - 1

  return (
    <div style={{ minHeight: '100%', padding: 'clamp(18px,2.4vw,30px) clamp(14px,3vw,40px) 56px' }}>
      <style>{`
        .dTutFocus:focus-visible{ outline:2px solid ${acc}; outline-offset:2px; border-radius:${ui.radius.md}px; }
        .dTutStep{ appearance:none; cursor:pointer; border:1px solid ${ui.line}; background:${ui.surface};
          color:${ui.textDim}; font-family:${fonts.body}; font-weight:600; font-size:12.5px;
          padding:7px 11px; border-radius:${ui.radius.pill}px; transition:background .15s,border-color .15s,color .15s; }
        .dTutStep:hover{ border-color:${ui.lineHi}; background:${ui.surfaceHi}; color:${ui.text}; }
        .dTutLayout{ display:grid; grid-template-columns:minmax(0,1fr); gap:clamp(16px,2.4vw,28px); align-items:start; }
        @media(min-width:980px){ .dTutLayout{ grid-template-columns:minmax(0,1fr) minmax(360px,460px); } }
        @keyframes dTutPop{ 0%{ transform:scale(.96); opacity:0 } 100%{ transform:scale(1); opacity:1 } }
        @media(prefers-reduced-motion:reduce){ .dTutPop{ animation:none !important } }
      `}</style>

      <div style={{ width: '100%', maxWidth: 1320, margin: '0 auto' }}>
        {/* En-tête + progression */}
        <header style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: acc, fontWeight: 700 }}>Dames internationales</div>
          <h1 style={{ margin: '8px 0 0', fontFamily: fonts.display, fontWeight: 800, fontSize: 'clamp(26px,4vw,36px)', color: ui.text, letterSpacing: '-.5px' }}>Apprendre</h1>
          <p style={{ margin: '10px 0 0', fontFamily: fonts.body, fontSize: 14, lineHeight: 1.6, color: ui.textDim, maxWidth: 700 }}>
            Un didacticiel jouable, pas à pas. Joue le bon coup sur le damier pour avancer — la prise est obligatoire et la rafle est maximale, comme dans une vraie partie.
          </p>

          <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 280px', minWidth: 220 }}>
              <div style={{ height: 8, borderRadius: 999, background: ui.surfaceHi, overflow: 'hidden', border: `1px solid ${ui.line}` }}>
                <div style={{ height: '100%', width: `${progress}%`, background: `linear-gradient(90deg, ${acc}, ${acc}cc)`, borderRadius: 999, transition: reduced() ? 'none' : 'width .4s ease' }} />
              </div>
            </div>
            <div style={{ fontFamily: fonts.mono, fontSize: 12.5, color: ui.textDim, fontVariantNumeric: 'tabular-nums' }}>
              {done.size}/{LESSONS.length} leçons · {progress}%
            </div>
          </div>

          {/* pas de navigation rapide (chips) */}
          <div style={{ marginTop: 12, display: 'flex', gap: 7, flexWrap: 'wrap' }}>
            {LESSONS.map((L, i) => {
              const on = i === idx, ok = done.has(L.id)
              return (
                <button key={L.id} className="dTutStep dTutFocus" onClick={() => loadLesson(i)}
                  aria-current={on ? 'step' : undefined}
                  style={{
                    background: on ? acc : (ok ? `${ui.good}1c` : ui.surface),
                    color: on ? '#0c1115' : (ok ? ui.good : ui.textDim),
                    borderColor: on ? acc : (ok ? `${ui.good}55` : ui.line),
                  }}>
                  <span aria-hidden style={{ marginRight: 6, opacity: .8 }}>{ok && !on ? '✓' : i + 1}</span>{L.title}
                </button>
              )
            })}
          </div>
        </header>

        {/* Cœur : damier jouable + panneau consigne */}
        <div className="dTutLayout">
          {/* Damier */}
          <div style={{
            borderRadius: glass.radius, background: glass.bg, border: `1px solid ${glass.border}`,
            boxShadow: glass.shadow, padding: 'clamp(14px,2vw,26px)', display: 'grid', placeItems: 'center',
            backdropFilter: glass.blur, WebkitBackdropFilter: glass.blur, minHeight: 320,
          }}>
            <DraughtsBoard
              key={`${lesson.id}-${seqRef.current}`}
              board={board}
              accent={acc}
              selected={selected}
              legalMoves={legalMoves}
              last={last}
              movableKeys={movableKeys}
              interactive={!solved && !lesson.done}
              gameOver={solved || lesson.done}
              coordsOn
              highlightsOn
              animOn
              maxSize={560}
              onSquareClick={onSquareClick}
            />
          </div>

          {/* Panneau consigne / feedback */}
          <aside style={{
            borderRadius: glass.radius, background: glass.bg, border: `1px solid ${glass.border}`,
            boxShadow: glass.shadow, padding: 'clamp(16px,2vw,22px)', display: 'flex', flexDirection: 'column',
            gap: 14, backdropFilter: glass.blur, WebkitBackdropFilter: glass.blur, position: 'sticky', top: 14,
          }}>
            <div>
              <div style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: acc, fontWeight: 700 }}>
                Leçon {idx + 1} / {LESSONS.length}
              </div>
              <h2 style={{ margin: '7px 0 0', fontFamily: fonts.display, fontWeight: 800, fontSize: 22, color: ui.text, letterSpacing: '-.3px' }}>
                {lesson.title}
              </h2>
            </div>

            <p style={{ margin: 0, fontFamily: fonts.body, fontSize: 14, lineHeight: 1.65, color: ui.textDim }}>
              {lesson.intro}
            </p>

            {/* Consigne */}
            <div style={{
              display: 'flex', gap: 11, padding: '12px 14px', borderRadius: ui.radius.md,
              background: ui.surface, border: `1px solid ${ui.line}`,
            }}>
              <span aria-hidden style={{ width: 4, borderRadius: 2, background: acc, flexShrink: 0 }} />
              <div>
                <div style={{ fontFamily: fonts.body, fontWeight: 700, fontSize: 12, letterSpacing: '.4px', textTransform: 'uppercase', color: ui.textMute, marginBottom: 4 }}>Consigne</div>
                <div style={{ fontFamily: fonts.body, fontSize: 13.5, lineHeight: 1.55, color: ui.text }}>{lesson.task}</div>
              </div>
            </div>

            {/* Feedback */}
            {feedback && (
              <div className="dTutPop" style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', borderRadius: ui.radius.md,
                background: feedback.kind === 'ok' ? `${ui.good}16` : `${ui.bad}16`,
                border: `1px solid ${feedback.kind === 'ok' ? ui.good : ui.bad}55`,
                animation: reduced() ? 'none' : 'dTutPop .22s ease',
              }}>
                <span aria-hidden style={{
                  width: 22, height: 22, borderRadius: '50%', display: 'grid', placeItems: 'center', flexShrink: 0,
                  background: feedback.kind === 'ok' ? ui.good : ui.bad, color: '#0c1115', fontWeight: 900, fontSize: 13,
                }}>{feedback.kind === 'ok' ? '✓' : '!'}</span>
                <span style={{ fontFamily: fonts.body, fontSize: 13.5, lineHeight: 1.5, color: feedback.kind === 'ok' ? '#bfe3b0' : '#f0a99e' }}>{feedback.text}</span>
              </div>
            )}

            {/* Indice (replié sauf demande) */}
            {!solved && !lesson.done && lesson.hintText && (
              <details style={{ fontFamily: fonts.body }}>
                <summary className="dTutFocus" style={{ cursor: 'pointer', fontSize: 13, color: ui.textDim, fontWeight: 600, listStyle: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <span aria-hidden style={{ color: acc }}>›</span> Besoin d’un indice ?
                </summary>
                <p style={{ margin: '8px 0 0', fontSize: 13, lineHeight: 1.55, color: ui.textMute }}>{lesson.hintText}</p>
              </details>
            )}

            {/* Actions */}
            <div style={{ marginTop: 'auto', display: 'flex', gap: 10, flexWrap: 'wrap', paddingTop: 4 }}>
              <button className="dTutFocus" onClick={goPrev} disabled={idx === 0}
                style={btn(ui.surface, ui.text, ui.line, idx === 0)}>Précédent</button>

              {lesson.done && !solved && (
                <button className="dTutFocus" onClick={validateReadOnly}
                  style={btn(acc, '#0c1115', acc)}>J’ai compris</button>
              )}

              {!lesson.done && (
                <button className="dTutFocus" onClick={reset}
                  style={btn(ui.surface, ui.textDim, ui.line)}>Recommencer</button>
              )}

              <button className="dTutFocus" onClick={goNext} disabled={!solved || isLast}
                style={btn(solved && !isLast ? acc : ui.surface, solved && !isLast ? '#0c1115' : ui.textMute, solved && !isLast ? acc : ui.line, !solved || isLast)}>
                {isLast ? 'Fin du didacticiel' : 'Suivant →'}
              </button>
            </div>

            {allDone && (
              <div style={{
                marginTop: 4, padding: '12px 14px', borderRadius: ui.radius.md,
                background: `${acc}14`, border: `1px solid ${acc}44`,
                fontFamily: fonts.body, fontSize: 13.5, lineHeight: 1.55, color: ui.text,
              }}>
                <strong style={{ color: acc }}>Bravo !</strong> Tu maîtrises les bases des dames internationales. Direction l’onglet <em>Jouer</em> pour une vraie partie.
              </div>
            )}
          </aside>
        </div>

        {/* ── RÈGLES ILLUSTRÉES (référence rapide, mini-diagrammes) ── */}
        <IllustratedRules accent={acc} />

        {/* ── TACTIQUES — entraîneur « rafle maximale » (puzzles validés moteur) ── */}
        <section style={{ marginTop: 'clamp(26px,4vw,44px)' }}>
          <SectionTitle accent={acc} hint="Des positions réelles où une seule rafle capture le maximum de pièces : repère-la et joue-la d’un seul coup. Ta progression est sauvegardée.">
            Tactiques — La rafle maximale
          </SectionTitle>
          <RafleTrainer accent={acc} />
        </section>
      </div>
    </div>
  )
}

// bouton inline réutilisable
function btn(bg, color, border, disabled) {
  return {
    appearance: 'none', cursor: disabled ? 'not-allowed' : 'pointer', fontFamily: fonts.body,
    fontWeight: 700, fontSize: 13.5, letterSpacing: '.2px', padding: '10px 16px', borderRadius: ui.radius.md,
    border: `1px solid ${border}`, background: bg, color, opacity: disabled ? 0.45 : 1,
    transition: 'background .15s, border-color .15s, opacity .15s',
  }
}

// ── Aide-mémoire illustré (mini-diagrammes statiques) ─────────────────────────
const REF = [
  { title: 'Déplacement', text: 'Le pion avance d’une case en diagonale, jamais en arrière.', rows: ['.....', '..p..', '.....', '.....', '.....'], marks: { dot: [[2, 1], [2, 3]] } },
  { title: 'Prise obligatoire', text: 'Saute par-dessus l’adverse vers la case vide juste derrière.', rows: ['.....', '..c..', '.....', '..p..', '.....'], marks: { ring: [[1, 2]], to: [[0, 3]] } },
  { title: 'Rafle maximale', text: 'On enchaîne les prises ; la plus longue est obligatoire.', rows: ['.....', '.c.c.', '.....', '.c...', 'p....'], marks: { ring: [[3, 1], [1, 1], [1, 3]], to: [[2, 2]] } },
  { title: 'Dame volante', text: 'La dame glisse loin en diagonale, dans les deux sens.', rows: ['.....', '.....', '.....', '...P.', '.....'], marks: { dot: [[2, 2], [1, 1], [0, 0], [4, 4], [2, 4]] } },
  { title: 'Promotion', text: 'Un pion qui s’arrête sur la dernière rangée devient dame.', rows: ['..p..', '.....', '.....', '.....', '.....'], marks: { to: [[0, 2]] } },
  { title: 'Partie nulle', text: '25 coups sans progrès, triple répétition, ou dame contre dame.', rows: ['.....', '.P...', '.....', '...C.', '.....'], marks: {} },
]

function IllustratedRules({ accent }) {
  return (
    <section style={{ marginTop: 'clamp(26px,4vw,44px)' }}>
      <SectionTitle accent={accent} hint="Les six règles essentielles, en un coup d’œil — pour réviser après le didacticiel.">
        Règles illustrées
      </SectionTitle>
      <style>{`.dTutRefGrid{ display:grid; grid-template-columns:repeat(auto-fill,minmax(min(100%,300px),1fr)); gap:14px; align-items:start; }`}</style>
      <div className="dTutRefGrid">
        {REF.map((r, i) => (
          <div key={i} style={{
            borderRadius: ui.radius.md, background: ui.surface, border: `1px solid ${ui.line}`,
            padding: '14px 16px', display: 'grid', gridTemplateColumns: 'auto minmax(0,1fr)', gap: 14, alignItems: 'center',
          }}>
            <div style={{ display: 'grid', placeItems: 'center' }}>
              <MiniBoard rows={r.rows} marks={r.marks} accent={accent} size={118} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: 15, color: ui.text, marginBottom: 5 }}>{r.title}</div>
              <p style={{ margin: 0, fontFamily: fonts.body, fontSize: 13, lineHeight: 1.55, color: ui.textDim }}>{r.text}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
