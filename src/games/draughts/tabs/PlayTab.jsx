// ─────────────────────────────────────────────────────────────────────────────
// PlayTab (Dames) — expérience de jeu complète, 2D STRICTE (zéro R3F).
//   • Plateau centré (DraughtsBoard), drag+clic, rafle max forcée, dames volantes
//   • Hook useDraughtsGame (moteur + Worker IA → l'UI ne bloque jamais)
//   • Panneau : indicateur de trait, captures par camp, liste de coups (notation
//     internationale, scrollable, retour-arrière), contrôles
//   • Modes : vs IA (4 niveaux) · 2 joueurs local. (En ligne classé = onglet à part.)
//   • Fin de partie : overlay sobre (résultat + Rejouer / Retour)
// Tokens = neutralTheme. Accent univers = bleu-acier (props.accent). Inline only.
// ─────────────────────────────────────────────────────────────────────────────
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ui, fonts, damesPieces } from '../../../features/games/neutralTheme.js'
import { DEFAULT_RULES, P, M } from '../../../features/dames/engine/draughts-engine.js'
import DraughtsBoard from '../board/DraughtsBoard.jsx'
import { useDraughtsGame, LEVELS } from '../logic/useDraughtsGame.js'
import { useDraughtsSettings, SPEED_MULT } from '../logic/useDraughtsSettings.js'
import { sfx } from '../logic/sfx.js'
import { Segment, Btn } from '../ui/controls.jsx'
import DraughtsOnline from '../online/DraughtsOnline.jsx'

const SIDE_LBL = { [P]: 'Foncé', [M]: 'Clair' }
const SIDE_PC = { [P]: damesPieces.fonce, [M]: damesPieces.clair }
const MODES = [['ai', 'Solo (IA)'], ['local', '2 joueurs'], ['online', 'En ligne']]

function Dot({ side, size = 14 }) {
  const pc = SIDE_PC[side]
  return <span aria-hidden style={{ width: size, height: size, borderRadius: '50%', flexShrink: 0, background: `radial-gradient(circle at 36% 30%, ${pc.haut}, ${pc.base})`, boxShadow: `0 0 0 1px ${ui.lineHi}, inset 0 -2px 3px rgba(0,0,0,.4)` }} />
}

