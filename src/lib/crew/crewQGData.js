import { supabase } from '../supabase.js'
import { fetchCrews, fetchCrewMembersEnriched } from './supabaseCrewQueries.js'

export const CREW_ROLES = {
  captain: 'Capitaine',
  vice_captain: 'Vice-capitaine',
  officer: 'Officier',
  strategist: 'Stratege',
  recruiter: 'Recruteur',
  treasurer: 'Tresorier',
  diplomat: 'Diplomate',
  elite: "Membre d'elite",
  member: 'Membre',
  recruit: 'Recrue',
  visitor: 'Visiteur',
}

export const CREW_TABS = [
  ['overview', "Vue d'ensemble"],
  ['members', 'Membres'],
  ['hierarchy', 'Hierarchie'],
  ['recruitment', 'Recrutement'],
  ['missions', 'Missions'],
  ['treasury', 'Coffre'],
  ['territories', 'Territoires'],
  ['diplomacy', 'Diplomatie'],
  ['journal', 'Journal'],
  ['ranking', 'Classement'],
  ['settings', 'Parametres'],
]

export const PERMISSIONS = {
  captain: [
    'manage_settings', 'manage_roles', 'invite', 'review_applications', 'kick',
    'transfer_captain', 'delete_crew', 'manage_treasury', 'withdraw_treasury',
    'manage_diplomacy', 'manage_missions', 'post_announcement',
  ],
  vice_captain: [
    'invite', 'review_applications', 'kick_basic', 'promote_limited',
    'manage_missions', 'post_announcement', 'manage_recruitment',
  ],
  officer: ['manage_missions', 'propose_promotion', 'flag_inactive'],
  recruiter: ['invite', 'review_applications', 'manage_recruitment'],
  treasurer: ['manage_treasury', 'withdraw_treasury'],
  diplomat: ['manage_diplomacy'],
  elite: ['participate'],
  member: ['participate'],
  recruit: ['participate'],
  visitor: [],
}

const fallbackCrew = {
  id: 'demo-brams-vanguard',
  name: 'Brams Vanguard',
  tag: 'BRMS',
  slug: 'brams-vanguard',
  motto: 'Un pavillon, une prime, une legende.',
  description: 'QG de demonstration pret a accueillir les premiers pirates du serveur.',
  emblem_url: '',
  banner_url: '',
  primary_color: '#d4af37',
  status: 'active',
  level: 7,
  xp: 6420,
  xp_target: 10000,
  reputation: 74,
  total_bounty: 0,
  recruitment_open: true,
  recruitment_message: 'Les candidatures sont ouvertes aux pirates actifs, fiables et ambitieux.',
  captain_id: null,
  captain_name: 'A nommer',
  rank_server: 'Non classe',
  created_at: new Date().toISOString(),
  isFallback: true,
}

const fallbackMembers = []

export const fallbackMissions = [
  { id: 'm1', type: 'Hebdo', title: 'Recruter 2 nouveaux pirates', progress: 0, target: 2, reward: '25 000 XP equipage', status: 'active', deadline: 'Fin de semaine' },
  { id: 'm2', type: 'Prime', title: 'Atteindre 1 000 000 berries de prime totale', progress: 0, target: 1000000, reward: 'Badge Chasseurs de primes', status: 'active', deadline: 'Saison' },
  { id: 'm3', type: 'Activite', title: 'Maintenir 7 jours d activite', progress: 2, target: 7, reward: 'Reputation +5', status: 'active', deadline: '7 jours' },
]

export const fallbackApplications = [
  { id: 'a1', name: 'Aucune candidature', status: 'empty', specialty: 'Le navire attend son premier dossier.', availability: '-' },
]

export const fallbackInvites = [
  { id: 'i1', name: 'Aucune invitation en attente', status: 'empty', expires_at: null },
]

export const fallbackLogs = [
  { id: 'l1', type: 'system', visibility: 'public', actor: 'Systeme', target: fallbackCrew.name, description: 'Le livre de bord est pret a recevoir les premieres actions.', created_at: new Date().toISOString() },
]

export const fallbackAnnouncements = [
  { id: 'n1', priority: 'info', pinned: true, title: 'Conseil du capitaine', content: 'Definissez une devise, recrutez vos premiers membres et lancez la premiere mission.', author: 'QG Brams', created_at: new Date().toISOString() },
]

export const fallbackEvents = [
  { id: 'e1', title: 'Reunion vocale', starts_at: 'A planifier', participants: 0, description: 'Fixez un rendez-vous pour organiser le navire.' },
]

export const fallbackTerritories = [
  { id: 't1', key: 'ile-neutre', name: 'Ile neutre', status: 'neutral', bonus: 'Aucun bonus', x: 28, y: 44 },
  { id: 't2', key: 'port-bronze', name: 'Port de Bronze', status: 'locked', bonus: '+5% reputation', x: 62, y: 35 },
  { id: 't3', key: 'recif-rouge', name: 'Recif Rouge', status: 'enemy', bonus: '+2 missions', x: 76, y: 68 },
]

export const fallbackDiplomacy = [
  { id: 'd1', name: 'Aucun pacte signe', type: 'neutral', note: 'Les relations diplomatiques sont vierges.' },
]

export function normalizeCrew(raw) {
  if (!raw) return fallbackCrew
  return {
    ...fallbackCrew,
    ...raw,
    motto: raw.motto || raw.description || fallbackCrew.motto,
    recruitment_open: raw.recruitment_open ?? raw.is_recruiting ?? fallbackCrew.recruitment_open,
    captain_name: raw.captain_name || (raw.captain_id ? `Pirate #${String(raw.captain_id).slice(-4)}` : fallbackCrew.captain_name),
    rank_server: raw.rank_server || 'En progression',
    total_bounty: Number(raw.total_bounty || 0),
    level: raw.level || 1,
    xp: raw.xp || 0,
    xp_target: raw.xp_target || 10000,
    reputation: raw.reputation || 50,
  }
}

