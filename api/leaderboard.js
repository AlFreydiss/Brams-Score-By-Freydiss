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

// Durée max d'une session vocale "live" extrapolée (24h). Au-delà, c'est
// quasi sûrement un join_time fantôme (session jamais fermée) → on ne compte pas.
// 24h (vs 16h) : un farmer h24 d'une journée n'est plus rogné. Les fantômes sont
// de toute façon évités à la source côté bot (heartbeat voice_seen 2 min).
const MAX_LIVE_SESSION = 24 * 3600

function secondsInPeriod(sessions = [], days, joinTime, now) {
  const cutoff = now - days * 86400
  let total = 0

  for (const session of sessions) {
    const start = Number(session?.start || 0)
    const end = Number(session?.end || 0)
    if (!start || !end || end < cutoff) continue
    // Même plafond anti-fantôme que le bot (16h/session) → le site reflète /top.
    const dur = Math.min(end, now) - Math.max(start, cutoff)
    total += Math.min(Math.max(0, dur), MAX_LIVE_SESSION)
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
    // TOUTE la table users, paginée par 1000 (PostgREST plafonne chaque page).
    // Avant : une seule page de 1000 sans ordre → ~la moitié des 2000+ membres
    // absente du classement selon l'ordre physique de la table.
    const users = []
    const PAGE = 1000
    for (let offset = 0; offset < 10000; offset += PAGE) {
      const usersUrl = new URL('/rest/v1/users', SUPABASE_URL)
      usersUrl.searchParams.set('select', 'uid,data')
      usersUrl.searchParams.set('order', 'uid.asc')
      usersUrl.searchParams.set('limit', String(PAGE))
      usersUrl.searchParams.set('offset', String(offset))

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
      const page = await response.json()
      users.push(...page)
      if (page.length < PAGE) break
    }
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

    // Cache CDN court : le classement ne bouge qu'à l'heure → on évite de re-scanner
    // TOUTE la table users à chaque vue (la cause n°1 de surcharge / 502). 20s de
    // cache edge + stale-while-revalidate = quasi-temps-réel sans matraquer la DB.
    res.setHeader('Cache-Control', 'public, s-maxage=20, stale-while-revalidate=60')
    res.status(200).json(rows)
  } catch (error) {
    res.setHeader('Cache-Control', 'no-store')
    res.status(500).json({ error: error?.message || 'leaderboard_failed' })
  }
}
