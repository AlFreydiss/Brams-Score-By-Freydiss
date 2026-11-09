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
