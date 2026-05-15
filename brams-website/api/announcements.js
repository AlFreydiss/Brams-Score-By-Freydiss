const SUPABASE_URL = process.env.SUPABASE_REST_URL || 'https://zeqetrmulqndxugfbojd.supabase.co'
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_KEY || ''

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=60')

  try {
    const url = `${SUPABASE_URL}/rest/v1/community_announcements?order=created_at.desc&limit=60`
    const r = await fetch(url, {
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        Accept: 'application/json',
      },
    })

    if (!r.ok) {
      const text = await r.text()
      return res.status(r.status).json({ error: text })
    }

    const data = await r.json()
    return res.status(200).json(data)
  } catch (err) {
    return res.status(500).json({ error: 'Erreur serveur' })
  }
}
