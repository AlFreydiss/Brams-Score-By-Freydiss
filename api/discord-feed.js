const DISCORD_API = 'https://discord.com/api/v10'

function json(res, status, payload, cache = 's-maxage=30, stale-while-revalidate=120') {
  res.setHeader('Cache-Control', cache)
  res.status(status).json(payload)
}

function normalizeMessage(message) {
  const author = message.author || {}
  return {
    id: message.id,
    content: message.content || '',
    timestamp: message.timestamp || new Date().toISOString(),
    author: {
      username: author.username || 'Brams',
      globalName: author.global_name || author.globalName || author.username || 'Brams',
      avatar: author.avatar
        ? `${DISCORD_API}/users/${author.id}/avatars/${author.avatar}.png?size=64`
        : null,
      bot: Boolean(author.bot),
    },
    embeds: Array.isArray(message.embeds) ? message.embeds : [],
    attachments: Array.isArray(message.attachments) ? message.attachments : [],
  }
}

export default async function handler(req, res) {
  const token = process.env.DISCORD_BOT_TOKEN || process.env.DISCORD_TOKEN || ''
  const channelId = process.env.DISCORD_ANNOUNCEMENTS_CHANNEL_ID || process.env.DISCORD_CHANNEL_ID || ''

  if (!token || !channelId) {
    json(res, 200, [], 's-maxage=300, stale-while-revalidate=600')
    return
  }

  try {
    const url = new URL(`${DISCORD_API}/channels/${channelId}/messages`)
    url.searchParams.set('limit', '10')

    const response = await fetch(url, {
      headers: { Authorization: `Bot ${token}` },
    })

    if (!response.ok) {
      json(res, 200, [], 's-maxage=60, stale-while-revalidate=300')
      return
    }

    const messages = await response.json()
    json(res, 200, Array.isArray(messages) ? messages.map(normalizeMessage) : [])
  } catch {
    json(res, 200, [], 's-maxage=60, stale-while-revalidate=300')
  }
}
