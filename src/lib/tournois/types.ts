// Participant d'un tournoi, quel que soit son média.
// visual : ce qu'on voit dans la moitié de l'écran. sound : ce qu'on entend.
export type Visual =
  | { k: "img"; src: string; pos?: string; fallback?: string }
  | { k: "video"; src: string };

export type Sound = { k: "yt"; id: string; start?: number; end?: number } | { k: "video"; end?: number };

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
};

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
