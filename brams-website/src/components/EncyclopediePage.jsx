import { useState, useEffect, useMemo, useRef, useCallback } from 'react'

// ─────────────────────────────────────────────────────────────────────────────
// DATA
// ─────────────────────────────────────────────────────────────────────────────

const HAKI = [
  { name: "Haki de l'Observation", jp: 'Kenbunshoku no Haki', color: '#74b9ff', emoji: '👁️', desc: "Permet de percevoir les présences, émotions et intentions à distance. Les utilisateurs avancés peuvent entrevoir quelques secondes dans le futur.", details: [{ label: 'Niveau de base', text: 'Détection des présences dans un rayon étendu. Lecture des émotions et intentions hostiles. Perception même en dehors du champ de vision.' }, { label: 'Vision du Futur', text: "Capacité rare : apercevoir le futur proche. Katakuri fut le premier à la montrer, avant que Luffy ne la développe en combat. Shanks la possède à un niveau extrême." }, { label: 'Contre-mesures', text: "Un utilisateur vide son esprit pour ne pas montrer ses intentions. Les simples animaux et individus sans conscience le possèdent naturellement." }], users: ['Luffy', 'Katakuri', 'Shanks', 'Enel', 'Coby', 'Boa Hancock', 'Rayleigh', 'Sanji'], rarity: 'Commun', rarityColor: '#74b9ff' },
  { name: "Haki de l'Armement", jp: 'Busoshoku no Haki', color: '#636e72', emoji: '⚫', desc: "Crée une armure invisible renforcée sur le corps ou les armes. Seule façon de toucher efficacement les utilisateurs de Fruits Logia. La forme avancée (Ryou) projette le Haki à l'intérieur de la cible.", details: [{ label: 'Armement classique', text: 'Revêtement noir sur les membres ou armes. Augmente drastiquement la puissance offensive et défensive. Neutralise les corps Logia.' }, { label: 'Ryou — Armement Fluide', text: "Forme avancée apprise sur Udon (Wano). Le Haki traverse les défenses sans les briser — il détruit de l'intérieur. Seule méthode confirmée pour blesser Kaido sous ses écailles." }, { label: 'Hardening', text: "Forme visuelle : la zone revêtue devient noire, dure comme l'acier. Utilisée par Vergo, Pica, ou encore les guerriers d'Amazon Lily." }], users: ['Garp', 'Rayleigh', 'Vergo', 'Luffy', 'Zoro', 'Sanji', 'Katakuri', 'Doflamingo', 'Fujitora', 'Jinbei'], rarity: 'Commun', rarityColor: '#74b9ff' },
  { name: 'Haki du Conquérant', jp: 'Haoshoku no Haki', color: '#fdcb6e', emoji: '👑', desc: "Le Haki des Rois. Un être sur plusieurs millions peut en être doté. La seule forme de Haki impossible à acquérir par l'entraînement — on naît avec, ou pas. La volonté du porteur soumet les êtres faibles.", details: [{ label: 'Domination de masse', text: "En libérant sa volonté, le porteur peut assommer ou paralyser des dizaines voire des centaines d'adversaires faibles simultanément." }, { label: 'Revêtement du Conquérant', text: "Forme ultra-rare révélée à Wano. Shanks et Kaido le pratiquent. Luffy le développe naturellement — les coups créent des éclairs noirs dévastateurs." }, { label: 'Affrontement de volontés', text: "Quand deux porteurs entrent en collision, cela génère des éclairs dorés dans le ciel. Vu lors de Roger vs Whitebeard, Luffy vs Kaido." }], users: ['Roger', 'Whitebeard', 'Shanks', 'Big Mom', 'Kaido', 'Luffy', 'Doflamingo', 'Ace', 'Boa Hancock', 'Rayleigh', 'Yamato', 'Zoro'], rarity: 'Extrêmement Rare', rarityColor: '#fdcb6e' },
]

const MYSTERIES = [
  { emoji: '💎', title: 'Le One Piece', color: '#ffd700', level: 'MAJEUR', desc: "Le trésor légendaire de Gol D. Roger, caché sur Laugh Tale au bout du Grand Line. Sa nature exacte reste inconnue de tous, sauf de Roger et son équipage — qui ont ri en le découvrant.", theories: ["Un héritage de Joy Boy et du Siècle Oublié", "La vérité sur l'histoire du monde effacée par le Gouvernement", "Peut-être pas un objet physique mais une connaissance ou une clé"], status: 'Non résolu' },
  { emoji: '🌑', title: 'Le Siècle Oublié', color: '#a29bfe', level: 'MAJEUR', desc: "100 ans d'histoire effacés des archives mondiales par le Gouvernement Mondial. Seuls les Ponéglyphes indestructibles en gardent la trace. Ohara a été détruite pour avoir cherché à lire cette vérité.", theories: ['Un ancien royaume puissant a été vaincu par les 20 royaumes fondateurs', 'Le Gouvernement cache sa propre origine criminelle', 'Joy Boy était le roi de cet ancien royaume disparu'], status: 'Partiellement révélé (arc Egghead)' },
  { emoji: '🌞', title: 'Joy Boy & son héritier', color: '#fdcb6e', level: 'MAJEUR', desc: "Personnage mythique du Siècle Oublié ayant laissé des excuses gravées sur le Ponéglyphe de Fishman Island. Zounisha affirme attendre le retour de son héritier depuis 800 ans. Luffy est confirmé comme ce successeur lors de l'éveil de son fruit en Gear 5.", theories: ['Joy Boy était lié à Fishman Island et aux habitants de la mer', "Sa promesse concernait la libération des esclaves et des opprimés", "Luffy n'est pas Joy Boy mais son esprit reincorporé dans un nouveau corps"], status: 'Partiellement résolu — Luffy = héritier confirmé' },
  { emoji: '🌀', title: 'Le Hito Hito no Mi — Modèle Nika', color: '#e0524a', level: 'RÉVÉLÉ', desc: "Le fruit de Luffy, officiellement catalogué Gomu Gomu no Mi (Paramecia), est en réalité le Hito Hito no Mi Modèle Nika — un Zoan Mythique. Le Gouvernement Mondial le cherchait depuis 800 ans. Lors de l'éveil, Luffy se transforme en Nika, le Dieu du Soleil.", theories: ["Le fruit choisit lui-même son porteur — il a 'fui' le Gouvernement pendant 800 ans", "Le rire de Luffy (Ha Ha Ha) est identique à celui de Roger et de Nika", "Nika est une figure mythique qui a libéré des esclaves dans le Siècle Oublié"], status: 'Révélé — arc Egghead (Vegapunk)' },
  { emoji: '🩸', title: 'Imu-Sama', color: '#d63031', level: 'MYSTÈRE ACTIF', desc: "Silhouette mystérieuse siégeant sur le Trône Vide au Pangée Fortress. Semble être le véritable chef suprême du monde, au-dessus des 5 Dieux de la Sagesse. Imu possède l'arme ultime et a décidé seul de l'effacement de Lulusia.", theories: ["Imu est immortel depuis le Siècle Oublié — peut-être via l'Ope Ope no Mi", "Imu est directement lié à Joy Boy — soit son ennemi, soit quelqu'un qui lui a survécu", 'Imu pourrait être une femme (certaines cases le suggèrent)'], status: 'Non résolu — révélations en cours' },
  { emoji: '📜', title: 'Le Rio Ponéglyphe', color: '#00b894', level: 'MAJEUR', desc: "L'histoire complète du Siècle Oublié est fragmentée en 4 Ponéglyphes 'Rio' dispersés dans le monde. Roger était la seule personne à pouvoir les 'entendre' sans les lire. Nico Robin a pour destin de les lire et de révéler cette vérité au monde entier.", theories: ["Les 4 Ponéglyphes révèlent la localisation de Laugh Tale combinés", 'La vérité du Siècle Oublié renverserait le Gouvernement Mondial', "Roger a pleuré en comprenant qu'il était né trop tôt pour accomplir la promesse de Joy Boy"], status: "Non résolu — Robin doit les assembler" },
  { emoji: '🧬', title: 'La Volonté du D.', color: '#6c5ce7', level: 'MAJEUR', desc: "Les porteurs du 'D' dans leur nom semblent partager un destin particulier. Les Dieux de la Sagesse craignent les 'D' et les appellent 'ennemis naturels des Dieux'. Roger l'appelait 'la Volonté'. Les personnages 'D' sourient souvent face à la mort.", theories: ["Le 'D' signifie 'Dawn' (Aube) — les porteurs apporteront l'aube au monde", "Ils sont les descendants de l'ancien royaume vaincu lors du Siècle Oublié", "Chaque 'D' porte inconsciemment la volonté de Joy Boy et se bat pour la liberté"], status: 'Partiellement révélé' },
  { emoji: '🏴‍☠️', title: 'Le dernier message de Roger', color: '#e17055', level: 'RÉVÉLÉ', desc: '"Je ne meurs pas, mes nakamas. Avant de mourir, j\'ai tout mis dans un seul endroit. Si vous voulez, allez le chercher. Je l\'ai tout laissé là-bas." — Gol D. Roger. Cette phrase a déclenché la Grande Ère des Pirates.', theories: ["Roger a délibérément lancé l'Ère des Pirates pour trouver le successeur de Joy Boy", "Il espérait que quelqu'un 'né dans la mauvaise époque' accomplirait ce qu'il ne pouvait pas", "Barbe Noire et Luffy sont les deux héritiers possibles — liberté vs ténèbres"], status: 'Révélé — arc Logue Town' },
]

