import { useSyncExternalStore } from "react";
import { shuffle } from "./bracket";

// Tirage au hasard fait une seule fois, dans le navigateur. Côté serveur la
// valeur est null : le HTML prérendu ne contient pas un tirage différent de
// celui du client, donc pas d'écart à l'hydratation.

const cache = new Map<string, unknown>();
const subscribe = () => () => {};

export function useClientDraw<T>(key: string, list: readonly T[], n: number): T[] | null {
  return useSyncExternalStore(
    subscribe,
    () => {
      if (!cache.has(key)) cache.set(key, shuffle(list).slice(0, n));
      return cache.get(key) as T[];
    },
    () => null,
  );
}
