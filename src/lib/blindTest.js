import { supabase } from './supabase.js'
import { SB_URL, SB_KEY, getAccessToken } from './supabaseRest.js'

// ── Local tracks (always available, no DB needed) ──────────────────────────
// type: 'OP' (opening) ou 'ED' (ending) — sert à séparer Blind Test / Tournois.
export const LOCAL_TRACKS = [
  // ═══ LOT +89 OP/ED (1080p, dédoublonné par id + titre) ═══
  {
    id: 'jojo-op1', anime: 'JoJo\'s Bizarre Adventure', title: 'Sono Chi no Sadame', artist: 'Hiroaki Tommy Tominaga', type: 'OP', episode: 'Opening 1',
    url: 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/jojo-op1.mp4',
    difficulty: 'moyen', color: '#f1c40f', emoji: '💎',
    aliases: ['jojo', 'jojo\'s bizarre adventure', 'jjba', 'sono chi no sadame', 'jonathan joestar', 'dio'],
  },
  {
    id: 'jojo-op3', anime: 'JoJo\'s Bizarre Adventure', title: 'Stand Proud', artist: 'Jin Hashimoto', type: 'OP', episode: 'Opening 3',
    url: 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/jojo-op3.mp4',
    difficulty: 'moyen', color: '#8e44ad', emoji: '⭐',
    aliases: ['jojo', 'stardust crusaders', 'stand proud', 'jotaro kujo', 'star platinum'],
  },
  {
    id: 'jojo-op6', anime: 'JoJo\'s Bizarre Adventure', title: 'Great Days', artist: 'Karen Aoki & Daisuke Hasegawa', type: 'OP', episode: 'Opening 8',
    url: 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/jojo-op6.mp4',
    difficulty: 'difficile', color: '#9b59b6', emoji: '🌸',
    aliases: ['jojo', 'diamond is unbreakable', 'great days', 'josuke higashikata', 'killer queen'],
  },
  {
    id: 'jojo-op8', anime: 'JoJo\'s Bizarre Adventure', title: 'Fighting Gold', artist: 'Coda', type: 'OP', episode: 'Opening 9',
    url: 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/jojo-op8.mp4',
    difficulty: 'moyen', color: '#d4af37', emoji: '🪙',
    aliases: ['jojo', 'golden wind', 'fighting gold', 'giorno giovanna', 'gold experience'],
  },
  {
    id: 'ds-op2', anime: 'Demon Slayer', title: 'Zankyou Sanka', artist: 'Aimer', type: 'OP', episode: 'Opening 2',
    url: 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/ds-op2.mp4',
    difficulty: 'moyen', color: '#2ecc71', emoji: '⚔️',
    aliases: ['demon slayer', 'kimetsu no yaiba', 'zankyou sanka', 'tanjiro', 'nezuko'],
  },
  {
    id: 'ds-op3', anime: 'Demon Slayer', title: 'Kizuna no Kiseki', artist: 'MAN WITH A MISSION x milet', type: 'OP', episode: 'Opening 3',
    url: 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/ds-op3.mp4',
    difficulty: 'moyen', color: '#16a085', emoji: '🗡️',
    aliases: ['demon slayer', 'kimetsu no yaiba', 'kizuna no kiseki', 'tanjiro', 'mitsuri'],
  },
  {
    id: 'aot-op2', anime: 'Attack on Titan', title: 'Jiyuu no Tsubasa', artist: 'Linked Horizon', type: 'OP', episode: 'Opening 2',
    url: 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/aot-op2.mp4',
    difficulty: 'facile', color: '#7f8c8d', emoji: '🪽',
    aliases: ['attack on titan', 'shingeki no kyojin', 'snk', 'jiyuu no tsubasa', 'wings of freedom', 'eren'],
  },
  {
    id: 'aot-op6', anime: 'Attack on Titan', title: 'My War', artist: 'Shinsei Kamattechan', type: 'OP', episode: 'Opening 6',
    url: 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/aot-op6.mp4',
    difficulty: 'moyen', color: '#34495e', emoji: '🌍',
    aliases: ['attack on titan', 'shingeki no kyojin', 'snk', 'my war', 'boku no sensou', 'eren'],
  },
  {
    id: 'bleach-op1', anime: 'Bleach', title: 'Asterisk', artist: 'Orange Range', type: 'OP', episode: 'Opening 1',
    url: 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/bleach-op1.mp4',
    difficulty: 'facile', color: '#e67e22', emoji: '🗡️',
    aliases: ['bleach', 'asterisk', 'ichigo kurosaki', 'rukia', 'orange range'],
  },
  {
    id: 'bleach-op2', anime: 'Bleach', title: 'D-tecnoLife', artist: 'UVERworld', type: 'OP', episode: 'Opening 2',
    url: 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/bleach-op2.mp4',
    difficulty: 'moyen', color: '#3498db', emoji: '⚔️',
    aliases: ['bleach', 'd-tecnolife', 'uverworld', 'ichigo', 'soul society'],
  },
  {
    id: 'bleach-tybw-op', anime: 'Bleach', title: 'Scar', artist: 'Tatsuya Kitani', type: 'OP', episode: 'Opening 18',
    url: 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/bleach-tybw-op.mp4',
    difficulty: 'moyen', color: '#9b59b6', emoji: '🩸',
    aliases: ['bleach', 'tybw', 'thousand year blood war', 'scar', 'ichigo', 'yhwach'],
  },
  {
    id: 'naruto-op1', anime: 'Naruto', title: 'Rocks', artist: 'Hound Dog', type: 'OP', episode: 'Opening 1',
    url: 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/naruto-op1.mp4',
    difficulty: 'moyen', color: '#e67e22', emoji: '🍥',
    aliases: ['naruto', 'rocks', 'hound dog', 'naruto uzumaki', 'sasuke'],
  },
  {
    id: 'naruto-op3', anime: 'Naruto', title: 'Haruka Kanata', artist: 'Asian Kung-Fu Generation', type: 'OP', episode: 'Opening 3',
    url: 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/naruto-op3.mp4',
    difficulty: 'moyen', color: '#d35400', emoji: '🍥',
    aliases: ['naruto', 'haruka kanata', 'asian kung-fu generation', 'naruto uzumaki', 'rock lee'],
  },
  {
    id: 'ns-op1', anime: 'Naruto Shippuden', title: 'Hero\'s Come Back!!', artist: 'nobodyknows+', type: 'OP', episode: 'Opening 1',
    url: 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/ns-op1.mp4',
    difficulty: 'facile', color: '#e74c3c', emoji: '🍥',
    aliases: ['naruto shippuden', 'hero\'s come back', 'nobodyknows', 'naruto', 'sasuke'],
  },
  {
    id: 'ns-op6', anime: 'Naruto Shippuden', title: 'Sign', artist: 'Flow', type: 'OP', episode: 'Opening 6',
    url: 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/ns-op6.mp4',
    difficulty: 'moyen', color: '#c0392b', emoji: '🍥',
    aliases: ['naruto shippuden', 'sign', 'flow', 'pain arc', 'naruto'],
  },
  {
    id: 'ns-op8', anime: 'Naruto Shippuden', title: 'Diver', artist: 'Nico Touches the Walls', type: 'OP', episode: 'Opening 8',
    url: 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/ns-op8.mp4',
    difficulty: 'moyen', color: '#16a085', emoji: '🍥',
    aliases: ['naruto shippuden', 'diver', 'nico touches the walls', 'naruto', 'killer bee'],
  },
  {
    id: 'mha-op2', anime: 'My Hero Academia', title: 'Peace Sign', artist: 'Kenshi Yonezu', type: 'OP', episode: 'Opening 2',
    url: 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/mha-op2.mp4',
    difficulty: 'facile', color: '#27ae60', emoji: '✌️',
    aliases: ['my hero academia', 'boku no hero', 'mha', 'peace sign', 'kenshi yonezu', 'deku'],
  },
  {
    id: 'mha-op3', anime: 'My Hero Academia', title: 'Sora ni Utaeba', artist: 'amazarashi', type: 'OP', episode: 'Opening 3',
    url: 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/mha-op3.mp4',
    difficulty: 'moyen', color: '#2980b9', emoji: '💥',
    aliases: ['my hero academia', 'boku no hero', 'mha', 'sora ni utaeba', 'amazarashi', 'deku'],
  },
  {
    id: 'mha-op4', anime: 'My Hero Academia', title: 'Make My Story', artist: 'Lenny code fiction', type: 'OP', episode: 'Opening 4',
    url: 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/mha-op4.mp4',
    difficulty: 'moyen', color: '#e74c3c', emoji: '🦸',
    aliases: ['my hero academia', 'boku no hero', 'mha', 'make my story', 'deku', 'bakugo'],
  },
  {
    id: 'fireforce-op1', anime: 'Fire Force', title: 'Inferno', artist: 'Mrs. Green Apple', type: 'OP', episode: 'Opening 1',
    url: 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/fireforce-op1.mp4',
    difficulty: 'facile', color: '#e74c3c', emoji: '🔥',
    aliases: ['fire force', 'enen no shouboutai', 'inferno', 'mrs green apple', 'shinra'],
  },
  {
    id: 'fireforce-op2', anime: 'Fire Force', title: 'Mayday', artist: 'Coldrain', type: 'OP', episode: 'Opening (Saison 2)',
    url: 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/fireforce-op2.mp4',
    difficulty: 'moyen', color: '#d35400', emoji: '🔥',
    aliases: ['fire force', 'enen no shouboutai', 'mayday', 'coldrain', 'shinra'],
  },
  {
    id: 'haikyuu-op1', anime: 'Haikyuu!!', title: 'Imagination', artist: 'SPYAIR', type: 'OP', episode: 'Opening 1',
    url: 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/haikyuu-op1.mp4',
    difficulty: 'facile', color: '#e67e22', emoji: '🏐',
    aliases: ['haikyuu', 'haikyu', 'imagination', 'spyair', 'hinata', 'kageyama'],
  },
  {
    id: 'haikyuu-op3', anime: 'Haikyuu!!', title: 'Hikari Are', artist: 'Burnout Syndromes', type: 'OP', episode: 'Opening 3',
    url: 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/haikyuu-op3.mp4',
    difficulty: 'moyen', color: '#f39c12', emoji: '🏐',
    aliases: ['haikyuu', 'haikyu', 'hikari are', 'burnout syndromes', 'hinata', 'karasuno'],
  },
  {
    id: 'opm-op1', anime: 'One Punch Man', title: 'THE HERO!! Ikareru Kobushi ni Hi wo Tsukero', artist: 'JAM Project', type: 'OP', episode: 'Opening 1',
    url: 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/opm-op1.mp4',
    difficulty: 'facile', color: '#f1c40f', emoji: '👊',
    aliases: ['one punch man', 'opm', 'the hero', 'jam project', 'saitama', 'genos'],
  },
  {
    id: 'rezero-op1', anime: 'Re:Zero', title: 'Redo', artist: 'Konomi Suzuki', type: 'OP', episode: 'Opening 1',
    url: 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/rezero-op1.mp4',
    difficulty: 'moyen', color: '#3498db', emoji: '⏳',
    aliases: ['re:zero', 'rezero', 'redo', 'konomi suzuki', 'subaru', 'emilia', 'rem'],
  },
  {
    id: 'rezero-op2', anime: 'Re:Zero', title: 'Realize', artist: 'Konomi Suzuki', type: 'OP', episode: 'Opening 3',
    url: 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/rezero-op2.mp4',
    difficulty: 'moyen', color: '#9b59b6', emoji: '💙',
    aliases: ['re:zero', 'rezero', 'realize', 'konomi suzuki', 'subaru', 'rem', 'emilia'],
  },
  {
    id: 'konosuba-op1', anime: 'KonoSuba', title: 'Fantastic Dreamer', artist: 'Machico', type: 'OP', episode: 'Opening 1',
    url: 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/konosuba-op1.mp4',
    difficulty: 'moyen', color: '#e74c3c', emoji: '💥',
    aliases: ['konosuba', 'fantastic dreamer', 'machico', 'kazuma', 'aqua', 'megumin'],
  },
  {
    id: 'tensura-op1', anime: 'That Time I Got Reincarnated as a Slime', title: 'Nameless Story', artist: 'Takuma Terashima', type: 'OP', episode: 'Opening 1',
    url: 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/tensura-op1.mp4',
    difficulty: 'moyen', color: '#3498db', emoji: '💧',
    aliases: ['tensura', 'slime', 'that time i got reincarnated as a slime', 'nameless story', 'rimuru'],
  },
  {
    id: 'mushoku-op1', anime: 'Mushoku Tensei', title: 'Tabibito no Uta', artist: 'Yuiko Ohara', type: 'OP', episode: 'Opening 1',
    url: 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/mushoku-op1.mp4',
    difficulty: 'difficile', color: '#27ae60', emoji: '🗺️',
    aliases: ['mushoku tensei', 'jobless reincarnation', 'tabibito no uta', 'rudeus', 'roxy'],
  },
  {
    id: 'eightysix-op1', anime: '86 Eighty-Six', title: '3-pun 29-byou', artist: 'Hitorie', type: 'OP', episode: 'Opening 1',
    url: 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/eightysix-op1.mp4',
    difficulty: 'difficile', color: '#c0392b', emoji: '🤖',
    aliases: ['86', 'eighty-six', 'eighty six', '3-pun 29-byou', 'shin', 'lena', 'hitorie'],
  },
  {
    id: 'bebop-op1', anime: 'Cowboy Bebop', title: 'Tank!', artist: 'The Seatbelts', type: 'OP', episode: 'Opening 1',
    url: 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/bebop-op1.mp4',
    difficulty: 'moyen', color: '#2c3e50', emoji: '🎷',
    aliases: ['cowboy bebop', 'tank', 'the seatbelts', 'yoko kanno', 'spike spiegel'],
  },
  {
    id: 'champloo-op1', anime: 'Samurai Champloo', title: 'Battlecry', artist: 'Nujabes feat. Shing02', type: 'OP', episode: 'Opening 1',
    url: 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/champloo-op1.mp4',
    difficulty: 'difficile', color: '#8e44ad', emoji: '🎧',
    aliases: ['samurai champloo', 'battlecry', 'nujabes', 'shing02', 'mugen', 'jin'],
  },
  {
    id: 'bocchi-op1', anime: 'Bocchi the Rock!', title: 'Seishun Complex', artist: 'Kessoku Band', type: 'OP', episode: 'Opening 1',
    url: 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/bocchi-op1.mp4',
    difficulty: 'moyen', color: '#e84393', emoji: '🎸',
    aliases: ['bocchi the rock', 'bocchi', 'seishun complex', 'kessoku band', 'hitori gotoh'],
  },
  {
    id: 'lycoris-op1', anime: 'Lycoris Recoil', title: 'ALIVE', artist: 'ClariS', type: 'OP', episode: 'Opening 1',
    url: 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/lycoris-op1.mp4',
    difficulty: 'moyen', color: '#e74c3c', emoji: '🌸',
    aliases: ['lycoris recoil', 'alive', 'claris', 'chisato', 'takina'],
  },
  {
    id: 'kaiju-op1', anime: 'Kaiju No. 8', title: 'Abyss', artist: 'YUNGBLUD', type: 'OP', episode: 'Opening 1',
    url: 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/kaiju-op1.mp4',
    difficulty: 'facile', color: '#16a085', emoji: '👾',
    aliases: ['kaiju no 8', 'kaiju number 8', 'abyss', 'yungblud', 'kafka hibino'],
  },
  {
    id: 'dr-stone-op1', anime: 'Dr. Stone', title: 'Good Morning World!', artist: 'Burnout Syndromes', type: 'OP', episode: 'Opening 1',
    url: 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/dr-stone-op1.mp4',
    difficulty: 'facile', color: '#27ae60', emoji: '🧪',
    aliases: ['dr stone', 'doctor stone', 'good morning world', 'burnout syndromes', 'senku'],
  },
  {
    id: 'noragami-op1', anime: 'Noragami', title: 'Goya no Machiawase', artist: 'Hello Sleepwalkers', type: 'OP', episode: 'Opening 1',
    url: 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/noragami-op1.mp4',
    difficulty: 'moyen', color: '#3498db', emoji: '⛩️',
    aliases: ['noragami', 'goya no machiawase', 'hello sleepwalkers', 'yato', 'hiyori'],
  },
  {
    id: 'seraph-op1', anime: 'Seraph of the End', title: 'X.U.', artist: 'Hiroyuki Sawano feat. Gemie', type: 'OP', episode: 'Opening 1',
    url: 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/seraph-op1.mp4',
    difficulty: 'difficile', color: '#8e44ad', emoji: '🧛',
    aliases: ['seraph of the end', 'owari no seraph', 'x.u.', 'sawano', 'yuichiro', 'mikaela'],
  },
  {
    id: 'shieldhero-op1', anime: 'The Rising of the Shield Hero', title: 'RISE', artist: 'MADKID', type: 'OP', episode: 'Opening 1',
    url: 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/shieldhero-op1.mp4',
    difficulty: 'moyen', color: '#16a085', emoji: '🛡️',
    aliases: ['shield hero', 'rising of the shield hero', 'tate no yuusha', 'rise', 'madkid', 'naofumi'],
  },
  {
    id: 'goblinslayer-op1', anime: 'Goblin Slayer', title: 'Rightfully', artist: 'Mili', type: 'OP', episode: 'Opening 1',
    url: 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/goblinslayer-op1.mp4',
    difficulty: 'difficile', color: '#7f8c8d', emoji: '⚔️',
    aliases: ['goblin slayer', 'rightfully', 'mili', 'priestess', 'cow girl'],
  },
  {
    id: 'ansatsu-op1', anime: 'Assassination Classroom', title: 'Seishun Satsubatsu-ron', artist: '3-nen E-gumi Utatan', type: 'OP', episode: 'Opening 1',
    url: 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/ansatsu-op1.mp4',
    difficulty: 'moyen', color: '#f1c40f', emoji: '🐙',
    aliases: ['assassination classroom', 'ansatsu kyoushitsu', 'koro sensei', 'nagisa', 'seishun satsubatsu-ron'],
  },
  {
    id: 'toradora-op1', anime: 'Toradora!', title: 'Pre-Parade', artist: 'Rie Kugimiya, Yui Horie, Eri Kitamura', type: 'OP', episode: 'Opening 1',
    url: 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/toradora-op1.mp4',
    difficulty: 'moyen', color: '#e84393', emoji: '🐯',
    aliases: ['toradora', 'pre-parade', 'taiga aisaka', 'ryuuji', 'palmtop tiger'],
  },
  {
    id: 'angelbeats-op1', anime: 'Angel Beats!', title: 'My Soul, Your Beats!', artist: 'Lia', type: 'OP', episode: 'Opening 1',
    url: 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/angelbeats-op1.mp4',
    difficulty: 'moyen', color: '#3498db', emoji: '🪽',
    aliases: ['angel beats', 'my soul your beats', 'lia', 'otonashi', 'kanade', 'tenshi'],
  },
  {
    id: 'charlotte-op1', anime: 'Charlotte', title: 'Bravely You', artist: 'Lia', type: 'OP', episode: 'Opening 1',
    url: 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/charlotte-op1.mp4',
    difficulty: 'difficile', color: '#9b59b6', emoji: '✨',
    aliases: ['charlotte', 'bravely you', 'lia', 'yuu otosaka', 'nao tomori'],
  },
  {
    id: 'madeinabyss-op1', anime: 'Made in Abyss', title: 'Deep in Abyss', artist: 'Riko & Reg', type: 'OP', episode: 'Opening 1',
    url: 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/madeinabyss-op1.mp4',
    difficulty: 'difficile', color: '#d35400', emoji: '🕳️',
    aliases: ['made in abyss', 'deep in abyss', 'riko', 'reg', 'nanachi'],
  },
  {
    id: 'ousama-op1', anime: 'Ranking of Kings', title: 'Oz', artist: 'King Gnu', type: 'OP', episode: 'Opening 1',
    url: 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/ousama-op1.mp4',
    difficulty: 'moyen', color: '#f39c12', emoji: '👑',
    aliases: ['ranking of kings', 'ousama ranking', 'oz', 'king gnu', 'bojji', 'kage'],
  },
  {
    id: 'vinland-op2', anime: 'Vinland Saga', title: 'River', artist: 'Anonymouz', type: 'OP', episode: 'Opening 3',
    url: 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/vinland-op2.mp4',
    difficulty: 'moyen', color: '#34495e', emoji: '⚓',
    aliases: ['vinland saga', 'river', 'anonymouz', 'thorfinn', 'season 2'],
  },
  {
    id: 'aot-ed1', anime: 'Attack on Titan', title: 'Utsukushiki Zankoku na Sekai', artist: 'Yoko Hikasa', type: 'ED', episode: 'Ending 1',
    url: 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/aot-ed1.mp4',
    difficulty: 'moyen', color: '#8B1A1A', emoji: '⚔️',
    aliases: ['attack on titan', 'aot', 'shingeki no kyojin', 'snk', 'utsukushiki zankoku na sekai', 'eren', 'mikasa', 'levi', 'titans'],
  },
  {
    id: 'jjk-ed1', anime: 'Jujutsu Kaisen', title: 'LOST IN PARADISE', artist: 'ALI feat. AKLO', type: 'ED', episode: 'Ending 1',
    url: 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/jjk-ed1.mp4',
    difficulty: 'facile', color: '#5B2C6F', emoji: '👀',
    aliases: ['jujutsu kaisen', 'jjk', 'lost in paradise', 'ali', 'aklo', 'gojo', 'itadori', 'yuji', 'megumi', 'nobara'],
  },
  {
    id: 'jjk-ed2', anime: 'Jujutsu Kaisen', title: 'more than words', artist: 'Hitsujibungaku', type: 'ED', episode: 'Ending 2',
    url: 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/jjk-ed2.mp4',
    difficulty: 'moyen', color: '#6C3483', emoji: '💫',
    aliases: ['jujutsu kaisen', 'jjk', 'more than words', 'hitsujibungaku', 'shibuya', 'gojo', 'geto', 'nanami'],
  },
  {
    id: 'chainsaw-ed1', anime: 'Chainsaw Man', title: 'Chainsaw Blood', artist: 'Vaundy', type: 'ED', episode: 'Ending 1',
    url: 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/chainsaw-ed1.mp4',
    difficulty: 'facile', color: '#C0392B', emoji: '🪓',
    aliases: ['chainsaw man', 'csm', 'chainsaw blood', 'vaundy', 'denji', 'pochita', 'makima', 'power', 'aki'],
  },
  {
    id: 'chainsaw-ed2', anime: 'Chainsaw Man', title: 'Zanki', artist: 'Kanaria feat. Zutomayo', type: 'ED', episode: 'Ending 4',
    url: 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/chainsaw-ed2.mp4',
    difficulty: 'difficile', color: '#A93226', emoji: '🪚',
    aliases: ['chainsaw man', 'csm', 'zanki', 'zutomayo', 'kanaria', 'denji', 'power'],
  },
  {
    id: 'spyxfamily-ed1', anime: 'Spy x Family', title: 'Kigeki', artist: 'Gen Hoshino', type: 'ED', episode: 'Ending 1',
    url: 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/spyxfamily-ed1.mp4',
    difficulty: 'facile', color: '#2E86C1', emoji: '🕵️',
    aliases: ['spy x family', 'spy family', 'kigeki', 'gen hoshino', 'anya', 'loid', 'yor', 'forger', 'comedy'],
  },
  {
    id: 'oshinoko-ed1', anime: 'Oshi no Ko', title: 'Mephisto', artist: 'Queen Bee', type: 'ED', episode: 'Ending 1',
    url: 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/oshinoko-ed1.mp4',
    difficulty: 'moyen', color: '#E91E63', emoji: '⭐',
    aliases: ['oshi no ko', 'oshinoko', 'mephisto', 'queen bee', 'ziyoou-vachi', 'ai', 'aqua', 'ruby', 'idol'],
  },
  {
    id: 'frieren-ed1', anime: 'Frieren', title: 'Anytime Anywhere', artist: 'milet', type: 'ED', episode: 'Ending 1',
    url: 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/frieren-ed1.mp4',
    difficulty: 'moyen', color: '#48C9B0', emoji: '🧝‍♀️',
    aliases: ['frieren', 'sousou no frieren', 'beyond journey\'s end', 'anytime anywhere', 'milet', 'fern', 'stark', 'himmel'],
  },
  {
    id: 'mobpsycho-ed1', anime: 'Mob Psycho 100', title: 'Refrain Boy', artist: 'All Off', type: 'ED', episode: 'Ending 1',
    url: 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/mobpsycho-ed1.mp4',
    difficulty: 'moyen', color: '#1ABC9C', emoji: '💯',
    aliases: ['mob psycho 100', 'mob psycho', 'refrain boy', 'all off', 'mob', 'shigeo', 'reigen', 'dimple'],
  },
  {
    id: 'tokyoghoul-ed1', anime: 'Tokyo Ghoul', title: 'Seijatachi', artist: 'People In The Box', type: 'ED', episode: 'Ending 1',
    url: 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/tokyoghoul-ed1.mp4',
    difficulty: 'moyen', color: '#7B241C', emoji: '👹',
    aliases: ['tokyo ghoul', 'seijatachi', 'people in the box', 'kaneki', 'touka', 'ghoul', 'kagune'],
  },
  {
    id: 'deathnote-ed1', anime: 'Death Note', title: 'Zetsubou Billy', artist: 'Maximum the Hormone', type: 'ED', episode: 'Ending 2',
    url: 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/deathnote-ed1.mp4',
    difficulty: 'moyen', color: '#212121', emoji: '📓',
    aliases: ['death note', 'zetsubou billy', 'maximum the hormone', 'light', 'kira', 'l', 'ryuk', 'yagami'],
  },
  {
    id: 'steinsgate-ed1', anime: 'Steins;Gate', title: 'Toki Tsukasadoru Juuni no Meiyaku', artist: 'Yui Sakakibara', type: 'ED', episode: 'Ending 1',
    url: 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/steinsgate-ed1.mp4',
    difficulty: 'difficile', color: '#34495E', emoji: '⏳',
    aliases: ['steins gate', 'steinsgate', 'toki tsukasadoru', 'okabe', 'kurisu', 'mayuri', 'time travel', 'el psy congroo'],
  },
  {
    id: 'bebop-ed1', anime: 'Cowboy Bebop', title: 'The Real Folk Blues', artist: 'Mai Yamane', type: 'ED', episode: 'Ending 1',
    url: 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/bebop-ed1.mp4',
    difficulty: 'moyen', color: '#2C3E50', emoji: '🚀',
    aliases: ['cowboy bebop', 'bebop', 'the real folk blues', 'mai yamane', 'spike', 'jet', 'faye', 'yoko kanno'],
  },
  {
    id: 'anohana-ed1', anime: 'Anohana', title: 'Secret Base', artist: 'Ai Kayano, Haruka Tomatsu, Saori Hayami', type: 'ED', episode: 'Ending 1',
    url: 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/anohana-ed1.mp4',
    difficulty: 'moyen', color: '#EC7063', emoji: '🌸',
    aliases: ['anohana', 'the flower we saw that day', 'secret base', 'kimi ga kureta mono', 'menma', 'jinta', 'honma'],
  },
  {
    id: 'clannad-ed1', anime: 'Clannad', title: 'Dango Daikazoku', artist: 'Chata', type: 'ED', episode: 'Ending 1',
    url: 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/clannad-ed1.mp4',
    difficulty: 'moyen', color: '#F5B041', emoji: '🍡',
    aliases: ['clannad', 'dango daikazoku', 'dango family', 'chata', 'nagisa', 'tomoya', 'after story'],
  },
  {
    id: 'toradora-ed1', anime: 'Toradora!', title: 'Vanilla Salt', artist: 'Yui Horie', type: 'ED', episode: 'Ending 2',
    url: 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/toradora-ed1.mp4',
    difficulty: 'moyen', color: '#F1948A', emoji: '🐯',
    aliases: ['toradora', 'vanilla salt', 'yui horie', 'taiga', 'ryuuji', 'palmtop tiger'],
  },
  {
    id: 'madoka-ed1', anime: 'Madoka Magica', title: 'Magia', artist: 'Kalafina', type: 'ED', episode: 'Ending 1',
    url: 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/madoka-ed1.mp4',
    difficulty: 'moyen', color: '#D98880', emoji: '🤔',
    aliases: ['madoka magica', 'puella magi', 'mahou shoujo madoka', 'magia', 'kalafina', 'madoka', 'homura', 'kyubey'],
  },
  {
    id: 'konosuba-ed1', anime: 'KonoSuba', title: 'Chiisana Boukensha', artist: 'Sora Amamiya, Rie Takahashi, Ai Kayano', type: 'ED', episode: 'Ending 1',
    url: 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/konosuba-ed1.mp4',
    difficulty: 'moyen', color: '#5DADE2', emoji: '💥',
    aliases: ['konosuba', 'chiisana boukensha', 'kazuma', 'aqua', 'megumin', 'darkness', 'explosion'],
  },
  {
    id: 'bakemonogatari-ed1', anime: 'Bakemonogatari', title: 'Kimi no Shiranai Monogatari', artist: 'supercell', type: 'ED', episode: 'Ending 1',
    url: 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/bakemonogatari-ed1.mp4',
    difficulty: 'moyen', color: '#C39BD3', emoji: '🌠',
    aliases: ['bakemonogatari', 'monogatari', 'kimi no shiranai monogatari', 'supercell', 'araragi', 'senjougahara', 'hitagi'],
  },
  {
    id: 'erased-ed1', anime: 'Erased', title: 'Sore wa Chiisana Hikari no You na', artist: 'Sayuri', type: 'ED', episode: 'Ending 1',
    url: 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/erased-ed1.mp4',
    difficulty: 'difficile', color: '#5499C7', emoji: '🕒',
    aliases: ['erased', 'boku dake ga inai machi', 'sore wa chiisana hikari', 'sayuri', 'satoru', 'revival'],
  },
  {
    id: 'rezero-ed1', anime: 'Re:Zero', title: 'Styx Helix', artist: 'MYTH & ROID', type: 'ED', episode: 'Ending 1',
    url: 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/rezero-ed1.mp4',
    difficulty: 'moyen', color: '#7D3C98', emoji: '🕁️',
    aliases: ['re zero', 'rezero', 're:zero', 'styx helix', 'myth and roid', 'subaru', 'emilia', 'rem', 'ram'],
  },
  {
    id: 'gurrenlagann-ed1', anime: 'Gurren Lagann', title: 'Underground', artist: 'Shoko Nakagawa', type: 'ED', episode: 'Ending 1',
    url: 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/gurrenlagann-ed1.mp4',
    difficulty: 'difficile', color: '#E67E22', emoji: '🔩',
    aliases: ['gurren lagann', 'tengen toppa gurren lagann', 'ttgl', 'underground', 'simon', 'kamina', 'yoko'],
  },
  {
    id: 'blueexorcist-ed1', anime: 'Blue Exorcist', title: 'Take Off', artist: '2PM', type: 'ED', episode: 'Ending 1',
    url: 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/blueexorcist-ed1.mp4',
    difficulty: 'moyen', color: '#2980B9', emoji: '🔥',
    aliases: ['blue exorcist', 'ao no exorcist', 'take off', '2pm', 'rin', 'yukio', 'okumura'],
  },
  {
    id: 'noragami-ed1', anime: 'Noragami', title: 'Heart Realize', artist: 'Tia', type: 'ED', episode: 'Ending 1',
    url: 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/noragami-ed1.mp4',
    difficulty: 'moyen', color: '#1F618D', emoji: '⛩️',
    aliases: ['noragami', 'heart realize', 'tia', 'yato', 'hiyori', 'yukine', 'stray god'],
  },
  {
    id: 'owari-ed1', anime: 'Seraph of the End', title: 'scaPEGoat', artist: 'Hyde', type: 'ED', episode: 'Ending 1',
    url: 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/owari-ed1.mp4',
    difficulty: 'difficile', color: '#922B21', emoji: '🧛',
    aliases: ['seraph of the end', 'owari no seraph', 'scapegoat', 'hyde', 'yuichiro', 'mikaela', 'vampire'],
  },
  {
    id: 'drstone-ed1', anime: 'Dr. Stone', title: 'LIFE', artist: 'Rude-α', type: 'ED', episode: 'Ending 1',
    url: 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/drstone-ed1.mp4',
    difficulty: 'moyen', color: '#16A085', emoji: '🧪',
    aliases: ['dr stone', 'doctor stone', 'life', 'rude alpha', 'senku', 'taiju', 'chrome', 'science'],
  },
  {
    id: 'eighty-six-ed1', anime: '86 Eighty-Six', title: 'Avid', artist: 'Hitorie', type: 'ED', episode: 'Ending 1',
    url: 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/eighty-six-ed1.mp4',
    difficulty: 'difficile', color: '#5D6D7E', emoji: '⚔️',
    aliases: ['86', 'eighty six', '86 eighty-six', 'avid', 'hitorie', 'shin', 'lena', 'spearhead'],
  },
  {
    id: 'angelbeats-ed1', anime: 'Angel Beats!', title: 'Brave Song', artist: 'Aoi Tada', type: 'ED', episode: 'Ending 1',
    url: 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/angelbeats-ed1.mp4',
    difficulty: 'moyen', color: '#85C1E9', emoji: '📼',
    aliases: ['angel beats', 'brave song', 'aoi tada', 'otonashi', 'kanade', 'angel', 'yuri'],
  },
  {
    id: 'charlotte-ed1', anime: 'Charlotte', title: 'Yake Ochinai Tsubasa', artist: 'Aoi Tada', type: 'ED', episode: 'Ending 1',
    url: 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/charlotte-ed1.mp4',
    difficulty: 'difficile', color: '#AF7AC5', emoji: '🧠',
    aliases: ['charlotte', 'yake ochinai tsubasa', 'aoi tada', 'yuu', 'nao', 'otosaka', 'ability'],
  },
  {
    id: 'plasticmemories-ed1', anime: 'Plastic Memories', title: 'Asayake no Starmine', artist: 'Eri Sasaki', type: 'ED', episode: 'Ending 1',
    url: 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/plasticmemories-ed1.mp4',
    difficulty: 'difficile', color: '#F8C471', emoji: '🤖',
    aliases: ['plastic memories', 'asayake no starmine', 'eri sasaki', 'tsukasa', 'isla', 'giftia'],
  },
  {
    id: 'franxx-ed1', anime: 'Darling in the Franxx', title: 'Torikago', artist: 'XX:me', type: 'ED', episode: 'Ending 1',
    url: 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/franxx-ed1.mp4',
    difficulty: 'moyen', color: '#E74C3C', emoji: '🤖',
    aliases: ['darling in the franxx', 'franxx', 'ditf', 'torikago', 'xx:me', 'zero two', 'hiro', '002'],
  },
  {
    id: 'souleater-ed1', anime: 'Soul Eater', title: 'I Wanna Be', artist: 'Diggy-MO\'', type: 'ED', episode: 'Ending 1',
    url: 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/souleater-ed1.mp4',
    difficulty: 'moyen', color: '#212F3D', emoji: '💀',
    aliases: ['soul eater', 'i wanna be', 'diggy-mo', 'soul evans', 'maka', 'death the kid', 'black star'],
  },
  {
    id: 'opm-ed1', anime: 'One Punch Man', title: 'Hoshi yori Saki ni Mitsukete Ageru', artist: 'JAM Project', type: 'ED', episode: 'Ending 1',
    url: 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/opm-ed1.mp4',
    difficulty: 'moyen', color: '#F39C12', emoji: '👊',
    aliases: ['one punch man', 'opm', 'hoshi yori saki ni mitsukete ageru', 'jam project', 'saitama', 'genos'],
  },
  {
    id: 'yourlie-ed1', anime: 'Your Lie in April', title: 'Kirameki', artist: 'wacci', type: 'ED', episode: 'Ending 1',
    url: 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/yourlie-ed1.mp4',
    difficulty: 'moyen', color: '#85C1E9', emoji: '🎹',
    aliases: ['your lie in april', 'shigatsu wa kimi no uso', 'kirameki', 'wacci', 'kousei', 'kaori', 'piano'],
  },
  {
    id: 'fmab-ed2', anime: 'Fullmetal Alchemist Brotherhood', title: 'Hologram', artist: 'NICO Touches the Walls', type: 'ED', episode: 'Ending 2',
    url: 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/fmab-ed2.mp4',
    difficulty: 'moyen', color: '#B7950B', emoji: '⚗️',
    aliases: ['fullmetal alchemist', 'fmab', 'brotherhood', 'hologram', 'nico touches the walls', 'edward', 'alphonse', 'elric'],
  },
  {
    id: 'haikyuu-ed1', anime: 'Haikyuu!!', title: 'Tenchi Gaeshi', artist: 'NICO Touches the Walls', type: 'ED', episode: 'Ending 1',
    url: 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/haikyuu-ed1.mp4',
    difficulty: 'moyen', color: '#E67E22', emoji: '🏐',
    aliases: ['haikyuu', 'haikyu', 'tenchi gaeshi', 'nico touches the walls', 'hinata', 'kageyama', 'volleyball'],
  },
  {
    id: 'blacklagoon-ed1', anime: 'Black Lagoon', title: 'Don\'t Look Behind', artist: 'Edison', type: 'ED', episode: 'Ending 1',
    url: 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/blacklagoon-ed1.mp4',
    difficulty: 'difficile', color: '#34495E', emoji: '🔫',
    aliases: ['black lagoon', 'don\'t look behind', 'edison', 'revy', 'rock', 'dutch', 'lagoon company'],
  },
  {
    id: 'codegeass-ed1', anime: 'Code Geass', title: 'Mosaic Kakera', artist: 'SunSet Swish', type: 'ED', episode: 'Ending 1',
    url: 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/codegeass-ed1.mp4',
    difficulty: 'moyen', color: '#7D3C98', emoji: '👁️',
    aliases: ['code geass', 'mosaic kakera', 'sunset swish', 'lelouch', 'suzaku', 'c.c.', 'geass', 'zero'],
  },
  {
    id: 'fairytail-ed1', anime: 'Fairy Tail', title: 'Kanpekigu~no~ne', artist: 'Watarirouka Hashiritai', type: 'ED', episode: 'Ending 1',
    url: 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/fairytail-ed1.mp4',
    difficulty: 'difficile', color: '#E74C3C', emoji: '🧚',
    aliases: ['fairy tail', 'kanpekigunone', 'natsu', 'lucy', 'happy', 'erza', 'gray', 'guild'],
  },
  {
    id: 'psychopass-ed1', anime: 'Psycho-Pass', title: 'Namae no Nai Kaibutsu', artist: 'EGOIST', type: 'ED', episode: 'Ending 1',
    url: 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/psychopass-ed1.mp4',
    difficulty: 'difficile', color: '#283747', emoji: '🔫',
    aliases: ['psycho-pass', 'psycho pass', 'namae no nai kaibutsu', 'egoist', 'akane', 'kogami', 'makishima', 'dominator'],
  },
  {
    id: 'blackclover-ed1', anime: 'Black Clover', title: 'Aoi Honoo', artist: 'Itowokashi', type: 'ED', episode: 'Ending 1',
    url: 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/blackclover-ed1.mp4',
    difficulty: 'moyen', color: '#1F618D', emoji: '🍀',
    aliases: ['black clover', 'aoi honoo', 'itowokashi', 'asta', 'yuno', 'noelle', 'magic knights'],
  },
  {
    id: 'promised-ed2', anime: 'The Promised Neverland', title: 'Magic', artist: 'Myuk', type: 'ED', episode: 'Ending 2',
    url: 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/promised-ed2.mp4',
    difficulty: 'difficile', color: '#138D75', emoji: '🌱',
    aliases: ['the promised neverland', 'promised neverland', 'yakusoku no neverland', 'magic', 'myuk', 'emma', 'norman', 'ray'],
  },
  // ═══ OPENINGS ajoutés (lot bangers) — alimentent Blind Test ET Tournoi ═══
  {
    id: 'frieren-op1', anime: 'Frieren', title: 'Brave', artist: 'YOASOBI', type: 'OP', episode: 'Opening 1',
    url: 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/frieren-op1.mp4',
    difficulty: 'moyen', color: '#5fae9c', emoji: '🧝',
    aliases: ['frieren', 'frieren beyond journey\'s end', 'la fin du voyage', 'brave', 'yoasobi'],
  },
  {
    id: 'solo-leveling-op1', anime: 'Solo Leveling', title: 'LEveL', artist: 'SawanoHiroyuki[nZk]:ASCA', type: 'OP', episode: 'Opening 1',
    url: 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/solo-leveling-op1.mp4',
    difficulty: 'facile', color: '#3b82f6', emoji: '⚔️',
    aliases: ['solo leveling', 'level', 'sung jinwoo', 'jinwoo', 'sawano'],
  },
  {
    id: 'oshi-no-ko-op1', anime: 'Oshi no Ko', title: 'Idol', artist: 'YOASOBI', type: 'OP', episode: 'Opening 1',
    url: 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/oshi-no-ko-op1.mp4',
    difficulty: 'facile', color: '#e11d48', emoji: '⭐',
    aliases: ['oshi no ko', 'oshi', 'idol', 'yoasobi', 'my star'],
  },
  {
    id: 'ds-op1', anime: 'Demon Slayer', title: 'Gurenge', artist: 'LiSA', type: 'OP', episode: 'Opening 1',
    url: 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/ds-op1.mp4',
    difficulty: 'facile', color: '#1e9e7a', emoji: '🗡️',
    aliases: ['demon slayer', 'kimetsu no yaiba', 'gurenge', 'lisa', 'tanjiro'],
  },
  {
    id: 'mob-op1', anime: 'Mob Psycho 100', title: '99', artist: 'Mob Choir', type: 'OP', episode: 'Opening 1',
    url: 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/mob-op1.mp4',
    difficulty: 'moyen', color: '#14b8a6', emoji: '🌀',
    aliases: ['mob psycho', 'mob psycho 100', '99', 'mob choir', 'shigeo'],
  },
  {
    id: 'spy-op1', anime: 'Spy x Family', title: 'Mixed Nuts', artist: 'Official HIGE DANDism', type: 'OP', episode: 'Opening 1',
    url: 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/spy-op1.mp4',
    difficulty: 'facile', color: '#c026d3', emoji: '🕴️',
    aliases: ['spy x family', 'spy family', 'mixed nuts', 'official hige dandism', 'anya', 'forger'],
  },
  {
    id: 'bluelock-op1', anime: 'Blue Lock', title: 'Chaos ga Kiwamaru', artist: 'UNISON SQUARE GARDEN', type: 'OP', episode: 'Opening 1',
    url: 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/bluelock-op1.mp4',
    difficulty: 'moyen', color: '#2563eb', emoji: '⚽',
    aliases: ['blue lock', 'bluelock', 'chaos ga kiwamaru', 'isagi', 'unison square garden'],
  },
  {
    id: 'jjk-op2', anime: 'Jujutsu Kaisen', title: 'SPECIALZ', artist: 'King Gnu', type: 'OP', episode: 'Opening (Shibuya)',
    url: 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/jjk-op2.mp4',
    difficulty: 'facile', color: '#7c3aed', emoji: '👁️',
    aliases: ['jujutsu kaisen', 'jjk', 'specialz', 'king gnu', 'gojo', 'shibuya'],
  },
  {
    id: 'pokemon-fr-op1', anime: 'Pokémon', title: 'Générique français (Saison 1)', artist: 'Pokémon', type: 'OP', episode: 'Opening FR',
    url: 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/pokemon-fr-op1.mp4',
    difficulty: 'facile', color: '#f5b50a', emoji: '⚡',
    aliases: ['pokemon', 'pokémon', 'attrapez les tous', 'sacha', 'pikachu', 'generique pokemon'],
  },
  {
    id: 'dbs-op2', anime: 'Dragon Ball Super', title: 'Genkai Toppa × Survivor', artist: 'Kiyoshi Hikawa', type: 'OP', episode: 'Opening 2',
    url: 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/dbs-op2.mp4',
    difficulty: 'facile', color: '#f97316', emoji: '🐉',
    aliases: ['dragon ball super', 'dbs', 'dragon ball', 'genkai toppa', 'survivor', 'limit break', 'limit break x survivor', 'goku'],
  },
  // ═══ ENDINGS ═══
  {
    id: 'fz-ed1', anime: 'Fate/Zero', title: 'Memoria', artist: 'Kalafina', type: 'ED', episode: 'Ending 1',
    url: 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/fz-ed1.mp4',
    difficulty: 'difficile', color: '#3b2f6b', emoji: '🌙',
    aliases: ['fate zero', 'fate/zero', 'memoria', 'fate'],
  },
  {
    id: 'op-ed15', anime: 'One Piece', title: 'Dear friends', artist: 'TRIPLANE', type: 'ED', episode: 'Ending 15',
    url: 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/op-ed15.mp4',
    difficulty: 'difficile', color: '#d97706', emoji: '🏴‍☠️',
    aliases: ['one piece', 'dear friends', 'op'],
  },
  {
    id: 'bleach-ed12', anime: 'Bleach', title: 'Hitohira no Hanabira', artist: 'Stereopony', type: 'ED', episode: 'Ending',
    url: 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/bleach-ed12.mp4',
    difficulty: 'moyen', color: '#0e7490', emoji: '⚔️',
    aliases: ['bleach', 'hitohira no hanabira', 'stereopony'],
  },
  {
    id: 'bleach-ed5', anime: 'Bleach', title: 'Life', artist: 'YUI', type: 'ED', episode: 'Ending 5',
    url: 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/bleach-ed5.mp4',
    difficulty: 'moyen', color: '#0e7490', emoji: '⚔️',
    aliases: ['bleach', 'life', 'yui'],
  },
  {
    id: 'bleach-ed1', anime: 'Bleach', title: 'Life is Like a Boat', artist: 'Rie fu', type: 'ED', episode: 'Ending 1',
    url: 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/bleach-ed1.mp4',
    difficulty: 'facile', color: '#0e7490', emoji: '⚔️',
    aliases: ['bleach', 'life is like a boat', 'rie fu'],
  },
  {
    id: 'vinland-ed1', anime: 'Vinland Saga', title: 'Torches', artist: 'Aimer', type: 'ED', episode: 'Ending 1',
    url: 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/vinland-ed1.mp4',
    difficulty: 'moyen', color: '#1f6f54', emoji: '🪓',
    aliases: ['vinland saga', 'torches', 'aimer', 'vinland'],
  },
  {
    id: 'vinland-ed2', anime: 'Vinland Saga', title: 'Drown', artist: 'survive said the prophet', type: 'ED', episode: 'Ending 2',
    url: 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/vinland-ed2.mp4',
    difficulty: 'difficile', color: '#1f6f54', emoji: '🪓',
    aliases: ['vinland saga', 'drown', 'vinland'],
  },
  {
    id: 'dn-ed1', anime: 'Death Note', title: 'Alumina', artist: 'Nightmare', type: 'ED', episode: 'Ending 1',
    url: 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/dn-ed1.mp4',
    difficulty: 'moyen', color: '#0f172a', emoji: '📓',
    aliases: ['death note', 'alumina', 'nightmare'],
  },
  {
    id: 'ylia-ed2', anime: 'Your Lie in April', title: 'Orange', artist: '7!!', type: 'ED', episode: 'Ending 2',
    url: 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/ylia-ed2.mp4',
    difficulty: 'difficile', color: '#be4f8a', emoji: '🎹',
    aliases: ['your lie in april', 'orange', 'shigatsu wa kimi no uso', 'kimi no uso'],
  },
  {
    id: 'tr-ed1', anime: 'Tokyo Revengers', title: 'Koko de Iki o Shite', artist: 'eill', type: 'ED', episode: 'Ending 1',
    url: 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/tr-ed1.mp4',
    difficulty: 'difficile', color: '#6d28d9', emoji: '🕰️',
    aliases: ['tokyo revengers', 'koko de iki o shite', 'tokyo revenger'],
  },
  {
    id: 'fmab-ed1', anime: 'FMA: Brotherhood', title: 'Uso', artist: 'SID', type: 'ED', episode: 'Ending 1',
    url: 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/fmab-ed1.mp4',
    difficulty: 'moyen', color: '#b45309', emoji: '⚗️',
    aliases: ['fullmetal alchemist', 'fma', 'brotherhood', 'uso', 'fullmetal alchemist brotherhood'],
  },
  {
    id: 'hxh-ed2', anime: 'Hunter x Hunter 2011', title: 'HUNTING FOR YOUR DREAM', artist: 'Galneryus', type: 'ED', episode: 'Ending 2',
    url: 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/hxh-ed2.mp4',
    difficulty: 'difficile', color: '#065f46', emoji: '🗡️',
    aliases: ['hunter x hunter', 'hxh', 'hunting for your dream', 'hunter hunter'],
  },
  {
    id: 'hxh-ed5', anime: 'Hunter x Hunter 2011', title: 'Hyouriittai', artist: 'Yuzu', type: 'ED', episode: 'Ending 5',
    url: 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/hxh-ed5.mp4',
    difficulty: 'difficile', color: '#065f46', emoji: '🗡️',
    aliases: ['hunter x hunter', 'hxh', 'hyouriittai', 'hunter hunter'],
  },
  {
    id: 'mha-ed2', anime: 'My Hero Academia', title: 'Datte Atashi no Hero', artist: 'LiSA', type: 'ED', episode: 'Ending 2',
    url: 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/mha-ed2.mp4',
    difficulty: 'moyen', color: '#1e40af', emoji: '💥',
    aliases: ['my hero academia', 'mha', 'boku no hero', 'datte atashi no hero'],
  },
  {
    id: 'aot-ed7', anime: 'Attack on Titan', title: 'Akuma no Ko', artist: 'Ai Higuchi', type: 'ED', episode: 'Ending 7',
    url: 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/aot-ed7.mp4',
    difficulty: 'moyen', color: '#7f1d1d', emoji: '⚔️',
    aliases: ['attack on titan', 'snk', 'shingeki no kyojin', "l'attaque des titans", 'aot', 'akuma no ko'],
  },
  // ═══ OPENINGS ═══
  {
    id: 'aot-s2-op',
    anime:      'Attack on Titan S2',
    title:      'Shinzou wo Sasageyo!',
    artist:     'Linked Horizon',
    type:       'OP',
    episode:    'Opening (Saison 2)',
    url:        'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/aot-s2-op.mp4',
    difficulty: 'facile',
    color:      '#b91c1c',
    emoji:      '⚔️',
    aliases:    ['attack on titan', 'snk', 'shingeki no kyojin', "l'attaque des titans", 'aot', 'shinzou wo sasageyo'],
  },
  {
    id: 'aot-s3-op',
    anime:      'Attack on Titan S3',
    title:      'Red Swan',
    artist:     'YOSHIKI feat. HYDE',
    type:       'OP',
    episode:    'Opening (Saison 3)',
    url:        'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/aot-s3-op.mp4',
    difficulty: 'difficile',
    color:      '#7f1d1d',
    emoji:      '⚔️',
    aliases:    ['attack on titan', 'snk', 'shingeki no kyojin', "l'attaque des titans", 'aot', 'red swan'],
  },
  {
    id: 'overlord-op3',
    anime:      'Overlord III',
    title:      'VORACITY',
    artist:     'MYTH & ROID',
    type:       'OP',
    episode:    'Opening 3',
    url:        'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/overlord-op3.mp4',
    difficulty: 'difficile',
    color:      '#6d28d9',
    emoji:      '💀',
    aliases:    ['overlord', 'voracity', 'ainz', 'overlord 3'],
  },
  {
    id: 'nanatsu-op1',
    anime:      'Seven Deadly Sins',
    title:      'Netsujou no Spectrum',
    artist:     'Ikimonogakari',
    type:       'OP',
    episode:    'Opening 1',
    url:        'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/nanatsu-op1.mp4',
    difficulty: 'moyen',
    color:      '#d97706',
    emoji:      '🐗',
    aliases:    ['seven deadly sins', 'nanatsu no taizai', 'netsujou no spectrum', 'passionate spectrum', '7 deadly sins'],
  },
  {
    id: 'kanojo-op1',
    anime:      'Rent-a-Girlfriend',
    title:      'Centimeter',
    artist:     'the peggies',
    type:       'OP',
    episode:    'Opening 1',
    url:        'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/kanojo-op1.mp4',
    difficulty: 'difficile',
    color:      '#ec4899',
    emoji:      '💕',
    aliases:    ['rent a girlfriend', 'kanojo okarishimasu', 'kanokari', 'centimeter', 'rent-a-girlfriend'],
  },
  {
    id: 'fmab-op5',
    anime:      'FMA: Brotherhood',
    title:      'Rain',
    artist:     'SID',
    type:       'OP',
    episode:    'Opening 5',
    url:        'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/fmab-op5.mp4',
    difficulty: 'moyen',
    color:      '#b45309',
    emoji:      '⚗️',
    aliases:    ['fullmetal alchemist', 'fma', 'brotherhood', 'fullmetal alchemist brotherhood', 'rain'],
  },
  {
    id: 'ns-op3',
    anime:      'Naruto Shippuden',
    title:      'Blue Bird',
    artist:     'Ikimono-gakari',
    type:       'OP',
    episode:    'Opening 3',
    url:        'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/ns-op3.mp4',
    difficulty: 'facile',
    color:      '#1d4ed8',
    emoji:      '🍥',
    aliases:    ['naruto', 'naruto shippuden', 'blue bird', 'shippuden'],
  },
  {
    id: 'vivy-op1',
    anime:      'Vivy: Fluorite Eye\'s Song',
    title:      'Sing My Pleasure',
    artist:     'Vivy (CV: Rikako Aida)',
    type:       'OP',
    episode:    'Opening 1',
    url:        'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/vivy-op1.mp4',
    difficulty: 'difficile',
    color:      '#38bdf8',
    emoji:      '🎙️',
    aliases:    ['vivy', 'vivy fluorite eyes song', 'sing my pleasure', 'fluorite eye song'],
  },
  {
    id: 'bc-op1',
    anime:      'Black Clover',
    title:      'Haruka Mirai',
    artist:     'Vickeblanka',
    type:       'OP',
    episode:    'Opening 1',
    url:        'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/bc-op1.mp4',
    difficulty: 'facile',
    color:      '#22c55e',
    emoji:      '🍀',
    aliases:    ['black clover', 'haruka mirai', 'bc', 'asta'],
  },
  {
    id: 'op-op11',
    anime:      'One Piece',
    title:      'Share The World',
    artist:     'TVXQ',
    type:       'OP',
    episode:    'Opening 11',
    url:        'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/op-op11.mp4',
    difficulty: 'moyen',
    color:      '#d4a017',
    emoji:      '🏴‍☠️',
    aliases:    ['one piece', 'share the world', 'one piece op 11', 'op', 'mugiwara'],
  },
  {
    id: 'jojo-op2',
    anime:      "JoJo's Bizarre Adventure",
    title:      'Bloody Stream',
    artist:     'Coda',
    type:       'OP',
    episode:    'Opening 2',
    url:        'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/jojo-op2.mp4',
    difficulty: 'moyen',
    color:      '#a855f7',
    emoji:      '⭐',
    aliases:    ['jojo', 'jojos bizarre adventure', "jojo's bizarre adventure", 'bloody stream', 'battle tendency'],
  },
  {
    id: 'bc-op10',
    anime:      'Black Clover',
    title:      'Black Catcher',
    artist:     'Vickeblanka',
    type:       'OP',
    episode:    'Opening 10',
    url:        'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/bc-op10.mp4',
    difficulty: 'moyen',
    color:      '#16a34a',
    emoji:      '♣️',
    aliases:    ['black clover', 'black catcher', 'bc', 'vickeblanka', 'asta'],
  },
  {
    id: 'sao-op1',
    anime:      'Sword Art Online',
    title:      'Crossing Field',
    artist:     'LiSA',
    type:       'OP',
    episode:    'Opening 1',
    url:        'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/sao-op1.mp4',
    difficulty: 'facile',
    color:      '#2563eb',
    emoji:      '⚔️',
    aliases:    ['sword art online', 'sao', 'crossing field', 'kirito', 'asuna'],
  },
  {
    id: 'fmab-op1',
    anime:      'Fullmetal Alchemist: Brotherhood',
    title:      'Again',
    artist:     'YUI',
    type:       'OP',
    episode:    'Opening 1',
    url:        'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/fmab-op1.mp4',
    difficulty: 'moyen',
    color:      '#f97316',
    emoji:      '⚙️',
    aliases:    ['fullmetal alchemist', 'fullmetal alchemist brotherhood', 'fmab', 'again', 'yui'],
  },
  {
    id: 'dtb-op3',
    anime:      'Darker than Black',
    title:      'Tsukiakari no Michishirube',
    artist:     'Stereopony',
    type:       'OP',
    episode:    'Opening 3',
    url:        'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/dtb-op3.mp4',
    difficulty: 'difficile',
    color:      '#64748b',
    emoji:      '🌙',
    aliases:    ['darker than black', 'dtb', 'tsukiakari no michishirube', 'stereopony'],
  },
  {
    id: 'sg-op1',
    anime:      'Steins;Gate',
    title:      'Hacking to the Gate',
    artist:     'Kanako Itou',
    type:       'OP',
    episode:    'Opening 1',
    url:        'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/sg-op1.mp4',
    difficulty: 'moyen',
    color:      '#f97316',
    emoji:      '⏱️',
    aliases:    ['steins gate', 'steinsgate', 'sg', 'hacking to the gate', 'kanako ito', 'okabe'],
  },
  {
    id: 'vanitas-op2',
    anime:      'The Case Study of Vanitas',
    title:      'Sora to Utsuro',
    artist:     'Rémi (CV: Takuya Eguchi)',
    type:       'OP',
    episode:    'Opening 2',
    url:        'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/vanitas-op2.mp4',
    difficulty: 'difficile',
    color:      '#1e40af',
    emoji:      '🔵',
    aliases:    ['vanitas no carte', 'the case study of vanitas', 'vanitas', 'sora to utsuro', 'jun mamiya'],
  },
  {
    id: 'tg-op1',
    anime:      'Tokyo Ghoul',
    title:      'Unravel',
    artist:     'TK from Ling tosite sigure',
    type:       'OP',
    episode:    'Opening 1',
    url:        'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/tg-op1.mp4',
    difficulty: 'moyen',
    color:      '#8b1a1a',
    emoji:      '🩸',
    aliases:    ['tokyo ghoul', 'unravel', 'tk', 'tg'],
  },
  {
    id: 'cg-op1',
    anime:      'Code Geass',
    title:      'Colors',
    artist:     'FLOW',
    type:       'OP',
    episode:    'Opening 1',
    url:        'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/cg-op1.mp4',
    difficulty: 'moyen',
    color:      '#6c1f6c',
    emoji:      '⚡',
    aliases:    ['code geass', 'colors', 'cg', 'lelouch'],
  },
  {
    id: 'op-op15',
    anime:      'One Piece',
    title:      'We Go!',
    artist:     'Hiroshi Kitadani',
    type:       'OP',
    episode:    'Opening 15',
    url:        'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/op-op15.mp4',
    difficulty: 'facile',
    color:      '#d4a017',
    emoji:      '🏴‍☠️',
    aliases:    ['one piece', 'we go', 'one piece op 15', 'op', 'mugiwara'],
  },
  {
    id: 'ns-op16',
    anime:      'Naruto Shippuden',
    title:      'Silhouette',
    artist:     'KANA-BOON',
    type:       'OP',
    episode:    'Opening 16',
    url:        'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/ns-op16.mp4',
    difficulty: 'facile',
    color:      '#f59e0b',
    emoji:      '🍃',
    aliases:    ['naruto', 'naruto shippuden', 'silhouette', 'ns', 'shippuden'],
  },
  {
    id: 'tpn-op1',
    anime:      'The Promised Neverland',
    title:      'Touch Off',
    artist:     'UVERworld',
    type:       'OP',
    episode:    'Opening 1',
    url:        'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/tpn-op1.mp4',
    difficulty: 'difficile',
    color:      '#9b59b6',
    emoji:      '🔑',
    aliases:    ['the promised neverland', 'promised neverland', 'tpn', 'touch off', 'yakusoku no neverland'],
  },
  {
    id: 'aot-op5',
    anime:      'Attack on Titan',
    title:      'Shoukei to Shikabane no Michi',
    artist:     'Linked Horizon',
    type:       'OP',
    episode:    'Opening 5',
    url:        'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/aot-op5.mp4',
    difficulty: 'difficile',
    color:      '#a0522d',
    emoji:      '⚔️',
    aliases:    ['attack on titan', 'shingeki no kyojin', 'aot', 'snk', 'shoukei to shikabane no michi', 'linked horizon'],
  },
  {
    id: 'bc-op3',
    anime:      'Black Clover',
    title:      'Black Rover',
    artist:     'Vickeblanka',
    type:       'OP',
    episode:    'Opening 3',
    url:        'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/bc-op3.mp4',
    difficulty: 'moyen',
    color:      '#22c55e',
    emoji:      '🍀',
    aliases:    ['black clover', 'black rover', 'bc', 'asta', 'vickeblanka'],
  },
  {
    id: 'fsn-ubw-op2',
    anime:      'Fate/stay night: Unlimited Blade Works',
    title:      'Brave Shine',
    artist:     'Aimer',
    type:       'OP',
    episode:    'Opening 2',
    url:        'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/fsn-ubw-op2.mp4',
    difficulty: 'difficile',
    color:      '#c0a060',
    emoji:      '✨',
    aliases:    ['fate stay night', 'fate ubw', 'unlimited blade works', 'fsn', 'brave shine', 'aimer', 'emiya'],
  },
  {
    id: 'domestic-op1',
    anime:      'Domestic Girlfriend',
    title:      'Kawaki wo Ameku',
    artist:     'Minami',
    type:       'OP',
    episode:    'Opening 1',
    url:        'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/domestic-op1.mp4',
    difficulty: 'difficile',
    color:      '#e11d48',
    emoji:      '🌹',
    aliases:    ['domestic girlfriend', 'domestic na kanojo', 'kawaki wo ameku', 'minami'],
  },
  {
    id: 'ft-op2',
    anime:      'Fairy Tail',
    title:      'S.O.W. ~Sense of Wonder~',
    artist:     'No Regret Life',
    type:       'OP',
    episode:    'Opening 2',
    url:        'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/ft-op2.mp4',
    difficulty: 'difficile',
    color:      '#f59e0b',
    emoji:      '✨',
    aliases:    ['fairy tail', 'sense of wonder', 'sow', 'ft op 2', 'no regret life'],
  },
  {
    id: 'ft-op3',
    anime:      'Fairy Tail',
    title:      'Ft.',
    artist:     'Funkist',
    type:       'OP',
    episode:    'Opening 3',
    url:        'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/ft-op3.mp4',
    difficulty: 'moyen',
    color:      '#f59e0b',
    emoji:      '🔥',
    aliases:    ['fairy tail', 'ft', 'fairy tail op 3', 'funkist'],
  },
  {
    id: 'ft-op6',
    anime:      'Fairy Tail',
    title:      'Fiesta',
    artist:     "Lil'B",
    type:       'OP',
    episode:    'Opening 6',
    url:        'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/ft-op6.mp4',
    difficulty: 'difficile',
    color:      '#f59e0b',
    emoji:      '🎉',
    aliases:    ['fairy tail', 'fiesta', 'ft op 6', 'lil b'],
  },
  {
    id: 'ff-op3',
    anime:      'Fire Force',
    title:      'SPARK-AGAIN',
    artist:     'Aimer',
    type:       'OP',
    episode:    'Opening 3',
    url:        'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/ff-op3.mp4',
    difficulty: 'moyen',
    color:      '#ef4444',
    emoji:      '🔥',
    aliases:    ['fire force', 'enen no shouboutai', 'spark again', 'aimer', 'ff', 'shinra'],
  },
  {
    id: 'op-op5',
    anime:      'One Piece',
    title:      'Kokoro no Chizu',
    artist:     'BOYSTYLE',
    type:       'OP',
    episode:    'Opening 5',
    url:        'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/op-op5.mp4',
    difficulty: 'moyen',
    color:      '#d4a017',
    emoji:      '🗺️',
    aliases:    ['one piece', 'kokoro no chizu', 'op op 5', 'boystyle', 'map of the heart'],
  },
  {
    id: 'dn-op1',
    anime:      'Death Note',
    title:      'The World',
    artist:     'Nightmare',
    type:       'OP',
    episode:    'Opening 1',
    url:        'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/dn-op1.mp4',
    difficulty: 'facile',
    color:      '#1e1e2e',
    emoji:      '📓',
    aliases:    ['death note', 'the world', 'nightmare', 'light yagami', 'kira', 'dn'],
  },
  {
    id: 'dbk-op1',
    anime:      'Dragon Ball Kai',
    title:      'Dragon Soul',
    artist:     'Takayoshi Tanimoto',
    type:       'OP',
    episode:    'Opening 1',
    url:        'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/dbk-op1.mp4',
    difficulty: 'moyen',
    color:      '#f97316',
    emoji:      '🐉',
    aliases:    ['dragon ball kai', 'dragon ball z kai', 'dragon soul', 'dbk', 'goku'],
  },
  {
    id: 'dbz-op1',
    anime:      'Dragon Ball Z',
    title:      'CHA-LA HEAD-CHA-LA',
    artist:     'Hironobu Kageyama',
    type:       'OP',
    episode:    'Opening 1',
    url:        'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/dbz-op1.mp4',
    difficulty: 'facile',
    color:      '#f97316',
    emoji:      '⚡',
    aliases:    ['dragon ball z', 'dbz', 'cha la head cha la', 'chalala', 'kageyama', 'goku', 'dragon ball'],
  },
  {
    id: 'klk-op2',
    anime:      'Kill la Kill',
    title:      'ambiguous',
    artist:     'GARNiDELiA',
    type:       'OP',
    episode:    'Opening 2',
    url:        'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/klk-op2.mp4',
    difficulty: 'moyen',
    color:      '#dc2626',
    emoji:      '✂️',
    aliases:    ['kill la kill', 'ambiguous', 'klk', 'garnidelia', 'ryuko', 'senketsu'],
  },
  {
    id: 'agk-op2',
    anime:      'Akame ga Kill',
    title:      'Liar Mask',
    artist:     'Rika Mayama',
    type:       'OP',
    episode:    'Opening 2',
    url:        'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/agk-op2.mp4',
    difficulty: 'difficile',
    color:      '#7f1d1d',
    emoji:      '🗡️',
    aliases:    ['akame ga kill', 'liar mask', 'agk', 'rika mayama', 'akame', 'night raid'],
  },
  {
    id: 've-op1',
    anime:      'Violet Evergarden',
    title:      'Sincerely',
    artist:     'TRUE',
    type:       'OP',
    episode:    'Opening 1',
    url:        'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/ve-op1.mp4',
    gain:       1.4, // masterisé fort → on baisse sous le boost x2.2 par défaut (sortait trop fort dans le tournoi)
    difficulty: 'difficile',
    color:      '#7dd3fc',
    emoji:      '💌',
    aliases:    ['violet evergarden', 'sincerely', 've', 'true', 'auto memoir doll'],
  },
  {
    id: 'ylia-op1',
    anime:      'Your Lie in April',
    title:      'Hikaru Nara',
    artist:     'Goose house',
    type:       'OP',
    episode:    'Opening 1',
    url:        'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/ylia-op1.mp4',
    difficulty: 'moyen',
    color:      '#fbbf24',
    emoji:      '🎹',
    aliases:    ['your lie in april', 'shigatsu wa kimi no uso', 'hikaru nara', 'goose house', 'arima kousei', 'kaori'],
  },
  {
    id: 'hxh-op1',
    anime:      'Hunter x Hunter',
    title:      'Departure!',
    artist:     'Masatoshi Ono',
    type:       'OP',
    episode:    'Opening 1',
    url:        'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/hxh-op1.mp4',
    difficulty: 'facile',
    color:      '#84cc16',
    emoji:      '⚡',
    aliases:    ['hunter x hunter', 'hxh', 'departure', 'gon', 'killua', 'masatoshi ono'],
  },
  {
    id: 'amdb-op1',
    anime:      "The Ancient Magus' Bride",
    title:      'Here',
    artist:     'JUNNA',
    type:       'OP',
    episode:    'Opening 1',
    url:        'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/amdb-op1.mp4',
    difficulty: 'difficile',
    color:      '#6d28d9',
    emoji:      '🌿',
    aliases:    ['the ancient magus bride', 'mahoutsukai no yome', 'here', 'junna', 'chise', 'elias'],
  },
  {
    id: 'fz-op1',
    anime:      'Fate/Zero',
    title:      'oath sign',
    artist:     'LiSA',
    type:       'OP',
    episode:    'Opening 1',
    url:        'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/fz-op1.mp4',
    difficulty: 'difficile',
    color:      '#1d4ed8',
    emoji:      '⚔️',
    aliases:    ['fate zero', 'fate/zero', 'oath sign', 'lisa', 'kiritsugu', 'grail war'],
  },
  {
    id: 'bleach-op6',
    anime:      'Bleach',
    title:      'Alones',
    artist:     'Aqua Timez',
    type:       'OP',
    episode:    'Opening 6',
    url:        'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/bleach-op6.mp4',
    difficulty: 'moyen',
    color:      '#0284c7',
    emoji:      '⚔️',
    aliases:    ['bleach', 'alones', 'aqua timez', 'ichigo', 'soul society'],
  },
  {
    id: 'sao-wou-op2',
    anime:      'Sword Art Online: Alicization — War of Underworld',
    title:      'ANIMA',
    artist:     'ReoNa',
    type:       'OP',
    episode:    'Opening 2',
    url:        'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/sao-wou-op2.mp4',
    difficulty: 'difficile',
    color:      '#7c3aed',
    emoji:      '🌌',
    aliases:    ['sword art online', 'sao', 'alicization', 'war of underworld', 'anima', 'reona', 'kirito', 'alice'],
  },
  {
    id: 'parasyte-op1',
    anime:      'Parasyte: The Maxim',
    title:      'Let Me Hear',
    artist:     'Fear, and Loathing in Las Vegas',
    type:       'OP',
    episode:    'Opening 1',
    url:        'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/parasyte-op1.mp4',
    difficulty: 'moyen',
    color:      '#16a34a',
    emoji:      '🧬',
    aliases:    ['parasyte', 'kiseijuu', 'kiseiju', 'the maxim', 'let me hear', 'fear and loathing in las vegas'],
  },
  {
    id: 'vinland-op1',
    anime:      'Vinland Saga',
    title:      'MUKANJYO',
    artist:     'Survive Said The Prophet',
    type:       'OP',
    episode:    'Opening 1',
    url:        'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/vinland-op1.mp4',
    difficulty: 'moyen',
    color:      '#92400e',
    emoji:      '🛡️',
    aliases:    ['vinland saga', 'vinland', 'mukanjyo', 'survive said the prophet', 'thorfinn'],
  },
  {
    id: 'dandadan-op1',
    anime:      'Dandadan',
    title:      'Otonoke',
    artist:     'Creepy Nuts',
    type:       'OP',
    episode:    'Opening 1',
    url:        'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/dandadan-op1.mp4',
    difficulty: 'facile',
    color:      '#ec4899',
    emoji:      '👻',
    aliases:    ['dandadan', 'dan da dan', 'otonoke', 'creepy nuts', 'momo', 'okarun'],
  },
  {
    id: 'apothecary-op1',
    anime:      'The Apothecary Diaries',
    title:      'Hana ni Natte',
    artist:     'Ryokuoushoku Shakai',
    type:       'OP',
    episode:    'Opening 1',
    url:        'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/apothecary-op1.mp4',
    difficulty: 'moyen',
    color:      '#22c55e',
    emoji:      '🌿',
    aliases:    ['the apothecary diaries', 'apothecary diaries', 'kusuriya no hitorigoto', 'hana ni natte', 'maomao'],
  },
  {
    id: 'chainsaw-op1',
    anime:      'Chainsaw Man',
    title:      'KICK BACK',
    artist:     'Kenshi Yonezu',
    type:       'OP',
    episode:    'Opening 1',
    url:        'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/chainsaw-op1.mp4',
    difficulty: 'facile',
    color:      '#f97316',
    emoji:      '🪚',
    aliases:    ['chainsaw man', 'csm', 'kick back', 'kenshi yonezu', 'denji', 'makima', 'power'],
  },
  {
    id: 'kakegurui-op1',
    anime:      'Kakegurui',
    title:      'Deal with the Devil',
    artist:     'Tia',
    type:       'OP',
    episode:    'Opening 1',
    url:        'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/kakegurui-op1.mp4',
    difficulty: 'moyen',
    color:      '#dc2626',
    emoji:      '🎲',
    aliases:    ['kakegurui', 'deal with the devil', 'tia', 'yumeko', 'jabami'],
  },
  {
    id: 'aot-op7',
    anime:      'Attack on Titan',
    title:      'The Rumbling',
    artist:     'SiM',
    type:       'OP',
    episode:    'Opening 7',
    url:        'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/aot-op7.mp4',
    difficulty: 'facile',
    color:      '#78350f',
    emoji:      '🌊',
    aliases:    ['attack on titan', 'shingeki no kyojin', 'aot', 'snk', 'the rumbling', 'sim', 'eren'],
  },
  {
    id: 'mha-op6',
    anime:      'My Hero Academia',
    title:      'Polaris',
    artist:     'BLUE ENCOUNT',
    type:       'OP',
    episode:    'Opening 6',
    url:        'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/mha-op6.mp4',
    difficulty: 'moyen',
    color:      '#22c55e',
    emoji:      '💥',
    aliases:    ['my hero academia', 'boku no hero academia', 'mha', 'bnha', 'polaris', 'blue encount', 'deku'],
  },
  {
    id: 'mirai-nikki-op1',
    anime:      'Future Diary',
    title:      'Kuusou Mesorogiwi',
    artist:     'Yousei Teikoku',
    type:       'OP',
    episode:    'Opening 1',
    url:        'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/mirai-nikki-op1.mp4',
    difficulty: 'moyen',
    color:      '#be123c',
    emoji:      '📱',
    aliases:    ['future diary', 'mirai nikki', 'kuusou mesorogiwi', 'kuso mesorogiwi', 'yousei teikoku', 'yuno'],
  },
  {
    id: 'jjk-op1',
    anime:      'Jujutsu Kaisen',
    title:      'Kaikai Kitan',
    artist:     'Eve',
    type:       'OP',
    episode:    'Opening 1',
    url:        'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/jjk-op1.mp4',
    difficulty: 'facile',
    color:      '#7c3aed',
    emoji:      '🫸',
    aliases:    ['jujutsu kaisen', 'jjk', 'kaikai kitan', 'eve', 'itadori', 'gojo'],
  },
  {
    id: 'jojo-op10',
    anime:      "JoJo's Bizarre Adventure",
    title:      "Traitor's Requiem",
    artist:     'Daisuke Hasegawa',
    type:       'OP',
    episode:    'Opening 10',
    url:        'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/jojo-op10.mp4',
    difficulty: 'moyen',
    color:      '#f59e0b',
    emoji:      '🐞',
    aliases:    ['jojo', 'jojos bizarre adventure', "jojo's bizarre adventure", 'traitors requiem', "traitor's requiem", 'golden wind', 'vento aureo', 'giorno'],
  },
  {
    id: 'ns-op14',
    anime:      'Naruto Shippuden',
    title:      'Tsuki no Ookisa',
    artist:     'Nogizaka46',
    type:       'OP',
    episode:    'Opening 14',
    url:        'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/ns-op14.mp4',
    difficulty: 'moyen',
    color:      '#f97316',
    emoji:      '🌙',
    aliases:    ['naruto', 'naruto shippuden', 'tsuki no ookisa', 'tsuki no okisa', 'nogizaka46', 'shippuden'],
  },
  {
    id: 'kaguya-op1',
    anime:      'Kaguya-sama: Love is War',
    title:      'Love Dramatic',
    artist:     'Masayuki Suzuki feat. Rikka Ihara',
    type:       'OP',
    episode:    'Opening 1',
    url:        'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/kaguya-op1.mp4',
    difficulty: 'facile',
    color:      '#ec4899',
    emoji:      '💘',
    aliases:    ['kaguya sama', 'kaguya-sama love is war', 'love is war', 'love dramatic', 'masayuki suzuki', 'chika'],
  },
  {
    id: 'levius-op1',
    anime:      'Levius',
    title:      'Wit and Love',
    artist:     'Mystery Skulls',
    type:       'OP',
    episode:    'Opening 1',
    url:        'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/levius-op1.mp4',
    difficulty: 'difficile',
    color:      '#64748b',
    emoji:      '🥊',
    aliases:    ['levius', 'wit and love', 'mystery skulls'],
  },
  {
    id: 'carole-tuesday-op1',
    anime:      'Carole & Tuesday',
    title:      'Kiss Me',
    artist:     'Nai Br.XX & Celeina Ann',
    type:       'OP',
    episode:    'Opening 1',
    url:        'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/carole-tuesday-op1.mp4',
    difficulty: 'difficile',
    color:      '#06b6d4',
    emoji:      '🎸',
    aliases:    ['carole and tuesday', 'carole tuesday', 'kiss me', 'nai br xx', 'celeina ann'],
  },
  {
    id: 'ngnl-op1',
    anime:      'No Game No Life',
    title:      'This game',
    artist:     'Konomi Suzuki',
    type:       'OP',
    episode:    'Opening 1',
    url:        'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/ngnl-op1.mp4',
    difficulty: 'facile',
    color:      '#a855f7',
    emoji:      '♟️',
    aliases:    ['no game no life', 'ngnl', 'this game', 'konomi suzuki', 'sora', 'shiro'],
  },
  {
    id: 'op-op13',
    anime:      'One Piece',
    title:      'One Day',
    artist:     'The ROOTLESS',
    type:       'OP',
    episode:    'Opening 13',
    url:        'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/op-op13.mp4',
    difficulty: 'moyen',
    color:      '#d4a017',
    emoji:      '🏴‍☠️',
    aliases:    ['one piece', 'one day', 'the rootless', 'marineford', 'ace', 'luffy'],
  },
  {
    id: 'op-op14',
    anime:      'One Piece',
    title:      'Fight Together',
    artist:     'Namie Amuro',
    type:       'OP',
    episode:    'Opening 14',
    url:        'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/op-op14.mp4',
    difficulty: 'moyen',
    color:      '#d97706',
    emoji:      '🏴‍☠️',
    aliases:    ['one piece', 'fight together', 'namie amuro', 'one piece op 14', 'op op 14', 'mugiwara', 'luffy', 'fishman island'],
  },
  {
    id: 'op-op2',
    anime: 'One Piece', title: 'Believe', artist: 'Folder5', type: 'OP', episode: 'Opening 2',
    url: 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/op-op2.mp4',
    difficulty: 'moyen', color: '#d97706', emoji: '🏴‍☠️',
    aliases: ['one piece', 'believe', 'folder5', 'folder 5', 'one piece op 2', 'mugiwara', 'luffy'],
  },
  {
    id: 'op-op3',
    anime: 'One Piece', title: 'Hikari e', artist: 'The Babystars', type: 'OP', episode: 'Opening 3',
    url: 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/op-op3.mp4',
    difficulty: 'moyen', color: '#d97706', emoji: '🏴‍☠️',
    aliases: ['one piece', 'hikari e', 'hikari he', 'the babystars', 'one piece op 3', 'mugiwara', 'luffy'],
  },
  {
    id: 'op-op6',
    anime: 'One Piece', title: 'Brand New World', artist: 'D-51', type: 'OP', episode: 'Opening 6',
    url: 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/op-op6.mp4',
    difficulty: 'moyen', color: '#d97706', emoji: '🏴‍☠️',
    aliases: ['one piece', 'brand new world', 'd-51', 'd51', 'one piece op 6', 'mugiwara', 'luffy'],
  },
  {
    id: 'op-op8',
    anime: 'One Piece', title: 'Crazy Rainbow', artist: 'Tackey & Tsubasa', type: 'OP', episode: 'Opening 8',
    url: 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/op-op8.mp4',
    difficulty: 'moyen', color: '#d97706', emoji: '🏴‍☠️',
    aliases: ['one piece', 'crazy rainbow', 'tackey & tsubasa', 'tackey and tsubasa', 'one piece op 8', 'mugiwara', 'luffy'],
  },
  {
    id: 'op-op16',
    anime: 'One Piece', title: 'Hands Up!', artist: 'Kota Shinzato', type: 'OP', episode: 'Opening 16',
    url: 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/op-op16.mp4',
    difficulty: 'moyen', color: '#d97706', emoji: '🏴‍☠️',
    aliases: ['one piece', 'hands up', 'kota shinzato', 'one piece op 16', 'mugiwara', 'luffy'],
  },
  {
    id: 'op-op17',
    anime: 'One Piece', title: 'Wake up!', artist: 'AAA', type: 'OP', episode: 'Opening 17',
    url: 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/op-op17.mp4',
    difficulty: 'moyen', color: '#d97706', emoji: '🏴‍☠️',
    aliases: ['one piece', 'wake up', 'aaa', 'one piece op 17', 'mugiwara', 'luffy', 'dressrosa'],
  },
  {
    id: 'op-op20',
    anime: 'One Piece', title: 'Hope', artist: 'Namie Amuro', type: 'OP', episode: 'Opening 20',
    url: 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/op-op20.mp4',
    difficulty: 'moyen', color: '#d97706', emoji: '🏴‍☠️',
    aliases: ['one piece', 'hope', 'namie amuro', 'one piece op 20', 'mugiwara', 'luffy', 'whole cake'],
  },
  {
    id: 'op-op21',
    anime: 'One Piece', title: 'Super Powers', artist: 'V6', type: 'OP', episode: 'Opening 21',
    url: 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/op-op21.mp4',
    difficulty: 'moyen', color: '#d97706', emoji: '🏴‍☠️',
    aliases: ['one piece', 'super powers', 'v6', 'one piece op 21', 'mugiwara', 'luffy'],
  },
  {
    id: 'op-op25',
    anime: 'One Piece', title: 'The Peak (Saikō Tōtatsuten)', artist: 'SEKAI NO OWARI', type: 'OP', episode: 'Opening 25',
    url: 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/op-op25.mp4',
    difficulty: 'moyen', color: '#d97706', emoji: '🏴‍☠️',
    aliases: ['one piece', 'the peak', 'saikou toutatsuten', '最高到達点', 'sekai no owari', 'one piece op 25', 'egghead', 'mugiwara', 'luffy'],
  },
  {
    id: 'ns-op7',
    anime: 'Naruto Shippuden', title: 'Toumei Datta Sekai', artist: 'Motohiro Hata', type: 'OP', episode: 'Opening 7',
    url: 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/ns-op7.mp4',
    difficulty: 'moyen', color: '#ea580c', emoji: '🍥',
    aliases: ['naruto', 'naruto shippuden', 'toumei datta sekai', 'motohiro hata', 'naruto op 7', 'shippuden'],
  },
  {
    id: 'ns-op9',
    anime: 'Naruto Shippuden', title: 'Lovers', artist: '7!!', type: 'OP', episode: 'Opening 9',
    url: 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/ns-op9.mp4',
    difficulty: 'moyen', color: '#ea580c', emoji: '🍥',
    aliases: ['naruto', 'naruto shippuden', 'lovers', '7!!', 'nanae', 'naruto op 9', 'shippuden'],
  },
  {
    id: 'ns-op13',
    anime: 'Naruto Shippuden', title: 'Niwaka Ame ni mo Makezu', artist: 'NICO Touches the Walls', type: 'OP', episode: 'Opening 13',
    url: 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/ns-op13.mp4',
    difficulty: 'moyen', color: '#ea580c', emoji: '🍥',
    aliases: ['naruto', 'naruto shippuden', 'niwaka ame ni mo makezu', 'nico touches the walls', 'naruto op 13', 'shippuden'],
  },
  {
    id: 'bc-op2',
    anime: 'Black Clover', title: 'PAiNT it BLACK', artist: 'BiSH', type: 'OP', episode: 'Opening 2',
    url: 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/bc-op2.mp4',
    difficulty: 'moyen', color: '#16a34a', emoji: '🍀',
    aliases: ['black clover', 'paint it black', 'bish', 'black clover op 2', 'asta'],
  },
  {
    id: 'bc-op4',
    anime: 'Black Clover', title: 'Guess Who Is Back', artist: '', type: 'OP', episode: 'Opening 4',
    url: 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/bc-op4.mp4',
    difficulty: 'difficile', color: '#16a34a', emoji: '🍀',
    aliases: ['black clover', 'guess who is back', 'black clover op 4', 'asta'],
  },
  {
    id: 'bc-op7',
    anime: 'Black Clover', title: 'JUSTadICE', artist: 'Seishun Kaikagun', type: 'OP', episode: 'Opening 7',
    url: 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/bc-op7.mp4',
    difficulty: 'moyen', color: '#16a34a', emoji: '🍀',
    aliases: ['black clover', 'justadice', 'just a dice', 'seishun kaikagun', 'black clover op 7', 'asta'],
  },
  {
    id: 'bc-op8',
    anime: 'Black Clover', title: 'Sky and Blue', artist: '', type: 'OP', episode: 'Opening 8',
    url: 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/bc-op8.mp4',
    difficulty: 'difficile', color: '#16a34a', emoji: '🍀',
    aliases: ['black clover', 'sky and blue', 'sky & blue', 'black clover op 8', 'asta'],
  },
  {
    id: 'bleach-op3',
    anime: 'Bleach', title: 'Ichirin no Hana', artist: 'High and Mighty Color', type: 'OP', episode: 'Opening 3',
    url: 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/bleach-op3.mp4',
    difficulty: 'moyen', color: '#ea580c', emoji: '🗡️',
    aliases: ['bleach', 'ichirin no hana', 'high and mighty color', 'bleach op 3', 'ichigo'],
  },
  {
    id: 'bleach-op5',
    anime: 'Bleach', title: 'Rolling Star', artist: 'YUI', type: 'OP', episode: 'Opening 5',
    url: 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/bleach-op5.mp4',
    difficulty: 'facile', color: '#ea580c', emoji: '🗡️',
    aliases: ['bleach', 'rolling star', 'yui', 'bleach op 5', 'ichigo'],
  },
  {
    id: 'bleach-op10',
    anime: 'Bleach', title: 'Shojo S', artist: 'SCANDAL', type: 'OP', episode: 'Opening 10',
    url: 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/bleach-op10.mp4',
    difficulty: 'moyen', color: '#ea580c', emoji: '🗡️',
    aliases: ['bleach', 'shojo s', 'shoujo s', 'scandal', 'bleach op 10', 'ichigo'],
  },
  {
    id: 'ylia-op2',
    anime: 'Your Lie in April', title: 'Nanairo Symphony', artist: 'Coalamode', type: 'OP', episode: 'Opening 2',
    url: 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/ylia-op2.mp4',
    difficulty: 'difficile', color: '#f472b6', emoji: '🎹',
    aliases: ['your lie in april', 'shigatsu wa kimi no uso', 'nanairo symphony', 'coalamode', 'your lie in april op 2', 'kimi no uso'],
  },
  {
    id: 'mha-op1',
    anime: 'My Hero Academia', title: 'The Day', artist: 'Porno Graffitti', type: 'OP', episode: 'Opening 1',
    url: 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/mha-op1.mp4',
    difficulty: 'facile', color: '#22c55e', emoji: '💥',
    aliases: ['my hero academia', 'boku no hero academia', 'the day', 'porno graffitti', 'mha op 1', 'bnha', 'deku'],
  },
  {
    id: 'franxx-op1',
    anime: 'Darling in the Franxx', title: 'KISS OF DEATH', artist: 'Mika Nakashima × HYDE', type: 'OP', episode: 'Opening',
    url: 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/franxx-op1.mp4',
    difficulty: 'moyen', color: '#e11d48', emoji: '🤖',
    aliases: ['darling in the franxx', 'kiss of death', 'mika nakashima', 'hyde', 'franxx', 'zero two', '002'],
  },
  {
    id: 'fairytail-op15',
    anime: 'Fairy Tail', title: 'Masayume Chasing', artist: 'BoA', type: 'OP', episode: 'Opening 15',
    url: 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/fairytail-op15.mp4',
    difficulty: 'moyen', color: '#ef4444', emoji: '🧚',
    aliases: ['fairy tail', 'masayume chasing', 'boa', 'fairy tail op 15', 'natsu'],
  },
  {
    id: 'beastars-op1',
    anime:      'Beastars',
    title:      'Wild Side',
    artist:     'ALI',
    type:       'OP',
    episode:    'Opening 1',
    url:        'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/beastars-op1.mp4',
    difficulty: 'moyen',
    color:      '#b45309',
    emoji:      '🎭',
    aliases:    ['beastars', 'wild side', 'ali', 'legoshi', 'legosi'],
  },
  {
    id: 'aot-op1',
    anime:      'Attack on Titan',
    title:      'Guren no Yumiya',
    artist:     'Linked Horizon',
    type:       'OP',
    episode:    'Opening 1',
    url:        'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/aot-op1.mp4',
    difficulty: 'facile',
    color:      '#c62828',
    emoji:      '⚔️',
    aliases:    ['attack on titan', 'shingeki no kyojin', 'aot', 'snk', 'guren no yumiya', 'linked horizon', 'eren'],
  },
  {
    id: 'op-op9',
    anime:      'One Piece',
    title:      'Jungle P',
    artist:     '5050',
    type:       'OP',
    episode:    'Opening 9',
    url:        'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/op-op9.mp4',
    difficulty: 'difficile',
    color:      '#d4a017',
    emoji:      '🌴',
    aliases:    ['one piece', 'jungle p', 'op op 9', '5050', 'mugiwara', 'luffy'],
  },
  {
    id: 'bc-op5',
    anime:      'Black Clover',
    title:      'Gamushara',
    artist:     'sky-hi',
    type:       'OP',
    episode:    'Opening 5',
    url:        'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/bc-op5.mp4',
    difficulty: 'moyen',
    color:      '#16a34a',
    emoji:      '🍀',
    aliases:    ['black clover', 'gamushara', 'bc', 'asta', 'sky-hi', 'skyhi'],
  },
  {
    id: 'op-op4',
    anime:      'One Piece',
    title:      'Bon Voyage!',
    artist:     'Angela',
    type:       'OP',
    episode:    'Opening 4',
    url:        'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/op-op4.mp4',
    difficulty: 'moyen',
    color:      '#d4a017',
    emoji:      '⛵',
    aliases:    ['one piece', 'bon voyage', 'op op 4', 'angela', 'mugiwara', 'luffy'],
  },
  {
    id: 'nge-op1',
    anime:      'Neon Genesis Evangelion',
    title:      "A Cruel Angel's Thesis",
    artist:     'Yoko Takahashi',
    type:       'OP',
    episode:    'Opening 1',
    url:        'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/nge-op1.mp4',
    difficulty: 'facile',
    color:      '#7c3aed',
    emoji:      '🤖',
    aliases:    ['neon genesis evangelion', 'evangelion', 'eva', 'nge', 'a cruel angels thesis', 'cruel angel thesis', 'yoko takahashi', 'shinji'],
  },
  {
    id: 'dal-op1',
    anime:      'Date A Live',
    title:      'Date A Live',
    artist:     'sweet ARMS',
    type:       'OP',
    episode:    'Opening 1',
    url:        'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/dal-op1.mp4',
    difficulty: 'difficile',
    color:      '#e11d48',
    emoji:      '🌸',
    aliases:    ['date a live', 'deto a raibu', 'dal', 'sweet arms', 'shido', 'tohka', 'date a live op 1'],
  },
  {
    id: 'gintama-op17',
    anime:      'Gintama',
    title:      'Know Know Know',
    artist:     'Thinking Dogs',
    type:       'OP',
    episode:    'Opening 17',
    url:        'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/gintama-op17.mp4',
    difficulty: 'difficile',
    color:      '#0ea5e9',
    emoji:      '🎋',
    aliases:    ['gintama', 'gin tama', 'know know know', 'thinking dogs', 'gintoki', 'gintama op 17'],
  },
  {
    id: 'dr-stone-op3',
    anime:      'Dr. Stone',
    title:      'Rakuen',
    artist:     'Fujifabric',
    type:       'OP',
    episode:    'Opening 3',
    url:        'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/dr-stone-op3.mp4',
    difficulty: 'moyen',
    color:      '#84cc16',
    emoji:      '🧪',
    aliases:    ['dr stone', 'doctor stone', 'rakuen', 'fujifabric', 'senku', 'dr stone op 3', 'ishigami'],
  },
  {
    id: 'boruto-op8',
    anime:      'Boruto: Naruto Next Generations',
    title:      'BAKU',
    artist:     'Ikimonogakari',
    type:       'OP',
    episode:    'Opening 8',
    url:        'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/boruto-op8.mp4',
    difficulty: 'moyen',
    color:      '#3b82f6',
    emoji:      '🌀',
    aliases:    ['boruto', 'boruto naruto next generations', 'baku', 'ikimonogakari', 'boruto op 8', 'naruto next generations'],
  },

  // ═══ ENDINGS — batch 2 (ajout Freydiss) ═══
  { id:'another-ed1', anime:'Another', title:'Anamnesis', artist:'Annabel', type:'ED', episode:'Ending', url:'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/another-ed1.mp4', difficulty:'difficile', color:'#5b3a4a', emoji:'🩸', aliases:['another'] },
  { id:'carole-ed2', anime:'Carole & Tuesday', title:'Not Afraid', artist:'Lauren Dyson', type:'ED', episode:'Ending 2', url:'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/carole-ed2.mp4', difficulty:'difficile', color:'#e8a33d', emoji:'🎤', aliases:['carole and tuesday','carole & tuesday','carole tuesday'] },
  { id:'arslan-ed1', anime:'The Heroic Legend of Arslan', title:'Lapis Lazuli', artist:'Eir Aoi', type:'ED', episode:'Ending 1', url:'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/arslan-ed1.mp4', difficulty:'difficile', color:'#2e5a8a', emoji:'⚔️', aliases:['arslan senki','the heroic legend of arslan','arslan'] },
  { id:'magi-ed1', anime:'Magi: The Labyrinth of Magic', title:'Yubikiri', artist:'NICO Touches the Walls', type:'ED', episode:'Ending 1', url:'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/magi-ed1.mp4', difficulty:'difficile', color:'#c8a44d', emoji:'🪔', aliases:['magi','magi labyrinth of magic','magi the labyrinth of magic'] },
  { id:'sao-wou-ed1', anime:'Sword Art Online: Alicization WoU', title:'Unlasting', artist:'LiSA', type:'ED', episode:'Ending', url:'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/sao-wou-ed1.mp4', difficulty:'moyen', color:'#1d4ed8', emoji:'⚔️', aliases:['sao','sword art online','alicization','war of underworld'] },
  { id:'ds-ed1', anime:'Demon Slayer', title:'from the edge', artist:'FictionJunction feat. LiSA', type:'ED', episode:'Ending 1', url:'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/ds-ed1.mp4', difficulty:'facile', color:'#dc2626', emoji:'🔥', aliases:['demon slayer','kimetsu no yaiba','kimetsu'] },
  { id:'tpn-ed1', anime:'The Promised Neverland', title:'Zettai Zetsumei', artist:'Cö shu Nie', type:'ED', episode:'Ending 1', url:'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/tpn-ed1.mp4', difficulty:'moyen', color:'#15803d', emoji:'🌿', aliases:['the promised neverland','promised neverland','yakusoku no neverland','tpn'] },
  { id:'champloo-ed1', anime:'Samurai Champloo', title:'Shiki no Uta', artist:'MINMI', type:'ED', episode:'Ending', url:'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/champloo-ed1.mp4', difficulty:'difficile', color:'#6b8e23', emoji:'🎐', aliases:['samurai champloo','champloo'] },
  { id:'ds-ed2', anime:'Demon Slayer', title:'Shirogane', artist:'LiSA', type:'ED', episode:'Ending 2', url:'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/ds-ed2.mp4', difficulty:'moyen', color:'#b91c1c', emoji:'❄️', aliases:['demon slayer','kimetsu no yaiba','kimetsu'] },
  { id:'ds-tanjiro', anime:'Demon Slayer', title:'Kamado Tanjiro no Uta', artist:'Go Shiina', type:'ED', episode:'Ending (ép. 19)', url:'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/ds-tanjiro.mp4', difficulty:'moyen', color:'#dc2626', emoji:'🎶', aliases:['demon slayer','kimetsu no yaiba','kimetsu','kamado tanjiro no uta'] },
  { id:'eva-ed1', anime:'Neon Genesis Evangelion', title:'Fly Me to the Moon', artist:'Claire', type:'ED', episode:'Ending', url:'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/eva-ed1.mp4', difficulty:'facile', color:'#7c3aed', emoji:'🌙', aliases:['evangelion','neon genesis evangelion','nge','eva'] },
  { id:'gto-ed1', anime:'GTO: Great Teacher Onizuka', title:'Last Piece', artist:'Hitomi Takahashi', type:'ED', episode:'Ending 1', url:'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/gto-ed1.mp4', difficulty:'difficile', color:'#b45309', emoji:'🏍️', aliases:['gto','great teacher onizuka','onizuka'] },
  { id:'ippo-ed1', anime:'Hajime no Ippo', title:'Ending 1', artist:'', type:'ED', episode:'Ending 1', url:'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/ippo-ed1.mp4', difficulty:'difficile', color:'#d97706', emoji:'🥊', aliases:['hajime no ippo','ippo'] },
  { id:'akame-ed2', anime:'Akame ga Kill!', title:'Tsuki Akari', artist:'Sora Amamiya', type:'ED', episode:'Ending 2', url:'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/akame-ed2.mp4', difficulty:'difficile', color:'#991b1b', emoji:'🌙', aliases:['akame ga kill','akame'] },
  { id:'gto-ed2', anime:'GTO: Great Teacher Onizuka', title:'Shizuku', artist:'', type:'ED', episode:'Ending 2', url:'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/gto-ed2.mp4', difficulty:'difficile', color:'#b45309', emoji:'🏍️', aliases:['gto','great teacher onizuka','onizuka'] },
  { id:'beastars-ed-s2', anime:'Beastars', title:'Yasashii Suisei', artist:'YOASOBI', type:'ED', episode:'Ending (S2)', url:'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/beastars-ed-s2.mp4', difficulty:'moyen', color:'#5b21b6', emoji:'🐺', aliases:['beastars','yasashii suisei','yoasobi'] },
  { id:'3gatsu-ed2', anime:'March Comes in Like a Lion', title:'Ending 2', artist:'', type:'ED', episode:'Ending 2', url:'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/3gatsu-ed2.mp4', difficulty:'difficile', color:'#0369a1', emoji:'♟️', aliases:['march comes in like a lion','3-gatsu no lion','sangatsu no lion','3 gatsu no lion'] },
  { id:'naruto-ed1', anime:'Naruto', title:'Wind', artist:'Akeboshi', type:'ED', episode:'Ending 1', url:'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/naruto-ed1.mp4', difficulty:'facile', color:'#d97706', emoji:'🍃', aliases:['naruto','wind'] },
  { id:'narutos-ed1', anime:'Naruto Shippuden', title:'Hotaru no Hikari (Shooting Star)', artist:'Ikimono-gakari', type:'ED', episode:'Ending 1', url:'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/narutos-ed1.mp4', difficulty:'moyen', color:'#b45309', emoji:'⭐', aliases:['naruto shippuden','shippuden','shooting star','hotaru no hikari'] },
  { id:'koiame-ed1', anime:'After the Rain', title:'Ref:rain', artist:'Aimer', type:'ED', episode:'Ending', url:'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/koiame-ed1.mp4', difficulty:'difficile', color:'#4a6b8a', emoji:'🌧️', aliases:['after the rain','koi wa ameagari no you ni','koi wa ameagari','refrain','ref rain'] },
  { id:'mugen-ed1', anime:'Demon Slayer: Mugen Train', title:'Homura', artist:'LiSA', type:'ED', episode:'Thème (film)', url:'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/mugen-ed1.mp4', difficulty:'facile', color:'#dc2626', emoji:'🔥', aliases:['demon slayer','kimetsu no yaiba','mugen train','le train de l\'infini','homura'] },
  { id:'violet-ed1', anime:'Violet Evergarden', title:'Michishirube', artist:'Minori Chihara', type:'ED', episode:'Ending', url:'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/violet-ed1.mp4', difficulty:'moyen', color:'#1e3a5f', emoji:'✉️', gain:2.5, aliases:['violet evergarden','michishirube'] },
  { id:'dear-sunrise', anime:'One Piece', title:'Dear Sunrise', artist:'', type:'ED', episode:'Ending 20', url:'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev/blind-test/dear-sunrise.mp4', difficulty:'moyen', color:'#d97706', emoji:'🌅', aliases:['one piece','dear sunrise','op'] },
]

