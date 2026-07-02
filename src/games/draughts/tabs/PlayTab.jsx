// ─────────────────────────────────────────────────────────────────────────────
// PlayTab (Dames) — layout « clone chess.com », 2D STRICTE (zéro R3F).
//   • Pré-partie : config 2 colonnes pleine largeur — aperçu du damier à gauche
//     (DraughtsBoard non interactif, suit la variante), panneau SOLIDE dcc.panel
//     à droite (MODE / VARIANTE / NIVEAU IA / lancer).
//   • Partie : colonne board = barre adversaire (haut) · plateau · barre joueur
//     (bas), panneau SOLIDE à droite (indicateur de trait, liste de coups en
//     notation internationale 1–50, contrôles, replay, export, menu, COACH_SLOT).
//   • Mobile (<880) : board au-dessus, panneau dessous.
//   • Chrome = tokens dcc (charbon froid, accent bleu-acier #6f8fb0) — pendant
//     Dames du chesscom.js des Échecs. Le format board/coups moteur est INCHANGÉ
//     (l'online en dépend) : useDraughtsGame + DraughtsBoard intouchés.
//   • Juice conservé : poussière de capture (Particles), micro-shake rafle/promo,
//     halo or de promotion. Tout dégrade sous prefers-reduced-motion.
//   • Modes : vs IA (4 niveaux) · 2 joueurs local · en ligne classé (flux à part,
//     early return inchangé). Variantes : 10×10 internationales · 8×8.
// Styles inline only.
// ─────────────────────────────────────────────────────────────────────────────
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { ui, fonts, damesPieces } from '../../../features/games/neutralTheme.js'
import { P, M, initBoard, applyMove, rulesFromVariante } from '../../../features/dames/engine/draughts-engine.js'
import DraughtsBoard from '../board/DraughtsBoard.jsx'
import { useDraughtsGame, LEVELS } from '../logic/useDraughtsGame.js'
import { useDraughtsSettings, SPEED_MULT } from '../logic/useDraughtsSettings.js'
import { sfx } from '../logic/sfx.js'
import { Segment, Btn } from '../ui/controls.jsx'
import { dcc, dccPlayerBar, dccGlobalCss } from '../ui/dcc.js'
import DraughtsOnline from '../online/DraughtsOnline.jsx'
import Particles from '../../_shell/arena/Particles.jsx'
import ReplayScrubber from '../../_shell/arena/ReplayScrubber.jsx'
import { useScreenShake, eventGlow } from '../../_shell/arena/fx.js'
import { genererNotation, copierPresse, telecharger } from '../logic/exportNotation.js'
import DraughtsCoachPanel from '../coach/DraughtsCoachPanel.jsx'
import DraughtsAnalysisPanel from '../analysis/DraughtsAnalysisPanel.jsx'

const SIDE_LBL = { [P]: 'Foncé', [M]: 'Clair' }
const SIDE_PC = { [P]: damesPieces.fonce, [M]: damesPieces.clair }
const MODES = [['ai', 'Solo (IA)'], ['local', '2 joueurs'], ['online', 'En ligne']]
// Mode pré-sélectionné depuis une île du Nouveau Monde (solo/ami/classe → ai/local/online).
const ISLAND_MODE = { solo: 'ai', ami: 'local', classe: 'online' }

// Variantes jouables (catalogue moteur VARIANTES) — libellés + description.
const VARIANTE_META = {
  '10x10': {
    label: 'Internationales', sub: '10×10 · 20 pions',
    desc: 'Dames internationales 10×10 · prise maximale obligatoire · dames volantes.',
  },
  '8x8': {
    label: 'Brésiliennes', sub: '8×8 · 12 pions',
    desc: 'Dames 8×8 (brésiliennes) · prise maximale obligatoire · dames volantes.',
  },
}

function Dot({ side, size = 14 }) {
  const pc = SIDE_PC[side]
  return <span aria-hidden style={{ width: size, height: size, borderRadius: '50%', flexShrink: 0, background: `radial-gradient(circle at 36% 30%, ${pc.haut}, ${pc.base})`, boxShadow: `0 0 0 1px ${ui.lineHi}, inset 0 -2px 3px rgba(0,0,0,.4)` }} />
}

