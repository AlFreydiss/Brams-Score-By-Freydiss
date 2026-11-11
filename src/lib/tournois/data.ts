import type { TournamentSlug } from "./catalog";
import type { Participant } from "./types";

// Catalogues des tournois, un fichier JSON par tournoi : chaque page ne
// télécharge que le sien. La promesse est gardée pour être lue avec use().
const LOADERS: Record<TournamentSlug, () => Promise<{ default: unknown }>> = {
  ost: () => import("./data/ost.json"),
  openings: () => import("./data/openings.json"),
  endings: () => import("./data/endings.json"),
  jeux: () => import("./data/jeux.json"),
  rap: () => import("./data/rap.json"),
  rapvsost: () => import("./data/rapvsost.json"),
  bankai: () => import("./data/bankai.json"),
  panels: () => import("./data/panels.json"),
};

// Pistes mixées plus bas que les autres tournois : on remonte leur son.
const GAIN: Partial<Record<TournamentSlug, number>> = { jeux: 1.3 };

const cache = new Map<TournamentSlug, Promise<Participant[]>>();

export function participants(slug: TournamentSlug): Promise<Participant[]> {
  let p = cache.get(slug);
  if (!p) {
    const gain = GAIN[slug];
    p = LOADERS[slug]().then((m) => {
      const list = m.default as Participant[];
      return gain ? list.map((x) => ({ ...x, gain })) : list;
    });
    cache.set(slug, p);
  }
  return p;
}
