// Reçoit le formulaire "Nous contacter" et l'envoie sur Discord via webhook.
// Configurer DISCORD_TICKET_WEBHOOK (ou DISCORD_WEBHOOK_URL) dans les env vars Vercel
// avec l'URL d'un webhook Discord (Paramètres du salon → Intégrations → Webhooks).

const CATEGORY_LABELS = {
  bug: '🐛 Bug / Problème bot',
  rang: '⚔️ Rang manquant',
  berry: '💰 Berrys / Économie',
  question: '❓ Question générale',
  suggestion: '💡 Suggestion',
  autre: '📩 Autre',
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') { res.status(204).end(); return }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return }

  const webhook = process.env.DISCORD_TICKET_WEBHOOK || process.env.DISCORD_WEBHOOK_URL || ''
  if (!webhook) {
    res.status(503).json({ error: "Webhook Discord non configuré (variable DISCORD_TICKET_WEBHOOK manquante)." })
    return
  }

  let body = req.body
  if (typeof body === 'string') { try { body = JSON.parse(body) } catch { body = {} } }
  const pseudo = String(body?.pseudo || '').trim().slice(0, 80)
  const category = String(body?.category || '').trim()
  const message = String(body?.message || '').trim().slice(0, 1800)

  if (!pseudo || !category || message.length < 10) {
    res.status(400).json({ error: 'Champs invalides (pseudo, catégorie et message ≥ 10 caractères requis).' })
    return
  }

  const payload = {
    username: 'Brams · Contact',
    embeds: [{
      title: CATEGORY_LABELS[category] || '📩 Nouveau message',
      description: message,
      color: 0x8b5cf6,
      fields: [{ name: 'De', value: pseudo, inline: true }],
      timestamp: new Date().toISOString(),
      footer: { text: 'Formulaire Nous contacter · brams.community' },
    }],
  }

  try {
    const r = await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!r.ok) {
      const txt = await r.text().catch(() => '')
      res.status(502).json({ error: `Discord a refusé l'envoi (${r.status}). ${txt.slice(0, 120)}` })
      return
    }
    res.status(200).json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: e?.message || "Erreur lors de l'envoi." })
  }
}
