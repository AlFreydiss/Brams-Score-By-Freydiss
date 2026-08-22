// Génère src/data/ending-r2-catalog.js depuis R2 blind-test/*-ed*.mp4 + LOCAL_TRACKS ED.
import fs from 'node:fs'
import path from 'node:path'
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3'

const root = path.resolve(import.meta.dirname, '..')
for (const envFile of [path.join(root, '.env.local'), path.join(root, '.env')]) {
  if (!fs.existsSync(envFile)) continue
  for (const line of fs.readFileSync(envFile, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '').trim()
  }
}

const { CF_ACCOUNT_ID, R2_BUCKET_NAME, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY } = process.env
const PUBLIC = 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev'
if (!CF_ACCOUNT_ID || !R2_BUCKET_NAME || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
  console.error('missing r2 creds')
  process.exit(1)
}

const SLUGS = {
  '3gatsu': 'March Comes in Like a Lion',
  '86': '86 Eighty-Six',
  'accelworld': 'Accel World',
  'akame': 'Akame ga Kill!',
  'akamega': 'Akame ga Kill!',
  'angelbeats': 'Angel Beats!',
  'anohana': 'Anohana',
  'anohi': 'Anohana',
  'another': 'Another',
  'aono': 'Ao no Exorcist',
  'aot': 'Attack on Titan',
  'arslan': 'The Heroic Legend of Arslan',
  'baccano': 'Baccano!',
  'bakemonogatari': 'Bakemonogatari',
  'bananafish': 'Banana Fish',
  'beastars': 'Beastars',
  'beastars2nd': 'Beastars',
  'bebop': 'Cowboy Bebop',
  'beck': 'Beck',
  'blackbullet': 'Black Bullet',
  'blackclover': 'Black Clover',
  'blacklagoon': 'Black Lagoon',
  'bleach': 'Bleach',
  'blends': 'Blend S',
  'blueexorcist': 'Blue Exorcist',
  'bluelock': 'Blue Lock',
  'bnha': 'My Hero Academia',
  'bocchi': 'Bocchi the Rock!',
  'bokudake': 'Erased',
  'bungoustray': 'Bungo Stray Dogs',
  'cardcaptorsaku': 'Cardcaptor Sakura',
  'carole': 'Carole & Tuesday',
  'cb': 'Cowboy Bebop',
  'cg': 'Code Geass',
  'chainsaw': 'Chainsaw Man',
  'champloo': 'Samurai Champloo',
  'charlotte': 'Charlotte',
  'cityhunter': 'City Hunter',
  'clannad': 'Clannad',
  'clannadafter': 'Clannad: After Story',
  'codebreaker': 'Code:Breaker',
  'codegeass': 'Code Geass',
  'csm': 'Chainsaw Man',
  'dandadan': 'Dandadan',
  'dbs': 'Dragon Ball Super',
  'dbz': 'Dragon Ball Z',
  'deathnote': 'Death Note',
  'dn': 'Death Note',
  'drstone': 'Dr. Stone',
  'ds': 'Demon Slayer',
  'dungeonmeshi': 'Delicious in Dungeon',
  'durarara': 'Durarara!!',
  'eighty-six': '86 Eighty-Six',
  'eightysix': '86 Eighty-Six',
  'erased': 'Erased',
  'eva': 'Neon Genesis Evangelion',
  'fairytail': 'Fairy Tail',
  'flcl': 'FLCL',
  'fmab': 'Fullmetal Alchemist: Brotherhood',
  'franxx': 'Darling in the Franxx',
  'frieren': 'Frieren',
  'fruitsbasket': 'Fruits Basket',
  'fullmetalalche': 'Fullmetal Alchemist',
  'fz': 'Fate/Zero',
  'gambano': 'Gankutsuou',
  'gekkanshoujo': 'Monthly Girls Nozaki-kun',
  'ghostin': 'Ghost in the Shell: SAC',
  'given': 'Given',
  'goldenkamuy': 'Golden Kamuy',
  'gotoubunno': 'The Quintessential Quintuplets',
  'gto': 'GTO: Great Teacher Onizuka',
  'gunx': 'Gun x Sword',
  'haikyuu': 'Haikyuu!!',
  'hxh': 'Hunter x Hunter',
  'ippo': 'Hajime no Ippo',
  'jjk': 'Jujutsu Kaisen',
  'kaguya': 'Kaguya-sama: Love is War',
  'kaiju': 'Kaiju No. 8',
  'kny': 'Demon Slayer',
  'koiame': 'After the Rain',
  'konosuba': 'KonoSuba',
  'madoka': 'Madoka Magica',
  'magi': 'Magi',
  'mha': 'My Hero Academia',
  'mobpsycho': 'Mob Psycho 100',
  'mugen': 'Demon Slayer: Mugen Train',
  'naruto': 'Naruto',
  'narutos': 'Naruto Shippuden',
  'newgame': 'New Game!',
  'nge': 'Neon Genesis Evangelion',
  'nichijou': 'Nichijou',
  'nisekoi': 'Nisekoi',
  'nisemonogatari': 'Nisemonogatari',
  'no6': 'No.6',
  'nogame': 'No Game No Life',
  'noragami': 'Noragami',
  'noragamiaragot': 'Noragami Aragoto',
  'oddtaxi': 'Odd Taxi',
  'onk': 'Oshi no Ko',
  'op': 'One Piece',
  'opm': 'One Punch Man',
  'oshinoko': 'Oshi no Ko',
  'ousama': 'Ranking of Kings',
  'ousamaranking': 'Ranking of Kings',
  'overlord': 'Overlord',
  'overlordii': 'Overlord',
  'overlordiii': 'Overlord',
  'overlordiv': 'Overlord',
  'owari': 'Seraph of the End',
  'owarino': 'Seraph of the End',
  'pingpong': 'Ping Pong the Animation',
  'plasticmemories': 'Plastic Memories',
  'promised': 'The Promised Neverland',
  'psychopass': 'Psycho-Pass',
  'qualideacode': 'Qualidea Code',
  'rehamatora': 'Re:Hamatora',
  'rekan': 'Re:Creators',
  'rezero': 'Re:Zero',
  'rezerokara': 'Re:Zero',
  'sakurasouno': 'Sakurasou no Pet na Kanojo',
  'sao': 'Sword Art Online',
  'serialexperime': 'Serial Experiments Lain',
  'shakuganno': 'Shakugan no Shana',
  'shironekoproje': 'The Idolmaster',
  'sonobisque': 'My Dress-Up Darling',
  'souleater': 'Soul Eater',
  'spy': 'Spy x Family',
  'spyxfamily': 'Spy x Family',
  'steinsgate': 'Steins;Gate',
  'supercub': 'Super Cub',
  'superlovers': 'Super Lovers',
  'tateno': 'The Rising of the Shield Hero',
  'tengentoppa': 'Gurren Lagann',
  'tenseishitara': 'That Time I Got Reincarnated as a Slime',
  'tenshino': 'Angel Beats!',
  'tg': 'Tokyo Ghoul',
  'toarukagaku': 'A Certain Scientific Railgun',
  'toarumajutsu': 'A Certain Magical Index',
  'tokyoesp': 'Tokyo ESP',
  'tokyoghoul': 'Tokyo Ghoul',
  'toradora': 'Toradora!',
  'tpn': 'The Promised Neverland',
  'tr': 'Tokyo Revengers',
  'trigunstampede': 'Trigun Stampede',
  'undeadunluck': 'Undead Unluck',
  'vinland': 'Vinland Saga',
  'violet': 'Violet Evergarden',
  'vivyfluorite': 'Vivy: Fluorite Eye\'s Song',
  'watashino': 'My Happy Marriage',
  'wonderegg': 'Wonder Egg Priority',
  'wotakuni': 'Wotakoi',
  'yahariore': 'Oregairu',
  'ylia': 'Your Lie in April',
  'yourlie': 'Your Lie in April',
  'yugiohduel': 'Yu-Gi-Oh!',
  'yugiohvrains': 'Yu-Gi-Oh! VRAINS',
  'yugiohzexal': 'Yu-Gi-Oh! ZEXAL',
  'yurion': 'Yuri!!! on Ice',
  'yuuyuuhakusho': 'Yu Yu Hakusho',
  'barakamon': 'Barakamon',
  'baki': 'Baki',
  'berserk': 'Berserk',
  'deathparade': 'Death Parade',
  'devilmancrybab': 'Devilman Crybaby',
  'goblinslayer': 'Goblin Slayer',
  'goldentime': 'Golden Time',
  'haikyuu': 'Haikyuu!!',
  'kaguya': 'Kaguya-sama',
  'konosuba': 'KonoSuba',
  'madoka': 'Madoka Magica',
  'ngnl': 'No Game No Life',
  'parasyte': 'Parasyte',
  'rezero': 'Re:Zero',
  'sao': 'Sword Art Online',
  'shieldhero': 'The Rising of the Shield Hero',
  'tensura': 'That Time I Got Reincarnated as a Slime',
  'trigun': 'Trigun',
  've': 'Violet Evergarden',
  'vivy': 'Vivy: Fluorite Eye\'s Song',
  'yurucamp': 'Laid-Back Camp',
  'zoneof': 'Zone of the Enders',
  'gurrenlagann': 'Gurren Lagann',
  'haikyuu': 'Haikyuu!!',
  'hxh': 'Hunter x Hunter',
  'jjk': 'Jujutsu Kaisen',
  'kny': 'Demon Slayer',
  'mha': 'My Hero Academia',
  'mobpsycho': 'Mob Psycho 100',
  'opm': 'One Punch Man',
  'rezero': 'Re:Zero',
  'steinsgate': 'Steins;Gate',
  'tokyoghoul': 'Tokyo Ghoul',
  'yourlie': 'Your Lie in April',
  'franxx': 'Darling in the Franxx',
  'drstone': 'Dr. Stone',
  'fairytail': 'Fairy Tail',
  'psychopass': 'Psycho-Pass',
  'blackclover': 'Black Clover',
  'promised': 'The Promised Neverland',
  'owari': 'Seraph of the End',
  'noragami': 'Noragami',
  'blueexorcist': 'Blue Exorcist',
  'souleater': 'Soul Eater',
  'konosuba': 'KonoSuba',
  'bakemonogatari': 'Bakemonogatari',
  'erased': 'Erased',
  'angelbeats': 'Angel Beats!',
  'charlotte': 'Charlotte',
  'plasticmemorie': 'Plastic Memories',
  'clannad': 'Clannad',
  'anohana': 'Anohana',
  'madoka': 'Madoka Magica',
  'toradora': 'Toradora!',
  'bebop': 'Cowboy Bebop',
  'steinsgate': 'Steins;Gate',
  'deathnote': 'Death Note',
  'tokyoghoul': 'Tokyo Ghoul',
  'frieren': 'Frieren',
  'oshinoko': 'Oshi no Ko',
  'spyxfamily': 'Spy x Family',
  'chainsaw': 'Chainsaw Man',
  'jjk': 'Jujutsu Kaisen',
  'aot': 'Attack on Titan',
  'codebreaker': 'Code:Breaker',
  'rekan': 'Re:Creators',
  'rehamatora': 'Hamatora',
  'taisouzamurai': 'Taiso Samurai',
  'shakuganno': 'Shakugan no Shana',
  'shironekoproje': 'Shironeko Project',
  'toaruhikuushi': 'The Pilot\'s Love Song',
  'toarukagaku': 'A Certain Scientific Railgun',
  'toarumajutsu': 'A Certain Magical Index',
  'qualideacode': 'Qualidea Code',
  'sakurasouno': 'Sakurasou',
  'sonobisque': 'My Dress-Up Darling',
  'wotakuni': 'Wotakoi',
  'yahariore': 'Oregairu',
  'yurion': 'Yuri!!! on Ice',
  'bluelock': 'Blue Lock',
  'bocchi': 'Bocchi the Rock!',
  'dandadan': 'Dandadan',
  'kaiju': 'Kaiju No. 8',
  'undeadunluck': 'Undead Unluck',
  'windbreaker': 'Wind Breaker',
  'haikyuu': 'Haikyuu!!',
}