const W = 'https://static.wikia.nocookie.net/onepiece/images'
const FRUITS = [
  { name: 'Gomu Gomu no Mi',        type: 'Paramecia', user: 'Monkey D. Luffy',   color: '#e0524a', emoji: '🌀', power: 'Corps élastique comme le caoutchouc. En Gear 5, transformation en Nika le Dieu Soleil.',                                 rare: false, image: `${W}/6/6d/Monkey_D._Luffy_Anime_Post_Timeskip_Infobox.png/revision/latest/scale-to-width-down/200` },
  { name: 'Mera Mera no Mi',         type: 'Logia',     user: 'Portgas D. Ace',    color: '#ff6b35', emoji: '🔥', power: 'Contrôle total du feu. Génère et devient des flammes. Dégâts catastrophiques.',                                         rare: false, image: `${W}/0/08/Portgas_D._Ace_Anime_Infobox.png/revision/latest/scale-to-width-down/200` },
  { name: 'Hie Hie no Mi',           type: 'Logia',     user: 'Aokiji',            color: '#74b9ff', emoji: '❄️', power: "Congèle tout ce qu'il touche. Peut geler la mer entière. Contrecarre le feu.",                                          rare: false, image: `${W}/6/68/Kuzan_Anime_Post_Timeskip_Infobox.png/revision/latest/scale-to-width-down/200` },
  { name: 'Yami Yami no Mi',         type: 'Logia',     user: 'Barbe Noire',       color: '#636e72', emoji: '🌑', power: 'Fruit le plus sombre. Attire et nul les autres pouvoirs. Douleur amplifiée.',                                            rare: true,  image: `${W}/2/25/Marshall_D._Teach_Anime_Post_Timeskip_Infobox.png/revision/latest/scale-to-width-down/200` },
  { name: 'Ope Ope no Mi',           type: 'Paramecia', user: 'Trafalgar Law',     color: '#00b894', emoji: '⚕️', power: "Crée un \"Room\" opératoire. Peut restructurer tout ce qui est à l'intérieur. Don de l'immortalité possible.",          rare: true,  image: `${W}/8/84/Trafalgar_D._Water_Law_Anime_Post_Timeskip_Infobox.png/revision/latest/scale-to-width-down/200` },
  { name: 'Hana Hana no Mi',         type: 'Paramecia', user: 'Nico Robin',        color: '#fd79a8', emoji: '🌸', power: "Fait pousser des répliques de membres sur n'importe quelle surface.",                                                   rare: false, image: `${W}/b/b3/Nico_Robin_Anime_Post_Timeskip_Infobox.png/revision/latest/scale-to-width-down/200` },
  { name: 'Gura Gura no Mi',         type: 'Paramecia', user: 'Barbe Blanche',     color: '#a29bfe', emoji: '💥', power: 'Fruit le plus puissant des Paramecia. Génère des tremblements de terre. Peut détruire le monde.',                        rare: true,  image: `${W}/6/6e/Edward_Newgate_Anime_Infobox.png/revision/latest/scale-to-width-down/200` },
  { name: 'Pika Pika no Mi',         type: 'Logia',     user: 'Kizaru',            color: '#fdcb6e', emoji: '⚡', power: 'Vitesse de la lumière. Coups de lasers dévastateurs. Quasi-invincible.',                                                rare: true,  image: `${W}/6/66/Borsalino_Anime_Post_Timeskip_Infobox.png/revision/latest/scale-to-width-down/200` },
  { name: 'Magu Magu no Mi',         type: 'Logia',     user: 'Akainu',            color: '#d63031', emoji: '🌋', power: "Magma brûlant tout, même le feu. Température la plus haute parmi les Logia.",                                           rare: true,  image: `${W}/2/25/Sakazuki_Anime_Post_Timeskip_Infobox.png/revision/latest/scale-to-width-down/200` },
  { name: 'Suke Suke no Mi',         type: 'Paramecia', user: 'Absalom / Shiryu',  color: '#81ecec', emoji: '👻', power: "Invisibilité totale de soi-même et de tout ce qu'on touche.",                                                          rare: false, image: `${W}/a/a2/Absalom_Anime_Infobox.png/revision/latest/scale-to-width-down/200` },
  { name: 'Doku Doku no Mi',         type: 'Paramecia', user: 'Magellan',          color: '#6c5ce7', emoji: '☠️', power: 'Génère et contrôle tous types de poisons. Un seul contact est fatal sans antidote.',                                    rare: false, image: `${W}/2/25/Magellan_Anime_Post_Timeskip_Infobox.png/revision/latest/scale-to-width-down/200` },
  { name: 'Bari Bari no Mi',         type: 'Paramecia', user: 'Bartolomeo',        color: '#00cec9', emoji: '🛡️', power: "Barrières indestructibles. Peut bloquer n'importe quelle attaque, même des coups de Yonkou.",                          rare: false, image: `${W}/1/16/Bartolomeo_Anime_Post_Timeskip_Infobox.png/revision/latest/scale-to-width-down/200` },
  { name: 'Zoan Uo Uo no Mi',        type: 'Zoan',      user: 'Kaidou',            color: '#8e44ad', emoji: '🐉', power: "Transformation en dragon oriental gigantesque. Maîtrise totale des éléments.",                                          rare: true,  image: `${W}/c/c3/Kaidou_Anime_Infobox.png/revision/latest/scale-to-width-down/200` },
  { name: 'Tori Tori no Mi (Phénix)',type: 'Zoan',      user: 'Marco',             color: '#0984e3', emoji: '🔵', power: "Transformation en phénix légendaire. Flammes bleues de régénération.",                                                  rare: true,  image: `${W}/a/a0/Marco_Anime_Post_Timeskip_Infobox.png/revision/latest/scale-to-width-down/200` },
  { name: 'Niku Niku no Mi',         type: 'Paramecia', user: 'Jewelry Bonney',    color: '#e17055', emoji: '⌛', power: "Contrôle l'âge de toute cible touchée. Peut vieillir ou rajeunir instantanément.",                                      rare: true,  image: `${W}/f/f4/Jewelry_Bonney_Anime_Post_Timeskip_Infobox.png/revision/latest/scale-to-width-down/200` },
]

const TYPE_COLORS = {
  Paramecia: { bg: 'rgba(116,185,255,0.15)', border: 'rgba(116,185,255,0.35)', text: '#74b9ff' },
  Logia:     { bg: 'rgba(253,203,110,0.15)', border: 'rgba(253,203,110,0.35)', text: '#fdcb6e' },
  Zoan:      { bg: 'rgba(255,118,117,0.15)', border: 'rgba(255,118,117,0.35)', text: '#ff7675' },
}

const CHARACTERS = {
  mugiwara: [
    { name: 'Monkey D. Luffy', role: 'Capitaine', fruit: 'Hito Hito no Mi — Nika', haki: ['Observation', 'Armement', 'Conquérant'], prime: '3 000 000 000', emoji: '🌀', color: '#e0524a' },
    { name: 'Roronoa Zoro', role: 'Premier Maître / Épéiste', fruit: null, haki: ['Observation', 'Armement', 'Conquérant'], prime: '1 111 000 000', emoji: '⚔️', color: '#22b573' },
    { name: 'Nami', role: 'Navigatrice', fruit: null, haki: null, prime: '366 000 000', emoji: '🌩️', color: '#fdcb6e' },
    { name: 'Usopp', role: "Tireur d'élite", fruit: null, haki: ['Observation'], prime: '500 000 000', emoji: '🎯', color: '#f9ca24' },
    { name: 'Sanji', role: 'Cuisinier', fruit: null, haki: ['Observation', 'Armement', 'Conquérant'], prime: '1 032 000 000', emoji: '🔥', color: '#0652DD' },
    { name: 'Tony Tony Chopper', role: 'Médecin', fruit: 'Hito Hito no Mi', haki: null, prime: '1 000', emoji: '🦌', color: '#fd79a8' },
    { name: 'Nico Robin', role: 'Archéologue', fruit: 'Hana Hana no Mi', haki: ['Observation', 'Armement'], prime: '930 000 000', emoji: '🌸', color: '#a29bfe' },
    { name: 'Franky', role: 'Charpentier', fruit: null, haki: null, prime: '394 000 000', emoji: '🤖', color: '#00b894' },
    { name: 'Brook', role: 'Musicien', fruit: 'Yomi Yomi no Mi', haki: ['Armement'], prime: '383 000 000', emoji: '💀', color: '#dfe6e9' },
    { name: 'Jinbei', role: 'Timonier', fruit: null, haki: ['Observation', 'Armement'], prime: '1 100 000 000', emoji: '🐟', color: '#0984e3' },
  ],
  yonko: [
    { name: 'Shanks le Roux', role: 'Yonko', fruit: null, haki: ['Observation', 'Armement', 'Conquérant'], prime: '4 048 900 000', emoji: '🌊', color: '#e0524a', note: "L'un des plus grands Haki du monde" },
    { name: 'Marshall D. Teach', role: 'Yonko (Barbe Noire)', fruit: 'Yami Yami + Gura Gura no Mi', haki: ['Armement'], prime: '3 996 000 000', emoji: '🌑', color: '#636e72', note: 'Seul humain à posséder 2 Fruits du Démon' },
    { name: 'Monkey D. Luffy', role: 'Yonko', fruit: 'Hito Hito no Mi — Nika', haki: ['Obs.', 'Arm.', 'Conq.'], prime: '3 000 000 000', emoji: '🌀', color: '#e0524a', note: 'Successeur de Joy Boy' },
    { name: 'Kaidou (ancien)', role: 'Ancien Yonko', fruit: 'Uo Uo no Mi — Seiryu', haki: ['Obs.', 'Arm.', 'Conq.'], prime: '4 611 100 000', emoji: '🐉', color: '#8e44ad', note: 'Vaincu à Wano par Luffy en Gear 5' },
    { name: 'Charlotte Linlin', role: 'Ancienne Yonko (Big Mom)', fruit: 'Soru Soru no Mi', haki: ['Obs.', 'Arm.', 'Conq.'], prime: '4 388 000 000', emoji: '🎂', color: '#fd79a8', note: 'Emprisonnée à Impel Down' },
    { name: 'Barbe Blanche (historique)', role: 'Ancien Yonko', fruit: 'Gura Gura no Mi', haki: ['Obs.', 'Arm.', 'Conq.'], prime: '5 046 000 000', emoji: '💥', color: '#a29bfe', note: '"Le plus fort de tous les temps" selon Roger' },
  ],
  amiraux: [
    { name: 'Akainu (Sakazuki)', role: 'Amiral en Chef', fruit: 'Magu Magu no Mi', haki: ['Armement', 'Observation'], prime: '—', emoji: '🌋', color: '#d63031', note: 'Magma — le plus chaud de tous les Logia' },
    { name: 'Aokiji (Kuzan)', role: 'Ancien Amiral', fruit: 'Hie Hie no Mi', haki: ['Armement', 'Observation'], prime: '—', emoji: '❄️', color: '#74b9ff', note: 'Déserteur — maintenant lié à Barbe Noire' },
    { name: 'Kizaru (Borsalino)', role: 'Amiral', fruit: 'Pika Pika no Mi', haki: ['Armement', 'Observation'], prime: '—', emoji: '⚡', color: '#fdcb6e', note: 'Lumière — vitesse absolue' },
    { name: 'Fujitora (Issho)', role: 'Amiral', fruit: 'Zushi Zushi no Mi', haki: ['Observation', 'Armement'], prime: '—', emoji: '🌌', color: '#a29bfe', note: 'Gravité — aveugle par choix' },
    { name: 'Ryokugyu (Aramaki)', role: 'Amiral', fruit: 'Mori Mori no Mi', haki: ['Armement'], prime: '—', emoji: '🌿', color: '#00b894', note: "N'a pas mangé depuis 3 ans" },
  ],
  shichibukai: [
    { name: 'Dracule Mihawk', role: 'Ancien Shichibukai', fruit: null, haki: ['Observation', 'Armement'], prime: '3 590 000 000', emoji: '🗡️', color: '#e17055', note: 'Yoru — la plus grande épée du monde' },
    { name: 'Boa Hancock', role: 'Ancienne Shichibukai', fruit: 'Mero Mero no Mi', haki: ['Observation', 'Armement', 'Conquérant'], prime: '1 659 000 000', emoji: '💗', color: '#fd79a8', note: "Impératrice Serpent — Île des Femmes" },
    { name: 'Doflamingo', role: 'Ancien Shichibukai', fruit: 'Ito Ito no Mi', haki: ['Armement', 'Conquérant'], prime: '340 000 000', emoji: '🪡', color: '#d63031', note: 'Emprisonné à Impel Down après Dressrosa' },
    { name: 'Bartholomew Kuma', role: 'Ancien Shichibukai', fruit: 'Nikyu Nikyu no Mi', haki: ['Armement'], prime: '296 000 000', emoji: '🐻', color: '#636e72', note: 'A sacrifié son humanité pour le Dr Vegapunk' },
    { name: 'Jinbei', role: 'Ancien Shichibukai', fruit: null, haki: ['Observation', 'Armement'], prime: '1 100 000 000', emoji: '🐟', color: '#0984e3', note: "Maintenant timonier de l'équipage de Luffy" },
    { name: 'Trafalgar D. Water Law', role: 'Ancien Shichibukai', fruit: 'Ope Ope no Mi', haki: ['Observation', 'Armement'], prime: '3 000 000 000', emoji: '⚕️', color: '#00b894', note: 'Alliance avec Luffy — Dressrosa et Wano' },
    { name: 'Gecko Moria', role: 'Ancien Shichibukai', fruit: 'Kage Kage no Mi', haki: null, prime: '320 000 000', emoji: '👥', color: '#6c5ce7', note: 'Vaincu à Thriller Bark — disparu ensuite' },
  ],
}

