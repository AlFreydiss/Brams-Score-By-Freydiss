// ── Dames en ligne classé — SERVEUR AUTORITAIRE (anti-triche) ────────────────
// Le coup soumis par le client est REJOUÉ avec le MÊME moteur (draughts-engine.js)
// pour vérifier qu'il est légal (rafle maximale comprise) avant d'être appliqué.
// Écrit board_state + dames_rmoves + flip tour + fin de partie + ELO. Le Realtime
// (postgres_changes sur dames_rmatches/dames_rmoves) pousse l'état aux 2 clients.
//   POST /api/dames?tool=move  { matchId, move }   (Authorization: Bearer <jwt>)
import { generateMoves, applyMove, gameStatus, opp, P, M } from '../src/features/dames/engine/draughts-engine.js'

const SUPABASE_URL = 'https://zeqetrmulqndxugfbojd.supabase.co'
const ANON = () => process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''

function svcHeaders(prefer = 'return=representation') {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) throw Object.assign(new Error('SUPABASE_SERVICE_ROLE_KEY manquant'), { status: 503 })
  return { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Prefer: prefer }
}
async function rest(path, { method = 'GET', body, prefer } = {}) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { method, headers: svcHeaders(prefer), body: body === undefined ? undefined : JSON.stringify(body) })
  const t = await r.text()
  if (!r.ok) throw Object.assign(new Error(`Supabase ${r.status}: ${t.slice(0, 160)}`), { status: 502 })
  return t ? JSON.parse(t) : null
}
function discordOf(user) {
  const d = user?.identities?.find(i => i.provider === 'discord')
  return user?.user_metadata?.provider_id ?? user?.user_metadata?.custom_claims?.provider_id ?? d?.identity_data?.provider_id ?? d?.identity_data?.sub ?? d?.id ?? null
}
async function authUser(req) {
  const anon = ANON(); if (!anon) throw Object.assign(new Error('anon key manquante'), { status: 503 })
  const h = String(req.headers.authorization || req.headers.Authorization || '')
  const token = h.toLowerCase().startsWith('bearer ') ? h.slice(7).trim() : ''
  if (!token) throw Object.assign(new Error('Connexion requise'), { status: 401 })
  const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { apikey: anon, Authorization: `Bearer ${token}` } })
  if (!r.ok) throw Object.assign(new Error('Session invalide'), { status: 401 })
  const user = await r.json(); const did = discordOf(user)
  if (!did) throw Object.assign(new Error('Compte Discord requis'), { status: 403 })
  return String(did)
}
function readBody(req) { if (!req.body) return {}; if (typeof req.body === 'object') return req.body; try { return JSON.parse(req.body) } catch { return {} } }

function expected(a, b) { return 1 / (1 + Math.pow(10, (b - a) / 400)) }
function newElo(r, opR, score, games) { return Math.round(r + (games < 30 ? 32 : 24) * (score - expected(r, opR))) }

async function applyRating(did, oppDid, score) { // score: 1 win / .5 draw / 0 loss
  const rows = await rest(`dames_ratings?discord_id=in.(${encodeURIComponent(did)},${encodeURIComponent(oppDid)})&select=*`)
  const me = rows.find(x => x.discord_id === did) || { discord_id: did, rating: 1200, peak_rating: 1200, games: 0, wins: 0, losses: 0, draws: 0 }
  const op = rows.find(x => x.discord_id === oppDid) || { discord_id: oppDid, rating: 1200, peak_rating: 1200, games: 0, wins: 0, losses: 0, draws: 0 }
  const nr = newElo(me.rating, op.rating, score, me.games)
  const delta = nr - me.rating
  await rest('dames_ratings?on_conflict=discord_id', {
    method: 'POST', prefer: 'resolution=merge-duplicates,return=minimal',
    body: [{ discord_id: did, rating: nr, peak_rating: Math.max(me.peak_rating || 1200, nr), games: me.games + 1, wins: me.wins + (score === 1 ? 1 : 0), losses: me.losses + (score === 0 ? 1 : 0), draws: me.draws + (score === 0.5 ? 1 : 0), updated_at: new Date().toISOString() }],
  })
  return delta
}

