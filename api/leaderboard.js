const SUPABASE_URL = process.env.SUPABASE_REST_URL || process.env.VITE_SUPABASE_URL || 'https://zeqetrmulqndxugfbojd.supabase.co'
const API_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''

const PERIODS = new Set(['day', 'today', 'week', '7d', 'month', '30d', 'all'])

function getRequestUrl(req) {
  const proto = req.headers['x-forwarded-proto'] || 'https'
  const host = req.headers.host || 'localhost'
  return new URL(req.url || '/', `${proto}://${host}`)
}

async function topClassement(limit, period) {
  const response = await fetch(new URL('/rest/v1/rpc/top_classement', SUPABASE_URL), {
    method: 'POST',
    headers: {
      apikey: API_KEY,
      Authorization: `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ p_limit: limit, p_period: period }),
  })
  return response
}

export default async function handler(req, res) {
  if (!API_KEY) {
    res.status(500).json({ error: 'SUPABASE key missing' })
    return
  }

  const requestUrl = getRequestUrl(req)
  const limit = Math.min(Math.max(parseInt(requestUrl.searchParams.get('limit') || '100', 10) || 100, 1), 500)
  const rawPeriod = String(requestUrl.searchParams.get('period') || 'week').toLowerCase()
  const period = PERIODS.has(rawPeriod) ? rawPeriod : 'all'

  try {
    // Le classement est calculé DANS Postgres (RPC top_classement : mêmes plafonds
    // 24h/session que le bot) et seul le top N sort de la base (~20 Ko pour 100).
    // Avant : on rapatriait toute la table users (2600+ lignes avec tout l'historique
    // vocal_sessions, ~1,5 Mo) à chaque miss de cache → 2,7 Go/jour d'egress Supabase
    // et la menace de coupure du plan Free (oct. 2026).
    const response = await topClassement(limit, period)
    if (!response.ok) {
      res.setHeader('Cache-Control', 'no-store')
      res.status(response.status).json({ error: await response.text() })
      return
    }
    const rows = await response.json()

    // Cache CDN : le classement ne bouge qu'à l'échelle de la minute.
    res.setHeader('Cache-Control', 'public, s-maxage=120, stale-while-revalidate=600')
    res.status(200).json(rows)
  } catch (error) {
    res.setHeader('Cache-Control', 'no-store')
    res.status(500).json({ error: error?.message || 'leaderboard_failed' })
  }
}
