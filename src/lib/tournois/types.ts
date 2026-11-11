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

/**
 * Volume 0-100 de la piste, gain compris. Le lecteur s'arrête à 100 : le gain
 * s'applique en entier jusqu'au volume par défaut (70), puis la courbe rejoint
 * 100 en restant croissante, pour que le haut du curseur agisse encore.
 */
export function gained(p: Participant | null | undefined, volume: number) {
  const g = p?.gain ?? 1;
  if (g <= 1) return volume;
  const knee = Math.min(70, 100 / g);
  if (volume <= knee) return volume * g;
  return knee * g + ((volume - knee) * (100 - knee * g)) / (100 - knee);
}

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
