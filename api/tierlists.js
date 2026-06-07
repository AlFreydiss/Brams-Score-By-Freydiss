const SUPABASE_URL = process.env.SUPABASE_REST_URL || process.env.VITE_SUPABASE_URL || 'https://zeqetrmulqndxugfbojd.supabase.co'
const ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ANON_KEY

// ── Undercover (fusionné ici pour rester sous la limite de 12 functions Vercel) ──
const UC_PAIRS = [
  ['Broly', 'Zoro'], ['Vegeta', 'Sasuke'], ['Goku', 'Luffy'], ['Kaneki', 'Shinichi'],
  ['Senku', 'Lawliet (L)'], ['Naruto', 'Asta'], ['Itachi', 'Madara'], ['Gojo', 'Kakashi'],
  ['Eren', 'Lelouch'], ['Saitama', 'Mob'], ['Light', 'Johan'], ['Ichigo', 'Natsu'],
]
const ucPickPair = () => { const p = UC_PAIRS[Math.floor(Math.random() * UC_PAIRS.length)]; return Math.random() < 0.5 ? { civil: p[0], undercover: p[1] } : { civil: p[1], undercover: p[0] } }
const ucCountFor = n => (n <= 6 ? 1 : n <= 9 ? 2 : 3)
const ucShuffle = a => { const r = [...a]; for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[r[i], r[j]] = [r[j], r[i]] } return r }
// Durée d'un tour selon le mode choisi par l'hôte : vocal = on parle en Discord
// (tour court), écrit = on tape l'indice dans l'app (un peu plus de temps).
const UC_TURN_MS = { voice: 7000, text: 10000 }
const ucTurnMs = mode => UC_TURN_MS[mode] || UC_TURN_MS.text

function dbHeaders(extra = {}) {
  return {
    'Content-Type': 'application/json',
    'apikey': SERVICE_KEY,
    'Authorization': `Bearer ${SERVICE_KEY}`,
    ...extra,
  }
}

function json(res, status, body) {
  res.status(status).json(body)
}

async function db(path, options = {}) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: dbHeaders(options.headers || {}),
  })
  const text = await response.text()
  let data = null
  try { data = text ? JSON.parse(text) : null } catch { data = text }
  if (!response.ok) throw new Error(`DB ${response.status}: ${typeof data === 'string' ? data : JSON.stringify(data)}`)
  return data
}

async function resolveUser(req, body = {}) {
  const auth = req.headers.authorization || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null
  if (token && ANON_KEY) {
    try {
      const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
        headers: { apikey: ANON_KEY, Authorization: `Bearer ${token}` },
      })
      if (response.ok) {
        const user = await response.json()
        const identity = user.identities?.find(i => i.provider === 'discord')
        const discordId = user.user_metadata?.provider_id
          || user.user_metadata?.custom_claims?.provider_id
          || identity?.identity_data?.provider_id
          || identity?.identity_data?.sub
          || identity?.id
          || user.user_metadata?.sub
          || null
        return {
          id: user.id,
          discordId,
          name: user.user_metadata?.global_name
            || user.user_metadata?.full_name
            || user.user_metadata?.name
            || user.user_metadata?.display_name
            || user.email?.split('@')[0]
            || 'Pirate',
          avatar: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
          authenticated: true,
        }
      }
    } catch {
      // Guest fallback below keeps autosave usable even if auth is temporarily unavailable.
    }
  }

  const clientId = String(body.clientId || req.headers['x-client-id'] || '').slice(0, 80)
  return {
    id: clientId ? `guest:${clientId}` : null,
    discordId: null,
    name: 'Pirate Brams',
    avatar: null,
    authenticated: false,
  }
}

function safePayload(input = {}) {
  return {
    title: String(input.title || 'Ma Tier List').slice(0, 120),
    emoji: String(input.emoji || '📋').slice(0, 16),
    category: String(input.category || 'Custom').slice(0, 80),
    type_id: input.typeId ? String(input.typeId).slice(0, 60) : null,
    tier_count: Math.max(0, Math.min(40, Number(input.tierCount || input.tiers?.length || 0))),
    tier_labels: Array.isArray(input.tierLabels) ? input.tierLabels.slice(0, 40) : [],
    tier_colors: Array.isArray(input.tierColors) ? input.tierColors.slice(0, 40) : [],
    tiers: Array.isArray(input.tiers) ? input.tiers.slice(0, 40) : [],
    board: input.board && typeof input.board === 'object' ? input.board : {},
    custom_items: Array.isArray(input.customItems) ? input.customItems.slice(0, 120) : [],
    favorites: Array.isArray(input.favorites) ? input.favorites.slice(0, 240) : [],
  }
}