const ARCS = [
  { id: 1, name: 'Romance Dawn', saga: 'East Blue', ep: '1–3', ch: '1–7', emoji: '🏴‍☠️', color: '#e0524a', resume: "Luffy part à la conquête du Grand Line avec son rêve de devenir Roi des Pirates. Sa rencontre avec Koby marque le début d'une aventure légendaire.", chars: ['Luffy', 'Koby', 'Alvida', 'Morgan'], spoiler: false },
  { id: 2, name: 'Orange Town', saga: 'East Blue', ep: '4–8', ch: '8–21', emoji: '🍊', color: '#e17055', resume: 'Luffy rencontre Zoro, prisonnier d\'un Marine. Puis une navigatrice mystérieuse nommée Nami. Ensemble ils affrontent les pirates de Buggy le Clown.', chars: ['Luffy', 'Zoro', 'Nami', 'Buggy'], spoiler: false },
  { id: 3, name: 'Île de Syrop', saga: 'East Blue', ep: '9–18', ch: '22–41', emoji: '🎯', color: '#f9ca24', resume: "Dans un village paisible, un tire-au-flanc qui se révèle être un héros — Usopp rejoint l'équipage. Affrontement contre les Pirates du Renard Noir.", chars: ['Usopp', 'Kuro'], spoiler: false },
  { id: 4, name: 'Baratie', saga: 'East Blue', ep: '19–30', ch: '42–68', emoji: '🍽️', color: '#0652DD', resume: "Un restaurant flottant, un cuisinier qui ne veut pas être pirate. Sanji rejoint l'équipage après une confrontation décisive contre Don Krieg.", chars: ['Sanji', 'Zeff', 'Don Krieg', 'Mihawk'], spoiler: false },
  { id: 5, name: 'Arlong Park', saga: 'East Blue', ep: '31–45', ch: '69–95', emoji: '🦈', color: '#00b894', resume: "L'arc qui révèle le vrai passé de Nami et la tyrannie d'Arlong sur son village. Un arc émotionnel avec l'un des moments les plus iconiques de la série.", chars: ['Nami', 'Arlong', 'Nojiko'], spoiler: false },
  { id: 6, name: 'Loguetown', saga: 'East Blue', ep: '45–53', ch: '96–100', emoji: '⚓', color: '#636e72', resume: "La ville de la naissance et de la mort de Roger. Luffy se retrouve sur la plateforme d'exécution du Roi des Pirates. Rencontre avec Smoker et une silhouette mystérieuse.", chars: ['Smoker', 'Dragon'], spoiler: false },
  { id: 7, name: 'Alabasta', saga: 'Alabasta Saga', ep: '92–130', ch: '155–217', emoji: '🏜️', color: '#fdcb6e', resume: "Le désert, un royaume au bord de la guerre civile, et un homme mystérieux qui tire les ficelles dans l'ombre. L'arc Alabasta reste l'un des plus épiques du début.", chars: ['Vivi', 'Crocodile', 'Robin', 'Bon Clay'], spoiler: false },
  { id: 8, name: 'Skypiea', saga: 'Sky Island Saga', ep: '144–195', ch: '237–302', emoji: '☁️', color: '#74b9ff', resume: "Une île dans les nuages, un faux dieu qui règne par la terreur, et l'histoire oubliée d'un guerrier. L'arc le plus riche en lore du début de série.", chars: ['Enel', 'Wyper', 'Conis'], spoiler: false },
  { id: 9, name: 'Water 7 / Enies Lobby', saga: 'Water 7 Saga', ep: '228–325', ch: '322–441', emoji: '🌊', color: '#0984e3', resume: "La ville sur l'eau, la trahison apparente d'un nakama et l'assaut d'une forteresse gouvernementale. L'un des arcs les plus acclamés de l'histoire du manga.", chars: ['Robin', 'Franky', 'Lucci', 'CP9'], spoiler: false },
  { id: 10, name: 'Thriller Bark', saga: 'Thriller Bark Saga', ep: '326–384', ch: '442–489', emoji: '💀', color: '#6c5ce7', resume: "Une île fantôme dans le Florian Triangle, des zombies, et Gecko Moria qui vole les ombres. Brook rejoint l'équipage après une histoire de promesse tenue.", chars: ['Brook', 'Moria', 'Perona', 'Kuma'], spoiler: false },
  { id: 11, name: 'Sabaody Archipelago', saga: 'Summit War Saga', ep: '385–405', ch: '490–513', emoji: '🫧', color: '#fd79a8', resume: "L'archipel des bulles avant le Nouveau Monde. L'équipage affronte une réalité brutale — et se retrouve séparé de façon déchirante face aux plus grandes puissances.", chars: ['Rayleigh', 'Kizaru', 'Hachi'], spoiler: false },
  { id: 12, name: 'Impel Down', saga: 'Summit War Saga', ep: '422–458', ch: '525–549', emoji: '⛓️', color: '#d63031', resume: "La plus grande prison du monde, six niveaux de l'enfer. Luffy l'infiltre seul. Des alliances inattendues se forment dans les profondeurs.", chars: ['Magellan', 'Ivankov', 'Crocodile', 'Jinbei'], spoiler: false },
  { id: 13, name: 'Marineford', saga: 'Summit War Saga', ep: '457–489', ch: '550–580', emoji: '⚓', color: '#e0524a', resume: "La Guerre du Sommet — l'arc le plus dévastateur de la saga. Toutes les plus grandes puissances s'affrontent dans une bataille qui changera l'histoire à jamais.", chars: ['Ace', 'Barbe Blanche', 'Akainu', 'Shanks'], spoiler: true },
  { id: 14, name: 'Dressrosa', saga: 'Dressrosa Saga', ep: '629–746', ch: '700–801', emoji: '🌹', color: '#e17055', resume: "Un royaume sous l'emprise d'un ancien Shichibukai, un tournoi de combattants du monde entier, et des jouets qui cachent un secret tragique.", chars: ['Doflamingo', 'Law', 'Rebecca', 'Kyros'], spoiler: false },
  { id: 15, name: 'Whole Cake Island', saga: 'Whole Cake Island Saga', ep: '783–877', ch: '825–902', emoji: '🎂', color: '#fd79a8', resume: "Le territoire de Big Mom — une île sucrée qui cache une réalité terrifiante. L'arc révèle les origines de Sanji et le pouvoir des Vinsmoke.", chars: ['Big Mom', 'Sanji', 'Pudding', 'Katakuri'], spoiler: false },
  { id: 16, name: 'Wano', saga: 'Wano Saga', ep: '890–1085', ch: '909–1057', emoji: '🗾', color: '#8e44ad', resume: "Le pays de Wano sous la tyrannie de Kaidou. La coalition la plus massive de l'histoire de la série se forme pour une bataille épique qui révèle des vérités anciennes.", chars: ['Kaidou', 'Yamato', 'Kinemon', 'Momonosuke'], spoiler: false },
  { id: 17, name: 'Egghead', saga: 'Saga Finale', ep: '1086+', ch: '1058+', emoji: '🔬', color: '#00b894', resume: "L'île du futur — laboratoire du Dr Vegapunk. Des révélations majeures sur l'histoire du monde et l'identité d'Imu-Sama commencent à émerger.", chars: ['Vegapunk', 'Kizaru', 'Lucci', 'Bonney'], spoiler: false },
  { id: 18, name: 'Elbaf', saga: 'Saga Finale', ep: '?', ch: '1127+', emoji: '⚡', color: '#ffd700', resume: "L'île des géants légendaires. Un arc en cours qui promet des révélations majeures liées à l'histoire ancienne et à l'équipage de Roger.", chars: ['Shanks', 'Dorry', 'Brogy', 'Usopp'], spoiler: false },
]

