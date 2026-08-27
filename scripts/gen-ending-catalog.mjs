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
