// Base du génie : personnages d'anime / manga décrits par quelques traits.
// Une ligne = « Nom|série|genre|cheveux|traits ».
//   genre   : m | f
//   cheveux : couleur dominante ; « a/b » pour deux couleurs ; « none » si
//             chauve ou sans cheveux (créature, robot…)
//   traits  : mots de TRAITS (plus bas) séparés par des espaces. Un trait
//             suivi de « ? » vaut « à moitié » (personnage ambigu, mort puis
//             ressuscité, méchant devenu allié…) : le moteur le traite comme
//             une probabilité de 0,5 au lieu de trancher.
// Un trait absent vaut « non ». Le moteur tolère les erreurs (de la base ou
// du joueur) : une réponse qui contredit un trait pénalise fortement le
// personnage sans l'éliminer.

export const SERIES = {
  op:   { name: 'One Piece',               year: 1999 },
  nar:  { name: 'Naruto',                  year: 1999 },
  db:   { name: 'Dragon Ball',             year: 1984 },
  bl:   { name: 'Bleach',                  year: 2001 },
  ds:   { name: 'Demon Slayer',            year: 2016 },
  jjk:  { name: 'Jujutsu Kaisen',          year: 2018 },
  aot:  { name: "L'Attaque des Titans",    year: 2009 },
  mha:  { name: 'My Hero Academia',        year: 2014 },
  hxh:  { name: 'Hunter x Hunter',         year: 1998 },
  dn:   { name: 'Death Note',              year: 2003 },
  fma:  { name: 'Fullmetal Alchemist',     year: 2001 },
  csm:  { name: 'Chainsaw Man',            year: 2018 },
  tg:   { name: 'Tokyo Ghoul',             year: 2011 },
  opm:  { name: 'One Punch Man',           year: 2009 },
  jojo: { name: "JoJo's Bizarre Adventure", year: 1987 },
  ft:   { name: 'Fairy Tail',              year: 2006 },
  bc:   { name: 'Black Clover',            year: 2015 },
  sxf:  { name: 'Spy x Family',            year: 2019 },
  sl:   { name: 'Solo Leveling',           year: 2018 },
  cg:   { name: 'Code Geass',              year: 2006 },
  eva:  { name: 'Evangelion',              year: 1995 },
  pkm:  { name: 'Pokémon',                 year: 1997 },
  fri:  { name: 'Frieren',                 year: 2020 },
  sao:  { name: 'Sword Art Online',        year: 2009 },
  vs:   { name: 'Vinland Saga',            year: 2005 },
  blk:  { name: 'Blue Lock',               year: 2018 },
  hq:   { name: 'Haikyu!!',                year: 2012 },
  drs:  { name: 'Dr. Stone',               year: 2017 },
  ddd:  { name: 'Dandadan',                year: 2021 },
  k8:   { name: 'Kaiju n°8',               year: 2020 },
}

