import { supabase } from './supabase.js'

const CLIENT_KEY = 'brams_tierlist_client_id'

export function getTierListClientId() {
  try {
    let id = localStorage.getItem(CLIENT_KEY)
    if (!id) {
      id = crypto?.randomUUID?.() || Math.random().toString(36).slice(2)
      localStorage.setItem(CLIENT_KEY, id)
    }
    return id
  } catch {
    return 'guest'
  }
}

async function authHeaders() {
  const headers = {
    'Content-Type': 'application/json',
    'X-Client-Id': getTierListClientId(),
  }
  try {
    const { data } = supabase ? await supabase.auth.getSession() : { data:null }
    if (data?.session?.access_token) headers.Authorization = `Bearer ${data.session.access_token}`
  } catch {
    // Guest autosave still works through X-Client-Id.
  }
  return headers
}

async function request(path, options = {}) {
  const headers = await authHeaders()
  const response = await fetch(path, {
    ...options,
    headers: { ...headers, ...(options.headers || {}) },
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    // Messages lisibles : on n'expose ni le code HTTP brut ni l'erreur Postgres.
    const friendly =
      response.status === 413 ? 'Tier list trop lourde à sauvegarder — réduis le nombre d’images custom.'
      : response.status === 401 ? 'Connexion requise pour cette action.'
      : response.status === 403 ? (data.error || 'Action non autorisée.')
      : response.status >= 500 ? (data.error || 'Service momentanément indisponible, réessaie.')
      : (data.error || 'Action impossible, réessaie.')
    const err = new Error(friendly)
    err.status = response.status
    throw err
  }
  return data
}

export async function fetchCommunityTierLists() {
  const data = await request('/api/tierlists?action=public')
  return data.lists || []
}

export async function fetchMyCloudTierLists() {
  const data = await request('/api/tierlists?action=mine')
  return data.lists || []
}

export async function fetchCloudDraft() {
  const data = await request('/api/tierlists?action=draft')
  return data.draft || null
}

export async function autosaveTierList(list) {
  return request('/api/tierlists?action=autosave', {
    method: 'POST',
    body: JSON.stringify({ clientId: getTierListClientId(), list }),
  })
}

export async function publishTierList(list) {
  return request('/api/tierlists?action=publish', {
    method: 'POST',
    body: JSON.stringify({ clientId: getTierListClientId(), list }),
  })
}

export async function deleteCommunityTierList(id) {
  return request('/api/tierlists?action=delete', {
    method: 'POST',
    body: JSON.stringify({ clientId: getTierListClientId(), id }),
  })
}

export async function toggleTierListLike(id) {
  return request('/api/tierlists?action=like', {
    method: 'POST',
    body: JSON.stringify({ clientId: getTierListClientId(), id }),
  })
}
