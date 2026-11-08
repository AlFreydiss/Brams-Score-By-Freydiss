import { useEffect, useRef } from "react";
import { useReducedMotion } from "framer-motion";
import type { Participant } from "@/lib/tournois/types";
import { getAnalyser, type Player } from "../use-player";
import { Visual } from "../visual";

/**
 * Visuel d'une carte de duel. L'image (ou la vidéo de l'opening / ending)
 * remplit le cadre ; pendant l'écoute elle « respire » : son échelle suit
 * l'énergie des basses que pousse <Spectrum> dans --energy sur la carte.
 */
export function NoirArt({ p, player, ratio, posterAt, sizes }: { p: Participant; player?: Player; ratio: number; posterAt?: number; sizes?: string }) {
  return (
    <div className="nx-art" style={{ aspectRatio: String(ratio) }}>
      <div className="nx-art-in">
        <Visual p={p} player={player} posterAt={posterAt} sizes={sizes} />
      </div>
    </div>
  );
}

/**
 * Spectre branché sur le vrai signal (analyseur Web Audio du lecteur) : barres
 * fines, blanches, symétriques autour d'une ligne. Il publie aussi l'énergie
 * des basses (lissée) dans --energy sur la carte parente.
 *
 * Une piste YouTube ne passe pas par l'analyseur (iframe d'un autre domaine,
 * son illisible) : on n'invente rien, la ligne reste calme et seule la
 * progression avance.
 */
export function Spectrum({ active, player, bars = 56 }: { active: boolean; player: Player; bars?: number }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const reduce = useReducedMotion();
  const getTime = player.getTime;
  // La boucle ne tourne que pendant la lecture ; en pause, la dernière image reste.
  const running = active && player.playing;

  useEffect(() => {
    const c = canvas.current;
    if (!c) return;
    // L'énergie est publiée sur la carte (duel en cartes) ou sur la scène immersive.
    const card = c.closest<HTMLElement>(".nx-card, .im-stage");
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

    const ink = getComputedStyle(c).getPropertyValue("--nx-ink").trim() || "#f2f1ee";
    const dim = getComputedStyle(c).getPropertyValue("--nx-rule2").trim() || "rgba(255,255,255,.18)";
    const heights = new Float32Array(bars);
    let freq = new Uint8Array(0);
    let energy = 0;
    const peaks = new Float32Array(bars).fill(0.6);
    const floors = new Float32Array(bars).fill(0.4);
    let bassPeak = 0.4;
    let bassAvg = 0.3;
    const FLOOR = 0.25;
    let raf = 0;

    const draw = () => {
      const W = c.clientWidth;
      const H = c.clientHeight;
      g.clearRect(0, 0, W, H);
      const a = active ? getAnalyser() : null;
      let live = false;
      if (a) {
        if (freq.length !== a.frequencyBinCount) freq = new Uint8Array(a.frequencyBinCount);
        a.getByteFrequencyData(freq);
        // Bandes logarithmiques : les aigus ne mangent pas tout le spectre.
        let sum = 0;
        for (let i = 0; i < bars; i++) {
          const lo = Math.floor(Math.pow(freq.length * 0.7, i / bars));
          const hi = Math.max(lo + 1, Math.floor(Math.pow(freq.length * 0.7, (i + 1) / bars)));
          let m = 0;
          for (let k = lo; k < hi && k < freq.length; k++) m = Math.max(m, freq[k]);
          // Gain automatique : un piano doux bouge autant qu'un morceau saturé.
          // Le plancher et le plafond suivent la piste (le plafond retombe lentement).
          // Chaque bande a son plancher (moyenne lente) et son plafond : les
          // graves, toujours forts, ne restent pas collés en haut.
          const r = m / 255;
          floors[i] += (r - floors[i]) * 0.01;
          if (r > peaks[i]) peaks[i] = r;
          peaks[i] = Math.max(floors[i] + 0.08, peaks[i] * 0.994);
          const lo2 = Math.max(FLOOR, floors[i] - 0.12);
          const v = Math.pow(Math.min(1, Math.max(0, (r - lo2) / Math.max(0.08, peaks[i] - lo2))), 1.6);
          sum += v;
          heights[i] += (v - heights[i]) * (v > heights[i] ? 0.55 : 0.12);
        }
        live = sum > 0.5;
        let bass = 0;
        for (let k = 1; k < 8 && k < freq.length; k++) bass += freq[k];
        // Énergie = écart des basses à leur moyenne récente : l'image respire
        // sur les coups (kick, impacts), pas en continu sur un fond chargé.
        const br = bass / (7 * 255);
        bassAvg += (br - bassAvg) * 0.025;
        if (br > bassPeak) bassPeak = br;
        bassPeak = Math.max(bassAvg + 0.04, bassPeak * 0.995);
        const b = Math.pow(Math.min(1, Math.max(0, (br - bassAvg) / Math.max(0.04, bassPeak - bassAvg))), 1.3);
        energy += (b - energy) * (b > energy ? 0.35 : 0.1);
      } else {
        for (let i = 0; i < bars; i++) heights[i] *= 0.86;
        energy *= 0.9;
      }
      card?.style.setProperty("--energy", reduce ? "0" : energy.toFixed(3));

      // Progression de la piste : la partie écoutée est en blanc.
      const t = active ? getTime() : null;
      const ratio = t && t.total ? Math.min(1, t.now / t.total) : 0;
      const gap = 3;
      const bw = (W - gap * (bars - 1)) / bars;
      const mid = H / 2;
      for (let i = 0; i < bars; i++) {
        const h = Math.max(1.5, heights[i] * (H - 4));
        g.fillStyle = i / bars < ratio || (live && i / bars < ratio + 0.02) ? ink : dim;
        g.fillRect(i * (bw + gap), mid - h / 2, bw, h);
      }
      if (running) raf = requestAnimationFrame(draw);
    };
    draw();
    // Une dernière image pour retomber au calme quand la piste s'arrête.
    const settle = !running ? window.setTimeout(draw, 120) : 0;
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(settle);
      ro.disconnect();
      if (!running) card?.style.setProperty("--energy", "0");
    };
  }, [active, running, bars, getTime, reduce]);

  return <canvas ref={canvas} className="nx-spectrum" aria-hidden />;
}
