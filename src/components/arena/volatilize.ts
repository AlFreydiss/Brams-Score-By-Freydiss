// Le Gommage du hub : l'écran qui sort se désagrège de gauche à droite en
// lambeaux au bord incandescent, et des pétales s'en détachent et s'envolent
// (Clair Obscur). Piloté par l'avancement de l'anneau, donc il suit le glissé
// de la main dans les deux sens, contrairement à tournois/gommage.ts qui joue
// une transition à durée fixe.
//
// Deux pièces :
//  - deux textures de bord (front d'érosion + liseré de braise), fabriquées une
//    fois et posées en masque CSS sur l'écran : rien à redessiner par image ;
//  - un canvas de pétales par-dessus la scène, qui ne tourne que tant qu'il
//    reste des pétales en vol.

/** Largeur du front d'érosion, en part de la largeur de l'écran. */
export const FRONT = 0.55;

const TW = 384;
const TH = 384;

// Bruit de valeur périodique en y (la texture se répète vers le bas pour
// couvrir le reflet) : treillis de hasard, lissé, sur quatre octaves.
function makeNoise() {
  const hash = (x: number, y: number) => {
    const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
    return s - Math.floor(s);
  };
  const octave = (x: number, y: number, period: number) => {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const fx = x - xi;
    const fy = y - yi;
    const ux = fx * fx * (3 - 2 * fx);
    const uy = fy * fy * (3 - 2 * fy);
    const w = (v: number) => ((v % period) + period) % period;
    const a = hash(xi, w(yi));
    const b = hash(xi + 1, w(yi));
    const c = hash(xi, w(yi + 1));
    const d = hash(xi + 1, w(yi + 1));
    return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
  };
  return (u: number, v: number) => {
    let s = 0;
    let amp = 0.5;
    let f = 5;
    for (let k = 0; k < 4; k++) {
      s += amp * octave(u * f, v * f, f);
      f *= 2;
      amp *= 0.5;
    }
    return s / 0.9375;
  };
}

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export type Edges = { front: string; ember: string };
let edges: Promise<Edges | null> | null = null;

/** Les deux textures de bord, en URL blob. Fabriquées une seule fois. */
export function erosionEdges(): Promise<Edges | null> {
  if (edges) return edges;
  edges = new Promise((resolve) => {
    try {
      const noise = makeNoise();
      const mk = () => {
        const c = document.createElement("canvas");
        c.width = TW;
        c.height = TH;
        return c;
      };
      const cf = mk();
      const ce = mk();
      const xf = cf.getContext("2d")!;
      const xe = ce.getContext("2d")!;
      const df = xf.createImageData(TW, TH);
      const de = xe.createImageData(TW, TH);
      for (let y = 0; y < TH; y++)
        for (let x = 0; x < TW; x++) {
          const u = x / TW;
          const v = y / TH;
          // Matière : gros lambeaux + grain fin, étalés sur 0 → 1.
          const m = Math.min(1, Math.max(0, (noise(u, v) - 0.22) / 0.56)) * 0.86 + 0.14 * noise(u * 6, v * 6);
          // Seuil : tout est rongé à gauche, tout est intact à droite.
          const d = m - (1.12 - 1.26 * u);
          const i = (y * TW + x) * 4;
          df.data[i] = df.data[i + 1] = df.data[i + 2] = 255;
          df.data[i + 3] = 255 * smooth(0, 0.018, d);
          de.data[i] = de.data[i + 1] = de.data[i + 2] = 255;
          // Braise : un trait vif au ras du bord, puis une lueur qui s'éteint dans la matière.
          de.data[i + 3] = d < 0 ? 0 : 255 * Math.min(1, (1 - smooth(0, 0.012, d)) * 0.95 + (1 - smooth(0, 0.085, d)) * 0.5);
        }
      xf.putImageData(df, 0, 0);
      xe.putImageData(de, 0, 0);
      let front = "";
      cf.toBlob((bf) => {
        if (!bf) return resolve(null);
        front = URL.createObjectURL(bf);
        ce.toBlob((be) => resolve(be ? { front, ember: URL.createObjectURL(be) } : null));
      });
    } catch {
      resolve(null);
    }
  });
  return edges;
}

// ── Pétales ────────────────────────────────────────────────────────────
// Même planche peinte que le Gommage des duels (8×2 cases de 128 px).
const CELL = 128;
let atlas: HTMLImageElement | null = null;
const petalAtlas = () => {
  if (!atlas) {
    atlas = new Image();
    atlas.decoding = "async";
    atlas.src = "/trails/gommage-petals.webp";
  }
  return atlas.complete && atlas.naturalWidth ? atlas : null;
};

type Petal = { x: number; y: number; vx: number; vy: number; r: number; w: number; vw: number; t: number; life: number; seed: number; ash: boolean; dim: number };

export type Petals = {
  /** Détache des pétales le long du front (x, de y0 à y1), en px de la fenêtre. `amount` = part de l'écran rongée depuis le dernier appel ; x0 → x1 = l'écran. */
  shed(x: number, y0: number, y1: number, amount: number, color: string, x0: number, x1: number): void;
  destroy(): void;
};

