const SUPABASE_URL = 'https://zeqetrmulqndxugfbojd.supabase.co'

const BACKGROUNDS = [
  { id:'bg-unravel',        name:'Fond : Unravel',                description:"Un fond sombre et fragmente. Porte uniquement par les nakamas qui ont tout compris.",         category:'Fonds', price:5000000, rarity:'Secret',     stock:null, limited:false, active:true, reward_type:'opening_background', reward_data:{ opTitle:'Unravel',               anime:'Tokyo Ghoul' } },
  { id:'bg-the-rumbling',   name:'Fond : The Rumbling',           description:"La fin du monde en fond. Reserve aux rares qui ont tenu jusqu'au bout.",                      category:'Fonds', price:6000000, rarity:'Secret',     stock:null, limited:false, active:true, reward_type:'opening_background', reward_data:{ opTitle:'The Rumbling',          anime:'Attack on Titan Final' } },
  { id:'bg-gurenge',        name:'Fond : Gurenge',                description:"Flammes et lames. L'ouverture qui a lance une ere nouvelle.",                                 category:'Fonds', price:2500000, rarity:'Mythique',   stock:null, limited:false, active:true, reward_type:'opening_background', reward_data:{ opTitle:'Gurenge',               anime:'Demon Slayer' } },
  { id:'bg-kaikai-kitan',   name:'Fond : Kaikai Kitan',           description:"Les maledictions comme decor. Une ambiance unique et redoutable.",                            category:'Fonds', price:2500000, rarity:'Mythique',   stock:null, limited:false, active:true, reward_type:'opening_background', reward_data:{ opTitle:'Kaikai Kitan',          anime:'Jujutsu Kaisen' } },
  { id:'bg-we-are',         name:"Fond : We Are!",                description:"Le grand voyage des nakamas. Fond culte pour les vrais fans de One Piece.",                   category:'Fonds', price:1500000, rarity:'Legendaire', stock:null, limited:false, active:true, reward_type:'opening_background', reward_data:{ opTitle:"We Are!",              anime:'One Piece' } },
  { id:'bg-again',          name:'Fond : Again',                  description:"Alchimie et metal. L'opening parfait d'une des meilleures series de tous les temps.",         category:'Fonds', price:1500000, rarity:'Legendaire', stock:null, limited:false, active:true, reward_type:'opening_background', reward_data:{ opTitle:'Again',                anime:'FMA: Brotherhood' } },
  { id:'bg-cruel-angel',    name:"Fond : A Cruel Angel's Thesis", description:"L'opening mythique. Un morceau de legende pour un fond qui force le respect.",                category:'Fonds', price:1500000, rarity:'Legendaire', stock:null, limited:false, active:true, reward_type:'opening_background', reward_data:{ opTitle:"A Cruel Angel's Thesis",anime:'Neon Genesis Evangelion' } },
  { id:'bg-hacking-gate',   name:'Fond : Hacking to the Gate',    description:"El Psy Kongroo. Pour les voyageurs du temps et les nostalgiques du futur.",                  category:'Fonds', price:1500000, rarity:'Legendaire', stock:null, limited:false, active:true, reward_type:'opening_background', reward_data:{ opTitle:'Hacking to the Gate',  anime:'Steins;Gate' } },
  { id:'bg-blue-bird',      name:'Fond : Blue Bird',              description:"L'oiseau bleu de Sasuke. Nostalgie garantie pour chaque fan de Naruto.",                     category:'Fonds', price: 900000, rarity:'Epique',     stock:null, limited:false, active:true, reward_type:'opening_background', reward_data:{ opTitle:'Blue Bird',            anime:'Naruto' } },
  { id:'bg-silhouette',     name:'Fond : Silhouette',             description:"La course vers un but. Silhouettes et ambiance chaude de Konoha.",                            category:'Fonds', price: 900000, rarity:'Epique',     stock:null, limited:false, active:true, reward_type:'opening_background', reward_data:{ opTitle:'Silhouette',           anime:'Naruto Shippuden' } },
  { id:'bg-haruka-mirai',   name:'Fond : Haruka Mirai',           description:"L'energie brute d'Asta. Pour ceux qui n'abandonnent jamais.",                                category:'Fonds', price: 900000, rarity:'Epique',     stock:null, limited:false, active:true, reward_type:'opening_background', reward_data:{ opTitle:'Haruka Mirai',         anime:'Black Clover' } },
  { id:'bg-colors',         name:'Fond : Colors',                 description:"L'echiquier de Lelouch. Strategie et trahison comme toile de fond.",                         category:'Fonds', price: 600000, rarity:'Rare',       stock:null, limited:false, active:true, reward_type:'opening_background', reward_data:{ opTitle:'Colors',              anime:'Code Geass' } },
  { id:'bg-connect',        name:'Fond : Connect',                description:"L'illusion de la magie. Derriere la douceur, quelque chose de bien plus sombre.",             category:'Fonds', price: 600000, rarity:'Rare',       stock:null, limited:false, active:true, reward_type:'opening_background', reward_data:{ opTitle:'Connect',             anime:'Puella Magi Madoka Magica' } },
  { id:'bg-99',             name:'Fond : 99',                     description:"100% - Une explosion d'energie psychique comme ambiance.",                                    category:'Fonds', price: 600000, rarity:'Rare',       stock:null, limited:false, active:true, reward_type:'opening_background', reward_data:{ opTitle:'99',                  anime:'Mob Psycho 100' } },
  { id:'bg-tank',           name:'Fond : Tank!',                  description:"Jazz, espace et melancolie. L'un des openings les plus cultes de l'histoire.",                category:'Fonds', price: 600000, rarity:'Rare',       stock:null, limited:false, active:true, reward_type:'opening_background', reward_data:{ opTitle:'Tank!',               anime:'Cowboy Bebop' } },
  { id:'bg-crossing-field', name:'Fond : crossing field',         description:"L'ouverture qui a lance une generation. Simple, efficace, memorable.",                        category:'Fonds', price: 400000, rarity:'Commun',     stock:null, limited:false, active:true, reward_type:'opening_background', reward_data:{ opTitle:'crossing field',      anime:'Sword Art Online' } },
]