// ── Answer matching ────────────────────────────────────────────────────────
function normalize(s) {
  return (s || '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function animeFamilyKey(anime) {
  const value = normalize(anime)
  if (!value) return ''
  if (value.startsWith('sword art online')) return 'sword art online'
  if (value.startsWith('dragon ball')) return 'dragon ball'
  if (value.startsWith('fate')) return 'fate'
  if (value.startsWith('naruto')) return 'naruto'
  if (value.startsWith('attack on titan') || value.startsWith('shingeki no kyojin')) return 'attack on titan'
  if (value.startsWith('fullmetal alchemist')) return 'fullmetal alchemist'
  if (value.startsWith('jojo')) return 'jojo'
  if (value.startsWith('my hero academia') || value.startsWith('boku no hero academia')) return 'my hero academia'
  if (value.startsWith('jujutsu kaisen')) return 'jujutsu kaisen'
  if (value.startsWith('one piece')) return 'one piece'
  if (value.startsWith('kaguya')) return 'kaguya sama'
  return value
}

function matchesAnime(guess, track) {
  const g = normalize(guess)
  if (!g) return false
  const targets = [track.anime, ...track.aliases].map(normalize)
  return targets.some(t => t.includes(g) || g.includes(t))
}

function matchesTitle(guess, track) {
  const g = normalize(guess)
  if (!g) return false
  const targets = [track.title, ...track.aliases].map(normalize)
  return targets.some(t => t.includes(g) || g.includes(t))
}

export function checkAnswer(animeGuess, titleGuess, track) {
  const animeOk = matchesAnime(animeGuess, track)
  const titleOk = matchesTitle(titleGuess, track)
  return { animeOk, titleOk, perfect: animeOk && titleOk }
}

// ── Berry calculation ──────────────────────────────────────────────────────
export function calcBerries({ animeOk, titleOk, timeMs, streak }) {
  if (!animeOk && !titleOk) return 0
  let base = 0
  if (animeOk && titleOk) base = 100
  else if (animeOk)        base = 50
  else if (titleOk)        base = 30

  // Speed bonus (based on seconds elapsed)
  const secs = timeMs / 1000
  const speedMult = secs < 5 ? 2.0 : secs < 10 ? 1.5 : secs < 20 ? 1.2 : 1.0

  // Streak bonus
  const streakMult = streak >= 5 ? 1.5 : streak >= 3 ? 1.2 : 1.0

  // Difficulty
  return Math.round(base * speedMult * streakMult * 1000) // convert to berries scale
}

// ── Pick random track ────────────────────────────────────────────────────
// options.type : 'OP' (openings), 'ED' (endings) ou 'all'/undefined (mélangé).
export function pickTrack(excludeIds = [], options = {}) {
  const excluded = new Set(Array.isArray(excludeIds) ? excludeIds : [excludeIds])
  const excludedAnime = new Set(
    (options.excludeAnime || [])
      .map(anime => animeFamilyKey(anime))
      .filter(Boolean)
  )
  const type = options.type && options.type !== 'all' ? options.type : null
  const byType = t => !type || t.type === type
  let pool = LOCAL_TRACKS.filter(t => byType(t) && !excluded.has(t.id) && !excludedAnime.has(animeFamilyKey(t.anime)))
  if (pool.length === 0) pool = LOCAL_TRACKS.filter(t => byType(t) && !excluded.has(t.id))
  if (pool.length === 0) pool = LOCAL_TRACKS.filter(byType)  // tous joués → reset (en gardant le type)
  if (pool.length === 0) pool = LOCAL_TRACKS
  return pool[Math.floor(Math.random() * pool.length)]
}

// Compte de pistes par type — pratique pour l'UI (afficher le nb d'OP / ED).
export function countTracksByType() {
  return LOCAL_TRACKS.reduce((acc, t) => {
    acc[t.type] = (acc[t.type] || 0) + 1
    return acc
  }, {})
}

export function getTrackById(trackId) {
  return LOCAL_TRACKS.find(t => t.id === trackId) || null
}

export function isBlindTestGuestId(userId) {
  return String(userId || '').startsWith('guest_')
}

export function isLegacySupabaseAuthId(userId) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(userId || ''))
}

