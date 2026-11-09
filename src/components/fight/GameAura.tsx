import { useEffect, useRef } from "react";
import { onPulse } from "./audio/pulse";
import type { Aura } from "./jeux-themes";

// Particules d'ambiance d'un panneau du duel jeux, dans le style du jeu :
// neige (God of War), étoiles (Mario), pixels (rétro), étincelles (militaire),
// néon, cendres, lucioles, sakura, éclats rouges (Persona)… Une toile par
// panneau. Discret au repos ; vif quand la piste joue, avec une gerbe sur les
// temps forts. Aucune mise à jour React par image.

type P = { x: number; y: number; vx: number; vy: number; r: number; t: number; life: number; age: number; c: string; s: number };

const rgba = (hex: string, a: number) => {
  const v = parseInt(hex.slice(1), 16);
  return `rgba(${(v >> 16) & 255},${(v >> 8) & 255},${v & 255},${Math.max(0, Math.min(1, a))})`;
};
const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];

// Comportement de chaque style : sens (monte / tombe / dérive), vitesse, taille, couleurs.
const SPEC: Record<Aura, { dir: -1 | 0 | 1; speed: [number, number]; size: [number, number]; n: number; colors: (accent: string) => string[] }> = {
  petals: { dir: -1, speed: [8, 22], size: [0.6, 1.8], n: 1, colors: () => ["#ffe2a0", "#e8a046", "#c42e34"] },
  embers: { dir: -1, speed: [14, 34], size: [0.6, 1.9], n: 1.1, colors: (a) => ["#ffd27a", "#ff8a3a", a] },
  ash: { dir: 1, speed: [6, 16], size: [0.8, 2.6], n: 0.8, colors: (a) => ["#9a948a", "#5d5953", a] },
  snow: { dir: 1, speed: [10, 26], size: [0.8, 2.4], n: 1.2, colors: () => ["#ffffff", "#e3f2ff"] },
  stars: { dir: -1, speed: [6, 18], size: [1.6, 3.6], n: 0.7, colors: (a) => ["#ffd23f", "#ff5d73", "#4cc9f0", "#7bd389", a] },
  pixels: { dir: -1, speed: [10, 26], size: [2, 4], n: 0.8, colors: (a) => ["#ffffff", a] },
  sparks: { dir: -1, speed: [40, 110], size: [0.6, 1.4], n: 0.7, colors: (a) => ["#ffd27a", "#ffb347", a] },
  neon: { dir: 0, speed: [4, 12], size: [0.6, 1.6], n: 0.9, colors: (a) => [a, "#ffffff"] },
  dust: { dir: 1, speed: [4, 10], size: [0.5, 1.6], n: 0.9, colors: () => ["#f4e8cd"] },
  shards: { dir: 1, speed: [20, 50], size: [3, 7], n: 0.45, colors: (a) => [a, "#ffffff", "#111111"] },
  crystals: { dir: -1, speed: [5, 14], size: [1.4, 3.2], n: 0.7, colors: (a) => ["#ffffff", a] },
  fireflies: { dir: 0, speed: [6, 16], size: [1.2, 2.6], n: 0.6, colors: (a) => [a, "#fff6c2"] },
  sakura: { dir: 1, speed: [10, 24], size: [2.6, 4.6], n: 0.6, colors: () => ["#ffc2d6", "#f7a1bd", "#ffe3ec"] },
  leaves: { dir: 1, speed: [10, 24], size: [2.6, 5], n: 0.5, colors: (a) => ["#d9a441", "#a8632a", a] },
  sand: { dir: 0, speed: [18, 40], size: [0.5, 1.4], n: 1.2, colors: () => ["#f1d3a1", "#d8a560"] },
};