export default function PlayTab({ accent = ui.accent }) {
  const { settings } = useDraughtsSettings()
  const rules = DEFAULT_RULES   // règles internationales (prise max forcée toujours ON)
  const [mode, setMode] = useState('ai')
  const [diff, setDiffState] = useState(settings.aiLevel || 'capitaine')
  const [confirmResign, setConfirmResign] = useState(false)
  const startedRef = useRef(false)
  const [elapsed, setElapsed] = useState(0)
  const tickRef = useRef(0)

  const playSfx = useCallback((kind) => {
    if (!settings.sounds) return
    sfx[kind]?.(settings.volume ?? 0.7)
  }, [settings.sounds, settings.volume])

  const game = useDraughtsGame({
    rules, initialMode: mode, initialDiff: diff,
    onMove: ({ capture }) => playSfx(capture ? 'capture' : 'move'),
    onPromote: () => playSfx('promote'),
    onEnd: (st) => {
      // En solo, l'humain joue toujours le camp Foncé (P).
      if (st.draw) playSfx('lose')
      else if (mode === 'ai') playSfx(st.winner === P ? 'win' : 'lose')
      else playSfx('win')
    },
  })

  // horloge informative : démarre au 1er coup, gèle à la fin.
  useEffect(() => {
    if (game.gameOver) { clearInterval(tickRef.current); return }
    if (game.moves.length > 0 && !startedRef.current) {
      startedRef.current = Date.now()
      tickRef.current = setInterval(() => setElapsed(Math.floor((Date.now() - startedRef.current) / 1000)), 1000)
    }
    return () => {}
  }, [game.moves.length, game.gameOver])

  const restartWith = useCallback((opts) => {
    startedRef.current = false; setElapsed(0); clearInterval(tickRef.current)
    setConfirmResign(false)
    game.newGame(opts)
  }, [game])

  const changeMode = (m) => { setMode(m); restartWith({ mode: m, diff }) }
  const changeDiff = (d) => { setDiffState(d); game.setDiff(d) }

  const movableKeys = useMemo(() => game.movableKeys, [game.movableKeys])
  const animMult = SPEED_MULT[settings.animSpeed] ?? 1

  // indicateur de trait
  const aiThinking = game.thinking
  const turnLbl = SIDE_LBL[game.turn]
  const turnText = mode === 'ai'
    ? (game.turn === game.humanSide ? 'À vous de jouer' : (aiThinking ? `${turnLbl} réfléchit…` : turnLbl))
    : `Au trait : ${turnLbl}`
  const myTurn = !game.gameOver && (mode === 'local' || game.turn === game.humanSide) && !aiThinking

  // captures = pions perdus par chaque camp (20 au départ).
  const lostFonce = Math.max(0, 20 - game.counts[P])
  const lostClair = Math.max(0, 20 - game.counts[M])

  const mm = String((elapsed / 60) | 0).padStart(2, '0')
  const ss = String(elapsed % 60).padStart(2, '0')

  // ── En ligne classé : flux autonome (auth + matchmaking + match live) sur le
  // plateau 2D de l'univers. On garde le sélecteur de mode visible en haut.
  if (mode === 'online') {
    return (
      <div style={{ minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: 'clamp(14px, 2.4vw, 26px) clamp(14px, 2.4vw, 30px) 0' }}>
          <Segment items={MODES} value={mode} onChange={setMode} accent={accent} />
        </div>
        <DraughtsOnline accent={accent} />
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100%', padding: 'clamp(14px, 2.4vw, 30px)', display: 'flex', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: 1180, display: 'flex', flexWrap: 'wrap', gap: 'clamp(16px, 2vw, 26px)', alignItems: 'flex-start' }}>

        {/* ── colonne plateau ── */}
        <div style={{ flex: '1 1 460px', minWidth: 300, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* bandeau modes */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
            <Segment items={MODES} value={mode} onChange={changeMode} accent={accent} />
            {mode === 'ai' && <Segment items={LEVELS} value={diff} onChange={changeDiff} accent={accent} size="sm" />}
          </div>

          {/* plateau (carré, borné) */}
          <div style={{ position: 'relative', width: '100%' }}>
            <DraughtsBoard
              board={game.board} accent={accent}
              boardTheme={settings.boardTheme}
              selected={game.selected} legalMoves={game.legalMoves} last={game.last} hint={game.hint}
              movableKeys={movableKeys} interactive={myTurn} gameOver={game.gameOver}
              coordsOn={settings.coords} highlightsOn={settings.highlights}
              animOn={settings.animations} animMult={animMult}
              onSquareClick={game.handleSquare}
            />
            {game.gameOver && game.status && (
              <EndOverlay
                status={game.status} mode={mode} humanSide={game.humanSide} accent={accent}
                moves={game.moves.length} captures={lostFonce + lostClair}
                onRematch={() => restartWith({ mode, diff })}
              />
            )}
          </div>
        </div>

        {/* ── panneau latéral ── */}
        <aside style={{ flex: '1 1 280px', minWidth: 260, maxWidth: 360, display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* indicateur de trait + horloge */}
          <div style={{ background: ui.surface, border: `1px solid ${ui.line}`, borderRadius: ui.radius.lg, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <Dot side={game.turn} size={26} />
            {aiThinking && <ThinkDot accent={accent} />}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: 16, color: ui.text }}>{turnText}</div>
              <div style={{ fontFamily: fonts.body, fontSize: 11.5, color: ui.textMute, letterSpacing: '.3px', marginTop: 1 }}>
                {mode === 'ai' ? `Solo · ${LEVELS.find(l => l[0] === diff)?.[1] || ''}` : '2 joueurs'}
              </div>
            </div>
            <span title="Durée de la partie" style={{ fontFamily: fonts.mono, fontVariantNumeric: 'tabular-nums', fontWeight: 600, fontSize: 14, color: ui.textDim, paddingLeft: 12, borderLeft: `1px solid ${ui.line}` }}>{mm}:{ss}</span>
          </div>

          {/* captures par camp */}
          <div style={{ display: 'flex', gap: 12 }}>
            {[[P, game.counts[P], lostFonce], [M, game.counts[M], lostClair]].map(([side, alive, lost]) => (
              <div key={side} style={{ flex: 1, background: ui.surface, border: `1px solid ${ui.line}`, borderRadius: ui.radius.md, padding: '11px 13px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Dot side={side} size={18} />
                  <span style={{ fontSize: 10, letterSpacing: 1.4, textTransform: 'uppercase', color: ui.textMute, fontWeight: 700 }}>{SIDE_LBL[side]}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 7, marginTop: 7 }}>
                  <span style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: 24, lineHeight: 1, color: ui.text, fontVariantNumeric: 'tabular-nums' }}>{alive}</span>
                  <span style={{ fontFamily: fonts.body, fontSize: 11.5, color: ui.textMute }}>en jeu</span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginTop: 9, minHeight: 9 }}>
                  {Array.from({ length: lost }).map((_, i) => <span key={i} aria-hidden style={{ width: 8, height: 8, borderRadius: '50%', background: `radial-gradient(circle at 36% 30%, ${SIDE_PC[side].haut}, ${SIDE_PC[side].base})`, opacity: 0.85 }} />)}
                </div>
              </div>
            ))}
          </div>

          {/* liste de coups */}
          <MoveList moves={game.moves} accent={accent} />

          {/* contrôles */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9 }}>
            <Btn variant="primary" accent={accent} full onClick={() => restartWith({ mode, diff })}>Nouvelle partie</Btn>
            <Btn accent={accent} full disabled={!myTurn} onClick={game.hint} title={game.hinting ? 'Recherche…' : 'Meilleur coup'}>{game.hinting ? 'Recherche…' : 'Indice'}</Btn>
            {mode === 'ai' && <Btn accent={accent} full disabled={!game.canUndo || aiThinking} onClick={game.undo}>Annuler</Btn>}
            <Btn accent={accent} full danger disabled={game.gameOver} onClick={() => setConfirmResign(true)}>Abandonner</Btn>
          </div>
          <p style={{ margin: 0, fontFamily: fonts.body, fontSize: 11.5, lineHeight: 1.5, color: ui.textMute }}>
            Dames internationales 10×10 · prise maximale obligatoire · dames volantes.
          </p>
        </aside>
      </div>

      {/* confirmation d'abandon */}
      {confirmResign && (
        <ConfirmDialog
          accent={accent}
          title="Abandonner la partie ?"
          desc={mode === 'ai' ? 'La victoire sera attribuée à l’IA.' : `La victoire ira au camp ${SIDE_LBL[game.turn === P ? M : P]}.`}
          onCancel={() => setConfirmResign(false)}
          onConfirm={() => { setConfirmResign(false); game.resign() }}
        />
      )}
    </div>
  )
}