const BOUNTIES = [
  { rank: 1,  name: 'Gol D. Roger',          prime: '5 564 800 000', emoji: '👑', color: '#ffd700', group: 'Historique',    note: 'Roi des Pirates — exécuté à Logue Town' },
  { rank: 2,  name: 'Barbe Blanche',          prime: '5 046 000 000', emoji: '💥', color: '#a29bfe', group: 'Historique',    note: '"Le plus fort de son vivant"' },
  { rank: 3,  name: 'Kaidou',                 prime: '4 611 100 000', emoji: '🐉', color: '#8e44ad', group: 'Ancien Yonko', note: 'Vaincu à Wano par Luffy en Gear 5' },
  { rank: 4,  name: 'Charlotte Linlin',       prime: '4 388 000 000', emoji: '🎂', color: '#fd79a8', group: 'Ancien Yonko', note: 'Emprisonnée à Impel Down' },
  { rank: 5,  name: 'Shanks',                 prime: '4 048 900 000', emoji: '🌊', color: '#e0524a', group: 'Yonko',         note: 'Roux de Roger — Yonko actuel' },
  { rank: 6,  name: 'Marshall D. Teach',      prime: '3 996 000 000', emoji: '🌑', color: '#636e72', group: 'Yonko',         note: '2 Fruits du Démon — Barbe Noire' },
  { rank: 7,  name: 'Dracule Mihawk',         prime: '3 590 000 000', emoji: '🗡️', color: '#e17055', group: 'Corsaires',     note: 'Meilleur épéiste du monde' },
  { rank: 8,  name: 'Monkey D. Luffy',        prime: '3 000 000 000', emoji: '🌀', color: '#e0524a', group: 'Mugiwara',      note: 'Yonko — Successeur de Joy Boy' },
  { rank: 9,  name: 'Trafalgar D. Water Law', prime: '3 000 000 000', emoji: '⚕️', color: '#00b894', group: 'Supernovas',    note: 'Ex-Shichibukai — Heart Pirates' },
  { rank: 10, name: 'Eustass Kid',            prime: '3 000 000 000', emoji: '🔧', color: '#d63031', group: 'Supernovas',    note: 'Vaincu par Shanks à Elbaf' },
  { rank: 11, name: 'Boa Hancock',            prime: '1 659 000 000', emoji: '💗', color: '#fd79a8', group: 'Autre',         note: 'Impératrice Serpent' },
  { rank: 12, name: 'Roronoa Zoro',           prime: '1 111 000 000', emoji: '⚔️', color: '#22b573', group: 'Mugiwara',      note: 'Vise le titre de Mihawk' },
  { rank: 13, name: 'Jinbei',                 prime: '1 100 000 000', emoji: '🐟', color: '#0984e3', group: 'Mugiwara',      note: 'Ancien Shichibukai — Timonier' },
  { rank: 14, name: 'Sanji',                  prime: '1 032 000 000', emoji: '🔥', color: '#0652DD', group: 'Mugiwara',      note: 'Vinsmoke Sanji — Cuisinier' },
  { rank: 15, name: 'Usopp',                  prime: '500 000 000',   emoji: '🎯', color: '#f9ca24', group: 'Mugiwara',      note: 'Dieu Usopp — héros de Dressrosa' },
]

const TIMELINE_EVENTS = [
  { year: -800, label: 'Siècle Oublié', desc: "Joy Boy fait une promesse à Fishman Island. L'ancien royaume est vaincu par les 20 royaumes fondateurs. Création du Gouvernement Mondial.", color: '#6c5ce7', major: true },
  { year: -800, label: 'Ponéglyphes créés', desc: "Les alliés de l'ancien royaume gravent l'histoire dans des rochers indestructibles pour transmettre la vérité aux générations futures.", color: '#a29bfe', major: false },
  { year: -53, label: 'Naissance de Roger', desc: "Gol D. Roger naît à Logue Town. Il sera plus tard le premier à conquérir le Grand Line et trouver le One Piece.", color: '#ffd700', major: false },
  { year: -28, label: 'Roger conquiert le Grand Line', desc: "L'équipage de Roger atteint Laugh Tale, découvre le One Piece et la vérité du Siècle Oublié. Roger pleure en apprenant qu'il est né trop tôt.", color: '#ffd700', major: true },
  { year: -27, label: 'Exécution de Roger', desc: '"Je ne meurs pas, mes nakamas." — Place de Logue Town. Cette phrase déclenche la Grande Ère des Pirates.', color: '#e0524a', major: true },
  { year: -26, label: 'Naissance de Shanks', desc: "Shanks est trouvé enfant dans un coffre sur un navire ennemi — par Roger lui-même. Il grandit dans l'équipage.", color: '#e0524a', major: false },
  { year: -24, label: 'Naissance de Luffy', desc: "Monkey D. Luffy naît à Foosha Village. Son père est Monkey D. Dragon, chef de l'Armée Révolutionnaire.", color: '#22b573', major: false },
  { year: -22, label: 'Incendie d\'Ohara', desc: "Le Gouvernement Mondial détruit Ohara pour empêcher la révélation du Siècle Oublié. Seule Nico Robin survit — à 8 ans.", color: '#d63031', major: true },
  { year: -12, label: 'Luffy mange son Fruit', desc: "Luffy mange accidentellement le Gomu Gomu no Mi (en réalité le Hito Hito no Mi — Nika) et perd sa capacité à nager.", color: '#e0524a', major: false },
  { year: -2, label: 'Début du voyage', desc: "Luffy quitte Foosha Village à bord d'un tonneau. Son aventure commence officiellement.", color: '#22b573', major: true },
  { year: 0, label: 'Présent — Saga Finale', desc: "Arc Elbaf en cours. Les vérités ultimes du monde One Piece commencent à se révéler.", color: '#fdcb6e', major: true },
]

const MONDE_DATA = {
  gouvernement: { title: 'Gouvernement Mondial', emoji: '🌐', color: '#e0524a', desc: "Coalition de 170 royaumes fondée il y a 800 ans par les 20 familles fondatrices. Siège sur Marie Geoise, au sommet du Red Line. Contrôle la Marine, le Cipher Pol et les Shichibukai.", entites: [{ name: 'Cinq Dieux de la Sagesse', desc: "Les cinq dirigeants officiels — une façade derrière laquelle Imu-Sama exerce le vrai pouvoir." }, { name: 'Cipher Pol', desc: "Services de renseignement du Gouvernement. CP9 est le plus connu, CP0 le plus redouté — opèrent dans l'ombre." }, { name: 'La Marine', desc: "Bras armé du Gouvernement. Quartier Général historique à Marineford — aujourd'hui G-1 dans le New World." }, { name: 'Celestial Dragons', desc: "Descendants des 20 familles fondatrices. Vivent dans une bulle d'oxygène pur à Marie Geoise et traitent les humains comme du bétail." }] },
  armes: { title: 'Armes Anciennes', emoji: '⚔️', color: '#fdcb6e', desc: "Trois armes d'une puissance apocalyptique, mentionnées dans les Ponéglyphes. Leur existence est l'une des raisons pour lesquelles le Gouvernement redoute les archéologues.", entites: [{ name: 'Pluton', desc: "Navire de guerre gigantesque construit par les anciens charpentiers de Water Seven. Sa puissance peut détruire une île entière." }, { name: 'Poseidon', desc: "Capable de contrôler les Sea Kings — les créatures marines les plus puissantes. La Princesse Shirahoshi est la réincarnation de Poseidon." }, { name: 'Uranus', desc: "L'arme la plus mystérieuse des trois. Aucune description confirmée. Peut-être liée à Imu-Sama — utilisée pour effacer Lulusia." }] },
  races: { title: 'Races du Monde', emoji: '🌈', color: '#a29bfe', desc: "L'univers One Piece est habité par de nombreuses races aux caractéristiques uniques, souvent discriminées par le Gouvernement Mondial.", entites: [{ name: 'Hommes-Poissons (Fishmen)', desc: "Dix fois la force d'un humain dans l'eau. Capables de respirer sous l'eau. Longtemps victimes d'esclavage et de discrimination." }, { name: 'Minks', desc: "Humanoïdes couverts de fourrure. Vivent sur Zou. Tous maîtrisent naturellement le Sulong sous la pleine lune." }, { name: 'Lunarians', desc: "Race quasi-éteinte capable de survivre dans n'importe quel environnement. Jadis adorés comme des dieux. King est l'un des derniers." }, { name: 'Géants', desc: "Deux à cinq fois la taille d'un humain. Vivent principalement à Elbaf — civilisation guerrière basée sur l'honneur." }, { name: 'Seraphim', desc: "Clones génétiques Lunarians hybrides créés par Vegapunk. Les armes biologiques les plus puissantes jamais créées." }, { name: 'Kuja', desc: "Tribu de guerrières vivant sur l'Île des Femmes. Maîtresses du Haki — Boa Hancock en est l'impératrice." }] },
  technologies: { title: 'Technologies', emoji: '🔬', color: '#00b894', desc: "L'univers One Piece possède des technologies étonnamment avancées dans certains domaines, contrastant avec son esthétique maritime.", entites: [{ name: 'Pacifista', desc: "Cyborgs modèles Bartholomew Kuma. Capables de tirer des rayons lumineux. La première génération était redoutée des Shichibukai." }, { name: 'Seraphim (S-Serie)', desc: "Successeurs des Pacifista — clones Lunarians hybrides. S-Bear, S-Shark, S-Snake... quasi-indestructibles." }, { name: 'Den Den Mushi', desc: "Escargots vivants qui servent de téléphones. Petits (comm.), grands (masse), noirs (intraçables), or (lignes gouvernementales)." }, { name: 'Seastone (Kairōseki)', desc: "Minerai marin qui reproduit l'énergie de la mer profonde. Annule les pouvoirs des Fruits du Démon." }] },
}

