const SUPABASE_URL = process.env.SUPABASE_REST_URL || process.env.VITE_SUPABASE_URL || 'https://zeqetrmulqndxugfbojd.supabase.co'
const ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ANON_KEY

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

    if (req.method === 'GET' && action === 'public') {
      const rows = await db('tier_lists?select=*&published=eq.true&visibility=eq.public&order=updated_at.desc&limit=80')
      return json(res, 200, { lists: await attachLikes(Array.isArray(rows) ? rows : [], voterId) })
    }

    if (req.method === 'GET' && action === 'mine') {
      if (!viewer.id) return json(res, 401, { error: 'Connexion requise' })
      const rows = await db(`tier_lists?select=*&owner_id=eq.${encodeURIComponent(viewer.id)}&order=updated_at.desc&limit=80`)
      return json(res, 200, { lists: await attachLikes(Array.isArray(rows) ? rows : [], voterId) })
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

      const rows = await db('tier_lists', {
        method: 'POST',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({ ...row, created_at: now }),
      })
      return json(res, 200, { published: true, list: mapRow(rows[0]) })
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