async function submitMove(req, res) {
  const did = await authUser(req)
  const { matchId, move } = readBody(req)
  if (!matchId || !move) return res.status(400).json({ error: 'matchId + move requis' })
  const rows = await rest(`dames_rmatches?id=eq.${encodeURIComponent(matchId)}&select=*`)
  const m = rows && rows[0]
  if (!m) return res.status(404).json({ error: 'Partie introuvable' })
  if (m.status !== 'active') return res.status(409).json({ error: 'Partie terminée' })
  const myColor = m.player_pirate === did ? P : m.player_marine === did ? M : null
  if (!myColor) return res.status(403).json({ error: 'Pas ta partie' })
  if (m.current_turn !== myColor) return res.status(409).json({ error: 'Pas ton tour' })

  // ── VALIDATION moteur : le coup doit être dans les coups légaux (rafle max) ──
  const legal = generateMoves(m.board_state, myColor)
  const srv = legal.find(L => L.from[0] === move.from[0] && L.from[1] === move.from[1] && L.to[0] === move.to[0] && L.to[1] === move.to[1] && (L.caps?.length || 0) === (move.caps?.length || 0))
  if (!srv) return res.status(422).json({ error: 'Coup illégal (rejeté par le serveur)' })

  const { board: nb, promoted } = applyMove(m.board_state, srv)
  const next = opp(myColor)
  const over = gameStatus(nb, next).over
  const ply = (m.ply || 0) + 1
  const patch = { board_state: nb, current_turn: over ? m.current_turn : next, ply, last_move_at: new Date().toISOString() }
  let eloChange = null, winner = null
  if (over) {
    winner = myColor; patch.status = 'finished'; patch.winner = winner; patch.ended_at = new Date().toISOString()
    if (m.rated) {
      const winDid = did, loseDid = myColor === m.current_turn ? (myColor === P ? m.player_marine : m.player_pirate) : null
      const opponent = myColor === P ? m.player_marine : m.player_pirate
      const dWin = await applyRating(winDid, opponent, 1)
      const dLose = await applyRating(opponent, winDid, 0)
      patch.elo_change_pirate = myColor === P ? dWin : dLose
      patch.elo_change_marine = myColor === M ? dWin : dLose
      eloChange = { pirate: patch.elo_change_pirate, marine: patch.elo_change_marine }
      void loseDid
    }
  }
  await rest('dames_rmoves', { method: 'POST', prefer: 'return=minimal', body: [{ match_id: matchId, ply, player: myColor, move: srv, board_after: nb }] })
  await rest(`dames_rmatches?id=eq.${encodeURIComponent(matchId)}`, { method: 'PATCH', prefer: 'return=minimal', body: patch })
  return res.status(200).json({ ok: true, board: nb, turn: patch.current_turn, status: patch.status || 'active', winner, promoted, eloChange })
}

async function resign(req, res) {
  const did = await authUser(req)
  const { matchId } = readBody(req)
  const rows = await rest(`dames_rmatches?id=eq.${encodeURIComponent(matchId)}&select=*`)
  const m = rows && rows[0]
  if (!m) return res.status(404).json({ error: 'Partie introuvable' })
  if (m.status !== 'active') return res.status(200).json({ ok: true, already: true })
  const myColor = m.player_pirate === did ? P : m.player_marine === did ? M : null
  if (!myColor) return res.status(403).json({ error: 'Pas ta partie' })
  const winner = opp(myColor); const opponent = myColor === P ? m.player_marine : m.player_pirate
  const patch = { status: 'finished', winner, ended_at: new Date().toISOString() }
  if (m.rated) {
    const dW = await applyRating(opponent, did, 1); const dL = await applyRating(did, opponent, 0)
    patch.elo_change_pirate = myColor === P ? dL : dW; patch.elo_change_marine = myColor === M ? dL : dW
  }
  await rest(`dames_rmatches?id=eq.${encodeURIComponent(matchId)}`, { method: 'PATCH', prefer: 'return=minimal', body: patch })
  return res.status(200).json({ ok: true, winner })
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*'); res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS'); res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type')
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })
  const tool = String(req.query.tool || '')
  try {
    if (tool === 'move') return await submitMove(req, res)
    if (tool === 'resign') return await resign(req, res)
    return res.status(404).json({ error: 'tool inconnu' })
  } catch (e) {
    return res.status(e.status || 500).json({ error: e?.message || 'Erreur' })
  }
}
