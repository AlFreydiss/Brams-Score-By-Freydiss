import type { Match, Participant, Round } from "./types";

// Élimination directe. Les places vides (pool qui n'est pas une puissance de 2)
// se referment toutes seules : le participant d'en face passe sans jouer.

export function shuffle<T>(list: readonly T[]): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const nextPow2 = (n: number) => {
  let s = 2;
  while (s < n) s *= 2;
  return s;
};

export function generateBracket(participants: Participant[]): Round[] {
  const first = nextPow2(participants.length);
  const slots: (Participant | null)[] = [...participants, ...Array(first - participants.length).fill(null)];
  const rounds: Round[] = [];
  for (let size = first; size >= 2; size /= 2) {
    const isFirst = size === first;
    const matches: Match[] = Array.from({ length: size / 2 }, (_, i) => ({
      id: `r${size}_m${i}`,
      position: i,
      size,
      status: "pending",
      left: isFirst ? slots[i * 2] : null,
      right: isFirst ? slots[i * 2 + 1] : null,
      leftReady: isFirst,
      rightReady: isFirst,
      winnerId: null,
    }));
    rounds.push({ id: `round_${size}`, size, matches });
  }
  closeByes(rounds);
  openNext(rounds);
  return rounds;
}

function place(rounds: Round[], ri: number, mi: number, p: Participant | null) {
  const next = rounds[ri + 1];
  if (!next) return;
  const m = next.matches[Math.floor(mi / 2)];
  const slot = mi % 2 === 0 ? "left" : "right";
  if (p) m[slot] = p;
  m[slot === "left" ? "leftReady" : "rightReady"] = true;
}

function closeByes(rounds: Round[]) {
  let changed = true;
  while (changed) {
    changed = false;
    rounds.forEach((round, ri) =>
      round.matches.forEach((m, mi) => {
        if (m.status !== "pending" || !m.leftReady || !m.rightReady) return;
        if (m.left && m.right) return;
        m.status = "closed";
        const w = m.left || m.right;
        m.winnerId = w?.id ?? null;
        place(rounds, ri, mi, w);
        changed = true;
      }),
    );
  }
}

function openNext(rounds: Round[]) {
  if (currentMatch(rounds)) return;
  for (const round of rounds)
    for (const m of round.matches)
      if (m.status === "pending" && m.left && m.right && m.leftReady && m.rightReady) {
        m.status = "voting";
        return;
      }
}

export function currentMatch(rounds: Round[]): { round: Round; match: Match } | null {
  for (const round of rounds) for (const match of round.matches) if (match.status === "voting") return { round, match };
  return null;
}

export function champion(rounds: Round[]): Participant | null {
  const m = rounds[rounds.length - 1]?.matches[0];
  if (!m || m.status !== "closed" || !m.winnerId) return null;
  return m.left?.id === m.winnerId ? m.left : m.right;
}

export function advance(rounds: Round[], matchId: string, winnerId: string): Round[] {
  const r: Round[] = structuredClone(rounds);
  r.forEach((round, ri) =>
    round.matches.forEach((m, mi) => {
      if (m.id !== matchId) return;
      m.status = "closed";
      m.winnerId = winnerId;
      place(r, ri, mi, m.left?.id === winnerId ? m.left : m.right);
    }),
  );
  closeByes(r);
  openNext(r);
  return r;
}

export const winnerOf = (m: Match) => (m.winnerId ? (m.left?.id === m.winnerId ? m.left : m.right) : null);
export const loserOf = (m: Match) => (m.winnerId ? (m.left?.id === m.winnerId ? m.right : m.left) : null);

export function roundName(size: number) {
  if (size === 2) return "Finale";
  if (size === 4) return "Demi-finales";
  if (size === 8) return "Quarts de finale";
  if (size === 16) return "Huitièmes de finale";
  if (size === 32) return "Seizièmes de finale";
  return `${size / 2}es de finale`;
}

export function ranking(rounds: Round[]) {
  const out: { p: Participant; rank: string }[] = [];
  const c = champion(rounds);
  if (c) out.push({ p: c, rank: "1" });
  const n = rounds.length;
  const add = (round: Round | undefined, rank: string) =>
    round?.matches.forEach((m) => {
      const l = loserOf(m);
      if (l) out.push({ p: l, rank });
    });
  add(rounds[n - 1], "2");
  add(rounds[n - 2], "3–4");
  add(rounds[n - 3], "5–8");
  return out;
}
