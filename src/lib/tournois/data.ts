import type { TournamentSlug } from "./catalog";
import type { Participant } from "./types";

// Catalogues des tournois, un fichier JSON par tournoi : chaque page ne
// télécharge que le sien. La promesse est gardée pour être lue avec use().
const LOADERS: Record<TournamentSlug, () => Promise<{ default: unknown }>> = {
  ost: () => import("./data/ost.json"),
  openings: () => import("./data/openings.json"),
  endings: () => import("./data/endings.json"),
  rap: () => import("./data/rap.json"),
  rapvsost: () => import("./data/rapvsost.json"),
  bankai: () => import("./data/bankai.json"),
  panels: () => import("./data/panels.json"),
};

const cache = new Map<TournamentSlug, Promise<Participant[]>>();

export function participants(slug: TournamentSlug): Promise<Participant[]> {
  let p = cache.get(slug);
  if (!p) {
    p = LOADERS[slug]().then((m) => m.default as Participant[]);
    cache.set(slug, p);
  }
  return p;
}