const THEORIES = [
  { title: 'Shanks est un Céleste Dragon', emoji: '🌊', color: '#e0524a', credibility: 82, desc: "Shanks a été vu enfant dans les bras de Roger — il aurait été récupéré d'un coffre sur un navire ennemi. Certains pensent qu'il est un descendant des Celestial Dragons qui a choisi la mer.", votes: 1240 },
  { title: "Le One Piece est l'histoire du Siècle Oublié", emoji: '💎', color: '#ffd700', credibility: 88, desc: "Roger et son équipage ont ri en trouvant le One Piece. La vérité sur l'histoire effacée, sous forme de document ou de preuve, pourrait faire 'rire' ceux qui comprennent l'ironie de la situation.", votes: 2100 },
  { title: "Barbe Noire avait le Yami Yami no Mi depuis longtemps", emoji: '🌑', color: '#636e72', credibility: 75, desc: "La blessure laissée sur le visage de Shanks ne peut être faite que par quelqu'un qui neutralise le Haki. Teach aurait eu le Yami Yami no Mi bien avant d'avoir 'tué' Thatch.", votes: 987 },
  { title: 'Imu-Sama est immortel depuis le Siècle Oublié', emoji: '🩸', color: '#d63031', credibility: 70, desc: "Imu possède une longévité inexpliquée depuis 800 ans. Peut-être via l'Ope Ope no Mi — le 'Don de l'Immortalité' qui coûte la vie à celui qui le pratique.", votes: 1560 },
  { title: "Uranus est l'arme qu'Imu a utilisée sur Lulusia", emoji: '⚔️', color: '#a29bfe', credibility: 60, desc: "L'arme ancienne Uranus n'a jamais été localisée. Le rayon mystérieux qui a détruit Lulusia vient du ciel — certains pensent qu'il s'agit d'Uranus, caché à Marie Geoise.", votes: 870 },
  { title: "Luffy n'est pas Joy Boy — c'est son ère", emoji: '🌀', color: '#fdcb6e', credibility: 72, desc: "Joy Boy est une époque, pas une personne. Luffy incarne l'esprit de Joy Boy mais n'est pas sa réincarnation. C'est 'l'heure de Joy Boy' qui revient — pas l'homme lui-même.", votes: 1560 },
]

// ─────────────────────────────────────────────────────────────────────────────
// COMPOSANTS
// ─────────────────────────────────────────────────────────────────────────────

const LEGEND_COUNT = FRUITS.filter(f => f.rare).length

function useCountUp(target, duration = 1600, delay = 500) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    let raf
    const t = setTimeout(() => {
      const start = performance.now()
      const tick = now => {
        const p = Math.min((now - start) / duration, 1)
        setVal(Math.round((1 - Math.pow(1 - p, 3)) * target))
        if (p < 1) raf = requestAnimationFrame(tick)
      }
      raf = requestAnimationFrame(tick)
    }, delay)
    return () => { clearTimeout(t); cancelAnimationFrame(raf) }
  }, [target, duration, delay])
  return val
}

function StatPill({ value, label, color = '#e0524a' }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, minWidth: 90 }}>
      <span style={{ fontFamily: 'var(--display)', fontWeight: 900, fontSize: 40, lineHeight: 1, color }}>{value}</span>
      <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)' }}>{label}</span>
    </div>
  )
}

function FruitCard({ fruit, index }) {
  const [flipped, setFlipped] = useState(false)
  const [hovered, setHovered] = useState(false)
  const tc = TYPE_COLORS[fruit.type] || TYPE_COLORS.Paramecia
  return (
    <div onClick={() => setFlipped(f => !f)} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{ position: 'relative', height: 220, cursor: 'pointer', perspective: 900, animation: `fadeUp 0.45s ${index * 0.04}s ease-out both` }}>
      <div style={{ position: 'relative', width: '100%', height: '100%', transformStyle: 'preserve-3d', WebkitTransformStyle: 'preserve-3d', transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)', transition: 'transform 0.5s ease' }}>
        <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(145deg, ${fruit.color}30 0%, ${fruit.color}10 50%, rgba(14,14,16,0.88) 100%)`, border: `1px solid ${hovered ? fruit.color + '65' : fruit.color + '30'}`, borderRadius: 16, padding: '20px 18px', backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', boxShadow: hovered ? `0 8px 32px ${fruit.color}30` : `0 2px 12px ${fruit.color}12`, transition: 'all 0.22s ease', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 38, marginBottom: 10 }}>{fruit.emoji}</div>
            <div style={{ fontWeight: 700, fontSize: 15, color: '#fff', marginBottom: 8, lineHeight: 1.3 }}>{fruit.name}</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '2px 8px', borderRadius: 20, background: tc.bg, color: tc.text, border: `1px solid ${tc.border}` }}>{fruit.type}</span>
              {fruit.rare && <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: 'rgba(255,215,0,0.15)', color: '#ffd700', border: '1px solid rgba(255,215,0,0.35)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Légendaire</span>}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}><span style={{ fontSize: 10, color: fruit.color, fontWeight: 700, opacity: 0.8 }}>Pouvoir ↺</span></div>
        </div>
        <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(145deg, ${fruit.color}38 0%, ${fruit.color}16 60%, rgba(14,14,16,0.92) 100%)`, border: `1px solid ${fruit.color}55`, borderRadius: 16, backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', transform: 'rotateY(180deg)', overflow: 'hidden' }}>
          {fruit.image && <img src={fruit.image} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top', opacity: 0.14, pointerEvents: 'none' }} onError={e => { e.currentTarget.style.display = 'none' }} />}
          <div style={{ position: 'relative', zIndex: 1, padding: '18px', height: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 10 }}>
            <div style={{ fontSize: 24 }}>{fruit.emoji}</div>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.92)', lineHeight: 1.7, fontWeight: 500, margin: 0 }}>{fruit.power}</p>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)' }}>Utilisateur : <span style={{ color: fruit.color, fontWeight: 700 }}>{fruit.user}</span></div>
            <div style={{ fontSize: 11, color: fruit.color, fontWeight: 700 }}>← Retourner</div>
          </div>
        </div>
      </div>
    </div>
  )
}

