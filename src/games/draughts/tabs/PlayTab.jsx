// ─────────────────────────────────────────────────────────────────────────────
// PlayTab (Dames) — expérience de jeu plein écran, 2D STRICTE (zéro R3F).
//   • Arène partagée (ArenaLayout) : rails verre dépoli gauche/droite + plateau
//     central, lumière d'ambiance qui bascule selon le trait. Parité visuelle
//     avec l'univers Échecs.
//   • Plateau centré (DraughtsBoard), drag+clic, rafle max forcée, dames volantes
//   • Hook useDraughtsGame (moteur + Worker IA → l'UI ne bloque jamais)
//   • Rail gauche : trait + horloge + captures par camp
//     Rail droit : liste de coups (scroll) + contrôles + menu
//   • Modes : vs IA (4 niveaux) · 2 joueurs local. (En ligne classé = flux à part.)
//   • Juice arène : poussière d'or sur capture, micro-shake sur rafle/promotion,
//     halo or sur promotion en dame. Tout dégrade sous prefers-reduced-motion.
// Tokens = neutralTheme + arenaTokens. Accent univers = bleu-acier (props.accent).
// Styles inline only.
// ─────────────────────────────────────────────────────────────────────────────
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { ui, fonts, damesPieces } from '../../../features/games/neutralTheme.js'
import { DEFAULT_RULES, P, M, initBoard, applyMove } from '../../../features/dames/engine/draughts-engine.js'
import DraughtsBoard from '../board/DraughtsBoard.jsx'
import { useDraughtsGame, LEVELS } from '../logic/useDraughtsGame.js'
import { useDraughtsSettings, SPEED_MULT } from '../logic/useDraughtsSettings.js'
import { sfx } from '../logic/sfx.js'
import { Segment, Btn } from '../ui/controls.jsx'
import DraughtsOnline from '../online/DraughtsOnline.jsx'
import ArenaLayout from '../../_shell/arena/ArenaLayout.jsx'
import Particles from '../../_shell/arena/Particles.jsx'
import ReplayScrubber from '../../_shell/arena/ReplayScrubber.jsx'
import { useScreenShake, eventGlow } from '../../_shell/arena/fx.js'
import { genererNotation, copierPresse, telecharger } from '../logic/exportNotation.js'

const SIDE_LBL = { [P]: 'Foncé', [M]: 'Clair' }
const SIDE_PC = { [P]: damesPieces.fonce, [M]: damesPieces.clair }
const MODES = [['ai', 'Solo (IA)'], ['local', '2 joueurs'], ['online', 'En ligne']]
// Mode pré-sélectionné depuis une île du Nouveau Monde (solo/ami/classe → ai/local/online).
const ISLAND_MODE = { solo: 'ai', ami: 'local', classe: 'online' }

function Dot({ side, size = 14 }) {
  const pc = SIDE_PC[side]
  return <span aria-hidden style={{ width: size, height: size, borderRadius: '50%', flexShrink: 0, background: `radial-gradient(circle at 36% 30%, ${pc.haut}, ${pc.base})`, boxShadow: `0 0 0 1px ${ui.lineHi}, inset 0 -2px 3px rgba(0,0,0,.4)` }} />
}

// ── Taille responsive du plateau : carré borné par l'espace de l'arène.
//    Desktop : retire les 2 rails (248 gauche + 312 droite) + gaps/padding.
function useBoardSize() {
  const [taille, setTaille] = useState(480)
  useEffect(() => {
    const calc = () => {
      const vw = window.innerWidth, vh = window.innerHeight
      const mobile = vw < 880
      const dispoLargeur = mobile ? vw - 24 : vw - 248 - 312 - 100
      const dispoHauteur = vh - (mobile ? 280 : 120)
      const t = Math.max(280, Math.min(640, dispoLargeur, dispoHauteur))
      setTaille(Math.floor(t))
    }
    calc()
    window.addEventListener('resize', calc)
    return () => window.removeEventListener('resize', calc)
  }, [])
  return taille
}

