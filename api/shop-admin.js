// api/shop-admin.js — Gestion admin de la boutique (create/update items)
// Protégé côté serveur : seuls les staff peuvent modifier les items boutique.

import { requireStaff } from './_staff.js'

const SUPABASE_URL  = 'https://zeqetrmulqndxugfbojd.supabase.co'

function getServiceHeaders() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const anon = process.env.SUPABASE_ANON_KEY
    || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InplcWV0cm11bHFuZHh1Z2Zib2pkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzNzUxNzksImV4cCI6MjA5MTk1MTE3OX0.HQbMRJnT_FAFfA8kYi-DYgjOuPnGpQU5zkeRAGb8Qso'
  const key = serviceKey || anon
  return {
    'Content-Type': 'application/json',
    'apikey': key,
    'Authorization': `Bearer ${key}`,
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type')

  if (req.method === 'OPTIONS') { res.status(204).end(); return }

  // ── Guard staff côté serveur ──────────────────────────────────────────────
  const auth = await requireStaff(req, res)
  if (!auth) return

  const { action } = req.query

  // ── GET /api/shop-admin?action=list — liste tous les items ────────────────
  if (req.method === 'GET' && action === 'list') {
    try {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/shop_items?order=created_at.desc`, {
        headers: getServiceHeaders(),
      })
      const items = await r.json()
      res.json({ items: Array.isArray(items) ? items : [] })
    } catch (err) {
      res.status(500).json({ error: err?.message })
    }
    return
  }

  // ── POST /api/shop-admin?action=upsert — créer ou modifier un item ────────
  if (req.method === 'POST' && action === 'upsert') {
    const item = req.body
    if (!item || !item.name || !item.price) {
      res.status(400).json({ error: 'Champs obligatoires manquants : name, price' }); return
    }

    const ALLOWED_RARITIES = ['Commun', 'Rare', 'Epique', 'Legendaire', 'Mythique']
    const ALLOWED_CATEGORIES = ['Cosmetique', 'Roles Discord', 'Badges', 'Boosts', 'Coffres', 'Evenements', 'Equipage', 'Prestige']

    if (item.rarity && !ALLOWED_RARITIES.includes(item.rarity)) {
      res.status(400).json({ error: `Rareté invalide : ${item.rarity}` }); return
    }
    if (item.category && !ALLOWED_CATEGORIES.includes(item.category)) {
      res.status(400).json({ error: `Catégorie invalide : ${item.category}` }); return
    }
    if (Number(item.price) < 0) {
      res.status(400).json({ error: 'Le prix ne peut pas être négatif' }); return
    }

    // Allowlist stricte — ne jamais passer item tel quel (mass assignment)
    const safeItem = {
      ...(item.id !== undefined ? { id: item.id } : {}),
      name:         String(item.name).slice(0, 200),
      description:  item.description  ? String(item.description).slice(0, 1000) : null,
      category:     item.category     || null,
      price:        Math.max(0, Math.floor(Number(item.price))),
      rarity:       item.rarity       || 'Commun',
      stock:        item.stock != null ? Math.max(0, Math.floor(Number(item.stock))) : null,
      limited:      Boolean(item.limited),
      active:       item.active !== undefined ? Boolean(item.active) : true,
      reward_type:  item.reward_type  ? String(item.reward_type).slice(0, 100) : null,
      reward_data:  item.reward_data && typeof item.reward_data === 'object' ? item.reward_data : {},
      image_url:    item.image_url    ? String(item.image_url).slice(0, 500) : null,
    }

    try {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/shop_items`, {
        method: 'POST',
        headers: {
          ...getServiceHeaders(),
          'Prefer': 'return=representation,resolution=merge-duplicates',
        },
        body: JSON.stringify(safeItem),
      })
      if (!r.ok) {
        const txt = await r.text()
        res.status(500).json({ error: `Echec DB (${r.status}): ${txt}` }); return
      }
      const rows = await r.json()
      res.json({ success: true, item: rows[0] ?? item, modified_by: auth.discordId })
    } catch (err) {
      res.status(500).json({ error: err?.message })
    }
    return
  }

  // ── POST /api/shop-admin?action=toggle — activer/désactiver un item ───────
  if (req.method === 'POST' && action === 'toggle') {
    const { id, active } = req.body || {}
    if (!id) { res.status(400).json({ error: 'ID manquant' }); return }

    try {
      const r = await fetch(
        `${SUPABASE_URL}/rest/v1/shop_items?id=eq.${encodeURIComponent(id)}`,
        {
          method: 'PATCH',
          headers: { ...getServiceHeaders(), 'Prefer': 'return=representation' },
          body: JSON.stringify({ active: Boolean(active) }),
        }
      )
      if (!r.ok) {
        const txt = await r.text()
        res.status(500).json({ error: `Echec DB (${r.status}): ${txt}` }); return
      }
      const rows = await r.json()
      if (!rows?.length) {
        res.status(404).json({ error: 'Item introuvable' }); return
      }
      res.json({ success: true, item: rows[0], modified_by: auth.discordId })
    } catch (err) {
      res.status(500).json({ error: err?.message })
    }
    return
  }

  res.status(400).json({ error: `Action inconnue : ${action}` })
}
