import { useSyncExternalStore } from "react";
import { advance, champion, currentMatch, generateBracket, shuffle } from "./bracket";
import type { Participant, Round, Run } from "./types";
import { recordDuel } from "@/lib/versusStats.js";

// Chaque tournoi est joué dans le navigateur et tout est rangé dans
// localStorage (une clé par tournoi). Les pages Tableau, Classement,
// Historique et Favoris lisent ce même état.

export type Vote = {
  at: number;
  run: number;
  round: number;
  matchId: string;
  winner: string;
  loser: string;
  ms: number;
};

export type Saved = {
  run: Run | null;
  /** Bracket juste avant le dernier choix : un seul retour en arrière possible. */
  undo: { rounds: Round[]; vote: Vote } | null;
  votes: Vote[];
  favorites: string[];
  champions: { id: string; size: number; at: number }[];
  settings: { autoplay: boolean };
};

const EMPTY: Saved = { run: null, undo: null, votes: [], favorites: [], champions: [], settings: { autoplay: false } };
const MAX_VOTES = 3000;

const key = (slug: string) => `tournoi_${slug}_v1`;
const cache = new Map<string, Saved>();
const listeners = new Set<() => void>();

function load(slug: string): Saved {
  const hit = cache.get(slug);
  if (hit) return hit;
  let saved = EMPTY;
  try {
    const raw = JSON.parse(localStorage.getItem(key(slug)) || "null");
    if (raw && typeof raw === "object") saved = { ...EMPTY, ...raw, settings: { ...EMPTY.settings, ...raw.settings } };
  } catch {}
  cache.set(slug, saved);
  return saved;
}

function save(slug: string, next: Saved) {
  cache.set(slug, next);
  try {
    localStorage.setItem(key(slug), JSON.stringify(next));
  } catch {}
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (!e.key?.startsWith("tournoi_") || !e.key.endsWith("_v1")) return;
    cache.delete(e.key.replace(/^tournoi_/, "").replace(/_v1$/, ""));
    cb();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

export function useSaved(slug: string): Saved {
  return useSyncExternalStore(
    subscribe,
    () => load(slug),
    () => EMPTY,
  );
}

/**
 * Une partie fige ses participants. Quand le catalogue change (son, image,
 * titre), ils sont remplacés par leur version actuelle ; si l'un d'eux a
 * quitté le catalogue, la partie en cours est abandonnée. L'historique, les
 * favoris et les champions restent.
 */
export function reconcile(slug: string, byId: Map<string, Participant>) {
  const s = load(slug);
  if (!s.run) return;
  let missing = false;
  let changed = false;
  const fresh = (p: Participant | null) => {
    if (!p) return p;
    const cur = byId.get(p.id);
    if (!cur) {
      missing = true;
      return p;
    }
    if (JSON.stringify(cur) !== JSON.stringify(p)) changed = true;
    return cur;
  };
  const rounds = s.run.rounds.map((r) => ({ ...r, matches: r.matches.map((m) => ({ ...m, left: fresh(m.left), right: fresh(m.right) })) }));
  if (missing) save(slug, { ...s, run: null, undo: null });
  else if (changed) save(slug, { ...s, run: { ...s.run, rounds }, undo: null });
}

/**
 * Tire `size` participants du pool. « balanced » (Rap contre OST) prend autant
 * dans chaque camp et les apparie : au premier tour, chaque duel oppose un son
 * de rap à une OST, chacun d'un côté tiré au hasard.
 */
export function draw(pool: Participant[], size: number, balanced = false): Participant[] {
  if (!balanced) return shuffle(pool).slice(0, size);
  const a = shuffle(pool.filter((p) => p.camp === "rap"));
  const b = shuffle(pool.filter((p) => p.camp !== "rap"));
  const half = Math.min(size / 2, a.length, b.length);
  const pairs = Array.from({ length: half }, (_, i) => (Math.random() < 0.5 ? [a[i], b[i]] : [b[i], a[i]]));
  return shuffle(pairs).flat();
}

// Stats du site (versus_duels) : le dernier choix reste en attente tant qu'il
// peut être annulé. Il part au choix suivant, à une nouvelle partie, quand on
// quitte le tournoi ou que l'onglet passe en arrière-plan ; « Annuler » le
// retire avant envoi. Sinon voter, annuler et revoter compterait deux duels.
let pending: { statsId: string; winner: string; loser: string } | null = null;

export function flushDuel() {
  if (!pending) return;
  const { statsId, winner, loser } = pending;
  pending = null;
  recordDuel(statsId, winner, loser);
}

if (typeof window !== "undefined") {
  window.addEventListener("pagehide", flushDuel);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flushDuel();
  });
}

export const actions = {
  start(slug: string, chosen: Participant[], blind: boolean) {
    flushDuel();
    const s = load(slug);
    save(slug, { ...s, run: { size: chosen.length, rounds: generateBracket(chosen), blind, startedAt: Date.now() }, undo: null });
  },

  /**
   * Enregistre le choix du duel en cours. Renvoie false si le duel n'accepte plus de vote.
   * @param statsId tournoi côté site : le duel compte aussi dans les stats communes.
   */
  vote(slug: string, matchId: string, winnerId: string, ms: number, statsId?: string): boolean {
    const s = load(slug);
    const run = s.run;
    const cur = run && currentMatch(run.rounds);
    // Le duel doit être celui en cours, et le gagnant l'un de ses deux participants.
    if (!run || !cur || cur.match.id !== matchId) return false;
    const { left, right } = cur.match;
    if (!left || !right || (winnerId !== left.id && winnerId !== right.id)) return false;
    const loser = winnerId === left.id ? right.id : left.id;
    const vote: Vote = { at: Date.now(), run: run.startedAt, round: cur.round.size, matchId, winner: winnerId, loser, ms };
    const rounds = advance(run.rounds, matchId, winnerId);
    const champ = champion(rounds);
    flushDuel();
    if (statsId) pending = { statsId, winner: winnerId, loser };
    save(slug, {
      ...s,
      run: { ...run, rounds },
      undo: { rounds: run.rounds, vote },
      votes: [...s.votes, vote].slice(-MAX_VOTES),
      champions: champ ? [{ id: champ.id, size: run.size, at: Date.now() }, ...s.champions].slice(0, 30) : s.champions,
    });
    return true;
  },

  undo(slug: string) {
    const s = load(slug);
    if (!s.run || !s.undo) return;
    const { rounds, vote } = s.undo;
    // Le choix annulé n'est pas encore parti vers le site : il ne partira plus.
    if (pending?.winner === vote.winner && pending.loser === vote.loser) pending = null;
    const wasFinal = !!champion(s.run.rounds);
    save(slug, {
      ...s,
      run: { ...s.run, rounds },
      undo: null,
      votes: s.votes.filter((v) => !(v.at === vote.at && v.matchId === vote.matchId)),
      champions: wasFinal ? s.champions.slice(1) : s.champions,
    });
  },

  quit(slug: string) {
    flushDuel();
    const s = load(slug);
    save(slug, { ...s, run: null, undo: null });
  },

  toggleFavorite(slug: string, id: string) {
    const s = load(slug);
    const has = s.favorites.includes(id);
    save(slug, { ...s, favorites: has ? s.favorites.filter((f) => f !== id) : [id, ...s.favorites] });
  },

  setAutoplay(slug: string, autoplay: boolean) {
    const s = load(slug);
    save(slug, { ...s, settings: { ...s.settings, autoplay } });
  },

  clearHistory(slug: string) {
    const s = load(slug);
    save(slug, { ...s, votes: [], champions: [], undo: null });
  },
};