const KNOWN = {
  'blackbullet-ed1': { title: 'Tokohana', artist: 'Nagi Yanagi', anime: 'Black Bullet' },
  'nisekoi-ed1': { title: 'Click', artist: 'ClariS', anime: 'Nisekoi' },
  'nisekoi-ed2': { title: 'Heart Realize', artist: 'Tia', anime: 'Nisekoi' },
  'gotoubunno-ed1': { title: 'Sign', artist: 'Aya Uchida', anime: 'The Quintessential Quintuplets' },
}

const PALETTE = [
  '#7c3aed', '#0e7490', '#dc2626', '#b45309', '#0369a1', '#16a34a',
  '#be185d', '#1d4ed8', '#991b1b', '#065f46', '#6d28d9', '#c62828',
  '#d97706', '#0891b2', '#4c1d95', '#9d174d', '#1e3a5f', '#5b21b6',
]

const EXTRA_IDS = new Set([
  'dear-sunrise', 'ds-tanjiro', 'mugen-ed1', 'koiame-ed1', 'ippo-ed1', 'magi-ed1',
])

function isEdFile(file) {
  if (!file.endsWith('.mp4')) return false
  const stem = file.replace(/\.mp4$/i, '')
  if (EXTRA_IDS.has(stem)) return true
  if (/-op\d+(\.mp4)?$/i.test(file) && !/-ed/i.test(file)) return false
  return /[-_]ed(\d+|[_\-s]|$)/i.test(file) || /ed\d+\.mp4$/i.test(file)
}