const MAX = 420;

export function createPetals(canvas: HTMLCanvasElement): Petals {
  const ctx = canvas.getContext("2d");
  petalAtlas();
  const list: Petal[] = [];
  let raf = 0;
  let last = 0;
  let debt = 0;
  let ash = "#f1e4cf";
  let rect = canvas.getBoundingClientRect();
  // L'écran d'où partent les pétales, dans le repère du canvas.
  const zone = { l: 0, r: 0, t: 0, b: 0 };

  const size = () => {
    rect = canvas.getBoundingClientRect();
    const dpr = Math.min(1.5, window.devicePixelRatio || 1);
    const w = Math.round(rect.width * dpr);
    const h = Math.round(rect.height * dpr);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    return dpr;
  };

  const tick = (now: number) => {
    if (!ctx) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const dpr = canvas.width / Math.max(1, rect.width);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const img = petalAtlas();
    for (let i = list.length - 1; i >= 0; i--) {
      const q = list[i];
      q.t += dt;
      if (q.t >= q.life) {
        list.splice(i, 1);
        continue;
      }
      // Le vent : il arrache vers le haut et la gauche, hors de l'écran, en tournoyant.
      // Jamais vers la droite : c'est là qu'arrive l'écran suivant.
      const gust = Math.sin(q.seed * 9 + q.t * 2.3);
      q.vx += (-260 + gust * 60) * dt;
      q.vy += (-210 + Math.cos(q.seed * 5 + q.t * 1.7) * 50) * dt;
      q.vx = Math.min(-40, q.vx * (1 - 0.35 * dt));
      q.vy *= 1 - 0.35 * dt;
      q.x += q.vx * dt;
      q.y += q.vy * dt;
      q.w += q.vw * dt;
      const p = q.t / q.life;
      // Tant qu'il survole l'écran, le pétale reste discret : il ne doit pas le masquer.
      const over = q.x > zone.l && q.x < zone.r && q.y > zone.t && q.y < zone.b;
      q.dim += ((over ? 0.14 : 1) - q.dim) * Math.min(1, dt * (over ? 16 : 5));
      const a = Math.min(1, p * 9) * (1 - p) ** 1.4 * q.dim;
      ctx.globalAlpha = a;
      if (q.ash || !img) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.fillStyle = ash;
        ctx.globalAlpha = a * 0.8;
        ctx.beginPath();
        ctx.arc(q.x, q.y, q.ash ? q.r : q.r * 0.4, 0, 6.283);
        ctx.fill();
        continue;
      }
      // Pétale peint : il bascule (sa hauteur respire) en tournant.
      const k = (q.r * 2.6) / CELL;
      const sy = k * (0.3 + 0.7 * Math.abs(Math.sin(q.w * 0.8 + q.seed * 6)));
      const cs = Math.cos(q.w);
      const sn = Math.sin(q.w);
      ctx.setTransform(dpr * cs * k, dpr * sn * k, -dpr * sn * sy, dpr * cs * sy, dpr * q.x, dpr * q.y);
      const fr = Math.floor(q.seed * 16) % 16;
      ctx.drawImage(img, (fr % 8) * CELL, ((fr / 8) | 0) * CELL, CELL, CELL, -CELL / 2, -CELL / 2, CELL, CELL);
    }
    ctx.globalAlpha = 1;
    if (list.length) raf = requestAnimationFrame(tick);
    else {
      raf = 0;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  return {
    shed(x, y0, y1, amount, color, x0, x1) {
      if (!ctx || amount <= 0) return;
      if (!raf) size();
      zone.l = x0 - rect.left;
      zone.r = x1 - rect.left;
      zone.t = y0 - rect.top;
      zone.b = y1 - rect.top;
      ash = color;
      // À peu près 110 pétales et 90 cendres pour un écran entier.
      // Moins de pétales à mesure que le front avance vers la droite : ils auraient tout l'écran à traverser.
      const across = Math.min(1, Math.max(0, (x - x0) / Math.max(1, x1 - x0)));
      debt += Math.min(0.2, amount) * 230 * (1 - 0.8 * across);
      while (debt >= 1 && list.length < MAX) {
        debt -= 1;
        const isAsh = Math.random() < 0.42;
        const s = Math.random();
        list.push({
          x: x - rect.left - Math.random() * 40,
          y: y0 - rect.top + Math.random() * (y1 - y0),
          vx: -160 - Math.random() * 340 - across * 260,
          vy: -110 - Math.random() * 340,
          r: isAsh ? 0.8 + Math.random() * 1.6 : 4 + Math.random() * Math.random() * 13,
          w: Math.random() * 6.283,
          vw: (Math.random() - 0.5) * 6,
          t: 0,
          life: isAsh ? 0.6 + Math.random() * 0.8 : 1.1 + Math.random() * 1.2,
          seed: s,
          ash: isAsh,
          dim: 0.5,
        });
      }
      if (debt > 4) debt = 4;
      if (!raf && list.length) {
        last = performance.now();
        raf = requestAnimationFrame(tick);
      }
    },
    destroy() {
      cancelAnimationFrame(raf);
      raf = 0;
      list.length = 0;
    },
  };
}
