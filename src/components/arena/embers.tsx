import { useEffect, useRef } from "react";

// Braises rouges qui montent à gauche, neige bleue qui tombe à droite.
// Chaque particule est un sprite pré-dessiné (pas de dégradé recalculé à
// chaque image). La boucle ne démarre qu'avec `start`, après un délai, et
// s'arrête hors écran, onglet caché, mouvement réduit ou machine lente.
type P = { x: number; y: number; vx: number; vy: number; s: number; life: number; side: 0 | 1 };

function sprite(inner: string, mid: string) {
  const c = document.createElement("canvas");
  c.width = c.height = 32;
  const g = c.getContext("2d");
  if (!g) return c;
  const grad = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  grad.addColorStop(0, inner);
  grad.addColorStop(0.35, mid);
  grad.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 32, 32);
  return c;
}

export function Embers({ density = 1, start = true, delay = 0 }: { density?: number; start?: boolean; delay?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const c = ref.current;
    if (!c || !start) return;
    const g = c.getContext("2d");
    if (!g) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (document.documentElement.classList.contains("perf-lite")) return;

    const ember = sprite("rgba(255,200,140,1)", "rgba(255,60,40,0.55)");
    const snow = sprite("rgba(215,232,255,1)", "rgba(90,150,255,0.45)");
    let W = 0;
    let H = 0;
    const resize = () => {
      const r = c.getBoundingClientRect();
      W = r.width;
      H = r.height;
      c.width = Math.max(1, Math.round(W));
      c.height = Math.max(1, Math.round(H));
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(c);

    const count = Math.round(Math.min(56, (W / 26) * density));
    const spawn = (side: 0 | 1 = Math.random() < 0.5 ? 0 : 1, fresh = false): P => {
      const x = side === 0 ? Math.random() * W * 0.5 : W * 0.5 + Math.random() * W * 0.5;
      return side === 0
        ? { x, y: fresh ? Math.random() * H : H + 10, vx: (Math.random() - 0.3) * 0.35, vy: -(0.35 + Math.random() * 0.9), s: 5 + Math.random() * 12, life: 0, side }
        : { x, y: fresh ? Math.random() * H : -10, vx: -(0.1 + Math.random() * 0.35), vy: 0.25 + Math.random() * 0.55, s: 5 + Math.random() * 10, life: 0, side };
    };
    const ps: P[] = Array.from({ length: count }, () => spawn(undefined, true));

    let raf = 0;
    let on = false;
    let t = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      t += 1;
      g.clearRect(0, 0, W, H);
      g.globalCompositeOperation = "lighter";
      for (let i = 0; i < ps.length; i++) {
        const p = ps[i];
        p.life += 1;
        p.x += p.vx + Math.sin((t + i * 37) / 60) * (p.side ? 0.25 : 0.15);
        p.y += p.vy;
        if ((p.side === 0 ? p.y < -12 : p.y > H + 12) || p.x < -12 || p.x > W + 12) {
          ps[i] = spawn(p.side);
          continue;
        }
        // Les braises s'éteignent en montant ; la neige reste douce.
        const fade = p.side === 0 ? Math.max(0, Math.min(1, p.y / (H * 0.85))) : 1;
        g.globalAlpha = Math.min(1, p.life / 40) * fade * (p.side ? 0.55 : 0.85);
        g.drawImage(p.side ? snow : ember, p.x - p.s / 2, p.y - p.s / 2, p.s, p.s);
      }
      g.globalAlpha = 1;
      g.globalCompositeOperation = "source-over";
    };
    const run = () => {
      if (on || document.hidden) return;
      on = true;
      raf = requestAnimationFrame(tick);
    };
    const stop = () => {
      on = false;
      cancelAnimationFrame(raf);
    };
    let visible = false;
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible) run();
      else stop();
    });
    // Rien ne tourne pendant l'ouverture de l'affiche.
    const wait = setTimeout(() => io.observe(c), delay);
    const vis = () => (document.hidden ? stop() : visible && run());
    document.addEventListener("visibilitychange", vis);
    return () => {
      clearTimeout(wait);
      stop();
      io.disconnect();
      ro.disconnect();
      document.removeEventListener("visibilitychange", vis);
    };
  }, [density, start, delay]);

  return <canvas ref={ref} className="ar-embers" aria-hidden />;
}
