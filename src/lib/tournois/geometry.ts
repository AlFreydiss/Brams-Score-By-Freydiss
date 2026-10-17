import type { Seam } from "./catalog";

// Géométrie de la coupure entre les deux moitiés. Tout est en pourcentage de
// la scène ; s = position du trait (50 = milieu). Sur mobile (vertical), les
// mêmes formes sont transposées : une moitié en haut, l'autre en bas.

type Pt = [number, number];

export type Shape = {
  left: string;
  right: string;
  /** Points du trait, de haut en bas (ou de gauche à droite sur mobile). */
  seam: Pt[];
  /** Taille de la boîte média de chaque moitié (largeur, ou hauteur sur mobile), en %. */
  leftBox: number;
  rightBox: number;
};

/** Écart entre les moitiés, en % de la scène, pour les coupures qui laissent un vide. */
export function gapFor(seam: Seam, widthPx: number): number {
  const px = seam === "screens" ? 5 : seam === "gutter" ? 8 : 0;
  return widthPx > 0 ? (px / widthPx) * 100 : 0;
}

export function seamPoints(seam: Seam, s: number, vertical: boolean): Pt[] {
  const k = vertical ? 1.5 : 1;
  switch (seam) {
    case "diag":
      return [[s + 4 * k, 0], [s - 4 * k, 100]];
    case "tape":
      return [[s - 5 * k, 0], [s + 5 * k, 100]];
    case "slash":
      return [[s + 11 * k, 0], [s - 11 * k, 100]];
    case "gutter":
      return [[s + 2.5 * k, 0], [s - 2.5 * k, 100]];
    case "zigzag": {
      const n = 9;
      return Array.from({ length: n + 1 }, (_, i): Pt => {
        const y = (i / n) * 100;
        const base = s + 3 * k - (6 * k * i) / n;
        const tooth = i === 0 || i === n ? 0 : i % 2 ? 2.2 * k : -2.2 * k;
        return [base + tooth, y];
      });
    }
    default:
      return [[s, 0], [s, 100]];
  }
}

const poly = (pts: Pt[], vertical: boolean) =>
  `polygon(${pts.map(([x, y]) => (vertical ? `${y}% ${x}%` : `${x}% ${y}%`)).join(", ")})`;

export function shape(seam: Seam, s: number, vertical: boolean, gap = 0): Shape {
  const pts = seamPoints(seam, s, vertical);
  const l = pts.map(([x, y]): Pt => [x - gap, y]);
  const r = pts.map(([x, y]): Pt => [x + gap, y]);
  const left: Pt[] = [[0, 0], ...l, [0, 100]];
  const right: Pt[] = [...r, [100, 100], [100, 0]];
  const xs = pts.map((p) => p[0]);
  return {
    left: poly(left, vertical),
    right: poly(right, vertical),
    seam: vertical ? pts.map(([x, y]): Pt => [y, x]) : pts,
    leftBox: clamp(Math.max(...xs) - gap),
    rightBox: clamp(100 - Math.min(...xs) - gap),
  };
}

const clamp = (v: number) => Math.min(100, Math.max(0, v));

/** Où pousser le trait pour que le côté gagnant prenne toute la scène. */
export function edgeFor(seam: Seam, side: "left" | "right", vertical: boolean): number {
  const pts = seamPoints(seam, 50, vertical);
  const xs = pts.map((p) => p[0] - 50);
  return side === "left" ? 101 - Math.min(...xs) : -1 - Math.max(...xs);
}
