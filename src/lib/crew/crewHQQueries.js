import { supabase } from '../supabase.js'

// ── Permission levels ──────────────────────────────────────────────
// 0 = capitaine, 1 = officier, 2 = membre, 3 = mousse, 99 = visiteur
export const ROLE_LEVEL_HQ = {
  capitaine: 0,
  second: 1, navigateur: 1, cuisinier: 1, sniper: 1,
  medecin: 1, archeologue: 1, charpentier: 1, bretteur: 1,
  musicien: 2, timonier: 2, mousse: 3,
}
export function getLevelHQ(position) {
  return ROLE_LEVEL_HQ[position] ?? 99
}
export function canAct(actorLevel, action) {
  const RULES = {
    invite:          1, // officier+
    accept_app:      1,
    reject_app:      1,
    promote_to_off:  0, // capitaine seulement
    promote_to_mem:  1,
    demote:          1,
    remove_member:   1,
    remove_officer:  0,
    transfer_captain:0,
    delete_crew:     0,
    edit_settings:   0,
    create_announce: 1,
    manage_treasury: 0,
    create_mission:  0,
  }
  return actorLevel <= (RULES[action] ?? 0)
}

// ── Safe fetch helper ──────────────────────────────────────────────
async function safeFetch(queryFn, fallback = []) {
  if (!supabase) return fallback
  try {
    const { data, error } = await queryFn()
    if (error) { console.warn('[crewHQ]', error.message); return fallback }
    return data ?? fallback
  } catch (e) { console.warn('[crewHQ] catch', e.message); return fallback }
}

// ── Write log entry ────────────────────────────────────────────────
export async function writeCrewLog({ crewId, actorId, actorName, targetId, targetName, type, description, metadata = {}, visibility = 'members' }) {
  if (!supabase) return
  await supabase.from('crew_logs').insert({
    crew_id: crewId, actor_id: actorId, actor_name: actorName,
    target_id: targetId, target_name: targetName,
    type, description, metadata, visibility,
  }).catch(() => {})
}

// ── Fetch single crew ──────────────────────────────────────────────
export async function fetchCrewById(crewId) {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('crews')
    .select('*')
    .eq('id', crewId)
    .single()
  if (error) { console.error('[fetchCrewById]', error.message); return null }
  return data
}

// ── Fetch crew dashboard (all data at once) ────────────────────────
export async function fetchCrewDashboard(crewId) {
  if (!supabase) return null

  const [crewRes, lbRes, membersRes] = await Promise.all([
    supabase.from('crews').select('*').eq('id', crewId).single(),
    supabase.rpc('top_classement', { p_limit: 500 }),
    supabase.from('crew_members').select('*').eq('crew_id', crewId).order('contribution', { ascending: false }),
  ])

  if (crewRes.error) return null
  const crew = crewRes.data

  const lbMap = {}
  if (lbRes.data) {
    for (const row of lbRes.data) {
      lbMap[String(row.uid)] = { username: row.username, avatar_url: row.avatar_url, vocal_h: row.vocal_h, berrys: row.berrys }
    }
  }

  const members = (membersRes.data || []).map(m => ({
    ...m,
    username:   lbMap[String(m.user_id)]?.username   ?? `Pirate #${String(m.user_id).slice(-4)}`,
    avatar_url: lbMap[String(m.user_id)]?.avatar_url ?? null,
    vocal_h:    parseFloat(lbMap[String(m.user_id)]?.vocal_h  ?? 0),
    berrys:     parseInt(lbMap[String(m.user_id)]?.berrys  ?? 0),
  }))

  return { crew, members }
}

// ── Applications ───────────────────────────────────────────────────
export async function fetchCrewApplications(crewId) {
  return safeFetch(() => supabase
    .from('crew_applications')
    .select('*')
    .eq('crew_id', crewId)
    .order('created_at', { ascending: false })
  )
}