export function GameAura({ kind, accent, active, zIndex = 4 }: { kind: Aura; accent: string; active: boolean; zIndex?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const on = useRef(active);
  on.current = active;

  useEffect(() => {
    const c = ref.current;
    if (!c || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const spec = SPEC[kind];
    const cols = spec.colors(accent);
    let W = 0, H = 0, dpr = 1;
    const fit = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      W = c.clientWidth;
      H = c.clientHeight;
      c.width = Math.max(1, Math.round(W * dpr));
      c.height = Math.max(1, Math.round(H * dpr));
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(c);

    const make = (burst = false): P => {
      const sp = spec.speed[0] + Math.random() * (spec.speed[1] - spec.speed[0]);
      const ang = Math.random() * Math.PI * 2;
      const fromEdge = !burst && Math.random() < 0.5;
      const y = burst ? H * (0.55 + Math.random() * 0.4) : fromEdge ? (spec.dir < 0 ? H + 8 : spec.dir > 0 ? -8 : Math.random() * H) : Math.random() * H;
      return {
        x: kind === "sand" && fromEdge ? -8 : Math.random() * W,
        y,
        vx: kind === "sand" ? sp : spec.dir === 0 ? Math.cos(ang) * sp : (Math.random() - 0.5) * sp * 0.4,
        vy: burst ? -(60 + Math.random() * 120) : spec.dir === 0 ? Math.sin(ang) * sp * 0.6 : spec.dir * sp,
        r: spec.size[0] + Math.random() * (spec.size[1] - spec.size[0]),
        t: Math.random() * 6.28,
        life: burst ? 1 + Math.random() : 5 + Math.random() * 8,
        age: 0,
        c: pick(cols),
        s: Math.random() < 0.5 ? -1 : 1,
      };
    };

    let level = 0, live = false, kicks = 0;
    const off = onPulse((p) => {
      live = p.live;
      if (p.live) level += (p.level - level) * 0.2;
      if (p.kick) kicks++;
    });

    const ps: P[] = [];
    let raf = 0, last = performance.now(), boost = 0;
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (document.hidden) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const target = on.current ? (live ? 0.4 + level * 0.9 : 0.6) : 0.12;
      boost += (target - boost) * Math.min(1, dt * 2.5);
      const want = Math.min(110, Math.round(((W * H) / 16000) * spec.n * (0.35 + boost)));
      while (ps.length < want) ps.push(make());
      if (kicks && on.current) for (let i = 0; i < 8; i++) ps.push(make(true));
      kicks = 0;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      const speed = 0.7 + boost * 1.3;
      for (let i = ps.length - 1; i >= 0; i--) {
        const q = ps[i];
        q.age += dt;
        q.t += dt * (1.5 + q.r * 0.3);
        // Dérive propre au style.
        let wx = 0;
        if (kind === "snow" || kind === "ash" || kind === "dust") wx = Math.sin(q.t * 0.7 + q.r) * 12;
        else if (kind === "sakura" || kind === "leaves") wx = Math.sin(q.t * 0.9) * 26 * q.s;
        else if (kind === "fireflies" || kind === "neon") wx = Math.sin(q.t * 0.6) * 10;
        q.x += (q.vx + wx) * dt * speed;
        q.y += q.vy * dt * speed;
        if (q.age > q.life || q.y < -20 || q.y > H + 20 || q.x < -20 || q.x > W + 20) {
          ps.splice(i, 1);
          continue;
        }
        const fade = Math.min(1, q.age / 0.7, (q.life - q.age) / 1.1);
        const tw = 0.55 + 0.45 * Math.sin(q.t * 2);
        const a = fade * (0.25 + boost * 0.7);
        switch (kind) {
          case "pixels": {
            // Carré net, sans lissage : l'écran d'une vieille console.
            ctx.fillStyle = rgba(q.c, a * (0.5 + 0.5 * tw));
            const s = Math.round(q.r);
            ctx.fillRect(Math.round(q.x), Math.round(q.y), s, s);
            break;
          }
          case "stars":
          case "crystals": {
            // Étoile à 4 branches qui scintille.
            const r = q.r * (0.7 + 0.5 * tw);
            ctx.fillStyle = rgba(q.c, a);
            ctx.beginPath();
            ctx.moveTo(q.x, q.y - r * 2);
            ctx.quadraticCurveTo(q.x, q.y, q.x + r * 2, q.y);
            ctx.quadraticCurveTo(q.x, q.y, q.x, q.y + r * 2);
            ctx.quadraticCurveTo(q.x, q.y, q.x - r * 2, q.y);
            ctx.quadraticCurveTo(q.x, q.y, q.x, q.y - r * 2);
            ctx.fill();
            break;
          }
          case "sparks":
          case "sand": {
            ctx.strokeStyle = rgba(q.c, a);
            ctx.lineWidth = q.r;
            ctx.lineCap = "round";
            ctx.beginPath();
            ctx.moveTo(q.x, q.y);
            ctx.lineTo(q.x - q.vx * 0.05, q.y - q.vy * 0.05);
            ctx.stroke();
            break;
          }
          case "neon":
          case "fireflies":
          case "embers":
          case "petals": {
            // Point lumineux avec halo.
            const g = ctx.createRadialGradient(q.x, q.y, 0, q.x, q.y, q.r * 5);
            g.addColorStop(0, rgba(q.c, a * tw));
            g.addColorStop(0.3, rgba(q.c, a * tw * 0.45));
            g.addColorStop(1, rgba(q.c, 0));
            ctx.fillStyle = g;
            ctx.fillRect(q.x - q.r * 5, q.y - q.r * 5, q.r * 10, q.r * 10);
            break;
          }
          case "shards": {
            // Éclat triangulaire qui tourne (Persona).
            ctx.save();
            ctx.translate(q.x, q.y);
            ctx.rotate(q.t * q.s);
            ctx.fillStyle = rgba(q.c, a * 0.9);
            ctx.beginPath();
            ctx.moveTo(0, -q.r);
            ctx.lineTo(q.r * 0.8, q.r * 0.7);
            ctx.lineTo(-q.r * 0.6, q.r * 0.4);
            ctx.fill();
            ctx.restore();
            break;
          }
          case "sakura":
          case "leaves": {
            ctx.save();
            ctx.translate(q.x, q.y);
            ctx.rotate(q.t * 0.6 * q.s);
            ctx.scale(1, 0.35 + 0.6 * Math.abs(Math.sin(q.t)));
            ctx.fillStyle = rgba(q.c, a * 0.9);
            ctx.beginPath();
            ctx.ellipse(0, 0, q.r, q.r * 0.55, 0, 0, 6.283);
            ctx.fill();
            ctx.restore();
            break;
          }
          default: {
            // Neige, cendre, poussière : disque doux.
            ctx.fillStyle = rgba(q.c, a * (kind === "snow" ? 0.9 : 0.6));
            ctx.beginPath();
            ctx.arc(q.x, q.y, q.r, 0, 6.283);
            ctx.fill();
          }
        }
      }
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      off?.();
    };
  }, [kind, accent]);

  return <canvas ref={ref} aria-hidden style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex }} />;
}
