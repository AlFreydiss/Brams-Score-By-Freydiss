import { checkRateLimit, getClientIp } from './_ratelimit.js'

const CATEGORIES = {
  bug:        '🐛 Bug / Problème',
  rang:       '⚔️ Rang manquant',
  berry:      '💰 Berrys / Économie',
  question:   '❓ Question',
  suggestion: '💡 Suggestion',
  autre:      '📩 Autre',
}

function sanitize(str) {
  if (typeof str !== 'string') return ''
  return str
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '')
    .replace(/<[^>]*>/g, '')
    .trim()
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  // Rate limiting : 5 tickets max par IP par 10 minutes
  const ip = getClientIp(req)
  const rl = checkRateLimit(ip, 5, 600_000)
  if (!rl.allowed) {
    res.setHeader('Retry-After', String(rl.retryAfter))
    return res.status(429).json({ error: 'Trop de tickets envoyés, réessaie plus tard.' })
  }

  const body = req.body || {}
  const { pseudo: rawPseudo, category: rawCategory, message: rawMessage } = body

  if (!rawPseudo || !rawCategory || !rawMessage) {
    return res.status(400).json({ error: 'Champs manquants.' })
  }

  // Validation stricte de la catégorie (whitelist)
  if (!Object.prototype.hasOwnProperty.call(CATEGORIES, rawCategory)) {
    return res.status(400).json({ error: 'Catégorie invalide.' })
  }

  const pseudo  = sanitize(String(rawPseudo))
  const message = sanitize(String(rawMessage))

  if (pseudo.length < 1 || pseudo.length > 40) {
    return res.status(400).json({ error: 'Pseudo invalide (1–40 caractères).' })
  }
  if (message.length < 5 || message.length > 800) {
    return res.status(400).json({ error: 'Message invalide (5–800 caractères).' })
  }

  const webhookUrl = process.env.DISCORD_WEBHOOK_URL
  if (!webhookUrl) return res.status(200).json({ ok: true })

  // Validation basique de l'URL webhook (doit pointer vers Discord)
  if (!webhookUrl.startsWith('https://discord.com/api/webhooks/') &&
      !webhookUrl.startsWith('https://discordapp.com/api/webhooks/')) {
    console.error('[ticket] URL webhook invalide')
    return res.status(500).json({ error: 'Configuration serveur invalide.' })
  }

  const catLabel = CATEGORIES[rawCategory]
  const embed = {
    title:  `📩 Nouveau ticket — ${catLabel}`,
    color:  0xe0524a,
    fields: [
      { name: 'Discord',    value: pseudo,   inline: true },
      { name: 'Catégorie', value: catLabel, inline: true },
      { name: 'Message',   value: message },
    ],
    footer:    { text: 'Brams Score · Support' },
    timestamp: new Date().toISOString(),
  }

  try {
    const hookRes = await fetch(webhookUrl, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ embeds: [embed] }),
      signal:  AbortSignal.timeout(8_000),
    })

    if (!hookRes.ok) {
      console.error('[ticket] webhook error', hookRes.status)
      return res.status(500).json({ error: 'Erreur lors de l\'envoi.' })
    }
  } catch (e) {
    console.error('[ticket]', e.message)
    return res.status(500).json({ error: 'Erreur réseau.' })
  }

  return res.status(200).json({ ok: true })
}
