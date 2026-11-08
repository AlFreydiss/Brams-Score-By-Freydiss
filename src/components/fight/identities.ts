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

// Même famille que BFR et le portfolio (noir presque pur, filets 1 px,
// étiquettes en capitales espacées, une seule lueur d'ambiance), mais une voix
// à part : Bricolage + Inter et une couleur par tournoi, posée avec parcimonie.
export const IDENTITIES: Record<FightSlug, Identity> = {
  ost: {
    name: "La Salle de Concert",
    bg: "#08090d",
    ink: "#f4f2ec",
    mute: "#8b8a85",
    a: "#d9a35a",
    b: "#f0d3a0",
    react: "vinyl",
    exit: "spin",
    sides: ["Face A", "Face B"],
  },
  openings: {
    name: "L'Antenne",
    bg: "#08090d",
    ink: "#f4f2ec",
    mute: "#8b8a85",
    a: "#ef4d5a",
    b: "#6fd3ea",
    react: "crt",
    exit: "zap",
    sides: ["Chaîne 1", "Chaîne 2"],
  },
  endings: {
    name: "Le Générique de Fin",
    bg: "#08090d",
    ink: "#f4f2ec",
    mute: "#8b8a85",
    a: "#e9875f",
    b: "#f2c98a",
    react: "dust",
    exit: "fade",
    sides: ["Fin A", "Fin B"],
  },
};

/** Courbe commune (BFR / portfolio) : départ franc, arrivée très douce. */
export const EASE = [0.16, 1, 0.3, 1] as const;
export const LINE = "rgba(244, 242, 236, 0.08)";
export const LINE_2 = "rgba(244, 242, 236, 0.16)";
export const PANEL = "#0e1014";

export const isFight = (slug: string): slug is FightSlug => slug === "ost" || slug === "openings" || slug === "endings";

export const FONT = fonts;
