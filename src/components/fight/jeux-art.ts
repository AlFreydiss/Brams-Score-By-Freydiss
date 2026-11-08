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
};

export function jeuArt(game: string | undefined) {
  const a = game ? ART[game] : undefined;
  return a ? { src: `/tournoi/jeux-art/${a[0]}.webp`, pos: a[1] } : null;
}