function HakiCard({ haki, index }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ animation: `fadeUp 0.45s ${index * 0.1}s ease-out both` }}>
      <div onClick={() => setOpen(o => !o)} style={{ background: `linear-gradient(145deg, ${haki.color}18 0%, rgba(14,14,16,0.9) 100%)`, border: `1px solid ${open ? haki.color + '55' : haki.color + '28'}`, borderRadius: 18, padding: '24px 24px 20px', cursor: 'pointer', transition: 'all 0.22s ease', boxShadow: open ? `0 8px 40px ${haki.color}22` : 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
          <div style={{ fontSize: 44, filter: `drop-shadow(0 0 12px ${haki.color}60)` }}>{haki.emoji}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 18, color: '#fff', marginBottom: 4 }}>{haki.name}</div>
            <div style={{ fontSize: 12, color: haki.color, fontWeight: 600, letterSpacing: '0.06em' }}>{haki.jp}</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
            <span style={{ fontSize: 10, padding: '3px 10px', borderRadius: 20, fontWeight: 800, background: `${haki.rarityColor}18`, color: haki.rarityColor, border: `1px solid ${haki.rarityColor}40`, letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>{haki.rarity}</span>
            <span style={{ fontSize: 12, color: haki.color, opacity: 0.7 }}>{open ? '▲ Réduire' : '▼ Détails'}</span>
          </div>
        </div>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.75)', lineHeight: 1.7, margin: '0 0 14px' }}>{haki.desc}</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {haki.users.map(u => <span key={u} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: `${haki.color}12`, color: haki.color, border: `1px solid ${haki.color}30`, fontWeight: 600 }}>{u}</span>)}
        </div>
        {open && (
          <div style={{ marginTop: 20, borderTop: `1px solid ${haki.color}20`, paddingTop: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
            {haki.details.map((d, i) => (
              <div key={i} style={{ background: `${haki.color}0d`, border: `1px solid ${haki.color}22`, borderRadius: 12, padding: '14px 18px' }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: haki.color, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>{d.label}</div>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', lineHeight: 1.7, margin: 0 }}>{d.text}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function MysteryCard({ m, index }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ animation: `fadeUp 0.45s ${index * 0.07}s ease-out both` }}>
      <div onClick={() => setOpen(o => !o)} style={{ background: `linear-gradient(135deg, ${m.color}14 0%, rgba(14,14,16,0.92) 100%)`, border: `1px solid ${open ? m.color + '50' : m.color + '25'}`, borderRadius: 16, cursor: 'pointer', overflow: 'hidden', transition: 'all 0.2s ease', boxShadow: open ? `0 8px 40px ${m.color}1a` : 'none' }}>
        <div style={{ height: 3, background: `linear-gradient(90deg, ${m.color}, transparent)` }} />
        <div style={{ padding: '20px 22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
            <span style={{ fontSize: 32 }}>{m.emoji}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: 16, color: '#fff' }}>{m.title}</div>
              <span style={{ fontSize: 9, padding: '2px 8px', borderRadius: 20, fontWeight: 800, background: `${m.color}18`, color: m.color, border: `1px solid ${m.color}35`, letterSpacing: '0.12em', display: 'inline-block', marginTop: 4 }}>{m.level}</span>
            </div>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: `${m.color}18`, border: `1px solid ${m.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: m.color, flexShrink: 0, transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}>▾</div>
          </div>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', lineHeight: 1.75, margin: '0 0 12px' }}>{m.desc}</p>
          <div style={{ fontSize: 11, color: m.color, fontWeight: 700, opacity: 0.8 }}>📍 {m.status}</div>
          {open && (
            <div style={{ marginTop: 18, borderTop: `1px solid ${m.color}20`, paddingTop: 18 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: m.color, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>Théories principales</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {m.theories.map((t, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <span style={{ color: m.color, fontSize: 16, lineHeight: 1.5, flexShrink: 0 }}>◆</span>
                    <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.82)', lineHeight: 1.65 }}>{t}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function CharCard({ c, index }) {
  const [open, setOpen] = useState(false)
  return (
    <div onClick={() => setOpen(o => !o)} style={{ background: `linear-gradient(135deg, ${c.color}18 0%, rgba(14,14,16,0.9) 100%)`, border: `1px solid ${open ? c.color + '55' : c.color + '28'}`, borderRadius: 14, padding: '16px', cursor: 'pointer', transition: 'all 0.18s ease', animation: `fadeUp 0.4s ${index * 0.05}s ease-out both` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ fontSize: 32, filter: `drop-shadow(0 0 8px ${c.color}50)`, flexShrink: 0 }}>{c.emoji}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: 14, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</div>
          <div style={{ fontSize: 11, color: c.color, fontWeight: 600, marginTop: 2 }}>{c.role}</div>
        </div>
        <div style={{ fontSize: 12, color: c.color, opacity: 0.7, flexShrink: 0 }}>{open ? '▲' : '▼'}</div>
      </div>
      {open && (
        <div style={{ marginTop: 12, borderTop: `1px solid ${c.color}20`, paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {c.fruit && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>🍎 <span style={{ color: '#fdcb6e', fontWeight: 600 }}>{c.fruit}</span></div>}
          {c.haki && <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>{c.haki.map(h => <span key={h} style={{ fontSize: 10, padding: '2px 7px', borderRadius: 10, background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.12)' }}>{h}</span>)}</div>}
          {c.prime && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>Prime : <span style={{ color: '#ffd700', fontWeight: 700 }}>{c.prime} B</span></div>}
          {c.note && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', fontStyle: 'italic', lineHeight: 1.5 }}>{c.note}</div>}
        </div>
      )}
    </div>
  )
}

function ArcCard({ arc, index }) {
  const [open, setOpen] = useState(false)
  const sagas = { 'East Blue': '#74b9ff', 'Alabasta Saga': '#fdcb6e', 'Sky Island Saga': '#a29bfe', 'Water 7 Saga': '#0984e3', 'Thriller Bark Saga': '#6c5ce7', 'Summit War Saga': '#e0524a', 'Dressrosa Saga': '#e17055', 'Whole Cake Island Saga': '#fd79a8', 'Wano Saga': '#8e44ad', 'Saga Finale': '#ffd700' }
  const sagaColor = sagas[arc.saga] || '#636e72'
  return (
    <div onClick={() => setOpen(o => !o)} style={{ background: `linear-gradient(135deg, ${arc.color}16 0%, rgba(14,14,16,0.92) 100%)`, border: `1px solid ${open ? arc.color + '50' : arc.color + '22'}`, borderRadius: 14, overflow: 'hidden', cursor: 'pointer', transition: 'all 0.18s', animation: `fadeUp 0.4s ${index * 0.04}s ease-out both`, boxShadow: open ? `0 6px 28px ${arc.color}1a` : 'none' }}>
      <div style={{ height: 2, background: `linear-gradient(90deg, ${arc.color}, ${arc.color}44, transparent)` }} />
      <div style={{ padding: '14px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 24, flexShrink: 0 }}>{arc.emoji}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 800, fontSize: 14, color: '#fff' }}>{arc.name}</span>
              {arc.spoiler && <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 8, background: 'rgba(224,82,74,0.2)', color: '#e0524a', border: '1px solid rgba(224,82,74,0.35)', fontWeight: 800 }}>SPOILERS</span>}
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 10, color: sagaColor, fontWeight: 700 }}>{arc.saga}</span>
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>· Ép. {arc.ep} · Ch. {arc.ch}</span>
            </div>
          </div>
          <div style={{ fontSize: 12, color: arc.color, opacity: 0.7, flexShrink: 0 }}>{open ? '▲' : '▼'}</div>
        </div>
        {open && (
          <div style={{ marginTop: 12, borderTop: `1px solid ${arc.color}18`, paddingTop: 12 }}>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.78)', lineHeight: 1.7, margin: '0 0 10px' }}>{arc.resume}</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {arc.chars.map(c => <span key={c} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: `${arc.color}12`, color: arc.color, border: `1px solid ${arc.color}28`, fontWeight: 600 }}>{c}</span>)}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function MondeSection() {
  const [sub, setSub] = useState('gouvernement')
  const keys = Object.keys(MONDE_DATA)
  const data = MONDE_DATA[sub]
  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '48px 20px 60px' }}>
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <div style={{ fontSize: 10, letterSpacing: '0.3em', fontWeight: 800, color: '#e0524a', marginBottom: 14, textTransform: 'uppercase' }}>One Piece • Lore</div>
        <h2 style={{ fontFamily: 'var(--display)', fontWeight: 900, fontSize: 'clamp(32px, 6vw, 58px)', color: '#fff', margin: '0 0 12px', lineHeight: 1 }}>🌐 Monde & Lore</h2>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', maxWidth: 460, margin: '0 auto', lineHeight: 1.7 }}>Gouvernement, armes anciennes, races et technologies de l'univers One Piece.</p>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 32 }}>
        {keys.map(k => {
          const d = MONDE_DATA[k]
          return (
            <button key={k} onClick={() => setSub(k)} style={{ padding: '8px 18px', borderRadius: 100, border: `1px solid ${sub === k ? d.color + '60' : 'rgba(255,255,255,0.12)'}`, background: sub === k ? `${d.color}18` : 'transparent', color: sub === k ? d.color : 'rgba(255,255,255,0.45)', fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 6 }}>
              {d.emoji} {d.title}
            </button>
          )
        })}
      </div>
      <div key={sub} style={{ animation: 'fadeUp 0.3s ease-out both' }}>
        <div style={{ background: `linear-gradient(135deg, ${data.color}12 0%, rgba(14,14,16,0.85) 100%)`, border: `1px solid ${data.color}30`, borderRadius: 18, padding: '24px', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <span style={{ fontSize: 28 }}>{data.emoji}</span>
            <h3 style={{ fontWeight: 800, fontSize: 20, color: '#fff', margin: 0 }}>{data.title}</h3>
          </div>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', lineHeight: 1.75, margin: 0 }}>{data.desc}</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {data.entites.map((e, i) => (
            <div key={i} style={{ background: `${data.color}0c`, border: `1px solid ${data.color}22`, borderRadius: 12, padding: '16px 20px' }}>
              <div style={{ fontWeight: 800, fontSize: 14, color: data.color, marginBottom: 6 }}>{e.name}</div>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.72)', lineHeight: 1.7, margin: 0 }}>{e.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function BountiesSection() {
  const groups = [...new Set(BOUNTIES.map(b => b.group))]
  const [activeGroup, setActiveGroup] = useState('Tous')
  const shown = activeGroup === 'Tous' ? BOUNTIES : BOUNTIES.filter(b => b.group === activeGroup)
  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '48px 20px 60px' }}>
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <div style={{ fontSize: 10, letterSpacing: '0.3em', fontWeight: 800, color: '#ffd700', marginBottom: 14, textTransform: 'uppercase' }}>One Piece • Classement</div>
        <h2 style={{ fontFamily: 'var(--display)', fontWeight: 900, fontSize: 'clamp(32px, 6vw, 58px)', color: '#fff', margin: '0 0 12px', lineHeight: 1 }}>💰 Primes</h2>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', maxWidth: 420, margin: '0 auto', lineHeight: 1.7 }}>Classement des plus grosses primes de l'univers One Piece — actuelles et historiques.</p>
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 28 }}>
        {['Tous', ...groups].map(g => (
          <button key={g} onClick={() => setActiveGroup(g)} style={{ padding: '6px 14px', borderRadius: 100, border: `1px solid ${activeGroup === g ? 'rgba(255,215,0,0.5)' : 'rgba(255,255,255,0.1)'}`, background: activeGroup === g ? 'rgba(255,215,0,0.12)' : 'transparent', color: activeGroup === g ? '#ffd700' : 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s' }}>{g}</button>
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {shown.map((b, i) => (
          <div key={b.rank} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: b.rank <= 3 ? `${b.color}14` : 'rgba(255,255,255,0.03)', border: `1px solid ${b.rank <= 3 ? b.color + '35' : 'rgba(255,255,255,0.07)'}`, borderRadius: 12, animation: `fadeUp 0.35s ${i * 0.04}s ease-out both` }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: b.rank <= 3 ? `${b.color}25` : 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: b.rank <= 3 ? 14 : 12, color: b.rank <= 3 ? b.color : 'rgba(255,255,255,0.3)', flexShrink: 0 }}>#{b.rank}</div>
            <span style={{ fontSize: 22, flexShrink: 0 }}>{b.emoji}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 800, fontSize: 14, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.name}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.38)', marginTop: 2 }}>{b.note}</div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontFamily: 'var(--display)', fontWeight: 900, fontSize: 14, color: '#ffd700' }}>{b.prime}</div>
              <div style={{ fontSize: 9, color: 'rgba(255,215,0,0.5)', fontWeight: 700 }}>BERRIES</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function TimelineSection() {
  const [active, setActive] = useState(null)
  return (
    <div style={{ padding: '48px 20px 60px' }}>
      <div style={{ textAlign: 'center', marginBottom: 48 }}>
        <div style={{ fontSize: 10, letterSpacing: '0.3em', fontWeight: 800, color: '#74b9ff', marginBottom: 14, textTransform: 'uppercase' }}>One Piece • Histoire</div>
        <h2 style={{ fontFamily: 'var(--display)', fontWeight: 900, fontSize: 'clamp(32px, 6vw, 58px)', color: '#fff', margin: '0 0 12px', lineHeight: 1 }}>📅 Timeline</h2>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', maxWidth: 440, margin: '0 auto', lineHeight: 1.7 }}>La frise chronologique de l'univers One Piece — des 800 ans d'histoire à la Saga Finale.</p>
      </div>

      {/* Ligne principale */}
      <div style={{ overflowX: 'auto', paddingBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', minWidth: 'max-content', padding: '0 40px', gap: 0, position: 'relative' }}>
          {/* Barre horizontale */}
          <div style={{ position: 'absolute', top: '50%', left: 40, right: 40, height: 2, background: 'linear-gradient(90deg, #6c5ce7, #a29bfe, #74b9ff, #22b573, #ffd700)', transform: 'translateY(-50%)', zIndex: 0 }} />

          {TIMELINE_EVENTS.map((ev, i) => {
            const isActive = active === i
            return (
              <div key={i} onClick={() => setActive(isActive ? null : i)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', zIndex: 1, cursor: 'pointer', marginRight: i < TIMELINE_EVENTS.length - 1 ? 60 : 0 }}>
                {/* Point */}
                <div style={{ width: ev.major ? 20 : 12, height: ev.major ? 20 : 12, borderRadius: '50%', background: ev.color, border: `2px solid ${ev.color}`, boxShadow: isActive ? `0 0 16px ${ev.color}80` : `0 0 6px ${ev.color}40`, transition: 'all 0.2s', transform: isActive ? 'scale(1.3)' : 'scale(1)', flexShrink: 0 }} />

                {/* Étiquette */}
                <div style={{ marginTop: 12, textAlign: 'center', maxWidth: 100 }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: ev.color, whiteSpace: 'nowrap' }}>{ev.year === 0 ? 'Présent' : ev.year > 0 ? `+${ev.year}` : `${ev.year} ans`}</div>
                  <div style={{ fontSize: 11, fontWeight: ev.major ? 700 : 500, color: isActive ? '#fff' : 'rgba(255,255,255,0.55)', marginTop: 4, lineHeight: 1.3, textAlign: 'center', maxWidth: 90 }}>{ev.label}</div>
                </div>

                {/* Popup */}
                {isActive && (
                  <div style={{ position: 'absolute', top: '100%', marginTop: 16, width: 240, background: `linear-gradient(135deg, ${ev.color}18, rgba(14,14,16,0.97))`, border: `1px solid ${ev.color}50`, borderRadius: 12, padding: '14px', zIndex: 100, boxShadow: `0 12px 40px rgba(0,0,0,0.6)` }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: ev.color, marginBottom: 6 }}>{ev.label}</div>
                    <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', lineHeight: 1.65, margin: 0 }}>{ev.desc}</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div style={{ textAlign: 'center', marginTop: 20 }}>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>Clique sur un point pour afficher les détails</span>
      </div>

      {/* Événements liste en dessous */}
      <div style={{ maxWidth: 800, margin: '48px auto 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {TIMELINE_EVENTS.filter(e => e.major).map((ev, i) => (
          <div key={i} style={{ display: 'flex', gap: 14, alignItems: 'flex-start', padding: '14px 18px', background: `${ev.color}0e`, border: `1px solid ${ev.color}25`, borderRadius: 12 }}>
            <div style={{ width: 3, borderRadius: 3, background: ev.color, alignSelf: 'stretch', flexShrink: 0 }} />
            <div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: ev.color }}>{ev.year === 0 ? 'Présent' : ev.year > 0 ? `+${ev.year} an(s)` : `Il y a ${Math.abs(ev.year)} ans`}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{ev.label}</span>
              </div>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', lineHeight: 1.65, margin: 0 }}>{ev.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function TheoriesSection() {
  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '48px 20px 60px' }}>
      <div style={{ textAlign: 'center', marginBottom: 48 }}>
        <div style={{ fontSize: 10, letterSpacing: '0.3em', fontWeight: 800, color: '#fdcb6e', marginBottom: 14, textTransform: 'uppercase' }}>One Piece • Communauté</div>
        <h2 style={{ fontFamily: 'var(--display)', fontWeight: 900, fontSize: 'clamp(32px, 6vw, 58px)', color: '#fff', margin: '0 0 12px', lineHeight: 1 }}>💡 Théories</h2>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', maxWidth: 480, margin: '0 auto', lineHeight: 1.7 }}>Les théories les plus populaires de la communauté Brams — classées par crédibilité.</p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {[...THEORIES].sort((a, b) => b.credibility - a.credibility).map((t, i) => (
          <div key={i} style={{ background: `linear-gradient(135deg, ${t.color}12 0%, rgba(14,14,16,0.92) 100%)`, border: `1px solid ${t.color}28`, borderRadius: 16, padding: '20px 22px', animation: `fadeUp 0.4s ${i * 0.07}s ease-out both` }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
              <span style={{ fontSize: 28, flexShrink: 0 }}>{t.emoji}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: 15, color: '#fff', marginBottom: 4 }}>{t.title}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${t.credibility}%`, background: `linear-gradient(90deg, ${t.color}, ${t.color}aa)`, borderRadius: 4, transition: 'width 1s ease' }} />
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 800, color: t.color, flexShrink: 0 }}>{t.credibility}%</span>
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>🔥 {t.votes.toLocaleString('fr')}</div>
              </div>
            </div>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.72)', lineHeight: 1.75, margin: 0 }}>{t.desc}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function EncyclopediaHero({ search, setSearch, searchRef }) {
  const fruits = useCountUp(FRUITS.length, 1400, 300)
  const arcs   = useCountUp(ARCS.length, 1200, 400)
  const chars  = useCountUp(Object.values(CHARACTERS).flat().length, 1600, 350)
  return (
    <div style={{ minHeight: '75vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden', padding: '60px 24px 48px' }}>
      <div style={{ position: 'absolute', top: '10%', left: '8%', width: 340, height: 340, borderRadius: '50%', background: 'radial-gradient(circle, rgba(224,82,74,0.10) 0%, transparent 70%)', pointerEvents: 'none', animation: 'drift 18s ease-in-out infinite' }} />
      <div style={{ position: 'absolute', bottom: '5%', right: '6%', width: 280, height: 280, borderRadius: '50%', background: 'radial-gradient(circle, rgba(162,155,254,0.08) 0%, transparent 70%)', pointerEvents: 'none', animation: 'drift 24s 4s ease-in-out infinite reverse' }} />
      <div style={{ fontSize: 10, letterSpacing: '0.35em', fontWeight: 800, color: '#e0524a', marginBottom: 22, textTransform: 'uppercase', animation: 'fadeUp 0.6s ease both' }}>One Piece • Univers Étendu</div>
      <h1 style={{ fontFamily: 'var(--display)', fontWeight: 900, textAlign: 'center', fontSize: 'clamp(56px, 11vw, 108px)', lineHeight: 0.92, margin: '0 0 20px', background: 'linear-gradient(140deg, #ffffff 0%, rgba(255,255,255,0.80) 45%, #e0524a 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', animation: 'fadeUp 0.75s 0.1s ease both' }}>
        📚<br />Encyclopédie
      </h1>
      <p style={{ fontSize: 17, color: 'rgba(255,255,255,0.5)', textAlign: 'center', maxWidth: 460, lineHeight: 1.65, margin: '0 0 44px', animation: 'fadeUp 0.75s 0.2s ease both' }}>
        Personnages, arcs, fruits du démon, lore et mystères de l'univers One Piece
      </p>
      <div style={{ display: 'flex', gap: 48, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 48, animation: 'fadeUp 0.75s 0.3s ease both' }}>
        <StatPill value={fruits} label="Fruits du Démon" color="#e0524a" />
        <div style={{ width: 1, background: 'rgba(255,255,255,0.08)', alignSelf: 'center', height: 40 }} />
        <StatPill value={chars} label="Personnages" color="#a29bfe" />
        <div style={{ width: 1, background: 'rgba(255,255,255,0.08)', alignSelf: 'center', height: 40 }} />
        <StatPill value={arcs} label="Arcs" color="#fdcb6e" />
      </div>
      <div style={{ width: '100%', maxWidth: 560, position: 'relative', animation: 'fadeUp 0.75s 0.4s ease both' }}>
        <span style={{ position: 'absolute', left: 18, top: '50%', transform: 'translateY(-50%)', fontSize: 18, color: 'rgba(255,255,255,0.3)', pointerEvents: 'none' }}>🔍</span>
        <input ref={searchRef} type="text" placeholder="Chercher un fruit, un utilisateur, un pouvoir…" value={search} onChange={e => setSearch(e.target.value)}
          style={{ width: '100%', paddingLeft: 50, paddingRight: 20, height: 54, background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 16, color: '#fff', fontSize: 15, outline: 'none', fontFamily: 'var(--body)', boxSizing: 'border-box', boxShadow: '0 8px 32px rgba(0,0,0,0.2)', transition: 'border-color 0.2s, box-shadow 0.2s' }}
          onFocus={e => { e.currentTarget.style.borderColor = 'rgba(224,82,74,0.5)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(224,82,74,0.15)' }}
          onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.2)' }}
        />
      </div>
      <div style={{ marginTop: 40, fontSize: 12, color: 'rgba(255,255,255,0.3)', animation: 'float 2.5s ease-in-out infinite', letterSpacing: '0.05em' }}>↓ Découvrir</div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE PRINCIPALE
// ─────────────────────────────────────────────────────────────────────────────

const CHAR_SUBTABS = [
  { id: 'mugiwara',   label: '🏴‍☠️ Mugiwara' },
  { id: 'yonko',      label: '👑 Yonko' },
  { id: 'amiraux',    label: '⚓ Amiraux' },
  { id: 'shichibukai', label: '🗡️ Shichibukai' },
]

const ARC_SAGAS = [...new Set(ARCS.map(a => a.saga))]

const TABS = [
  { id: 'fruits',       label: '🍎 Fruits',        count: FRUITS.length },
  { id: 'personnages',  label: '👥 Personnages',    count: null },
  { id: 'arcs',         label: '⚔️ Arcs & Sagas',  count: ARCS.length },
  { id: 'monde',        label: '🌐 Monde',          count: null },
  { id: 'primes',       label: '💰 Primes',         count: BOUNTIES.length },
  { id: 'timeline',     label: '📅 Timeline',       count: null },
  { id: 'haki',         label: '⚡ Haki',           count: HAKI.length },
  { id: 'mysteres',     label: '🌑 Mystères',       count: MYSTERIES.length },
  { id: 'theories',     label: '💡 Théories',       count: THEORIES.length },
]

export default function EncyclopediePage({ onClose }) {
  const [tab, setTab] = useState('fruits')
  const [filter, setFilter] = useState('Tous')
  const [search, setSearch] = useState('')
  const [charSub, setCharSub] = useState('mugiwara')
  const [arcSaga, setArcSaga] = useState('Tous')
  const searchRef = useRef(null)
  const types = ['Tous', 'Paramecia', 'Logia', 'Zoan']

  const filtered = useMemo(() => {
    let result = FRUITS
    if (filter !== 'Tous') result = result.filter(f => f.type === filter)
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      result = result.filter(f => f.name.toLowerCase().includes(q) || f.user.toLowerCase().includes(q) || f.power.toLowerCase().includes(q))
    }
    return result
  }, [filter, search])

  const filteredArcs = useMemo(() => arcSaga === 'Tous' ? ARCS : ARCS.filter(a => a.saga === arcSaga), [arcSaga])

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    const fn = e => {
      if (e.key === 'Escape') onClose()
      if (e.key === '/' && e.target.tagName !== 'INPUT') { e.preventDefault(); searchRef.current?.focus() }
    }
    window.addEventListener('keydown', fn)
    return () => { document.body.style.overflow = ''; window.removeEventListener('keydown', fn) }
  }, [onClose])

  const typeCounts = useMemo(() => {
    const c = {}
    types.forEach(t => { c[t] = t === 'Tous' ? FRUITS.length : FRUITS.filter(f => f.type === t).length })
    return c
  }, [])

  return (
    <>
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(20px) } to { opacity:1; transform:translateY(0) } }
        @keyframes fadeIn { from { opacity:0 } to { opacity:1 } }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        @keyframes drift { 0%,100%{transform:translate(0,0)} 33%{transform:translate(20px,-15px)} 66%{transform:translate(-10px,20px)} }
      `}</style>

      {/* Forcé dark — la page encyclopédie est toujours sombre */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 500, background: '#0b0c0e', color: '#fff', display: 'flex', flexDirection: 'column', animation: 'fadeIn 0.18s ease-out' }}>

        {/* Header */}
        <div style={{ flexShrink: 0, background: 'rgba(11,12,14,0.97)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.07)', zIndex: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 20px', height: 56 }}>
            <button onClick={onClose} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 9, color: '#fff', cursor: 'pointer', padding: '7px 14px', fontSize: 13, fontWeight: 700, flexShrink: 0, transition: 'background 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
            >← Retour</button>
            <span style={{ fontFamily: 'var(--display)', fontWeight: 800, fontSize: 15, color: '#fff', flex: 1, textAlign: 'center' }}>📚 Encyclopédie One Piece</span>
          </div>

          {/* Onglets */}
          <div style={{ display: 'flex', gap: 0, borderTop: '1px solid rgba(255,255,255,0.06)', overflowX: 'auto', scrollbarWidth: 'none' }}>
            {TABS.map(t => {
              const active = tab === t.id
              return (
                <button key={t.id} onClick={() => setTab(t.id)} style={{ flex: '0 0 auto', padding: '0 18px', height: 44, fontSize: 13, fontWeight: 700, background: 'transparent', border: 'none', cursor: 'pointer', color: active ? '#fff' : 'rgba(255,255,255,0.38)', borderBottom: active ? '2px solid #e0524a' : '2px solid transparent', transition: 'all 0.15s', whiteSpace: 'nowrap' }}>
                  {t.label}{t.count !== null ? <span style={{ opacity: 0.5, fontSize: 11 }}> ({t.count})</span> : ''}
                </button>
              )
            })}
          </div>
        </div>

        {/* Contenu */}
        <div style={{ flex: 1, overflowY: 'auto' }}>

          {/* ── FRUITS ── */}
          {tab === 'fruits' && (
            <>
              <EncyclopediaHero search={search} setSearch={setSearch} searchRef={searchRef} />
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', padding: '0 20px 28px' }}>
                {types.map(t => {
                  const active = filter === t
                  const tc = TYPE_COLORS[t]
                  return (
                    <button key={t} onClick={() => setFilter(t)} style={{ height: 36, padding: '0 18px', borderRadius: 100, border: `1px solid ${active ? (tc?.border || 'rgba(224,82,74,0.5)') : 'rgba(255,255,255,0.1)'}`, background: active ? (tc?.bg || 'rgba(224,82,74,0.15)') : 'transparent', color: active ? (tc?.text || '#e0524a') : 'rgba(255,255,255,0.4)', fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap' }}>
                      {t} <span style={{ fontSize: 11, opacity: 0.7 }}>({typeCounts[t]})</span>
                    </button>
                  )
                })}
              </div>
              <div style={{ maxWidth: 1120, margin: '0 auto', padding: '0 20px 60px' }}>
                {filtered.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '80px 0', color: 'rgba(255,255,255,0.4)' }}>
                    <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
                    <div style={{ fontWeight: 700, color: '#fff', marginBottom: 8 }}>Aucun résultat</div>
                    <div style={{ fontSize: 14 }}>Essaie un autre nom ou pouvoir</div>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14 }}>
                    {filtered.map((fruit, i) => <FruitCard key={fruit.name} fruit={fruit} index={i} />)}
                  </div>
                )}
              </div>
            </>
          )}

          {/* ── PERSONNAGES ── */}
          {tab === 'personnages' && (
            <div style={{ maxWidth: 1100, margin: '0 auto', padding: '48px 20px 60px' }}>
              <div style={{ textAlign: 'center', marginBottom: 40 }}>
                <div style={{ fontSize: 10, letterSpacing: '0.3em', fontWeight: 800, color: '#e0524a', marginBottom: 14, textTransform: 'uppercase' }}>One Piece • Personnages</div>
                <h2 style={{ fontFamily: 'var(--display)', fontWeight: 900, fontSize: 'clamp(32px, 6vw, 58px)', color: '#fff', margin: '0 0 12px', lineHeight: 1 }}>👥 Personnages</h2>
                <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', maxWidth: 440, margin: '0 auto', lineHeight: 1.7 }}>Straw Hat Pirates, Yonko, Amiraux et Shichibukai — clique pour dérouler les détails.</p>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 32 }}>
                {CHAR_SUBTABS.map(s => (
                  <button key={s.id} onClick={() => setCharSub(s.id)} style={{ padding: '8px 18px', borderRadius: 100, border: `1px solid ${charSub === s.id ? 'rgba(224,82,74,0.5)' : 'rgba(255,255,255,0.1)'}`, background: charSub === s.id ? 'rgba(224,82,74,0.12)' : 'transparent', color: charSub === s.id ? '#e0524a' : 'rgba(255,255,255,0.4)', fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s' }}>{s.label}</button>
                ))}
              </div>
              <div key={charSub} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
                {CHARACTERS[charSub].map((c, i) => <CharCard key={c.name} c={c} index={i} />)}
              </div>
            </div>
          )}

          {/* ── ARCS ── */}
          {tab === 'arcs' && (
            <div style={{ maxWidth: 900, margin: '0 auto', padding: '48px 20px 60px' }}>
              <div style={{ textAlign: 'center', marginBottom: 40 }}>
                <div style={{ fontSize: 10, letterSpacing: '0.3em', fontWeight: 800, color: '#e17055', marginBottom: 14, textTransform: 'uppercase' }}>One Piece • Chronologie</div>
                <h2 style={{ fontFamily: 'var(--display)', fontWeight: 900, fontSize: 'clamp(32px, 6vw, 58px)', color: '#fff', margin: '0 0 12px', lineHeight: 1 }}>⚔️ Arcs & Sagas</h2>
                <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', maxWidth: 480, margin: '0 auto', lineHeight: 1.7 }}>Tous les arcs dans l'ordre chronologique — résumés sans spoilers majeurs. Clique pour dérouler.</p>
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 28 }}>
                {['Tous', ...ARC_SAGAS].map(s => (
                  <button key={s} onClick={() => setArcSaga(s)} style={{ padding: '6px 14px', borderRadius: 100, border: `1px solid ${arcSaga === s ? 'rgba(225,112,85,0.5)' : 'rgba(255,255,255,0.1)'}`, background: arcSaga === s ? 'rgba(225,112,85,0.12)' : 'transparent', color: arcSaga === s ? '#e17055' : 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap' }}>{s}</button>
                ))}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {filteredArcs.map((arc, i) => <ArcCard key={arc.id} arc={arc} index={i} />)}
              </div>
            </div>
          )}

          {/* ── MONDE ── */}
          {tab === 'monde' && <MondeSection />}

          {/* ── PRIMES ── */}
          {tab === 'primes' && <BountiesSection />}

          {/* ── TIMELINE ── */}
          {tab === 'timeline' && <TimelineSection />}

          {/* ── HAKI ── */}
          {tab === 'haki' && (
            <div style={{ maxWidth: 900, margin: '0 auto', padding: '48px 20px 60px' }}>
              <div style={{ textAlign: 'center', marginBottom: 48 }}>
                <div style={{ fontSize: 10, letterSpacing: '0.3em', fontWeight: 800, color: '#e0524a', marginBottom: 16, textTransform: 'uppercase' }}>One Piece • Pouvoirs</div>
                <h2 style={{ fontFamily: 'var(--display)', fontWeight: 900, fontSize: 'clamp(36px, 7vw, 68px)', color: '#fff', margin: '0 0 14px', lineHeight: 1 }}>⚡ Le Haki</h2>
                <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.45)', maxWidth: 520, margin: '0 auto', lineHeight: 1.7 }}>Le Haki est une énergie vitale présente en chaque être vivant. Seule une volonté d'acier permet de l'éveiller et de le maîtriser. Il existe trois types — et l'un d'eux ne peut être appris.</p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {HAKI.map((h, i) => <HakiCard key={h.name} haki={h} index={i} />)}
              </div>
            </div>
          )}

          {/* ── MYSTÈRES ── */}
          {tab === 'mysteres' && (
            <div style={{ maxWidth: 900, margin: '0 auto', padding: '48px 20px 60px' }}>
              <div style={{ textAlign: 'center', marginBottom: 48 }}>
                <div style={{ fontSize: 10, letterSpacing: '0.3em', fontWeight: 800, color: '#e0524a', marginBottom: 16, textTransform: 'uppercase' }}>One Piece • Lore</div>
                <h2 style={{ fontFamily: 'var(--display)', fontWeight: 900, fontSize: 'clamp(36px, 7vw, 68px)', color: '#fff', margin: '0 0 14px', lineHeight: 1 }}>🌑 Mystères</h2>
                <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.45)', maxWidth: 540, margin: '0 auto', lineHeight: 1.7 }}>Les grandes énigmes de l'univers One Piece — certaines résolues, d'autres encore actives. Clique pour dérouler les théories et l'état de la révélation.</p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {MYSTERIES.map((m, i) => <MysteryCard key={m.title} m={m} index={i} />)}
              </div>
            </div>
          )}

          {/* ── THÉORIES ── */}
          {tab === 'theories' && <TheoriesSection />}

        </div>

        {/* Footer */}
        <div style={{ flexShrink: 0, borderTop: '1px solid rgba(255,255,255,0.06)', padding: '8px 20px', background: 'rgba(11,12,14,0.95)', display: 'flex', gap: 20, justifyContent: 'center', flexWrap: 'wrap' }}>
          {[['/', 'Rechercher (Fruits)'], ['Clique', 'Dérouler / Retourner'], ['Échap', 'Retour']].map(([k, label]) => (
            <span key={k} style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>
              <kbd style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 4, padding: '1px 6px', fontSize: 10, fontFamily: 'monospace', color: 'rgba(255,255,255,0.5)', marginRight: 5 }}>{k}</kbd>
              {label}
            </span>
          ))}
        </div>
      </div>
    </>
  )
}
