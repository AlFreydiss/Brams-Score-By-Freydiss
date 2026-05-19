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
    name: 'Titre : Pirate Prime',
    description: 'Titre premium visible sur ton profil Brams Community.',
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
    id: 'preview-title-yonkou',
    name: 'Titre : Futur Yonkou',
    description: 'Reservé aux membres les plus actifs. Titre légendaire sur ton profil.',
    category: 'Cosmetique',
    price: 5000,
    rarity: 'Legendaire',
    stock: null,
    limited: false,
    active: true,
    reward_type: 'profile_title',
    reward_data: { title: 'Futur Yonkou' },
  },
  {
    id: 'preview-title-nakama',
    name: 'Titre : Nakama de Brams',
    description: 'Le titre des fidèles. Montre ton appartenance au crew.',
    category: 'Cosmetique',
    price: 500,
    rarity: 'Commun',
    stock: null,
    limited: false,
    active: true,
    reward_type: 'profile_title',
    reward_data: { title: 'Nakama de Brams' },
  },
  {
    id: 'preview-role-vip',
    name: 'Rôle Discord : Corsaire VIP',
    description: 'Rôle Discord exclusif avec accès aux salons VIP du serveur.',
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
    id: 'preview-role-shichibukai',
    name: 'Rôle Discord : Shichibukai',
    description: 'Prouve ta valeur. Ce rôle te donne accès aux discussions stratégiques.',
    category: 'Roles Discord',
    price: 2000,
    rarity: 'Rare',
    stock: 30,
    limited: true,
    active: true,
    reward_type: 'discord_role',
    reward_data: { roleName: 'Shichibukai' },
  },
  {
    id: 'preview-badge-skull',
    name: 'Badge : Crâne Jolly Roger',
    description: 'Badge exclusif affiché sur ton profil. Symbole des vrais pirates.',
    category: 'Badges',
    price: 800,
    rarity: 'Rare',
    stock: null,
    limited: false,
    active: true,
    reward_type: 'badge',
    reward_data: { badge: 'jolly_roger' },
  },
  {
    id: 'preview-badge-nakama',
    name: 'Badge : Nakama Medal',
    description: 'Médaille de fidélité. Prouve que tu es là depuis le début.',
    category: 'Badges',
    price: 1500,
    rarity: 'Epique',
    stock: null,
    limited: false,
    active: true,
    reward_type: 'badge',
    reward_data: { badge: 'nakama_medal' },
  },
  {
    id: 'preview-boost-xp',
    name: 'Boost XP x2 — 7 jours',
    description: 'Double tes points XP sur le serveur pendant 7 jours consécutifs.',
    category: 'Boosts',
    price: 1800,
    rarity: 'Epique',
    stock: null,
    limited: false,
    active: true,
    reward_type: 'xp_boost',
    reward_data: { multiplier: 2, days: 7 },
  },
  {
    id: 'preview-boost-berry',
    name: 'Boost Berrys x1.5 — 3 jours',
    description: 'Multiplie tes gains de Berrys par 1.5 pendant 3 jours.',
    category: 'Boosts',
    price: 1200,
    rarity: 'Rare',
    stock: null,
    limited: false,
    active: true,
    reward_type: 'berry_boost',
    reward_data: { multiplier: 1.5, days: 3 },
  },
  {
    id: 'preview-chest',
    name: 'Coffre Mystère Grand Line',
    description: 'Ouvre une récompense aléatoire : badge, titre, boost ou item épique.',
    category: 'Coffres',
    price: 900,
    rarity: 'Legendaire',
    stock: null,
    limited: false,
    active: true,
    reward_type: 'mystery_chest',
    reward_data: { pool: 'grand_line' },
  },
  {
    id: 'preview-chest-wano',
    name: 'Coffre de Wano',
    description: 'Contient un item de la série Wano. Chance de tomber sur un Mythique.',
    category: 'Coffres',
    price: 2500,
    rarity: 'Mythique',
    stock: 5,
    limited: true,
    active: true,
    reward_type: 'mystery_chest',
    reward_data: { pool: 'wano' },
  },
  {
    id: 'preview-event-tournament',
    name: 'Inscription Tournoi Mensuel',
    description: 'Accès garanti au prochain tournoi des équipages. 1 place = 1 chance de gloire.',
    category: 'Evenements',
    price: 600,
    rarity: 'Rare',
    stock: 50,
    limited: true,
    active: true,
    reward_type: 'event_ticket',
    reward_data: { event: 'monthly_tournament' },
  },
  {
    id: 'preview-crew-flag',
    name: 'Drapeau d\'Équipage Personnalisé',
    description: 'Commande un drapeau unique pour ton équipage, dessiné par les modérateurs.',
    category: 'Equipage',
    price: 4000,
    rarity: 'Legendaire',
    stock: 3,
    limited: true,
    active: true,
    reward_type: 'custom_flag',
    reward_data: {},
  },
  {
    id: 'preview-crew-slot',
    name: 'Slot Équipage +5 membres',
    description: 'Augmente la capacité max de ton équipage de 5 membres supplémentaires.',
    category: 'Equipage',
    price: 2200,
    rarity: 'Epique',
    stock: null,
    limited: false,
    active: true,
    reward_type: 'crew_slot',
    reward_data: { slots: 5 },
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
