// Les tournois en duels de Brams Community. Chacun a son univers (thème CSS du
// même nom dans src/components/tournois/themes) ; le moteur, lui, est commun.

export type TournamentSlug = "ost" | "openings" | "endings" | "rap" | "rapvsost" | "bankai" | "panels";

export type Seam = "diag" | "screens" | "feather" | "tape" | "zigzag" | "slash" | "gutter";

export type TournamentMeta = {
  slug: TournamentSlug;
  /** Segment d'URL : /tournoi/<path>. */
  path: string;
  /** Identifiant des stats du site (table versus_duels, RPC versus_record / versus_stats / versus_pair). */
  statsId?: string;
  title: string;
  /** Nom court dans la barre du tournoi. */
  brand: string;
  signature: string;
  /** Une ligne pour la carte du hub. */
  tagline: string;
  /** Texte de l'accueil du tournoi. */
  lead: string;
  /** Participants au pluriel / au singulier : « pistes » / « OST ». */
  unit: string;
  unitOne: string;
  /** Les tournois d'images se jouent sans son. */
  mode: "audio" | "image";
  formats: number[];
  defaultFormat: number;
  seam: Seam;
  /** Vidéos R2 : image au repos et départ de la lecture (secondes). */
  posterAt?: number;
  playFrom?: number;
  /** Tirage équilibré entre les deux camps (Rap contre OST). */
  balanced?: boolean;
  choose: string;
  sides: [string, string];
  championLabel: string;
  groupLabel: string;
};