// ── liste de coups (notation internationale, scrollable, retour arrière) ──
function MoveList({ moves, accent }) {
  const ref = useRef(null)
  useEffect(() => { if (ref.current) ref.current.scrollTop = ref.current.scrollHeight }, [moves.length])
  // paires (foncé / clair) numérotées.
  const pairs = []
  for (let i = 0; i < moves.length; i += 2) pairs.push([moves[i], moves[i + 1]])
  return (
    <div style={{ background: ui.surface, border: `1px solid ${ui.line}`, borderRadius: ui.radius.lg, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 14px', borderBottom: `1px solid ${ui.line}` }}>
        <span style={{ fontSize: 10.5, letterSpacing: 1.4, textTransform: 'uppercase', color: ui.textDim, fontWeight: 700 }}>Coups</span>
        <span style={{ fontFamily: fonts.mono, fontVariantNumeric: 'tabular-nums', fontSize: 11.5, color: ui.textMute }}>{moves.length}</span>
      </div>
      <div ref={ref} style={{ maxHeight: 230, minHeight: 74, overflowY: 'auto', padding: '6px 6px 8px' }}>
        {pairs.length === 0
          ? <div style={{ padding: '20px 12px', textAlign: 'center', fontFamily: fonts.body, fontSize: 12.5, color: ui.textMute }}>La partie commence — au camp Foncé de jouer.</div>
          : pairs.map(([a, b], i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '30px 1fr 1fr', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 6, background: i % 2 ? 'transparent' : `${ui.bgElev}` }}>
              <span style={{ fontFamily: fonts.mono, fontSize: 11, color: ui.textMute, fontVariantNumeric: 'tabular-nums' }}>{i + 1}.</span>
              <Ply m={a} accent={accent} />
              <Ply m={b} accent={accent} />
            </div>
          ))}
      </div>
    </div>
  )
}
function Ply({ m, accent }) {
  if (!m) return <span />
  return (
    <span style={{ fontFamily: fonts.mono, fontVariantNumeric: 'tabular-nums', fontSize: 13, fontWeight: 600, color: m.capture ? accent : ui.text, display: 'flex', alignItems: 'center', gap: 6 }}>
      <Dot side={m.side} size={9} />{m.n}
    </span>
  )
}

