import { champion, roundName } from "./bracket";
import type { Participant, Run } from "./types";

// Classement calculé uniquement à partir des duels réellement joués dans ce
// navigateur. Aucune donnée n'est inventée : un participant jamais tiré n'a
// simplement pas de ligne.

export type VoteLike = { winner: string; loser: string };

export type Status = { kind: "champion" | "alive" | "out" | "none"; label: string };

export type Row = {
  p: Participant;
  wins: number;
  losses: number;
  duels: number;
  /** Pourcentage de victoires, null en dessous de 3 duels (trop peu pour dire quelque chose). */
  rate: number | null;
  status: Status;
};

export const MIN_DUELS_FOR_RATE = 3;

export function runStatus(run: Run | null, id: string): Status {
  if (!run) return { kind: "none", label: "Hors partie" };
  const c = champion(run.rounds);
  if (c?.id === id) return { kind: "champion", label: "Champion" };
  let present = false;
  for (const round of run.rounds)
    for (const m of round.matches) {
      if (m.left?.id !== id && m.right?.id !== id) continue;
      present = true;
      if (m.status === "closed" && m.winnerId && m.winnerId !== id) return { kind: "out", label: `Éliminé en ${roundName(round.size).toLowerCase()}` };
    }
  return present ? { kind: "alive", label: "En lice" } : { kind: "none", label: "Hors partie" };
}

export function computeRows(votes: VoteLike[], participants: Participant[], run: Run | null): Row[] {
  const byId = new Map(participants.map((p) => [p.id, p]));
  const acc = new Map<string, { wins: number; losses: number }>();
  const bump = (id: string, k: "wins" | "losses") => {
    const r = acc.get(id) ?? { wins: 0, losses: 0 };
    r[k]++;
    acc.set(id, r);
  };
  for (const v of votes) {
    bump(v.winner, "wins");
    bump(v.loser, "losses");
  }
  // Les participants de la partie en cours apparaissent même sans duel joué.
  const ids = new Set(acc.keys());
  if (run) for (const m of run.rounds[0]?.matches ?? []) for (const p of [m.left, m.right]) if (p) ids.add(p.id);
  const rows: Row[] = [];
  for (const id of ids) {
    const p = byId.get(id);
    if (!p) continue;
    const { wins, losses } = acc.get(id) ?? { wins: 0, losses: 0 };
    const duels = wins + losses;
    rows.push({ p, wins, losses, duels, rate: duels >= MIN_DUELS_FOR_RATE ? Math.round((wins / duels) * 100) : null, status: runStatus(run, id) });
  }
  return rows;
}

export type SortKey = "rank" | "rate" | "wins" | "duels" | "title" | "group";

export function sortRows(rows: Row[], by: SortKey): Row[] {
  const out = [...rows];
  const statusWeight = (s: Status) => (s.kind === "champion" ? 3 : s.kind === "alive" ? 2 : s.kind === "out" ? 1 : 0);
  if (by === "rank") out.sort((a, b) => b.wins - a.wins || (b.rate ?? -1) - (a.rate ?? -1) || statusWeight(b.status) - statusWeight(a.status) || a.losses - b.losses);
  // Sur le site : le pourcentage d'abord, les participants sans assez de duels à la fin.
  if (by === "rate") out.sort((a, b) => (b.rate ?? -1) - (a.rate ?? -1) || b.duels - a.duels);
  if (by === "wins") out.sort((a, b) => b.wins - a.wins || a.losses - b.losses);
  if (by === "duels") out.sort((a, b) => b.duels - a.duels || b.wins - a.wins);
  if (by === "title") out.sort((a, b) => a.p.title.localeCompare(b.p.title, "fr"));
  if (by === "group") out.sort((a, b) => a.p.group.localeCompare(b.p.group, "fr") || b.wins - a.wins);
  return out;
}

/** Stats du site (RPC versus_stats) : victoires et duels par participant, tous joueurs confondus. */
export type SiteStats = Map<string, { wins: number; duels: number }>;

/** Pourcentage affiché à partir de ce nombre de duels sur le site. */
export const MIN_SITE_DUELS = 5;

export function rowsFromSite(stats: SiteStats, participants: Participant[], run: Run | null): Row[] {
  const byId = new Map(participants.map((p) => [p.id, p]));
  const rows: Row[] = [];
  for (const [id, s] of stats) {
    const p = byId.get(id);
    if (!p || s.duels <= 0) continue;
    rows.push({
      p,
      wins: s.wins,
      losses: s.duels - s.wins,
      duels: s.duels,
      rate: s.duels >= MIN_SITE_DUELS ? Math.round((s.wins / s.duels) * 100) : null,
      status: runStatus(run, id),
    });
  }
  return rows;
}
