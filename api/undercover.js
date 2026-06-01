// API Undercover — la partie SECRÈTE (rôles + mots) est gérée côté serveur pour
// que PERSONNE (pas même l'hôte) ne puisse voir les rôles des autres en inspectant
// le réseau. Le JSONB public `tournament_rooms.rounds` ne contient aucun secret.
//   POST ?action=assign   (hôte) → tire les rôles/mots, écrit undercover_secrets,
//                                   pose l'état public (reveal).
//   POST ?action=resolve  (hôte) → dépouille le vote, élimine, vérifie la victoire.
// Les secrets vivent dans undercover_secrets (RLS : chacun lit sa ligne ; écriture
// réservée au service_role = cette API).
const SUPABASE_URL = process.env.SUPABASE_REST_URL || process.env.VITE_SUPABASE_URL || 'https://zeqetrmulqndxugfbojd.supabase.co'
const ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ANON_KEY

const PAIRS = [
  ['Broly', 'Zoro'], ['Vegeta', 'Sasuke'], ['Goku', 'Luffy'], ['Kaneki', 'Shinichi'],
  ['Senku', 'Lawliet (L)'], ['Naruto', 'Asta'], ['Itachi', 'Madara'], ['Gojo', 'Kakashi'],
  ['Eren', 'Lelouch'], ['Saitama', 'Mob'], ['Light', 'Johan'], ['Ichigo', 'Natsu'],
]
const pickWordPair = () => {
  const p = PAIRS[Math.floor(Math.random() * PAIRS.length)]
  return Math.random() < 0.5 ? { civil: p[0], undercover: p[1] } : { civil: p[1], undercover: p[0] }
}
const undercoverCountFor = n => (n <= 6 ? 1 : n <= 9 ? 2 : 3)
const shuffle = a => { const r = [...a]; for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[r[i], r[j]] = [r[j], r[i]] } return r }
const TURN_MS = 30000

function dbHeaders(extra = {}) {
  return { 'Content-Type': 'application/json', apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, ...extra }
}
async function db(path, options = {}) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...options, headers: dbHeaders(options.headers || {}) })
  const text = await r.text()
  let data = null; try { data = text ? JSON.parse(text) : null } catch { data = text }
  if (!r.ok) throw new Error(`DB ${r.status}: ${typeof data === 'string' ? data : JSON.stringify(data)}`)
  return data
}
function json(res, status, body) { res.status(status).json(body) }

async function verifyUser(req) {
  const auth = req.headers.authorization || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null
  if (!token || !ANON_KEY) return null
  try {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { apikey: ANON_KEY, Authorization: `Bearer ${token}` } })
    if (!r.ok) return null
    return await r.json()
  } catch { return null }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type')
  res.setHeader('Cache-Control', 'no-store')
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' })

  const action = req.query.action
  const code = String(req.body?.code || '').toUpperCase()
  if (!/^[A-Z0-9]{3,8}$/.test(code)) return json(res, 400, { error: 'Code invalide' })

  try {
    const user = await verifyUser(req)
    if (!user?.id) return json(res, 401, { error: 'Connexion requise' })

    const rooms = await db(`tournament_rooms?select=*&code=eq.${code}&limit=1`)
    const room = rooms?.[0]
    if (!room || room.tournament_id !== 'undercover') return json(res, 404, { error: 'Salon introuvable' })
    if (String(room.host_user_id) !== String(user.id)) return json(res, 403, { error: 'Seul l’hôte peut faire ça' })

    const g = room.rounds || {}

    if (action === 'assign') {
      const players = await db(`tournament_room_players?select=user_id&room_code=eq.${code}`)
      const uids = shuffle((players || []).map(p => String(p.user_id)))
      if (uids.length < 3) return json(res, 400, { error: '3 joueurs minimum' })
      const ucCount = undercoverCountFor(uids.length)
      const words = pickWordPair()
      const rows = uids.map((u, i) => ({
        room_code: code, user_id: u,
        role: i < ucCount ? 'undercover' : 'civil',
        word: i < ucCount ? words.undercover : words.civil,
      }))
      // Purge d'éventuels secrets d'une partie précédente puis réécrit.
      await db(`undercover_secrets?room_code=eq.${code}`, { method: 'DELETE' })
      await db('undercover_secrets', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(rows) })
      const rounds = {
        phase: 'reveal', round: 1, pass: 1, undercoverCount: ucCount,
        alive: uids, eliminated: [], turnOrder: shuffle(uids), turnIdx: 0, turnDeadline: null, winner: null,
      }
      await db(`tournament_rooms?code=eq.${code}`, { method: 'PATCH', body: JSON.stringify({ status: 'playing', rounds, updated_at: new Date().toISOString() }) })
      return json(res, 200, { ok: true })
    }

    if (action === 'resolve') {
      if (g.phase !== 'voting') return json(res, 409, { error: 'Pas en phase de vote' })
      const alive = g.alive || []
      const votes = await db(`tournament_room_votes?select=user_id,side&room_code=eq.${code}&match_id=eq.elim:${g.round}`)
      const secrets = await db(`undercover_secrets?select=user_id,role,word&room_code=eq.${code}`)
      const roleOf = Object.fromEntries((secrets || []).map(s => [String(s.user_id), s.role]))
      // Ne compte que les votes émis PAR un joueur vivant ET ciblant un vivant
      // (un éliminé/spectateur ne peut pas peser, on ignore les votes forgés hors-jeu).
      const tally = {}
      for (const v of (votes || [])) {
        if (alive.includes(String(v.user_id)) && alive.includes(String(v.side))) tally[v.side] = (tally[v.side] || 0) + 1
      }
      const max = Math.max(0, ...Object.values(tally))
      const top = Object.keys(tally).filter(k => tally[k] === max)
      const out = top.length ? top[Math.floor(Math.random() * top.length)] : alive[Math.floor(Math.random() * alive.length)]
      const role = roleOf[out] || 'civil'
      const newAlive = alive.filter(u => u !== out)
      const eliminated = [...(g.eliminated || []), { uid: out, role, round: g.round }]
      const aliveUC = newAlive.filter(u => roleOf[u] === 'undercover')
      const aliveCiv = newAlive.filter(u => roleOf[u] !== 'undercover')
      let patch
      if (aliveUC.length === 0 || aliveUC.length >= aliveCiv.length) {
        const civ = (secrets || []).find(s => s.role === 'civil')?.word || '?'
        const uc = (secrets || []).find(s => s.role === 'undercover')?.word || '?'
        patch = { phase: 'ended', winner: aliveUC.length === 0 ? 'civils' : 'undercover',
          reveal: { roles: roleOf, words: { civil: civ, undercover: uc } } }
      } else {
        patch = { phase: 'describing', round: g.round + 1, pass: 1, turnIdx: 0,
          turnOrder: shuffle(newAlive), turnDeadline: new Date(Date.now() + TURN_MS).toISOString() }
      }
      const rounds = { ...g, ...patch, alive: newAlive, eliminated, lastEliminated: { uid: out, role } }
      await db(`tournament_rooms?code=eq.${code}`, { method: 'PATCH', body: JSON.stringify({ rounds, updated_at: new Date().toISOString() }) })
      return json(res, 200, { ok: true })
    }

    return json(res, 400, { error: 'Action inconnue' })
  } catch (err) {
    return json(res, 500, { error: String(err?.message || err) })
  }
}