export async function applyToCrew({ crewId, userId, username, avatarUrl, message, availability, specialty, previousCrew, acceptsRules }) {
  if (!supabase) return { error: { message: 'Non connecté' } }

  // Check no pending application already
  const { data: existing } = await supabase
    .from('crew_applications')
    .select('id, status')
    .eq('crew_id', crewId)
    .eq('user_id', userId)
    .eq('status', 'pending')
    .maybeSingle()

  if (existing) return { error: { message: 'Tu as déjà une candidature en attente pour cet équipage.' } }

  const { data, error } = await supabase
    .from('crew_applications')
    .insert({ crew_id: crewId, user_id: userId, username, avatar_url: avatarUrl, message, availability, specialty, previous_crew: previousCrew, accepts_rules: acceptsRules })
    .select()
    .single()

  if (!error) {
    await writeCrewLog({ crewId, actorId: userId, actorName: username, type: 'application', description: `${username} a soumis une candidature.`, visibility: 'staff' })
  }
  return { data, error }
}

export async function acceptApplication({ applicationId, crewId, applicantId, applicantName, reviewerId, reviewerName }) {
  if (!supabase) return { error: { message: 'Non connecté' } }

  const [updateRes, joinRes] = await Promise.all([
    supabase.from('crew_applications').update({ status: 'accepted', reviewed_by: reviewerId, reviewed_at: new Date().toISOString() }).eq('id', applicationId),
    supabase.from('crew_members').upsert({ crew_id: crewId, user_id: applicantId, position: 'mousse', contribution: 0, joined_at: new Date().toISOString() }),
  ])

  if (!updateRes.error) {
    await writeCrewLog({ crewId, actorId: reviewerId, actorName: reviewerName, targetId: applicantId, targetName: applicantName, type: 'member_joined', description: `${applicantName} a rejoint l'équipage (candidature acceptée par ${reviewerName}).`, visibility: 'members' })
  }
  return updateRes
}

export async function rejectApplication({ applicationId, crewId, applicantName, reviewerId, reviewerName, note }) {
  if (!supabase) return { error: { message: 'Non connecté' } }

  const { error } = await supabase
    .from('crew_applications')
    .update({ status: 'rejected', reviewed_by: reviewerId, reviewed_at: new Date().toISOString(), internal_note: note })
    .eq('id', applicationId)

  if (!error) {
    await writeCrewLog({ crewId, actorId: reviewerId, actorName: reviewerName, targetName: applicantName, type: 'application_rejected', description: `Candidature de ${applicantName} refusée par ${reviewerName}.`, visibility: 'staff' })
  }
  return { error }
}

