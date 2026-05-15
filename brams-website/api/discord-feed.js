const CHANNEL_ID = '924378497336631348'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).end()

  res.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=60')

  const token = process.env.DISCORD_TOKEN
  if (!token) return res.status(503).json({ error: 'DISCORD_TOKEN non configuré' })

  try {
    const r = await fetch(
      `https://discord.com/api/v10/channels/${CHANNEL_ID}/messages?limit=15`,
      {
        headers: {
          Authorization: `Bot ${token}`,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(8000),
      }
    )

    if (!r.ok) {
      const txt = await r.text()
      return res.status(r.status).json({ error: txt })
    }

    const msgs = await r.json()

    const clean = msgs.map(m => ({
      id:        m.id,
      content:   m.content,
      timestamp: m.timestamp,
      author: {
        username:   m.author.username,
        globalName: m.author.global_name || m.author.username,
        avatar:     m.author.avatar
          ? `https://cdn.discordapp.com/avatars/${m.author.id}/${m.author.avatar}.webp?size=64`
          : null,
        bot: m.author.bot || false,
      },
      embeds: (m.embeds || []).map(e => ({
        title:       e.title || null,
        description: e.description || null,
        color:       e.color || null,
        image:       e.image?.url || null,
        thumbnail:   e.thumbnail?.url || null,
      })),
      attachments: (m.attachments || []).map(a => ({
        url:          a.url,
        content_type: a.content_type || '',
        filename:     a.filename,
      })),
    }))

    return res.status(200).json(clean)
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