function getServiceHeaders() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY manquant')
  return {
    'Content-Type': 'application/json',
    'apikey': key,
    'Authorization': `Bearer ${key}`,
    'Prefer': 'resolution=merge-duplicates,return=minimal',
  }
}

async function seedShopBackgrounds(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' })

  const secret = process.env.SEED_SECRET || process.env.BOT_SYNC_SECRET
  if (!secret || req.query.secret !== secret) {
    return res.status(401).json({ error: 'Non autorise - ?secret=SEED_SECRET requis' })
  }

  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/shop_items?on_conflict=id`, {
      method: 'POST',
      headers: getServiceHeaders(),
      body: JSON.stringify(BACKGROUNDS),
    })

    if (!r.ok) {
      const err = await r.text()
      return res.status(502).json({ error: `Supabase: ${r.status} - ${err}` })
    }

    return res.status(200).json({
      ok: true,
      seeded: BACKGROUNDS.length,
      message: `${BACKGROUNDS.length} fonds upsertes dans shop_items.`,
    })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}

async function syncBot(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type')

  if (req.method === 'OPTIONS') { res.status(204).end(); return }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const secret = process.env.BOT_SYNC_SECRET
  if (!secret) return res.status(503).json({ error: 'BOT_SYNC_SECRET non configure' })

  const authHeader = req.headers['authorization'] || ''
  if (authHeader !== `Bearer ${secret}`) {
    return res.status(401).json({ error: 'Non autorise' })
  }

  const { users } = req.body || {}
  if (!Array.isArray(users) || users.length === 0) {
    return res.status(400).json({ error: 'Payload invalide - users[] requis' })
  }
  if (users.length > 500) {
    return res.status(400).json({ error: 'Trop d utilisateurs par batch (max 500)' })
  }

  const rows = users.map(u => ({
    uid: String(u.uid),
    data: {
      username: u.username || null,
      avatar_url: u.avatar_url || null,
      berrys: Number(u.berrys ?? 0),
      vocal_seconds_7d: Number(u.vocal_seconds_7d ?? 0),
      vocal_h: Number((u.vocal_seconds_7d ?? 0) / 3600).toFixed(2),
      messages_7d: Number(u.messages_7d ?? 0),
      rank: u.rank || null,
      synced_at: new Date().toISOString(),
    },
  }))

  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/users?on_conflict=uid`, {
      method: 'POST',
      headers: getServiceHeaders(),
      body: JSON.stringify(rows),
    })

    if (!r.ok) {
      const err = await r.text()
      console.error('[sync-bot] Supabase error', r.status, err)
      return res.status(502).json({ error: `Supabase: ${r.status}` })
    }

    return res.status(200).json({ ok: true, synced: rows.length })
  } catch (e) {
    console.error('[sync-bot]', e.message)
    return res.status(500).json({ error: e.message })
  }
}

export default async function handler(req, res) {
  const tool = String(req.query.tool || '')
  if (tool === 'seed-shop-backgrounds') return seedShopBackgrounds(req, res)
  if (tool === 'sync-bot') return syncBot(req, res)
  return res.status(404).json({ error: 'Unknown bot tool' })
}
