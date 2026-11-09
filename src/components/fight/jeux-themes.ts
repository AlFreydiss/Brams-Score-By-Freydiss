import type { TransitionMode } from "../tournois/gommage";

// « Duel de vibes » du tournoi des OST de jeux vidéo : chaque jeu arrive avec
// son univers — police, encre du titre, bouton Garder, particules d'ambiance,
// façon de disparaître au vote et couleur du son. Une quinzaine d'univers de
// base, et chaque jeu peut changer la police ou la couleur du sien.
// Les polices viennent de Google Fonts, chargées seulement quand un jeu de
// cet univers apparaît (sauf Trajan, kit Adobe déjà chargé par le tournoi).

export type Aura = "petals" | "ash" | "snow" | "embers" | "stars" | "pixels" | "sparks" | "neon" | "dust" | "shards" | "crystals" | "fireflies" | "sakura" | "leaves" | "sand";
export type Btn = "plate" | "rune" | "frost" | "blood" | "pill" | "pixel" | "stencil" | "neon" | "tape" | "ransom" | "crystal" | "nier" | "impact" | "western" | "glow";
export type Voice = "celesta" | "bell" | "chip" | "synth" | "box" | "harp";
export type Entry = "rise" | "blur" | "type" | "flicker" | "bounce" | "slam" | "frost";

export type GameTheme = {
  id: string;
  /** Famille CSS du titre. */
  font: string;
  /** Spécification Google Fonts (css2 family=…) ; vide = déjà chargée (Trajan). */
  gf?: string;
  weight: number;
  upper: boolean;
  /** Interlettrage du titre (em). */
  track: number;
  /** Échelle de taille du titre (Press Start 2P est très large : < 1). */
  scale: number;
  /** Encre du titre : couleur ou dégradé (texte détouré). */
  ink: string;
  /** Lueur / ombre du titre. */
  shadow: string;
  /** Couleur forte de l'univers (filets, bouton, particules). */
  accent: string;
  /** Couleur du nom du jeu et de l'artiste. */
  mute: string;
  /** Voile coloré posé sur le fond (bas de l'image). */
  veil: string;
  btn: Btn;
  aura: Aura;
  entry: Entry;
  /** Disparition du perdant au vote. */
  fx: TransitionMode;
  /** Couleur du bord qui consume / dissout (rvb 0-1) et des particules. */
  fxEdge: [number, number, number];
  fxParts: string[];
  voice: Voice;
  /** Note de base du son au vote (Hz). */
  root: number;
};

const T = (t: GameTheme) => t;
const TRAJAN = '"trajan-pro-3", "Cinzel", Georgia, serif';

