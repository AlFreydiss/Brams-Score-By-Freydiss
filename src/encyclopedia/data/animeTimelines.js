const item = (animeId, title, description, spoilerLevel = 1, extra = {}) => ({
  id: `${animeId}:${title.toLowerCase().replace(/[^a-z0-9]+/gi, '-')}`,
  animeId,
  title,
  description,
  arcs: [title],
  importantEntries: [],
  spoilerLevel,
  badge: spoilerLevel > 3 ? 'Spoiler' : 'Archive',
  ...extra,
})

export const animeTimelines = {
  'one-piece': [
    item('one-piece', 'East Blue', "Les origines de Luffy et le recrutement de ses premiers nakamas. Zoro, Nami, Usopp, Sanji — chacun avec sa propre dette envers la mer. La mise de Luffy est fixée à 30 millions.", 1),
    item('one-piece', 'Alabasta', "La guerre civile du Royaume des sables. Crocodile et Baroque Works manœuvrent dans l'ombre pendant que Vivi supplie les Mugiwara de sauver son peuple.", 1),
    item('one-piece', 'Skypiea', "Les îles célestes et la guerre de 400 ans entre Shandoriens et Skypiéens. Enel et son pouvoir du tonnerre. La cloche d'or et l'écho d'un passé oublié.", 1),
    item('one-piece', 'Water Seven', "La ville sur l'eau, la trahison apparente de Robin et la CP9. La vérité sur Pluton. Luffy doit affronter ses propres nakamas pour défendre l'équipage.", 1),
    item('one-piece', 'Enies Lobby', "L'assaut des Mugiwara contre le Gouvernement Mondial dans la forteresse de justice. Luffy déclare la guerre au monde entier. Robin dit enfin qu'elle veut vivre.", 1),
    item('one-piece', 'Thriller Bark', "L'île fantôme de Gekko Moriah. Zoro absorbe toute la douleur de Luffy pour le sauver. Thriller Bark redéfinit ce que signifie être un nakama.", 1),
    item('one-piece', 'Sabaody', "Archipel des bulles de savon, ségrégation et esclavage des hommes-poissons. Premier contact avec les vrais géants de la mer. Défaite totale des Mugiwara face à Bartholomew Kuma.", 1),
    item('one-piece', 'Impel Down', "La prison sous-marine la plus redoutée du monde. Luffy s'infiltre seul pour libérer Ace. Alliance improbable avec Crocodile, Jinbe et Ivankov.", 2),
    item('one-piece', 'Marineford', "La Guerre du Meilleur. Whitebeard, Shanks, la Marine au complet. Luffy assiste à la mort d'Ace sans pouvoir l'en empêcher. One Piece ne sera plus jamais le même.", 2),
    item('one-piece', 'Fishman Island', "Le Nouvel Monde commence sous l'océan. La discrimination millénaire des hommes-poissons, la promesse brisée de Joy Boy et la rage de Hordy Jones.", 2),
    item('one-piece', 'Punk Hazard', "L'île brûlée et gelée des expériences de Caesar Clown. Doflamingo en coulisses, enfants cobayes et SMILES. Naissance de l'alliance Mugiwara–Trafalgar Law.", 2),
    item('one-piece', 'Dressrosa', "Le tournoi du Corrida Colosseum. L'opération SOP et le règne fantoche de Doflamingo. Riku, Rebecca, les jouets. Luffy libère un royaume entier.", 2),
    item('one-piece', 'Whole Cake Island', "L'empire sucré de Big Mom. Sanji confronte les Vinsmoke et son passé. Jinbe rejoint l'équipage. Brook vole la copie de la Ponéglyphe de Big Mom.", 3),
    item('one-piece', 'Wano', "Le pays des samouraïs sous la coupe de Kaidou et Orochi. L'alliance des Pirates et des Samouraïs. Gear 5, Nika, la vérité sur Joy Boy — l'arc le plus long de One Piece.", 4),
    item('one-piece', 'Egghead', "Le laboratoire futuriste du Dr Vegapunk. Les Cinq Doyens révèlent leur vraie nature. L'histoire cachée du monde commence à s'écrire.", 5),
    item('one-piece', 'Elbaf', "Le pays des géants légendaires. Les racines d'Usopp et la flamme de Binks. Le voyage vers Laugh Tale se rapproche.", 5),
  ],

  naruto: [
    item('naruto', 'Académie Ninja', "Naruto, Sasuke et Sakura forment la Team 7 sous la direction de Kakashi. Les bases du ninjutsu, le chakra, les premiers examens. L'histoire commence ici.", 1),
    item('naruto', 'Examen Chunin', "Le tournoi qui met en avant les meilleurs genins de toutes les nations. L'invasion d'Orochimaru, Gaara et la bête à une queue. Le monde ninja se dévoile.", 1),
    item('naruto', 'Recherche de Tsunade', "Jiraiya et Naruto partent retrouver la légendaire Tsunade pour sauver Kakashi et Lee. Le Rasengan. Les origines des Sannins légendaires.", 1),
    item('naruto', 'Récupération de Sasuke', "Sasuke abandonne Konoha pour le pouvoir d'Orochimaru. Naruto court après son frère de cœur jusqu'à la Vallée de la Fin. Une promesse à jamais.", 2),
    item('naruto', 'Akatsuki', "Les agents de l'Akatsuki traquent les jinchuriki à travers le monde. Deidara, Sasori, Itachi — chaque confrontation révèle la profondeur du conflit.", 2),
    item('naruto', 'Arc Pain', "L'assaut de Nagato sur Konoha. Le village en ruines, la mort d'Hinata, la rage de Naruto. La vraie signification de la paix selon Jiraiya.", 3),
    item('naruto', 'Guerre Ninja', "La Quatrième Guerre Ninja Mondiale réunit toutes les nations contre Tobi et Kabuto. Les morts reviennent, la vérité sur Itachi éclate, Naruto rencontre son père.", 4),
    item('naruto', 'Fin', "Naruto et Sasuke. La confrontation finale, le choix du pardon. Une nouvelle ère pour les ninjas. Le Hokage et la promesse accomplie.", 4),
  ],

  'dragon-ball': [
    item('dragon-ball', 'Dragon Ball Original', "Goku enfant, Bulma, Kame-Sennin et les premières aventures. Les tournois mondiaux des arts martiaux. Les origines d'un univers qui changera le shonen pour toujours.", 1),
    item('dragon-ball', 'Saga Saiyan', "Raditz révèle les origines extraterrestres de Goku. Végéta et Nappa débarquent sur Terre. Yamcha, Tenshinhan, Piccolo — les sacrifices fondateurs de Dragon Ball Z.", 1),
    item('dragon-ball', 'Namek', "La planète des Namekians et les Dragon Balls géantes. Freezer et ses sbires. La transformation légendaire en Super Saiyan et la destruction de Namek.", 2),
    item('dragon-ball', 'Cell', "Le cyborg parfait créé par le Dr Gero. Les Cyborgs, Trunks du futur, les Cell Games. Gohan libère une puissance que même Goku ne possède pas.", 2),
    item('dragon-ball', 'Majin Buu', "Le démon rose et ses transformations. Gotenks, Gohan absorbé, Vegetto. La dernière bataille de Dragon Ball Z : tous les guerriers du bien contre le Buu ultime.", 3),
    item('dragon-ball', 'Battle of Gods', "Le Dieu de la Destruction Beerus et son serviteur Whis. La transformation en Super Saiyan Dieu. Dragon Ball Super commence.", 3),
    item('dragon-ball', 'Tournament of Power', "Le tournoi multiversel sous les yeux de Zeno. 10 combattants de l'Univers 7 face aux meilleurs guerriers de 12 univers. L'Ultra Instinct et la survie de l'univers.", 4),
  ],

  bleach: [
    item('bleach', 'Substitute Shinigami', "Ichigo Kurosaki reçoit les pouvoirs de Rukia et commence sa carrière de Shinigami de substitution. Hollows, Soul Society, et les premières règles d'un monde invisible.", 1),
    item('bleach', 'Soul Society', "L'arc fondateur de Bleach. Rukia condamnée à mort, Ichigo qui s'infiltre dans le monde des morts. La révélation d'Aizen change tout ce qu'on croyait savoir.", 2),
    item('bleach', 'Arrancar', "Les arrancars d'Aizen envahissent le monde des vivants. Hueco Mundo, Grimmjow, la Tour Las Noches. L'arc le plus long et le plus épique de Bleach.", 2),
    item('bleach', 'Fullbring', "Ichigo sans ses pouvoirs, une nouvelle forme de magie et l'ennemi de l'intérieur. L'arc de la transition avant la guerre finale.", 3),
    item('bleach', 'Thousand-Year Blood War', "Les Quincy reviennent détruire Soul Society. Le Roi des Esprits, la vérité sur Zangetsu, la forme finale d'Ichigo. La guerre millénaire conclut l'œuvre de Tite Kubo.", 4),
  ],

  'fullmetal-alchemist': [
    item('fullmetal-alchemist', 'Débuts frères Elric', "Edward et Alphonse paient le prix ultime d'une transmutation interdite. Leur quête de la Pierre Philosophale commence pour récupérer leurs corps perdus.", 1),
    item('fullmetal-alchemist', 'Pierre Philosophale', "La vérité sur la Pierre : elle est faite d'âmes humaines. Les expériences d'Ishval et le passé sanglant des alchimistes de l'État.", 1),
    item('fullmetal-alchemist', 'Homonculus', "Pride, Greed, Envy, Wrath — les Péchés Capitaux et leur père. Le plan Père pour dévorer Dieu lui-même. Mustang et la justice pour Ishval.", 2),
    item('fullmetal-alchemist', 'Briggs', "La forteresse nordique du général Armstrong. Les secrets sous la glace, les Homonculus au service de l'État, et la vraie nature de Père.", 3),
    item('fullmetal-alchemist', 'Promised Day', "La bataille finale le jour de l'éclipse. Tous les pions s'affrontent. Ed refuse de sacrifier son âme pour la victoire — et triomphe quand même.", 4),
  ],

  'my-hero-academia': [
    item('my-hero-academia', 'UA — Débuts', "Izuku Midoriya sans alter reçoit le One For All de All Might. L'entrée à l'UA, les premiers combats, les premiers alliés. La société heroique telle qu'elle se présente.", 1),
    item('my-hero-academia', 'Sports Festival', "Le tournoi entre étudiants où tous les yeux du monde heroique se posent sur la prochaine génération. Todoroki affronte son passé face à Deku.", 1),
    item('my-hero-academia', 'Stain — Héros tueurs', "Le justicier Stain et son idéologie sur les faux héros. L'arc qui redéfinit ce que signifie être un vrai héros.", 2),
    item('my-hero-academia', 'Kamino — All Might vs All For One', "La confrontation finale entre All Might et All For One. Le symbole de la paix se brise sous les yeux du monde. Era of peace ends.", 3),
    item('my-hero-academia', 'Overhaul', "Eri et les Shie Hassaikai. Deku pousse le One For All à 100% pour la première fois. Un arc centré sur la rédemption et le sacrifice.", 3),
    item('my-hero-academia', 'Paranormal Liberation War', "La coalition des vilains contre les héros. Shigaraki éveillé, Dabi révèle son identité, Hawks sous pression. La société héroïque s'effondre.", 4),
    item('my-hero-academia', 'Final Act', "La bataille finale entre Deku et Shigaraki. La vérité sur All For One et One For All. L'avenir de la société heroique entre les mains de la génération UA.", 4),
  ],

  'the-promised-neverland': [
    item('the-promised-neverland', 'Grace Field — Évasion', "Emma, Norman et Ray découvrent la vérité sur Grace Field : ils sont de la nourriture d'élite pour les démons. Le plan d'évasion commence.", 1),
    item('the-promised-neverland', 'Monde Extérieur', "Emma et ses amis découvrent le monde au-delà des murs. Les démones nobles, les humains sauvages, les vestiges d'une civilisation disparue.", 2),
    item('the-promised-neverland', 'Goldy Pond', "Le terrain de chasse secret des démons. Les enfants piégés qui résistent. L'arc le plus violent et le plus sombre de la série.", 3),
    item('the-promised-neverland', 'William Minerva & La Promesse', "La vérité sur William Minerva et la promesse ancienne entre humains et démons. Norman change radicalement — est-ce la bonne voie ?", 4),
    item('the-promised-neverland', 'La Promesse Rompue', "Emma affronte l'origine du monde. Quel prix payer pour la liberté de tous ? La fin de The Promised Neverland et ses sacrifices.", 4),
  ],

  'dr-stone': [
    item('dr-stone', 'Réveil de la Science', "Taiju réveille Senkuu après 3700 ans de pétrification. Le Royaume de la Science contre Tsukasa et la survie de l'humanité dans un monde de pierre.", 1),
    item('dr-stone', 'Royaume de la Science', "La construction d'une civilisation moderne en partant de zéro. Nitrates, téléphone, médicaments — chaque invention est une victoire sur la nature.", 1),
    item('dr-stone', 'Stone Wars', "La guerre entre le Royaume de la Science et l'Empire de la Force de Tsukasa. Stratégie, ruse et discours de Senkuu face à la violence brute.", 2),
    item('dr-stone', 'Exploration & Médusa', "L'expédition en Amérique du Sud, la découverte des origines de la pétrification. La Médusa et le mystère de Why-Man se précisent.", 3),
    item('dr-stone', 'Why-Man', "La vérité sur Why-Man et le signal de pétrification qui parcourt l'univers. Senkuu face à une menace qui dépasse la Terre.", 4),
  ],
}