// ── Invitations ────────────────────────────────────────────────────
export async function fetchCrewInvites(crewId) {
  return safeFetch(() => supabase
    .from('crew_invites')
    .select('*')
    .eq('crew_id', crewId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
  )
}

export async function fetchMyInvites(userId) {
  return safeFetch(() => supabase
    .from('crew_invites')
    .select('*, crews(id, name, tag, emblem_emoji, primary_color)')
    .eq('invited_user_id', userId)
    .eq('status', 'pending')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
  )
}

export async function inviteMember({ crewId, invitedUserId, invitedName, invitedById, invitedByName }) {
  if (!supabase) return { error: { message: 'Non connecté' } }

  const { data, error } = await supabase
    .from('crew_invites')
    .insert({ crew_id: crewId, invited_user_id: invitedUserId, invited_by: invitedById, invited_name: invitedName })
    .select().single()

  if (!error) {
    await writeCrewLog({ crewId, actorId: invitedById, actorName: invitedByName, targetId: invitedUserId, targetName: invitedName, type: 'invite_sent', description: `${invitedByName} a invité ${invitedName || invitedUserId}.`, visibility: 'staff' })
  }
  return { data, error }
}

export async function respondToInvite({ inviteId, crewId, userId, username, accept }) {
  if (!supabase) return { error: { message: 'Non connecté' } }

  const status = accept ? 'accepted' : 'declined'
  const { error: updateErr } = await supabase.from('crew_invites').update({ status }).eq('id', inviteId)
  if (updateErr) return { error: updateErr }

  if (accept) {
    await supabase.from('crew_members').upsert({ crew_id: crewId, user_id: userId, position: 'mousse', contribution: 0, joined_at: new Date().toISOString() })
    await writeCrewLog({ crewId, actorId: userId, actorName: username, type: 'member_joined', description: `${username} a rejoint l'équipage (invitation acceptée).`, visibility: 'members' })
  }
  return { error: null }
}

// ── Member management ──────────────────────────────────────────────
export async function promoteMember({ crewId, targetId, targetName, newPosition, actorId, actorName, actorLevel }) {
  if (!supabase) return { error: { message: 'Non connecté' } }

  const targetLevel = getLevelHQ(newPosition)
  if (!canAct(actorLevel, targetLevel === 1 ? 'promote_to_off' : 'promote_to_mem'))
    return { error: { message: 'Permission refusée.' } }
  if (String(targetId) === String(actorId) && actorLevel !== 0)
    return { error: { message: 'Impossible de se promouvoir soi-même.' } }

  const { error } = await supabase.from('crew_members').update({ position: newPosition }).eq('crew_id', crewId).eq('user_id', targetId)
  if (!error) await writeCrewLog({ crewId, actorId, actorName, targetId, targetName, type: 'promotion', description: `${targetName} promu ${newPosition} par ${actorName}.`, visibility: 'members' })
  return { error }
}

export async function demoteMember({ crewId, targetId, targetName, newPosition, actorId, actorName, actorLevel }) {
  if (!supabase) return { error: { message: 'Non connecté' } }
  if (!canAct(actorLevel, 'demote')) return { error: { message: 'Permission refusée.' } }

  const { error } = await supabase.from('crew_members').update({ position: newPosition }).eq('crew_id', crewId).eq('user_id', targetId)
  if (!error) await writeCrewLog({ crewId, actorId, actorName, targetId, targetName, type: 'demotion', description: `${targetName} rétrogradé ${newPosition} par ${actorName}.`, visibility: 'members' })
  return { error }
}

export async function removeMember({ crewId, targetId, targetName, targetRole, actorId, actorName, actorLevel }) {
  if (!supabase) return { error: { message: 'Non connecté' } }

  const targetLevel = getLevelHQ(targetRole)
  const action = targetLevel <= 1 ? 'remove_officer' : 'remove_member'
  if (!canAct(actorLevel, action)) return { error: { message: 'Permission refusée.' } }
  if (targetLevel === 0) return { error: { message: 'Impossible d\'exclure le capitaine.' } }
  if (String(targetId) === String(actorId)) return { error: { message: 'Impossible de s\'exclure soi-même.' } }

  const { error } = await supabase.from('crew_members').delete().eq('crew_id', crewId).eq('user_id', targetId)
  if (!error) await writeCrewLog({ crewId, actorId, actorName, targetId, targetName, type: 'member_removed', description: `${targetName} a été exclu par ${actorName}.`, visibility: 'members' })
  return { error }
}

export async function transferCaptain({ crewId, newCaptainId, newCaptainName, actorId, actorName }) {
  if (!supabase) return { error: { message: 'Non connecté' } }
  if (String(actorId) === String(newCaptainId)) return { error: { message: 'Vous êtes déjà capitaine.' } }

  const [crewUpd, oldCapUpd, newCapUpd] = await Promise.all([
    supabase.from('crews').update({ captain_id: newCaptainId }).eq('id', crewId),
    supabase.from('crew_members').update({ position: 'second' }).eq('crew_id', crewId).eq('user_id', actorId),
    supabase.from('crew_members').update({ position: 'capitaine' }).eq('crew_id', crewId).eq('user_id', newCaptainId),
  ])
  if (!crewUpd.error) await writeCrewLog({ crewId, actorId, actorName, targetId: newCaptainId, targetName: newCaptainName, type: 'captain_transfer', description: `${actorName} a transféré le capitanat à ${newCaptainName}.`, visibility: 'members' })
  return crewUpd
}

// ── Settings ───────────────────────────────────────────────────────
export async function updateCrewSettings({ crewId, settings, actorId, actorName }) {
  if (!supabase) return { error: { message: 'Non connecté' } }

  const allowed = ['name','motto','description','emblem_emoji','primary_color','is_recruiting','recruitment_message','min_vocal_hours']
  const clean = Object.fromEntries(Object.entries(settings).filter(([k]) => allowed.includes(k)))
  clean.updated_at = new Date().toISOString()

  const { data, error } = await supabase.from('crews').update(clean).eq('id', crewId).select().single()
  if (!error) await writeCrewLog({ crewId, actorId, actorName, type: 'settings_updated', description: `Paramètres modifiés par ${actorName}.`, visibility: 'staff' })
  return { data, error }
}

export async function deleteCrew({ crewId, crewName, actorId, actorName, actorLevel }) {
  if (!supabase) return { error: { message: 'Non connecté' } }
  if (actorLevel !== 0) return { error: { message: 'Seul le capitaine peut supprimer l\'équipage.' } }

  const { error } = await supabase.from('crews').delete().eq('id', crewId)
  if (!error) console.log(`[crewHQ] Équipage "${crewName}" supprimé par ${actorName} (${actorId})`)
  return { error }
}

// ── Logs / Journal ─────────────────────────────────────────────────
export async function fetchCrewLogs(crewId, limit = 50) {
  return safeFetch(() => supabase
    .from('crew_logs')
    .select('*')
    .eq('crew_id', crewId)
    .order('created_at', { ascending: false })
    .limit(limit)
  )
}

// ── Announcements ──────────────────────────────────────────────────
export async function fetchCrewAnnouncements(crewId) {
  return safeFetch(() => supabase
    .from('crew_announcements')
    .select('*')
    .eq('crew_id', crewId)
    .order('pinned', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(10)
  )
}

export async function createAnnouncement({ crewId, authorId, authorName, title, content, priority, pinned }) {
  if (!supabase) return { error: { message: 'Non connecté' } }
  const { data, error } = await supabase.from('crew_announcements').insert({ crew_id: crewId, author_id: authorId, author_name: authorName, title, content, priority, pinned }).select().single()
  if (!error) await writeCrewLog({ crewId, actorId: authorId, actorName: authorName, type: 'announcement', description: `Nouvelle annonce : "${title}"`, visibility: 'members' })
  return { data, error }
}

// ── Missions ───────────────────────────────────────────────────────
export async function fetchCrewMissions(crewId) {
  return safeFetch(() => supabase
    .from('crew_missions')
    .select('*')
    .eq('crew_id', crewId)
    .in('status', ['active','completed'])
    .order('created_at', { ascending: false })
  )
}

// ── Treasury ───────────────────────────────────────────────────────
export async function fetchCrewTreasury(crewId) {
  return safeFetch(() => supabase
    .from('crew_treasury')
    .select('*')
    .eq('crew_id', crewId)
    .order('created_at', { ascending: false })
    .limit(30)
  )
}

export async function contributeToTreasury({ crewId, userId, username, amount, reason }) {
  if (!supabase) return { error: { message: 'Non connecté' } }
  if (amount <= 0) return { error: { message: 'Montant invalide.' } }

  // Get current balance
  const { data: crew } = await supabase.from('crews').select('treasury_balance').eq('id', crewId).single()
  const newBalance = (crew?.treasury_balance || 0) + amount

  const [txRes] = await Promise.all([
    supabase.from('crew_treasury').insert({ crew_id: crewId, user_id: userId, username, type: 'deposit', amount, balance_after: newBalance, reason }),
    supabase.from('crews').update({ treasury_balance: newBalance }).eq('id', crewId),
    supabase.from('crew_members').update({ contribution: supabase.raw(`contribution + ${amount}`) }).eq('crew_id', crewId).eq('user_id', userId).catch(() => {}),
  ])

  if (!txRes.error) await writeCrewLog({ crewId, actorId: userId, actorName: username, type: 'treasury_deposit', description: `${username} a contribué ${amount.toLocaleString('fr-FR')} ฿ au coffre.`, visibility: 'members' })
  return txRes
}

// ── Check membership ───────────────────────────────────────────────
export async function getUserCrewMembership(userId) {
  if (!supabase || !userId) return null
  const { data } = await supabase
    .from('crew_members')
    .select('crew_id, position')
    .eq('user_id', userId)
    .maybeSingle()
  return data
}