export function getBlindTestProfileId(userId) {
  const id = String(userId || '')
  if (!id || isBlindTestGuestId(id) || isLegacySupabaseAuthId(id)) return null
  return id
}

function makeRoomCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 6 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('')
}

export async function createBlindTestRoom({ hostUserId, displayName, avatarUrl, difficultyId = 'easy' }) {
  if (!supabase) throw new Error('Supabase non initialise.')

  let lastError = null
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = makeRoomCode()
    const { error } = await supabase.from('blind_test_rooms').insert({
      code,
      host_user_id: String(hostUserId),
      status: 'waiting',
      difficulty_id: difficultyId,
      round: 0,
    })
    if (!error) {
      await joinBlindTestRoom({ code, userId: hostUserId, displayName, avatarUrl })
      return code
    }
    lastError = error
    if (!String(error.message || '').toLowerCase().includes('duplicate')) break
  }
  throw lastError || new Error('Impossible de creer la room.')
}

export async function fetchBlindTestRoom(code) {
  if (!supabase || !code) return null
  const { data, error } = await supabase
    .from('blind_test_rooms')
    .select('*')
    .eq('code', code.toUpperCase())
    .maybeSingle()
  if (error) return null
  return data
}

export async function joinBlindTestRoom({ code, userId, displayName, avatarUrl }) {
  if (!supabase || !code || !userId) return null
  const { data, error } = await supabase
    .from('blind_test_room_players')
    .upsert({
      room_code: code.toUpperCase(),
      user_id: userId,
      display_name: displayName || 'Pirate',
      avatar_url: avatarUrl || null,
      last_seen: new Date().toISOString(),
    }, { onConflict: 'room_code,user_id' })
    .select('*')
    .single()
  if (error) throw error
  return data
}

