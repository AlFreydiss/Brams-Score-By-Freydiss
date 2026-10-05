// ── Tournois en images (1v1 visuels) ────────────────────────────────────────
// Contrairement aux tournois musicaux, ici on juge une IMAGE : un Bankai de
// Bleach ou une case de manga culte. Les images vivent dans public/tournoi/
// (WebP ≤ 1100 px, récupérées sur les wikis Fandom de chaque série).
//
// Le bracket réutilise la logique de src/lib/tournament.js (localStorage).

const BK = id => `/tournoi/bankai/${id}.webp`
const PN = id => `/tournoi/panels/${id}.webp`

export const BANKAI = [
  { id: 'tensa-zangetsu',              title: 'Tensa Zangetsu',                         owner: 'Ichigo Kurosaki' },
  { id: 'true-tensa-zangetsu',         title: 'Tensa Zangetsu (véritable)',             owner: 'Ichigo Kurosaki' },
  { id: 'senbonzakura-kageyoshi',      title: 'Senbonzakura Kageyoshi',                 owner: 'Byakuya Kuchiki' },
  { id: 'senkei',                      title: 'Senkei',                                 owner: 'Byakuya Kuchiki' },
  { id: 'shukei-hakuteiken',           title: 'Shūkei : Hakuteiken',                    owner: 'Byakuya Kuchiki' },
  { id: 'hihio-zabimaru',              title: 'Hihiō Zabimaru',                         owner: 'Renji Abarai' },
  { id: 'soo-zabimaru',                title: 'Sōō Zabimaru',                           owner: 'Renji Abarai' },
  { id: 'hakka-no-togame',             title: 'Hakka no Togame',                        owner: 'Rukia Kuchiki' },
  { id: 'daiguren-hyorinmaru',         title: 'Daiguren Hyōrinmaru',                    owner: 'Tōshirō Hitsugaya' },
  { id: 'daiguren-hyorinmaru-complet', title: 'Daiguren Hyōrinmaru (complet)',          owner: 'Tōshirō Hitsugaya' },
  { id: 'daiguren-hollow',             title: 'Daiguren Hyōrinmaru (hollowfié)',        owner: 'Tōshirō Hitsugaya' },
  { id: 'zanka-no-tachi',              title: 'Zanka no Tachi',                         owner: 'Genryūsai Yamamoto' },
  { id: 'minazuki',                    title: 'Minazuki',                               owner: 'Retsu Unohana' },
  { id: 'karamatsu-shinju',            title: 'Katen Kyōkotsu : Karamatsu Shinjū',      owner: 'Shunsui Kyōraku' },
  { id: 'kokujo-tengen-myoo',          title: 'Kokujō Tengen Myō\'ō',                   owner: 'Sajin Komamura' },
  { id: 'dangai-joe',                  title: 'Kokujō Tengen Myō\'ō : Dangai Jōe',      owner: 'Sajin Komamura' },
  { id: 'konjiki-ashisogi-jizo',       title: 'Konjiki Ashisogi Jizō',                  owner: 'Mayuri Kurotsuchi' },
  { id: 'matai-fukuin-shotai',         title: 'Konjiki Ashisogi Jizō : Matai Fukuin Shōtai', owner: 'Mayuri Kurotsuchi' },
  { id: 'jakuho-raikoben',             title: 'Jakuhō Raikōben',                        owner: 'Suì-Fēng' },
  { id: 'kamishini-no-yari',           title: 'Kamishini no Yari',                      owner: 'Gin Ichimaru' },
  { id: 'ryumon-hozukimaru',           title: 'Ryūmon Hōzukimaru',                      owner: 'Ikkaku Madarame' },
  { id: 'benihime-aratame',            title: 'Kannonbiraki Benihime Aratame',          owner: 'Kisuke Urahara' },
  { id: 'tekken-tachikaze',            title: 'Tekken Tachikaze',                       owner: 'Kensei Muguruma' },
  { id: 'kinshara-butodan',            title: 'Kinshara Butōdan',                       owner: 'Rōjūrō Ōtoribashi' },
  { id: 'sakashima-yokoshima',         title: 'Sakashima Yokoshima Happōfusagari',      owner: 'Shinji Hirako' },
  { id: 'enma-korogi',                 title: 'Suzumushi Tsuishiki : Enma Kōrogi',      owner: 'Kaname Tōsen' },
  { id: 'shirafude-ichimonji',         title: 'Shirafude Ichimonji',                    owner: 'Ichibē Hyōsube' },
  { id: 'shatatsu-karagara',           title: 'Shatatsu Karagara Shigarami no Tsuji',   owner: 'Senjumaru Shutara' },
  { id: 'bankai-kenpachi',             title: 'Bankai de Zaraki',                       owner: 'Kenpachi Zaraki' },
  { id: 'koko-gonryo-rikyu',           title: 'Kōkō Gonryō Rikyū',                      owner: 'Chōjirō Sasakibe' },
  { id: 'fushi',                       title: 'Fūshi',                                  owner: 'Shūhei Hisagi' },
  { id: 'bankai-ginjo',                title: 'Bankai de Ginjō',                        owner: 'Kūgo Ginjō' },
].map(b => ({ ...b, img: BK(b.id), subtitle: b.owner }))

