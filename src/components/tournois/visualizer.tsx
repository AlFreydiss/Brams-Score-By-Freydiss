import { useEffect, useRef } from "react";
import type { Seam } from "@/lib/tournois/catalog";
import { getAnalyser } from "./use-player";

// Visualiseur branché sur le vrai signal (analyseur Web Audio du lecteur).
// Une forme par univers, dessinée seulement pendant la lecture de cette
// moitié. Il pousse aussi l'énergie des basses dans --energy sur la scène :
// le trait de coupe s'en sert pour respirer avec la musique.

type Variant = "spectrum" | "vu" | "wave" | "eq";

const VARIANT: Partial<Record<Seam, Variant>> = { diag: "wave", screens: "vu", feather: "wave", tape: "eq", zigzag: "eq" };

export function Visualizer({ seam, active, side }: { seam: Seam; active: boolean; side: "left" | "right" }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const variant = VARIANT[seam];

  useEffect(() => {
    const c = canvas.current;
    if (!c || !variant) return;
    const stage = c.closest<HTMLElement>(".t-stage");
    if (!active) {
      stage?.style.setProperty("--energy", "0");
      return;
    }
    const g = c.getContext("2d");
    if (!g) return;
    let raf = 0;
    let freq = new Uint8Array(0);
    let wave = new Uint8Array(0);
    const peaks: number[] = [];
    let smooth = 0;
    const css = getComputedStyle(c);
    const color = css.getPropertyValue("--viz").trim() || "#ffffff";

    const resize = () => {
      const r = c.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      c.width = Math.max(1, Math.round(r.width * dpr));
      c.height = Math.max(1, Math.round(r.height * dpr));
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(c);

    const draw = () => {
      raf = requestAnimationFrame(draw);
      const a = getAnalyser();
      const W = c.clientWidth;
      const H = c.clientHeight;
      g.clearRect(0, 0, W, H);
      if (!a) return;
      if (freq.length !== a.frequencyBinCount) {
        freq = new Uint8Array(a.frequencyBinCount);
        wave = new Uint8Array(a.fftSize);
      }
      a.getByteFrequencyData(freq);

      // Énergie des basses (premiers bins), lissée, pour le trait de coupe.
      let bass = 0;
      for (let i = 1; i < 9; i++) bass += freq[i];
      smooth += (bass / (8 * 255) - smooth) * 0.25;
      stage?.style.setProperty("--energy", smooth.toFixed(3));

      if (variant === "spectrum") {
        // Spectre fin, du grave à l'aigu, qui descend du haut comme un rideau.
        const n = 56;
        const gap = 3;
        const bw = (W - gap * (n - 1)) / n;
        const grad = g.createLinearGradient(0, 0, 0, H);
        grad.addColorStop(0, color);
        grad.addColorStop(1, "transparent");
        g.fillStyle = grad;
        for (let i = 0; i < n; i++) {
          const v = freq[Math.floor((i / n) ** 1.6 * (freq.length * 0.82))] / 255;
          const h = Math.max(1, v ** 1.4 * H);
          const x = side === "left" ? i * (bw + gap) : W - (i + 1) * (bw + gap) + gap;
          g.fillRect(x, 0, bw, h);
        }
      } else if (variant === "eq") {
        // Égaliseur à barres épaisses, crêtes qui retombent lentement.
        const n = 18;
        const gap = 6;
        const bw = (W - gap * (n - 1)) / n;
        g.fillStyle = color;
        for (let i = 0; i < n; i++) {
          const v = freq[Math.floor((i / n) ** 1.5 * (freq.length * 0.7))] / 255;
          const h = v ** 1.3 * H;
          peaks[i] = Math.max(h, (peaks[i] ?? 0) - H * 0.012);
          const x = i * (bw + gap);
          g.globalAlpha = 0.85;
          g.fillRect(x, H - h, bw, h);
          g.globalAlpha = 1;
          g.fillRect(x, H - peaks[i] - 4, bw, 3);
        }
      } else if (variant === "vu") {
        // Vumètre de régie : deux colonnes de diodes, vert, jaune, rouge.
        const segs = 26;
        const sh = H / segs;
        const levels = [0, 1].map((k) => {
          let s = 0;
          const from = k ? 24 : 2;
          for (let i = from; i < from + 22; i++) s += freq[i];
          return Math.min(1, (s / (22 * 255)) * 1.35);
        });
        levels.forEach((lv, k) => {
          const x = k * 16;
          const lit = Math.round(lv * segs);
          for (let s = 0; s < segs; s++) {
            const y = H - (s + 1) * sh;
            const r = s / segs;
            g.fillStyle = r > 0.85 ? "#ff3b30" : r > 0.65 ? "#ffd60a" : "#30d158";
            g.globalAlpha = s < lit ? 1 : 0.12;
            g.fillRect(x, y + 1, 12, sh - 2);
          }
        });
        g.globalAlpha = 1;
      } else if (variant === "wave") {
        // Onde douce : la forme du son, comme un fil de lumière.
        a.getByteTimeDomainData(wave);
        g.lineWidth = 1.5;
        g.strokeStyle = color;
        for (const [alpha, width] of [[0.18, 6], [0.75, 1.5]] as const) {
          g.globalAlpha = alpha;
          g.lineWidth = width;
          g.beginPath();
          for (let i = 0; i < wave.length; i += 2) {
            const x = (i / (wave.length - 1)) * W;
            const y = H / 2 + ((wave[i] - 128) / 128) * (H / 2) * 0.9;
            if (i) g.lineTo(x, y);
            else g.moveTo(x, y);
          }
          g.stroke();
        }
        g.globalAlpha = 1;
      }
    };
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      g.clearRect(0, 0, c.width, c.height);
      stage?.style.setProperty("--energy", "0");
    };
  }, [active, variant, side]);

  if (!variant) return null;
  return <canvas ref={canvas} className={`t-viz t-viz--${variant} ${active ? "is-on" : ""}`} aria-hidden />;
}
