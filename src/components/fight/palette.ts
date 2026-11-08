// Couleur dominante d'une image (confettis « aux couleurs de l'anime »).
// L'image est réduite à 24×24 ; on garde la teinte la plus présente parmi les
// pixels assez saturés et lumineux. Sans CORS, on rend la couleur de repli.

const cache = new Map<string, Promise<string[]>>();

function hsl(r: number, g: number, b: number) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  let h = 0;
  if (d) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s, l };
}

/** Jusqu'à 3 couleurs vives de l'image, la plus présente en premier. */
export function dominantColors(src: string | undefined, fallback: string[]): Promise<string[]> {
  if (!src) return Promise.resolve(fallback);
  let p = cache.get(src);
  if (!p) {
    p = new Promise<string[]>((res) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        try {
          const c = document.createElement("canvas");
          c.width = 24;
          c.height = 24;
          const g = c.getContext("2d", { willReadFrequently: true });
          if (!g) return res(fallback);
          g.drawImage(img, 0, 0, 24, 24);
          const d = g.getImageData(0, 0, 24, 24).data;
          const bins = new Map<number, { n: number; s: number; l: number }>();
          for (let i = 0; i < d.length; i += 4) {
            const { h, s, l } = hsl(d[i], d[i + 1], d[i + 2]);
            if (s < 0.35 || l < 0.25 || l > 0.85) continue;
            const k = Math.round(h / 24) % 15;
            const e = bins.get(k) ?? { n: 0, s: 0, l: 0 };
            e.n++;
            e.s += s;
            e.l += l;
            bins.set(k, e);
          }
          const top = [...bins.entries()].sort((a, b) => b[1].n - a[1].n).slice(0, 3);
          if (!top.length) return res(fallback);
          res(top.map(([k, e]) => `hsl(${k * 24} ${Math.round(Math.min(95, (e.s / e.n) * 100 + 10))}% ${Math.round(Math.max(52, Math.min(68, (e.l / e.n) * 100)))}%)`));
        } catch {
          res(fallback);
        }
      };
      img.onerror = () => res(fallback);
      img.src = src;
    });
    cache.set(src, p);
  }
  return p;
}