export const PANELS = [
  { id: 'aot-colossal',         title: 'Le Titan Colossal',               series: 'L\'Attaque des Titans', chapter: 1 },
  { id: 'berserk-eclipse',      title: 'L\'Éclipse',                      series: 'Berserk' },
  { id: 'berserk-dragonslayer', title: 'Guts et la Dragonslayer',         series: 'Berserk' },
  { id: 'bleach-mugetsu',       title: 'Mugetsu',                         series: 'Bleach', chapter: 420 },
  { id: 'csm-hybrid',           title: 'Denji, forme hybride',            series: 'Chainsaw Man' },
  { id: 'db-ssj',               title: 'Le premier Super Saiyan',         series: 'Dragon Ball' },
  { id: 'dn-light',             title: 'La mort de Light',                series: 'Death Note', chapter: 107 },
  { id: 'hxh-gon-adult',        title: 'Gon adulte',                      series: 'Hunter × Hunter', chapter: 306 },
  { id: 'hxh-meruem',           title: 'Meruem et Komugi',                series: 'Hunter × Hunter', chapter: 318 },
  { id: 'jjk-purple',           title: 'Violet 200 %',                    series: 'Jujutsu Kaisen' },
  { id: 'jjk-sukuna-gojo',      title: 'Gojo tranché',                    series: 'Jujutsu Kaisen', chapter: 236 },
  { id: 'op-ace',               title: 'La mort d\'Ace',                  series: 'One Piece', chapter: 574 },
  { id: 'op-zoro',              title: '« Il ne s\'est rien passé »',     series: 'One Piece', chapter: 485 },
  { id: 'opm-serious',          title: 'Le coup de poing sérieux',        series: 'One Punch Man' },
  { id: 'vagabond-baiken',      title: 'Musashi contre Baiken',           series: 'Vagabond' },
  { id: 'vagabond-life',        title: '« Merci, Musashi »',              series: 'Vagabond' },
].map(p => ({ ...p, img: PN(p.id), subtitle: p.chapter ? `${p.series} · ch. ${p.chapter}` : p.series }))

// ── Radio Bleach ────────────────────────────────────────────────────────────
// Embeds YouTube (jamais de piste hébergée chez nous). IDs vérifiés via oEmbed.
export const BLEACH_TRACKS = {
  ost: [
    { id: '7JEjQG4-tpU', title: 'Number One — Bankai',         artist: 'Shiro Sagisu' },
    { id: '9xya0oO5WgA', title: 'Number One (vocal)',          artist: 'Shiro Sagisu' },
    { id: '0kYq-E8BJgU', title: 'Treachery',                   artist: 'Shiro Sagisu' },
    { id: 'PLyi5xHtkb0', title: 'On the Precipice of Defeat',  artist: 'Shiro Sagisu' },
    { id: 'vYCmdYUSOxA', title: 'Here to Stay',                artist: 'Shiro Sagisu' },
    { id: 'zO_532nbu0c', title: 'Never Meant to Belong',       artist: 'Shiro Sagisu' },
    { id: 'Q2aM5btBLVU', title: 'Soundscape to Ardor',         artist: 'Shiro Sagisu' },
    { id: 'JOHNtL9HhTE', title: 'Invasion',                    artist: 'Shiro Sagisu' },
    { id: 'Z9Onb_z0XPI', title: 'Clavar la Espada',            artist: 'Shiro Sagisu' },
    { id: 'YKLijZfJVzs', title: 'Fade to Black',               artist: 'Shiro Sagisu' },
  ],
  op: [
    { id: '46DtSMqE3e8', title: '*~Asterisk~',                 artist: 'Orange Range',          tag: 'OP 1' },
    { id: 'L-u3fkgZkO0', title: 'D-tecnoLife',                 artist: 'UVERworld',             tag: 'OP 2' },
    { id: 'WGEVZONi2EI', title: 'Ichirin no Hana',             artist: 'High and Mighty Color', tag: 'OP 3' },
    { id: 'UWHfqrAy410', title: 'Tonight, Tonight, Tonight',   artist: 'Beat Crusaders',        tag: 'OP 4' },
    { id: 'xOF65F9FHqE', title: 'Alones',                      artist: 'Aqua Timez',            tag: 'OP 6' },
    { id: 'AnUhTg1DSNU', title: 'Velonica',                    artist: 'Aqua Timez',            tag: 'OP 9' },
    { id: 'HN_-WaTLD_A', title: 'Shōjo S',                     artist: 'SCANDAL',               tag: 'OP 10' },
    { id: '8yLXZZcW-Mg', title: 'Anima Rossa',                 artist: 'Porno Graffitti',       tag: 'OP 11' },
    { id: 'pb_fwnVamdI', title: 'Scar',                        artist: 'Tatsuya Kitani',        tag: 'TYBW' },
  ],
  ed: [
    { id: '6B67YpRsmtw', title: 'Life is Like a Boat',         artist: 'Rie fu',                tag: 'ED 1' },
    { id: 'rb0cTo_aVKA', title: 'Houki Boshi',                 artist: 'Younha',                tag: 'ED 3' },
    { id: 'VQLjUZ2bm24', title: 'Hanabi',                      artist: 'Ikimonogakari',         tag: 'ED 7' },
  ],
}

export const VERSUS_CONFIGS = {
  bankai: {
    id: 'bleach-bankai',
    version: 'v1',
    title: 'Bleach Bankai',
    kicker: 'Le Bankai le plus stylé',
    route: '/tournoi/bankai',
    participants: BANKAI,
    fit: 'contain',
  },
  panels: {
    id: 'manga-panels',
    version: 'v1',
    title: 'Panels cultes',
    kicker: 'La case de manga la plus légendaire',
    route: '/tournoi/panels',
    participants: PANELS,
    fit: 'contain',
  },
}
