import type { Tier, TierItem } from './types'

export const DEFAULT_TIERS: Tier[] = [
  { id: 's', label: 'S', color: '#ef4444' },
  { id: 'a', label: 'A', color: '#f97316' },
  { id: 'b', label: 'B', color: '#eab308' },
  { id: 'c', label: 'C', color: '#22c55e' },
  { id: 'd', label: 'D', color: '#3b82f6' },
  { id: 'e', label: 'E', color: '#a855f7' },
  { id: 'f', label: 'F', color: '#64748b' },
]

export const STARTER_ITEMS: TierItem[] = [
  { id: 'item-luffy', name: 'Luffy', tierId: 's' },
  { id: 'item-zoro', name: 'Zoro', tierId: 's' },
  { id: 'item-sanji', name: 'Sanji', tierId: 'a' },
  { id: 'item-usopp', name: 'Usopp', tierId: 'b' },
  { id: 'item-nami', name: 'Nami', tierId: null },
  { id: 'item-robin', name: 'Robin', tierId: null },
]

export const THEME_IDEAS = [
  'Openings anime',
  'Personnages One Piece',
  'Arcs manga',
  'Jeux vidéo',
  'Films cultes',
  'Fast-food',
  'Fruits du démon',
  'Méchant d’anime',
]

export function uid(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

export function splitItems(value: string) {
  return value
    .split(/[\n,]/)
    .map(item => item.trim())
    .filter(Boolean)
}