export async function fetchBlindTestRoomPlayers(code) {
  if (!supabase || !code) return []
  const { data, error } = await supabase
    .from('blind_test_room_players')
    .select('*')
    .eq('room_code', code.toUpperCase())
    .order('score', { ascending: false })
    .order('joined_at', { ascending: true })
  if (error) return []
  return data || []
}

export async function fetchBlindTestRoomAnswers(code, round) {
  if (!supabase || !code || !round) return []
  const { data, error } = await supabase
    .from('blind_test_room_answers')
    .select('*')
    .eq('room_code', code.toUpperCase())
    .eq('round', round)
  if (error) return []
  return data || []
}

export async function fetchBlindTestRoomPlayedTrackIds(code) {
  if (!supabase || !code) return []
  const { data, error } = await supabase
    .from('blind_test_room_answers')
    .select('track_id')
    .eq('room_code', code.toUpperCase())
    .not('track_id', 'is', null)
  if (error) return []
  return [...new Set((data || []).map(row => row.track_id).filter(Boolean))]
}

export async function updateBlindTestRoom(code, patch) {
  if (!supabase || !code) return null
  const { data, error } = await supabase
    .from('blind_test_rooms')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('code', code.toUpperCase())
    .select('*')
    .single()
  if (error) throw error
  return data
}

