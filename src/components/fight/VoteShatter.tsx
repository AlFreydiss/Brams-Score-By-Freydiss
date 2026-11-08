import { memo, useEffect, useMemo, useRef } from "react";
import { animate, motion, useMotionValue, useMotionValueEvent } from "framer-motion";
import { FONT } from "./identities";

// Le moment du vote : le perdant se fracture (éclats découpés en clip-path qui
// tombent avec la gravité, après un ralenti de 300 ms), flash blanc, confettis
// aux couleurs dominantes du gagnant.

export type Rect = { x: number; y: number; w: number; h: number };

type Shard = { poly: string; cx: number; cy: number; dx: number; fall: number; rot: number; delay: number };

// Découpe en triangles : une grille 5×6 aux sommets décalés au hasard.
function shards(seed: number): Shard[] {
  let s = seed;
  const rnd = () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
  const C = 5;
  const R = 6;
  const pts: [number, number][][] = [];
  for (let j = 0; j <= R; j++) {
    pts[j] = [];
    for (let i = 0; i <= C; i++) {
      const edgeX = i === 0 || i === C;
      const edgeY = j === 0 || j === R;
      pts[j][i] = [(i / C) * 100 + (edgeX ? 0 : (rnd() - 0.5) * 14), (j / R) * 100 + (edgeY ? 0 : (rnd() - 0.5) * 12)];
    }
  }
  const out: Shard[] = [];
  for (let j = 0; j < R; j++)
    for (let i = 0; i < C; i++) {
      const a = pts[j][i];
      const b = pts[j][i + 1];
      const c = pts[j + 1][i + 1];
      const d = pts[j + 1][i];
      const tris = rnd() > 0.5 ? [[a, b, c], [a, c, d]] : [[a, b, d], [b, c, d]];
      for (const t of tris) {
        const cx = (t[0][0] + t[1][0] + t[2][0]) / 3;
        const cy = (t[0][1] + t[1][1] + t[2][1]) / 3;
        out.push({
          poly: `polygon(${t.map(([x, y]) => `${x.toFixed(2)}% ${y.toFixed(2)}%`).join(", ")})`,
          cx,
          cy,
          dx: (cx - 50) * (1.2 + rnd() * 2.4),
          fall: 70 + rnd() * 60 + (cy / 100) * 30,
          rot: (rnd() - 0.5) * 220,
          delay: (1 - cy / 100) * 0.06 + rnd() * 0.05,
        });
      }
    }
  return out;
}

// memo + consignes calculées une fois : un nouveau rendu du parent ne relance pas la chute.
export const Shatter = memo(function Shatter({ rect, src, reduce }: { rect: Rect; src: string; reduce: boolean }) {
  const list = useMemo(() => shards(Math.floor(Math.random() * 1e6) + 1), []);
  const variants = useMemo(
    () =>
      list.map((s) => ({
        crack: { x: 0, y: 0, rotate: 0, opacity: 1, scale: 0.992 },
        fall: {
          // Ralenti : les éclats se fendent à peine pendant 300 ms, puis tombent.
          x: [0, s.dx * 0.04, s.dx],
          y: [0, 6, (s.fall / 100) * rect.h + rect.h * 0.6],
          rotate: [0, s.rot * 0.04, s.rot],
          opacity: [1, 1, 0],
          scale: [0.992, 0.97, 0.9],
          transition: { duration: 1.35, delay: s.delay, times: [0, 0.24, 1], ease: ["linear", [0.55, 0, 0.95, 0.5]] as never },
        },
      })),
    // Une seule découpe par vote.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [list],
  );
  if (reduce) {
    return (
      <motion.div
        aria-hidden
        initial={{ opacity: 1 }}
        animate={{ opacity: 0, transition: { duration: 0.4 } }}
        style={{ position: "absolute", left: rect.x, top: rect.y, width: rect.w, height: rect.h, backgroundImage: `url("${src}")`, backgroundSize: "cover", backgroundPosition: "center", zIndex: 20, pointerEvents: "none" }}
      />
    );
  }
  return (
    <div aria-hidden style={{ position: "absolute", left: rect.x, top: rect.y, width: rect.w, height: rect.h, zIndex: 20, pointerEvents: "none" }}>
      {list.map((s, k) => (
        <motion.div
          key={k}
          variants={variants[k]}
          initial="crack"
          animate="fall"
          style={{
            position: "absolute",
            inset: 0,
            clipPath: s.poly,
            backgroundImage: `url("${src}")`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            transformOrigin: `${s.cx}% ${s.cy}%`,
            filter: "brightness(0.85) saturate(0.7)",
            willChange: "transform, opacity",
          }}
        />
      ))}
    </div>
  );
});

/** Flash blanc bref au moment de l'impact. */
export function Flash({ delay = 0.28 }: { delay?: number }) {
  return (
    <motion.div
      aria-hidden
      initial={{ opacity: 0 }}
      animate={{ opacity: [0, 0.55, 0], transition: { duration: 0.42, delay, times: [0, 0.18, 1] } }}
      style={{ position: "absolute", inset: 0, background: "#fff", mixBlendMode: "screen", zIndex: 30, pointerEvents: "none" }}
    />
  );
}