function mapRow(row, likesById = {}, likedIds = new Set()) {
  return {
    id: row.id,
    title: row.title,
    emoji: row.emoji,
    category: row.category,
    typeId: row.type_id,
    tierCount: row.tier_count,
    tierLabels: row.tier_labels || [],
    tierColors: row.tier_colors || [],
    tiers: row.tiers || [],
    board: row.board || {},
    customItems: row.custom_items || [],
    favorites: row.favorites || [],
    savedAt: row.updated_at ? new Date(row.updated_at).getTime() : Date.now(),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    authorName: row.author_name || 'Pirate Brams',
    authorAvatar: row.author_avatar || null,
    authorDiscordId: row.owner_discord_id || null,
    editorName: row.editor_name || null,
    published: Boolean(row.published),
    visibility: row.visibility || 'private',
    likes: likesById[row.id] || 0,
    liked: likedIds.has(row.id),
  }
}

async function attachLikes(rows, voterId) {
  if (!rows.length) return []
  const ids = rows.map(r => r.id)
  const encodedIds = ids.map(id => encodeURIComponent(id)).join(',')
  let likes = []
  try {
    likes = await db(`tier_list_likes?select=tier_list_id,voter_id&tier_list_id=in.(${encodedIds})`)
  } catch {
    likes = []
  }
  const likesById = {}
  const likedIds = new Set()
  for (const like of likes || []) {
    likesById[like.tier_list_id] = (likesById[like.tier_list_id] || 0) + 1
    if (voterId && like.voter_id === voterId) likedIds.add(like.tier_list_id)
  }
  return rows.map(row => mapRow(row, likesById, likedIds))
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, X-Client-Id')
  res.setHeader('Cache-Control', 'no-store')
  if (req.method === 'OPTIONS') return res.status(204).end()

  const action = req.query.action || (req.method === 'GET' ? 'public' : '')
  const body = req.body || {}

  try {
    const viewer = await resolveUser(req, body)
    const voterId = viewer.id

    // ── Recommandations IA : feedback 👍/👎 (bridge durable vers Ruflo) ──
    if (action === 'reco_feedback') {
      if (req.method === 'POST') {
        const animeId = String(body.anime_id || '').slice(0, 80)
        const act = body.action === 'like' || body.action === 'dislike' ? body.action : null
        if (!animeId || !act) return json(res, 400, { error: 'anime_id + action requis' })
        await db('recommendation_feedback', {
          method: 'POST',
          headers: { Prefer: 'return=minimal' },
          body: JSON.stringify({
            user_id: voterId || null,
            anime_id: animeId,
            action: act,
            reason_given: String(body.reason || '').slice(0, 200),
          }),
        })
        return json(res, 200, { ok: true })
      }
      if (req.method === 'GET') {   // drain pour la synchro Ruflo (scripts/sync-reco-feedback-ruflo.mjs)
        const since = String(req.query.since || '')
        const flt = since ? `&created_at=gt.${encodeURIComponent(since)}` : ''
        const rows = await db(`recommendation_feedback?select=*&order=created_at.desc&limit=500${flt}`)
        return json(res, 200, rows || [])
      }
      return json(res, 405, { error: 'Method not allowed' })
    }

    // ── Undercover : assign/resolve (secrets gérés côté serveur, hôte vérifié) ──
    if (action === 'uc_assign' || action === 'uc_resolve') {
      if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' })
      if (!viewer.authenticated || !viewer.id) return json(res, 401, { error: 'Connexion requise' })
      const code = String(body.code || '').toUpperCase()
      if (!/^[A-Z0-9]{3,8}$/.test(code)) return json(res, 400, { error: 'Code invalide' })
      const rooms = await db(`tournament_rooms?select=*&code=eq.${code}&limit=1`)
      const room = rooms?.[0]
      if (!room || room.tournament_id !== 'undercover') return json(res, 404, { error: 'Salon introuvable' })
      if (String(room.host_user_id) !== String(viewer.id)) return json(res, 403, { error: 'Seul l’hôte peut faire ça' })
      const g = room.rounds || {}

      if (action === 'uc_assign') {
        const players = await db(`tournament_room_players?select=user_id&room_code=eq.${code}`)
        const uids = ucShuffle((players || []).map(p => String(p.user_id)))
        if (uids.length < 3) return json(res, 400, { error: '3 joueurs minimum' })
        const ucCount = ucCountFor(uids.length)
        const words = ucPickPair()
        const mode = body.mode === 'text' ? 'text' : 'voice'
        const rows = uids.map((u, i) => ({ room_code: code, user_id: u, role: i < ucCount ? 'undercover' : 'civil', word: i < ucCount ? words.undercover : words.civil }))
        await db(`undercover_secrets?room_code=eq.${code}`, { method: 'DELETE' })
        // upsert (merge-duplicates) : si une ligne (room_code,user_id) subsiste —
        // ré-assignation, double-clic, course — on écrase au lieu de planter en 409.
        await db('undercover_secrets', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify(rows) })
        const rounds = { phase: 'reveal', round: 1, pass: 1, mode, undercoverCount: ucCount, alive: uids, eliminated: [], turnOrder: ucShuffle(uids), turnIdx: 0, turnDeadline: null, winner: null }
        await db(`tournament_rooms?code=eq.${code}`, { method: 'PATCH', body: JSON.stringify({ status: 'playing', rounds, updated_at: new Date().toISOString() }) })
        return json(res, 200, { ok: true })
      }

      // uc_resolve
      if (g.phase !== 'voting') return json(res, 409, { error: 'Pas en phase de vote' })
      const alive = g.alive || []
      const evotes = await db(`tournament_room_votes?select=user_id,side&room_code=eq.${code}&match_id=eq.elim:${g.round}`)
      const secrets = await db(`undercover_secrets?select=user_id,role,word&room_code=eq.${code}`)
      const roleOf = Object.fromEntries((secrets || []).map(s => [String(s.user_id), s.role]))
      const tally = {}
      for (const v of (evotes || [])) if (alive.includes(String(v.user_id)) && alive.includes(String(v.side))) tally[v.side] = (tally[v.side] || 0) + 1
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
        patch = { phase: 'ended', winner: aliveUC.length === 0 ? 'civils' : 'undercover', reveal: { roles: roleOf, words: { civil: civ, undercover: uc } } }
      } else {
        patch = { phase: 'describing', round: g.round + 1, pass: 1, turnIdx: 0, turnOrder: ucShuffle(newAlive), turnDeadline: new Date(Date.now() + ucTurnMs(g.mode)).toISOString() }
      }
      const rounds = { ...g, ...patch, alive: newAlive, eliminated, lastEliminated: { uid: out, role } }
      await db(`tournament_rooms?code=eq.${code}`, { method: 'PATCH', body: JSON.stringify({ rounds, updated_at: new Date().toISOString() }) })
      return json(res, 200, { ok: true })
    }

    // Vues de liste allégées : on EXCLUT les champs lourds (tiers/board/custom_items/
    // favorites, qui contiennent les images) — les cartes n'en ont pas besoin et
    // ça évitait de transférer plusieurs Mo. Le détail est chargé via action=get.
    const LIST_COLS = 'id,title,emoji,category,type_id,tier_count,tier_labels,tier_colors,author_name,author_avatar,editor_name,owner_id,owner_discord_id,published,visibility,created_at,updated_at'

    if (req.method === 'GET' && action === 'public') {
      const rows = await db(`tier_lists?select=${LIST_COLS}&published=eq.true&visibility=eq.public&order=updated_at.desc&limit=80`)
      return json(res, 200, { lists: await attachLikes(Array.isArray(rows) ? rows : [], voterId) })
    }

    if (req.method === 'GET' && action === 'mine') {
      if (!viewer.id) return json(res, 401, { error: 'Connexion requise' })
      const rows = await db(`tier_lists?select=${LIST_COLS}&owner_id=eq.${encodeURIComponent(viewer.id)}&order=updated_at.desc&limit=80`)
      return json(res, 200, { lists: await attachLikes(Array.isArray(rows) ? rows : [], voterId) })
    }

    if (req.method === 'GET' && action === 'get') {
      const id = String(req.query.id || '')
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return json(res, 400, { error: 'ID invalide' })
      const rows = await db(`tier_lists?select=*&id=eq.${encodeURIComponent(id)}&limit=1`)
      if (!rows?.length) return json(res, 404, { error: 'Liste introuvable' })
      const row = rows[0]
      // Sécurité : on ne sert le détail que d'une liste publique OU possédée par le
      // demandeur (sinon un UUID connu donnerait accès à un draft/liste privée d'autrui).
      const isPublic = row.published === true && row.visibility === 'public'
      if (!isPublic && row.owner_id !== viewer.id) return json(res, 403, { error: 'Accès non autorisé' })
      // Détail complet (board/tiers/custom_items/favorites) pour l'ouverture en studio.
      return json(res, 200, { list: mapRow(row) })
    }

    if (req.method === 'GET' && action === 'draft') {
      if (!viewer.id) return json(res, 401, { error: 'Connexion requise' })
      const rows = await db(`tier_lists?select=*&owner_id=eq.${encodeURIComponent(viewer.id)}&published=eq.false&visibility=eq.private&order=updated_at.desc&limit=1`)
      return json(res, 200, { draft: rows?.[0] ? mapRow(rows[0]) : null })
    }

    if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' })
    if (!viewer.id) return json(res, 401, { error: 'Connexion requise' })

    if (action === 'autosave' || action === 'publish') {
      const payload = safePayload(body.list || body)
      const now = new Date().toISOString()
      const row = {
        ...payload,
        owner_id: viewer.id,
        owner_discord_id: viewer.discordId,
        author_name: viewer.name,
        author_avatar: viewer.avatar,
        visibility: action === 'publish' ? 'public' : 'private',
        published: action === 'publish',
        updated_at: now,
      }

      if (action === 'autosave') {
        const existing = await db(`tier_lists?select=id&owner_id=eq.${encodeURIComponent(viewer.id)}&published=eq.false&visibility=eq.private&order=updated_at.desc&limit=1`)
        if (existing?.[0]?.id) {
          const rows = await db(`tier_lists?id=eq.${encodeURIComponent(existing[0].id)}`, {
            method: 'PATCH',
            headers: { Prefer: 'return=representation' },
            body: JSON.stringify(row),
          })
          return json(res, 200, { saved: true, list: mapRow(rows[0]) })
        }
        const rows = await db('tier_lists', {
          method: 'POST',
          headers: { Prefer: 'return=representation' },
          body: JSON.stringify({ ...row, created_at: now }),
        })
        return json(res, 200, { saved: true, list: mapRow(rows[0]) })
      }

      // Attribution : si on republie la tier list d'un AUTRE membre (fork), on
      // crédite le créateur ORIGINAL et on s'inscrit comme modificateur.
      // Liste créée de zéro → auteur = soi, pas de modificateur.
      const origName = typeof body.originalAuthorName === 'string' ? body.originalAuthorName.trim().slice(0, 120) : ''
      const isFork = origName && origName !== viewer.name
      const pubRow = isFork
        ? { ...row, author_name: origName, author_avatar: (typeof body.originalAuthorAvatar === 'string' ? body.originalAuthorAvatar.slice(0, 400) : null), editor_name: viewer.name }
        : { ...row, editor_name: null }

      const rows = await db('tier_lists', {
        method: 'POST',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({ ...pubRow, created_at: now }),
      })
      return json(res, 200, { published: true, list: mapRow(rows[0]) })
    }

    if (action === 'delete') {
      const listId = String(body.id || body.listId || '')
      if (!/^[0-9a-f-]{20,}$/i.test(listId)) return json(res, 400, { error: 'ID invalide' })
      const existing = await db(`tier_lists?select=id,owner_id&id=eq.${encodeURIComponent(listId)}&limit=1`)
      if (!existing?.length) return json(res, 404, { error: 'Liste introuvable' })
      if (existing[0].owner_id !== viewer.id) return json(res, 403, { error: 'Non autorisé — tu ne peux supprimer que tes propres listes' })
      await db(`tier_lists?id=eq.${encodeURIComponent(listId)}`, { method: 'DELETE' })
      return json(res, 200, { deleted: true })
    }

    if (action === 'like') {
      const listId = String(body.id || body.listId || '')
      if (!/^[0-9a-f-]{20,}$/i.test(listId)) return json(res, 400, { error: 'ID invalide' })
      const existing = await db(`tier_list_likes?select=tier_list_id&tier_list_id=eq.${encodeURIComponent(listId)}&voter_id=eq.${encodeURIComponent(viewer.id)}&limit=1`)
      let liked = false
      if (existing?.length) {
        await db(`tier_list_likes?tier_list_id=eq.${encodeURIComponent(listId)}&voter_id=eq.${encodeURIComponent(viewer.id)}`, { method: 'DELETE' })
      } else {
        await db('tier_list_likes', {
          method: 'POST',
          headers: { Prefer: 'return=minimal' },
          body: JSON.stringify({ tier_list_id: listId, voter_id: viewer.id }),
        })
        liked = true
      }
      const likes = await db(`tier_list_likes?select=tier_list_id&tier_list_id=eq.${encodeURIComponent(listId)}`)
      return json(res, 200, { liked, likes: Array.isArray(likes) ? likes.length : 0 })
    }

    return json(res, 400, { error: 'Action inconnue' })
  } catch (err) {
    const msg = String(err?.message || err)
    const missingTable = msg.includes('tier_lists') || msg.includes('tier_list_likes')
    return json(res, missingTable ? 503 : 500, {
      error: missingTable
        ? 'Tables tier list absentes. Applique la migration Supabase tier_lists.'
        : msg,
    })
  }
}
