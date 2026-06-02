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

// Durée max d'une session vocale "live" extrapolée (16h). Au-delà, c'est
// quasi sûrement un join_time fantôme (session jamais fermée) → on ne compte pas.
const MAX_LIVE_SESSION = 16 * 3600

function secondsInPeriod(sessions = [], days, joinTime, now) {
  const cutoff = now - days * 86400
  let total = 0

  for (const session of sessions) {
    const start = Number(session?.start || 0)
    const end = Number(session?.end || 0)
    if (!start || !end || end < cutoff) continue
    total += Math.max(0, Math.min(end, now) - Math.max(start, cutoff))
  }

  // Session live en cours (join_time sans end). On plafonne à MAX_LIVE_SESSION :
  // sinon un join_time resté ouvert (membre parti sans que le bot ferme la session)
  // compterait toute la fenêtre (jusqu'à 168h/semaine) → tout le monde "Roi des pirates".
  const jt = Number(joinTime || 0)
  if (jt > 0) total += Math.min(Math.max(0, now - Math.max(jt, cutoff)), MAX_LIVE_SESSION)
  return total
}

function totalSeconds(sessions = [], joinTime, extraSeconds, now) {
  let total = Number(extraSeconds || 0)

  for (const session of sessions) {
    const start = Number(session?.start || 0)
    const end = Number(session?.end || 0)
    if (!start || !end) continue
    total += Math.max(0, Math.min(end, now) - start)
  }

  const jt = Number(joinTime || 0)
  if (jt > 0) total += Math.min(Math.max(0, now - jt), MAX_LIVE_SESSION)
  return total
}

function computeHours(userData, period, now) {
  const sessions = Array.isArray(userData?.vocal_sessions) ? userData.vocal_sessions : []
  const joinTime = userData?.join_time
  const days = PERIOD_DAYS[period]
  const seconds = days
    ? secondsInPeriod(sessions, days, joinTime, now)
    : totalSeconds(sessions, joinTime, userData?.extra_seconds, now)
  return Math.round((seconds / 3600) * 10) / 10
}

function getRequestUrl(req) {
  const proto = req.headers['x-forwarded-proto'] || 'https'
  const host = req.headers.host || 'localhost'
  return new URL(req.url || '/', `${proto}://${host}`)
}

export default async function handler(req, res) {
  if (!API_KEY) {
    res.status(500).json({ error: 'SUPABASE key missing' })
    return
  }

  const requestUrl = getRequestUrl(req)
  const limit = Math.min(Math.max(parseInt(requestUrl.searchParams.get('limit') || '100', 10) || 100, 1), 500)
  const period = String(requestUrl.searchParams.get('period') || 'week').toLowerCase()
  const now = Date.now() / 1000

  try {
    const usersUrl = new URL('/rest/v1/users', SUPABASE_URL)
    usersUrl.searchParams.set('select', 'uid,data')
    usersUrl.searchParams.set('limit', '1000')

    const response = await fetch(usersUrl, {
      headers: {
        apikey: API_KEY,
        Authorization: `Bearer ${API_KEY}`,
      },
    })

    if (!response.ok) {
      res.status(response.status).json({ error: await response.text() })
      return
    }

    const users = await response.json()
    const rows = users
      .filter((user) => user?.data)
      .map((user) => {
        const data = user.data || {}
        return {
          uid: String(user.uid),
          username: data.username || `Pirate #${String(user.uid).slice(-5)}`,
          avatar_url: data.avatar_url || null,
          vocal_h: computeHours(data, period, now),
          berrys: Number.parseInt(data.berrys || 0, 10) || 0,
        }
      })
      .sort((a, b) => (b.vocal_h - a.vocal_h) || (b.berrys - a.berrys))
      .slice(0, limit)

    res.setHeader('Cache-Control', 'no-store')
    res.status(200).json(rows)
  } catch (error) {
    res.setHeader('Cache-Control', 'no-store')
    res.status(500).json({ error: error?.message || 'leaderboard_failed' })
  }
}
