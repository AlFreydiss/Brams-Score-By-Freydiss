const SUPABASE_URL = process.env.SUPABASE_REST_URL || process.env.VITE_SUPABASE_URL || 'https://zeqetrmulqndxugfbojd.supabase.co'
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || ''

const PERIOD_DAYS = {
  day: 1,
  today: 1,
  week: 7,
  '7d': 7,
  month: 30,
  '30d': 30,
}

function secondsInPeriod(sessions = [], days, joinTime, now) {
  const cutoff = now - days * 86400
  let total = 0

  for (const session of sessions) {
    const start = Number(session?.start || 0)
    const end = Number(session?.end || 0)
    if (!start || !end || end < cutoff) continue
    total += Math.max(0, Math.min(end, now) - Math.max(start, cutoff))
  }

  const jt = Number(joinTime || 0)
  if (jt > 0) total += Math.max(0, now - Math.max(jt, cutoff))
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
  if (jt > 0) total += Math.max(0, now - jt)
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

export default async function handler(req, res) {
  if (!SERVICE_KEY) {
    res.status(500).json({ error: 'SUPABASE_SERVICE_KEY missing' })
    return
  }

  const limit = Math.min(Math.max(parseInt(req.query.limit || '100', 10) || 100, 1), 500)
  const period = String(req.query.period || 'week').toLowerCase()
  const now = Date.now() / 1000

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/users?select=uid,data&limit=1000`, {
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
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
      .sort((a, b) => b.vocal_h - a.vocal_h)
      .slice(0, limit)

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300')
    res.status(200).json(rows)
  } catch (error) {
    res.status(500).json({ error: error?.message || 'leaderboard_failed' })
  }
}
