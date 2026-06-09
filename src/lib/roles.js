// ── Source unique des rôles Brams Community ────────────────────────────────
// Toujours importer d'ici — ne jamais dupliquer ces IDs dans les composants.

export const CREATOR_DISCORD_ID = '1094070545248694342'

export const STAFF_DISCORD_IDS = [
  '1094070545248694342', // Al Freydiss — créateur
  '999607813334638692',  // Berat
  '1079054995917381672', // Brams
  '670668161540161559',  // BenActief
  '1095386277169340426', // Mowgli
  '239486561366835201',  // Yoonae
  '662012021684043787',  // Modo (certif bleu + modération)
]

export const STAFF_SUPABASE_UUIDS = [
  'a7cf1a55-97bf-4648-9297-7af6e6d02720', // Freydiss (connexion email fallback)
]

export function isCreator(discordId) {
  return String(discordId) === CREATOR_DISCORD_ID
}

export function isStaff(discordId, supabaseUserId) {
  return (
    STAFF_DISCORD_IDS.includes(String(discordId)) ||
    STAFF_SUPABASE_UUIDS.includes(String(supabaseUserId))
  )
}

// isAdmin = même périmètre que isStaff (pas de tier séparé pour l'instant)
export const isAdmin = isStaff