// ── Breakpoints du layout chess.com : empilé < 880, sinon 2 colonnes.
//    Largeur du panneau droit : 300 sur petit desktop, 340 en grand.
function calcViewportJeu() {
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1280
  return { vw, mobile: vw < 880, panneauW: vw < 1180 ? 300 : 340 }
}
function useViewportJeu() {
  const [v, setV] = useState(calcViewportJeu)
  useEffect(() => {
    const on = () => setV(calcViewportJeu())
    window.addEventListener('resize', on)
    window.addEventListener('orientationchange', on)
    return () => { window.removeEventListener('resize', on); window.removeEventListener('orientationchange', on) }
  }, [])
  return v
}

// ── Taille responsive du plateau : aussi grand que possible, borné par la
//    largeur restante (après le panneau) ET la hauteur (header + 2 barres joueur).
function useBoardSize() {
  const [taille, setTaille] = useState(480)
  useEffect(() => {
    const calc = () => {
      const vw = window.innerWidth, vh = window.innerHeight
      const mobile = vw < 880
      let dispoLargeur, dispoHauteur, plafond
      if (mobile) {
        dispoLargeur = vw - 20
        dispoHauteur = vh - 250      // header + 2 barres joueur + marges
        plafond = 720
      } else {
        const panneau = vw < 1180 ? 300 : 340
        dispoLargeur = vw - panneau - 96
        dispoHauteur = vh - 200      // header (~56) + 2 barres joueur (~96) + paddings
        plafond = 780
      }
      setTaille(Math.floor(Math.max(280, Math.min(plafond, dispoLargeur, dispoHauteur))))
    }
    calc()
    window.addEventListener('resize', calc)
    window.addEventListener('orientationchange', calc)
    return () => { window.removeEventListener('resize', calc); window.removeEventListener('orientationchange', calc) }
  }, [])
  return taille
}

// ── Taille de l'aperçu damier de la config (≈ moitié gauche, borné). ──
function useApercuSize() {
  const [sz, setSz] = useState(420)
  useEffect(() => {
    const calc = () => {
      const vw = window.innerWidth, vh = window.innerHeight
      if (vw < 880) setSz(Math.floor(Math.max(220, Math.min(380, vw - 56))))
      else setSz(Math.floor(Math.max(300, Math.min(560, (vw - 500 - 160) * 0.62, vh - 170))))
    }
    calc()
    window.addEventListener('resize', calc)
    return () => window.removeEventListener('resize', calc)
  }, [])
  return sz
}

// ── Atomes de la config (chips solides sur dcc.panel) ──
function SectionLabel({ children }) {
  return <div style={{ font: `700 11px ${fonts.body}`, letterSpacing: '0.09em', textTransform: 'uppercase', color: dcc.textMute, margin: '0 0 9px' }}>{children}</div>
}