export const THEMES = {
  eclat: T({ id: "eclat", font: TRAJAN, weight: 400, upper: true, track: 0.03, scale: 1, ink: "linear-gradient(180deg,#fff4d6 0%,#e8c88a 45%,#a77c3c 100%)", shadow: "0 2px 1px rgba(0,0,0,.55), 0 10px 30px rgba(0,0,0,.6)", accent: "#d2ad6e", mute: "#c9bfa9", veil: "rgba(20,12,6,.55)", btn: "plate", aura: "petals", entry: "rise", fx: "burn", fxEdge: [0.86, 0.34, 0.08], fxParts: ["#e0484c", "#c22f36", "#9d1f27"], voice: "celesta", root: 523.25 }),
  souls: T({ id: "souls", font: '"Cormorant SC", Georgia, serif', gf: "Cormorant+SC:wght@500;600", weight: 600, upper: true, track: 0.08, scale: 1.05, ink: "linear-gradient(180deg,#fbf3d8 0%,#dcc78f 55%,#8f7643 100%)", shadow: "0 0 24px rgba(235,200,120,.28), 0 2px 2px rgba(0,0,0,.7)", accent: "#d9c38a", mute: "#b7ad94", veil: "rgba(10,9,6,.6)", btn: "rune", aura: "ash", entry: "blur", fx: "burn", fxEdge: [0.95, 0.72, 0.3], fxParts: ["#e8c46a", "#b8913f", "#6e5a35"], voice: "bell", root: 392 }),
  frost: T({ id: "frost", font: '"Marcellus SC", Georgia, serif', gf: "Marcellus+SC", weight: 400, upper: true, track: 0.06, scale: 1, ink: "linear-gradient(180deg,#ffffff 0%,#d5e8f3 50%,#8fb3c9 100%)", shadow: "0 0 22px rgba(170,215,240,.35), 0 2px 2px rgba(0,0,0,.6)", accent: "#a8d0e6", mute: "#a9bcc6", veil: "rgba(6,12,18,.55)", btn: "frost", aura: "snow", entry: "frost", fx: "dust", fxEdge: [0.75, 0.9, 1], fxParts: ["#e8f6ff", "#bfe0f2", "#ffffff"], voice: "bell", root: 440 }),
  blood: T({ id: "blood", font: '"UnifrakturCook", Georgia, serif', gf: "UnifrakturCook:wght@700", weight: 700, upper: false, track: 0.01, scale: 1.1, ink: "linear-gradient(180deg,#ffe3d6 0%,#e0563d 50%,#7d130d 100%)", shadow: "0 0 26px rgba(220,40,20,.35), 0 3px 2px rgba(0,0,0,.8)", accent: "#d8352a", mute: "#c4a39b", veil: "rgba(22,4,3,.6)", btn: "blood", aura: "embers", entry: "slam", fx: "burn", fxEdge: [0.95, 0.12, 0.05], fxParts: ["#ff4b2b", "#b3160c", "#2a0705"], voice: "harp", root: 349.23 }),
  stars: T({ id: "stars", font: '"Lilita One", system-ui, sans-serif', gf: "Lilita+One", weight: 400, upper: false, track: 0.01, scale: 1.05, ink: "#ffffff", shadow: "0 3px 0 #1d3fbf, 0 6px 0 rgba(0,0,0,.35), 0 0 30px rgba(120,170,255,.45)", accent: "#ffd23f", mute: "#d8def7", veil: "rgba(8,14,40,.45)", btn: "pill", aura: "stars", entry: "bounce", fx: "dust", fxEdge: [1, 0.85, 0.3], fxParts: ["#ffd23f", "#ff5d73", "#4cc9f0", "#7bd389"], voice: "celesta", root: 659.25 }),
  pixel: T({ id: "pixel", font: '"Press Start 2P", ui-monospace, monospace', gf: "Press+Start+2P", weight: 400, upper: true, track: 0.02, scale: 0.55, ink: "#ffffff", shadow: "4px 4px 0 #000, 0 0 18px rgba(255,255,255,.18)", accent: "#ffcc00", mute: "#c9c9c9", veil: "rgba(0,0,0,.55)", btn: "pixel", aura: "pixels", entry: "type", fx: "pixel", fxEdge: [1, 1, 1], fxParts: ["#ffffff", "#ffcc00", "#ff4d4d", "#4dd2ff"], voice: "chip", root: 523.25 }),
  military: T({ id: "military", font: '"Black Ops One", Impact, sans-serif', gf: "Black+Ops+One", weight: 400, upper: true, track: 0.04, scale: 0.92, ink: "#ece4cf", shadow: "0 2px 0 rgba(0,0,0,.8), 0 0 20px rgba(0,0,0,.6)", accent: "#c8a24a", mute: "#b3ab95", veil: "rgba(10,10,6,.6)", btn: "stencil", aura: "sparks", entry: "slam", fx: "tv", fxEdge: [1, 0.7, 0.3], fxParts: ["#ffb347", "#ffd27a"], voice: "synth", root: 293.66 }),
  neon: T({ id: "neon", font: '"Orbitron", system-ui, sans-serif', gf: "Orbitron:wght@600;800", weight: 800, upper: true, track: 0.05, scale: 0.8, ink: "#f4f8ff", shadow: "0 0 8px var(--jg-accent), 0 0 26px var(--jg-accent), 0 2px 2px rgba(0,0,0,.7)", accent: "#35f2ff", mute: "#a9c2cc", veil: "rgba(2,8,14,.55)", btn: "neon", aura: "neon", entry: "flicker", fx: "tv", fxEdge: [0.2, 0.95, 1], fxParts: ["#35f2ff", "#ff2bd6"], voice: "synth", root: 440 }),
  horror: T({ id: "horror", font: '"Special Elite", "Courier New", monospace', gf: "Special+Elite", weight: 400, upper: false, track: 0.02, scale: 0.92, ink: "#e6e1d4", shadow: "0 0 1px #000, 2px 2px 0 rgba(0,0,0,.6), 0 0 22px rgba(120,0,0,.25)", accent: "#a3231a", mute: "#a49e92", veil: "rgba(8,8,8,.62)", btn: "tape", aura: "ash", entry: "type", fx: "dust", fxEdge: [0.55, 0.06, 0.04], fxParts: ["#5a5650", "#2b2826"], voice: "box", root: 311.13 }),
  phantom: T({ id: "phantom", font: '"Anton", Impact, sans-serif', gf: "Anton", weight: 400, upper: true, track: 0.01, scale: 1.05, ink: "#ffffff", shadow: "5px 5px 0 #e3001b, 9px 9px 0 #000", accent: "#e3001b", mute: "#f1d1d1", veil: "rgba(30,0,0,.45)", btn: "ransom", aura: "shards", entry: "slam", fx: "tv", fxEdge: [1, 0.05, 0.1], fxParts: ["#e3001b", "#ffffff", "#000000"], voice: "synth", root: 466.16 }),
  crystal: T({ id: "crystal", font: '"Marcellus", Georgia, serif', gf: "Marcellus", weight: 400, upper: true, track: 0.07, scale: 0.98, ink: "linear-gradient(180deg,#ffffff 0%,#dbe9ff 45%,#86a8e0 100%)", shadow: "0 0 24px rgba(140,180,255,.4), 0 2px 2px rgba(0,0,0,.6)", accent: "#9ec1ff", mute: "#b6c0d6", veil: "rgba(6,10,26,.5)", btn: "crystal", aura: "crystals", entry: "blur", fx: "dust", fxEdge: [0.7, 0.85, 1], fxParts: ["#dbe9ff", "#9ec1ff", "#ffffff"], voice: "celesta", root: 587.33 }),
  nier: T({ id: "nier", font: '"Josefin Sans", system-ui, sans-serif', gf: "Josefin+Sans:wght@300;600", weight: 300, upper: true, track: 0.18, scale: 0.85, ink: "#dad4bb", shadow: "0 2px 2px rgba(0,0,0,.5)", accent: "#cdc6ad", mute: "#a8a28d", veil: "rgba(20,18,14,.5)", btn: "nier", aura: "pixels", entry: "type", fx: "pixel", fxEdge: [0.85, 0.83, 0.73], fxParts: ["#dad4bb", "#57544a"], voice: "box", root: 392 }),
  fight: T({ id: "fight", font: '"Teko", Impact, sans-serif', gf: "Teko:wght@600", weight: 600, upper: true, track: 0.02, scale: 1.25, ink: "linear-gradient(180deg,#ffffff 0%,#ffe066 55%,#ff8a00 100%)", shadow: "3px 3px 0 #8a0c00, 0 0 24px rgba(255,120,0,.35)", accent: "#ff9d00", mute: "#e7cfb0", veil: "rgba(20,6,0,.5)", btn: "impact", aura: "sparks", entry: "slam", fx: "burn", fxEdge: [1, 0.55, 0.05], fxParts: ["#ffb000", "#ff5a00"], voice: "synth", root: 392 }),
  odyssey: T({ id: "odyssey", font: '"Cinzel", Georgia, serif', gf: "Cinzel:wght@500;600", weight: 600, upper: true, track: 0.06, scale: 0.95, ink: "linear-gradient(180deg,#ffffff 0%,#efe2c4 60%,#b99d66 100%)", shadow: "0 2px 2px rgba(0,0,0,.7), 0 0 24px rgba(0,0,0,.5)", accent: "#c9a86a", mute: "#bdb3a0", veil: "rgba(12,10,8,.55)", btn: "plate", aura: "dust", entry: "rise", fx: "dust", fxEdge: [0.95, 0.85, 0.65], fxParts: ["#f1e4cf"], voice: "harp", root: 440 }),
  west: T({ id: "west", font: '"Rye", Georgia, serif', gf: "Rye", weight: 400, upper: true, track: 0.03, scale: 0.85, ink: "linear-gradient(180deg,#fff1d0 0%,#e2b874 60%,#8c5a24 100%)", shadow: "0 3px 0 #2a1608, 0 0 22px rgba(0,0,0,.6)", accent: "#c8102e", mute: "#c9b89a", veil: "rgba(24,12,4,.55)", btn: "western", aura: "sand", entry: "rise", fx: "dust", fxEdge: [0.85, 0.6, 0.3], fxParts: ["#d9b77e", "#8c5a24"], voice: "harp", root: 329.63 }),
  glow: T({ id: "glow", font: '"Cormorant Garamond", Georgia, serif', gf: "Cormorant+Garamond:ital,wght@1,500;1,600", weight: 600, upper: false, track: 0.01, scale: 1.25, ink: "linear-gradient(180deg,#ffffff 0%,#d8f4ff 60%,#8fd3ec 100%)", shadow: "0 0 28px rgba(140,220,255,.5), 0 2px 2px rgba(0,0,0,.5)", accent: "#8fe3ff", mute: "#b9d3dc", veil: "rgba(4,14,20,.45)", btn: "glow", aura: "fireflies", entry: "blur", fx: "dust", fxEdge: [0.6, 0.95, 1], fxParts: ["#cdf6ff", "#8fe3ff"], voice: "harp", root: 523.25 }),
  street: T({ id: "street", font: '"Anton", Impact, sans-serif', gf: "Anton", weight: 400, upper: false, track: 0.01, scale: 1.1, ink: "#ffffff", shadow: "-2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 3px 4px 0 #000, 0 0 24px rgba(0,0,0,.6)", accent: "#5fc45a", mute: "#d4d4c8", veil: "rgba(8,10,6,.5)", btn: "stencil", aura: "dust", entry: "slam", fx: "tv", fxEdge: [1, 0.9, 0.5], fxParts: ["#ffffff"], voice: "synth", root: 329.63 }),
} as const;