// Traits et la question qui les sonde. L'ordre n'a pas d'importance : le
// moteur choisit à chaque tour la question qui coupe le mieux les candidats.
export const TRAITS = {
  main:      'Est-ce le héros principal de sa série ?',
  villain:   'Est-ce un méchant ou un antagoniste ?',
  boss:      "Est-ce le grand méchant de la série ou d'un arc majeur ?",
  rival:     'Est-ce le rival du héros ?',
  mentor:    'Est-ce un mentor ou un maître pour un autre personnage ?',
  leader:    'Dirige-t-il un groupe, une organisation ou un équipage ?',
  family:    'Fait-il partie de la famille du héros principal ?',
  traitor:   'A-t-il trahi son camp à un moment ?',
  dead:      "Meurt-il dans l'histoire ?",
  nonhuman:  "N'est-il pas humain (démon, monstre, créature, robot…) ?",
  kid:       'Est-ce un enfant ?',
  teen:      'Est-ce un adolescent ?',
  old:       'Est-ce un personnage âgé ?',
  student:   "Est-il élève ou va-t-il à l'école ?",
  royal:     'Est-il de sang royal ou noble ?',
  tall:      'Est-il immense, bien plus grand que la normale ?',
  comic:     'Est-ce avant tout un personnage comique ?',
  genius:    'Est-il connu pour son intelligence ou ses stratégies ?',
  nopow:     "N'a-t-il aucun pouvoir surnaturel ?",
  sword:     'Se bat-il avec une épée ou un sabre ?',
  fist:      'Se bat-il surtout à mains nues ?',
  gun:       'Utilise-t-il des armes à feu ?',
  fire:      'Utilise-t-il le feu ?',
  ice:       'Utilise-t-il la glace ?',
  lightning: "Utilise-t-il la foudre ou l'électricité ?",
  transform: 'Peut-il se transformer (forme bestiale, éveil, nouvelle apparence) ?',
  eyes:      'A-t-il des yeux spéciaux ou un pouvoir lié au regard ?',
  robot:     'A-t-il un corps mécanique ou des prothèses ?',
  scar:      'A-t-il une cicatrice bien visible ?',
  mask:      'Porte-t-il un masque ou un bandeau sur le visage ?',
  glasses:   'Porte-t-il des lunettes ?',
  hat:       'Porte-t-il un chapeau ou un couvre-chef emblématique ?',
  // Propres à une série : seuls les personnages de cette série les portent.
  pirate:    'Est-ce un pirate ?',
  marine:    'Fait-il partie de la Marine ?',
  strawhat:  "Fait-il partie de l'équipage du Chapeau de Paille ?",
  df:        'A-t-il mangé un Fruit du Démon ?',
  yonko:     'Est-il (ou a-t-il été) un Empereur, un Yonko ?',
  warlord:   'Est-il (ou a-t-il été) un Grand Corsaire ?',
  admiral:   'Est-il amiral de la Marine ?',
  revo:      "Fait-il partie de l'Armée Révolutionnaire ?",
  akatsuki:  "Fait-il partie de l'Akatsuki ?",
  uchiha:    'Est-ce un Uchiha ?',
  hokage:    'Est-il (ou devient-il) Hokage ?',
  jinchuriki:'Est-ce un jinchûriki, hôte d\'un démon à queues ?',
  sannin:    "Fait-il partie des trois Sannin légendaires ?",
  saiyan:    'Est-ce un Saiyan (même à moitié) ?',
  shinigami: 'Est-ce un shinigami ?',
  gotei:     'Est-il capitaine du Gotei 13 ?',
  espada:    "Fait-il partie de l'Espada ?",
  quincy:    'Est-ce un Quincy ?',
  slayer:    'Fait-il partie des pourfendeurs de démons ?',
  hashira:   'Est-ce un Pilier (Hashira) ?',
  demon:     'Est-ce un démon ?',
  sorcerer:  "Est-ce un exorciste de l'école d'exorcisme ?",
  curse:     'Est-ce un fléau (une malédiction) ?',
  shifter:   'Peut-il se transformer en Titan ?',
  scout:     "Fait-il partie du Bataillon d'exploration ?",
  ua:        'Est-il élève à Yuei (U.A.) ?',
  prohero:   'Est-ce un héros professionnel ?',
  hunter:    'A-t-il la licence de Hunter ?',
  troupe:    "Fait-il partie de la Brigade fantôme ?",
  alchemist: 'Est-ce un alchimiste ?',
  homunculus:'Est-ce un homonculus ?',
  military:  "Fait-il partie de l'armée ?",
  devil:     'Est-ce un démon (un « devil ») ou un hybride ?',
  ghoul:     'Est-ce une goule ?',
  stand:     'Possède-t-il un Stand ?',
  joestar:   'Fait-il partie de la famille Joestar ?',
}

export const HAIR = {
  black:  'A-t-il les cheveux noirs ?',
  blond:  'A-t-il les cheveux blonds ou jaunes ?',
  white:  'A-t-il les cheveux blancs ou argentés ?',
  red:    'A-t-il les cheveux roux ou rouges ?',
  orange: 'A-t-il les cheveux orange ?',
  pink:   'A-t-il les cheveux roses ?',
  blue:   'A-t-il les cheveux bleus ?',
  green:  'A-t-il les cheveux verts ?',
  brown:  'A-t-il les cheveux bruns ou châtains ?',
  purple: 'A-t-il les cheveux violets ?',
  none:   'Est-il chauve ou sans cheveux ?',
}

