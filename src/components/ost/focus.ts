import { useEffect, useState } from "react";

// Cadrage des œuvres. Les photos du catalogue sont des paysages 16:9 ; les
// cartes du tournoi les montrent en portrait. Couper au centre tranche
// souvent le personnage. Ici, l'image est réduite à 96 × 54, on mesure le
// détail de chaque colonne (contours + couleur saturée : un personnage
// d'anime en a plus qu'un ciel ou un mur), et la fenêtre du portrait se pose
// là où il y en a le plus, avec une légère préférence pour le centre.
// Résultat : la position horizontale de l'image (0 à 100 %), en cache.

const W = 96;
const H = 54;
const cache = new Map<string, number>();
const pending = new Map<string, Promise<number>>();
const KEY = "ost_focus_v1";

try {
  const raw = JSON.parse(sessionStorage.getItem(KEY) || "{}");
  for (const [k, v] of Object.entries(raw)) if (typeof v === "number") cache.set(k, v);
} catch {}
let saveTimer = 0;
function persist() {
  clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => {
    try {
      sessionStorage.setItem(KEY, JSON.stringify(Object.fromEntries(cache)));
    } catch {}
  }, 400);
}

function measure(src: string, aspect: number): Promise<number> {
  const key = `${src}|${aspect}`;
  const hit = cache.get(key);
  if (hit != null) return Promise.resolve(hit);
  const wait = pending.get(key);
  if (wait) return wait;
  const p = new Promise<number>((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.decoding = "async";
    img.onload = () => {
      try {
        const c = document.createElement("canvas");
        c.width = W;
        c.height = H;
        const g = c.getContext("2d", { willReadFrequently: true });
        if (!g) return resolve(50);
        g.drawImage(img, 0, 0, W, H);
        const d = g.getImageData(0, 0, W, H).data;
        const lum = new Float32Array(W * H);
        const sat = new Float32Array(W * H);
        for (let i = 0; i < W * H; i++) {
          const r = d[i * 4];
          const gg = d[i * 4 + 1];
          const b = d[i * 4 + 2];
          lum[i] = 0.299 * r + 0.587 * gg + 0.114 * b;
          sat[i] = Math.max(r, gg, b) - Math.min(r, gg, b);
        }
        // Détail par colonne : gradients + saturation.
        const col = new Float32Array(W);
        for (let y = 1; y < H - 1; y++)
          for (let x = 1; x < W - 1; x++) {
            const i = y * W + x;
            const gx = Math.abs(lum[i + 1] - lum[i - 1]);
            const gy = Math.abs(lum[i + W] - lum[i - W]);
            col[x] += gx + gy + sat[i] * 0.35;
          }
        // Largeur de la fenêtre portrait, en colonnes de l'image réduite.
        const win = Math.max(4, Math.min(W, Math.round(H * aspect)));
        let best = 0;
        let at = Math.round((W - win) / 2);
        let sum = 0;
        for (let x = 0; x < win; x++) sum += col[x];
        for (let x = 0; x + win <= W; x++) {
          if (x > 0) sum += col[x + win - 1] - col[x - 1];
          const mid = (x + win / 2) / W - 0.5;
          const score = sum * (1 - mid * mid * 0.9);
          if (score > best) {
            best = score;
            at = x;
          }
        }
        const pos = W - win > 0 ? Math.round((at / (W - win)) * 100) : 50;
        cache.set(key, pos);
        persist();
        resolve(pos);
      } catch {
        resolve(50);
      }
    };
    img.onerror = () => resolve(50);
    img.src = src;
  });
  pending.set(key, p);
  p.finally(() => pending.delete(key));
  return p;
}

/** Position horizontale (en %) qui garde le sujet dans un cadre de ce rapport largeur/hauteur. */
export function useFocus(src: string | undefined, aspect: number) {
  const key = src ? `${src}|${aspect}` : "";
  const [pos, setPos] = useState<number | null>(() => (key ? (cache.get(key) ?? null) : null));
  useEffect(() => {
    if (!src) return;
    let on = true;
    measure(src, aspect).then((v) => on && setPos(v));
    return () => {
      on = false;
    };
  }, [src, aspect]);
  return pos;
}

/** Calcule le cadrage d'une image à l'avance (duel suivant). */
export function prefocus(src: string, aspect: number) {
  void measure(src, aspect);
}

/** Rapport largeur/hauteur de la fenêtre portrait, rapporté à une image 16:9. */
export const portraitIn169 = (cardAspect: number) => cardAspect / (16 / 9);