/** Confettis (canvas) qui jaillissent du centre du gagnant, aux couleurs de son image. */
export function Confetti({ origin, colors, delay = 320 }: { origin: { x: number; y: number }; colors: string[]; delay?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const g = c.getContext("2d");
    if (!g) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const r = c.getBoundingClientRect();
    c.width = r.width * dpr;
    c.height = r.height * dpr;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const parts = Array.from({ length: 70 }, () => {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.25;
      const v = 7 + Math.random() * 11;
      return {
        x: origin.x,
        y: origin.y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v,
        w: 5 + Math.random() * 7,
        h: 3 + Math.random() * 4,
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.35,
        color: colors[Math.floor(Math.random() * colors.length)],
      };
    });
    let raf = 0;
    let t0 = 0;
    const tick = (now: number) => {
      if (!t0) t0 = now;
      const t = now - t0;
      g.clearRect(0, 0, r.width, r.height);
      for (const p of parts) {
        p.vy += 0.32;
        p.vx *= 0.985;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        g.save();
        g.translate(p.x, p.y);
        g.rotate(p.rot);
        g.globalAlpha = Math.max(0, 1 - t / 1900);
        g.fillStyle = p.color;
        g.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(p.rot * 2)));
        g.restore();
      }
      if (t < 1900) raf = requestAnimationFrame(tick);
    };
    const start = setTimeout(() => (raf = requestAnimationFrame(tick)), delay);
    return () => {
      clearTimeout(start);
      cancelAnimationFrame(raf);
    };
  }, [origin.x, origin.y, colors, delay]);
  return <canvas ref={ref} aria-hidden style={{ position: "absolute", inset: 0, width: "100%", height: "100%", zIndex: 31, pointerEvents: "none" }} />;
}

/**
 * Verdict de la communauté : compteur qui monte jusqu'au pourcentage de votants
 * du même avis, et la phrase qui va avec.
 */
export function CommunityReveal({ pct, total, ink, mute, accent, reduce }: { pct: number | null; total: number; ink: string; mute: string; accent: string; reduce: boolean }) {
  const v = useMotionValue(0);
  const num = useRef<HTMLSpanElement>(null);
  const bar = useRef<HTMLSpanElement>(null);
  useMotionValueEvent(v, "change", (x) => {
    if (num.current) num.current.textContent = String(Math.round(x));
    if (bar.current) bar.current.style.transform = `scaleX(${x / 100})`;
  });
  useEffect(() => {
    if (pct == null) return;
    if (reduce) {
      v.set(pct);
      return;
    }
    const a = animate(v, pct, { duration: 1.2, ease: [0.16, 1, 0.3, 1] });
    return () => a.stop();
  }, [pct, v, reduce]);

  const first = pct == null || total === 0;
  const rebel = !first && (pct as number) < 50;
  return (
    <motion.div
      role="status"
      initial={{ opacity: 0, y: 24, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1, transition: { type: "spring", bounce: 0.25, duration: 0.6 } }}
      style={{
        position: "absolute",
        left: "50%",
        bottom: "clamp(96px, 16vh, 150px)",
        translate: "-50% 0",
        zIndex: 40,
        display: "grid",
        justifyItems: "center",
        gap: 10,
        padding: "18px 26px 20px",
        minWidth: "min(420px, calc(100vw - 32px))",
        borderRadius: 18,
        background: "rgba(14,16,20,0.9)",
        backdropFilter: "blur(18px)",
        boxShadow: "inset 0 0 0 1px rgba(244,242,236,0.12), 0 30px 80px -30px rgba(0,0,0,0.9)",
        color: ink,
        textAlign: "center",
        pointerEvents: "none",
      }}
    >
      {first ? (
        <p style={{ margin: 0, fontFamily: FONT.display, fontWeight: 700, fontSize: 22, letterSpacing: "-0.02em" }}>Premier vote sur ce duel</p>
      ) : (
        <>
          <p style={{ margin: 0, fontFamily: FONT.display, fontWeight: 700, fontSize: "clamp(36px, 4vw, 52px)", lineHeight: 1, letterSpacing: "-0.035em" }}>
            <span ref={num}>0</span>
            <span style={{ fontSize: "0.5em", marginLeft: 4 }}>%</span>
          </p>
          <span style={{ display: "block", width: "100%", height: 3, borderRadius: 3, background: "rgba(255,255,255,0.14)", overflow: "hidden" }}>
            <span ref={bar} style={{ display: "block", height: "100%", background: accent, transformOrigin: "left", transform: "scaleX(0)" }} />
          </span>
          <p style={{ margin: 0, fontFamily: FONT.body, fontSize: 15, color: ink }}>
            {rebel ? `Tu fais partie des ${pct} % de rebelles` : `Tu es avec ${pct} % des votants`}
          </p>
          <p style={{ margin: 0, fontFamily: FONT.body, fontSize: 12.5, color: mute }}>
            {total} vote{total > 1 ? "s" : ""} sur ce duel
          </p>
        </>
      )}
    </motion.div>
  );
}
