// ─────────────────────────────────────────────────────────────────────────────
// DraughtsOnline — En ligne classé, rendu sur le plateau 2D de l'univers Dames.
// Réutilise INTÉGRALEMENT le netcode de l'ancien online 3D (damesRanked.js) — seul
// le rendu change (DraughtsBoard 2D au lieu du renderer R3F). Serveur autoritaire :
// /api/bot-tools?tool=dames-move rejoue le coup avec le moteur ; le client anime de
// façon optimiste puis se resynchronise sur board_after (vérité serveur) ; les coups
// adverses arrivent par Realtime (subscribeMatch).
//
// CONVERSIONS (identiques au 3D + au serveur) :
//   • board_state (jsonb) === board moteur tel quel : board[r][c] = {side:'P'|'M',king} | null.
//     Aucune transformation — le serveur appelle damesLegal/damesApply directement dessus.
//   • move : objet moteur complet de generateMoves ({from:[r,c], to:[r,c], caps:[[r,c]…],
//     path, isCapture}). Le serveur ne matche que from + to + caps.length → on envoie l'objet
//     entier (comme submitMove(matchId, mv) du flux 3D).
//   • myColor : match.my_color (RPC) ou r.color (matchmake), fallback par discordId
//     (player_pirate===id ? 'P' : player_marine===id ? 'M').
//   • current_turn / status / winner / variante / ply / elo_change_pirate|marine.
// Tokens = neutralTheme · accent bleu-acier (props) · inline only · zéro 3D/R3F.
// ─────────────────────────────────────────────────────────────────────────────
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ui, fonts, damesPieces } from '../../../features/games/neutralTheme.js'
import {
  initBoard, generateMoves, applyMove, countPieces, opp, P, M, VARIANTES, rulesFromVariante,
} from '../../../features/dames/engine/draughts-engine.js'
import {
  ensureRating, matchmake, cancelQueue, getMatch, leaderboard, subscribeMatch, submitMove, resign,
} from '../../../features/dames/online/damesRanked.js'
import { eloToTier, formatPrime } from '../../../lib/dames/damesRank.js'
import { useAuth } from '../../../contexts/AuthContext.jsx'
import { useDraughtsSettings, SPEED_MULT } from '../logic/useDraughtsSettings.js'
import { sfx } from '../logic/sfx.js'
import { Segment, Btn } from '../ui/controls.jsx'
import DraughtsBoard from '../board/DraughtsBoard.jsx'

const SIDE_LBL = { [P]: 'Foncé', [M]: 'Clair' }
const SIDE_PC = { [P]: damesPieces.fonce, [M]: damesPieces.clair }
const VARIANTE_ITEMS = [['10x10', '10×10'], ['8x8', '8×8']]
const POLL_MS = 2500

const cloneBoard = (b) => b.map(row => row.map(c => (c ? { ...c } : null)))

function Dot({ side, size = 14 }) {
  const pc = SIDE_PC[side]
  return <span aria-hidden style={{ width: size, height: size, borderRadius: '50%', flexShrink: 0, background: `radial-gradient(circle at 36% 30%, ${pc.haut}, ${pc.base})`, boxShadow: `0 0 0 1px ${ui.lineHi}, inset 0 -2px 3px rgba(0,0,0,.4)` }} />
}

// Détermine mon camp depuis la ligne match (RPC) ou un fallback par discordId.
function colorFromMatch(m, discordId) {
  if (!m) return P
  if (m.my_color === P || m.my_color === M) return m.my_color
  if (discordId && m.player_pirate === discordId) return P
  if (discordId && m.player_marine === discordId) return M
  return P
}

