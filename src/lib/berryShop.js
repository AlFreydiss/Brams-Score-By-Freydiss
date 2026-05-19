import { supabase } from './supabase.js'

export const SHOP_CATEGORIES = [
  'Cosmetique',
  'Roles Discord',
  'Badges',
  'Boosts',
  'Coffres',
  'Evenements',
  'Equipage',
  'Prestige',
]

export const RARITY_STYLES = {
  Commun:     { color: '#8a9bb5', label: 'Commun' },
  Rare:       { color: '#4db5ff', label: 'Rare' },
  Epique:     { color: '#ad6bff', label: 'Épique' },
  Legendaire: { color: '#f6b34b', label: 'Légendaire' },
  Mythique:   { color: '#e86bff', label: 'Mythique' },
}

const FALLBACK_ITEMS = [
  /* ── MYTHIQUE — Prestige absolu ── */
  {
    id: 'preview-prestige-emperor',
    name: 'Titre : Empereur de Brams',
    description: 'Le titre suprême. Porté uniquement par celui qui a tout accompli. Une seule personne dans l\'univers.',
    category: 'Prestige',
    price: 50000000,
    rarity: 'Mythique',
    stock: 1,
    limited: true,
    active: true,
    reward_type: 'profile_title',
    reward_data: { title: 'Empereur de Brams' },
  },
  {
    id: 'preview-prestige-council',
    name: 'Rôle : Conseil des Légendes',
    description: 'Accès au salon le plus exclusif du serveur. Réservé aux membres fondateurs et légendes absolues.',
    category: 'Prestige',
    price: 30000000,
    rarity: 'Mythique',
    stock: 5,
    limited: true,
    active: true,
    reward_type: 'discord_role',
    reward_data: { roleName: 'Conseil des Légendes' },
  },
  {
    id: 'preview-prestige-crown',
    name: 'Badge : Couronne du Roi Pirate',
    description: 'Le badge ultime. Affiché sur ton profil pour l\'éternité. Symbole de domination absolue sur le serveur.',
    category: 'Prestige',
    price: 25000000,
    rarity: 'Mythique',
    stock: 3,
    limited: true,
    active: true,
    reward_type: 'badge',
    reward_data: { badge: 'king_crown' },
  },
  /* ── LÉGENDAIRE ── */
  {
    id: 'preview-title-yonkou',
    name: 'Titre : Futur Yonkou',
    description: 'Réservé aux nakamas les plus actifs. Titre légendaire qui impose le respect sur tout le serveur.',
    category: 'Cosmetique',
    price: 12000000,
    rarity: 'Legendaire',
    stock: null,
    limited: false,
    active: true,
    reward_type: 'profile_title',
    reward_data: { title: 'Futur Yonkou' },
  },
  {
    id: 'preview-crew-flag',
    name: 'Drapeau d\'Équipage Légendaire',
    description: 'Drapeau unique dessiné par les modérateurs pour ton équipage. Un seul par équipage, pour toujours.',
    category: 'Equipage',
    price: 10000000,
    rarity: 'Legendaire',
    stock: 3,
    limited: true,
    active: true,
    reward_type: 'custom_flag',
    reward_data: {},
  },
  {
    id: 'preview-chest-wano',
    name: 'Coffre du Nouveau Monde',
    description: 'Contient un item de rareté Mythique ou Légendaire. Chaque ouverture est garantie rare.',
    category: 'Coffres',
    price: 8000000,
    rarity: 'Legendaire',
    stock: 5,
    limited: true,
    active: true,
    reward_type: 'mystery_chest',
    reward_data: { pool: 'nouveau_monde' },
  },
  {
    id: 'preview-boost-multiplier',
    name: 'Multiplicateur Suprême x3 — 30 jours',
    description: 'Triple tes gains de Berrys sur le serveur pendant 30 jours consécutifs. L\'arme secrète du grind.',
    category: 'Boosts',
    price: 6000000,
    rarity: 'Legendaire',
    stock: null,
    limited: false,
    active: true,
    reward_type: 'berry_boost',
    reward_data: { multiplier: 3, days: 30 },
  },
  /* ── ÉPIQUE ── */
  {
    id: 'preview-role-vip',
    name: 'Rôle Discord : Corsaire VIP',
    description: 'Accès aux salons privés du serveur. Reconnaissance immédiate dans toute la communauté Brams.',
    category: 'Roles Discord',
    price: 4500000,
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
    description: 'Statut d\'élite. Accès aux discussions stratégiques et aux décisions du serveur.',
    category: 'Roles Discord',
    price: 3500000,
    rarity: 'Epique',
    stock: 30,
    limited: true,
    active: true,
    reward_type: 'discord_role',
    reward_data: { roleName: 'Shichibukai' },
  },
  {
    id: 'preview-badge-nakama',
    name: 'Badge : Médaille des Origines',
    description: 'Badge fondateur. Prouve que tu étais là dès les premiers jours de l\'aventure Brams.',
    category: 'Badges',
    price: 3000000,
    rarity: 'Epique',
    stock: null,
    limited: false,
    active: true,
    reward_type: 'badge',
    reward_data: { badge: 'nakama_medal' },
  },
  {
    id: 'preview-chest',
    name: 'Coffre Marine Sombre',
    description: 'Récompense mystère garantie de qualité épique ou supérieure. Ce que tu obtiendras restera rare.',
    category: 'Coffres',
    price: 5000000,
    rarity: 'Epique',
    stock: null,
    limited: false,
    active: true,
    reward_type: 'mystery_chest',
    reward_data: { pool: 'marine_sombre' },
  },
  {
    id: 'preview-crew-slot',
    name: 'Extension Équipage Suprême',
    description: 'Augmente la capacité de ton équipage de 10 membres supplémentaires. Construis ta flotte.',
    category: 'Equipage',
    price: 3800000,
    rarity: 'Epique',
    stock: null,
    limited: false,
    active: true,
    reward_type: 'crew_slot',
    reward_data: { slots: 10 },
  },
  /* ── RARE ── */
  {
    id: 'preview-title-elite',
    name: 'Titre : Nakama d\'Élite',
    description: 'Distinction reconnue dans toute la communauté. Tu as prouvé ta valeur, et ça se voit.',
    category: 'Cosmetique',
    price: 1500000,
    rarity: 'Rare',
    stock: null,
    limited: false,
    active: true,
    reward_type: 'profile_title',
    reward_data: { title: 'Nakama d\'Élite' },
  },
  {
    id: 'preview-badge-skull',
    name: 'Badge : Crâne du Nouveau Monde',
    description: 'Pour ceux qui ont traversé les eaux les plus dangereuses. Badge exclusif affiché sur ton profil.',
    category: 'Badges',
    price: 2500000,
    rarity: 'Rare',
    stock: null,
    limited: false,
    active: true,
    reward_type: 'badge',
    reward_data: { badge: 'crâne_nouveau_monde' },
  },
  {
    id: 'preview-boost-xp',
    name: 'Boost XP x2 — 14 jours',
    description: 'Double tes points XP sur le serveur pendant 14 jours consécutifs. Grimpe les rangs en accéléré.',
    category: 'Boosts',
    price: 1800000,
    rarity: 'Rare',
    stock: null,
    limited: false,
    active: true,
    reward_type: 'xp_boost',
    reward_data: { multiplier: 2, days: 14 },
  },
  {
    id: 'preview-boost-berry',
    name: 'Boost Berrys x1.5 — 7 jours',
    description: 'Multiplie tes gains de Berrys par 1.5 pendant 7 jours. Chaque vocal rapporte davantage.',
    category: 'Boosts',
    price: 1200000,
    rarity: 'Rare',
    stock: null,
    limited: false,
    active: true,
    reward_type: 'berry_boost',
    reward_data: { multiplier: 1.5, days: 7 },
  },
  {
    id: 'preview-event-tournament',
    name: 'Pass Tournoi Grand Line',
    description: 'Accès VIP au prochain tournoi des équipages. Une place, une chance de gloire éternelle.',
    category: 'Evenements',
    price: 900000,
    rarity: 'Rare',
    stock: 50,
    limited: true,
    active: true,
    reward_type: 'event_ticket',
    reward_data: { event: 'grand_line_tournament' },
  },
  /* ── COMMUN ── */
  {
    id: 'preview-title-pirate',
    name: 'Titre : Pirate Prime',
    description: 'Le premier titre pour ceux qui commencent à forger leur légende sur le serveur.',
    category: 'Cosmetique',
    price: 400000,
    rarity: 'Commun',
    stock: null,
    limited: false,
    active: true,
    reward_type: 'profile_title',
    reward_data: { title: 'Pirate Prime' },
  },
  {
    id: 'preview-title-nakama',
    name: 'Titre : Nakama de Brams',
    description: 'Le titre des fidèles. Montre ton appartenance au crew et ton engagement envers la communauté.',
    category: 'Cosmetique',
    price: 650000,
    rarity: 'Commun',
    stock: null,
    limited: false,
    active: true,
    reward_type: 'profile_title',
    reward_data: { title: 'Nakama de Brams' },
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
  if (!supabase) return { error: { message: 'Supabase non configuré.' } }
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
  if (!supabase) return { error: { message: 'Supabase non configuré.' } }
  return supabase.from('shop_items').upsert(item).select().single()
}
