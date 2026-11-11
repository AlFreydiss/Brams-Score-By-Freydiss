// Participant d'un tournoi, quel que soit son média.
// visual : ce qu'on voit dans la moitié de l'écran. sound : ce qu'on entend.
export type Visual =
  | { k: "img"; src: string; pos?: string; fallback?: string }
  | { k: "video"; src: string };

// « video » : la vidéo R2 du site, affichée dans la moitié et démutée pour l'écoute.
// « audio » : un fichier lu par le lecteur du site (extrait Apple Music, ou fichier R2).
// « youtube » : la piste complète, lue par l'iframe YouTube jusqu'à la fin.
export type Sound =
  /** hook : début du passage le plus fort (secondes), mesuré hors ligne. */
  | { k: "video"; end?: number; hook?: number }
  | { k: "audio"; src: string; link?: string; preview?: boolean }
  | { k: "youtube"; id: string; start?: number; end?: number; link?: string; fallback?: string };

export type Participant = {
  id: string;
  title: string;
  sub?: string;
  artist?: string;
  group: string;
  note?: string;
  thumb: string;
  camp?: "rap" | "ost";
  visual: Visual;
  sound?: Sound;
  /** Multiplie le volume de lecture (1.3 = +30 %), plafonné au maximum du lecteur. */
  gain?: number;
};

/** Volume 0-100 de la piste, gain compris. */
export const gained = (p: Participant | null | undefined, volume: number) =>
  Math.min(100, volume * (p?.gain ?? 1));

export type Match = {
  id: string;
  position: number;
  size: number;
  status: "pending" | "voting" | "closed";
  left: Participant | null;
  right: Participant | null;
  leftReady: boolean;
  rightReady: boolean;
  winnerId: string | null;
};

export type Round = { id: string; size: number; matches: Match[] };

export type Run = { size: number; rounds: Round[]; blind: boolean; startedAt: number };