function ThinkDot({ accent }) {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current; if (!el) return
    const a = el.animate([{ opacity: 0.3 }, { opacity: 1 }, { opacity: 0.3 }], { duration: 900, iterations: Infinity })
    return () => { try { a.cancel() } catch { /* */ } }
  }, [])
  return <span ref={ref} aria-hidden style={{ width: 8, height: 8, borderRadius: '50%', background: accent, flexShrink: 0 }} />
}

// ── overlay de fin de partie ──
function EndOverlay({ status, mode, humanSide, accent, moves, captures, onRematch }) {
  const ref = useRef(null)
  useEffect(() => { ref.current?.focus() }, [])
  let title, tone
  if (status.draw) { title = 'Partie nulle'; tone = ui.textDim }
  else if (mode === 'ai') {
    const won = status.winner === humanSide
    title = won ? 'Victoire' : 'Défaite'; tone = won ? ui.good : ui.bad
  } else { title = `${SIDE_LBL[status.winner]} l’emporte`; tone = accent }
  const reason = status.resigned ? 'Abandon.'
    : status.draw ? (status.reason || 'Aucun camp ne peut forcer le gain.')
      : (status.winner === P ? 'Le camp Clair n’a plus de coup légal.' : 'Le camp Foncé n’a plus de coup légal.')
  return (
    <div role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} ref={ref}
      style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', background: 'rgba(7,8,11,.72)', backdropFilter: 'blur(3px)', borderRadius: 8, outline: 'none', zIndex: 12, padding: 16 }}>
      <div style={{ width: 'min(360px, 92%)', background: ui.bgElev, border: `1px solid ${ui.lineHi}`, borderRadius: ui.radius.lg, padding: 26, textAlign: 'center', boxShadow: ui.shadow }}>
        <div aria-hidden style={{ width: 38, height: 4, borderRadius: 2, background: tone, margin: '0 auto 16px' }} />
        <h2 style={{ margin: 0, fontFamily: fonts.display, fontWeight: 800, fontSize: 26, color: ui.text, letterSpacing: '.2px' }}>{title}</h2>
        <p style={{ margin: '8px 0 18px', fontFamily: fonts.body, fontSize: 13.5, lineHeight: 1.5, color: ui.textDim }}>{reason}</p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 22, marginBottom: 20 }}>
          {[['Coups', moves], ['Prises', captures]].map(([k, v]) => (
            <div key={k}>
              <div style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: 22, color: ui.text, fontVariantNumeric: 'tabular-nums' }}>{v}</div>
              <div style={{ fontSize: 10, letterSpacing: 1.3, textTransform: 'uppercase', color: ui.textMute, fontWeight: 700, marginTop: 2 }}>{k}</div>
            </div>
          ))}
        </div>
        <Btn variant="primary" accent={accent} full onClick={onRematch}>Rejouer</Btn>
      </div>
    </div>
  )
}

// ── confirmation générique ──
function ConfirmDialog({ title, desc, onCancel, onConfirm, accent }) {
  const ref = useRef(null)
  useEffect(() => {
    ref.current?.focus()
    const onKey = (e) => { if (e.key === 'Escape') onCancel() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel])
  return (
    <div role="dialog" aria-modal="true" aria-label={title} style={{ position: 'fixed', inset: 0, display: 'grid', placeItems: 'center', background: 'rgba(7,8,11,.6)', zIndex: 60, padding: 16 }}>
      <div ref={ref} tabIndex={-1} style={{ width: 'min(380px, 94%)', background: ui.bgElev, border: `1px solid ${ui.lineHi}`, borderRadius: ui.radius.lg, padding: 24, outline: 'none', boxShadow: ui.shadow }}>
        <h2 style={{ margin: '0 0 8px', fontFamily: fonts.display, fontWeight: 700, fontSize: 19, color: ui.text }}>{title}</h2>
        <p style={{ margin: '0 0 20px', fontFamily: fonts.body, fontSize: 13.5, lineHeight: 1.5, color: ui.textDim }}>{desc}</p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <Btn accent={accent} onClick={onCancel}>Annuler</Btn>
          <Btn danger accent={accent} onClick={onConfirm}>Abandonner</Btn>
        </div>
      </div>
    </div>
  )
}
