// ── SpectatorList : « Regarder en direct » (LECTURE SEULE STRICTE) ───────────
// Liste des parties classées EN COURS (échecs + dames) puis vue spectateur passive :
// board non-interactif, liste de coups live, horloges/compteur, mis à jour par
// Realtime. AUCUN contrôle de jeu (pas d'abandon/nulle/coup) — un spectateur ne
// peut RIEN écrire. Lecture des parties via REST direct (anti-hang supabase-js,
// même pattern que hubLive.fetchVoiceLive / api.rest), Realtime via supabase pour
// le live. Côté sécurité : on ne lit que des colonnes de jeu publiques exposées par
// la policy RLS spectator (20260624_spectator.sql) — jamais d'email/secret.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Chess } from 'chess.js'
import { supabase } from '../../../lib/supabase.js'
import { SB_URL, SB_KEY, getAccessToken, sbRpc } from '../../../lib/supabaseRest.js'
import { ui, fonts } from '../../../features/games/neutralTheme.js'
import MiniBoard, { FEN_INITIALE } from '../../chess/ui/MiniBoard.jsx'
import MoveList from '../../chess/ui/MoveList.jsx'
import { useChessSettings } from '../../chess/logic/useChessSettings.js'
import DraughtsBoard from '../../draughts/board/DraughtsBoard.jsx'
import { useDraughtsSettings } from '../../draughts/logic/useDraughtsSettings.js'
import { countPieces, P, M, VARIANTES } from '../../../features/dames/engine/draughts-engine.js'

// ── REST direct (anti-hang) : lecture seule, jamais d'écriture ───────────────
async function restGet(path) {
  if (!SB_URL || !SB_KEY) return []
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 8000)
  try {
    const token = await getAccessToken().catch(() => null)
    const res = await fetch(`${SB_URL}/rest/v1/${path}`, {
      method: 'GET', signal: ctrl.signal,
      headers: { apikey: SB_KEY, Authorization: `Bearer ${token || SB_KEY}`, Accept: 'application/json' },
    })
    if (!res.ok) return []
    const data = await res.json().catch(() => [])
    return Array.isArray(data) ? data : []
  } catch { return [] }
  finally { clearTimeout(timer) }
}

