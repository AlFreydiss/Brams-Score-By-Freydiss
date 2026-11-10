// Vieux génériques en 4:3 : bandes noires incrustées dans une vidéo 16:9.
// On lit une image en tout petit ; bords noirs + centre éclairé = la vidéo
// est « pillarbox », l'appelant agrandit pour sortir les bandes du cadre.
// Il faut crossOrigin="anonymous" sur la vidéo (R2 répond CORS *).
export function isPillarbox(v: HTMLVideoElement): boolean {
  if (!v.videoWidth || v.videoWidth / v.videoHeight < 1.5) return false;
  try {
    const W = 64;
    const H = 36;
    const c = document.createElement("canvas");
    c.width = W;
    c.height = H;
    const ctx = c.getContext("2d", { willReadFrequently: true });
    if (!ctx) return false;
    ctx.drawImage(v, 0, 0, W, H);
    const d = ctx.getImageData(0, 0, W, H).data;
    const lum = (x0: number, x1: number) => {
      let t = 0;
      let n = 0;
      for (let y = 0; y < H; y++)
        for (let x = x0; x < x1; x++) {
          const i = (y * W + x) * 4;
          t += d[i] + d[i + 1] + d[i + 2];
          n++;
        }
      return t / n / 3;
    };
    return Math.max(lum(0, 5), lum(W - 5, W)) < 6 && lum(16, W - 16) > 18;
  } catch {
    // CORS ou image pas prête : cadrage normal.
    return false;
  }
}

/** Échelle qui remplit le cadre avec le contenu 4:3 d'une vidéo 16:9. */
export const PILLAR_SCALE = 4 / 3;

/** Bandes noires incrustées, en part du cadre : x = de chaque côté, y = en haut et en bas. */
export type Bars = { x: number; y: number };

// Mesure les bandes noires d'une image de la vidéo (4:3 dans du 16:9, ou
// cinémascope dans du 16:9). null = image trop sombre pour conclure, ou CORS.
// Une bande compte si elle est noire sur toute sa longueur ET présente des
// deux côtés à la même épaisseur : un ciel de nuit en haut ne suffit pas.
export function blackBars(v: HTMLVideoElement): Bars | null {
  if (!v.videoWidth) return null;
  try {
    const W = 64;
    const H = 36;
    const c = document.createElement("canvas");
    c.width = W;
    c.height = H;
    const ctx = c.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(v, 0, 0, W, H);
    const d = ctx.getImageData(0, 0, W, H).data;
    const px = (x: number, y: number) => {
      const i = (y * W + x) * 4;
      return (d[i] + d[i + 1] + d[i + 2]) / 3;
    };
    let mid = 0;
    for (let y = 12; y < H - 12; y++) for (let x = 20; x < W - 20; x++) mid += px(x, y);
    if (mid / ((H - 24) * (W - 40)) < 18) return null;
    const dark = (n: number, at: (k: number) => number) => {
      let t = 0;
      let top = 0;
      for (let k = 0; k < n; k++) {
        const l = at(k);
        t += l;
        if (l > top) top = l;
      }
      return t / n < 6 && top < 22;
    };
    const row = (y: number) => dark(W, (x) => px(x, y));
    const col = (x: number) => dark(H, (y) => px(x, y));
    const run = (n: number, ok: (k: number) => boolean) => {
      let a = 0;
      while (a < n / 3 && ok(a)) a++;
      let b = 0;
      while (b < n / 3 && ok(n - 1 - b)) b++;
      return Math.abs(a - b) <= 1 ? Math.min(a, b) : 0;
    };
    return { x: run(W, col) / W, y: run(H, row) / H };
  } catch {
    return null;
  }
}

// Surveille une vidéo et appelle `apply` avec l'agrandissement qui sort les
// bandes du cadre. Trois mesures identiques de suite avant de conclure (un
// fondu au noir ou un plan sombre ne comptent pas). Renvoie de quoi arrêter.
export function watchBars(v: HTMLVideoElement, apply: (scale: number, bars: Bars) => void): () => void {
  let timer = 0;
  let tries = 0;
  let prev = "";
  let same = 0;
  const check = () => {
    if (!v.isConnected) return;
    const b = blackBars(v);
    const key = b ? `${Math.round(b.x * 64)}/${Math.round(b.y * 36)}` : "";
    same = b && key === prev ? same + 1 : 0;
    if (b && same >= 2) {
      const s = Math.max(1 / (1 - 2 * b.x), 1 / (1 - 2 * b.y));
      // Un pixel de marge : la mesure est faite sur une image réduite.
      if (s > 1.02) apply(Math.min(1.5, s * 1.02), b);
      return;
    }
    prev = key;
    if (++tries < 14) timer = window.setTimeout(check, 900);
  };
  timer = window.setTimeout(check, 400);
  return () => window.clearTimeout(timer);
}