export type ThemeId = keyof typeof THEMES;
type Over = Partial<Pick<GameTheme, "font" | "gf" | "accent" | "ink" | "shadow" | "aura" | "weight" | "upper" | "scale" | "track" | "fxParts" | "fxEdge" | "veil">>;

// Jeu → univers (+ retouches propres au jeu).
const GAMES: Record<string, [ThemeId, Over?]> = {
  "Clair Obscur: Expedition 33": ["eclat"],
  "Elden Ring": ["souls"],
  "Dark Souls III": ["souls", { accent: "#e09a4a", aura: "embers" }],
  Bloodborne: ["souls", { font: '"IM Fell English SC", Georgia, serif', gf: "IM+Fell+English+SC", accent: "#b9322a", ink: "linear-gradient(180deg,#f5ece0 0%,#c9b49a 60%,#6e2a22 100%)", aura: "ash" }],
  "Hollow Knight": ["souls", { font: '"Cormorant SC", Georgia, serif', ink: "linear-gradient(180deg,#ffffff 0%,#dfe8f3 60%,#8fa2bd 100%)", accent: "#cfe0f5", aura: "fireflies", shadow: "0 0 22px rgba(190,215,255,.35), 0 2px 2px rgba(0,0,0,.7)" }],
  "Shadow of the Colossus": ["souls", { aura: "dust", accent: "#d8cfb4" }],
  "God of War": ["frost"],
  "God of War Ragnarök": ["frost", { accent: "#cfe8ff" }],
  Skyrim: ["frost", { font: '"Cinzel", Georgia, serif', gf: "Cinzel:wght@500;600" }],
  "The Witcher 3": ["frost", { font: '"IM Fell English SC", Georgia, serif', gf: "IM+Fell+English+SC", accent: "#c7c9cc", ink: "linear-gradient(180deg,#ffffff 0%,#d9d9d9 55%,#8b8f94 100%)", aura: "leaves" }],
  "World of Warcraft": ["frost", { font: '"Cinzel Decorative", Georgia, serif', gf: "Cinzel+Decorative:wght@700", accent: "#7fd4ff" }],
  "God of War III": ["blood", { font: '"Cinzel", Georgia, serif', gf: "Cinzel:wght@500;600", upper: true, track: 0.06, scale: 0.95 }],
  Diablo: ["blood"],
  "Devil May Cry": ["blood"],
  Bayonetta: ["blood", { font: '"Cinzel Decorative", Georgia, serif', gf: "Cinzel+Decorative:wght@700", upper: true, accent: "#c08cff", ink: "linear-gradient(180deg,#ffffff 0%,#e6d2ff 55%,#7d4cc2 100%)", fxParts: ["#c08cff", "#ffffff"], aura: "sakura" }],
  Hades: ["blood", { font: '"Cinzel", Georgia, serif', gf: "Cinzel:wght@500;600", upper: true, track: 0.06, scale: 0.95, accent: "#ff6a3d" }],
  "Super Mario Galaxy": ["stars", { shadow: "0 3px 0 #3b1d8f, 0 6px 0 rgba(0,0,0,.35), 0 0 30px rgba(170,140,255,.5)" }],
  "Mario Kart 8": ["stars", { shadow: "0 3px 0 #b5121b, 0 6px 0 rgba(0,0,0,.35)", accent: "#ff3b3b" }],
  "Super Mario Bros.": ["pixel", { accent: "#e52521" }],
  "Super Smash Bros.": ["stars", { shadow: "0 3px 0 #000, 0 0 30px rgba(255,200,80,.5)" }],
  "Super Smash Bros. Brawl": ["stars", { shadow: "0 3px 0 #000, 0 0 30px rgba(255,200,80,.5)" }],
  Pokémon: ["stars", { shadow: "0 3px 0 #2a75bb, 0 6px 0 rgba(0,0,0,.35)", accent: "#ffcb05" }],
  "Sonic Adventure 2": ["stars", { shadow: "0 3px 0 #0b3fa8, 0 0 26px rgba(40,120,255,.5)", accent: "#2f7bff" }],
  Castlevania: ["pixel", { accent: "#c0392b" }],
  Metroid: ["pixel", { accent: "#ff7b00" }],
  "Chrono Trigger": ["pixel", { accent: "#4dd2ff" }],
  "Street Fighter II": ["pixel", { accent: "#ffcc00" }],
  Undertale: ["pixel", { accent: "#ff2d2d" }],
  Deltarune: ["pixel", { accent: "#7b5cff" }],
  Minecraft: ["pixel", { accent: "#62b246", aura: "pixels" }],
  Celeste: ["pixel", { accent: "#ff6fae", aura: "snow" }],
  "Stardew Valley": ["pixel", { accent: "#7bd389", aura: "leaves" }],
  "Final Fantasy VI": ["pixel", { accent: "#9ec1ff" }],
  "Call of Duty: Black Ops": ["military"],
  "Call of Duty: Black Ops II": ["military", { accent: "#f28c28" }],
  "Call of Duty: Modern Warfare 2": ["military"],
  "Call of Duty: Modern Warfare 3": ["military"],
  "Call of Duty: Ghosts": ["military", { accent: "#9fb2a3" }],
  "Battlefield 1": ["military", { accent: "#d8812a", aura: "ash" }],
  "Metal Gear Solid": ["military", { accent: "#8fae7d" }],
  "Metal Gear Solid 3": ["military", { accent: "#8fae7d", aura: "leaves" }],
  "Far Cry 3": ["street", { accent: "#ff4f2b", aura: "embers" }],
  "Cyberpunk 2077": ["neon", { accent: "#fcee0a", fxParts: ["#fcee0a", "#00f0ff"] }],
  DOOM: ["neon", { font: '"Black Ops One", Impact, sans-serif', gf: "Black+Ops+One", accent: "#ff3b1f", aura: "embers", fxParts: ["#ff3b1f", "#ffb000"] }],
  "DOOM Eternal": ["neon", { font: '"Black Ops One", Impact, sans-serif', gf: "Black+Ops+One", accent: "#ff3b1f", aura: "embers", fxParts: ["#ff3b1f", "#ffb000"] }],
  Halo: ["neon", { accent: "#7cff6b" }],
  Destiny: ["neon", { accent: "#e8e0c8", aura: "crystals" }],
  "Mass Effect 3": ["neon", { accent: "#4fa3ff" }],
  Overwatch: ["neon", { font: '"Big Shoulders Display", Impact, sans-serif', gf: "Big+Shoulders+Display:wght@800", accent: "#f99e1a", scale: 1.15 }],
  Transistor: ["neon", { accent: "#ff4f6d", font: '"Cormorant SC", Georgia, serif', gf: "Cormorant+SC:wght@500;600", scale: 1.05 }],
  "Outer Wilds": ["neon", { accent: "#ff9a3c", aura: "stars", font: '"Space Mono", monospace', gf: "Space+Mono:wght@700", scale: 0.75 }],
  Portal: ["neon", { accent: "#ff9a00", font: '"Inter Tight", system-ui, sans-serif', gf: "Inter+Tight:wght@300", ink: "#ffffff", upper: false, scale: 1.05, aura: "dust" }],
  "Silent Hill 2": ["horror"],
  "Resident Evil": ["horror"],
  "The Last of Us": ["horror", { accent: "#7f9a5b", aura: "dust" }],
  "The Last of Us Part II": ["horror", { accent: "#8fa26c", aura: "leaves" }],
  "Dying Light": ["horror", { accent: "#ff8a2a" }],
  "Death Stranding": ["horror", { accent: "#d7b46a", aura: "dust", font: '"Josefin Sans", system-ui, sans-serif', gf: "Josefin+Sans:wght@300;600", upper: true, track: 0.16, scale: 0.85 }],
  "Persona 5": ["phantom"],
  "Final Fantasy VII": ["crystal", { accent: "#8fe388" }],
  "Final Fantasy VIII": ["crystal"],
  "Final Fantasy IX": ["crystal", { accent: "#f2c46d" }],
  "Final Fantasy X": ["crystal", { accent: "#7fd6ff" }],
  "Final Fantasy XIV": ["crystal"],
  "Final Fantasy XV": ["crystal", { accent: "#c7d0de" }],
  "Kingdom Hearts": ["crystal", { accent: "#ffd76a", aura: "stars" }],
  "Chrono Cross": ["crystal", { accent: "#5fd0c0" }],
  "League of Legends": ["crystal", { font: '"Cinzel", Georgia, serif', gf: "Cinzel:wght@500;600", accent: "#c8aa6e", ink: "linear-gradient(180deg,#fff7e0 0%,#e9d39d 55%,#a07a3a 100%)" }],
  "Genshin Impact": ["crystal", { accent: "#ffe08a", aura: "fireflies" }],
  "Fire Emblem": ["crystal", { font: '"Cinzel", Georgia, serif', gf: "Cinzel:wght@500;600", accent: "#e8c36a" }],
  "NieR:Automata": ["nier"],
  Tekken: ["fight"],
  "Mortal Kombat": ["fight", { accent: "#ffd200", fxParts: ["#ffd200", "#c91a00"] }],
  "Dragon Ball Xenoverse": ["fight", { accent: "#ffb400", aura: "embers" }],
  "Monster Hunter": ["fight", { font: '"Cinzel", Georgia, serif', gf: "Cinzel:wght@500;600", accent: "#e8b14a", aura: "embers", scale: 0.95 }],
  "Marvel's Spider-Man": ["fight", { font: '"Bebas Neue", Impact, sans-serif', gf: "Bebas+Neue", ink: "#ffffff", shadow: "3px 3px 0 #b11313, 0 0 24px rgba(220,30,30,.4)", accent: "#e01e1e", aura: "dust" }],
  "Marvel's Spider-Man: Miles Morales": ["fight", { font: '"Bebas Neue", Impact, sans-serif', gf: "Bebas+Neue", ink: "#ffffff", shadow: "3px 3px 0 #b11313, -2px -2px 0 #23d5ff", accent: "#ff2e43", aura: "neon" }],
  "Batman: Arkham City": ["military", { font: '"Oswald", Impact, sans-serif', gf: "Oswald:wght@600", accent: "#7fa7c9", aura: "dust" }],
  "Batman: Arkham Origins": ["military", { font: '"Oswald", Impact, sans-serif', gf: "Oswald:wght@600", accent: "#9fc2e0", aura: "snow" }],
  "Assassin's Creed II": ["odyssey", { accent: "#c8102e" }],
  "Assassin's Creed Brotherhood": ["odyssey", { accent: "#c8102e" }],
  "Assassin's Creed Revelations": ["odyssey", { accent: "#c8102e" }],
  "Assassin's Creed III": ["odyssey", { accent: "#c8102e", aura: "snow" }],
  "Assassin's Creed IV: Black Flag": ["odyssey", { accent: "#e2c06a", aura: "sand" }],
  "Ghost of Tsushima": ["odyssey", { font: '"Shippori Mincho", Georgia, serif', gf: "Shippori+Mincho:wght@600", accent: "#e8e0d0", aura: "sakura", upper: false }],
  "Uncharted 4": ["odyssey", { aura: "sand" }],
  "Tomb Raider": ["odyssey", { aura: "ash" }],
  "Horizon Zero Dawn": ["odyssey", { accent: "#4fd1c5", aura: "leaves" }],
  "Baldur's Gate 3": ["odyssey", { accent: "#c79a4b", aura: "embers" }],
  "Fallout 4": ["west", { font: '"Share Tech Mono", monospace', gf: "Share+Tech+Mono", ink: "#9dff9d", shadow: "0 0 14px rgba(80,255,80,.5)", accent: "#5cff5c", aura: "dust", scale: 0.85 }],
  "Fallout: New Vegas": ["west", { accent: "#e2a84a" }],
  "Red Dead Redemption 2": ["west"],
  "Need for Speed: Most Wanted": ["street", { font: '"Russo One", Impact, sans-serif', gf: "Russo+One", accent: "#ff9a1f" }],
  "GTA San Andreas": ["street", { accent: "#5fc45a" }],
  "GTA IV": ["street", { accent: "#e5e5e5", aura: "dust" }],
  "GTA V": ["street", { accent: "#5fc45a" }],
  "Ori and the Blind Forest": ["glow"],
  "Ori and the Will of the Wisps": ["glow", { accent: "#b48cff" }],
  Journey: ["glow", { accent: "#ffb867", ink: "linear-gradient(180deg,#ffffff 0%,#ffe1b8 60%,#d58a43 100%)", aura: "sand", shadow: "0 0 28px rgba(255,180,100,.45), 0 2px 2px rgba(0,0,0,.5)" }],
  "The Legend of Zelda": ["glow", { font: '"Cinzel Decorative", Georgia, serif', gf: "Cinzel+Decorative:wght@700", upper: true, scale: 0.85, accent: "#7ee3a2", ink: "linear-gradient(180deg,#ffffff 0%,#f4e7b0 55%,#c49b3a 100%)", shadow: "0 0 26px rgba(120,230,160,.35), 0 2px 2px rgba(0,0,0,.6)" }],
  Bastion: ["glow", { font: '"Cinzel", Georgia, serif', gf: "Cinzel:wght@500;600", upper: true, scale: 0.95, accent: "#ffb347", aura: "leaves" }],
  Dofus: ["glow", { font: '"Fredoka", system-ui, sans-serif', gf: "Fredoka:wght@600", upper: false, scale: 1.05, accent: "#9bd65f", ink: "#ffffff", aura: "leaves" }],
};

const loaded = new Set<string>();
function loadFont(gf: string | undefined) {
  if (!gf || loaded.has(gf) || typeof document === "undefined") return;
  loaded.add(gf);
  const l = document.createElement("link");
  l.rel = "stylesheet";
  l.href = `https://fonts.googleapis.com/css2?family=${gf}&display=swap`;
  document.head.appendChild(l);
}

const cache = new Map<string, GameTheme>();
/** Univers d'un jeu (Clair Obscur par défaut). Charge sa police au passage. */
export function gameTheme(game: string | undefined): GameTheme {
  const key = game ?? "";
  let t = cache.get(key);
  if (!t) {
    const [id, over] = GAMES[key] ?? ["eclat"];
    t = { ...THEMES[id], ...(over ?? {}) };
    cache.set(key, t);
  }
  loadFont(t.gf);
  return t;
}

/** Couleur du nom du jeu : la couleur de l'univers, sauf si elle est trop sombre pour être lue sur le noir. */
export function labelColor(t: GameTheme) {
  const v = parseInt(t.accent.slice(1), 16);
  const [r, g, b] = [(v >> 16) & 255, (v >> 8) & 255, v & 255].map((c) => {
    const x = c / 255;
    return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 0.16 ? t.mute : t.accent;
}