export const TOURNAMENTS: TournamentMeta[] = [
  {
    slug: "ost",
    path: "ost",
    statsId: "anime-ost",
    title: "Tournoi d'OST",
    brand: "Tournoi d'OST",
    signature: "La meilleure OST d'anime sera-t-elle la tienne ?",
    tagline: "Deux OST face à face, la photo de leur anime derrière.",
    lead: "{n} thèmes d'anime s'affrontent en duels. Tu écoutes les deux, tu choisis ta préférée, et elle avance jusqu'à la finale.",
    unit: "OST",
    unitOne: "OST",
    mode: "audio",
    formats: [16, 32, 64],
    defaultFormat: 32,
    seam: "diag",
    choose: "Choisir cette OST",
    sides: ["OST A", "OST B"],
    championLabel: "Ton OST championne",
    groupLabel: "Animes",
  },
  {
    slug: "openings",
    path: "openings",
    statsId: "anime-openings",
    title: "Tournoi des openings",
    brand: "Openings",
    signature: "Un seul générique restera à l'antenne.",
    tagline: "Deux écrans, deux génériques. Un seul reste à l'antenne.",
    lead: "{n} génériques d'ouverture, {g} animes. Chaque opening passe sur son écran : tu écoutes, tu laisses à l'antenne celui qui te donne encore des frissons.",
    unit: "openings",
    unitOne: "opening",
    mode: "audio",
    formats: [16, 32, 64, 128, 256],
    defaultFormat: 32,
    seam: "screens",
    posterAt: 22,
    playFrom: 0,
    choose: "Garder à l'antenne",
    sides: ["Écran 1", "Écran 2"],
    championLabel: "Ton opening",
    groupLabel: "Animes",
  },
  {
    slug: "endings",
    path: "endings",
    statsId: "anime-endings",
    title: "Tournoi des endings",
    brand: "Endings",
    signature: "Celui qu'on laisse tourner jusqu'à la dernière note.",
    tagline: "Les génériques de fin qu'on ne zappe jamais.",
    lead: "{n} génériques de fin, {g} animes. Ceux qu'on laisse tourner, l'épisode fini. Tu écoutes, tu gardes celui qui reste en tête.",
    unit: "endings",
    unitOne: "ending",
    mode: "audio",
    formats: [16, 32, 64, 128, 256],
    defaultFormat: 32,
    seam: "feather",
    posterAt: 30,
    playFrom: 0,
    choose: "Choisir cet ending",
    sides: ["Premier ending", "Second ending"],
    championLabel: "Ton ending",
    groupLabel: "Animes",
  },
  {
    slug: "rap",
    path: "rap-fr",
    statsId: "rap-fr",
    title: "Tournoi du rap FR",
    brand: "Rap FR",
    signature: "Face A contre face B. Une seule tourne en boucle.",
    tagline: "Face A contre face B. Une seule tourne en boucle.",
    lead: "{n} sons de rap français, {g} artistes. Face A contre face B : tu écoutes les deux, tu gardes celle que tu remets en boucle.",
    unit: "sons",
    unitOne: "son",
    mode: "audio",
    formats: [16, 32, 64],
    defaultFormat: 32,
    seam: "tape",
    posterAt: 45,
    playFrom: 40,
    choose: "Choisir ce son",
    sides: ["Face A", "Face B"],
    championLabel: "Ton son",
    groupLabel: "Artistes",
  },
  {
    slug: "rapvsost",
    path: "rap-vs-ost",
    statsId: "rap-vs-ost",
    title: "Rap FR contre OST",
    brand: "Rap contre OST",
    signature: "Deux camps, un seul champion.",
    tagline: "Deux camps, un seul champion.",
    lead: "Le rap français contre les thèmes d'anime, {n} titres en tout. Chaque duel fait pencher la balance d'un camp. À la fin, un seul reste debout.",
    unit: "sons",
    unitOne: "son",
    mode: "audio",
    formats: [16, 32, 64],
    defaultFormat: 32,
    seam: "zigzag",
    posterAt: 45,
    playFrom: 40,
    balanced: true,
    choose: "Choisir ce son",
    sides: ["Coin gauche", "Coin droit"],
    championLabel: "Ton champion",
    groupLabel: "Camps",
  },
  {
    slug: "bankai",
    path: "bankai",
    statsId: "bleach-bankai",
    title: "Tournoi des Bankai",
    brand: "Bankai",
    signature: "Une coupe, deux lames.",
    tagline: "Une coupe, deux lames.",
    lead: "Les 32 Bankai de Bleach. Chaque duel tranche l'écran en deux : tu choisis la lame qui t'impressionne le plus.",
    unit: "Bankai",
    unitOne: "Bankai",
    mode: "image",
    formats: [8, 16, 32],
    defaultFormat: 16,
    seam: "slash",
    choose: "Choisir ce Bankai",
    sides: ["Lame gauche", "Lame droite"],
    championLabel: "Ton Bankai",
    groupLabel: "Porteurs",
  },
  {
    slug: "panels",
    path: "panels",
    statsId: "manga-panels",
    title: "Tournoi des cases",
    brand: "Cases de manga",
    signature: "Deux cases sur la planche, une seule reste.",
    tagline: "Deux cases sur la planche, une seule reste.",
    lead: "{n} cases de manga cultes, {g} séries. Deux cases par planche : tu choisis celle qui t'a marqué.",
    unit: "cases",
    unitOne: "case",
    mode: "image",
    formats: [16, 32, 64, 128],
    defaultFormat: 32,
    seam: "gutter",
    choose: "Choisir cette case",
    sides: ["Case gauche", "Case droite"],
    championLabel: "Ta case",
    groupLabel: "Séries",
  },
];

/** Remplace {n} (participants) et {g} (groupes) dans un texte du registre. */
/** « de » élidé devant voyelle ou h muet : « d’OST », « de cases ». */
export const de = (word: string) => (/^[aeiouhéèê]/i.test(word) ? `d’${word}` : `de ${word}`);

export function fill(text: string, participants: { group: string }[]) {
  return text.replace("{n}", String(participants.length)).replace("{g}", String(new Set(participants.map((p) => p.group)).size));
}

export const tournament = (slug: string) => TOURNAMENTS.find((t) => t.slug === slug) ?? null;