export async function submitBlindTestRoomAnswer({ code, userId, round, track, animeGuess, titleGuess, timeMs, streak }) {
  if (!supabase || !code || !userId || !track || !round) return null
  const result = checkAnswer(animeGuess, titleGuess, track)
  const earned = calcBerries({ animeOk: result.animeOk, titleOk: result.titleOk, timeMs, streak })

  const { data, error } = await supabase
    .from('blind_test_room_answers')
    .upsert({
      room_code: code.toUpperCase(),
      user_id: userId,
      round,
      track_id: track.id,
      anime_guess: animeGuess || '',
      title_guess: titleGuess || '',
      anime_ok: result.animeOk,
      title_ok: result.titleOk,
      earned,
      time_ms: Math.max(0, Math.round(timeMs)),
    }, { onConflict: 'room_code,user_id,round' })
    .select('*')
    .single()
  if (error) throw error

  const { data: player } = await supabase
    .from('blind_test_room_players')
    .select('score, streak')
    .eq('room_code', code.toUpperCase())
    .eq('user_id', userId)
    .single()

  const correct = result.animeOk || result.titleOk
  await supabase
    .from('blind_test_room_players')
    .update({
      score: (player?.score || 0) + earned,
      streak: correct ? (player?.streak || 0) + 1 : 0,
      last_seen: new Date().toISOString(),
    })
    .eq('room_code', code.toUpperCase())
    .eq('user_id', userId)

  return data
}

