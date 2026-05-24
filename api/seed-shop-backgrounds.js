// api/seed-shop-backgrounds.js — Seed les fonds d'openings dans shop_items Supabase
// GET /api/seed-shop-backgrounds?secret=SEED_SECRET
// À appeler une seule fois pour initialiser les items "Fonds" dans la DB.

const SUPABASE_URL = 'https://zeqetrmulqndxugfbojd.supabase.co'

const BACKGROUNDS = [
  { id:'bg-unravel',        name:'Fond : Unravel',                description:"Un fond sombre et fragmenté. Porté uniquement par les nakamas qui ont tout compris.",         category:'Fonds', price:5000000, rarity:'Secret',     stock:null, limited:false, active:true, reward_type:'opening_background', reward_data:{ opTitle:'Unravel',               anime:'Tokyo Ghoul' } },
  { id:'bg-the-rumbling',   name:'Fond : The Rumbling',           description:"La fin du monde en fond. Réservé aux rares qui ont tenu jusqu'au bout.",                      category:'Fonds', price:6000000, rarity:'Secret',     stock:null, limited:false, active:true, reward_type:'opening_background', reward_data:{ opTitle:'The Rumbling',          anime:'Attack on Titan Final' } },
  { id:'bg-gurenge',        name:'Fond : Gurenge',                description:"Flammes et lames. L'ouverture qui a lancé une ère nouvelle.",                                 category:'Fonds', price:2500000, rarity:'Mythique',   stock:null, limited:false, active:true, reward_type:'opening_background', reward_data:{ opTitle:'Gurenge',               anime:'Demon Slayer' } },
  { id:'bg-kaikai-kitan',   name:'Fond : Kaikai Kitan',           description:"Les malédictions comme décor. Une ambiance unique et redoutable.",                            category:'Fonds', price:2500000, rarity:'Mythique',   stock:null, limited:false, active:true, reward_type:'opening_background', reward_data:{ opTitle:'Kaikai Kitan',          anime:'Jujutsu Kaisen' } },
  { id:'bg-we-are',         name:"Fond : We Are!",                description:"Le grand voyage des nakamas. Fond culte pour les vrais fans de One Piece.",                   category:'Fonds', price:1500000, rarity:'Legendaire', stock:null, limited:false, active:true, reward_type:'opening_background', reward_data:{ opTitle:"We Are!",              anime:'One Piece' } },
  { id:'bg-again',          name:'Fond : Again',                  description:"Alchimie et métal. L'opening parfait d'une des meilleures séries de tous les temps.",         category:'Fonds', price:1500000, rarity:'Legendaire', stock:null, limited:false, active:true, reward_type:'opening_background', reward_data:{ opTitle:'Again',                anime:'FMA: Brotherhood' } },
  { id:'bg-cruel-angel',    name:"Fond : A Cruel Angel's Thesis", description:"L'opening mythique. Un morceau de légende pour un fond qui force le respect.",               category:'Fonds', price:1500000, rarity:'Legendaire', stock:null, limited:false, active:true, reward_type:'opening_background', reward_data:{ opTitle:"A Cruel Angel's Thesis",anime:'Neon Genesis Evangelion' } },
  { id:'bg-hacking-gate',   name:'Fond : Hacking to the Gate',    description:"El Psy Kongroo. Pour les voyageurs du temps et les nostalgiques du future.",                 category:'Fonds', price:1500000, rarity:'Legendaire', stock:null, limited:false, active:true, reward_type:'opening_background', reward_data:{ opTitle:'Hacking to the Gate',  anime:'Steins;Gate' } },
  { id:'bg-blue-bird',      name:'Fond : Blue Bird',              description:"L'oiseau bleu de Sasuke. Nostalgie garantie pour chaque fan de Naruto.",                     category:'Fonds', price: 900000, rarity:'Epique',     stock:null, limited:false, active:true, reward_type:'opening_background', reward_data:{ opTitle:'Blue Bird',            anime:'Naruto' } },
  { id:'bg-silhouette',     name:'Fond : Silhouette',             description:"La course vers un but. Silhouettes et ambiance chaude de Konoha.",                            category:'Fonds', price: 900000, rarity:'Epique',     stock:null, limited:false, active:true, reward_type:'opening_background', reward_data:{ opTitle:'Silhouette',           anime:'Naruto Shippuden' } },
  { id:'bg-haruka-mirai',   name:'Fond : Haruka Mirai',           description:"L'énergie brute d'Asta. Pour ceux qui n'abandonnent jamais.",                                category:'Fonds', price: 900000, rarity:'Epique',     stock:null, limited:false, active:true, reward_type:'opening_background', reward_data:{ opTitle:'Haruka Mirai',         anime:'Black Clover' } },
  { id:'bg-colors',         name:'Fond : Colors',                 description:"L'échiquier de Lelouch. Stratégie et trahison comme toile de fond.",                         category:'Fonds', price: 600000, rarity:'Rare',       stock:null, limited:false, active:true, reward_type:'opening_background', reward_data:{ opTitle:'Colors',              anime:'Code Geass' } },
  { id:'bg-connect',        name:'Fond : Connect',                description:"L'illusion de la magie. Derrière la douceur, quelque chose de bien plus sombre.",            category:'Fonds', price: 600000, rarity:'Rare',       stock:null, limited:false, active:true, reward_type:'opening_background', reward_data:{ opTitle:'Connect',             anime:'Puella Magi Madoka Magica' } },
  { id:'bg-99',             name:'Fond : 99',                     description:"100% — Une explosion d'énergie psychique comme ambiance.",                                    category:'Fonds', price: 600000, rarity:'Rare',       stock:null, limited:false, active:true, reward_type:'opening_background', reward_data:{ opTitle:'99',                  anime:'Mob Psycho 100' } },
  { id:'bg-tank',           name:'Fond : Tank!',                  description:"Jazz, espace et mélancolie. L'un des openings les plus cultes de l'histoire.",               category:'Fonds', price: 600000, rarity:'Rare',       stock:null, limited:false, active:true, reward_type:'opening_background', reward_data:{ opTitle:'Tank!',               anime:'Cowboy Bebop' } },
  { id:'bg-crossing-field', name:'Fond : crossing field',         description:"L'ouverture qui a lancé une génération. Simple, efficace, mémorable.",                       category:'Fonds', price: 400000, rarity:'Commun',     stock:null, limited:false, active:true, reward_type:'opening_background', reward_data:{ opTitle:'crossing field',      anime:'Sword Art Online' } },
]

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' })

  const secret = process.env.SEED_SECRET || process.env.BOT_SYNC_SECRET
  if (!secret || req.query.secret !== secret) {
    return res.status(401).json({ error: 'Non autorisé — ?secret=SEED_SECRET requis' })
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) return res.status(503).json({ error: 'SUPABASE_SERVICE_ROLE_KEY manquant' })

  const headers = {
    'Content-Type': 'application/json',
    'apikey': serviceKey,
    'Authorization': `Bearer ${serviceKey}`,
    'Prefer': 'resolution=merge-duplicates,return=minimal',
  }

  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/shop_items?on_conflict=id`, {
      method: 'POST',
      headers,
      body: JSON.stringify(BACKGROUNDS),
    })

    if (!r.ok) {
      const err = await r.text()
      return res.status(502).json({ error: `Supabase: ${r.status} — ${err}` })
    }

    return res.status(200).json({ ok: true, seeded: BACKGROUNDS.length, message: `${BACKGROUNDS.length} fonds upsertés dans shop_items.` })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