export default function PlayTab({ accent = ui.accent }) {
  const loc = useLocation()
  const { settings } = useDraughtsSettings()
  const rules = DEFAULT_RULES   // règles internationales (prise max forcée toujours ON)
  const [mode, setMode] = useState(() => ISLAND_MODE[loc.state?.playMode] || 'ai')
  const [diff, setDiffState] = useState(settings.aiLevel || 'capitaine')
  const [confirmResign, setConfirmResign] = useState(false)
  const startedRef = useRef(false)
  const [elapsed, setElapsed] = useState(0)
  const tickRef = useRef(0)

  // ── Revue / Replay : journal local des mouvements moteur (le hook n'expose pas
  //    son history). On capture chaque `mv` dans onMove pour pouvoir rejouer les
  //    positions passées via le moteur (initBoard + applyMove), sans toucher au hook.
  const [mvLog, setMvLog] = useState([])           // [mv, mv, …] dans l'ordre joué
  const [revueIdx, setRevueIdx] = useState(null)   // null = suit le live ; sinon nb de plies affichés (0..total)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [copie, setCopie] = useState(false)

  const boardSize = useBoardSize()
  const mobile = typeof window !== 'undefined' && window.innerWidth < 880

  // ── Juice arène : particules de capture + micro-shake (rafle / promotion) + halo promotion ──
  const particlesRef = useRef(null)
  const arena = useScreenShake()
  const [promoGlow, setPromoGlow] = useState(false)
  const promoTimer = useRef(0)

  const playSfx = useCallback((kind) => {
    if (!settings.sounds) return
    sfx[kind]?.(settings.volume ?? 0.7)
  }, [settings.sounds, settings.volume])

  // éclats de capture : coords pixel précises remontées par le board (1re case prise).
  const onCaptureFx = useCallback((x, y) => {
    particlesRef.current?.burst(x, y)
  }, [])

  const game = useDraughtsGame({
    rules, initialMode: mode, initialDiff: diff,
    onMove: ({ capture, mv }) => {
      playSfx(capture ? 'capture' : 'move')
      // rafle multiple (≥2 prises) → micro-secousse ; sinon le burst de poussière suffit.
      if (capture && mv?.caps && mv.caps.length >= 2) arena.shake(4)
      // journal local pour la revue/replay (positions rejouables côté UI).
      if (mv) setMvLog(prev => [...prev, mv])
    },
    onPromote: () => {
      playSfx('promote')
      arena.shake(5)
      setPromoGlow(true)
      clearTimeout(promoTimer.current)
      promoTimer.current = setTimeout(() => setPromoGlow(false), 620)
    },
    onEnd: (st) => {
      // En solo, l'humain joue toujours le camp Foncé (P).
      if (st.draw) playSfx('lose')
      else if (mode === 'ai') playSfx(st.winner === P ? 'win' : 'lose')
      else playSfx('win')
    },
  })

  useEffect(() => () => clearTimeout(promoTimer.current), [])

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
    setConfirmResign(false); setPromoGlow(false)
    setMvLog([]); setRevueIdx(null); setPlaying(false)
    game.newGame(opts)
  }, [game])

  // Garde le journal local synchronisé avec le moteur en cas d'annulation (undo) :
  // si le nb de coups officiel diminue, on tronque d'autant.
  useEffect(() => {
    setMvLog(prev => (prev.length > game.moves.length ? prev.slice(0, game.moves.length) : prev))
    if (revueIdx != null) setRevueIdx(r => Math.min(r, game.moves.length))
  }, [game.moves.length]) // eslint-disable-line react-hooks/exhaustive-deps

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

  // lumière d'arène : warm = camp Clair au trait, cool = camp Foncé, null si terminé.
  const turnLight = game.gameOver ? null : (game.turn === M ? 'warm' : 'cool')

  // ── Revue / Replay (Dames) ──────────────────────────────────────────────────
  // La revue n'est disponible qu'en partie terminée (jamais pendant le jeu live).
  const totalPlies = mvLog.length
  const enRevue = revueIdx != null && revueIdx < totalPlies
  // Reconstruit le plateau après `revueIdx` demi-coups en rejouant le journal via le moteur.
  const revuePos = useMemo(() => {
    if (revueIdx == null) return null
    const r = Math.max(0, Math.min(totalPlies, revueIdx))
    let b = initBoard(rules)
    let last = null
    for (let i = 0; i < r; i++) {
      const mv = mvLog[i]; if (!mv) break
      const res = applyMove(b, mv, rules)
      b = res.board; last = mv
    }
    return { board: b, last }
  }, [revueIdx, totalPlies, mvLog, rules])

  // Auto-play : avance la revue à intervalle dépendant de la vitesse ; stoppe à la fin.
  useEffect(() => {
    if (!playing || revueIdx == null) return
    if (revueIdx >= totalPlies) { setPlaying(false); return }
    const delai = Math.max(200, 950 / (speed || 1))
    const id = setTimeout(() => setRevueIdx(r => Math.min(totalPlies, (r ?? 0) + 1)), delai)
    return () => clearTimeout(id)
  }, [playing, revueIdx, totalPlies, speed])

  // Sécurité : couper le replay si la partie redevient live (nouvelle partie).
  useEffect(() => { if (!game.gameOver) { setPlaying(false); setRevueIdx(null) } }, [game.gameOver])

  const seekRevue = useCallback((plies) => {
    const p = Math.max(0, Math.min(totalPlies, plies))
    setRevueIdx(p)
  }, [totalPlies])

  // Export notation internationale (copie presse-papier + repli/téléchargement .txt).
  const exporter = useCallback(async (kind = 'copie') => {
    const res = game.status?.draw ? 'Nulle'
      : game.status ? `${SIDE_LBL[game.status.winner]} gagne` : null
    const txt = genererNotation(game.moves, { result: res })
    if (kind === 'fichier') { telecharger(txt, 'partie-dames.txt'); return }
    const ok = await copierPresse(txt)
    if (ok) { setCopie(true); setTimeout(() => setCopie(false), 1600) }
    else telecharger(txt, 'partie-dames.txt')
  }, [game.moves, game.status])

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

  // ── Plateau central (overlay particules + halo de promotion en dame) ──
  // En revue : on affiche la position reconstruite (lecture seule), pas le live.
  const enLecture = revueIdx != null
  const boardNode = (
    <div style={{ position: 'relative', width: boardSize, height: boardSize }}>
      <Particles ref={particlesRef} />
      <DraughtsBoard
        board={enLecture ? revuePos.board : game.board} accent={accent}
        boardTheme={settings.boardTheme}
        selected={enLecture ? null : game.selected} legalMoves={enLecture ? [] : game.legalMoves}
        last={enLecture ? revuePos.last : game.last} hint={enLecture ? null : game.hint}
        movableKeys={enLecture ? new Set() : movableKeys}
        interactive={enLecture ? false : myTurn} gameOver={enLecture ? true : game.gameOver}
        coordsOn={settings.coords} highlightsOn={settings.highlights}
        animOn={settings.animations} animMult={animMult}
        maxSize={boardSize} onCaptureFx={enLecture ? undefined : onCaptureFx}
        onSquareClick={enLecture ? undefined : game.handleSquare}
      />
      {/* halo or de promotion en dame (sobre, transitoire) */}
      <div aria-hidden style={{
        position: 'absolute', inset: -2, borderRadius: 10, pointerEvents: 'none', zIndex: 4,
        boxShadow: promoGlow && !game.gameOver ? eventGlow('promotion') : 'none',
        transition: 'box-shadow 280ms ease',
      }} />
      {/* badge de revue */}
      {enLecture && (
        <div style={{
          position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)', zIndex: 9,
          padding: '4px 12px', borderRadius: ui.radius.pill, background: 'rgba(8,9,12,0.82)',
          border: `1px solid ${accent}`, fontFamily: fonts.body, fontWeight: 700, fontSize: 11, color: accent, whiteSpace: 'nowrap',
        }}>Revue · {revueIdx === 0 ? 'position initiale' : `coup ${revueIdx}/${totalPlies}`}</div>
      )}
      {game.gameOver && game.status && !enLecture && (
        <EndOverlay
          status={game.status} mode={mode} humanSide={game.humanSide} accent={accent}
          moves={game.moves.length} captures={lostFonce + lostClair}
          onReview={totalPlies > 0 ? () => { seekRevue(0); setPlaying(true) } : undefined}
          onRematch={() => restartWith({ mode, diff })}
        />
      )}
    </div>
  )

  // ── Rail gauche : modes · trait + horloge · captures par camp ──
  const leftRail = (
    <>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        <Segment items={MODES} value={mode} onChange={changeMode} accent={accent} size="sm" />
        {mode === 'ai' && <Segment items={LEVELS} value={diff} onChange={changeDiff} accent={accent} size="sm" />}
      </div>

      {/* indicateur de trait + horloge */}
      <div style={{ background: ui.surface, border: `1px solid ${ui.line}`, borderRadius: ui.radius.md, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <Dot side={game.turn} size={24} />
        {aiThinking && <ThinkDot accent={accent} />}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: 15, color: ui.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{turnText}</div>
          <div style={{ fontFamily: fonts.body, fontSize: 11, color: ui.textMute, letterSpacing: '.3px', marginTop: 1 }}>
            {mode === 'ai' ? `Solo · ${LEVELS.find(l => l[0] === diff)?.[1] || ''}` : '2 joueurs'}
          </div>
        </div>
        <span title="Durée de la partie" style={{ fontFamily: fonts.mono, fontVariantNumeric: 'tabular-nums', fontWeight: 600, fontSize: 13.5, color: ui.textDim, paddingLeft: 11, borderLeft: `1px solid ${ui.line}` }}>{mm}:{ss}</span>
      </div>

      {/* captures par camp */}
      <div style={{ display: 'flex', gap: 10 }}>
        {[[P, game.counts[P], lostFonce], [M, game.counts[M], lostClair]].map(([side, alive, lost]) => (
          <div key={side} style={{ flex: 1, background: ui.surface, border: `1px solid ${ui.line}`, borderRadius: ui.radius.md, padding: '10px 12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <Dot side={side} size={16} />
              <span style={{ fontSize: 9.5, letterSpacing: 1.3, textTransform: 'uppercase', color: ui.textMute, fontWeight: 700 }}>{SIDE_LBL[side]}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 6 }}>
              <span style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: 22, lineHeight: 1, color: ui.text, fontVariantNumeric: 'tabular-nums' }}>{alive}</span>
              <span style={{ fontFamily: fonts.body, fontSize: 11, color: ui.textMute }}>en jeu</span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginTop: 8, minHeight: 8 }}>
              {Array.from({ length: lost }).map((_, i) => <span key={i} aria-hidden style={{ width: 7, height: 7, borderRadius: '50%', background: `radial-gradient(circle at 36% 30%, ${SIDE_PC[side].haut}, ${SIDE_PC[side].base})`, opacity: 0.85 }} />)}
            </div>
          </div>
        ))}
      </div>
    </>
  )

  // ── Rail droit : liste de coups (scroll) · contrôles · menu ──
  const rightRail = (
    <>
      <div style={{ flex: 1, minHeight: 120, display: 'flex' }}>
        <MoveList moves={game.moves} accent={accent} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9 }}>
        <Btn variant="primary" accent={accent} full onClick={() => restartWith({ mode, diff })}>Nouvelle partie</Btn>
        <Btn accent={accent} full disabled={!myTurn} onClick={game.hint} title={game.hinting ? 'Recherche…' : 'Meilleur coup'}>{game.hinting ? 'Recherche…' : 'Indice'}</Btn>
        {mode === 'ai' && <Btn accent={accent} full disabled={!game.canUndo || aiThinking} onClick={game.undo}>Annuler</Btn>}
        <Btn accent={accent} full danger disabled={game.gameOver} onClick={() => setConfirmResign(true)}>Abandonner</Btn>
      </div>

      {/* Replay : disponible une fois la partie terminée (jamais pendant le jeu live). */}
      {game.gameOver && totalPlies > 0 && (
        <ReplayScrubber
          index={revueIdx == null ? totalPlies : revueIdx}
          total={totalPlies}
          onSeek={seekRevue}
          playing={playing}
          onTogglePlay={() => {
            if (playing) { setPlaying(false); return }
            // (re)lance depuis le début si on est en bout de partie (live/final).
            if (revueIdx == null || revueIdx >= totalPlies) seekRevue(0)
            setPlaying(true)
          }}
          speed={speed}
          onSpeed={setSpeed}
          accent={accent}
        />
      )}

      {/* Export notation internationale. */}
      {game.moves.length > 0 && (
        <div style={{ display: 'flex', gap: 8 }}>
          <Btn accent={accent} full onClick={() => exporter('copie')} title="Copier la notation">
            {copie ? 'Copié ✓' : 'Exporter'}
          </Btn>
          <Btn accent={accent} onClick={() => exporter('fichier')} title="Télécharger .txt" aria-label="Télécharger">↓ .txt</Btn>
        </div>
      )}

      <p style={{ margin: 0, fontFamily: fonts.body, fontSize: 11, lineHeight: 1.5, color: ui.textMute }}>
        Dames internationales 10×10 · prise maximale obligatoire · dames volantes.
      </p>
    </>
  )

  return (
    <div style={{ position: 'absolute', inset: 0, ...arena.style }}>
      <ArenaLayout turn={turnLight} mobile={mobile} left={leftRail} board={boardNode} right={rightRail} />

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
    <div style={{ flex: 1, minHeight: 0, background: ui.surface, border: `1px solid ${ui.line}`, borderRadius: ui.radius.md, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 13px', borderBottom: `1px solid ${ui.line}`, flexShrink: 0 }}>
        <span style={{ fontSize: 10, letterSpacing: 1.4, textTransform: 'uppercase', color: ui.textDim, fontWeight: 700 }}>Coups</span>
        <span style={{ fontFamily: fonts.mono, fontVariantNumeric: 'tabular-nums', fontSize: 11, color: ui.textMute }}>{moves.length}</span>
      </div>
      <div ref={ref} style={{ flex: 1, minHeight: 74, overflowY: 'auto', padding: '6px 6px 8px' }}>
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
function EndOverlay({ status, mode, humanSide, accent, moves, captures, onRematch, onReview }) {
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
        <div style={{ display: 'flex', gap: 10 }}>
          {onReview && <Btn accent={accent} full onClick={onReview}>Revoir</Btn>}
          <Btn variant="primary" accent={accent} full onClick={onRematch}>Rejouer</Btn>
        </div>
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