export function normalizeMembers(members = [], crew) {
  return members.map((m, index) => {
    const position = m.position || m.role || (String(m.user_id) === String(crew?.captain_id) ? 'captain' : 'member')
    const canonicalRole = position === 'capitaine' ? 'captain'
      : position === 'second' ? 'vice_captain'
      : position === 'mousse' ? 'member'
      : position
    return {
      id: m.id || `${m.crew_id || crew?.id}-${m.user_id}`,
      user_id: String(m.user_id),
      name: m.username || m.display_name || `Pirate #${String(m.user_id).slice(-4)}`,
      avatar_url: m.avatar_url || '',
      role: canonicalRole,
      custom_title: m.custom_title || CREW_ROLES[canonicalRole] || m.position || 'Membre',
      rank: m.rank || index + 1,
      bounty: Number(m.bounty ?? m.contribution ?? 0),
      contribution: Number(m.contribution || 0),
      joined_at: m.joined_at || m.created_at || null,
      status: m.status || 'active',
      is_elite: !!m.is_elite || canonicalRole === 'elite',
      probation_until: m.probation_until || null,
      badges: m.badges || inferBadges(canonicalRole, index),
      level: m.level || Math.max(1, Math.round((Number(m.contribution || 0) / 100000) + 1)),
    }
  })
}

function inferBadges(role, index) {
  const badges = []
  if (role === 'captain') badges.push('Fondateur')
  if (role === 'vice_captain') badges.push('Bras droit')
  if (role === 'treasurer') badges.push('Tresorier')
  if (index === 0 && role !== 'captain') badges.push('MVP du mois')
  if (!badges.length) badges.push(index < 3 ? 'Pilier' : 'Nouveau pirate')
  return badges
}

export function deriveViewerRole(userDiscordId, crew, members) {
  if (!userDiscordId) return 'visitor'
  if (String(crew?.captain_id) === String(userDiscordId)) return 'captain'
  const member = members.find(m => String(m.user_id) === String(userDiscordId) && m.status === 'active')
  return member?.role || 'visitor'
}

export function uiCanShow(role, permission) {
  return PERMISSIONS[role]?.includes(permission) || false
}

export async function fetchCrewDashboard(userDiscordId) {
  const crews = await fetchCrews()
  const activeCrew = normalizeCrew(crews?.[0])
  const membersRaw = activeCrew?.id && !activeCrew.isFallback
    ? await fetchCrewMembersEnriched(activeCrew.id)
    : fallbackMembers

  const members = normalizeMembers(membersRaw || fallbackMembers, activeCrew)
  const viewerRole = deriveViewerRole(userDiscordId, activeCrew, members)

  let extra = {}
  if (supabase && activeCrew?.id && !activeCrew.isFallback) {
    extra = await fetchOptionalCrewCollections(activeCrew.id, viewerRole)
  }

  return {
    crew: activeCrew,
    members,
    viewerRole,
    missions: extra.missions?.length ? extra.missions : fallbackMissions,
    applications: extra.applications?.length ? extra.applications : fallbackApplications,
    invites: extra.invites?.length ? extra.invites : fallbackInvites,
    logs: extra.logs?.length ? extra.logs : fallbackLogs,
    announcements: extra.announcements?.length ? extra.announcements : fallbackAnnouncements,
    events: extra.events?.length ? extra.events : fallbackEvents,
    territories: extra.territories?.length ? extra.territories : fallbackTerritories,
    diplomacy: extra.diplomacy?.length ? extra.diplomacy : fallbackDiplomacy,
  }
}

async function fetchOptionalCrewCollections(crewId, viewerRole) {
  const safe = async (query) => {
    const { data, error } = await query
    if (error) return []
    return data || []
  }

  const isMember = viewerRole !== 'visitor'
  const isStaff = ['captain', 'vice_captain', 'officer', 'recruiter', 'treasurer', 'diplomat'].includes(viewerRole)

  if (!isMember) {
    const territories = await safe(supabase.from('crew_territories').select('*').eq('crew_id', crewId).order('created_at', { ascending: false }))
    return { territories }
  }

  const [
    missions, applications, invites, logs, announcements, events, territories, diplomacy,
  ] = await Promise.all([
    safe(supabase.from('crew_missions').select('*').eq('crew_id', crewId).order('created_at', { ascending: false }).limit(20)),
    isStaff ? safe(supabase.from('crew_applications').select('*').eq('crew_id', crewId).order('created_at', { ascending: false }).limit(20)) : Promise.resolve([]),
    isStaff ? safe(supabase.from('crew_invites').select('*').eq('crew_id', crewId).order('created_at', { ascending: false }).limit(20)) : Promise.resolve([]),
    safe(supabase.from('crew_logs').select('*').eq('crew_id', crewId).order('created_at', { ascending: false }).limit(40)),
    safe(supabase.from('crew_announcements').select('*').eq('crew_id', crewId).order('created_at', { ascending: false }).limit(12)),
    safe(supabase.from('crew_events').select('*').eq('crew_id', crewId).order('starts_at', { ascending: true }).limit(12)),
    safe(supabase.from('crew_territories').select('*').eq('crew_id', crewId).order('created_at', { ascending: false })),
    safe(supabase.from('crew_diplomacy').select('*').eq('crew_id', crewId).order('created_at', { ascending: false })),
  ])

  return { missions, applications, invites, logs, announcements, events, territories, diplomacy }
}
