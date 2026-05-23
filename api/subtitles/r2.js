const R2_BASE = 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/'

export default async function handler(req, res) {
  const { url } = req.query
  if (!url || !url.startsWith(R2_BASE)) {
    res.status(400).json({ error: 'invalid_url' })
    return
  }

  try {
    const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } })
    if (!r.ok) {
      res.status(r.status).end()
      return
    }
    const text = await r.text()
    res.setHeader('Content-Type', 'text/vtt; charset=utf-8')
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400')
    res.status(200).send(text)
  } catch (err) {
    res.status(500).json({ error: err?.message || 'fetch_failed' })
  }
}
