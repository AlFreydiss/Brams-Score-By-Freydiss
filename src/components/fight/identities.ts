import { fonts } from "@/styles/typography";

// Identité de chaque tournoi « Fight Night » : couleurs, style du calque
// réactif au son, transition de sortie et curseur. Pas les mêmes cartes
// recolorées : chaque univers a sa façon de bouger.

export type FightSlug = "ost" | "openings" | "endings";
export type ReactStyle = "vinyl" | "crt" | "dust";
export type ExitStyle = "spin" | "zap" | "fade";

export type Identity = {
  name: string;
  /** Fond de la scène. */
  bg: string;
  ink: string;
  mute: string;
  /** Couleur signature et sa variante. */
  a: string;
  b: string;
  react: ReactStyle;
  exit: ExitStyle;
  /** Libellé du camp (A / B). */
  sides: [string, string];
};

export const IDENTITIES: Record<FightSlug, Identity> = {
  ost: {
    name: "La Salle de Concert",
    bg: "#0b0806",
    ink: "#f6ecdf",
    mute: "#a8988a",
    a: "#f2a33a",
    b: "#ffd18a",
    react: "vinyl",
    exit: "spin",
    sides: ["Face A", "Face B"],
  },
  openings: {
    name: "L'Antenne",
    bg: "#07080a",
    ink: "#f1f4f6",
    mute: "#8e98a2",
    a: "#ff3348",
    b: "#2fe6ff",
    react: "crt",
    exit: "zap",
    sides: ["Chaîne 1", "Chaîne 2"],
  },
  endings: {
    name: "Le Générique de Fin",
    bg: "#0c0807",
    ink: "#f8eee6",
    mute: "#ab9a90",
    a: "#ff8a5c",
    b: "#f6c46a",
    react: "dust",
    exit: "fade",
    sides: ["Fin A", "Fin B"],
  },
};

export const isFight = (slug: string): slug is FightSlug => slug === "ost" || slug === "openings" || slug === "endings";

export const FONT = fonts;