const RAW = `
Monkey D. Luffy|op|m|black|main pirate strawhat df leader teen hat scar fist transform comic
Roronoa Zoro|op|m|green|pirate strawhat sword scar
Nami|op|f|orange|pirate strawhat lightning? genius?
Usopp|op|m|black|pirate strawhat comic gun? nopow hat?
Sanji|op|m|blond|pirate strawhat fist fire royal comic?
Tony Tony Chopper|op|m|brown|pirate strawhat df nonhuman transform kid? comic hat
Nico Robin|op|f|black|pirate strawhat df genius
Franky|op|m|blue|pirate strawhat robot comic
Brook|op|m|black|pirate strawhat sword nonhuman dead? hat comic tall?
Jinbe|op|m|black|pirate strawhat nonhuman fist warlord tall
Portgas D. Ace|op|m|black|pirate df fire dead hat family
Sabo|op|m|blond|revo df fire hat scar family
Shanks|op|m|red|pirate yonko leader sword scar mentor
Marshall D. Teach (Barbe Noire)|op|m|black|pirate yonko df villain boss leader warlord traitor
Edward Newgate (Barbe Blanche)|op|m|blond|pirate yonko df dead old tall leader
Kaido|op|m|black|pirate yonko df villain boss transform tall leader
Charlotte Linlin (Big Mom)|op|f|pink|pirate yonko df villain boss tall leader old
Gol D. Roger|op|m|black|pirate dead leader sword
Trafalgar Law|op|m|black|pirate df leader sword hat warlord genius?
Eustass Kid|op|m|red|pirate df leader robot villain?
Donquixote Doflamingo|op|m|blond|pirate df villain boss warlord royal glasses leader
Crocodile|op|m|black|pirate df villain boss warlord scar leader
Dracule Mihawk|op|m|black|pirate? warlord sword hat eyes? mentor
Boa Hancock|op|f|black|pirate df warlord leader royal
Baggy le Clown|op|m|blue|pirate df comic yonko leader warlord
Monkey D. Garp|op|m|white|marine old family fist
Sakazuki (Akainu)|op|m|black|marine admiral df fire villain hat leader?
Kuzan (Aokiji)|op|m|black|marine? admiral df ice
Borsalino (Kizaru)|op|m|black|marine admiral df glasses
Smoker|op|m|white|marine df
Koby|op|m|pink|marine
Monkey D. Dragon|op|m|black|revo leader family
Ener|op|m|blond|df lightning villain boss leader
Rob Lucci|op|m|black|df transform villain hat
Charlotte Katakuri|op|m|red|pirate df villain
Yamato|op|f|white|df transform ice
Nefertari Vivi|op|f|blue|royal nopow
Silvers Rayleigh|op|m|white|pirate old glasses mentor
Marco le Phénix|op|m|blond|pirate df fire transform
Bartholomew Kuma|op|m|black|df warlord robot tall revo hat
Arlong|op|m|black|pirate nonhuman villain boss leader
Naruto Uzumaki|nar|m|blond|main jinchuriki hokage transform comic teen
Sasuke Uchiha|nar|m|black|uchiha rival eyes sword traitor villain? teen
Sakura Haruno|nar|f|pink|fist teen
Kakashi Hatake|nar|m|white|mentor mask eyes hokage scar
Itachi Uchiha|nar|m|black|uchiha akatsuki eyes dead traitor? villain?
Madara Uchiha|nar|m|black|uchiha villain boss eyes dead leader
Obito Uchiha|nar|m|black|uchiha villain boss mask eyes leader akatsuki scar dead
Pain (Nagato)|nar|m|orange/red|akatsuki villain boss eyes leader dead
Gaara|nar|m|red|jinchuriki leader teen
Rock Lee|nar|m|black|fist comic nopow teen
Jiraiya|nar|m|white|sannin mentor old dead
Orochimaru|nar|m|black|sannin villain boss transform traitor
Tsunade|nar|f|blond|sannin hokage fist leader
Hinata Hyûga|nar|f|purple|eyes teen royal?
Minato Namikaze|nar|m|blond|hokage family dead lightning?
Shikamaru Nara|nar|m|black|genius teen
Kurama (Kyûbi)|nar|m|orange|nonhuman transform
Hashirama Senju|nar|m|black|hokage dead leader
Kisame Hoshigaki|nar|m|blue|akatsuki sword villain dead
Deidara|nar|m|blond|akatsuki villain dead
Zabuza Momochi|nar|m|black|sword mask villain dead
Neji Hyûga|nar|m|brown|eyes dead teen
Killer Bee|nar|m|white|jinchuriki sword comic
Boruto Uzumaki|nar|m|blond|main? family kid eyes
Son Goku|db|m|black|main saiyan transform fist comic
Vegeta|db|m|black|saiyan rival royal transform villain?
Son Gohan|db|m|black|saiyan family transform student glasses?
Piccolo|db|m|none|nonhuman mentor villain?
Freezer|db|m|none|nonhuman villain boss transform royal leader
Cell|db|m|none|nonhuman robot? villain boss transform
Majin Buu|db|m|none|nonhuman villain boss transform comic
Trunks|db|m|purple|saiyan sword transform family?
Krilin|db|m|none/black|fist comic
Bulma|db|f|blue|genius nopow
Broly|db|m|black|saiyan villain transform
Beerus|db|m|none|nonhuman
C-18|db|f|blond|robot
Tortue Géniale|db|m|none|old mentor glasses comic
Ichigo Kurosaki|bl|m|orange|main shinigami sword student transform mask? teen
Rukia Kuchiki|bl|f|black|shinigami sword ice royal
Sosuke Aizen|bl|m|brown|shinigami villain boss genius glasses traitor gotei leader
Byakuya Kuchiki|bl|m|black|shinigami gotei sword royal leader
Kenpachi Zaraki|bl|m|black|shinigami gotei sword scar leader
Toshiro Hitsugaya|bl|m|white|shinigami gotei sword ice kid leader
Kisuke Urahara|bl|m|blond|shinigami genius hat mentor sword
Ulquiorra Cifer|bl|m|black|espada nonhuman villain transform dead eyes?
Grimmjow Jaggerjack|bl|m|blue|espada nonhuman villain transform rival?
Uryu Ishida|bl|m|black|quincy glasses student teen
Yhwach|bl|m|black|quincy villain boss leader dead eyes?
Orihime Inoue|bl|f|orange|student teen
Yoruichi Shihôin|bl|f|purple|shinigami transform royal fist mentor
Gin Ichimaru|bl|m|white|shinigami gotei sword traitor dead villain?
Renji Abarai|bl|m|red|shinigami sword
Tanjiro Kamado|ds|m|red|main slayer sword scar fire? teen
Nezuko Kamado|ds|f|black|demon nonhuman transform family teen?
Zenitsu Agatsuma|ds|m|blond|slayer sword lightning comic teen
Inosuke Hashibira|ds|m|black|slayer sword mask comic teen
Kyojuro Rengoku|ds|m|blond/red|hashira slayer sword fire dead mentor
Giyu Tomioka|ds|m|black|hashira slayer sword
Shinobu Kocho|ds|f|black|hashira slayer sword dead
Muzan Kibutsuji|ds|m|black|demon villain boss leader nonhuman transform dead
Akaza|ds|m|pink|demon villain fist dead nonhuman
Douma|ds|m|white|demon villain ice dead nonhuman
Kokushibo|ds|m|black|demon villain sword eyes dead nonhuman
Tengen Uzui|ds|m|white|hashira slayer sword
Mitsuri Kanroji|ds|f|pink|hashira slayer sword
Sakonji Urokodaki|ds|m|white|mentor mask old slayer
Yuji Itadori|jjk|m|pink|main sorcerer student fist teen
Megumi Fushiguro|jjk|m|black|sorcerer student teen
Nobara Kugisaki|jjk|f|orange|sorcerer student teen
Satoru Gojo|jjk|m|white|sorcerer mentor eyes mask dead
Ryomen Sukuna|jjk|m|pink|curse villain boss nonhuman fire eyes?
Suguru Geto|jjk|m|black|sorcerer villain boss leader traitor dead
Mahito|jjk|m|blue|curse villain nonhuman transform dead scar
Toji Fushiguro|jjk|m|black|villain nopow scar dead sword
Maki Zenin|jjk|f|green|sorcerer glasses sword nopow student
Kento Nanami|jjk|m|blond|sorcerer glasses dead sword
Aoi Todo|jjk|m|black|sorcerer comic fist scar
Yuta Okkotsu|jjk|m|black|sorcerer sword student teen
Eren Jäger|aot|m|brown|main shifter scout transform villain? boss? dead
Mikasa Ackerman|aot|f|black|scout sword scar
Armin Arlert|aot|m|blond|scout shifter genius
Livai Ackerman|aot|m|black|scout sword leader scar
Erwin Smith|aot|m|blond|scout leader dead genius
Reiner Braun|aot|m|blond|shifter traitor villain? transform
Annie Leonhart|aot|f|blond|shifter villain? transform
Zeke Jäger|aot|m|blond|shifter villain glasses dead royal family transform
Hansi Zoë|aot|f|brown|scout glasses genius leader dead
Historia Reiss|aot|f|blond|royal leader
Izuku Midoriya|mha|m|green|main ua student fist teen
Katsuki Bakugo|mha|m|blond|ua student rival fire teen
All Might|mha|m|blond|prohero mentor transform scar
Shoto Todoroki|mha|m|white/red|ua student fire ice scar teen
Tomura Shigaraki|mha|m|white|villain boss leader
Endeavor|mha|m|red|prohero fire scar
All For One|mha|m|none|villain boss mask leader
Dabi|mha|m|black|villain fire scar
Ochaco Uraraka|mha|f|brown|ua student teen
Himiko Toga|mha|f|blond|villain transform
Shota Aizawa|mha|m|black|prohero mentor eyes scar
Gon Freecss|hxh|m|black|main hunter kid fist
Killua Zoldyck|hxh|m|white|hunter kid lightning
Kurapika|hxh|m|blond|hunter eyes
Leorio Paladiknight|hxh|m|black|hunter glasses
Hisoka|hxh|m|red|villain? troupe? hunter comic?
Chrollo Lucilfer|hxh|m|black|troupe leader villain boss
Meruem|hxh|m|none|nonhuman villain boss royal dead
Isaac Netero|hxh|m|white|hunter old leader dead mentor
Light Yagami|dn|m|brown|main villain genius student dead
L|dn|m|black|genius dead
Ryuk|dn|m|black|nonhuman comic
Misa Amane|dn|f|blond|villain? eyes
Near|dn|m|white|genius kid
Edward Elric|fma|m|blond|main alchemist robot military teen
Alphonse Elric|fma|m|blond|alchemist robot nonhuman? family kid?
Roy Mustang|fma|m|black|alchemist military fire leader
Scar|fma|m|white|scar villain?
Envy|fma|m|green|homunculus nonhuman villain transform dead
Père (Father)|fma|m|blond|homunculus nonhuman villain boss dead
Winry Rockbell|fma|f|blond|nopow genius
King Bradley|fma|m|black|homunculus military villain leader sword eyes dead
Denji|csm|m|blond|main devil transform comic teen
Power|csm|f|pink|devil nonhuman comic
Makima|csm|f|red|devil villain boss leader eyes dead nonhuman
Aki Hayakawa|csm|m|black|sword dead
Pochita|csm|m|orange|devil nonhuman
Ken Kaneki|tg|m|white|main ghoul mask eyes transform
Touka Kirishima|tg|f|purple|ghoul
Saitama|opm|m|none|main fist comic
Genos|opm|m|blond|robot fire
Jotaro Kujo|jojo|m|black|main joestar stand hat student
Dio Brando|jojo|m|blond|villain boss nonhuman stand
Giorno Giovanna|jojo|m|blond|main stand leader
Joseph Joestar|jojo|m|brown|joestar comic main?
Natsu Dragneel|ft|m|pink|main fire transform comic
Erza Scarlet|ft|f|red|sword
Lucy Heartfilia|ft|f|blond|royal?
Grey Fullbuster|ft|m|black|ice
Asta|bc|m|white|main sword nopow transform
Yuno|bc|m|black|rival royal
Anya Forger|sxf|f|pink|kid comic
Loid Forger|sxf|m|blond|genius gun nopow
Yor Forger|sxf|f|black|nopow
Sung Jin-Woo|sl|m|black|main leader
Lelouch vi Britannia|cg|m|black|main royal genius eyes leader mask dead villain?
Shinji Ikari|eva|m|brown|main student teen
Rei Ayanami|eva|f|blue|student teen
Asuka Langley|eva|f|orange|student teen
Sacha (Ash)|pkm|m|black|main hat kid
Pikachu|pkm|m|none|nonhuman lightning
Frieren|fri|f|white|main nonhuman old mentor
Kirito|sao|m|black|main sword teen
Thorfinn|vs|m|blond|main sword scar
Yoichi Isagi|blk|m|black|main nopow teen
Shoyo Hinata|hq|m|orange|main nopow student teen
Senku Ishigami|drs|m|green|main genius nopow teen
Momo Ayase|ddd|f|brown|main student teen
Okarun|ddd|m|black|main student glasses transform teen
Kafka Hibino|k8|m|black|main transform nonhuman?
`

function parse(raw) {
  return raw.trim().split('\n').map((line, i) => {
    const [name, s, g, hair, traits = ''] = line.split('|')
    const t = {}
    for (const w of traits.trim().split(/\s+/).filter(Boolean)) {
      const half = w.endsWith('?')
      t[half ? w.slice(0, -1) : w] = half ? 0.5 : 1
    }
    return { id: i, name: name.trim(), s, g, hair: hair.split('/'), t }
  })
}

export const CHARACTERS = parse(RAW)
