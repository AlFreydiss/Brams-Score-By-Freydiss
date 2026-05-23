import type { PublishedTierList, Tier, TierItem } from './types'

const DRAFT_KEY = 'brams_tierlist_draft_v2'
const PUBLIC_KEY = 'brams_tierlists_public_v2'
const MY_KEY = 'brams_tierlists_my_v2'

type Draft = {
  title: string
  theme: string
  tiers: Tier[]
  items: TierItem[]
}

function read<T>(key: string, fallback: T): T {
  try {
    return JSON.parse(localStorage.getItem(key) || '') as T
  } catch {
    return fallback
  }
}

export function loadDraft(fallback: Draft) {
  return read<Draft>(DRAFT_KEY, fallback)
}

export function saveDraft(draft: Draft) {
  localStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
}

export function loadPublicLists() {
  return read<PublishedTierList[]>(PUBLIC_KEY, [])
}

export function loadMyLists() {
  return read<PublishedTierList[]>(MY_KEY, [])
}

export function savePublicLists(lists: PublishedTierList[]) {
  localStorage.setItem(PUBLIC_KEY, JSON.stringify(lists))
}

export function saveMyLists(lists: PublishedTierList[]) {
  localStorage.setItem(MY_KEY, JSON.stringify(lists))
}
