const IDB_NAME = 'brams_tier_studio'
const IDB_STORE = 'kv'
const IDB_VERSION = 1

let _db = null

async function getDb() {
  if (_db) return _db
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, IDB_VERSION)
    req.onupgradeneeded = e => e.target.result.createObjectStore(IDB_STORE)
    req.onsuccess = e => { _db = e.target.result; resolve(_db) }
    req.onerror = () => reject(req.error)
  })
}

async function idbGet(key) {
  try {
    const db = await getDb()
    return new Promise((resolve, reject) => {
      const req = db.transaction(IDB_STORE, 'readonly').objectStore(IDB_STORE).get(key)
      req.onsuccess = () => resolve(req.result ?? null)
      req.onerror = () => reject(req.error)
    })
  } catch { return null }
}

async function idbSet(key, value) {
  try {
    const db = await getDb()
    return new Promise((resolve, reject) => {
      const req = db.transaction(IDB_STORE, 'readwrite').objectStore(IDB_STORE).put(value, key)
      req.onsuccess = () => resolve(true)
      req.onerror = () => reject(req.error)
    })
  } catch { return false }
}

async function idbRemove(key) {
  try {
    const db = await getDb()
    return new Promise((resolve, reject) => {
      const req = db.transaction(IDB_STORE, 'readwrite').objectStore(IDB_STORE).delete(key)
      req.onsuccess = () => resolve(true)
      req.onerror = () => reject(req.error)
    })
  } catch { return false }
}

export const STORAGE_KEY = 'brams_tier_studio_v1'
export const DRAFT_KEY = 'brams_tier_studio_draft_v1'
export const DRAFT_HISTORY_KEY = 'brams_tier_studio_draft_history_v1'

export async function loadSavedListsIDB() {
  const data = await idbGet(STORAGE_KEY)
  if (Array.isArray(data)) return data
  try {
    const legacy = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
    if (legacy.length) {
      await idbSet(STORAGE_KEY, legacy)
      try { localStorage.removeItem(STORAGE_KEY) } catch {}
      return legacy
    }
  } catch {}
  return []
}

export async function saveListsIDB(lists) {
  return idbSet(STORAGE_KEY, lists)
}

export async function loadDraftIDB() {
  const data = await idbGet(DRAFT_KEY)
  if (data) return data
  try {
    const legacy = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null')
    if (legacy) {
      await idbSet(DRAFT_KEY, legacy)
      try { localStorage.removeItem(DRAFT_KEY) } catch {}
      return legacy
    }
  } catch {}
  return null
}

export async function saveDraftIDB(draft) {
  return idbSet(DRAFT_KEY, draft)
}

export async function clearDraftIDB() {
  return idbRemove(DRAFT_KEY)
}

export async function loadDraftHistoryIDB() {
  const data = await idbGet(DRAFT_HISTORY_KEY)
  return Array.isArray(data) ? data : []
}

export async function saveDraftHistoryIDB(history) {
  return idbSet(DRAFT_HISTORY_KEY, history)
}

export async function clearDraftHistoryIDB() {
  return idbRemove(DRAFT_HISTORY_KEY)
}
