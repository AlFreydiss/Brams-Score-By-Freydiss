const SUPABASE_URL = process.env.SUPABASE_REST_URL || process.env.VITE_SUPABASE_URL || 'https://zeqetrmulqndxugfbojd.supabase.co'
const API_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''

const PERIOD_DAYS = {
  day: 1,
  today: 1,
  week: 7,
  '7d': 7,
  month: 30,
  '30d': 30,
}

function getRequestUrl(req) {
  const proto = req.headers['x-forwarded-proto'] || 'https'
  const host = req.headers.host || 'localhost'
  return new URL(req.url || '/', `${proto}://${host}`)
}

function joinedAtSeconds(data) {
  const candidates = [
    data?.joined_at,
    data?.created_at,
    data?.join_time,
    data?.discord_joined_at,
  ]

  for (const candidate of candidates) {
    if (!candidate) continue
    if (typeof candidate === 'number') return candidate > 1e12 ? candidate / 1000 : candidate
    const parsed = Date.parse(candidate)
    if (Number.isFinite(parsed)) return parsed / 1000
  }

  return 0
}

export default async function handler(req, res) {
  const requestUrl = getRequestUrl(req)
  const period = String(requestUrl.searchParams.get('period') || '7d').toLowerCase()
  const days = PERIOD_DAYS[period] || 7

  if (!API_KEY) {
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600')
    res.status(200).json({ count: 0, period })
    return
  }

  try {
    const usersUrl = new URL('/rest/v1/users', SUPABASE_URL)
    usersUrl.searchParams.set('select', 'data')
    usersUrl.searchParams.set('limit', '1000')

    const response = await fetch(usersUrl, {
      headers: {
        apikey: API_KEY,
        Authorization: `Bearer ${API_KEY}`,
      },
    })

    if (!response.ok) {
      res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=300')
      res.status(200).json({ count: 0, period })
      return
    }

    const cutoff = Date.now() / 1000 - days * 86400
    const users = await response.json()
    const count = Array.isArray(users)
      ? users.filter(user => joinedAtSeconds(user?.data || {}) >= cutoff).length
      : 0

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600')
    res.status(200).json({ count, period })
  } catch {
    res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=300')
    res.status(200).json({ count: 0, period })
  }
}