function Chip({ actif, onClick, children, sub }) {
  return (
    <button type="button" onClick={onClick} className="dcc-focus dcc-motion" aria-pressed={actif} style={{
      padding: '10px 13px', borderRadius: dcc.radius.sm, cursor: 'pointer', textAlign: 'left',
      background: actif ? `${dcc.accent}29` : dcc.panelHi,
      border: `1px solid ${actif ? dcc.accent : dcc.line}`,
      transition: 'background .15s, border-color .15s', minWidth: 0,
    }}>
      <span style={{ display: 'block', font: `700 13px ${fonts.body}`, color: actif ? dcc.text : dcc.textDim }}>{children}</span>
      {sub && <span style={{ display: 'block', font: `500 11px ${fonts.mono}`, color: dcc.textMute, marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>{sub}</span>}
    </button>
  )
}

// ── Barre joueur chess.com : pastille camp + nom + prises + horloge (au trait). ──
function PlayerBar({ side, name, active, thinking, capturedCount, capturedSide, timer }) {
  return (
    <div className="dcc-motion" style={{ ...dccPlayerBar(active), transition: 'background .18s, border-color .18s' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
        <Dot side={side} size={26} />
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <span style={{ font: `700 13px ${fonts.body}`, color: dcc.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</span>
            {thinking && <ThinkDot accent={dcc.accent} />}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 5, marginTop: 3, minHeight: 9 }}>
            <span style={{ font: `600 10px ${fonts.body}`, letterSpacing: '0.08em', textTransform: 'uppercase', color: dcc.textMute }}>{SIDE_LBL[side]}</span>
            {capturedCount > 0 && (
              <span style={{ display: 'inline-flex', flexWrap: 'wrap', gap: 3, marginLeft: 4 }} title={`${capturedCount} prise${capturedCount > 1 ? 's' : ''}`}>
                {Array.from({ length: capturedCount }).map((_, i) => (
                  <span key={i} aria-hidden style={{ width: 7, height: 7, borderRadius: '50%', background: `radial-gradient(circle at 36% 30%, ${SIDE_PC[capturedSide].haut}, ${SIDE_PC[capturedSide].base})`, boxShadow: `0 0 0 1px ${dcc.line}` }} />
                ))}
              </span>
            )}
          </div>
        </div>
      </div>
      {timer != null && (
        <span title="Durée de la partie" style={{
          font: `600 14px ${fonts.mono}`, fontVariantNumeric: 'tabular-nums', flexShrink: 0,
          color: active ? dcc.text : dcc.textMute, padding: '4px 10px', borderRadius: dcc.radius.sm,
          background: active ? `${dcc.accent}22` : 'transparent',
          border: `1px solid ${active ? `${dcc.accent}55` : 'transparent'}`,
        }}>{timer}</span>
      )}
    </div>
  )
}

export default function PlayTab({ accent = dcc.accent }) {
  const loc = useLocation()
  const { settings } = useDraughtsSettings()
  const [phase, setPhase] = useState('config')                 // 'config' | 'game'
  const [variante, setVariante] = useState('10x10')            // '10x10' | '8x8'
  // règles moteur dérivées de la variante (prise max forcée + dames volantes toujours ON)
  const rules = useMemo(() => rulesFromVariante(variante), [variante])
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
  const [coachHint, setCoachHint] = useState(null)  // coup suggéré par le coach, surligné sur le board

  const boardSize = useBoardSize()
  const { mobile, panneauW } = useViewportJeu()
  const apercuSize = useApercuSize()

  // ── Juice : particules de capture + micro-shake (rafle / promotion) + halo promotion ──
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
    setMvLog([]); setRevueIdx(null); setPlaying(false); setCoachHint(null)
    game.newGame(opts)
  }, [game])

  // Garde le journal local synchronisé avec le moteur en cas d'annulation (undo) :
  // si le nb de coups officiel diminue, on tronque d'autant.
  useEffect(() => {
    setMvLog(prev => (prev.length > game.moves.length ? prev.slice(0, game.moves.length) : prev))
    if (revueIdx != null) setRevueIdx(r => Math.min(r, game.moves.length))
    setCoachHint(null)
  }, [game.moves.length]) // eslint-disable-line react-hooks/exhaustive-deps

  const changeDiff = (d) => { setDiffState(d); game.setDiff(d) }

  // Lancer depuis la config : les rules (variante) sont déjà à jour dans le hook
  // (rulesRef suit la prop au render) → newGame réinitialise sur la bonne taille.
  const lancerPartie = useCallback(() => {
    setPhase('game')
    restartWith({ mode, diff })
  }, [mode, diff, restartWith])

  // Retour menu : on fige l'horloge et on sort de la revue (revuePos rejouerait
  // sinon le journal sur une variante changée en config → coordonnées hors plateau).
  const quitterPartie = useCallback(() => {
    clearInterval(tickRef.current)
    setPlaying(false)
    setRevueIdx(null)
    setConfirmResign(false)
    setPhase('config')
  }, [])

  const movableKeys = useMemo(() => game.movableKeys, [game.movableKeys])
  const animMult = SPEED_MULT[settings.animSpeed] ?? 1

  // indicateur de trait
  const aiThinking = game.thinking
  const turnLbl = SIDE_LBL[game.turn]
  const turnText = mode === 'ai'
    ? (game.turn === game.humanSide ? 'À vous de jouer' : (aiThinking ? `${turnLbl} réfléchit…` : turnLbl))
    : `Au trait : ${turnLbl}`
  const myTurn = !game.gameOver && (mode === 'local' || game.turn === game.humanSide) && !aiThinking

  // captures = pions perdus par chaque camp (20 en 10×10, 12 en 8×8).
  const totalMen = rules.size === 8 ? 12 : 20
  const lostFonce = Math.max(0, totalMen - game.counts[P])
  const lostClair = Math.max(0, totalMen - game.counts[M])

  const mm = String((elapsed / 60) | 0).padStart(2, '0')
  const ss = String(elapsed % 60).padStart(2, '0')

  // ── Revue / Replay (Dames) ──────────────────────────────────────────────────
  // La revue n'est disponible qu'en partie terminée (jamais pendant le jeu live).
  const totalPlies = mvLog.length
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

  // aperçu de la config : position de départ de la variante choisie (lecture seule).
  const previewBoard = useMemo(() => initBoard(rules), [rules])

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

  // ════════════════════════════════════════════════════════════════════════════
  // Config pré-partie : aperçu damier | panneau solide (MODE / VARIANTE / IA / lancer)
  // ════════════════════════════════════════════════════════════════════════════
  if (phase === 'config') {
    const panneauConfig = (
      <div style={{
        width: '100%', maxWidth: mobile ? 540 : 460, flexShrink: 0,
        background: dcc.panel, border: `1px solid ${dcc.panelBorder}`,
        borderRadius: dcc.radius.lg, boxShadow: dcc.shadow, boxSizing: 'border-box',
        padding: mobile ? '22px 20px' : '28px 26px',
        display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ marginBottom: 20 }}>
          <div style={{ font: `700 11px ${fonts.body}`, letterSpacing: '0.16em', textTransform: 'uppercase', color: dcc.accent, marginBottom: 7 }}>Dames</div>
          <h2 style={{ margin: 0, font: `800 26px ${fonts.display}`, letterSpacing: '-0.02em', color: dcc.text, lineHeight: 1.05 }}>
            Nouvelle partie
          </h2>
          <p style={{ margin: '8px 0 0', font: `400 13px ${fonts.body}`, color: dcc.textDim, lineHeight: 1.5 }}>
            Choisis ton mode, ta variante et lance la rencontre.
          </p>
        </div>

        <SectionLabel>Mode</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 22 }}>
          <Chip actif={mode === 'ai'} onClick={() => setMode('ai')} sub="moteur intégré">Solo (IA)</Chip>
          <Chip actif={mode === 'local'} onClick={() => setMode('local')} sub="même écran">2 joueurs</Chip>
          <Chip actif={false} onClick={() => setMode('online')} sub="classé">En ligne</Chip>
        </div>

        <SectionLabel>Variante</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 22 }}>
          {Object.entries(VARIANTE_META).map(([id, v]) => (
            <Chip key={id} actif={variante === id} onClick={() => setVariante(id)} sub={v.sub}>{v.label}</Chip>
          ))}
        </div>

        {mode === 'ai' && (
          <>
            <SectionLabel>Niveau de l'IA</SectionLabel>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px,1fr))', gap: 8, marginBottom: 22 }}>
              {LEVELS.map(([id, label]) => (
                <Chip key={id} actif={diff === id} onClick={() => setDiffState(id)}>{label}</Chip>
              ))}
            </div>
          </>
        )}

        <p style={{ margin: '0 0 18px', font: `400 11.5px ${fonts.body}`, lineHeight: 1.5, color: dcc.textMute }}>
          {VARIANTE_META[variante]?.desc}
        </p>

        <button type="button" onClick={lancerPartie} className="dcc-focus dcc-motion" style={{
          width: '100%', padding: '15px', borderRadius: dcc.radius.md, cursor: 'pointer',
          font: `800 15px ${fonts.display}`, letterSpacing: '0.01em', color: dcc.accentInk,
          background: dcc.accent, border: 'none', transition: 'filter .15s',
          boxShadow: `0 14px 34px -16px ${dcc.accent}b3`,
        }}
          onMouseEnter={e => { e.currentTarget.style.filter = 'brightness(1.1)' }}
          onMouseLeave={e => { e.currentTarget.style.filter = 'none' }}>
          {mode === 'local' ? 'Commencer' : 'Lancer la partie'}
        </button>
      </div>
    )

    const apercu = (
      <div style={{ position: 'relative', width: apercuSize, height: apercuSize, flexShrink: 0 }}>
        <div aria-hidden style={{
          position: 'absolute', inset: -26, borderRadius: 32, pointerEvents: 'none',
          background: `radial-gradient(60% 55% at 50% 50%, ${dcc.accent}24, transparent 72%)`,
        }} />
        <div style={{ position: 'relative', width: apercuSize, height: apercuSize }}>
          <DraughtsBoard
            board={previewBoard} accent={accent} boardTheme={settings.boardTheme}
            interactive={false} gameOver
            coordsOn={settings.coords} highlightsOn={false}
            animOn={false} maxSize={apercuSize}
          />
        </div>
      </div>
    )

    return (
      <div style={{ position: 'absolute', inset: 0, background: dcc.bg, overflowY: 'auto' }}>
        <style>{dccGlobalCss}</style>
        <div style={{
          minHeight: '100%', boxSizing: 'border-box',
          display: 'flex', flexDirection: mobile ? 'column' : 'row',
          alignItems: 'center', justifyContent: 'center',
          gap: mobile ? 22 : 'clamp(36px, 6vw, 90px)',
          padding: mobile ? '20px 14px 36px' : '32px clamp(28px, 5vw, 80px)',
        }}>
          {apercu}
          {panneauConfig}
        </div>
      </div>
    )
  }

  // ════════════════════════════════════════════════════════════════════════════
  // Partie en cours : colonne board (barre · plateau · barre) + panneau solide
  // ════════════════════════════════════════════════════════════════════════════

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
        last={enLecture ? revuePos.last : game.last} hint={enLecture ? null : (game.hintMove || coachHint)}
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
          padding: '4px 12px', borderRadius: dcc.radius.pill, background: 'rgba(8,9,12,0.82)',
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

  // ── Colonne board chess.com : barre adversaire (haut) · plateau · barre joueur (bas) ──
  // Le camp Foncé (P) est toujours en bas du plateau ; en solo l'humain joue Foncé.
  const nomHaut = mode === 'ai' ? `IA — ${LEVELS.find(l => l[0] === (game.diff || diff))?.[1] || ''}` : 'Joueur 2'
  const nomBas = mode === 'ai' ? 'Toi' : 'Joueur 1'
  const timerStr = `${mm}:${ss}`
  const colonneBoard = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: mobile ? '100%' : boardSize, maxWidth: '100%', ...arena.style }}>
      <PlayerBar
        side={M} name={nomHaut}
        active={!game.gameOver && game.turn === M}
        thinking={mode === 'ai' && aiThinking}
        capturedCount={lostFonce} capturedSide={P}
        timer={game.turn === M ? timerStr : null}
      />
      <div style={{ alignSelf: 'center', maxWidth: '100%' }}>{boardNode}</div>
      <PlayerBar
        side={P} name={nomBas}
        active={!game.gameOver && game.turn === P}
        capturedCount={lostClair} capturedSide={M}
        timer={game.turn === P ? timerStr : null}
      />
    </div>
  )

  // ── Panneau latéral chess.com : surface SOLIDE (fini les rails verre dépoli) ──
  const panneauStyle = {
    display: 'flex', flexDirection: 'column', gap: 10,
    background: dcc.panel, border: `1px solid ${dcc.panelBorder}`, borderRadius: dcc.radius.lg,
    boxShadow: dcc.shadow, padding: 12, boxSizing: 'border-box', overflowY: 'auto',
  }

  const panneau = (
    <>
      {/* indicateur de trait + durée */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: dcc.radius.sm, background: dcc.row, border: `1px solid ${dcc.line}` }}>
        <Dot side={game.turn} size={16} />
        {aiThinking && <ThinkDot accent={dcc.accent} />}
        <span style={{ flex: 1, minWidth: 0, font: `600 12.5px ${fonts.body}`, color: dcc.textDim, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {game.gameOver ? 'Partie terminée' : turnText}
        </span>
        <span title="Durée de la partie" style={{ font: `600 12px ${fonts.mono}`, fontVariantNumeric: 'tabular-nums', color: dcc.textMute, flexShrink: 0 }}>{mm}:{ss}</span>
      </div>

      {/* niveau IA modifiable en cours de partie (appliqué au prochain coup de l'IA) */}
      {mode === 'ai' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ font: `700 10px ${fonts.body}`, letterSpacing: '0.09em', textTransform: 'uppercase', color: dcc.textMute }}>Niveau IA</span>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
            {LEVELS.map(([id, label]) => {
              const on = diff === id
              return (
                <button key={id} type="button" onClick={() => changeDiff(id)} className="dcc-focus dcc-motion" aria-pressed={on} style={{
                  padding: '6px 4px', borderRadius: dcc.radius.sm, cursor: 'pointer', textAlign: 'center', minWidth: 0,
                  font: `600 11px ${fonts.body}`, color: on ? dcc.text : dcc.textDim,
                  background: on ? `${dcc.accent}29` : dcc.panelHi,
                  border: `1px solid ${on ? dcc.accent : dcc.line}`,
                  transition: 'background .15s, border-color .15s, color .15s',
                }}>{label}</button>
              )
            })}
          </div>
        </div>
      )}

      {/* historique des coups (notation internationale 1–50) */}
      <div style={{ flex: 1, minHeight: 120, display: 'flex' }}>
        <MoveList moves={game.moves} accent={accent} />
      </div>

      {/* contrôles */}
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

      <button type="button" onClick={quitterPartie} className="dcc-focus dcc-motion" style={{
        padding: '8px', borderRadius: dcc.radius.sm, cursor: 'pointer',
        font: `600 12px ${fonts.body}`, color: dcc.textMute, background: 'transparent',
        border: `1px solid ${dcc.line}`, transition: 'color .15s, border-color .15s',
      }}
        onMouseEnter={e => { e.currentTarget.style.color = dcc.textDim; e.currentTarget.style.borderColor = dcc.lineHi }}
        onMouseLeave={e => { e.currentTarget.style.color = dcc.textMute; e.currentTarget.style.borderColor = dcc.line }}>
        ← Menu
      </button>

      {/* Bilan de partie : analyse moteur post-partie (verdicts, tournant, graphe).
          Monté seulement en fin de partie avec assez de coups ; démonté à la
          relance (gameOver repasse à false) → l'analyse en vol est annulée. */}
      {game.gameOver && totalPlies > 3 && (
        <DraughtsAnalysisPanel
          mvLog={mvLog} rules={rules} revueIdx={revueIdx}
          onAller={seekRevue} accent={accent}
        />
      )}

      <DraughtsCoachPanel
        board={game.board} trait={game.turn} rules={rules} dernierCoup={game.last}
        onHint={setCoachHint} accent={accent} actif={myTurn && !enLecture}
      />
    </>
  )

  return (
    <div style={{ position: 'absolute', inset: 0, background: dcc.bg }}>
      <style>{dccGlobalCss}</style>
      {mobile ? (
        <div style={{
          height: '100%', overflowY: 'auto', boxSizing: 'border-box',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '12px 10px 30px',
        }}>
          <div style={{ width: '100%', maxWidth: Math.max(boardSize, 320) }}>{colonneBoard}</div>
          <div style={{ ...panneauStyle, width: '100%', maxWidth: 480 }}>{panneau}</div>
        </div>
      ) : (
        <div style={{
          height: '100%', boxSizing: 'border-box',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 18, padding: '18px 26px',
        }}>
          {colonneBoard}
          <div style={{ ...panneauStyle, width: panneauW, maxHeight: '94%' }}>{panneau}</div>
        </div>
      )}

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

// ── liste de coups (notation internationale, scrollable) — chrome dcc ──
function MoveList({ moves, accent }) {
  const ref = useRef(null)
  useEffect(() => { if (ref.current) ref.current.scrollTop = ref.current.scrollHeight }, [moves.length])
  // paires (foncé / clair) numérotées.
  const pairs = []
  for (let i = 0; i < moves.length; i += 2) pairs.push([moves[i], moves[i + 1]])
  return (
    <div style={{ flex: 1, minHeight: 0, background: dcc.row, border: `1px solid ${dcc.line}`, borderRadius: dcc.radius.md, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 13px', borderBottom: `1px solid ${dcc.line}`, flexShrink: 0 }}>
        <span style={{ fontSize: 10, letterSpacing: 1.4, textTransform: 'uppercase', color: dcc.textDim, fontWeight: 700 }}>Coups</span>
        <span style={{ fontFamily: fonts.mono, fontVariantNumeric: 'tabular-nums', fontSize: 11, color: dcc.textMute }}>{moves.length}</span>
      </div>
      <div ref={ref} style={{ flex: 1, minHeight: 74, overflowY: 'auto', padding: '6px 6px 8px' }}>
        {pairs.length === 0
          ? <div style={{ padding: '20px 12px', textAlign: 'center', fontFamily: fonts.body, fontSize: 12.5, color: dcc.textMute }}>La partie commence — au camp Foncé de jouer.</div>
          : pairs.map(([a, b], i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '30px 1fr 1fr', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 6, background: i % 2 ? 'transparent' : 'rgba(255,255,255,0.03)' }}>
              <span style={{ fontFamily: fonts.mono, fontSize: 11, color: dcc.textMute, fontVariantNumeric: 'tabular-nums' }}>{i + 1}.</span>
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
    <span style={{ fontFamily: fonts.mono, fontVariantNumeric: 'tabular-nums', fontSize: 13, fontWeight: 600, color: m.capture ? accent : dcc.text, display: 'flex', alignItems: 'center', gap: 6 }}>
      <Dot side={m.side} size={9} />{m.n}
    </span>
  )
}

function ThinkDot({ accent }) {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current; if (!el) return
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches) return
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