function parseEdNum(stem) {
  const m = stem.match(/[-_]ed[-_]?s?(\d+)/i) || stem.match(/ed(\d+)$/i)
  return m ? m[1] : null
}

function slugAnime(stem) {
  let base = stem
    .replace(/[-_]s\d+[-_]ed\d*$/i, '')
    .replace(/[-_]ed[-_]?s?\d*$/i, '')
    .replace(/[-_]ed$/i, '')
  const suffix = []
  if (/final/i.test(stem)) suffix.push('Final')
  if (/tybw/i.test(stem)) suffix.push('TYBW')
  if (/alicization/i.test(stem)) suffix.push('Alicization')
  if (/-r2-/i.test(stem) || /r2-ed/i.test(stem)) suffix.push('R2')
  if (/-s2-/i.test(stem) || /s2-ed/i.test(stem)) suffix.push('S2')
  if (/-s3-/i.test(stem) || /s3-ed/i.test(stem)) suffix.push('S3')
  if (/-s4-/i.test(stem) || /s4-ed/i.test(stem)) suffix.push('S4')
  if (SLUGS[base]) return suffix.length ? `${SLUGS[base]} ${suffix.join(' ')}` : SLUGS[base]
  const keys = Object.keys(SLUGS).sort((a, b) => b.length - a.length)
  for (const k of keys) {
    if (base === k || base.startsWith(k + '-') || base.startsWith(k)) {
      return suffix.length ? `${SLUGS[k]} ${suffix.join(' ')}` : SLUGS[k]
    }
  }
  return base.split(/[-_]/).filter(Boolean).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

// Doublons de fichiers (même ending, deux ids). On garde l'id le plus court / LOCAL_TRACKS.
const ALIAS_DROP = new Set([
  '86-ed1',
  'tenshino-ed1',
  'blacklagoon-don-t-look-beh-ed1',
  'csm-ed1', 'csm-ed2', 'csm-ed3', 'csm-ed4', 'csm-ed5',
  'cb-ed1',
  'dn-ed1',
  'kny-ed1',
  'bokudake-ed1',
  'tengentoppa-ed1',
  'konosubarashii-ed1',
  'onk-ed1',
  'rezerokara-ed1',
  'owarino-ed1',
  'spy-ed1',
  'promised-ed2',
  'tg-ed1', 'tg-seijatachi-ed1',
  'yourlie-ed1',
  'tr-koko-de-iki-wo-ed1',
  'cg-ed1',
  'yahariore-everyday-world-ed1',
  'yahariore-everyday-world-ballade-arrange-yukin-ed2',
  'yahariore-everyday-world-ballade-arrange-yui-s-ed3',
  'souleater-ao-no-kaori-ed1',
  'souleater-northern-lights-ed2',
])

function colorFor(id) {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return PALETTE[h % PALETTE.length]
}

function jsStr(s) {
  return JSON.stringify(s ?? '')
}

// Parse LOCAL_TRACKS ED metadata without importing (avoids vite env).
const bt = fs.readFileSync(path.join(root, 'src/lib/blindTest.js'), 'utf8')
const start = bt.indexOf('export const LOCAL_TRACKS = [')
const end = bt.indexOf('\n]', start)
const body = bt.slice(start, end)
const localById = {}
const localByFile = {}
function field(chunk, name) {
  const m = chunk.match(new RegExp(`\\b${name}:\\s*['"]([^'"]*)['"]`))
    || chunk.match(new RegExp(`\\b${name}:\\s*([0-9.]+)`))
  return m ? m[1] : ''
}
const chunks = body.split(/(?=\n\s*\{)/)
for (const chunk of chunks) {
  const id = field(chunk, 'id')
  const type = field(chunk, 'type')
  if (!id || type !== 'ED') continue
  const rec = {
    id,
    title: field(chunk, 'title'),
    anime: field(chunk, 'anime'),
    artist: field(chunk, 'artist'),
    episode: field(chunk, 'episode'),
    url: field(chunk, 'url'),
    color: field(chunk, 'color'),
    endAt: field(chunk, 'endAt'),
    gain: field(chunk, 'gain'),
    emoji: field(chunk, 'emoji'),
  }
  localById[id] = rec
  if (rec.url) {
    const file = rec.url.split('/').pop().replace(/\.mp4$/i, '')
    localByFile[file] = rec
  }
}
console.log('LOCAL_TRACKS ED parsed', Object.keys(localById).length)

const client = new S3Client({
  region: 'auto',
  endpoint: `https://${CF_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
})
const keys = []
let token
do {
  const out = await client.send(new ListObjectsV2Command({
    Bucket: R2_BUCKET_NAME,
    Prefix: 'blind-test/',
    ContinuationToken: token,
  }))
  for (const o of out.Contents || []) keys.push(o.Key)
  token = out.IsTruncated ? out.NextContinuationToken : undefined
} while (token)

const edKeys = keys.filter(k => {
  const file = k.split('/').pop()
  return isEdFile(file) && !k.includes('/faststart/')
})

const seen = new Set()
const participants = []

function pushFrom(id, audioUrl, local) {
  if (seen.has(id)) return
  seen.add(id)
  const known = KNOWN[id] || {}
  const num = parseEdNum(id)
  const anime = local?.anime || known.anime || slugAnime(id)
  const title = (local?.title && local.title !== 'Ending 1' && !/^Ending \d+$/.test(local.title) ? local.title : null)
    || known.title
    || (num ? `Ending ${num}` : 'Ending')
  const artist = local?.artist || known.artist || ''
  const episode = local?.episode || (num ? `Ending ${num}` : 'Ending')
  const color = local?.color || colorFor(id)
  participants.push({
    id,
    title,
    anime,
    artist,
    type: 'ED',
    episode,
    audioUrl,
    endAt: local?.endAt ? Number(local.endAt) : null,
    color,
    emoji: local?.emoji || '◀',
    gain: local?.gain ? Number(local.gain) : null,
  })
}

for (const key of edKeys.sort()) {
  const file = key.split('/').pop()
  const id = file.replace(/\.mp4$/i, '')
  if (ALIAS_DROP.has(id)) continue
  const local = localById[id] || localByFile[id]
  pushFrom(id, `${PUBLIC}/${key}`, local)
}

// LOCAL_TRACKS ED absents de R2 (url custom)
for (const rec of Object.values(localById)) {
  if (seen.has(rec.id) || ALIAS_DROP.has(rec.id)) continue
  pushFrom(rec.id, rec.url, rec)
}

participants.sort((a, b) => a.anime.localeCompare(b.anime) || a.id.localeCompare(b.id))

const n = participants.length
let pow2 = 1
while (pow2 < n) pow2 *= 2
const playable = Math.floor(n / 2)
console.log(JSON.stringify({ r2EdFiles: edKeys.length, catalog: n, padTo: pow2, firstRoundPlayable: playable }, null, 2))

const lines = participants.map(p => {
  const extra = [
    p.endAt ? `endAt:${p.endAt}` : null,
    p.gain ? `gain:${p.gain}` : null,
  ].filter(Boolean).join(', ')
  return `  { id:${jsStr(p.id)}, title:${jsStr(p.title)}, anime:${jsStr(p.anime)}, artist:${jsStr(p.artist)}, type:'ED', episode:${jsStr(p.episode)}, audioUrl:${jsStr(p.audioUrl)}, color:${jsStr(p.color)}, emoji:${jsStr(p.emoji)}${extra ? ', ' + extra : ''} },`
})

const out = `// Auto-généré par scripts/gen-ending-catalog.mjs depuis R2 blind-test + LOCAL_TRACKS ED.
// ${n} endings → bracket ${pow2} → ~${playable} duels au 1er tour.
export const ENDING_R2_CATALOG = [
${lines.join('\n')}
]
`
const dest = path.join(root, 'src/data/ending-r2-catalog.js')
fs.writeFileSync(dest, out)
console.log('wrote', dest, out.length, 'bytes')
