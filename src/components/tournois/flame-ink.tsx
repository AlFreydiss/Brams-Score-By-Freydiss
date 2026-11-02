import { useEffect, useRef } from "react";

// Curseur flamme des tournois OST, openings et endings.
// Le point chaud est le pied de la flamme : il se pose sur la ligne de lecture.
const FLAME_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="32" viewBox="0 0 24 32"><path fill="#ff5a1f" opacity=".4" d="M12 1.2c1.8 4.6 7.2 6.4 7.2 13.2 0 6.2-3.4 11.2-7.2 15.2-3.8-4-7.2-9-7.2-15.2C4.8 7.6 10.2 5.8 12 1.2z"/><path fill="#ff8a2a" d="M12 3.2c1.5 4.2 6 5.8 6 11.6 0 5.2-2.8 9.4-6 12.8-3.2-3.4-6-7.6-6-12.8 0-5.8 4.5-7.4 6-11.6z"/><path fill="#ffd15a" d="M12 8.4c.9 2.6 3.2 3.6 3.2 6.8 0 3-1.5 5.4-3.2 7.4-1.7-2-3.2-4.4-3.2-7.4 0-3.2 2.3-4.2 3.2-6.8z"/><path fill="#fff6d2" d="M12 13.2c.5 1.6 1.7 2.2 1.7 4.1 0 1.8-.8 3.2-1.7 4.4-.9-1.2-1.7-2.6-1.7-4.4 0-1.9 1.2-2.5 1.7-4.1z"/></svg>`;
const FLAME_URI = `data:image/svg+xml,${encodeURIComponent(FLAME_SVG)}`;
export const FLAME_THUMB = `url("${FLAME_URI}")`;
export const FLAME_CURSOR = `url("${FLAME_URI}") 12 30, auto`;

type Kind = "ember" | "ink";
type Emit = (x: number, y: number, kind: Kind) => void;

let emit: Emit | null = null;
const last = { x: 0, y: 0 };
if (typeof window !== "undefined") {
  window.addEventListener("pointermove", (e) => {
    last.x = e.clientX;
    last.y = e.clientY;
  }, { passive: true });
}

// Braises quand le volume baisse. x/y optionnels : sinon dernière position du pointeur.
export function emitVolTrail(x?: number, y?: number) {
  emit?.(x ?? last.x, y ?? last.y, "ember");
}

type Part = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  decay: number;
  size: number;
  color: string;
  rise: number;
};

const COLORS = ["#fff6d2", "#ffd15a", "#ff8a2a", "#ff5a1f"];

// Traînée de la flamme : courte quand le son baisse, tenue quand le clic droit dessine.
export function FlameInk() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawRef = useRef(false);
  const fadeRef = useRef(false);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--flame-cursor", FLAME_CURSOR);
    root.style.setProperty("--flame-thumb", FLAME_THUMB);
    document.body.dataset.tournoiFlame = "1";
    window.dispatchEvent(new Event("tournoi-flame"));

    const fine = window.matchMedia?.("(pointer: fine)")?.matches ?? true;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d") ?? null;

    let dpr = 1;
    let w = 0;
    let h = 0;
    let raf = 0;
    const parts: Part[] = [];
    let prevInk: { x: number; y: number } | null = null;
    let prevEmber: { x: number; y: number } | null = null;
    let emberAt = 0;

    const resize = () => {
      if (!canvas) return;
      const iw = window.innerWidth;
      const ih = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, reduce ? 1 : 1.5);
      w = canvas.width = Math.round(iw * dpr);
      h = canvas.height = Math.round(ih * dpr);
      canvas.style.width = `${iw}px`;
      canvas.style.height = `${ih}px`;
    };

    const push = (x: number, y: number, kind: Kind) => {
      if (!ctx || !fine) return;
      const ink = kind === "ink";
      const n = reduce ? (ink ? 1 : 3) : ink ? 2 : 7;
      for (let i = 0; i < n; i++) {
        parts.push({
          x: x * dpr,
          y: y * dpr,
          vx: (Math.random() - 0.5) * (ink ? 0.35 : 0.8) * dpr,
          vy: (Math.random() - 0.7) * (ink ? 0.4 : 1.1) * dpr,
          life: 1,
          decay: reduce ? 0.03 : ink ? 0 : 0.02,
          size: (ink ? 2.2 : 1.6 + Math.random() * 2.4) * dpr,
          color: COLORS[(Math.random() * COLORS.length) | 0],
          rise: reduce ? 0 : ink ? -0.012 : -0.045,
        });
      }
      const cap = reduce ? 80 : 720;
      if (parts.length > cap) parts.splice(0, parts.length - cap);
      if (!raf) raf = requestAnimationFrame(tick);
    };

    const along = (from: { x: number; y: number } | null, x: number, y: number, kind: Kind) => {
      if (from && Math.hypot(x - from.x, y - from.y) > 96) from = null;
      if (!from) {
        push(x, y, kind);
        return { x, y };
      }
      const dist = Math.hypot(x - from.x, y - from.y);
      const steps = Math.min(8, Math.max(1, Math.round(dist / 10)));
      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        push(from.x + (x - from.x) * t, from.y + (y - from.y) * t, kind);
      }
      return { x, y };
    };

    const tick = () => {
      raf = 0;
      if (!ctx) return;
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = "lighter";
      const rush = fadeRef.current;
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.rise * dpr;
        p.life -= rush ? 0.08 : p.decay;
        if (p.life <= 0) {
          parts.splice(i, 1);
          continue;
        }
        const r = p.size * (0.45 + p.life);
        ctx.globalAlpha = Math.max(0, p.life) * 0.9;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
      if (!parts.length) fadeRef.current = false;
      else raf = requestAnimationFrame(tick);
    };

    emit = (x, y, kind) => {
      if (kind === "ember") {
        if (performance.now() - emberAt > 180) prevEmber = null;
        emberAt = performance.now();
        prevEmber = along(prevEmber, x, y, "ember");
      } else prevInk = along(prevInk, x, y, "ink");
    };

    const onMove = (e: PointerEvent) => {
      if (!drawRef.current) return;
      const node = e.target as Element | null;
      if (!node?.closest?.("[data-flame]")) return;
      prevInk = along(prevInk, e.clientX, e.clientY, "ink");
    };
    const onCtx = (e: MouseEvent) => {
      const node = e.target as Element | null;
      if (!node?.closest?.("[data-flame]")) return;
      e.preventDefault();
      drawRef.current = !drawRef.current;
      prevInk = null;
      if (!drawRef.current) fadeRef.current = true;
      if (!raf && parts.length) raf = requestAnimationFrame(tick);
    };

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("contextmenu", onCtx);
    return () => {
      emit = null;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("contextmenu", onCtx);
      root.style.removeProperty("--flame-cursor");
      root.style.removeProperty("--flame-thumb");
      delete document.body.dataset.tournoiFlame;
      window.dispatchEvent(new Event("tournoi-flame"));
    };
  }, []);

  return <canvas ref={canvasRef} className="t-flame-ink" aria-hidden />;
}
