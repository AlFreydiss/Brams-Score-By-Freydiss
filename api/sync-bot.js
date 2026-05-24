// api/sync-bot.js — Sync données bot Discord → Supabase
// Appelé par le bot Python après chaque check_ranks_loop.
// Auth : Authorization: Bearer BOT_SYNC_SECRET (env var côté Vercel + bot)

const SUPABASE_URL = 'https://zeqetrmulqndxugfbojd.supabase.co'

function getServiceHeaders() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY manquant')
  return {
    'Content-Type': 'application/json',
    'apikey': key,
    'Authorization': `Bearer ${key}`,
    'Prefer': 'resolution=merge-duplicates,return=minimal',
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type')

  if (req.method === 'OPTIONS') { res.status(204).end(); return }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  // ── Auth ──────────────────────────────────────────────────────────────────
  const secret = process.env.BOT_SYNC_SECRET
  if (!secret) return res.status(503).json({ error: 'BOT_SYNC_SECRET non configuré' })

  const authHeader = req.headers['authorization'] || ''
  if (authHeader !== `Bearer ${secret}`) {
    return res.status(401).json({ error: 'Non autorisé' })
  }

  // ── Payload ───────────────────────────────────────────────────────────────
  const { users } = req.body || {}
  if (!Array.isArray(users) || users.length === 0) {
    return res.status(400).json({ error: 'Payload invalide — users[] requis' })
  }
  if (users.length > 500) {
    return res.status(400).json({ error: 'Trop d\'utilisateurs par batch (max 500)' })
  }

  // ── Upsert ────────────────────────────────────────────────────────────────
  const rows = users.map(u => ({
    uid:              String(u.uid),
    data: {
      username:        u.username   || null,
      avatar_url:      u.avatar_url || null,
      berrys:          Number(u.berrys ?? 0),
      vocal_seconds_7d:Number(u.vocal_seconds_7d ?? 0),
      vocal_h:         Number((u.vocal_seconds_7d ?? 0) / 3600).toFixed(2),
      messages_7d:     Number(u.messages_7d ?? 0),
      rank:            u.rank        || null,
      synced_at:       new Date().toISOString(),
    },
  }))

  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/users?on_conflict=uid`, {
      method: 'POST',
      headers: getServiceHeaders(),
      body: JSON.stringify(rows),
    })

    if (!r.ok) {
      const err = await r.text()
      console.error('[sync-bot] Supabase error', r.status, err)
      return res.status(502).json({ error: `Supabase: ${r.status}` })
    }

    return res.status(200).json({ ok: true, synced: rows.length })
  } catch (e) {
    console.error('[sync-bot]', e.message)
    return res.status(500).json({ error: e.message })
  }
}
