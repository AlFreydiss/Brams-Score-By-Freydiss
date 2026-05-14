const CATEGORIES = {
  bug: '🐛 Bug / Problème',
  rang: '⚔️ Rang manquant',
  berry: '💰 Berrys / Économie',
  question: '❓ Question',
  suggestion: '💡 Suggestion',
  autre: '📩 Autre',
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { pseudo, category, message } = req.body || {}

  if (!pseudo || !category || !message) {
    return res.status(400).json({ error: 'Champs manquants' })
  }
  if (message.length > 800 || pseudo.length > 40) {
    return res.status(400).json({ error: 'Contenu trop long' })
  }

  const webhookUrl = process.env.DISCORD_WEBHOOK_URL
  if (!webhookUrl) {
    // Pas de webhook configuré — on répond OK quand même (le message va sur Discord direct)
    return res.status(200).json({ ok: true })
  }

  const catLabel = CATEGORIES[category] || category
  const embed = {
    title: `📩 Nouveau ticket — ${catLabel}`,
    color: 0xe0524a,
    fields: [
      { name: 'Discord', value: pseudo, inline: true },
      { name: 'Catégorie', value: catLabel, inline: true },
      { name: 'Message', value: message },
    ],
    footer: { text: 'Brams Score · Support' },
    timestamp: new Date().toISOString(),
  }

  const hookRes = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ embeds: [embed] }),
  })

  if (!hookRes.ok) {
    console.error('[ticket] webhook error', hookRes.status)
    return res.status(500).json({ error: 'Erreur webhook Discord' })
  }

  return res.status(200).json({ ok: true })
}
