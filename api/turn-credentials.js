function splitUrls(value) {
  return String(value || '')
    .split(',')
    .map(v => v.trim())
    .filter(Boolean)
    .filter(v => /^(stun|turn|turns):/i.test(v))
}

export default function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0')

  const urls = splitUrls(process.env.TURN_URLS || process.env.TURN_URL)
  const username = process.env.TURN_USERNAME || process.env.TURN_USER || ''
  const credential = process.env.TURN_CREDENTIAL || process.env.TURN_PASSWORD || process.env.TURN_PASS || ''

  if (req.method !== 'GET') {
    res.status(405).json({ ok: false, error: 'method_not_allowed' })
    return
  }

  if (urls.length === 0) {
    res.status(200).json({ ok: true, iceServers: [] })
    return
  }

  const iceServers = urls.map(url => {
    if (/^stun:/i.test(url)) return { urls: url }
    if (!username || !credential) return null
    return { urls: url, username, credential }
  }).filter(Boolean)

  res.status(200).json({ ok: true, iceServers })
}
