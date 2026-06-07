import { supabase } from './supabase.js'
import { sbRpc, getAccessToken } from './supabaseRest.js'

export const SHOP_CATEGORIES = [
  'Cosmetique',
  'Roles Discord',
  'Badges',
  'Boosts',
  'Coffres',
  'Evenements',
  'Equipage',
  'Prestige',
  'Fonds',
]

// Opening background items — injected into the shop catalog.
// reward_type: 'opening_background' signals the equip mechanic.
export const OPENING_BG_SHOP_ITEMS = [
  { id:'bg-unravel',       name:'Fond : Unravel',                 description:"Un fond sombre et fragmenté. Porté uniquement par les nakamas qui ont tout compris.",          category:'Fonds', price:5000000, rarity:'Secret',     stock:null, limited:false, active:true, reward_type:'opening_background', reward_data:{ opTitle:'Unravel',                anime:'Tokyo Ghoul' } },
  { id:'bg-the-rumbling',  name:'Fond : The Rumbling',            description:"La fin du monde en fond. Réservé aux rares qui ont tenu jusqu'au bout.",                       category:'Fonds', price:6000000, rarity:'Secret',     stock:null, limited:false, active:true, reward_type:'opening_background', reward_data:{ opTitle:'The Rumbling',           anime:'Attack on Titan Final' } },
  { id:'bg-kaikai-kitan',  name:'Fond : Kaikai Kitan',            description:"Les malédictions comme décor. Une ambiance unique et redoutable.",                             category:'Fonds', price:2500000, rarity:'Mythique',   stock:null, limited:false, active:true, reward_type:'opening_background', reward_data:{ opTitle:'Kaikai Kitan',           anime:'Jujutsu Kaisen' } },
  { id:'bg-we-are',        name:'Fond : We Are!',                 description:"Le grand voyage des nakamas. Fond culte pour les vrais fans de One Piece.",                    category:'Fonds', price:1500000, rarity:'Legendaire', stock:null, limited:false, active:true, reward_type:'opening_background', reward_data:{ opTitle:"We Are!",               anime:'One Piece' } },
  { id:'bg-again',         name:'Fond : Again',                   description:"Alchimie et métal. L'opening parfait d'une des meilleures séries de tous les temps.",          category:'Fonds', price:1500000, rarity:'Legendaire', stock:null, limited:false, active:true, reward_type:'opening_background', reward_data:{ opTitle:'Again',                 anime:'FMA: Brotherhood' } },
  { id:'bg-cruel-angel',   name:"Fond : A Cruel Angel's Thesis",  description:"L'opening mythique. Un morceau de légende pour un fond qui force le respect.",                category:'Fonds', price:1500000, rarity:'Legendaire', stock:null, limited:false, active:true, reward_type:'opening_background', reward_data:{ opTitle:"A Cruel Angel's Thesis", anime:'Neon Genesis Evangelion' } },
  { id:'bg-hacking-gate',  name:'Fond : Hacking to the Gate',     description:"El Psy Kongroo. Pour les voyageurs du temps et les nostalgiques du future.",                  category:'Fonds', price:1500000, rarity:'Legendaire', stock:null, limited:false, active:true, reward_type:'opening_background', reward_data:{ opTitle:'Hacking to the Gate',   anime:'Steins;Gate' } },
  { id:'bg-blue-bird',     name:'Fond : Blue Bird',               description:"L'oiseau bleu de Sasuke. Nostalgie garantie pour chaque fan de Naruto.",                      category:'Fonds', price: 900000, rarity:'Epique',     stock:null, limited:false, active:true, reward_type:'opening_background', reward_data:{ opTitle:'Blue Bird',             anime:'Naruto' } },
  { id:'bg-silhouette',    name:'Fond : Silhouette',              description:"La course vers un but. Silhouettes et ambiance chaude de Konoha.",                             category:'Fonds', price: 900000, rarity:'Epique',     stock:null, limited:false, active:true, reward_type:'opening_background', reward_data:{ opTitle:'Silhouette',            anime:'Naruto Shippuden' } },
  { id:'bg-haruka-mirai',  name:'Fond : Haruka Mirai',            description:"L'énergie brute d'Asta. Pour ceux qui n'abandonnent jamais.",                                 category:'Fonds', price: 900000, rarity:'Epique',     stock:null, limited:false, active:true, reward_type:'opening_background', reward_data:{ opTitle:'Haruka Mirai',          anime:'Black Clover' } },
  { id:'bg-colors',        name:'Fond : Colors',                  description:"L'échiquier de Lelouch. Stratégie et trahison comme toile de fond.",                          category:'Fonds', price: 600000, rarity:'Rare',       stock:null, limited:false, active:true, reward_type:'opening_background', reward_data:{ opTitle:'Colors',               anime:'Code Geass' } },
  { id:'bg-crossing-field',name:'Fond : crossing field',          description:"L'ouverture qui a lancé une génération. Simple, efficace, mémorable.",                        category:'Fonds', price: 400000, rarity:'Commun',     stock:null, limited:false, active:true, reward_type:'opening_background', reward_data:{ opTitle:'crossing field',       anime:'Sword Art Online' } },
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

  // Lire le solde. Le RPC get_berry_balance peut renvoyer 0 si la résolution
  // discord_id côté serveur échoue (auth.users metadata incomplet). Dans ce cas
  // on lit directement la table users (source de vérité, maj par le bot) — d'où
  // l'ancien bug "toujours 0" : le 0 du RPC était pris pour argent comptant.
  let balance = 0
  try {
    const { data: rpcData } = await supabase.rpc('get_berry_balance')
    balance = Number(rpcData) || 0
  } catch { /* RPC absent ou erreur — on tente la lecture directe ci-dessous */ }

  if (balance <= 0 && discordId) {
    try {
      const { data: userData } = await supabase
        .from('users').select('data').eq('uid', String(discordId)).maybeSingle()
      const direct = Number(userData?.data?.berrys ?? 0)
      if (direct > 0) balance = direct
    } catch { /* RLS bloque — on garde 0 */ }
  }

  const [{ data: items }, { data: inventory }, { data: transactions }] = await Promise.all([
    supabase.from('shop_items').select('*').eq('active', true).order('price', { ascending: true }),
    supabase.from('user_inventory').select('*, shop_items(*)').eq('discord_id', discordId).order('acquired_at', { ascending: false }),
    supabase.from('shop_transactions').select('*, shop_items(name, rarity, category)').eq('discord_id', discordId).order('created_at', { ascending: false }).limit(20),
  ])

  return {
    balance,
    items: items?.length ? [...items, ...OPENING_BG_SHOP_ITEMS.filter(bg => !items.find(i => i.id === bg.id))] : FALLBACK_ITEMS,
    inventory: inventory || [],
    transactions: transactions || [],
    preview: false,
  }
}

