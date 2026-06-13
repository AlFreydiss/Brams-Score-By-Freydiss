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

// Badges nominatifs (libellé + couleur) affichés dans le Fil et les profils.
// Override le défaut "Staff". Source unique — ne pas dupliquer ailleurs.
const ROLE_BADGES = {
  '1094070545248694342': { label: 'Développeur', color: '#A66CFF' }, // Al Freydiss — violet
  '1079054995917381672': { label: 'Fondateur',   color: '#E6B84D' }, // Brams — or
  '999607813334638692':  { label: 'Directeur',   color: '#E0524A' }, // Berat — rouge (couleur de sa certif)
}
export function roleBadge(discordId) {
  const b = ROLE_BADGES[String(discordId)]
  if (b) return b
  if (isStaff(discordId)) return { label: 'Staff', color: '#d4a017' }
  return null
}

// Certifications spéciales par Discord ID : ✓ coloré + rôle au survol (Fil + profil).
export const CERTIFS = {
  '1079054995917381672': { color: '#f5b50a', glow: 'rgba(245,181,10,.55)', title: 'Capitaine / Fondateur' },     // Brams — or
  '999607813334638692':  { color: '#e0524a', glow: 'rgba(224,82,74,.5)',   title: 'Directeur / Vice Capitaine' }, // Berat — rouge
  '1094070545248694342': { color: '#a855f7', glow: 'rgba(168,85,247,.55)', title: 'Navigateur / Développeur' },   // Al Freydiss — violet
  '1000000000000000001': { color: '#E60012', glow: 'rgba(230,0,18,.6)',    title: 'Bot officiel · IA de la Brams Community' }, // BramsScore
}
export function certif(discordId) {
  return CERTIFS[String(discordId)] || null
}
