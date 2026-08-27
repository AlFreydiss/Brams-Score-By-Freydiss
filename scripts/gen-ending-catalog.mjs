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
  // Slugs romaji recollés que le générateur affichait bruts dans le bracket.
  'elfenlied': 'Elfen Lied',
  'wolfsrain': "Wolf's Rain",
  'kenshin': 'Rurouni Kenshin',
  'nana': 'NANA',
  'ouran': 'Ouran High School Host Club',
  'terror': 'Terror in Resonance',
  'higurashi': 'Higurashi: When They Cry',
  'digimon': 'Digimon Adventure',
  'demonslayer': 'Demon Slayer',
  'horimiyapiece': 'Horimiya: Piece',
  'kanojookarishi': 'Rent-a-Girlfriend',
  'kiseijuusei': 'Parasyte: The Maxim',
  'kobayashisan': "Miss Kobayashi's Dragon Maid",
  'kokoroconnect': 'Kokoro Connect',
  'konosubarashii': 'KonoSuba',
  'kurokono': "Kuroko's Basketball",
  'kusuriyano': 'The Apothecary Diaries',
  'loghorizon': 'Log Horizon',
  'lycorisrecoil': 'Lycoris Recoil',
  'magisinbad': 'Magi: Adventure of Sinbad',
  'madouking': 'Mado King Granzort',
  'mobilesuit': 'Mobile Suit Gundam',
  'mobilesuit-meguriai': 'Mobile Suit Gundam',
  'momokyun': 'Momo Kyun Sword',
  'monogatariseri': 'Monogatari Series',
  'nanatsuno': 'The Seven Deadly Sins',
  'sakurasouno': 'The Pet Girl of Sakurasou',
  'killla': 'Kill la Kill',
  'rehamatora': 'Re:Hamatora',
  'shironekoproje': 'Shironeko Project',
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
  'jojo': "JoJo's Bizarre Adventure",
  'gintama': 'Gintama',
  'ns': 'Naruto Shippuden',
  'pokemon': 'Pokemon',
  'boruto': 'Boruto',
  'fireforce': 'Fire Force',
  'solo': 'Solo Leveling',
  'sololeveling': 'Solo Leveling',
  'assassination': 'Assassination Classroom',
  'ansatsu': 'Assassination Classroom',
  'agk': 'Akame ga Kill!',
  'kaguya': 'Kaguya-sama: Love is War',
  'mobpsycho': 'Mob Psycho 100',
  'mob': 'Mob Psycho 100',
  'onepunch': 'One Punch Man',
  'onepiece': 'One Piece',
  'naruto': 'Naruto',
  'bleach': 'Bleach',
  'db': 'Dragon Ball',
  'dbk': 'Dragon Ball Kai',
  'eyeshield21': 'Eyeshield 21',
  'ft': 'Fairy Tail',
  'fsn': 'Fate/stay night',
  'fumetsuno': 'Fumetsu no Anata e',
  'goldentime': 'Golden Time',
  'goblinslayer': 'Goblin Slayer',
  'haikyuu': 'Haikyuu!!',
  'hxh': 'Hunter x Hunter',
  'ippo': 'Hajime no Ippo',
  'jjk': 'Jujutsu Kaisen',
  'kny': 'Demon Slayer',
  'konosuba': 'KonoSuba',
  'madeinabyss': 'Made in Abyss',
  'amdb': 'Made in Abyss',
  'mha': 'My Hero Academia',
  'bokuno': 'My Hero Academia',
  'ngnl': 'No Game No Life',
  'nisekoi': 'Nisekoi',
  'opm': 'One Punch Man',
  'parasyte': 'Parasyte',
  'rezero': 'Re:Zero',
  'sao': 'Sword Art Online',
  'shieldhero': 'The Rising of the Shield Hero',
  'slamdunk': 'Slam Dunk',
  'tensura': 'That Time I Got Reincarnated as a Slime',
  'trigun': 'Trigun',
  'violet': 'Violet Evergarden',
  'vivy': "Vivy: Fluorite Eye's Song",
  'yugioh5ds': 'Yu-Gi-Oh! 5Ds',
  'yugioharc': 'Yu-Gi-Oh! ARC-V',
  'yugiohduel': 'Yu-Gi-Oh!',
  'yugiohvrains': 'Yu-Gi-Oh! VRAINS',
  'yugiohzexal': 'Yu-Gi-Oh! ZEXAL',
  'yuuyuuhakusho': 'Yu Yu Hakusho',
  'captaintsubasa': 'Captain Tsubasa',
  'claymore': 'Claymore',
  'cyberpunkedger': 'Cyberpunk Edgerunners',
  'dal': 'Date A Live',
  'deathparade': 'Death Parade',
  'densetsuno': 'The Legend of the Legendary Heroes',
  'devilmancrybab': 'Devilman Crybaby',
  'digimonadventu': 'Digimon Adventure',
  'digimonfrontie': 'Digimon Frontier',
  'domestic': 'Domestic Girlfriend',
  'dragonquest': 'Dragon Quest',
  'dtb': 'Date A Live',
  'eurekaseven': 'Eureka Seven',
  'ff': 'Fire Force',
  'fireforce': 'Fire Force',
  'fate': 'Fate',
  'goldenkamuy': 'Golden Kamuy',
  'haikyuu': 'Haikyuu!!',
  'kaiju': 'Kaiju No. 8',
  'kaguya': 'Kaguya-sama',
  'madeinabyss': 'Made in Abyss',
  'natsumeyuujinc': "Natsume's Book of Friends",
  'nodamecantabil': 'Nodame Cantabile',
  'ourankoukou': 'Ouran High School Host Club',
  'primadoll': 'Prima Doll',
  'rokkano': 'Rokka: Braves of the Six Flowers',
  'sakamotodays': 'Sakamoto Days',
  'samuraichamplo': 'Samurai Champloo',
  'seishunbuta': 'Rascal Does Not Dream of Bunny Girl Senpai',
  'seraph': 'Seraph of the End',
  'shuumatsuno': 'Record of Ragnarok',
  'sinnanatsu': 'The Seven Deadly Sins',
  'toaruhikuushi': "The Pilot's Love Song",
  'windbreaker': 'Wind Breaker',
  'yuushaou': 'The Heroic Legend of Arslan',
  'yuushayamemasu': "I'm Quitting Heroing",
  'zoneof': 'Zone of the Enders',
  'aoharu': 'Aoharu x Kikanjuu',
  'apothecary': 'The Apothecary Diaries',
  'barakamon': 'Barakamon',
  'baki': 'Baki',
  'beelzebub': 'Beelzebub',
  'berserk': 'Berserk',
  'bishoujosenshi': 'Sailor Moon',
  'anohi': 'Anohana',
}

