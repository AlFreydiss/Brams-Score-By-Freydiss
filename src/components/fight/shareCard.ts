import type { Participant } from "@/lib/tournois/types";

// Carte de champion à partager (1200 × 630, format des aperçus Discord et X) :
// l'image du champion, son titre, le podium et le nom du tournoi, dans la DA
// sobre des tournois. Partage natif si le navigateur sait envoyer un fichier,
// sinon téléchargement du PNG.

function loadImg(src: string): Promise<HTMLImageElement | null> {
  return new Promise((res) => {
    const i = new Image();
    i.crossOrigin = "anonymous";
    i.onload = () => res(i);
    i.onerror = () => res(null);
    i.src = src;
  });
}

function cover(g: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number) {
  const r = img.naturalWidth / img.naturalHeight;
  const tr = w / h;
  let sw = img.naturalWidth;
  let sh = img.naturalHeight;
  if (r > tr) sw = sh * tr;
  else sh = sw / tr;
  g.drawImage(img, (img.naturalWidth - sw) / 2, (img.naturalHeight - sh) / 2, sw, sh, x, y, w, h);
}

function fit(g: CanvasRenderingContext2D, text: string, max: number) {
  if (g.measureText(text).width <= max) return text;
  let t = text;
  while (t.length > 3 && g.measureText(`${t}…`).width > max) t = t.slice(0, -1);
  return `${t}…`;
}

export async function makeChampionCard(opts: { tournament: string; accent: string; champ: Participant; podium: Participant[] }): Promise<Blob | null> {
  const W = 1200;
  const H = 630;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d");
  if (!g) return null;
  await document.fonts?.ready;
  const display = "'Bricolage Grotesque', system-ui, sans-serif";
  const body = "'Inter', system-ui, sans-serif";

  g.fillStyle = "#08090d";
  g.fillRect(0, 0, W, H);
  const glow = g.createRadialGradient(W * 0.3, 0, 0, W * 0.3, 0, W * 0.8);
  glow.addColorStop(0, `${opts.accent}33`);
  glow.addColorStop(1, "transparent");
  g.fillStyle = glow;
  g.fillRect(0, 0, W, H);

  // Image du champion, à droite, dans un cadre arrondi à filet.
  const src = opts.champ.visual.k === "img" ? opts.champ.visual.src : opts.champ.thumb.replace("/t/p/w300/", "/t/p/w780/");
  const img = await loadImg(src);
  const ix = 640;
  const iy = 60;
  const iw = 500;
  const ih = 510;
  g.save();
  g.beginPath();
  g.roundRect(ix, iy, iw, ih, 22);
  g.clip();
  if (img) {
    try {
      cover(g, img, ix, iy, iw, ih);
    } catch {
      g.fillStyle = "#0e1014";
      g.fillRect(ix, iy, iw, ih);
    }
  }
  const fade = g.createLinearGradient(0, iy + ih * 0.55, 0, iy + ih);
  fade.addColorStop(0, "transparent");
  fade.addColorStop(1, "rgba(8,9,13,0.8)");
  g.fillStyle = fade;
  g.fillRect(ix, iy, iw, ih);
  g.restore();
  g.strokeStyle = opts.accent;
  g.lineWidth = 2;
  g.beginPath();
  g.roundRect(ix, iy, iw, ih, 22);
  g.stroke();

  // Étiquette, titre, sous-titre.
  g.fillStyle = opts.accent;
  g.fillRect(60, 92, 28, 2);
  g.fillStyle = "#8b8a85";
  g.font = `600 17px ${body}`;
  g.letterSpacing = "4px";
  g.fillText(fit(g, opts.tournament.toUpperCase(), 500), 102, 99);
  g.letterSpacing = "0px";

  g.fillStyle = "#f4f2ec";
  g.font = `700 30px ${body}`;
  g.fillText("Mon champion", 60, 170);
  g.font = `700 64px ${display}`;
  const words = opts.champ.title.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const t = line ? `${line} ${w}` : w;
    if (g.measureText(t).width > 520 && line) {
      lines.push(line);
      line = w;
    } else line = t;
  }
  lines.push(line);
  lines.slice(0, 3).forEach((l, k) => g.fillText(fit(g, l, 540), 60, 250 + k * 66));
  const after = 250 + Math.min(3, lines.length) * 66;
  g.fillStyle = "#b9b7b1";
  g.font = `400 22px ${body}`;
  g.fillText(fit(g, [opts.champ.sub, opts.champ.artist].filter(Boolean).join(" — "), 540), 60, after - 18);

  // Podium (2e et 3e).
  g.font = `500 19px ${body}`;
  opts.podium.slice(1, 3).forEach((p, k) => {
    const y = 470 + k * 36;
    g.fillStyle = "#8b8a85";
    g.fillText(`${k + 2}`, 60, y);
    g.fillStyle = "#dcd9d2";
    g.fillText(fit(g, p.title, 500), 90, y);
  });

  g.fillStyle = "#8b8a85";
  g.font = `500 18px ${body}`;
  g.fillText("brams.community/tournoi", 60, 580);

  return new Promise((res) => {
    try {
      c.toBlob((b) => res(b), "image/png");
    } catch {
      res(null);
    }
  });
}

/** Partage la carte (fichier) si possible, sinon la télécharge. Rend ce qui s'est passé. */
export async function shareChampionCard(opts: Parameters<typeof makeChampionCard>[0]): Promise<"shared" | "downloaded" | "failed"> {
  const blob = await makeChampionCard(opts);
  if (!blob) return "failed";
  const file = new File([blob], "mon-champion-brams.png", { type: "image/png" });
  const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean };
  if (nav.canShare?.({ files: [file] }) && nav.share) {
    try {
      await nav.share({ files: [file], title: `Mon champion : ${opts.champ.title}` });
      return "shared";
    } catch {
      // Partage annulé : on retombe sur le téléchargement.
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "mon-champion-brams.png";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return "downloaded";
}