// ── Supabase score persistence ─────────────────────────────────────────────
export async function fetchBlindTestLeaderboard(limit = 20) {
  // REST direct (PAS le client supabase-js) : .from().select() pouvait hang sur le
  // lock d'auth (getSession timeout 5s) → le classement ne chargeait jamais.
  if (!SB_URL || !SB_KEY) return null
  try {
    const token = await getAccessToken().catch(() => null)
    const res = await fetch(
      `${SB_URL}/rest/v1/blind_test_scores?select=*&order=score.desc&limit=${limit}`,
      { headers: { apikey: SB_KEY, Authorization: `Bearer ${token || SB_KEY}`, Accept: 'application/json' } },
    )
    if (!res.ok) return []
    return await res.json()
  } catch {
    return []
  }
}

export async function upsertBlindTestScore({ userId, displayName, avatarUrl, score, streakMax, gamesPlayed }) {
  if (!supabase || !userId) return { error: 'no-client-or-user' }
  try {
    const { data: existing } = await supabase
      .from('blind_test_scores')
      .select('score, streak_max, games_played')
      .eq('user_id', userId)
      .maybeSingle()

    const { error } = await supabase.from('blind_test_scores').upsert({
      user_id:     userId,
      display_name: displayName,
      avatar_url:  avatarUrl,
      score:       Math.max(score, existing?.score ?? 0),
      streak_max:  Math.max(streakMax, existing?.streak_max ?? 0),
      games_played:(existing?.games_played ?? 0) + (gamesPlayed || 0),
      updated_at:  new Date().toISOString(),
    }, { onConflict: 'user_id' })
    // Ne plus avaler l'erreur en silence : une RLS manquante bloquait toutes les écritures.
    if (error) console.warn('[blindTest] upsertBlindTestScore échec:', error.code, error.message)
    return { error }
  } catch (e) {
    console.warn('[blindTest] upsertBlindTestScore exception:', e?.message ?? e)
    return { error: e }
  }
}