const formaterTemps = (ms) => {
  if (ms == null) return '—:—'
  const s = Math.max(0, Math.floor(ms / 1000))
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

// ── Liste : échecs (echecs_parties statut=en_cours) ──────────────────────────
async function listChess(limit = 24) {
  const cols = 'id,blanc_pseudo,blanc_avatar,blanc_elo,noir_pseudo,noir_avatar,noir_elo,cadence,statut,created_at'
  const rows = await restGet(`echecs_parties?select=${cols}&statut=eq.en_cours&order=created_at.desc&limit=${limit}`)
  return rows.map(r => ({
    id: r.id, kind: 'chess',
    a: { pseudo: r.blanc_pseudo || 'Blanc', avatar: r.blanc_avatar, elo: r.blanc_elo },
    b: { pseudo: r.noir_pseudo || 'Noir', avatar: r.noir_avatar, elo: r.noir_elo },
    meta: r.cadence || '—',
  }))
}

// ── Liste : dames (RPC SECURITY DEFINER) ─────────────────────────────────────
// dames_rmatches ne stocke QUE des identifiants Discord (pas de pseudo/avatar/ELO
// dénormalisés) → on passe par la RPC dames_spectate_list qui résout les pseudos
// publics + ELO côté serveur (scopée status='active'). Voir 20260624_spectator.sql.
async function listDraughts(limit = 24) {
  const r = await sbRpc('dames_spectate_list', { p_limit: limit }, { tag: 'spectate' })
  const rows = r?.ok ? (r.rows || []) : []
  return rows.map(m => ({
    id: m.id, kind: 'draughts',
    a: { pseudo: m.pirate?.username || 'Foncé', avatar: m.pirate?.avatar, elo: m.pirate?.rating },
    b: { pseudo: m.marine?.username || 'Clair', avatar: m.marine?.avatar, elo: m.marine?.rating },
    meta: (m.variante || '10x10').replace('x', '×'),
  }))
}

function Avatar({ src, name }) {
  return src
    ? <img src={src} alt="" loading="lazy" style={{ width: 28, height: 28, borderRadius: ui.radius.sm, objectFit: 'cover', flexShrink: 0, border: `1px solid ${ui.line}` }} />
    : <div style={{ width: 28, height: 28, borderRadius: ui.radius.sm, flexShrink: 0, background: ui.bg, border: `1px solid ${ui.line}`, display: 'grid', placeItems: 'center', font: `700 11px ${fonts.body}`, color: ui.textMute }}>{(name || '?').slice(0, 1).toUpperCase()}</div>
}

function Ligne({ p, accent }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
      <Avatar src={p.avatar} name={p.pseudo} />
      <span style={{ font: `700 13px ${fonts.body}`, color: ui.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.pseudo}</span>
      <span style={{ font: `600 11px ${fonts.mono}`, color: accent, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>{p.elo ?? '—'}</span>
    </div>
  )
}

// ── Vue spectateur ÉCHECS (read-only) ────────────────────────────────────────
function ChessSpectator({ partieId, accent }) {
  const { reglages } = useChessSettings()
  const [row, setRow] = useState(null)
  const [now, setNow] = useState(Date.now())
  const tick = useRef(null)

  const charger = useCallback(async () => {
    const cols = 'id,blanc_pseudo,blanc_avatar,blanc_elo,noir_pseudo,noir_avatar,noir_elo,fen,pgn,statut,trait,temps_blanc_ms,temps_noir_ms,dernier_coup_at,resultat,cause'
    const rows = await restGet(`echecs_parties?select=${cols}&id=eq.${encodeURIComponent(partieId)}&limit=1`)
    if (rows[0]) setRow(rows[0])
  }, [partieId])

  useEffect(() => { charger() }, [charger])

  // Realtime : MAJ de la partie (chaque coup réécrit fen/pgn/trait/horloges en DB).
  useEffect(() => {
    if (!partieId || !supabase) return undefined
    const ch = supabase.channel(`spectate:echecs:${partieId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'echecs_parties', filter: `id=eq.${partieId}` },
        payload => { if (payload?.new) setRow(payload.new) })
      .subscribe()
    return () => { try { supabase.removeChannel(ch) } catch { /* */ } }
  }, [partieId])

  // Horloge visuelle (décompte du joueur au trait, à partir des timestamps serveur).
  useEffect(() => {
    tick.current = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(tick.current)
  }, [])

  const historique = useMemo(() => {
    if (!row?.pgn) return []
    try { const c = new Chess(); c.loadPgn(row.pgn); return c.history({ verbose: true }) } catch { return [] }
  }, [row?.pgn])

  if (!row) return <div style={{ textAlign: 'center', padding: 40, color: ui.textDim, font: `500 13.5px ${fonts.body}` }}>Chargement de la partie…</div>

  const enCours = row.statut === 'en_cours'
  const ecoule = enCours ? Math.max(0, now - new Date(row.dernier_coup_at).getTime()) : 0
  const tB = row.trait === 'blanc' && enCours ? row.temps_blanc_ms - ecoule : row.temps_blanc_ms
  const tN = row.trait === 'noir' && enCours ? row.temps_noir_ms - ecoule : row.temps_noir_ms

  const Pendule = ({ pseudo, elo, ms, actif }) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '8px 12px', borderRadius: ui.radius.sm, background: actif ? ui.surfaceHi : ui.surface, border: `1px solid ${actif ? ui.lineHi : ui.line}` }}>
      <span style={{ font: `700 13px ${fonts.body}`, color: ui.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pseudo} <span style={{ font: `600 11px ${fonts.mono}`, color: ui.textMute }}>{elo ?? '—'}</span></span>
      <span style={{ font: `700 19px ${fonts.mono}`, color: actif ? ui.text : ui.textDim, fontVariantNumeric: 'tabular-nums' }}>{formaterTemps(Math.max(0, ms))}</span>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, justifyContent: 'center', padding: '8px 4px 24px' }}>
      <div style={{ flexShrink: 0 }}>
        <MiniBoard fen={row.fen || FEN_INITIALE} taille={Math.min(440, (typeof window !== 'undefined' ? window.innerWidth : 440) - 36)} boardId={reglages.board} orientation="white" coords={reglages.coords} />
      </div>
      <div style={{ width: 300, maxWidth: '100%', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Pendule pseudo={row.noir_pseudo || 'Noir'} elo={row.noir_elo} ms={tN} actif={enCours && row.trait === 'noir'} />
        <div style={{ padding: '6px 12px', borderRadius: ui.radius.sm, background: ui.surface, border: `1px solid ${ui.line}`, font: `600 12px ${fonts.body}`, color: ui.textDim, textAlign: 'center' }}>
          {enCours ? `Trait : ${row.trait === 'blanc' ? 'Blancs' : 'Noirs'}` : 'Partie terminée'} · spectateur
        </div>
        <div style={{ flex: 1, minHeight: 160, display: 'flex' }}>
          <MoveList historique={historique} curseur={historique.length - 1} onAller={() => {}} />
        </div>
        <Pendule pseudo={row.blanc_pseudo || 'Blanc'} elo={row.blanc_elo} ms={tB} actif={enCours && row.trait === 'blanc'} />
      </div>
    </div>
  )
}

// ── Vue spectateur DAMES (read-only) ─────────────────────────────────────────
function DraughtsSpectator({ partieId, accent }) {
  const { settings } = useDraughtsSettings()
  const [match, setMatch] = useState(null)
  const [last, setLast] = useState(null)

  const charger = useCallback(async () => {
    const r = await sbRpc('dames_spectate_match', { p_match_id: partieId }, { tag: 'spectate' })
    if (r?.ok && r.match) setMatch(r.match)
  }, [partieId])

  useEffect(() => { charger() }, [charger])

  // Realtime : coups insérés (board_after autoritaire) + MAJ de la partie (fin).
  useEffect(() => {
    if (!partieId || !supabase) return undefined
    const ch = supabase.channel(`spectate:dames:${partieId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'dames_rmoves', filter: `match_id=eq.${partieId}` },
        p => { const r = p.new; if (!r) return; setLast(r.move || null); setMatch(m => m ? { ...m, board_state: r.board_after, current_turn: r.player === P ? M : P, ply: r.ply } : m) })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'dames_rmatches', filter: `id=eq.${partieId}` },
        // On ne fusionne QUE l'état de jeu (la ligne brute n'a pas pirate/marine résolus).
        p => { const n = p.new; if (!n) return; setMatch(m => m ? { ...m, board_state: n.board_state, current_turn: n.current_turn, ply: n.ply, status: n.status, winner: n.winner } : m) })
      .subscribe()
    return () => { try { supabase.removeChannel(ch) } catch { /* */ } }
  }, [partieId])

  if (!match) return <div style={{ textAlign: 'center', padding: 40, color: ui.textDim, font: `500 13.5px ${fonts.body}` }}>Chargement de la partie…</div>

  const variante = match.variante || '10x10'
  const size = (VARIANTES[variante] || VARIANTES['10x10']).size
  const startMen = (VARIANTES[variante] || VARIANTES['10x10']).men
  const board = match.board_state
  const cntP = board ? countPieces(board, P) : startMen
  const cntM = board ? countPieces(board, M) : startMen
  const active = match.status === 'active'

  const Stat = ({ name, elo, alive, turn }) => (
    <div style={{ flex: 1, minWidth: 0, padding: '10px 12px', borderRadius: ui.radius.md, background: turn ? ui.surfaceHi : ui.surface, border: `1px solid ${turn ? ui.lineHi : ui.line}` }}>
      <div style={{ font: `700 12.5px ${fonts.body}`, color: ui.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name || 'Joueur'}</div>
      <div style={{ marginTop: 4, font: `600 12px ${fonts.mono}`, color: ui.textDim, fontVariantNumeric: 'tabular-nums' }}>{alive} pions · {elo != null ? `${elo} ELO` : '—'}</div>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, justifyContent: 'center', padding: '8px 4px 24px' }}>
      <div style={{ flex: '1 1 420px', minWidth: 280, maxWidth: 560 }}>
        <DraughtsBoard
          board={board} size={size} accent={accent}
          boardTheme={settings.boardTheme}
          last={last}
          interactive={false} gameOver
          coordsOn={settings.coords} highlightsOn={false} animOn={settings.animations}
        />
      </div>
      <div style={{ width: 300, maxWidth: '100%', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', gap: 10 }}>
          <Stat name={match.pirate?.username} elo={match.pirate?.rating} alive={cntP} turn={active && match.current_turn === P} />
          <Stat name={match.marine?.username} elo={match.marine?.rating} alive={cntM} turn={active && match.current_turn === M} />
        </div>
        <div style={{ padding: '8px 12px', borderRadius: ui.radius.sm, background: ui.surface, border: `1px solid ${ui.line}`, font: `600 12.5px ${fonts.body}`, color: ui.textDim, textAlign: 'center' }}>
          {active ? `Coups joués : ${match.ply ?? 0} · trait ${match.current_turn === P ? 'Foncé' : 'Clair'}` : 'Partie terminée'} · spectateur
        </div>
      </div>
    </div>
  )
}

// ── Composant principal ──────────────────────────────────────────────────────
// game : 'chess' | 'draughts' (filtre la liste au jeu courant). onRetour : ferme.
export default function SpectatorList({ game = 'chess', accent = ui.accent, onRetour }) {
  const [parties, setParties] = useState(null)   // null = chargement
  const [actif, setActif] = useState(null)        // { id, kind } partie regardée
  const aliveRef = useRef(true)

  const charger = useCallback(async () => {
    const rows = game === 'draughts' ? await listDraughts() : await listChess()
    if (aliveRef.current) setParties(rows)
  }, [game])

  useEffect(() => {
    aliveRef.current = true
    charger()
    const poll = setInterval(charger, 15000)   // rafraîchit la liste (parties qui commencent/finissent)
    return () => { aliveRef.current = false; clearInterval(poll) }
  }, [charger])

  // ── Vue d'une partie regardée ──
  if (actif) {
    return (
      <div style={{ minHeight: '100%', padding: '10px 8px 30px' }}>
        <style>{`.arene-spectate button:focus-visible{outline:2px solid ${accent};outline-offset:2px}`}</style>
        <div className="arene-spectate" style={{ maxWidth: 820, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, font: `700 12px ${fonts.body}`, color: ui.textDim }}>
              <span aria-hidden style={{ width: 8, height: 8, borderRadius: '50%', background: ui.bad, boxShadow: `0 0 0 3px ${ui.bad}22` }} />
              EN DIRECT · lecture seule
            </span>
            <button onClick={() => setActif(null)} style={{ padding: '8px 14px', borderRadius: ui.radius.sm, cursor: 'pointer', font: `600 12.5px ${fonts.body}`, color: ui.textDim, background: 'transparent', border: `1px solid ${ui.line}` }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = ui.lineHi }} onMouseLeave={e => { e.currentTarget.style.borderColor = ui.line }}>
              ← Retour aux parties
            </button>
          </div>
          {actif.kind === 'draughts'
            ? <DraughtsSpectator partieId={actif.id} accent={accent} />
            : <ChessSpectator partieId={actif.id} accent={accent} />}
        </div>
      </div>
    )
  }

  // ── Liste ──
  return (
    <div style={{ minHeight: '100%', padding: 'clamp(10px,2vw,24px)' }}>
      <style>{`.arene-spectate button:focus-visible{outline:2px solid ${accent};outline-offset:2px}`}</style>
      <div className="arene-spectate" style={{ maxWidth: 720, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
          <h2 style={{ margin: 0, font: `800 22px ${fonts.display}`, letterSpacing: '-0.02em', color: ui.text }}>Regarder en direct</h2>
          {onRetour && (
            <button onClick={onRetour} style={{ padding: '8px 14px', borderRadius: ui.radius.sm, cursor: 'pointer', font: `600 12.5px ${fonts.body}`, color: ui.textMute, background: 'transparent', border: `1px solid ${ui.line}` }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = ui.lineHi }} onMouseLeave={e => { e.currentTarget.style.borderColor = ui.line }}>
              ← Retour
            </button>
          )}
        </div>

        {parties === null ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[0, 1, 2].map(i => <div key={i} aria-hidden style={{ height: 58, borderRadius: ui.radius.md, background: ui.surface, border: `1px solid ${ui.line}`, opacity: 0.6 }} />)}
          </div>
        ) : parties.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 16px', color: ui.textMute, font: `500 13.5px ${fonts.body}`, background: ui.surface, border: `1px solid ${ui.line}`, borderRadius: ui.radius.lg }}>
            Aucune partie classée en cours pour l'instant. Reviens dans un moment !
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {parties.map(p => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: '11px 14px', background: ui.surface, border: `1px solid ${ui.line}`, borderRadius: ui.radius.md }}>
                <div style={{ flex: '1 1 380px', minWidth: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Ligne p={p.a} accent={accent} />
                  <span style={{ font: `600 11px ${fonts.mono}`, color: ui.textMute, flexShrink: 0 }}>vs</span>
                  <Ligne p={p.b} accent={accent} />
                </div>
                <span style={{ font: `600 11px ${fonts.mono}`, color: ui.textDim, padding: '3px 9px', borderRadius: ui.radius.pill, background: ui.bg, border: `1px solid ${ui.line}`, flexShrink: 0 }}>{p.meta}</span>
                <button onClick={() => setActif({ id: p.id, kind: p.kind })} style={{ flexShrink: 0, padding: '9px 16px', borderRadius: ui.radius.sm, cursor: 'pointer', font: `700 12.5px ${fonts.body}`, color: ui.accentInk, background: accent, border: 'none', transition: 'filter .15s' }}
                  onMouseEnter={e => { e.currentTarget.style.filter = 'brightness(1.08)' }} onMouseLeave={e => { e.currentTarget.style.filter = 'none' }}>
                  Regarder
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
