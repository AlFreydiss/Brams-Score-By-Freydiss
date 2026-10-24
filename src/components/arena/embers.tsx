import { useEffect, useRef } from "react";

// Braises rouges qui montent à gauche, neige bleue qui tombe à droite.
// Une seule boucle canvas, arrêtée hors écran, onglet caché, mouvement réduit
// ou machine lente (html.perf-lite).
type P = { x: number; y: number; vx: number; vy: number; r: number; a: number; life: number; side: 0 | 1 };

export function Embers({ density = 1 }: { density?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const g = c.getContext("2d");
    if (!g) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (document.documentElement.classList.contains("perf-lite")) return;

    let W = 0;
    let H = 0;
    const resize = () => {
      const r = c.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      W = r.width;
      H = r.height;
      c.width = Math.max(1, Math.round(W * dpr));
      c.height = Math.max(1, Math.round(H * dpr));
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(c);

    const count = Math.round(Math.min(90, (W / 18) * density));
    const spawn = (p: Partial<P> = {}, fresh = false): P => {
      const side = (p.side ?? (Math.random() < 0.5 ? 0 : 1)) as 0 | 1;
      const x = side === 0 ? Math.random() * W * 0.5 : W * 0.5 + Math.random() * W * 0.5;
      return side === 0
        ? { x, y: fresh ? Math.random() * H : H + 10, vx: (Math.random() - 0.3) * 0.35, vy: -(0.35 + Math.random() * 0.9), r: 0.6 + Math.random() * 1.8, a: 0, life: 0, side }
        : { x, y: fresh ? Math.random() * H : -10, vx: -(0.1 + Math.random() * 0.35), vy: 0.25 + Math.random() * 0.55, r: 0.6 + Math.random() * 1.6, a: 0, life: 0, side };
    };
    const ps: P[] = Array.from({ length: count }, () => spawn({}, true));

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
        p.a = Math.min(1, p.life / 40);
        p.x += p.vx + Math.sin((t + i * 37) / 60) * (p.side ? 0.25 : 0.15);
        p.y += p.vy;
        const out = p.side === 0 ? p.y < -12 : p.y > H + 12;
        if (out || p.x < -12 || p.x > W + 12) {
          ps[i] = spawn({ side: p.side });
          continue;
        }
        // Les braises s'éteignent en montant ; la neige reste douce.
        const fadeUp = p.side === 0 ? Math.max(0, Math.min(1, p.y / (H * 0.85))) : 1;
        const alpha = p.a * fadeUp * (p.side ? 0.55 : 0.85);
        const grad = g.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 4);
        grad.addColorStop(0, p.side ? `rgba(200,225,255,${alpha})` : `rgba(255,190,120,${alpha})`);
        grad.addColorStop(0.35, p.side ? `rgba(90,150,255,${alpha * 0.5})` : `rgba(255,60,40,${alpha * 0.55})`);
        grad.addColorStop(1, "rgba(0,0,0,0)");
        g.fillStyle = grad;
        g.beginPath();
        g.arc(p.x, p.y, p.r * 4, 0, Math.PI * 2);
        g.fill();
      }
      g.globalCompositeOperation = "source-over";
    };
    const start = () => {
      if (on || document.hidden) return;
      on = true;
      raf = requestAnimationFrame(tick);
    };
    const stop = () => {
      on = false;
      cancelAnimationFrame(raf);
    };
    const io = new IntersectionObserver(([e]) => (e.isIntersecting ? start() : stop()));
    io.observe(c);
    const vis = () => (document.hidden ? stop() : start());
    document.addEventListener("visibilitychange", vis);
    return () => {
      stop();
      io.disconnect();
      ro.disconnect();
      document.removeEventListener("visibilitychange", vis);
    };
  }, [density]);

  return <canvas ref={ref} className="ar-embers" aria-hidden />;
}
