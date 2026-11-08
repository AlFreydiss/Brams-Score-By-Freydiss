import { useEffect, useRef } from "react";
import type { Player } from "../tournois/use-player";
import { onPulse, type Pulse } from "./audio/pulse";
import type { Identity } from "./identities";

// Calque posé sur l'image d'un panneau : il réagit au vrai signal quand
// l'analyseur existe (vidéos des openings / endings), et sinon ne s'anime
// qu'avec la lecture elle-même (vinyle qui tourne pour l'OST lue sur YouTube),
// sans jamais simuler une réaction au son.

type Props = {
  id: Identity;
  /** La piste de ce panneau est en lecture. */
  active: boolean;
  player: Player;
  reduce: boolean;
};

type Mote = { x: number; y: number; vx: number; vy: number; r: number; life: number; max: number };

export function AudioReactiveLayer({ id, active, player, reduce }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const glow = useRef<HTMLDivElement>(null);
  const rgb = useRef<HTMLDivElement>(null);
  const getTime = player.getTime;

  useEffect(() => {
    const c = canvas.current;
    if (!c) return;
    const g = c.getContext("2d");
    if (!g) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      const r = c.getBoundingClientRect();
      c.width = Math.max(1, Math.round(r.width * dpr));
      c.height = Math.max(1, Math.round(r.height * dpr));
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(c);

    let angle = 0;
    let last = performance.now();
    const motes: Mote[] = [];
    let kickFlash = 0;

    const draw = (p: Pulse) => {
      const W = c.clientWidth;
      const H = c.clientHeight;
      const dt = Math.min(50, p.t - last);
      last = p.t;
      g.clearRect(0, 0, W, H);
      const on = active;
      const bass = on && p.live ? p.bass : 0;
      const level = on && p.live ? p.level : 0;
      if (on && p.kick) kickFlash = 1;
      kickFlash *= 0.86;

      // Bords qui respirent : un halo intérieur à la couleur du tournoi.
      if (glow.current) glow.current.style.opacity = reduce ? (on ? "0.35" : "0") : String(Math.min(1, (on ? 0.25 : 0) + bass * 0.75 + kickFlash * 0.3));

      if (id.react === "vinyl") {
        // Vinyle dans le coin bas-droit : tourne à 33 tours pendant la lecture,
        // le sillon lu avance avec la position du morceau.
        if (on && player.playing && !reduce) angle += (dt / 1000) * ((33.3 / 60) * Math.PI * 2);
        // Le disque sort à moitié de la jointure, en haut, comme d'une pochette.
        const R = Math.min(W, H) * 0.3;
        const cx = W + R * 0.12;
        const cy = H * 0.26;
        const t = on ? getTime() : null;
        const prog = t && t.total ? t.now / t.total : 0;
        g.save();
        g.translate(cx, cy);
        g.rotate(angle);
        g.globalAlpha = on ? 0.9 : 0.35;
        g.fillStyle = "rgba(8,6,4,0.82)";
        g.beginPath();
        g.arc(0, 0, R, 0, Math.PI * 2);
        g.fill();
        for (let k = 0; k < 22; k++) {
          const rr = R * (0.36 + (k / 22) * 0.6);
          const read = 1 - (rr - R * 0.36) / (R * 0.6) <= prog;
          g.strokeStyle = read ? id.a : "rgba(255,255,255,0.07)";
          g.globalAlpha = (on ? 0.85 : 0.3) * (read ? 0.45 + level * 0.55 : 1);
          g.lineWidth = 1;
          g.beginPath();
          g.arc(0, 0, rr, 0, Math.PI * 2);
          g.stroke();
        }
        // Étiquette centrale et un reflet qui tourne avec le disque.
        g.globalAlpha = on ? 1 : 0.5;
        g.fillStyle = id.a;
        g.beginPath();
        g.arc(0, 0, R * 0.3, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = "#0b0806";
        g.beginPath();
        g.arc(0, 0, R * 0.035, 0, Math.PI * 2);
        g.fill();
        g.globalAlpha = 0.12;
        g.fillStyle = "#fff";
        g.beginPath();
        g.moveTo(0, 0);
        g.arc(0, 0, R, -0.35, 0.05);
        g.closePath();
        g.fill();
        g.restore();
      } else if (id.react === "crt") {
        // Barres du spectre en bas, rouge et cyan décalés comme un signal broadcast.
        // Fines barres le long du bord bas : elles soulignent l'image sans
        // passer devant le titre.
        const n = 64;
        const bw = W / n;
        const base = H;
        for (let i = 0; i < n; i++) {
          const v = on ? p.bands[Math.floor((i / n) * 48)] : 0;
          const h = v * H * 0.1;
          if (h < 1) continue;
          g.globalAlpha = 0.38;
          g.fillStyle = id.a;
          g.fillRect(i * bw + 1 - kickFlash * 3, base - h, Math.max(1, bw - 3), h);
          g.fillStyle = id.b;
          g.fillRect(i * bw + 1 + kickFlash * 3, base - h * 0.94, Math.max(1, bw - 3), h * 0.94);
        }
        g.globalAlpha = 1;
        if (rgb.current) {
          const s = reduce ? 0 : kickFlash * 6;
          rgb.current.style.boxShadow = s > 0.2 ? `inset ${s}px 0 0 ${id.a}55, inset ${-s}px 0 0 ${id.b}55` : "none";
        }
      } else {
        // Poussière dorée qui monte lentement ; les pics en font jaillir.
        const spawn = on && !reduce ? (p.peak ? 26 : 0.35 + level * 1.2) : 0;
        for (let k = 0; k < spawn; k++) {
          if (Math.random() > spawn - k) break;
          motes.push({
            x: Math.random() * W,
            y: H * (0.55 + Math.random() * 0.45),
            vx: (Math.random() - 0.5) * 0.25,
            vy: -(0.25 + Math.random() * (p.peak ? 1.6 : 0.6)),
            r: 0.6 + Math.random() * 1.8,
            life: 0,
            max: 2200 + Math.random() * 2600,
          });
        }
        if (motes.length > 260) motes.splice(0, motes.length - 260);
        for (let k = motes.length - 1; k >= 0; k--) {
          const m = motes[k];
          m.life += dt;
          if (m.life > m.max) {
            motes.splice(k, 1);
            continue;
          }
          m.x += m.vx * (dt / 16);
          m.y += m.vy * (dt / 16);
          m.vy *= 0.995;
          const a = Math.sin((m.life / m.max) * Math.PI);
          g.globalAlpha = a * (0.45 + level * 0.55);
          g.fillStyle = k % 3 ? id.b : id.a;
          g.beginPath();
          g.arc(m.x, m.y, m.r * (1 + bass * 0.6), 0, Math.PI * 2);
          g.fill();
        }
        g.globalAlpha = 1;
      }
    };
    // Panneau au repos : une seule image. En lecture : la boucle du bus audio.
    let off = () => {};
    if (active) off = onPulse(draw);
    else {
      const idle: Pulse = { live: false, level: 0, bass: 0, kick: false, peak: false, bands: new Float32Array(48), wave: new Float32Array(256), t: performance.now() };
      requestAnimationFrame(() => draw(idle));
    }
    return () => {
      off();
      ro.disconnect();
    };
  }, [id, active, player.playing, getTime, reduce]);

  return (
    <>
      <div
        ref={glow}
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          opacity: 0,
          boxShadow: `inset 0 0 90px 6px ${id.a}66, inset 0 0 0 1.5px ${id.a}88`,
          transition: "opacity 120ms linear",
          zIndex: 3,
        }}
      />
      {id.react === "crt" ? (
        <div
          ref={rgb}
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            zIndex: 3,
            backgroundImage: "repeating-linear-gradient(to bottom, rgba(0,0,0,0.12) 0 1px, transparent 1px 4px)",
            mixBlendMode: "multiply",
          }}
        />
      ) : null}
      {id.react === "dust" ? (
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            zIndex: 2,
            background: `radial-gradient(120% 70% at 50% 110%, ${id.a}40, transparent 60%)`,
            mixBlendMode: "screen",
          }}
        />
      ) : null}
      <canvas ref={canvas} aria-hidden style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 3 }} />
    </>
  );
}