export default function DraughtsOnline({ accent = ui.accent }) {
  const { isAuthenticated, discordId, signInWithDiscord } = useAuth()
  const { settings } = useDraughtsSettings()
  const animMult = SPEED_MULT[settings.animSpeed] ?? 1

  const [phase, setPhase] = useState('menu')           // menu | searching | playing | finished
  const [variante, setVariante] = useState('10x10')
  const [rating, setRating] = useState(null)
  const [oppRating, setOppRating] = useState(null)
  const [opponent, setOpponent] = useState(null)
  const [lb, setLb] = useState([])
  const [waited, setWaited] = useState(0)
  const [err, setErr] = useState(null)
  const [confirmResign, setConfirmResign] = useState(false)
  const [result, setResult] = useState(null)           // { winner, myDelta }

  // Miroir React pour le rendu du plateau.
  const [view, setView] = useState({ board: null, turn: P, selected: null, legalMoves: [], movableKeys: new Set(), last: null, status: 'active' })

  // Noyau mutable (évite les re-renders en cascade pendant l'anim/le netcode).
  const G = useRef({ matchId: null, myColor: P, board: null, turn: P, ply: 0, status: 'active', locked: false, variante: '10x10', rules: rulesFromVariante('10x10'), legalMoves: [], movableKeys: new Set(), selected: null, last: null })
  const aliveRef = useRef(true)
  const unsubRef = useRef(null)
  const pollRef = useRef(0)

  const playSfx = useCallback((kind) => { if (settings.sounds) sfx[kind]?.(settings.volume ?? 0.7) }, [settings.sounds, settings.volume])

  const syncView = useCallback(() => {
    const g = G.current
    setView({ board: g.board ? g.board.map(r => r.slice()) : null, turn: g.turn, selected: g.selected, legalMoves: g.legalMoves, movableKeys: g.movableKeys, last: g.last, status: g.status })
  }, [])

  // Recalcule les coups légaux locaux pour l'UX (sélection, surbrillances).
  const refreshLocal = useCallback(() => {
    const g = G.current
    g.legalMoves = (g.status === 'active' && g.turn === g.myColor) ? generateMoves(g.board, g.myColor, g.rules) : []
    g.movableKeys = new Set(g.legalMoves.map(m => m.from[0] + '_' + m.from[1]))
    g.selected = null
    syncView()
  }, [syncView])

  const loadLb = useCallback(() => { leaderboard(30).then(rows => { if (aliveRef.current) setLb(rows) }).catch(() => {}) }, [])

  useEffect(() => {
    aliveRef.current = true
    loadLb()
    if (isAuthenticated) ensureRating().then(r => { if (aliveRef.current) setRating(r) }).catch(() => {})
    return () => { aliveRef.current = false }
  }, [isAuthenticated, loadLb])

  // Chrono de recherche.
  useEffect(() => {
    if (phase !== 'searching') { setWaited(0); return }
    const t = setInterval(() => setWaited(w => w + 1), 1000)
    return () => clearInterval(t)
  }, [phase])

  const finish = useCallback((m) => {
    const g = G.current
    g.status = 'finished'; g.locked = true
    const delta = g.myColor === P ? m.elo_change_pirate : m.elo_change_marine
    setResult({ winner: m.winner, myDelta: typeof delta === 'number' ? delta : null })
    setPhase('finished'); syncView(); loadLb()
    ensureRating().then(r => { if (aliveRef.current) setRating(r) }).catch(() => {})
    playSfx(m.winner === 'draw' ? 'lose' : m.winner === g.myColor ? 'win' : 'lose')
  }, [syncView, loadLb, playSfx])

  // Resync dur sur l'état serveur (après rejet de coup / abandon).
  const resync = useCallback(async () => {
    const g = G.current
    const m = await getMatch(g.matchId)
    if (!m || !aliveRef.current) return
    g.variante = m.variante || '10x10'; g.rules = rulesFromVariante(g.variante)
    g.board = m.board_state; g.turn = m.current_turn; g.ply = m.ply || 0; g.status = m.status; g.locked = false
    refreshLocal()
    if (m.status === 'finished') finish(m)
  }, [refreshLocal, finish])

  // Coup adverse reçu via Realtime → on applique board_after (autoritaire) + anime.
  const onRemoteMove = useCallback((row) => {
    const g = G.current
    if (!row || g.status !== 'active') return
    if (row.player === g.myColor) { if (row.ply > g.ply) g.ply = row.ply; return }  // echo de mon coup
    if (row.ply <= g.ply) return
    const cap = !!(row.move?.caps && row.move.caps.length)
    g.board = row.board_after; g.turn = g.myColor; g.ply = row.ply; g.last = row.move
    playSfx(cap ? 'capture' : 'move')
    refreshLocal()
  }, [refreshLocal, playSfx])

  // Mon coup : applique localement (optimiste) → envoie → réconcilie sur le serveur.
  const playMyMove = useCallback(async (mv) => {
    const g = G.current
    g.locked = true; g.selected = null
    const { board: nb, promoted } = applyMove(g.board, mv, g.rules)
    g.board = nb; g.turn = opp(g.myColor); g.ply += 1; g.last = mv
    playSfx(mv.caps && mv.caps.length ? 'capture' : 'move')
    if (promoted) playSfx('promote')
    g.legalMoves = []; g.movableKeys = new Set()
    syncView()
    const res = await submitMove(g.matchId, mv)
    if (!aliveRef.current) return
    if (res?.error) {
      setErr(res.error); setTimeout(() => { if (aliveRef.current) setErr(null) }, 2800)
      await resync()
      return
    }
    // Réconcilie sur le plateau serveur (vérité) — devrait être identique à l'optimiste.
    if (res.board) { g.board = res.board; g.ply = (g.ply) }
    g.locked = false
    if (res.status === 'finished') {
      const m = await getMatch(g.matchId)
      if (m && aliveRef.current) finish(m)
    } else {
      refreshLocal()
    }
  }, [playSfx, syncView, resync, refreshLocal, finish])

  // Sélection / coup (copié de useDraughtsGame.handleSquare, adapté online).
  const handleSquare = useCallback((r, c) => {
    const g = G.current
    if (g.locked || g.status !== 'active' || g.turn !== g.myColor) return
    const key = r + '_' + c
    if (g.selected) {
      const mv = g.legalMoves.find(m => m.from[0] === g.selected[0] && m.from[1] === g.selected[1] && m.to[0] === r && m.to[1] === c)
      if (mv) { playMyMove(mv); return }
      if (g.movableKeys.has(key)) { g.selected = [r, c]; playSfx('select'); syncView(); return }
      g.selected = null; syncView(); return
    }
    if (g.movableKeys.has(key)) { g.selected = [r, c]; playSfx('select'); syncView() }
  }, [playMyMove, syncView, playSfx])

  // Entrée en match : charge l'état + s'abonne au Realtime.
  const enterMatch = useCallback(async (matchId, color) => {
    const g = G.current
    g.matchId = matchId; g.myColor = (color === P || color === M) ? color : P; g.last = null; g.locked = false
    setErr(null); setResult(null); setConfirmResign(false); setPhase('playing')
    const m = await getMatch(matchId)
    if (!m || !aliveRef.current) return
    g.myColor = colorFromMatch(m, discordId) || g.myColor
    g.variante = m.variante || '10x10'; g.rules = rulesFromVariante(g.variante)
    g.board = m.board_state; g.turn = m.current_turn; g.ply = m.ply || 0; g.status = m.status
    setOpponent(m.opponent || null)
    if (m.opponent?.rating != null) setOppRating(m.opponent.rating)
    refreshLocal()
    if (m.status === 'finished') { finish(m); return }
    if (unsubRef.current) { unsubRef.current(); unsubRef.current = null }
    unsubRef.current = subscribeMatch(matchId, {
      onMove: onRemoteMove,
      onMatch: (rowm) => { if (rowm.status === 'finished') getMatch(matchId).then(mm => { if (mm && aliveRef.current) finish(mm) }) },
    })
  }, [discordId, refreshLocal, finish, onRemoteMove])

  // Reprise d'une partie active au montage.
  useEffect(() => {
    if (!isAuthenticated) return
    getMatch(null).then(m => { if (m && aliveRef.current && m.status === 'active') enterMatch(m.id, colorFromMatch(m, discordId)) }).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated])

  // Nettoyage : désabonnement + sortie de file.
  useEffect(() => () => { if (unsubRef.current) { try { unsubRef.current() } catch { /* */ } } clearInterval(pollRef.current) }, [])

  const search = useCallback(async () => {
    if (!isAuthenticated) { setErr('Connecte-toi pour jouer en ligne.'); return }
    setErr(null); setResult(null); setPhase('searching')
    const startBoard = () => initBoard(rulesFromVariante(variante))
    const r = await matchmake(startBoard(), variante)
    if (!aliveRef.current) return
    if (r?.matched) { enterMatch(r.match_id, r.color); return }
    if (r?.ok === false) { setErr(r.error || 'Matchmaking indisponible'); setPhase('menu'); return }
    clearInterval(pollRef.current)
    pollRef.current = setInterval(async () => {
      const rr = await matchmake(startBoard(), variante)
      if (rr?.matched) { clearInterval(pollRef.current); if (aliveRef.current) enterMatch(rr.match_id, rr.color) }
    }, POLL_MS)
  }, [isAuthenticated, variante, enterMatch])

  const cancel = useCallback(async () => { clearInterval(pollRef.current); await cancelQueue().catch(() => {}); if (aliveRef.current) setPhase('menu') }, [])

  const doResign = useCallback(async () => {
    const g = G.current
    if (g.status !== 'active') return
    await resign(g.matchId).catch(() => {})
    await resync()
  }, [resync])

  // Retour au menu : on laisse la partie tourner côté serveur (comme les échecs).
  const leaveToMenu = useCallback(() => {
    if (unsubRef.current) { try { unsubRef.current() } catch { /* */ } unsubRef.current = null }
    const g = G.current
    g.matchId = null; g.board = null; g.status = 'active'; g.last = null; g.selected = null
    setResult(null); setOpponent(null); setOppRating(null); setConfirmResign(false)
    setPhase('menu')
    if (isAuthenticated) ensureRating().then(r => { if (aliveRef.current) setRating(r) }).catch(() => {})
  }, [isAuthenticated])

  // ── AUTH GATE ───────────────────────────────────────────────────────────────
  if (!isAuthenticated) {
    return (
      <div style={{ minHeight: '100%', padding: 'clamp(20px,4vw,48px)', display: 'flex', justifyContent: 'center', alignItems: 'flex-start' }}>
        <div style={{ width: '100%', maxWidth: 460, background: ui.surface, border: `1px solid ${ui.line}`, borderRadius: ui.radius.lg, padding: 30, textAlign: 'center', boxShadow: ui.shadow }}>
          <div aria-hidden style={{ width: 38, height: 4, borderRadius: 2, background: accent, margin: '0 auto 18px' }} />
          <h2 style={{ margin: 0, fontFamily: fonts.display, fontWeight: 800, fontSize: 22, color: ui.text }}>Connexion requise</h2>
          <p style={{ margin: '10px 0 22px', fontFamily: fonts.body, fontSize: 13.5, lineHeight: 1.55, color: ui.textDim }}>
            Connecte-toi avec Discord pour jouer en partie classée et apparaître au classement ELO.
          </p>
          <Btn variant="primary" accent={accent} full onClick={() => signInWithDiscord()}>Se connecter avec Discord</Btn>
        </div>
      </div>
    )
  }

  // ── MENU / RECHERCHE ──────────────────────────────────────────────────────────
  if (phase === 'menu' || phase === 'searching') {
    const tier = rating ? eloToTier(rating.rating) : null
    return (
      <div style={{ minHeight: '100%', padding: 'clamp(16px,2.6vw,34px)', display: 'flex', justifyContent: 'center' }}>
        <div style={{ width: '100%', maxWidth: 560, display: 'flex', flexDirection: 'column', gap: 16 }}>

          <div style={{ background: ui.surface, border: `1px solid ${ui.line}`, borderRadius: ui.radius.lg, padding: 26, textAlign: 'center', boxShadow: ui.shadow }}>
            <div style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: 20, color: ui.text, marginBottom: 6 }}>Partie classée</div>
            {tier
              ? <div style={{ fontSize: 13, color: ui.textDim, marginBottom: 18 }}><span style={{ color: tier.color, fontWeight: 800 }}>{tier.emoji} {tier.label}</span> · <strong style={{ color: accent }}>{formatPrime(tier.prime)}</strong> · {rating.rating} ELO · {rating.wins ?? 0}V {rating.losses ?? 0}D {rating.draws ?? 0}N</div>
              : <div style={{ fontSize: 13, color: ui.textDim, marginBottom: 18 }}>Ton ELO : <strong style={{ color: accent }}>—</strong></div>}

            {phase === 'menu' && (
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 18 }}>
                <Segment items={VARIANTE_ITEMS} value={variante} onChange={setVariante} accent={accent} />
              </div>
            )}

            {err && <div role="alert" style={{ color: ui.bad, fontSize: 13, marginBottom: 14 }}>{err}</div>}

            {phase === 'searching'
              ? (
                <div>
                  <div style={{ fontFamily: fonts.body, fontSize: 15, color: ui.text, marginBottom: 14 }}>Recherche d'un adversaire… ({waited}s)</div>
                  <Btn accent={accent} onClick={cancel}>Annuler la recherche</Btn>
                </div>
              )
              : <Btn variant="primary" accent={accent} full onClick={search}>Trouver une partie</Btn>}
          </div>

          {/* Classement ELO */}
          <div style={{ background: ui.surface, border: `1px solid ${ui.line}`, borderRadius: ui.radius.lg, overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: `1px solid ${ui.line}`, fontSize: 10.5, letterSpacing: 1.4, textTransform: 'uppercase', color: ui.textDim, fontWeight: 700 }}>Classement ELO</div>
            <div style={{ padding: 8 }}>
              {lb.length === 0
                ? <div style={{ color: ui.textMute, fontSize: 13, textAlign: 'center', padding: 14 }}>Aucune partie classée — sois le premier !</div>
                : lb.map((r, i) => {
                  const t = eloToTier(r.rating)
                  return (
                    <div key={r.discord_id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 8px', borderRadius: 8, background: i < 3 ? `${accent}10` : 'transparent' }}>
                      <span style={{ width: 20, textAlign: 'center', fontWeight: 900, color: i === 0 ? accent : ui.textMute }}>{i + 1}</span>
                      <span style={{ width: 26, height: 26, borderRadius: '50%', overflow: 'hidden', background: ui.surfaceHi, display: 'grid', placeItems: 'center', fontSize: 11, color: ui.text, flexShrink: 0 }}>
                        {r.avatar ? <img loading="lazy" decoding="async" src={r.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (r.username || '?').slice(0, 2).toUpperCase()}
                      </span>
                      <span style={{ flex: 1, color: ui.text, fontWeight: 600, fontSize: 13.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.username}</span>
                      <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', lineHeight: 1.15 }}>
                        <span style={{ color: t.color, fontWeight: 800, fontSize: 12.5 }}>{t.emoji} {formatPrime(t.prime)}</span>
                        <span style={{ color: ui.textMute, fontSize: 10 }}>{r.rating} ELO</span>
                      </span>
                    </div>
                  )
                })}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── PLAYING / FINISHED ────────────────────────────────────────────────────────
  const g = G.current
  const myColor = g.myColor
  const oppColor = opp(myColor)
  const startMen = (VARIANTES[g.variante] || VARIANTES['10x10']).men
  const size = (VARIANTES[g.variante] || VARIANTES['10x10']).size
  const cntMine = view.board ? countPieces(view.board, myColor) : startMen
  const cntOpp = view.board ? countPieces(view.board, oppColor) : startMen
  const lostMine = Math.max(0, startMen - cntMine)
  const lostOpp = Math.max(0, startMen - cntOpp)
  const myTurn = view.status === 'active' && view.turn === myColor
  const finished = phase === 'finished' && !!result
  const won = result && result.winner === myColor
  const myTier = rating ? eloToTier(rating.rating) : null

  const turnText = view.status !== 'active'
    ? 'Partie terminée'
    : myTurn ? 'À vous de jouer' : "Tour de l'adversaire…"

  return (
    <div style={{ minHeight: '100%', padding: 'clamp(14px,2.4vw,30px)', display: 'flex', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: 1180, display: 'flex', flexWrap: 'wrap', gap: 'clamp(16px,2vw,26px)', alignItems: 'flex-start' }}>

        {/* ── colonne plateau ── */}
        <div style={{ flex: '1 1 460px', minWidth: 300, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontFamily: fonts.body, fontSize: 13, color: ui.textDim, flexWrap: 'wrap' }}>
            Tu joues <Dot side={myColor} size={12} /><strong style={{ color: ui.text }}>{SIDE_LBL[myColor]}</strong>
            <span style={{ opacity: .4 }}>·</span> vs <strong style={{ color: ui.text }}>{opponent?.username || 'Adversaire'}</strong>
            <span style={{ marginLeft: 'auto', padding: '3px 10px', borderRadius: ui.radius.pill, background: ui.surface, border: `1px solid ${ui.line}`, fontSize: 12, color: ui.textMute }}>{(VARIANTES[g.variante] ? g.variante.replace('x', '×') : '10×10')}</span>
          </div>

          <div style={{ position: 'relative', width: '100%' }}>
            <DraughtsBoard
              board={view.board} size={size} accent={accent}
              boardTheme={settings.boardTheme}
              selected={view.selected} legalMoves={view.legalMoves} last={view.last}
              movableKeys={view.movableKeys} interactive={myTurn && !g.locked} gameOver={view.status !== 'active'}
              coordsOn={settings.coords} highlightsOn={settings.highlights}
              animOn={settings.animations} animMult={animMult}
              onSquareClick={handleSquare}
            />
            {err && (
              <div role="alert" style={{ position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)', background: ui.surfaceHi, border: `1px solid ${ui.bad}80`, color: '#f3c9c0', padding: '7px 16px', borderRadius: ui.radius.pill, fontSize: 13, fontWeight: 700, zIndex: 10 }}>{err}</div>
            )}
            {finished && (
              <EndOverlay result={result} won={won} accent={accent} moves={g.ply} captures={lostMine + lostOpp} tier={myTier}
                onRematch={leaveToMenu} onMenu={leaveToMenu} />
            )}
          </div>
        </div>

        {/* ── panneau latéral ── */}
        <aside style={{ flex: '1 1 280px', minWidth: 260, maxWidth: 360, display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* indicateur de trait */}
          <div style={{ background: ui.surface, border: `1px solid ${ui.line}`, borderRadius: ui.radius.lg, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <Dot side={view.turn} size={26} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: 16, color: myTurn ? ui.good : ui.text }}>{turnText}</div>
              <div style={{ fontFamily: fonts.body, fontSize: 11.5, color: ui.textMute, letterSpacing: '.3px', marginTop: 1 }}>Coups : {g.ply}</div>
            </div>
          </div>

          {/* ratings joueurs */}
          <div style={{ display: 'flex', gap: 12 }}>
            {[
              { side: myColor, label: 'Toi', alive: cntMine, lost: lostMine, rt: rating?.rating },
              { side: oppColor, label: opponent?.username || 'Adversaire', alive: cntOpp, lost: lostOpp, rt: oppRating },
            ].map((p) => (
              <div key={p.side} style={{ flex: 1, background: ui.surface, border: `1px solid ${ui.line}`, borderRadius: ui.radius.md, padding: '11px 13px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Dot side={p.side} size={18} />
                  <span style={{ fontSize: 10, letterSpacing: 1.2, textTransform: 'uppercase', color: ui.textMute, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.label}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 7, marginTop: 7 }}>
                  <span style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: 24, lineHeight: 1, color: ui.text, fontVariantNumeric: 'tabular-nums' }}>{p.alive}</span>
                  <span style={{ fontFamily: fonts.body, fontSize: 11.5, color: ui.textMute }}>en jeu</span>
                </div>
                <div style={{ marginTop: 6, fontFamily: fonts.mono, fontSize: 11.5, color: ui.textDim }}>{p.rt != null ? `${p.rt} ELO` : '—'}</div>
              </div>
            ))}
          </div>

          {/* contrôles */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9 }}>
            {finished
              ? <Btn variant="primary" accent={accent} full onClick={leaveToMenu}>Nouvelle recherche</Btn>
              : <Btn accent={accent} full danger disabled={view.status !== 'active'} onClick={() => setConfirmResign(true)}>Abandonner</Btn>}
            <Btn accent={accent} full onClick={leaveToMenu}>← Menu</Btn>
          </div>
          <p style={{ margin: 0, fontFamily: fonts.body, fontSize: 11.5, lineHeight: 1.5, color: ui.textMute }}>
            Classé · serveur autoritaire · prise maximale obligatoire · dames volantes.
          </p>
        </aside>
      </div>

      {confirmResign && (
        <ConfirmDialog
          accent={accent}
          title="Abandonner la partie ?"
          desc={`La victoire ira à ${opponent?.username || 'ton adversaire'} et ton ELO baissera.`}
          onCancel={() => setConfirmResign(false)}
          onConfirm={() => { setConfirmResign(false); doResign() }}
        />
      )}
    </div>
  )
}

// ── overlay de fin (sobre, miroir de PlayTab.EndOverlay) ──
function EndOverlay({ result, won, accent, moves, captures, tier, onRematch, onMenu }) {
  const ref = useRef(null)
  useEffect(() => { ref.current?.focus() }, [])
  const draw = result.winner === 'draw'
  const title = draw ? 'Partie nulle' : won ? 'Victoire' : 'Défaite'
  const tone = draw ? ui.textDim : won ? ui.good : ui.bad
  const reason = draw ? 'Aucun camp n’a pu forcer la décision.' : won ? 'Victoire en partie classée.' : 'Défaite en partie classée.'
  const delta = result.myDelta
  return (
    <div role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} ref={ref}
      style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', background: 'rgba(7,8,11,.72)', backdropFilter: 'blur(3px)', borderRadius: 8, outline: 'none', zIndex: 12, padding: 16 }}>
      <div style={{ width: 'min(360px, 92%)', background: ui.bgElev, border: `1px solid ${ui.lineHi}`, borderRadius: ui.radius.lg, padding: 26, textAlign: 'center', boxShadow: ui.shadow }}>
        <div aria-hidden style={{ width: 38, height: 4, borderRadius: 2, background: tone, margin: '0 auto 16px' }} />
        <h2 style={{ margin: 0, fontFamily: fonts.display, fontWeight: 800, fontSize: 26, color: ui.text, letterSpacing: '.2px' }}>{title}</h2>
        <p style={{ margin: '8px 0 16px', fontFamily: fonts.body, fontSize: 13.5, lineHeight: 1.5, color: ui.textDim }}>{reason}</p>

        {typeof delta === 'number' && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '7px 16px', borderRadius: ui.radius.pill, background: ui.surface, border: `1px solid ${ui.line}`, marginBottom: 16 }}>
            <span style={{ fontFamily: fonts.mono, fontWeight: 800, fontSize: 16, color: delta >= 0 ? ui.good : ui.bad }}>{delta >= 0 ? '+' : ''}{delta} ELO</span>
            {tier && <span style={{ fontSize: 12, color: tier.color, fontWeight: 700 }}>{tier.emoji} {formatPrime(tier.prime)}</span>}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'center', gap: 22, marginBottom: 20 }}>
          {[['Coups', moves], ['Prises', captures]].map(([k, v]) => (
            <div key={k}>
              <div style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: 22, color: ui.text, fontVariantNumeric: 'tabular-nums' }}>{v}</div>
              <div style={{ fontSize: 10, letterSpacing: 1.3, textTransform: 'uppercase', color: ui.textMute, fontWeight: 700, marginTop: 2 }}>{k}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <Btn variant="primary" accent={accent} full onClick={onRematch}>Nouvelle recherche</Btn>
          <Btn accent={accent} full onClick={onMenu}>Menu</Btn>
        </div>
      </div>
    </div>
  )
}

// ── confirmation générique (miroir de PlayTab.ConfirmDialog) ──
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
