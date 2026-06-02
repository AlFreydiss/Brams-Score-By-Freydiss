// api/_staff.js — Source unique des IDs staff côté API (Vercel serverless)
// Synchronisé manuellement avec src/lib/roles.js — toute modif doit être faite des deux côtés.

export const CREATOR_DISCORD_ID = '1094070545248694342'

export const STAFF_DISCORD_IDS = [
  '1094070545248694342', // Al Freydiss — créateur
  '999607813334638692',  // Berat
  '1079054995917381672', // Brams
  '670668161540161559',  // BenActief
  '1095386277169340426', // Mowgli
  '239486561366835201',  // Yoonae
]

export function resolveDiscordId(user) {
  // Priorité absolue : identities Discord (source Supabase Auth, non modifiable par l'utilisateur)
  // Ne JAMAIS faire confiance à user_metadata — c'est modifiable par l'utilisateur via l'API
  const discord = user?.identities?.find(i => i.provider === 'discord')
  if (discord) {
    return discord.identity_data?.provider_id || discord.identity_data?.sub || null
  }
  // Fallback uniquement si pas d'identité Discord (connexion email) — pas utilisé pour le check staff
  return user?.app_metadata?.provider_id || null
}

export function isStaffId(discordId) {
  return STAFF_DISCORD_IDS.includes(String(discordId))
}

export function isCreatorId(discordId) {
  return String(discordId) === CREATOR_DISCORD_ID
}

const SUPABASE_URL  = 'https://zeqetrmulqndxugfbojd.supabase.co'
const SUPABASE_ANON = process.env.SUPABASE_ANON_KEY
  || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InplcWV0cm11bHFuZHh1Z2Zib2pkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzNzUxNzksImV4cCI6MjA5MTk1MTE3OX0.HQbMRJnT_FAFfA8kYi-DYgjOuPnGpQU5zkeRAGb8Qso'

/**
 * Vérifie le JWT d'une requête et retourne { user, discordId } ou lève une erreur HTTP.
 * @returns {{ user: object, discordId: string }}
 */
export async function requireAuth(req, res) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '').trim()
  if (!token) {
    res.status(401).json({ error: 'Token manquant' })
    return null
  }
  try {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { 'Authorization': `Bearer ${token}`, 'apikey': SUPABASE_ANON },
    })
    if (!r.ok) {
      res.status(401).json({ error: 'Token invalide ou expiré' })
      return null
    }
    const user = await r.json()
    return { user, discordId: resolveDiscordId(user), token }
  } catch {
    res.status(500).json({ error: 'Impossible de vérifier le token' })
    return null
  }
}

/**
 * Vérifie que l'appelant est staff. Retourne { user, discordId } ou envoie 403.
 */
export async function requireStaff(req, res) {
  const auth = await requireAuth(req, res)
  if (!auth) return null
  if (!isStaffId(auth.discordId)) {
    res.status(403).json({ error: 'Accès refusé — réservé au staff', discordId: auth.discordId })
    return null
  }
  return auth
}

/**
 * Vérifie que l'appelant est le créateur. Retourne { user, discordId } ou envoie 403.
 */
export async function requireCreator(req, res) {
  const auth = await requireAuth(req, res)
  if (!auth) return null
  if (!isCreatorId(auth.discordId)) {
    res.status(403).json({ error: 'Accès refusé — réservé au créateur', discordId: auth.discordId })
    return null
  }
  return auth
}