const KNOWN = {
  // Openings identifiés par Shazam (scripts/shazam-openings.json).
  '86-op1': { title: '3 min 29 sec', artist: 'hitorie' },
  'toarumajutsu-op1': { title: 'PSI-missing', artist: 'Mami Kawada' },
  'toarukagaku-op1': { title: 'only my railgun', artist: 'fripSide' },
  'toarukagaku-op2': { title: 'LEVEL5-judgelight-', artist: 'fripSide' },
  'accelworld-op1': { title: 'Chase The World', artist: 'May\'n' },
  'accelworld-op2': { title: 'Burst the Gravity', artist: 'Altima' },
  'agk-op2': { title: 'Liar Mask', artist: 'Rika Mayama' },
  'akamega-op1': { title: 'Skyreach', artist: 'Sora Amamiya' },
  'angelbeats-op1': { title: 'My Soul, Your Beats!', artist: 'Lia & VISUAL ARTS / Key' },
  'anohi-op1': { title: 'Aoi Shiori', artist: 'Galileo Galilei' },
  'aono-op1': { title: 'CORE PRIDE', artist: 'UVERworld' },
  'aono-op2': { title: 'In My World', artist: 'ROOKiEZ Is Punk\'d' },
  'aoharu-op1': { title: 'Sekai Wa Koi Ni Ochiteiru', artist: 'CHiCO with HoneyWorks' },
  'ansatsu-op1': { title: '青春サツバツ論(Full size)', artist: '3-nen E-gumi Utatan' },
  'aot-op1': { title: 'Guren no Yumiya', artist: 'Linked Horizon' },
  'aot-op2': { title: 'Jiyuu no Tsubasa', artist: 'Linked Horizon' },
  'aot-op5': { title: 'Shoukei to Shikabane no Michi', artist: 'Linked Horizon' },
  'aot-op6': { title: 'Boku no Sensou', artist: 'Shinsei kamattechan' },
  'aot-op7': { title: 'The Rumbling', artist: 'SiM' },
  'aot-s2-op': { title: 'Shinzo wo Sasageyo!', artist: 'Linked Horizon' },
  'aot-s3-op': { title: 'Red Swan (feat. HYDE)', artist: 'YOSHIKI' },
  'baccano-op1': { title: 'Gun\'s & Roses', artist: 'Paradise Lunch' },
  'bakemonogatari-op1': { title: 'Staple Stable', artist: 'MONOGATARI Series' },
  'bakemonogatari-op2': { title: 'Kaerimichi', artist: 'MONOGATARI Series' },
  'bakemonogatari-op3': { title: 'Ambivalent World', artist: 'MONOGATARI Series' },
  'bakemonogatari-op4': { title: 'Renai Circulation', artist: 'MONOGATARI Series' },
  'bakemonogatari-op5': { title: 'Sugar Sweet Nightmare', artist: 'MONOGATARI Series' },
  'baki-op1': { title: 'BEASTFUL', artist: 'GRANRODEO' },
  'baki-op2': { title: 'Blue (Da Ba Dee) [Hannover Rmx]', artist: 'Eiffel 65' },
  'bananafish-op1': { title: 'Found & Lost', artist: 'Survive Said The Prophet' },
  'bananafish-op2': { title: 'Freedom', artist: 'BLUE ENCOUNT' },
  'barakamon-op1': { title: 'Super Beaver', artist: 'J Pop' },
  'beastars-op1': { title: 'Wild Side (Anime Version)', artist: 'ALI' },
  'beck-op1': { title: 'Hit in the USA', artist: 'BEAT CRUSADERS' },
  'beelzebub-op1': { title: 'Dadada', artist: 'Group Tamashii' },
  'beelzebub-op2': { title: 'Hajimarunoha sayonara', artist: 'ON/OFF' },
  'beelzebub-op3': { title: 'Hey!!!', artist: 'FLOW' },
  'beelzebub-op4': { title: 'Baby U', artist: 'MBLAQ' },
  'beelzebub-op5': { title: 'Only you -Kimitono Kizuna', artist: 'Lc5' },
  'berserk-op1': { title: 'TELL ME WHY', artist: 'PENPALS' },
  'blackbullet-op1': { title: 'Black Ballet', artist: 'ASCII Media Works' },
  'bc-op1': { title: 'Harukamirai', artist: 'KANKAKU PIERO' },
  'bc-op10': { title: 'Black Catcher', artist: 'VK Blanka' },
  'bc-op2': { title: 'PAiNT it BLACK', artist: 'BiSH' },
  'bc-op3': { title: 'Black Rover', artist: 'VK Blanka' },
  'bc-op4': { title: 'Guess Who Is Back', artist: 'Kumi Koda' },
  'bc-op5': { title: 'Gamushara', artist: 'Miyuna' },
  'bc-op7': { title: 'JUSTadICE', artist: 'Seiko Oomori' },
  'bc-op8': { title: 'sky & blue', artist: 'GIRLFRIEND' },
  'blacklagoon-op1': { title: 'Red fraction', artist: 'MELL' },
  'bleach-op1': { title: 'luna.', artist: 'Darro' },
  'bleach-op10': { title: 'Shoujyo S', artist: 'SCANDAL (JP)' },
  'bleach-op11': { title: 'Animarossa', artist: 'Porno Graffitti' },
  'bleach-op12': { title: 'Change', artist: 'miwa' },
  'bleach-op13': { title: 'Ranbu No Melody (Album Mix)', artist: 'Sid' },
  'bleach-op14': { title: 'Blue', artist: 'ViViD' },
  'bleach-op15': { title: 'HARUKAZE', artist: 'SCANDAL (JP)' },
  'bleach-op2': { title: 'D-tecnoLife', artist: 'UVERworld' },
  'bleach-op3': { title: 'Ichirinnohana', artist: 'HIGH and MIGHTY COLOR' },
  'bleach-op4': { title: 'Tonight, Tonight, Tonight', artist: 'BEAT CRUSADERS' },
  'bleach-op5': { title: 'Rolling Star', artist: 'YUI' },
  'bleach-op6': { title: 'Alones', artist: 'Aqua Timez' },
  'bleach-op7': { title: 'After Dark', artist: 'Asian Kung-Fu Generation' },
  'bleach-op9': { title: 'Velonica', artist: 'Aqua Timez' },
  'bleach-tybw-op': { title: 'Scar', artist: 'Tatsuya Kitani' },
  'blends-op1': { title: 'Bon Appetit S (TV Size Version)', artist: 'BLEND-A' },
  'bluelock-op1': { title: 'Chaos Ga Kiwamaru', artist: 'UNISON SQUARE GARDEN' },
  'bluelock-op2': { title: 'Judgement', artist: 'ASH DA HERO' },
  'bocchi-op1': { title: 'seisyun complex', artist: 'kessoku band' },
  'boruto-op8': { title: 'BAKU', artist: 'Ikimonogakari' },
  'bungoustray-op1': { title: 'TRASH CANDY', artist: 'GRANRODEO' },
  'captaintsubasa-op1': { title: 'START DASH!', artist: 'WEST.' },
  'captaintsubasa-op2': { title: 'KIZUDARAKE NO AI', artist: 'WEST.' },
  'cardcaptorsaku-op1': { title: 'Catch You Catch Me', artist: 'GUMI' },
  'cardcaptorsaku-op3': { title: 'Platinum', artist: 'Maaya Sakamoto' },
  'carole-tuesday-op1': { title: 'Kiss Me', artist: 'CAROLE & TUESDAY (Vo. Nai Br.XX & Celeina Ann)' },
  'chainsaw-op1': { title: 'KICK BACK', artist: 'Kenshi Yonezu' },
  'charlotte-op1': { title: 'Bravely You', artist: 'Lia & VISUAL ARTS / Key' },
  'cityhunter-op1': { title: 'CITY HUNTER～愛よ消えないで～', artist: 'Kahoru Kohiruimaki' },
  'cityhunter-op2': { title: 'Go Go Heaven', artist: 'Yoshiyuki Osawa' },
  'clannad-op1': { title: 'Megumeru (Cuckool MIX 2007)', artist: 'riya & VISUAL ARTS / Key' },
  'clannadafter-op1': { title: 'Toki Wo Kizamu Uta', artist: 'Lia & VISUAL ARTS / Key' },
  'claymore-op1': { title: 'Rezondetoru', artist: 'NIGHTMARE' },
  'cg-r2-op1': { title: 'O2', artist: 'Orange Range' },
  'cg-r2-op2': { title: 'World End', artist: 'FLOW' },
  'codebreaker-op1': { title: 'DARK SHAME', artist: 'GRANRODEO' },
  'bebop-op1': { title: 'Tank!', artist: 'SEAT BELTS' },
  'cyberpunkedger-op1': { title: 'This Fffire', artist: 'Franz Ferdinand' },
  'dandadan-op1': { title: 'Otonoke', artist: 'Creepy Nuts' },
  'dtb-op3': { title: 'Tsukiakari No Michishirube', artist: 'Stereopony' },
  'franxx-op1': { title: 'Kiss of Death', artist: 'Mika Nakashima' },
  'dal-op1': { title: 'Date a Live', artist: 'Sweet Arms' },
  'deathparade-op1': { title: 'Flyers', artist: 'BRADIO' },
  'dungeonmeshi-op1': { title: 'Sleep Walking Orchestra', artist: 'BUMP OF CHICKEN' },
  'dungeonmeshi-op2': { title: 'Unmei', artist: 'sumika' },
  'ds-op1': { title: 'Gurenge', artist: 'LiSA' },
  'ds-op2': { title: 'Zankyosanka', artist: 'Aimer' },
  'ds-op3': { title: 'Kizuna No Kiseki', artist: 'MAN WITH A MISSION & milet' },
  'devilmancrybab-op1': { title: 'Man Human (Devilman Crybaby Version)', artist: 'Denki Groove' },
  'digimonadventu-op1': { title: 'Digimon Main Theme', artist: 'Digimon' },
  'digimonfrontie-op1': { title: 'FIRE!!', artist: 'Koji Wada' },
  'domestic-op1': { title: 'Kawakiwoameku', artist: 'Minami' },
  'dr-stone-op3': { title: 'Paradise', artist: 'Fujifabric' },
  'drstone-op1': { title: 'Good Morning World!', artist: 'BURNOUT SYNDROMES' },
  'drstone-op2': { title: 'Primary Colors', artist: 'PELICAN FANCLUB' },
  'drstone-wasuregataki-op1': { title: 'Wasuregataki', artist: 'Huwie Ishizaki' },
  'dbk-op1': { title: 'Dragon Soul', artist: 'Takayoshi Tanimoto' },
  'dbs-op1': { title: 'Chozetsu Dynamic! (2023 Master)', artist: 'Kazuya Yoshii' },
  'dbs-op2': { title: 'Limit Break x Survivor', artist: 'Kiyoshi Hikawa' },
  'dbz-op2': { title: 'Obstiné en quête de gloire éternel', artist: 'Palaeksa' },
  'dragonquest-op1': { title: '勇者よ いそげ!!', artist: '団時朗' },
  'durarara-op1': { title: 'Uragirinoyuuyake', artist: 'Theatre Brook' },
  'durarara-op2': { title: 'Complication', artist: 'ROOKiEZ Is Punk\'d' },
  'bokudake-op1': { title: 'Re:Re:', artist: 'Asian Kung-Fu Generation' },
  'eurekaseven-op1': { title: 'Days', artist: 'FLOW' },
  'eurekaseven-op2': { title: 'Shonen Heart', artist: 'Home Made Kazoku' },
  'eurekaseven-op3': { title: 'Taiyou No Mannaka He (Live)', artist: 'Bivattchee' },
  'eurekaseven-op4': { title: 'sakura', artist: 'NIRGILIS' },
  'eyeshield21-op3': { title: 'DangDang', artist: 'ZZ' },
  'eyeshield21-op4': { title: 'Blaze Line', artist: 'BACK-ON' },
  'eyeshield21-op5': { title: 'Honoono running back', artist: 'SHORT LEG SUMMER' },
  'fairytail-op15': { title: 'Masayume chasing', artist: 'BoA' },
  'ft-op1': { title: 'Snow fairy', artist: 'FUNKIST' },
  'ft-op10': { title: 'I Wish', artist: 'Milky Bunny' },
  'ft-op11': { title: 'Hajimari No Sora', artist: '+Plus' },
  'ft-op12': { title: 'テノヒラ', artist: 'HERO' },
  'ft-op13': { title: 'Breakthrough', artist: 'GOING UNDER GROUND' },
  'ft-op14': { title: 'Fairy Tail ~Yakusoku No Hi~', artist: 'Chihiro Yonekura' },
  'ft-op2': { title: 'S.O.W. Sense of Wonder', artist: 'Idoling!!!' },
  'ft-op3': { title: 'ft.', artist: 'FUNKIST' },
  'ft-op4': { title: 'R.P.G - Rockin\' Playing Game', artist: 'SuG' },
  'ft-op5': { title: 'Egao No Mahou', artist: 'MAGIC PARTY' },
  'ft-op6': { title: 'Fiesta', artist: '+Plus' },
  'ft-op7': { title: 'Evidence', artist: 'Daisy×Daisy' },
  'ft-op8': { title: 'The Rock City Boy', artist: 'Jamil' },
  'ft-op9': { title: 'Towa no Kizuna Feat. Another Infinity', artist: 'Daisy×Daisy' },
  'fsn-ubw-op2': { title: 'Brave Shine', artist: 'Aimer' },
  'fz-op1': { title: 'Oath Sign', artist: 'LiSA' },
  'ff-op3': { title: 'SPARK - AGAIN', artist: 'Aimer' },
  'fireforce-op1': { title: 'Inferno', artist: 'Mrs. GREEN APPLE' },
  'fireforce-op2': { title: 'MAYDAY (feat. Ryo)', artist: 'coldrain' },
  'fmab-op5': { title: 'Rain', artist: 'Sid' },
  'frieren-op1': { title: 'The Brave', artist: 'YOASOBI' },
  'frieren-op2': { title: 'Sunny', artist: 'Yorushika' },
  'fruitsbasket-op1': { title: 'Again', artist: 'Beverly' },
  'fruitsbasket-op2': { title: 'Chime', artist: 'Ai Otsuka' },
  'fmab-op1': { title: 'Again', artist: 'YUI' },
  'fmab-op2': { title: 'Hologram', artist: 'NICO Touches the Walls' },
  'fmab-op3': { title: 'Golden Time Rubber', artist: 'Sukimaswitch' },
  'fmab-op4': { title: 'Period', artist: 'CHEMISTRY' },
  'fumetsuno-op1': { title: 'PINK BLOOD', artist: 'Hikaru Utada' },
  'mirai-nikki-op1': { title: '空想メソロギヰ', artist: 'Das Feenreich' },
  'gambano-op1': { title: 'Op ガンバのうた 【ガンバの冒険】', artist: '河原　裕昌' },
  'ghostin-op1': { title: 'Inner Universe', artist: 'Origa' },
  'gintama-op1': { title: 'Pray', artist: 'Tommy heavenly6' },
  'gintama-op17': { title: 'KNOW KNOW KNOW', artist: 'DOES' },
  'gintama-op2': { title: 'Tooi Nioi', artist: 'YO-KING' },
  'gintama-op3': { title: 'Gin Iro No Sora', artist: 'redballoon' },
  'gintama-op4': { title: 'kasanarukage', artist: 'HEARTS GROW' },
  'gintama-op5': { title: 'A Cloudy Sky', artist: 'DOES' },
  'gintama-op6': { title: 'Anata MAGIC', artist: 'Monobright' },
  'gintama-op7': { title: 'Stairway Generation', artist: 'Base Ball Bear' },
  'gintama-op8': { title: 'Light Infection', artist: 'Prague' },
  'given-op1': { title: 'Kizuato', artist: 'Centimillimental' },
  'goblinslayer-op1': { title: 'Rightfully (TV Animation Goblin Slayer Opening)', artist: 'Mili' },
  'goldenkamuy-op1': { title: 'Winding Road', artist: 'MAN WITH A MISSION' },
  'goldentime-op2': { title: 'The♡World\'s♡End', artist: 'Yui Horie' },
  'gunx-op1': { title: 'GUN×SWORD (feat. 鬼太鼓座)', artist: 'Kotaro Nakagawa' },
  'tengentoppa-op1': { title: 'Sorairo Days', artist: 'Shoko Nakagawa' },
  'hagureyuusha-op1': { title: 'Realization', artist: 'Faylan' },
  'haikyuu-op1': { title: 'Imagination', artist: 'SPYAIR' },
  'hajimeno-op1': { title: 'Under Star', artist: 'Shocking Lemon' },
  'hajimeno-op2': { title: 'Inner Light', artist: 'Shocking Lemon' },
  'hajimeno-op3': { title: 'Tumbling Dice', artist: 'Tsuneo Imahori' },
  'rehamatora-op1': { title: 'Sen no Tsubasa', artist: 'Gokhan Can' },
  'hellsing-op1': { title: 'Cool. The World Without Logos (HELLSING OST)', artist: 'Yasushi Ishii' },
  'horimiya-op1': { title: 'Irokousui', artist: 'YOH KAMIYAMA' },
  'housekino-op1': { title: 'Kyoumen No Nami', artist: 'YURiKA' },
  'hq-op2': { title: 'Ah Yeah!!', artist: 'Sukimaswitch' },
  'hq-fly-high-op2': { title: 'FLY HIGH!!', artist: 'BURNOUT SYNDROMES' },
  'hq-i-m-a-believer-op1': { title: 'I\'m a Believer', artist: 'SPYAIR' },
  'hq-phoenix-op1': { title: 'Phoenix', artist: 'BURNOUT SYNDROMES' },
  'hxh-op1': { title: 'departure! (Karaoke)', artist: 'Masatoshi Ono' },
  'yuushayamemasu-op1': { title: 'Broken Identity', artist: 'Minori Suzuki' },
  'ichigo100-op1': { title: 'SHINE OF VOICE', artist: '根岸貴幸' },
  'inuto-op1': { title: 'Wan Wan Wan Wan N_1!!', artist: 'Inukko Club' },
  'inuyasha-op1': { title: 'CHANGE THE WORLD', artist: 'V6' },
  'inuyasha-op2': { title: 'I am(犬夜叉/BONUS TV SIZE)', artist: 'ｈｉｔｏｍｉ' },
  'inuyasha-op3': { title: 'Owarinaiyume', artist: 'Nanase Aikawa' },
  'inuyasha-op4': { title: 'Grip!', artist: 'Every Little Thing' },
  'inuyasha-op5': { title: 'One Day,One Dream(カラオケ)', artist: 'タッキー＆翼' },
  'inuyasha-op6': { title: 'ANGELUS', artist: 'Hitomi Shimatani' },
  'jigokuraku-op1': { title: 'WORK', artist: 'ꉈꀧ꒒꒒ꁄꍈꍈꀧ꒦ꉈ ꉣꅔꎡꅔꁕꁄ, Sheena Ringo & Daiki Tsuneta' },
  'jojo-op10': { title: 'STONE OCEAN', artist: 'ichigo from Kisidakyoudan & the Akebosi rockets' },
  'jojo-op2': { title: 'Bloody Stream', artist: 'Coda' },
  'jojo-op1': { title: 'Jojo Sono Chino Sadame', artist: 'tominaga tommy hiroaki' },
  'jojo-op3': { title: 'Stand Proud', artist: 'Jin Hashimoto' },
  'jojo-op6': { title: 'Great Days', artist: 'Karen Aoki & Daisuke Hasegawa' },
  'jojo-op8': { title: 'Fighting Gold', artist: 'Coda' },
  'joukamachino-op1': { title: 'Ring Ring Rainbow !!', artist: 'YUIKAORI' },
  'jjk-op1': { title: 'Kaikai Kitan', artist: 'EVE' },
  'jjk-op2': { title: 'SPECIALZ', artist: 'King Gnu' },
  'jjk-s2-op1': { title: 'Where Our Blue Is', artist: 'Tatsuya Kitani' },
  'kaguya-giri-giri-op1': { title: 'GIRI GIRI (feat. Suu)', artist: 'Masayuki Suzuki' },
  'kaguya-op1': { title: 'Love Dramatic (feat. Rikka Ihara) [Funky Flag Version]', artist: 'Masayuki Suzuki' },
  'kaichouwa-op1': { title: 'My Secret', artist: 'Saaya Mizuno' },
  'kaiju-op1': { title: 'Abyss (from Kaiju No. 8)', artist: 'YUNGBLUD' },
  'kakegurui-op1': { title: 'Deal With The Devil', artist: 'Tia' },
  'katanagatari-op1': { title: '冥夜花伝廊', artist: 'Minami Kuribayashi' },
  'katanagatari-op2': { title: '刀と鞘', artist: 'ALI PROJECT' },
  'kazega-op1': { title: 'Catch up, Latency', artist: 'UNISON SQUARE GARDEN' },
  'kazega-op2': { title: 'Kaze Tsuyoku, Kimi Atsuku.', artist: 'Q-MHz' },
  'kekkaisensen-op1': { title: 'Hello,World! (TV Size Version)', artist: 'BUMP OF CHICKEN' },
  'kenganashura-op1': { title: 'King & Ashley', artist: 'MY FIRST STORY' },
  'kikouryohei-op1': { title: 'オープニングテーマ「ソルジャー・ブルー」', artist: 'Norio Sakai' },
  'killla-op1': { title: 'Sirius', artist: 'Eir Aoi' },
  'klk-op2': { title: 'Ambiguous', artist: 'GARNiDELiA' },
  'kingdom-op1': { title: 'Pride', artist: 'Nothing\'s Carved In Stone' },
  'kokoroconnect-kimochi-signal-op1': { title: 'Kimochi Signal', artist: 'Sayuri Horishita' },
  'kokoroconnect-op1': { title: 'Paradigm', artist: 'eufonius' },
  'kokoroconnect-op2': { title: 'Kimirhythm', artist: 'Masaki Imai' },
  'kon-op1': { title: 'Cagayake!GIRLS', artist: 'Sakurakou K-ON Bu et al.' },
  'konosuba-op1': { title: 'Fantastic Dreamer', artist: 'Machico' },
  'konoyo-op1': { title: 'Konoyo No Hate De Koi Wo Utau Shojo (Off Vocal)', artist: 'Asaka' },
  'konoyo-op2': { title: 'Mother', artist: 'Konomi Suzuki' },
  'kurokono-op1': { title: 'Can Do', artist: 'GRANRODEO' },
  'kurokono-op2': { title: 'RIMFIRE', artist: 'GRANRODEO' },
  'kurokono-s2-op1': { title: 'The Other self', artist: 'GRANRODEO' },
  'kurokono-s2-op2': { title: 'Hengen Jizai no Magical Star', artist: 'GRANRODEO' },
  'kurokono-s3-op1': { title: 'Punky Funky Love', artist: 'GRANRODEO' },
  'kurokono-s3-op2': { title: 'Zero', artist: 'Kensyou Ono' },
  'kurokono-s3-op3': { title: 'Memories', artist: 'GRANRODEO' },
  'kuromukuro-op1': { title: 'デストピア', artist: 'GLAY' },
  'kuromukuro-op2': { title: '超音速デスティニー', artist: 'GLAY' },
  'kuroshitsuji-op1': { title: 'Monokuro No Kiss', artist: 'Sid' },
  'kurozuka-op1': { title: 'Systematic People(Featuring Maximum The Ryo-kun (Maximum The Holmon) [Dug Version]', artist: 'WAGDUG FUTURISTIC UNITY' },
  'yurucamp-op1': { title: 'Shiny Days', artist: 'Asaka' },
  'levele-op1': { title: 'Cold Finger Girl', artist: 'Chiaki Kuriyam' },
  'levius-op1': { title: 'Wit And Love', artist: 'Nazome' },
  'loghorizon-op1': { title: 'Database (feat. TAKUMA)', artist: 'MAN WITH A MISSION' },
  'lycoris-op1': { title: 'ALIVE', artist: 'ClariS' },
  'madeinabyss-op1': { title: 'Deep in Abyss (Anime Intro Version)', artist: 'Miyu Tomita & Mariye Ise' },
  'madein-op1': { title: 'Underground River (Opening Version) [feat. Raj Ramayya]', artist: 'Kevin Penkin' },
  'madouking-op1': { title: '光の戦士たち', artist: '鈴木けんじ' },
  'magisinbad-op1': { title: 'Spotlight', artist: 'PENGUIN RESEARCH' },
  'magithe-op1': { title: 'ANNIVERSARY', artist: 'Sid' },
  'magithe-op2': { title: 'Hikari', artist: 'ViViD' },
  'mahoutsukaino-op2': { title: 'You', artist: 'May\'n' },
  'maoujoude-op1': { title: '快眠!安眠!スヤリスト生活', artist: 'Princess Syalis (CV: Inori Minase)' },
  '3gatsu-op1': { title: 'Answer', artist: 'BUMP OF CHICKEN' },
  '3gatsu-op2': { title: 'Sayonara Bystander', artist: 'YUKI' },
  'mashineiyuuden-op2': { title: 'Fight!', artist: 'Yumiko Takahashi' },
  'mashineiyuuden-step-by-step-op1': { title: 'Step by Step', artist: 'Yumiko Takahashi' },
  'mashle-op1': { title: 'Knock Out(Album Mix)', artist: 'okazakitaiiku' },
  'megalobox-op1': { title: 'Bite', artist: 'Leo Imai' },
  'meijitokyo-op1': { title: 'Moonlight Rapsodia', artist: 'KENN' },
  'michikoto-op1': { title: 'Paraiso', artist: 'SOIL & "PIMP" SESSIONS' },
  'kobayashisan-op1': { title: 'Rhapsody of Blue Sky', artist: 'Fhána' },
  'mob-op1': { title: '99', artist: 'MOB CHOIR' },
  'mobpsycho-s2-op1': { title: '99.9', artist: 'MOB CHOIR' },
  'mobpsycho-s3-op1': { title: '1', artist: 'MOB CHOIR' },
  'mobilesuit-daybreak-s-bell-op1': { title: 'DAYBREAK\'S BELL', artist: 'L\'Arc-en-Ciel' },
  'mobilesuit-op1': { title: 'Itsuka Sora ni Todoite', artist: 'Megumi Shiina' },
  'mobilesuit-op2': { title: 'Ash Like Snow', artist: 'the brilliant green' },
  'mobilesuit-sora-no-uta-hi-op1': { title: 'The Song of the Cosmos - Higher and Higher', artist: 'LUNA SEA' },
  'momokyun-op1': { title: 'Momoiro Fantasy', artist: 'Haruka Chisuga' },
  'gekkanshoujo-op1': { title: '君じゃなきゃダメみたい', artist: 'Oishi Masayoshi' },
  'mushoku-op1': { title: '旅人の唄', artist: 'Yuiko Ohara' },
  'sonobisque-op1': { title: 'Sun Sun Days', artist: 'Spira Spica' },
  'watashino-op1': { title: 'Anata No Sobani.', artist: 'Riria.' },
  'mha-op1': { title: 'The Day', artist: 'Porno Graffitti' },
  'mha-op2': { title: 'ピースサイン(TV edit.)', artist: 'Kenshi Yonezu' },
  'mha-op3': { title: 'Sora Ni Utaeba', artist: 'amazarashi' },
  'mha-op4': { title: 'Odd Future', artist: 'UVERworld' },
  'mha-op6': { title: 'Polaris', artist: 'BLUE ENCOUNT' },
  'mha-s5-op1': { title: 'No.1', artist: 'DISH//' },
  'mha-s5-op2': { title: 'Merry-Go-Round', artist: 'MAN WITH A MISSION' },
  'mha-s6-op1': { title: 'Hitamuki', artist: 'SUPER BEAVER' },
  'mha-s6-op2': { title: 'Bokurano', artist: 'EVE' },
  'mha-s7-op1': { title: 'Tagatame', artist: 'TK from Ling tosite sigure' },
  'mha-s7-op2': { title: 'Curtain Call', artist: 'Yuuri' },
  'mha-s3-op2': { title: 'Make My Story', artist: 'Lenny code fiction' },
  'mha-s4-op2': { title: 'Starmarker (Album Mix)', artist: 'KANA-BOON' },
  'nana-op1': { title: 'Rose', artist: 'ANNA TSUCHIYA inspi\' NANA(BLACK STONES)' },
  'nana-op2': { title: 'Wish', artist: 'OLIVIA inspi\' REIRA(TRAPNEST)' },
  'nana-op3': { title: 'Lucy', artist: 'ANNA TSUCHIYA inspi\' NANA(BLACK STONES)' },
  'naruto-op1': { title: 'ROCKS', artist: 'Hound Dog' },
  'naruto-op10': { title: 'GOLD', artist: 'FLOW' },
  'naruto-op11': { title: 'Kirarirari', artist: 'KANA-BOON' },
  'naruto-op12': { title: 'Karma', artist: 'Asian Kung-Fu Generation' },
  'naruto-op2': { title: 'Haruka Kanata - From THE FIRST TAKE', artist: 'Asian Kung-Fu Generation' },
  'naruto-op3': { title: 'Kanashimi wo Yasashisani ni', artist: 'Little by Little' },
  'naruto-op4': { title: 'Go!!!', artist: 'FLOW' },
  'naruto-op5': { title: 'Seishun Kyousoukyoku', artist: 'Sambomaster' },
  'naruto-op6': { title: 'No Boy No Cry (Album Version)', artist: 'Stance Punks' },
  'naruto-op7': { title: 'Namikaze Satellite', artist: 'Snowkel' },
  'naruto-op8': { title: 'FLOW NARUTO OP / ED Size Special Collection', artist: 'FLOW' },
  'naruto-op9': { title: 'Yura Yura', artist: 'HEARTS GROW' },
  'ns-op1': { title: 'Hero\'s Come Back!!', artist: 'Nobodyknows+' },
  'ns-op10': { title: 'Newsong', artist: 'tacica' },
  'ns-op12': { title: 'Moshimo', artist: 'Daisuke' },
  'ns-op13': { title: 'Niwakaame Nimo Makezu', artist: 'NICO Touches the Walls' },
  'ns-op14': { title: 'Tsukino Ookisa', artist: 'Nogizaka46' },
  'ns-op15': { title: 'Guren', artist: 'DOES' },
  'ns-op16': { title: 'Silhouette', artist: 'KANA-BOON' },
  'ns-op17': { title: 'Kaze', artist: 'Yamazaru' },
  'ns-op18': { title: 'Line (Anime Version)', artist: 'Sukimaswitch' },
  'ns-op19': { title: 'Blood Circulator', artist: 'Asian Kung-Fu Generation' },
  'ns-op20': { title: 'Karano Kokoro', artist: 'Anly' },
  'ns-op3': { title: 'Blue Bird', artist: 'Ikimonogakari' },
  'ns-op4': { title: 'Closer (Naruto Opening Ver.)', artist: 'Joe Inoue' },
  'ns-op5': { title: 'Hotarunohikari (2021 Remastered)', artist: 'Ikimonogakari' },
  'ns-op6': { title: 'Sign', artist: 'FLOW' },
  'ns-op7': { title: 'Toumeidatta Sekai', artist: 'Hata Motohiro' },
  'ns-op8': { title: 'Diver', artist: 'NICO Touches the Walls' },
  'ns-op9': { title: 'Lovers', artist: 'seven oops' },
  'natsumeyuujinc-op1': { title: 'Issei no sei', artist: 'Shuhei Kita' },
  'nge-op1': { title: 'The Cruel Angel\'s Thesis', artist: 'Yoko Takahashi' },
  'newgame-op1': { title: 'SAKURAスキップ', artist: 'fourfolium' },
  'nichijou-op1': { title: 'ヒャダインのカカカタ☆カタオモイ-C', artist: 'Hyadain' },
  'nichijou-op2': { title: 'ヒャダインのじょーじょーゆーじょー (without ヒャダル子)', artist: 'Hyadain' },
  'nisekoi-op1': { title: 'Click', artist: 'ClariS' },
  'nisekoi-op2': { title: 'Step', artist: 'ClariS' },
  'nisemonogatari-op1': { title: 'Futakotome', artist: 'MONOGATARI Series' },
  'nisemonogatari-op2': { title: 'Marshmallow Justice', artist: 'MONOGATARI Series' },
  'nisemonogatari-op3': { title: 'Platinum Disco', artist: 'MONOGATARI Series' },
  'ngnl-op1': { title: 'This game', artist: 'Konomi Suzuki' },
  'nogame-op2': { title: 'おねがい☆すにゃいぱー', artist: '初瀬いづな(CV:沢城みゆき)' },
  'no6-op1': { title: 'Spell', artist: 'Lama' },
  'nodamecantabil-op1': { title: 'Allegro Cantabile', artist: 'SUEMITSU & THE SUEMITH' },
  'noragami-op1': { title: 'Goyanomachiawase', artist: 'Hello Sleepwalkers' },
  'noragamiaragot-op1': { title: 'Kyouran Hey Kids!!', artist: 'THE ORAL CIGARETTES' },
  'oddtaxi-op1': { title: 'ODDTAXI', artist: 'Skirt & PUNPEE' },
  'op-op1': { title: 'We Are!', artist: 'Kitadani Hiroshi' },
  'op-op11': { title: 'Share The World', artist: 'TVXQ!' },
  'op-op12': { title: 'Kazewo sagashite', artist: 'YAGUCHI MARI with STRAW HAT' },
  'op-op13': { title: 'One day', artist: 'The ROOTLESS' },
  'op-op14': { title: 'Fight Together', artist: 'Namie Amuro' },
  'op-op15': { title: 'We go!', artist: 'Kitadani Hiroshi' },
  'op-op16': { title: 'HANDS UP !', artist: 'Kota Shinzato' },
  'op-op17': { title: 'Wake Up!', artist: 'AAA' },
  'op-op18': { title: 'Make It Real', artist: 'GENERATIONS from EXILE TRIBE' },
  'op-op19': { title: 'We Can!', artist: 'Kishidan & Kitadani Hiroshi' },
  'op-op2': { title: 'Believe', artist: 'Folder 5' },
  'op-op20': { title: 'Hope', artist: 'Namie Amuro' },
  'op-op21': { title: 'Super Powers', artist: 'mugiwara-san' },
  'op-op22': { title: 'OVER THE TOP', artist: 'Kitadani Hiroshi' },
  'op-op23': { title: 'DREAMIN\' ON', artist: 'Da-iCE' },
  'op-op24': { title: 'PAINT', artist: 'I Don\'t Like Mondays.' },
  'op-op25': { title: 'The Peak', artist: 'SEKAI NO OWARI' },
  'op-op26': { title: 'UUUUUS!', artist: 'Kitadani Hiroshi' },
  'op-op27': { title: 'ANGEL & DEVIL', artist: 'GRe4N BOYZ' },
  'op-op28': { title: 'Carmine', artist: 'Ellegarden' },
  'op-op29': { title: 'Luminous', artist: 'Aina The End' },
  'op-op3': { title: 'Hikari E', artist: 'mugiwara-san' },
  'op-op4': { title: 'Bon Voyage!', artist: 'BON-BON BLANCO' },
  'op-op5': { title: 'ココロのちず', artist: 'BOYSTYLE' },
  'op-op6': { title: 'Brand New World', artist: 'D-51' },
  'op-op8': { title: 'Crazy Rainbow', artist: 'タッキー＆翼' },
  'op-op9': { title: 'Jungle P', artist: '50/50' },
  'opm-op1': { title: 'THE HERO !!: Ikareru Kobushi ni Hi o Tsukero', artist: 'JAM Project' },
  'opm-s2-op1': { title: 'Uncrowned Greatest Hero', artist: 'JAM Project' },
  'yahariore-op1': { title: 'ユキトキ', artist: 'yanaginagi' },
  'onk-s2-op1': { title: 'Fatal', artist: 'GEMN, Kento Nakajima & Tatsuya Kitani' },
  'ourankoukou-op1': { title: 'Sakura Kiss', artist: 'Chieco Kawabe' },
  'overlord-op1': { title: 'Clattanoia', artist: 'OxT' },
  'overlordii-op1': { title: 'GO CRY GO', artist: 'OxT' },
  'overlordiv-op1': { title: 'HOLLOW HUNGER', artist: 'OxT' },
  'overlord-op3': { title: 'VORACITY', artist: 'MYTH & ROID' },
  'parasyte-op1': { title: 'Let Me Hear', artist: 'Fear, and Loathing in Las Vegas' },
  'pingpong-op1': { title: 'Tadahitori (Album Mix)', artist: 'BAKUDAN JOHNNY' },
  'pokemon-believe-in-me-op5': { title: 'Pokemon Theme Season 2: One Piece Theme - Incredible Crash Test Dummies Theme', artist: '4Kids TV' },
  'pokemon-op1': { title: 'めざせポケモンマスター', artist: 'Rica Matsumoto' },
  'pokemon-op2': { title: 'ライバル!', artist: 'Rica Matsumoto' },
  'pokemon-op3': { title: 'OK!', artist: 'Rica Matsumoto' },
  'pokemon-op4': { title: 'Born to Be a Winner', artist: 'Pokémon' },
  'pokemon-fr-op1': { title: 'Pokémon-Thema (Komm schnapp sie dir)', artist: 'Anime Allstars' },
  'primadoll-op1': { title: 'Tin Toy Melody', artist: 'Chat noir(Haizakura, Karasuba, Gekka, Houkiboshi, Retzel)' },
  'psychopass-op1': { title: 'Abnormalize (Best of Tornado Remastering)', artist: 'Ling tosite sigure' },
  'psychopass-op2': { title: 'Out of Control', artist: 'Nothing\'s Carved In Stone' },
  'psychopass-s2-op1': { title: 'Enigmatic Feeling', artist: 'Ling tosite sigure' },
  'qualideacode-op1': { title: 'Brave Freak Out', artist: 'LiSA' },
  'qualideacode-op2': { title: 'Axxxis', artist: 'LiSA' },
  'ousamaranking-op1': { title: 'BOY', artist: 'King Gnu' },
  'ousamaranking-op2': { title: 'Hadaka No Yusha', artist: 'VAUNDY' },
  'seishunbuta-op1': { title: 'Kiminosei (Remastered 2022)', artist: 'the peggies' },
  'rekan-op1': { title: 'Colorful Story', artist: 'every❤ing !' },
  'rezero-op1': { title: 'Redo', artist: 'Konomi Suzuki' },
  'rezero-op2': { title: 'Realize', artist: 'Konomi Suzuki' },
  'shuumatsuno-op1': { title: 'KAMIGAMI (TV edit)', artist: 'MAXIMUM THE HORMONE' },
  'kanojo-op1': { title: 'Centimeter', artist: 'the peggies' },
  'rokkano-op1': { title: 'Cry for the Truth', artist: 'MICHI' },
  'rokkano-op2': { title: 'Black Swallowtail', artist: 'UROBOROS' },
  'bishoujosenshi-op1': { title: 'MOON PRIDE', artist: 'Momoiro Clover Z' },
  'sakamotodays-op1': { title: 'Hashire SAKAMOTO (Sakamoto Days OP)', artist: 'Dai Luong' },
  'sakurasouno-op1': { title: '君が夢を連れてきた', artist: 'Ai Kayano, 中津真莉子 & Natsumi Takamori' },
  'sakurasouno-op2': { title: '夢の続き', artist: 'Konomi Suzuki' },
  'champloo-op1': { title: 'Battlecry (feat. Shing02)', artist: 'Nujabes' },
  'seraph-op1': { title: 'X.U. (feat. Gemie)', artist: 'SawanoHiroyuki[nZk]' },
  'serialexperime-op1': { title: 'Duvet', artist: 'bôa' },
  'nanatsu-op1': { title: 'Netsujo No Spectrum', artist: 'Ikimonogakari' },
  'shakuganno-op1': { title: 'Prophecy', artist: 'Mami Kawada' },
  'shironekoproje-op1': { title: 'Libra', artist: 'Takanori Nishikawa & ASCA' },
  'slamdunk-op1': { title: '君が好きだと叫びたい', artist: 'BAAD' },
  'slamdunk-op2': { title: 'ぜったいに 誰も', artist: 'ZYYG' },
  'solo-leveling-op1': { title: 'LEveL (feat. TOMORROW X TOGETHER)', artist: 'SawanoHiroyuki[nZk]' },
  'souleater-op1': { title: 'Resonance', artist: 'T.M.Revolution' },
  'souleater-op2': { title: 'PAPERMOON', artist: 'Tommy heavenly6' },
  'sg-op1': { title: 'Hacking to the Gate', artist: 'ITO KANAKO' },
  'supercub-op1': { title: 'まほうのかぜ', artist: 'Akane Kumada' },
  'superlovers-op1': { title: 'おかえり。', artist: '矢田悠祐' },
  'sao-op1': { title: 'Crossing Field', artist: 'LiSA' },
  'sao-op2': { title: 'Innocence', artist: 'Eir Aoi' },
  'sao-resolution-op1': { title: 'Resolution', artist: 'Haruka Tomatsu' },
  'sao-alicization-op1': { title: 'ADAMAS', artist: 'LiSA' },
  'sao-alicization-op2': { title: 'Resister', artist: 'ASCA' },
  'sao-s2-op1': { title: 'Ignite', artist: 'Eir Aoi' },
  'sao-s2-op2': { title: 'Courage (Album Mix)', artist: 'Haruka Tomatsu' },
  'sao-s2-op3': { title: 'Separate Ways', artist: 'Haruka Tomatsu' },
  'sao-wou-op2': { title: 'ANIMA', artist: 'ReoNa' },
  'tenseishitara-op1': { title: 'Nameless Story', artist: 'Takuma Terashima' },
  'tenseishitara-op2': { title: 'メグルモノ', artist: 'Takuma Terashima' },
  'tenseishitara-s2-op1': { title: 'Storyteller', artist: 'TRUE' },
  'amdb-op1': { title: 'Here', artist: 'JUNNA' },
  'apothecary-op1': { title: 'Be a flower', artist: 'Ryokuoushoku Shakai' },
  'kusuriyano-op2': { title: 'Ambivalent', artist: 'Uru' },
  'kusuriyano-s2-op1': { title: 'In Bloom', artist: 'Lilas' },
  'vanitas-op2': { title: 'Your Name', artist: 'Little Glee Monster' },
  'yuushaou-op1': { title: 'Yusyaou Tanjo!', artist: 'Masaaki Endoh' },
  'densetsuno-op1': { title: 'LAMENT〜やがて喜びを〜', artist: 'Aira Yuuki' },
  'densetsuno-op2': { title: 'Last Inferno', artist: 'Ceui' },
  'toaruhikuushi-op1': { title: 'Azurite', artist: 'Petit Milady' },
  'tpn-op1': { title: 'Touch off', artist: 'UVERworld' },
  'gotoubunno-op1': { title: 'Gotoubun no Kimochi', artist: 'Nakanoke no Itsutsugo' },
  'tateno-op1': { title: 'Rise', artist: 'MADKID' },
  'tateno-op2': { title: 'Faith', artist: 'MADKID' },
  'tateno-s2-op1': { title: 'Bring Back (English Version)', artist: 'MADKID' },
  'nanatsuno-op2': { title: 'Seven Deadly Sins', artist: 'MAN WITH A MISSION' },
  'sinnanatsu-op1': { title: 'My Sweet Maiden', artist: 'Mia REGINA' },
  'tokyoesp-op1': { title: 'Tokyo Zero Hearts', artist: 'Faylan' },
  'tg-op1': { title: 'Unravel', artist: 'TK from Ling tosite sigure' },
  'tg-s2-op1': { title: 'Katharsis', artist: 'TK from Ling tosite sigure' },
  'tr-op1': { title: 'Cry Baby', artist: 'OFFICIAL HIGE DANDISM' },
  'toradora-op1': { title: 'Pre-parade', artist: '逢坂大河(釘宮理恵), 櫛枝実乃梨(堀江由衣) & 川嶋亜美(喜多村英梨)' },
  'toradora-op2': { title: 'Silky Heart', artist: 'Yui Horie' },
  'trigun-op1': { title: 'H.T', artist: 'Dr.Donuts' },
  'trigunstampede-op1': { title: 'Tombi', artist: 'Kvi Baba' },
  'undeadunluck-op1': { title: 'ZERO ICHI', artist: 'Queen Bee' },
  'undeadunluck-op2': { title: 'Love Call', artist: 'Shiyui' },
  'vinland-op1': { title: 'Mukanjyo', artist: 'Survive Said The Prophet' },
  'vinland-op2': { title: 'River', artist: 'Anonymouz' },
  'vinland-s2-op2': { title: 'Paradox (Acoustic)', artist: 'Survive Said The Prophet' },
  've-op1': { title: 'Sincerely', artist: 'TRUE' },
  'vivy-op1': { title: 'Sing My Pleasure', artist: 'Vivy (Vo.Kairi Yagi)' },
  'windbreaker-op1': { title: 'Absolute zero', artist: 'natori' },
  'wonderegg-op1': { title: 'SUDACHINO UTA', artist: 'Anemoneria' },
  'wotakuni-op1': { title: 'Fiction', artist: 'sumika' },
  'ylia-op1': { title: 'Hikarunara', artist: 'Goose house' },
  'ylia-op2': { title: 'Nanairo Symphony', artist: 'COALAMODE.' },
  'yuuyuuhakusho-op1': { title: 'Hohoemi no Bakudan', artist: 'Mawatari Matsuko' },
  'yugiohduel-op2': { title: 'Shuffle', artist: 'Masami Okui' },
  'yugioh5ds-op1': { title: 'Kizuna', artist: 'Kra' },
  'yugioh5ds-op2': { title: 'LAST TRAIN -新しい朝-', artist: 'knotlamp' },
  'yugioharc-op1': { title: 'Believe×Believe', artist: 'chotokkyu' },
  'yugioharc-op2': { title: 'Burn!', artist: 'chotokkyu' },
  'yugiohvrains-op1': { title: '「遊☆戯☆王 VRAINS」OPテーマ曲 With The Wind', artist: 'tominaga tommy hiroaki' },
  'yugiohvrains-op2': { title: 'go Forward', artist: 'KIMERU' },
  'yugiohzexal-op1': { title: 'Master Piece', artist: 'Mihimaru GT' },
  'yugiohzexal-op2': { title: 'Braving!', artist: 'KANAN' },
  'yurion-op1': { title: 'History Maker', artist: 'Dean Fujioka' },
  'zoneof-op1': { title: 'Zone of the Enders', artist: 'LAZY' },

  // Titres et artistes identifiés directement dans l'audio par Shazam
  // (scripts/shazam-endings.json). Les résultats douteux — même chanson rendue pour
  // deux animés différents, ou artiste égal au nom de la licence — ont été
  // écartés et gardent leur libellé générique.
  '86-ed2': { title: 'Hands Up to the Sky (feat. Laco)', artist: 'SawanoHiroyuki[nZk]' },
  'toarumajutsu-ed1': { title: 'Rimless～フチナシノセカイ～', artist: 'IKU' },
  'toarumajutsu-ed2': { title: '誓い言～スコシだけもう一度～', artist: 'IKU' },
  'toarukagaku-ed1': { title: 'Dear My Friend', artist: 'Elisa' },
  'toarukagaku-ed2': { title: 'Smile -You&Me-', artist: 'Elisa' },
  'toarukagaku-ed3': { title: 'Real Force', artist: 'Elisa' },
  'accelworld-ed1': { title: '→Unfinished→', artist: 'KOTOKO' },
  'accelworld-ed2': { title: 'ユナイト', artist: 'Sachika Misawa' },
  'akamega-ed1': { title: 'Konna Sekai Shiritaku Nakatta', artist: 'Miku Sawai' },
  'tenshino-ed2': { title: 'Howling', artist: 'Jun Goto (CV: Yuko Ono) et al.' },
  'anohi-ed2': { title: 'Secret Base - Kimigakuretamono (10 Years After Version)', artist: 'Meiko Honma (CV:Ai Kayano) et al.' },
  'aono-ed2': { title: 'Wired Life', artist: 'Meisa Kuroki' },
  'aot-ed2': { title: 'great escape', artist: 'cinema staff' },
  'aot-final-ed1': { title: 'Shogeki', artist: 'Yuko Ando' },
  'aot-s2-ed1': { title: 'Yuugure No Tori', artist: 'Shinsei kamattechan' },
  'aot-s3-ed1': { title: 'Akatsuki no Requiem', artist: 'Linked Horizon' },
  'baccano-ed1': { title: 'Calling', artist: 'Oda Kaori' },
  'bananafish-ed1': { title: 'Prayer X', artist: 'King Gnu' },
  'bananafish-ed2': { title: 'red', artist: 'Survive Said The Prophet' },
  'beastars-ed1': { title: 'Le zoo', artist: 'YURiKA' },
  'beastars-ed2': { title: 'Nemureru Honnou', artist: 'YURiKA' },
  'beastars-ed3': { title: 'Marble', artist: 'YURiKA' },
  'beck-ed1': { title: 'My World Down', artist: 'Meister' },
  'beck-ed2': { title: 'Moon on the Water', artist: 'Sowelu' },
  'bleach-tybw-ed2': { title: 'SAIHATE', artist: 'SennaRin' },
  'blends-ed1': { title: 'Detaramena Minus To Plus Ni Okeru Blendkou', artist: 'BLEND-A' },
  'bluelock-ed1': { title: 'WINNER', artist: 'Shugo Nakamura' },
  'bluelock-ed2': { title: 'Numbness Like A Ginger', artist: 'UNISON SQUARE GARDEN' },
  'bocchi-ed1': { title: 'Distortion!!', artist: 'kessoku band' },
  'bocchi-ed2': { title: 'Karakara', artist: 'kessoku band' },
  'bocchi-ed3': { title: 'What is wrong with', artist: 'kessoku band' },
  'bocchi-ed4': { title: 'Rockn\' Roll, Morning Light Falls on You', artist: 'kessoku band' },
  'bungoustray-ed1': { title: '名前を呼ぶよ', artist: 'LUCK LIFE' },
  'cardcaptorsaku-ed1': { title: 'Groovy! (2022 Remastering)', artist: 'Kohmi Hirose' },
  'cardcaptorsaku-ed2': { title: 'Honey', artist: 'CHIHIRO' },
  'cardcaptorsaku-ed4': { title: 'Fruits Candy', artist: 'Megumi Kojima' },
  'cityhunter-ed1': { title: 'Get Wild', artist: 'TM NETWORK' },
  'cityhunter-smile-smile-ed1': { title: 'Smile & Smile', artist: 'Aura' },
  'clannadafter-ed1': { title: 'Torch', artist: 'Lia & VISUAL ARTS / Key' },
  'clannadafter-ed2': { title: 'Chiisana Tenohira', artist: 'riya & VISUAL ARTS / Key' },
  'cg-r2-ed1': { title: 'Shiawase-Neiro', artist: 'Orange Range' },
  'cg-r2-ed2': { title: 'Waga Routashi Aku No Hana', artist: 'ALI PROJECT' },
  'codebreaker-ed1': { title: 'シロイカラス', artist: 'Kenichi Suzumura' },
  'cb-ed2': { title: 'Space Lion', artist: 'SEAT BELTS' },
  'cb-ed3': { title: 'Blue', artist: 'Mai Yamane' },
  'dandadan-ed1': { title: 'TAIDADA', artist: 'ZUTOMAYO' },
  'dn-ed3': { title: 'Coda-Death Note', artist: 'Yoshihisa Hirano' },
  'dungeonmeshi-ed1': { title: 'Party!!', artist: 'Ryokuoushoku Shakai' },
  'dungeonmeshi-ed2': { title: 'Twinkling Ash', artist: 'Regallily' },
  'kny-s2-ed1': { title: 'Asa ga kuru', artist: 'Aimer' },
  'kny-s3-ed1': { title: 'Koi Kogare', artist: 'milet & MAN WITH A MISSION' },
  'drstone-ed2': { title: '夢のような', artist: 'saekiyusuke' },
  'drstone-koe-ed1': { title: 'Voice?', artist: 'HATENA' },
  'drstone-where-do-we-go-ed1': { title: 'Where Do We Go?', artist: 'OKAMOTO\'S' },
  'dbs-ed1': { title: 'Hello Hello Hello', artist: 'Good Morning America' },
  'dbs-ed2': { title: 'スターリングスター', artist: 'KEYTALK' },
  'dbs-ed3': { title: 'Usubeni', artist: 'LACCO TOWER' },
  'dbs-ed4': { title: 'Forever Dreaming (TV-size)', artist: 'Czecho No Republic' },
  'dbs-ed5': { title: 'Yoka Yoka Dance', artist: 'BATTEN GIRLS' },
  'dbs-ed6': { title: '炒飯MUSIC(TVアニメver.)', artist: 'ARUKARA' },
  'dbs-ed7': { title: 'Akunotenshito Seiginoakuma', artist: 'THE COLLECTORS' },
  'dbs-ed8': { title: 'Boogie Back', artist: 'Miyu Inoue' },
  'dbz-ed1': { title: 'Come Out, Incredible ZENKAI Power!', artist: 'Dragon Ball' },
  'dbz-ed2': { title: 'Dragon Hits', artist: 'Josafat' },
  'durarara-ed1': { title: 'Trust Me', artist: 'YOUYA' },
  'durarara-ed2': { title: 'Butterfly', artist: 'ON/OFF' },
  'flcl-ed1': { title: 'Ride On Shooting Star', artist: 'the pillows' },
  'frieren-bliss-ed1': { title: 'bliss', artist: 'milet' },
  'fruitsbasket-ed1': { title: 'Lucky Ending', artist: 'VK Blanka' },
  'fruitsbasket-ed2': { title: 'One Step Closer', artist: 'INTERSECTION' },
  'fullmetalalche-ed1': { title: 'Kesenai Tsumi', artist: 'Nana Kitade' },
  'fullmetalalche-ed2': { title: 'Tobirano Mukoue', artist: 'YeLLOW Generation' },
  'fullmetalalche-ed3': { title: 'Motherland', artist: 'Crystal Kay' },
  'fullmetalalche-ed4': { title: 'I Will (Less Vocal)', artist: 'Sowelu' },
  'fmab-ed3': { title: 'Tsunaida Te', artist: 'Lil\'B' },
  'fmab-ed4': { title: 'Shunkan Sentimental', artist: 'SCANDAL (JP)' },
  'fmab-ed5': { title: 'Ray of Light', artist: 'Shoko Nakagawa' },
  'gambano-ed1': { title: 'Boukensha Tachi No Ballade', artist: 'すぎうらよしひろ' },
  'ghostin-ed1': { title: 'Lithium Flower', artist: 'Scott Matthew' },
  'goldenkamuy-ed1': { title: 'Hibana', artist: 'THE SIXTH LIE' },
  'gunx-ed1': { title: 'A Rising Tide', artist: 'Okino, Shuntaro' },
  'tengentoppa-ed2': { title: 'Happily Ever After', artist: 'Shoko Nakagawa' },
  'tengentoppa-ed3': { title: 'Minna No Peace', artist: 'Afuromania' },
  'ippo-ed1': { title: 'Yuzora no Kamihikoki(TV edition)', artist: 'Naoya Mori' },
  'rehamatora-ed1': { title: 'Brand New World', artist: 'ayami' },
  'horimiya-ed1': { title: 'Yakusoku', artist: 'Friends' },
  'horimiyapiece-ed1': { title: 'URL', artist: 'Ami Sakaguchi' },
  'hq-ed1': { title: 'Tenchi Gaeshi (Haikyu Ed Version)', artist: 'NICO Touches the Walls' },
  'hq-ed2': { title: 'LEO', artist: 'tacica' },
  'hq-climber-ed1': { title: 'Climber', artist: 'Galileo Galilei' },
  'hq-hatsunetsu-ed2': { title: 'Hatsunetsu', artist: 'tacica' },
  'hq-mashi-mashi-ed1': { title: 'Mashi Mashi', artist: 'NICO Touches the Walls' },
  'hxh-ed1': { title: 'Just Awake', artist: 'Fear, and Loathing in Las Vegas' },
  'hxh-ed3': { title: 'Reason', artist: 'YUZU' },
  'hxh-ed4': { title: 'Nagareboshi Kirari (Yuzu Version)', artist: 'YUZU' },
  'jojo-ed1': { title: 'Roundabout', artist: 'Yes' },
  'jojo-sc-ed1': { title: 'Walk Like an Egyptian', artist: 'The Bangles' },
  'jjk-ed3': { title: 'SPECIALZ', artist: 'King Gnu' },
  'jjk-s2-ed1': { title: 'Akari', artist: 'Soushi Sakiyama' },
  'kaguya-ed1': { title: 'Heart Ha Oteage', artist: 'Airi Suzuki' },
  'kaguya-ed2': { title: 'My Nonfiction', artist: 'Makoto Furukawa & Chika Fujiwara(CV:Konomi Kohara)' },
  'kanojookarishi-ed1': { title: 'Kokuhaku bungee jump', artist: 'halca' },
  'katanagatari-ed1': { title: '誰そ彼の月華', artist: 'Das Feenreich' },
  'katanagatari-ed2': { title: 'Refulgence', artist: 'Shoujo Byou' },
  'killla-ed1': { title: 'Gomenne, Iikoja Irarenai', artist: 'Miku Sawai' },
  'killla-ed2': { title: 'Shin Sekai Koukyougaku', artist: 'Sayonara Ponytail' },
  'kiseijuusei-ed1': { title: 'Enma Daiou ni Kiitegoran', artist: 'Sumire Uesaka' },
  'kobayashisan-ed1': { title: 'イシュカン・コミュニケーション', artist: 'ちょろゴンず' },
  'kokoroconnect-ed2': { title: 'Cry out', artist: 'TEAM NEKOKAN & ATSUKO' },
  'kon-ed1': { title: 'Don\'t say "lazy"', artist: 'Sakurakou K-ON Bu et al.' },
  'konosubarashii-s2-ed1': { title: 'Ouchi Ni Kaeritai', artist: 'Aqua (CV: Sora Amamiya) et al.' },
  'kurokono-ed2': { title: 'CATALRHYTHM', artist: 'OLDCODEX' },
  'kurokono-s3-ed1': { title: 'GLITTER DAYS', artist: 'Fo\'xTails' },
  'kuromukuro-ed1': { title: 'Realistic', artist: 'MICHI' },
  'kuromukuro-ed2': { title: 'Eien Loop', artist: 'Ami Wajima' },
  'kuroshitsuji-ed1': { title: 'I\'m Alive!', artist: 'Becca' },
  'kurozuka-ed1': { title: 'Hanarebanare', artist: 'Shigi' },
  'kusuriyano-ed1': { title: 'The Spell', artist: 'Aina The End' },
  'kusuriyano-ed2': { title: 'Aiwakusuri', artist: 'wacci' },
  'loghorizon-ed1': { title: 'Your song*', artist: 'Yun*chi' },
  'lycorisrecoil-ed1': { title: 'Tower of Flower', artist: 'Sayuri' },
  'madein-ed1': { title: '旅の左手、最果ての右手[リコ&レグver.]', artist: 'リコ(CV:富田美憂)、レグ(CV:伊瀬茉莉也)' },
  'madouking-ed1': { title: 'Boku no Kako kara Boku no Mirai e', artist: 'Makoto Nagai' },
  'madouking-ed2': { title: 'Dakara Seigi wa Katsu!', artist: 'Yoko Matsuoka & Shinobu Adachi' },
  'magisinbad-ed1': { title: 'Polaris', artist: 'Fujifabric' },
  '3gatsu-ed1': { title: 'Fighter', artist: 'BUMP OF CHICKEN' },
  '3gatsu-ed2': { title: 'Orion', artist: 'Kenshi Yonezu' },
  'mobpsycho-ed3': { title: 'Refrain Boy', artist: 'All Off' },
  'mobpsycho-s2-ed1': { title: 'Gray', artist: 'sajou no hana' },
  'mobilesuit-ed1': { title: 'Toi Kioku', artist: 'Megumi Shiina' },
  'mobilesuit-meguriai-ed1': { title: 'Meguriai (feat. GLIM SPANKY)', artist: 'SUGIZO' },
  'momokyun-ed1': { title: 'Momo Kyun Sword', artist: '桃子(CV 竹達彩奈)' },
  'momokyun-ed2': { title: 'Ready Go!! -Zettai Muteki No Tennyo Tai-', artist: '天女隊<林檎(CV 三上枝織) 水花(CV 三森すずこ) 栗(CV 大久保瑠美) 花梨(CV 大坪由佳)>' },
  'monogatariseri-ed1': { title: 'Ai Wo Utae', artist: 'Luna Haruna' },
  'monogatariseri-ed3': { title: 'Sonokoewo Oboeteru', artist: 'Marina Kawano' },
  'monogatariseri-ed4': { title: 'Snowdrop (Luna Haruna X Marina Kawano Version)', artist: 'Luna Haruna' },
  'gekkanshoujo-ed1': { title: 'ウラオモテ・フォーチュン', artist: '佐倉千代(CV:小澤亜李)' },
  'sonobisque-ed1': { title: 'koi no yukue', artist: 'Akaseakari' },
  'watashino-ed1': { title: 'ヰタ・フィロソフィカ', artist: 'Ito Kashitaro' },
  'bnha-ed3': { title: 'Datte Atashino Hero', artist: 'LiSA' },
  'mha-ed1': { title: 'HEROES (Anime Version)', artist: 'Brian the Sun' },
  'mha-s5-ed1': { title: 'Ashiato - Footprints', artist: 'the peggies' },
  'mha-s3-ed1': { title: 'Update', artist: 'miwa' },
  'nanatsuno-ed1': { title: '7 - Seven', artist: 'FLOW & GRANRODEO' },
  'nanatsuno-ed2': { title: 'Season (TV Size Version)', artist: 'Arisa Takigawa' },
  'naruto-boku-wa-hashiri-tsuzukeru-ed3': { title: 'Boruto: Naruto Next Generations Ending 3 Full『MELOFLOAT - Boku wa Hashiri Tsuzukeru』', artist: 'Monster Fight' },
  'naruto-dreamy-journey-ed1': { title: 'Dreamy Journey (Remastered 2022)', artist: 'the peggies' },
  'naruto-sayonara-moon--ed2': { title: 'Sayonara Moon Town', artist: 'Scenarioart' },
  'nge-ed2': { title: 'FLY ME TO THE MOON (OFF VOCAL Version)', artist: 'claire' },
  'nge-ed3': { title: 'FLY ME TO THE MOON (OFF VOCAL Version)', artist: 'claire' },
  'nge-ed4': { title: 'FLY ME TO THE MOON (4 BEAT VERSION)', artist: 'Yoko Takahashi' },
  'nge-ed6': { title: 'Fly Me To the Moon (Yoko Takahashi Acid Bossa Version)', artist: 'Shiro SAGISU & Yoko Takahashi' },
  'newgame-ed1': { title: 'Now Loading!!!!', artist: 'fourfolium' },
  'nichijou-ed1': { title: 'Zzz', artist: 'Sayaka Sasaki' },
  'nichijou-ed2': { title: '翼をください', artist: 'Sayaka Sasaki' },
  'nichijou-ed3': { title: '気球にのってどこまでも', artist: '東雲なの(CV.古谷静佳)、はかせ(CV.今野宏美)、阪本さん(CV.白石稔)東雲なの(CV.古谷静佳)、はかせ(…' },
  'nichijou-ed4': { title: 'マイバラード', artist: 'Sayaka Sasaki' },
  'nichijou-ed5': { title: '怪獣のバラード', artist: '相生祐子(CV.本多真梨子)、長野原みお(CV.相沢舞)、水上麻衣(CV.富樫美鈴)' },
  'nisekoi-ed3': { title: 'TRICK BOX', artist: 'Seishirou Tsugumi (CV:Mikako Komatsu)' },
  'nisekoi-ed4': { title: 'オーダー×オーダー', artist: '宮本るり(内山夕実)' },
  'nisemonogatari-ed1': { title: 'Naisho No Hanashi', artist: 'ClariS' },
  'nogame-ed1': { title: 'オラシオン', artist: 'SHIRO(CV:AI KAYANO)' },
  'no6-ed1': { title: 'Rokutouseino Yoru', artist: 'Aimer' },
  'noragamiaragot-ed1': { title: 'ニルバナ', artist: 'Tia' },
  'oddtaxi-ed1': { title: 'Sugarless Kiss', artist: 'Suzuko Mimori' },
  'opm-ed2': { title: 'Kanashimitachi o Dakishimete', artist: 'Hiroko Moriguchi' },
  'opm-s2-ed1': { title: 'No map but I\'ll be back', artist: 'Makoto Furukawa' },
  'yahariore-ed1': { title: 'Hello Alone', artist: 'Yukino Yukinoshita(CV.Saori Hayami) et al.' },
  'yahariore-ed2': { title: 'Hello Alone -Yui Ballade-', artist: 'Yukino Yukinoshita(CV.Saori Hayami) et al.' },
  'yahariore-ed3': { title: 'Hello Alone -Band arrange-', artist: 'Yukino Yukinoshita(CV.Saori Hayami) et al.' },
  'onk-s2-ed1': { title: 'Burning', artist: 'Hitsujibungaku' },
  'overlord-ed1': { title: 'L.L.L.', artist: 'MYTH & ROID' },
  'overlordii-s2-ed1': { title: 'HYDRA', artist: 'MYTH & ROID' },
  'overlordiii-s3-ed1': { title: 'Silent Solitude', artist: 'OxT' },
  'overlordiv-s4-ed1': { title: 'No Man\'s Dawn', artist: 'MAYU MAESHIMA' },
  'pingpong-ed1': { title: 'Ano Heroto Bokuranitsuite', artist: 'Meringue' },
  'psychopass-ed2': { title: 'All Alone with You', artist: 'EGOIST' },
  'qualideacode-ed1': { title: 'Gravity', artist: 'ClariS' },
  'qualideacode-ed2': { title: 'Yakusoku - Promise Code', artist: 'GARNiDELiA' },
  'ousamaranking-ed1': { title: 'Oz.', artist: 'yama' },
  'ousamaranking-ed2': { title: 'Flare', artist: 'milet' },
  'rekan-ed1': { title: 'Kesaran Pasaran', artist: 'every❤ing !' },
  'rezerokara-ed3': { title: 'Stay Alive', artist: 'EMILIA(CV:RIE TAKAHASHI)' },
  'sakurasouno-ed1': { title: 'DAYS of DASH', artist: 'Konomi Suzuki' },
  'sakurasouno-ed2': { title: 'Prime number~君と出会える日~', artist: '大倉明日香' },
  'serialexperime-ed1': { title: 'Tooi Sakebi', artist: 'Reichi Nakaido' },
  'shakuganno-ed1': { title: 'All in good time', artist: 'Mami Kawada' },
  'shironekoproje-ed1': { title: 'through the dark', artist: 'Rei Yasuda' },
  'souleater-ed2': { title: 'Style.', artist: 'Kana Nishino' },
  'souleater-ed4': { title: 'Strength.', artist: 'abingdon boys school' },
  'spy-s2-ed1': { title: 'Todome no ichigeki (feat. Cory Wong)', artist: 'VAUNDY' },
  'supercub-ed1': { title: '春への伝言', artist: 'Yuki Yomichi, Ayaka Nanase & Natsumi Hioka' },
  'superlovers-ed1': { title: 'ハピネスYOU & ME (Ren & Haru & Aki & Shima Ver.)', artist: 'Junko Minagawa et al.' },
  'sao-ed1': { title: 'Yumesekai', artist: 'Haruka Tomatsu' },
  'sao-ed2': { title: 'Overfly', artist: 'Luna Haruna' },
  'sao-alicization-ed1': { title: 'Iris', artist: 'Eir Aoi' },
  'sao-s2-ed2': { title: 'No More Time Machine', artist: 'LiSA' },
  'sao-s2-ed3': { title: 'Shirushi', artist: 'LiSA' },
  'taisouzamurai-ed1': { title: 'Dream?', artist: 'HATENA' },
  'tenseishitara-ed1': { title: 'Another colony', artist: 'TRUE' },
  'tenseishitara-ed2': { title: 'リトルソルジャー', artist: 'Azusa Tadokoro' },
  'tenseishitara-s2-ed1': { title: 'STORYSEEKER', artist: 'STEREO DIVE FOUNDATION' },
  'tpn-ed2': { title: 'Lamp', artist: 'Cö shu Nie' },
  'tateno-ed1': { title: 'Kimino Namae', artist: 'Chiai Fujikawa' },
  'tateno-ed3': { title: 'Atashiga Tonarini Iru Uchini', artist: 'Chiai Fujikawa' },
  'tateno-s2-ed1': { title: 'Yuzurenai', artist: 'Chiai Fujikawa' },
  'tokyoesp-ed1': { title: '救世アルギュロス', artist: 'Das Feenreich' },
  'tg-s2-ed1': { title: 'Rakuen No Kimi', artist: 'österreich' },
  'tr-ed2': { title: 'Tokyo Wonder.', artist: 'Nakimushi' },
  'toradora-ed3': { title: 'Holy Night', artist: '逢坂大河(CV:釘宮理恵) & 川嶋亜美(CV:喜多村英梨)' },
  'trigunstampede-ed1': { title: 'Stars Alfa', artist: 'Salyu & haruka nakamura' },
  'undeadunluck-ed1': { title: 'know me...', artist: 'Kairi Yagi' },
  'vinland-s2-ed1': { title: 'Without Love', artist: 'LMYK' },
  'vinland-s2-ed2': { title: 'Ember', artist: 'haju:harmonics' },
  'violet-ed2': { title: 'みちしるべ', artist: 'Minori Chihara' },
  'vivyfluorite-ed1': { title: 'Fluorite Eye\'s Song (Piano Version)', artist: 'Satoru Kosaki' },
  'wonderegg-ed1': { title: 'Life is Cider', artist: 'Anemoneria' },
  'wotakuni-ed1': { title: 'Kimi No Tonari', artist: 'halca' },
  'wotakuni-ed2': { title: 'Ashitamomata', artist: 'halca' },
  'ylia-ed1': { title: 'Kirameki', artist: 'wacci' },
  'yuuyuuhakusho-ed1': { title: 'Homework ga Owaranai', artist: 'Mawatari Matsuko' },
  'yuuyuuhakusho-ed2': { title: 'Sayonara Bye Bye', artist: 'Mawatari Matsuko' },
  'yugiohduel-ed1': { title: 'Energetic Shower (feat. Etoshinmori)', artist: 'Rin' },
  'yugiohduel-ed2': { title: 'Anohi no Gogo', artist: 'Masami Okui' },
  'yugiohvrains-ed1': { title: 'Believe In Magic', artist: 'Ryoga' },
  'yugiohvrains-ed2': { title: 'Writing Life', artist: 'Goodbye holiday' },
  'yugiohzexal-ed1': { title: 'Boku Quest', artist: 'Golden Bomber' },
  'yugiohzexal-ed2': { title: 'Setsubou No Freesia (Album mix)', artist: 'DaizyStripper' },
  'yurion-ed2': { title: 'Yeah Yeah Yeah', artist: 'Tomonori Hayashibe' },
  'yurion-ed3': { title: 'Duetto (Stammi Vicino,non Te Ne Andare)', artist: 'Taku Matsushiba et al.' },
  'berserk-ed1': { title: 'Waiting so long', artist: 'Silver Fins' },
  'bleach-ed3': { title: 'Houkiboshi', artist: 'Younha' },
  'deathparade-ed1': { title: 'Last Theater', artist: 'Noisycell' },
  'digimon-ed1': { title: 'I wish', artist: 'Ai Maeda' },
  'elfenlied-ed1': { title: 'be your girl', artist: 'Chieco Kawabe' },
  'fsn-ubw-ed1': { title: 'Believe', artist: 'Kalafina' },
  'fsn-ubw-ed2': { title: 'Ring Your Bell', artist: 'Kalafina' },
  'gintama-ed2': { title: 'MR.RAINDROP', artist: 'amplified' },
  'gintama-ed3': { title: 'Some Like It Hot!!', artist: 'SPYAIR' },
  'higurashi-ed1': { title: 'why, or why not (feat. 片霧烈火)', artist: 'Hiroyuki Oshima' },
  'inuyasha-ed2': { title: 'Fukaimori', artist: 'Do As Infinity' },
  'inuyasha-ed3': { title: 'Dearest', artist: 'Ayumi Hamasaki' },
  'kenshin-ed1': { title: 'Tactics', artist: 'THE YELLOW MONKEY' },
  'kenshin-ed3': { title: 'Heart of Sword - Yoakemae', artist: 'T.M.Revolution' },
  'nana-ed1': { title: 'A Little Pain', artist: 'OLIVIA inspi\' REIRA(TRAPNEST)' },
  'narutos-ed14': { title: 'Utakata Hanabi', artist: 'supercell' },
  'narutos-ed2': { title: 'Michi To You All', artist: 'aluto' },
  'narutos-ed6': { title: 'Broken Youth', artist: 'NICO Touches the Walls' },
  'onepiece-ed1': { title: 'memories', artist: 'OOTSUKI MAKI' },
  'onepiece-ed2': { title: 'RUN! RUN! RUN!', artist: 'OOTSUKI MAKI' },
  'ouran-ed1': { title: 'Shissou', artist: 'LAST ALLIANCE' },
  'slamdunk-ed1': { title: 'あなただけ見つめてる', artist: 'Maki Ohguro' },
  'sololeveling-ed1': { title: 'request', artist: 'krage' },
  'terror-ed1': { title: 'Dareka Umiwo', artist: 'Aimer' },
  'wolfsrain-ed1': { title: 'Gravity', artist: 'Maaya Sakamoto' },

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

function slugAnime(stem, kind = 'ed') {
  const k = kind === 'op' ? 'op' : 'ed'
  let base = stem
    .replace(new RegExp(`[-_]s\\d+[-_]${k}\\d*$`, 'i'), '')
    .replace(new RegExp(`[-_]${k}[-_]?s?\\d*$`, 'i'), '')
    .replace(new RegExp(`[-_]${k}$`, 'i'), '')
  const suffix = []
  if (/final/i.test(stem)) suffix.push('Final')
  if (/tybw/i.test(stem)) suffix.push('TYBW')
  if (/alicization/i.test(stem)) suffix.push('Alicization')
  if (/-wou-/i.test(stem)) suffix.push('WoU')
  if (/-r2-/i.test(stem) || new RegExp(`r2-${k}`, 'i').test(stem)) suffix.push('R2')
  if (/-s2-/i.test(stem) || new RegExp(`s2-${k}`, 'i').test(stem)) suffix.push('S2')
  if (/-s3-/i.test(stem) || new RegExp(`s3-${k}`, 'i').test(stem)) suffix.push('S3')
  if (/-s4-/i.test(stem) || new RegExp(`s4-${k}`, 'i').test(stem)) suffix.push('S4')
  if (SLUGS[base]) return suffix.length ? `${SLUGS[base]} ${suffix.join(' ')}` : SLUGS[base]
  const keys = Object.keys(SLUGS).sort((a, b) => b.length - a.length)
  for (const key of keys) {
    if (base === key || base.startsWith(key + '-') || base.startsWith(key + '_')) {
      return suffix.length ? `${SLUGS[key]} ${suffix.join(' ')}` : SLUGS[key]
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

  // Doublons confirmés par empreinte audio (chromaprint, BER < 0.07 alors que
  // deux chansons différentes tournent autour de 0.45) : la même chanson était
  // présente sous deux ids. On garde l'entrée qui porte le vrai titre et on
  // jette celle qui n'affichait qu'un « Ending N » anonyme.
  'demonslayer-ed3',        // = ds-ed2 « Shirogane »
  '3gatsu-ed3',             // = 3gatsu-ed2
  'aono-ed1',               // = blueexorcist-ed1 « Take Off »
  'aot-ed5',                // = aot-ed7 « Akuma no Ko »
  'souleater-ed3',          // = souleater-ed1 « I Wanna Be »
  'jjk-s2-ed2',             // = jjk-ed2 « more than words »
  'mha-s2-ed1',             // = mha-ed2 « Datte Atashi no Hero »
  'hxh-hunting-for-yo-ed2', // = hxh-ed2 « HUNTING FOR YOUR DREAM »
  'hxh-hyoriittai-ed5',     // = hxh-ed5 « Hyouriittai »
  'cg-ed2',                 // = codegeass-ed1 « Mosaic Kakera »
  'dn-ed2',                 // = deathnote-ed1 « Zetsubou Billy »

  // Retiré à la demande du propriétaire du site.
  'ylia-ed3',
])

// Endings cultes dont l'audio n'est pas sur R2 : ils sont joués depuis le
// lecteur YouTube officiel plutôt que ré-hébergés. DuelArena sait lire un
// participant qui porte un `ytId` au lieu d'un `audioUrl`.
//
// Chaque identifiant a été vérifié via l'API oEmbed de YouTube : la vidéo
// existe et provient bien d'une chaîne officielle (chaîne d'artiste, chaîne
// « - Topic » générée par le distributeur, ou éditeur de la licence).
const EXTRA_YT = [
  {
    id: 'seishunbuta-ed1',
    title: 'Fukashigi no Carte',
    anime: 'Rascal Does Not Dream of Bunny Girl Senpai',
    artist: 'Mai Sakurajima (CV: Asami Seto)',
    episode: 'Ending 1',
    ytId: 'YjrSkBjDVEw',   // chaîne « Mai Sakurajima(CV:Asami Seto) - Topic »
    color: '#be185d',
    emoji: '🐰',
  },
  {
    id: 'fireforce-ed1',
    title: 'veil',
    anime: 'Fire Force',
    artist: 'Keina Suda',
    episode: 'Ending 1',
    ytId: 'geE49ne2mQg',   // chaîne officielle Crunchyroll
    color: '#dc2626',
    emoji: '🔥',
  },
]

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

// Les entrées YouTube rejoignent le bracket comme les autres, sauf qu'un id
// déjà servi depuis R2 garde la priorité (l'audio local est préférable).
for (const yt of EXTRA_YT) {
  if (seen.has(yt.id) || ALIAS_DROP.has(yt.id)) continue
  seen.add(yt.id)
  participants.push({ ...yt, type: 'ED', audioUrl: null, endAt: null, gain: null })
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
  const media = p.ytId ? `ytId:${jsStr(p.ytId)}` : `audioUrl:${jsStr(p.audioUrl)}`
  return `  { id:${jsStr(p.id)}, title:${jsStr(p.title)}, anime:${jsStr(p.anime)}, artist:${jsStr(p.artist)}, type:'ED', episode:${jsStr(p.episode)}, ${media}, color:${jsStr(p.color)}, emoji:${jsStr(p.emoji)}${extra ? ', ' + extra : ''} },`
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

// ── Openings (même source R2) ─────────────────────────────────────────────
function isOpFile(file) {
  if (!file.endsWith('.mp4')) return false
  if (/-ed(\d+|[-_s])/i.test(file) && !/-op/i.test(file)) return false
  return /[-_]op\d/i.test(file) || /op\d+\.mp4$/i.test(file) || /[-_]op\.mp4$/i.test(file)
}

function parseOpNum(stem) {
  const m = stem.match(/[-_]op[-_]?s?(\d+)/i) || stem.match(/op(\d+)$/i)
  return m ? m[1] : null
}

const OP_ALIAS_DROP = new Set([
  'eightysix-op1',
  'tenshino-op1',
  'anohi-circle-game-op1',
  'csm-op1',
  'cb-op1',
  'kny-op1', 'knykimetsu-no-op1',
  'dr-stone-op1',
  'bokuno-op1',
  'onk-op1',
  'rezerokara-op1', 'rezerokara-op2',
  'ousama-op1',
  'samuraichamplo-op1',
  'owarino-op1',
  'tensura-op1',
  'shieldhero-op1',
  'yourlie-op1',
  'spy-op1', 'spy-s2-op1',
  'promised-op1',
  'dn-op1', 'dn-op2',
  'cg-op1', 'cg-op2', 'cg-op3',
  'konosubarashii-op1', 'konosubarashii-fantastic-drea-op1',
  'ft-power-of-the-dream-op1',
  'ft-down-by-law-op2', 'ft-strike-back-op2',
  'ft-mysterious-magic-op3', 'ft-no-limit-op3',
  'ft-break-out-op4', 'ft-more-than-like-op4',
  'ft-yume-iro-graffiti-op5',
  'ft-never-end-tale-op6',
  'gintama-bakuchi-dancer-op1',
  'gintama-kaze-no-gotoku-op2',
  'gintama-kanousei-girl-op3',
  'gintama-katoniago-op4',
  'naruto-baton-road-op1',
  'naruto-over-op2',
  'naruto-it-s-all-in-th-op3',
  'naruto-lonely-go-op4',
  'naruto-golden-time-op5',
  'naruto-teenage-dream-op6',
  'naruto-hajimatte-iku-takamatte-iku-op7',
  'ns-niwaka-ame-nimo-makezu-op13',
  'nge-zankoku-na-tenshi-no-thesis-op1',
  'op-one-piece-theme-op1',
  'op-saikou-toutatsuten-op25',
  'pokemon-pokemon-theme-gotta-catch-em-all-op1',
  'pokemon-a-whole-new-world-pokemon-johto-op3',
  'fmab-again-op1',
  'ghostin-get9-op1',
  'sonobisque-ao-to-kirameki-op1',
  'yahariore-harumodoki-op1',
  'bleach-scar-op1', 'bleach-shoujo-s-op10',
  'dbs-genkai-toppa-x-op2',
  'souleater-counter-identity-op1',
  'souleater-ai-ga-hoshii-yo-op2',
  'tr-white-noise-op1',
  'psychopass-q-vism-op1',
  'bishoujosenshi-moonlight-densetsu-op1',
  'bishoujosenshi-sailor-moon-theme-op1',
  'yuuyuuhakusho-hohoemi-no-bak-op1',
  'tg-asphyxia-op1',
  'fullmetalalche-op1', 'fullmetalalche-op2', 'fullmetalalche-op3', 'fullmetalalche-op4',
  'vivyfluorite-op1', 'vivyfluorite-op2', 'vivyfluorite-op4',
  'plasticmemorie-op1',
  'oshi-no-ko-op1',
  'beastars2nd-s2-op1',
  // Doublons confirmés par empreinte audio (chromaprint) : le même opening
  // existait sous deux slugs, souvent une fois nommé et une fois anonyme.
  // On garde systématiquement l'entrée qui porte le vrai titre.
  'jojo-op4', 'jojo-bloody-stream-op2', // = jojo-op2 « Bloody Stream »
  'vinland-s2-op1',                     // = vinland-op2 « River »
  'kny-s2-op1',                         // = ds-op2 « Zankyou Sanka »
  'kny-s3-op1',                         // = ds-op3 « Kizuna no Kiseki »
  'kon-op2',                            // = kon-op1
  'lycorisrecoil-op1',                  // = lycoris-op1 « ALIVE »
  'aot-shinzou-wo-sas-op1',             // = aot-s2-op « Shinzou wo Sasageyo! »
  'aot-final-op',                       // = aot-op7 « The Rumbling »
  'aot-final-op1',                      // = aot-op6 « My War »
  'madein-op2',                         // = madeinabyss-op1 « Deep in Abyss »
  'mha-s2-op1',                         // = mha-op2 « Peace Sign »
  'mha-s2-op2',                         // = mha-op3 « Sora ni Utaeba »
  'mha-s3-op1',                         // = mha-op4 « Make My Story »
  'mha-op7',                            // = mha-op6 « Polaris »
  'jjk-s2-op2',                         // = jjk-op2 « SPECIALZ »
  'nanatsuno-op1',                      // = nanatsu-op1 « Netsujou no Spectrum »
  'mobpsycho-op1',                      // = mob-op1 « 99 »
  'mahoutsukaino-op1',                  // = amdb-op1 « Here »
  'hq-op1',                             // = haikyuu-op1 « Imagination »
])

const localOpById = {}
const localOpByFile = {}
for (const chunk of chunks) {
  const id = field(chunk, 'id')
  const type = field(chunk, 'type') || 'OP'
  if (!id || type === 'ED') continue
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
  localOpById[id] = rec
  if (rec.url) {
    const file = rec.url.split('/').pop().replace(/\.mp4$/i, '')
    localOpByFile[file] = rec
  }
}
console.log('LOCAL_TRACKS OP parsed', Object.keys(localOpById).length)

const opKeys = keys.filter(k => {
  const file = k.split('/').pop()
  return isOpFile(file) && !k.includes('/faststart/')
})

const seenOp = new Set()
const openings = []

function pushOp(id, audioUrl, local) {
  if (seenOp.has(id)) return
  seenOp.add(id)
  const known = KNOWN[id] || {}
  const num = parseOpNum(id)
  const anime = local?.anime || known.anime || slugAnime(id, 'op')
  const title = (local?.title && local.title !== 'Opening 1' && !/^Opening \d+$/.test(local.title) ? local.title : null)
    || known.title
    || (num ? `Opening ${num}` : 'Opening')
  const artist = local?.artist || known.artist || ''
  const episode = local?.episode || (num ? `Opening ${num}` : 'Opening')
  const color = local?.color || colorFor(id)
  openings.push({
    id,
    title,
    anime,
    artist,
    type: 'OP',
    episode,
    audioUrl,
    endAt: local?.endAt ? Number(local.endAt) : null,
    color,
    emoji: local?.emoji || '▶',
    gain: local?.gain ? Number(local.gain) : null,
  })
}

for (const key of opKeys.sort()) {
  const file = key.split('/').pop()
  const id = file.replace(/\.mp4$/i, '')
  if (OP_ALIAS_DROP.has(id)) continue
  const local = localOpById[id] || localOpByFile[id]
  pushOp(id, `${PUBLIC}/${key}`, local)
}
for (const rec of Object.values(localOpById)) {
  if (seenOp.has(rec.id) || OP_ALIAS_DROP.has(rec.id)) continue
  pushOp(rec.id, rec.url, rec)
}

openings.sort((a, b) => a.anime.localeCompare(b.anime) || a.id.localeCompare(b.id))
const nOp = openings.length
let pow2op = 1
while (pow2op < nOp) pow2op *= 2
console.log(JSON.stringify({ r2OpFiles: opKeys.length, catalog: nOp, padTo: pow2op, firstRoundPlayable: Math.floor(nOp / 2) }, null, 2))

const opLines = openings.map(p => {
  const extra = [
    p.endAt ? `endAt:${p.endAt}` : null,
    p.gain ? `gain:${p.gain}` : null,
  ].filter(Boolean).join(', ')
  return `  { id:${jsStr(p.id)}, title:${jsStr(p.title)}, anime:${jsStr(p.anime)}, artist:${jsStr(p.artist)}, type:'OP', episode:${jsStr(p.episode)}, audioUrl:${jsStr(p.audioUrl)}, color:${jsStr(p.color)}, emoji:${jsStr(p.emoji)}${extra ? ', ' + extra : ''} },`
})
const opOut = `// Auto-généré par scripts/gen-ending-catalog.mjs depuis R2 blind-test + LOCAL_TRACKS OP.
// ${nOp} openings → bracket ${pow2op} → ~${Math.floor(nOp / 2)} duels au 1er tour.
export const OPENING_R2_CATALOG = [
${opLines.join('\n')}
]
`
const opDest = path.join(root, 'src/data/opening-r2-catalog.js')
fs.writeFileSync(opDest, opOut)
console.log('wrote', opDest, opOut.length, 'bytes')
