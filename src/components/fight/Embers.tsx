import { useEffect, useRef } from "react";
import { onPulse } from "./audio/pulse";

// Braises et poussière d'or qui montent lentement (univers Clair Obscur du
// tournoi des OST de jeux vidéo), avec de rares pétales. Au repos : discret.
// Quand la musique joue : plus vif, plus rapide, et une gerbe d'étincelles sur
// chaque coup de basse (si le lecteur expose un analyseur ; sinon l'état
// « en lecture » suffit). Canvas 2D, aucune mise à jour React par image.

type P = { x: number; y: number; vx: number; vy: number; r: number; tw: number; life: number; age: number; kind: 0 | 1 | 2 };

export function Embers({ active = false, density = 1, zIndex = 1, tint = "gold" }: { active?: boolean; density?: number; zIndex?: number; tint?: "gold" | "dust" }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const on = useRef(active);
  on.current = active;

  useEffect(() => {
    const c = ref.current;
    if (!c || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    let W = 0, H = 0, dpr = 1;
    const fit = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      W = c.clientWidth;
      H = c.clientHeight;
      c.width = Math.round(W * dpr);
      c.height = Math.round(H * dpr);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(c);

    const ps: P[] = [];
    const spawn = (burst = false): P => {
      const z = Math.random();
      // « dust » (endings) : poussière pâle qui retombe, sans braises ni pétales.
      const kind: P["kind"] = tint === "dust" ? 1 : burst ? 0 : z < 0.78 ? 0 : z < 0.95 ? 1 : 2;
      const fall = tint === "dust";
      return {
        x: Math.random() * W,
        y: burst ? H * (0.75 + Math.random() * 0.3) : fall ? (Math.random() < 0.5 ? -10 : Math.random() * H) : Math.random() < 0.5 ? H + 10 : Math.random() * H,
        vx: (Math.random() - 0.5) * 8,
        vy: fall ? 6 + Math.random() * 12 : -(burst ? 60 + Math.random() * 90 : 8 + Math.random() * 18),
        r: kind === 0 ? 0.6 + Math.random() * 1.5 : kind === 1 ? (fall ? 0.6 + Math.random() * 1.6 : 1.2 + Math.random() * 1.8) : 3 + Math.random() * 3,
        tw: Math.random() * 6.28,
        life: burst ? 1.2 + Math.random() : 6 + Math.random() * 8,
        age: 0,
        kind,
      };
    };

    // Le son : niveau lissé (spectre si dispo, sinon « en lecture » = 0,45).
    let level = 0, live = false, kicks = 0;
    const off = onPulse((p) => {
      live = p.live;
      if (p.live) level += (p.level - level) * 0.2;
      if (p.kick) kicks++;
    });

    let raf = 0, last = performance.now(), boost = 0;
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (document.hidden) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const target = on.current ? (live ? 0.35 + level * 0.9 : 0.55 + 0.15 * Math.sin(now / 900)) : 0;
      boost += (target - boost) * Math.min(1, dt * 2.5);

      const want = Math.min(140, Math.round(((W * H) / 13000) * density * (1 + boost * 0.8)));
      while (ps.length < want) ps.push(spawn());
      if (kicks && on.current) {
        for (let i = 0; i < 10; i++) ps.push(spawn(true));
        kicks = 0;
      }
      kicks = 0;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      const speed = 1 + boost * 1.6;
      for (let i = ps.length - 1; i >= 0; i--) {
        const q = ps[i];
        q.age += dt;
        q.tw += dt * (2 + q.r);
        q.x += (q.vx + Math.sin(q.y * 0.01 + now * 0.0006 + q.r) * 10) * dt * speed;
        q.y += q.vy * dt * speed;
        if (q.age > q.life || q.y < -20 || q.y > H + 20 || q.x < -20 || q.x > W + 20) {
          ps.splice(i, 1);
          continue;
        }
        const fade = Math.min(1, q.age / 0.8, (q.life - q.age) / 1.2);
        const tw = 0.55 + 0.45 * Math.sin(q.tw);
        if (q.kind === 0) {
          // Braise : point chaud avec halo.
          const a = fade * tw * (0.35 + boost * 0.55);
          const g = ctx.createRadialGradient(q.x, q.y, 0, q.x, q.y, q.r * 4);
          g.addColorStop(0, `rgba(255,226,160,${a})`);
          g.addColorStop(0.35, `rgba(232,160,70,${a * 0.45})`);
          g.addColorStop(1, "rgba(232,160,70,0)");
          ctx.fillStyle = g;
          ctx.fillRect(q.x - q.r * 4, q.y - q.r * 4, q.r * 8, q.r * 8);
        } else if (q.kind === 1) {
          // Poussière : très pâle, lente.
          ctx.fillStyle = `rgba(244,232,205,${fade * (tint === "dust" ? 0.32 + boost * 0.3 : 0.18) * tw})`;
          ctx.beginPath();
          ctx.arc(q.x, q.y, q.r, 0, 6.283);
          ctx.fill();
        } else {
          // Pétale rouge qui tourne.
          ctx.save();
          ctx.translate(q.x, q.y);
          ctx.rotate(q.tw * 0.4);
          ctx.scale(1, 0.35 + 0.6 * Math.abs(Math.sin(q.tw * 0.5)));
          ctx.fillStyle = `rgba(196,46,52,${fade * 0.75})`;
          ctx.beginPath();
          ctx.ellipse(0, 0, q.r, q.r * 0.55, 0, 0, 6.283);
          ctx.fill();
          ctx.restore();
        }
      }
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      off?.();
    };
  }, [density, tint]);

  return <canvas ref={ref} aria-hidden style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex }} />;
}