// Fond d'opening équipé d'un membre, lisible PUBLIQUEMENT (RPC SECURITY DEFINER
// 20260606_member_opening_bg.sql) — sert à afficher le fond payé/équipé d'autrui
// sur son profil, même pour un visiteur qui ne possède pas ce fond.
export async function getMemberOpeningBg(discordId) {
  if (!supabase || !discordId) return null
  try {
    const { data, error } = await supabase.rpc('get_member_opening_bg', { p_discord_id: String(discordId) })
    if (error) return null
    return data || null
  } catch { return null }
}

export async function purchaseShopItem(itemId) {
  // Auth via le JWT stocké (sans getUser/getSession qui pouvaient hanger).
  const token = await getAccessToken()
  if (!token) return { error: { message: 'Connexion requise pour acheter.' } }

  const idempotencyKey = `${itemId}-${crypto.randomUUID()}`
  const r = await sbRpc('purchase_shop_item', { p_item_id: itemId, p_idempotency_key: idempotencyKey }, { tag: 'shop' })
  if (r?.ok === false || r?.error) return { data: null, error: { message: r?.error || 'Achat impossible' } }
  return { data: r, error: null }
}

// Solde berries (RPC get_berry_balance → bigint). REST direct (anti-hang).
export async function fetchShopBalance() {
  const r = await sbRpc('get_berry_balance', {}, { tag: 'shop' })
  const n = Number(r)
  return Number.isFinite(n) ? n : 0
}

// Fonds d'opening possédés par l'utilisateur (depuis l'inventaire).
export async function fetchOwnedBackgrounds() {
  const r = await sbRpc('get_my_inventory', {}, { tag: 'shop' })
  const list = Array.isArray(r) ? r : []
  return list.filter(i => i?.reward_type === 'opening_background')
}

export const MYSTERY_BOX_COST = 1200000
export async function openMysteryBox() {
  if (!supabase) return { error: { message: 'Supabase non configuré.' } }
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: { message: 'Connexion requise.' } }
  const { data, error } = await supabase.rpc('open_mystery_box')
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

export async function equipShopItem(itemId) {
  const r = await sbRpc('equip_shop_item', { p_item_id: itemId }, { tag: 'shop' })
  if (r?.ok === false || r?.error) return { data: null, error: { message: r?.error || 'Équipement impossible' } }
  return { data: r, error: null }
}

export async function fetchMyInventory() {
  if (!supabase) return []
  const { data, error } = await supabase.rpc('get_my_inventory')
  if (error) return []
  return Array.isArray(data) ? data : []
}

export async function upsertShopItem(item) {
  if (!supabase) return { error: { message: 'Supabase non configuré.' } }

  // Passe par l'API sécurisée /api/shop-admin côté serveur
  // (la vérification staff est faite côté serveur, pas seulement côté front)
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) return { error: { message: 'Session expirée.' } }

  try {
    const res = await fetch('/api/shop-admin?action=upsert', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(item),
    })
    const json = await res.json()
    if (!res.ok || !json.success) return { error: { message: json.error || 'Erreur serveur' } }
    return { data: json.item, error: null }
  } catch (err) {
    return { error: { message: err?.message || 'Erreur réseau' } }
  }
}
