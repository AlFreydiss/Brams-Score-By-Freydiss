import { shuffle } from "./bracket";
import type { Participant } from "./types";

// Tirage des participants (pur) : testé dans draw.test.mjs.

/**
 * Tirage varié : un participant par groupe (jeu, anime…) à chaque passage,
 * groupes dans un ordre au hasard. Un groupe très fourni (l'album entier de
 * Clair Obscur) ne remplit plus la moitié du tableau ; il reprend sa part
 * seulement quand les autres sont épuisés.
 */
export function varied(pool: Participant[], size: number): Participant[] {
  const by = new Map<string, Participant[]>();
  for (const p of shuffle(pool)) {
    const g = by.get(p.group);
    if (g) g.push(p);
    else by.set(p.group, [p]);
  }
  const lanes = shuffle([...by.values()]);
  const out: Participant[] = [];
  for (let i = 0; out.length < size && lanes.some((l) => i < l.length); i++)
    for (const l of lanes) if (i < l.length && out.length < size) out.push(l[i]);
  return shuffle(out);
}

/** Évite qu'un duel du premier tour oppose deux participants du même groupe (échange avec un autre duel). */
export function spreadPairs(list: Participant[]): Participant[] {
  const a = [...list];
  for (let i = 0; i + 1 < a.length; i += 2) {
    if (a[i].group !== a[i + 1].group) continue;
    for (let j = 0; j < a.length; j++) {
      if (j === i || j === i + 1) continue;
      const mate = a[j % 2 === 0 ? j + 1 : j - 1];
      if (!mate) continue;
      // a[j] part en face de a[i], a[i+1] prend la place de a[j] : les deux duels doivent rester mixtes.
      if (a[j].group !== a[i].group && a[i + 1].group !== mate.group) {
        [a[i + 1], a[j]] = [a[j], a[i + 1]];
        break;
      }
    }
  }
  return a;
}