export async function logSession({ userId, trackId, correct, timeMs }) {
  if (!supabase || !userId) return
  try {
    const { error } = await supabase.from('blind_test_sessions').insert({
      user_id:   userId,
      track_id:  trackId,
      guessed_at: new Date().toISOString(),
      correct,
      time_ms:   timeMs,
    })
    if (error) console.warn('[blindTest] logSession échec:', error.code, error.message)
  } catch (e) { console.warn('[blindTest] logSession exception:', e?.message ?? e) }
}

// ── SQL to create tables (for admin/setup reference) ──────────────────────
export const SETUP_SQL = `
create table if not exists blind_test_scores (
  user_id      text primary key,
  display_name text,
  avatar_url   text,
  score        bigint default 0,
  streak_max   int default 0,
  games_played int default 0,
  updated_at   timestamptz default now()
);

create table if not exists blind_test_sessions (
  id         bigserial primary key,
  user_id    text,
  track_id   text,
  guessed_at timestamptz default now(),
  correct    boolean,
  time_ms    int
);

create table if not exists blind_test_rooms (
  code text primary key,
  host_user_id text not null,
  status text not null default 'waiting',
  difficulty_id text not null default 'easy',
  round int not null default 0,
  current_track_id text,
  started_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists blind_test_room_players (
  room_code text references blind_test_rooms(code) on delete cascade,
  user_id text,
  display_name text,
  avatar_url text,
  score bigint not null default 0,
  streak int not null default 0,
  joined_at timestamptz default now(),
  last_seen timestamptz default now(),
  primary key (room_code, user_id)
);

create table if not exists blind_test_room_answers (
  id bigserial primary key,
  room_code text references blind_test_rooms(code) on delete cascade,
  user_id text,
  round int not null,
  track_id text,
  anime_guess text,
  title_guess text,
  anime_ok boolean default false,
  title_ok boolean default false,
  earned bigint default 0,
  time_ms int default 0,
  created_at timestamptz default now(),
  unique(room_code, user_id, round)
);
`
