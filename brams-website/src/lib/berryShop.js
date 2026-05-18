import { supabase } from './supabase.js'

export const SHOP_CATEGORIES = [
  'Cosmetique',
  'Roles Discord',
  'Badges',
  'Boosts',
  'Coffres',
  'Evenements',
  'Equipage',
]

export const RARITY_STYLES = {
  Commun: { color: '#9ca3af', label: 'Commun' },
  Rare: { color: '#4db5ff', label: 'Rare' },
  Epique: { color: '#ad6bff', label: 'Epique' },
  Legendaire: { color: '#f6b34b', label: 'Legendaire' },
  Mythique: { color: '#e0524a', label: 'Mythique' },
}

const FALLBACK_ITEMS = [
  {
    id: 'preview-title-pirate',
    name: 'Titre: Pirate Prime',
    description: 'Titre premium visible sur ton profil Brams.',
    category: 'Cosmetique',
    price: 1200,
    rarity: 'Rare',
    stock: null,
    limited: false,
    active: true,
    reward_type: 'profile_title',
    reward_data: { title: 'Pirate Prime' },
  },
  {
    id: 'preview-role-vip',
    name: 'Role Discord: Corsaire VIP',
    description: 'Role Discord achetable avec verification serveur obligatoire.',
    category: 'Roles Discord',
    price: 3500,
    rarity: 'Epique',
    stock: 12,
    limited: true,
    active: true,
    reward_type: 'discord_role',
    reward_data: { roleName: 'Corsaire VIP' },
  },
  {
    id: 'preview-chest',
    name: 'Coffre Mystere Grand Line',
    description: 'Ouvre une recompense aleatoire: badge, titre, boost ou item rare.',
    category: 'Coffres',
    price: 900,
    rarity: 'Legendaire',
    stock: null,
    limited: false,
    active: true,
    reward_type: 'mystery_chest',
    reward_data: { pool: 'grand_line' },
  },
]

export async function fetchBerryShopState(discordId) {
  if (!supabase || !discordId) {
    return { balance: 0, items: FALLBACK_ITEMS, inventory: [], transactions: [], preview: true }
  }

  const [{ data: balanceData }, { data: items }, { data: inventory }, { data: transactions }] = await Promise.all([
    supabase.rpc('get_berry_balance'),
    supabase.from('shop_items').select('*').eq('active', true).order('price', { ascending: true }),
    supabase.from('user_inventory').select('*, shop_items(*)').eq('discord_id', discordId).order('acquired_at', { ascending: false }),
    supabase.from('shop_transactions').select('*, shop_items(name, rarity, category)').eq('discord_id', discordId).order('created_at', { ascending: false }).limit(20),
  ])

  return {
    balance: Number(balanceData || 0),
    items: items?.length ? items : FALLBACK_ITEMS,
    inventory: inventory || [],
    transactions: transactions || [],
    preview: false,
  }
}

export async function purchaseShopItem(itemId) {
  if (!supabase) return { error: { message: 'Supabase non configure.' } }
  const idempotencyKey = `${itemId}-${crypto.randomUUID()}`
  const { data, error } = await supabase.rpc('purchase_shop_item', {
    p_item_id: itemId,
    p_idempotency_key: idempotencyKey,
  })
  return { data, error }
}

export async function fetchAdminShopData() {
  if (!supabase) return { items: [], transactions: [] }
  const [{ data: items }, { data: transactions }] = await Promise.all([
    supabase.from('shop_items').select('*').order('created_at', { ascending: false }),
    supabase.from('shop_transactions').select('*, shop_items(name)').order('created_at', { ascending: false }).limit(80),
  ])
  return { items: items || [], transactions: transactions || [] }
}

export async function upsertShopItem(item) {
  if (!supabase) return { error: { message: 'Supabase non configure.' } }
  return supabase.from('shop_items').upsert(item).select().single()
}
