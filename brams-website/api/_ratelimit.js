// Rate limiter en mémoire par IP (par instance serverless)
// Limite: MAX_REQUESTS requêtes par WINDOW_MS
const store = new Map()

export function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for']
  if (forwarded) return forwarded.split(',')[0].trim()
  return req.socket?.remoteAddress || 'unknown'
}

export function checkRateLimit(ip, max = 12, windowMs = 60_000) {
  const now = Date.now()
  let entry = store.get(ip)

  if (!entry || now > entry.reset) {
    entry = { count: 1, reset: now + windowMs }
    store.set(ip, entry)
    return { allowed: true, remaining: max - 1 }
  }

  entry.count++
  store.set(ip, entry)
  return {
    allowed: entry.count <= max,
    remaining: Math.max(0, max - entry.count),
    retryAfter: Math.ceil((entry.reset - now) / 1000),
  }
}

// Nettoie les entrées expirées pour éviter la fuite mémoire
setInterval(() => {
  const now = Date.now()
  for (const [ip, entry] of store) {
    if (now > entry.reset) store.delete(ip)
  }
}, 120_000)
