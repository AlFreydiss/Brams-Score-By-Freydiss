// Art officiel (Steam « library hero », sans logo) de chaque jeu du tournoi
// des OST de jeux vidéo, servi depuis public/tournoi/jeux-art. pos = point
// fort de l'image (object-position) : la plupart des arts gardent le
// personnage à droite pour laisser la place au logo.
// Jeux absents (pas sur Steam, ou art sans intérêt) : repli sur la pochette.

const ART: Record<string, [file: string, pos: string]> = {
  "Clair Obscur: Expedition 33": ["clair-obscur-expedition-33", "60% 40%"],
  "Final Fantasy VII": ["final-fantasy-vii", "40% 50%"],
  "NieR:Automata": ["nier-automata", "72% 40%"],
  "Persona 5": ["persona-5", "62% 40%"],
  "Hollow Knight": ["hollow-knight", "82% 50%"],
  Celeste: ["celeste", "58% 40%"],
  "Elden Ring": ["elden-ring", "55% 45%"],
  "Dark Souls III": ["dark-souls-iii", "72% 40%"],
  "God of War": ["god-of-war", "50% 50%"],
  "The Last of Us": ["the-last-of-us", "52% 40%"],
  Journey: ["journey", "48% 60%"],
  Hades: ["hades", "50% 45%"],
  "Assassin's Creed II": ["assassin-s-creed-ii", "50% 35%"],
  "Ori and the Blind Forest": ["ori-and-the-blind-forest", "45% 55%"],
  DOOM: ["doom", "58% 45%"],
  "Red Dead Redemption 2": ["red-dead-redemption-2", "87% 40%"],
  Skyrim: ["skyrim", "55% 45%"],
  Halo: ["halo", "50% 50%"],
  "Mass Effect 3": ["mass-effect-3", "50% 50%"],
  "Metal Gear Solid 3": ["metal-gear-solid-3", "62% 40%"],
  "Silent Hill 2": ["silent-hill-2", "50% 45%"],
  "Outer Wilds": ["outer-wilds", "62% 60%"],
  "Stardew Valley": ["stardew-valley", "50% 50%"],
  "Baldur's Gate 3": ["baldur-s-gate-3", "45% 40%"],
  "Ghost of Tsushima": ["ghost-of-tsushima", "30% 50%"],
  "Final Fantasy VI": ["final-fantasy-vi", "70% 50%"],
  Deltarune: ["deltarune", "45% 60%"],
  "Final Fantasy XV": ["final-fantasy-xv", "55% 45%"],
  "Final Fantasy XIV": ["final-fantasy-xiv", "60% 40%"],
  "Fallout 4": ["fallout-4", "58% 50%"],
  Destiny: ["destiny", "70% 45%"],
  "Final Fantasy X": ["final-fantasy-x", "45% 45%"],
  "Cyberpunk 2077": ["cyberpunk-2077", "75% 40%"],
  "Final Fantasy VIII": ["final-fantasy-viii", "70% 40%"],
  "Final Fantasy IX": ["final-fantasy-ix", "85% 40%"],
  "Chrono Cross": ["chrono-cross", "70% 40%"],
  // Liste de la commu (9 nov).
  "Call of Duty: Black Ops": ["call-of-duty-black-ops", "70% 40%"],
  "Call of Duty: Black Ops II": ["call-of-duty-black-ops-ii", "22% 40%"],
  "Call of Duty: Modern Warfare 2": ["call-of-duty-modern-warfare-2", "25% 40%"],
  "Call of Duty: Modern Warfare 3": ["call-of-duty-modern-warfare-3", "80% 40%"],
  "Call of Duty: Ghosts": ["call-of-duty-ghosts", "20% 40%"],
  "Marvel's Spider-Man": ["marvel-s-spider-man", "60% 45%"],
  "Marvel's Spider-Man: Miles Morales": ["marvel-s-spider-man-miles-morales", "85% 45%"],
  "Batman: Arkham Origins": ["batman-arkham-origins", "72% 40%"],
  "Batman: Arkham City": ["batman-arkham-city", "80% 40%"],
  "The Last of Us Part II": ["the-last-of-us-part-ii", "80% 40%"],
  "Chrono Trigger": ["chrono-trigger", "70% 50%"],
  "Ori and the Will of the Wisps": ["ori-and-the-will-of-the-wisps", "85% 50%"],
  "Death Stranding": ["death-stranding", "55% 40%"],
  "Street Fighter II": ["street-fighter", "30% 40%"],
  "Far Cry 3": ["far-cry-3", "50% 45%"],
  "Fallout: New Vegas": ["fallout-new-vegas", "50% 60%"],
  "Assassin's Creed Brotherhood": ["assassin-s-creed-brotherhood", "40% 35%"],
  "Assassin's Creed IV: Black Flag": ["assassin-s-creed-iv-black-flag", "85% 35%"],
  "Assassin's Creed Revelations": ["assassin-s-creed-revelations", "50% 50%"],
  "Assassin's Creed III": ["assassin-s-creed-iii", "50% 50%"],
  "Resident Evil": ["resident-evil", "55% 40%"],
  "Metal Gear Solid": ["metal-gear-solid", "50% 40%"],
  "GTA San Andreas": ["gta-san-andreas", "88% 40%"],
  "GTA V": ["gta-v", "70% 40%"],
  "GTA IV": ["gta-iv", "70% 40%"],
  "Sonic Adventure 2": ["sonic-adventure-2", "70% 50%"],
  "The Witcher 3": ["the-witcher-3", "70% 40%"],
  "DOOM Eternal": ["doom-eternal", "55% 45%"],
  "Mortal Kombat": ["mortal-kombat", "33% 50%"],
  "Dying Light": ["dying-light", "20% 50%"],
  "Uncharted 4": ["uncharted-4", "40% 40%"],
  "God of War Ragnarök": ["god-of-war-ragnarok", "55% 45%"],
  "Horizon Zero Dawn": ["horizon-zero-dawn", "75% 40%"],
  "Tomb Raider": ["tomb-raider", "58% 45%"],
  Overwatch: ["overwatch", "65% 40%"],
  Diablo: ["diablo", "40% 45%"],
  Tekken: ["tekken", "30% 40%"],
  "Battlefield 1": ["battlefield-1", "85% 40%"],
  "Devil May Cry": ["devil-may-cry", "70% 40%"],
  Bayonetta: ["bayonetta", "30% 45%"],
  "Monster Hunter": ["monster-hunter", "80% 45%"],
  Bastion: ["bastion", "75% 50%"],
  Transistor: ["transistor", "30% 40%"],
  Castlevania: ["castlevania", "60% 50%"],
  "Dragon Ball Xenoverse": ["dragon-ball-xenoverse", "60% 45%"],
  Portal: ["portal", "30% 50%"],
};

export function jeuArt(game: string | undefined) {
  const a = game ? ART[game] : undefined;
  return a ? { src: `/tournoi/jeux-art/${a[0]}.webp`, pos: a[1] } : null;
}

/** Fond propre à une piste (data jeux.json : p.bg), sinon l'art du jeu. */
export type Bg = { src: string; hi?: string; pos?: string; video?: string };
export const bgOf = (p: { sub?: string; bg?: Bg }): Bg | null => p.bg ?? jeuArt(p.sub);

// Version légère d'un art, pour les petites cases (mur du départ) : miniature
// 300 px de haut dans public/tournoi/jeux-s (même arborescence, en .webp), ou
// la variante 600 px des captures Steam. À régénérer quand on ajoute un art.
export const artSmall = (src: string) =>
  src.replace(/\.1920x1080\.jpg$/, ".600x338.jpg").replace(/^\/tournoi\/(jeux-art|jeux-bg|jeux-hero)\/([^/.]+)\.\w+$/, "/tournoi/jeux-s/$1/$2.webp");
