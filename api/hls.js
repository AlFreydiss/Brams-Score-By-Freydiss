const R2_BASE = 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/'

function resolveUrl(base, ref) {
  if (ref.startsWith('http://') || ref.startsWith('https://')) return ref
  const b = new URL(base)
  const parts = b.pathname.split('/')
  parts.pop()
  return `${b.origin}${parts.join('/')}/${ref}`
}

function makeProxyUrl(absUrl, host) {
  return `https://${host}/api/hls?url=${encodeURIComponent(absUrl)}`
}

function rewriteM3u8(text, manifestUrl, host) {
  return text.split('\n').map(line => {
    // Rewrite URI="..." inside tags like #EXT-X-MEDIA, #EXT-X-KEY, etc.
    const tagged = line.replace(/URI="([^"]+)"/g, (_, uri) => {
      const abs = resolveUrl(manifestUrl, uri)
      return abs.startsWith(R2_BASE) ? `URI="${makeProxyUrl(abs, host)}"` : `URI="${uri}"`
    })
    // Rewrite bare segment lines (not comments)
    const t = tagged.trim()
    if (t && !t.startsWith('#')) {
      const abs = resolveUrl(manifestUrl, t)
      return abs.startsWith(R2_BASE) ? makeProxyUrl(abs, host) : tagged
    }
    return tagged
  }).join('\n')
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Range, Content-Type')
    res.status(204).end()
    return
  }

  const { url } = req.query
  if (!url || !url.startsWith(R2_BASE)) {
    res.status(400).json({ error: 'invalid_url' })
    return
  }

  try {
    const headers = {}
    if (req.headers.range) headers['Range'] = req.headers.range

    const r = await fetch(url, { headers })
    if (!r.ok && r.status !== 206) {
      res.status(r.status).end()
      return
    }

    const ct = r.headers.get('content-type') || ''
    const isM3u8 = url.split('?')[0].endsWith('.m3u8') || ct.includes('mpegurl')

    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
    res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range')

    if (isM3u8) {
      const text = await r.text()
      const rewritten = rewriteM3u8(text, url, req.headers.host)
      res.setHeader('Content-Type', 'application/vnd.apple.mpegurl; charset=utf-8')
      res.setHeader('Cache-Control', 'public, max-age=5')
      res.status(200).send(rewritten)
    } else {
      const ct2 = ct || 'application/octet-stream'
      res.setHeader('Content-Type', ct2)
      const cl = r.headers.get('content-length')
      if (cl) res.setHeader('Content-Length', cl)
      const cr = r.headers.get('content-range')
      if (cr) res.setHeader('Content-Range', cr)
      res.setHeader('Cache-Control', 'public, max-age=3600')
      res.status(r.status)
      const buf = Buffer.from(await r.arrayBuffer())
      res.end(buf)
    }
  } catch (err) {
    res.status(500).json({ error: err?.message || 'proxy_failed' })
  }
}
