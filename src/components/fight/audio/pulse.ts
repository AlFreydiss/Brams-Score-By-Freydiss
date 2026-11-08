import { getAnalyser } from "../../tournois/use-player";

// Bus audio des écrans de combat : une seule boucle requestAnimationFrame lit
// l'analyseur du lecteur et publie une image de mesures aux abonnés. Aucun
// state React : les abonnés écrivent directement dans le DOM (refs, variables CSS).

export type Pulse = {
  /** false : pas d'analyseur (piste YouTube, ou rien en lecture). */
  live: boolean;
  /** Amplitude globale lissée, 0 → 1. */
  level: number;
  /** Énergie des basses rapportée à leur moyenne récente, 0 → 1. */
  bass: number;
  /** Vrai sur l'image où un coup de grosse caisse est détecté. */
  kick: boolean;
  /** Vrai sur un pic d'amplitude (pour faire jaillir des particules). */
  peak: boolean;
  /** Spectre en 48 bandes logarithmiques, normalisées par bande, 0 → 1. */
  bands: Float32Array;
  /** Forme d'onde (domaine temporel), -1 → 1, 256 points. */
  wave: Float32Array;
  /** Horloge de la boucle (ms). */
  t: number;
};

const BANDS = 48;
const frame: Pulse = { live: false, level: 0, bass: 0, kick: false, peak: false, bands: new Float32Array(BANDS), wave: new Float32Array(256), t: 0 };
const subs = new Set<(p: Pulse) => void>();
let raf = 0;
let freq = new Uint8Array(0);
let time = new Uint8Array(0);
const floors = new Float32Array(BANDS).fill(0.4);
const peaks = new Float32Array(BANDS).fill(0.6);
let bassAvg = 0.3;
let bassPeak = 0.4;
let levelAvg = 0.2;
let lastKick = 0;
let lastPeak = 0;

function tick(now: number) {
  raf = requestAnimationFrame(tick);
  frame.t = now;
  frame.kick = false;
  frame.peak = false;
  const a = getAnalyser();
  let sum = 0;
  if (a) {
    if (freq.length !== a.frequencyBinCount) {
      freq = new Uint8Array(a.frequencyBinCount);
      time = new Uint8Array(a.fftSize);
    }
    a.getByteFrequencyData(freq);
    a.getByteTimeDomainData(time);
    const n = freq.length * 0.7;
    for (let i = 0; i < BANDS; i++) {
      const lo = Math.floor(Math.pow(n, i / BANDS));
      const hi = Math.max(lo + 1, Math.floor(Math.pow(n, (i + 1) / BANDS)));
      let m = 0;
      for (let k = lo; k < hi && k < freq.length; k++) m = Math.max(m, freq[k]);
      const r = m / 255;
      sum += r;
      floors[i] += (r - floors[i]) * 0.01;
      if (r > peaks[i]) peaks[i] = r;
      peaks[i] = Math.max(floors[i] + 0.08, peaks[i] * 0.994);
      const lo2 = Math.max(0.2, floors[i] - 0.12);
      const v = Math.pow(Math.min(1, Math.max(0, (r - lo2) / Math.max(0.08, peaks[i] - lo2))), 1.6);
      frame.bands[i] += (v - frame.bands[i]) * (v > frame.bands[i] ? 0.55 : 0.14);
    }
    const step = time.length / frame.wave.length;
    let rms = 0;
    for (let i = 0; i < frame.wave.length; i++) {
      const v = (time[Math.floor(i * step)] - 128) / 128;
      frame.wave[i] = v;
      rms += v * v;
    }
    rms = Math.sqrt(rms / frame.wave.length);
    frame.live = sum > 0.5;
    // Niveau global : rapporté à sa moyenne lente, pour qu'un morceau doux bouge aussi.
    levelAvg += (rms - levelAvg) * 0.01;
    const lv = Math.min(1, rms / Math.max(0.05, levelAvg * 1.8));
    frame.level += (lv - frame.level) * 0.25;
    let bass = 0;
    for (let k = 1; k < 8 && k < freq.length; k++) bass += freq[k];
    const br = bass / (7 * 255);
    bassAvg += (br - bassAvg) * 0.025;
    if (br > bassPeak) bassPeak = br;
    bassPeak = Math.max(bassAvg + 0.04, bassPeak * 0.995);
    const b = Math.pow(Math.min(1, Math.max(0, (br - bassAvg) / Math.max(0.04, bassPeak - bassAvg))), 1.3);
    frame.bass += (b - frame.bass) * (b > frame.bass ? 0.4 : 0.1);
    if (frame.live && b > 0.72 && now - lastKick > 220) {
      frame.kick = true;
      lastKick = now;
    }
    if (frame.live && lv > 0.92 && now - lastPeak > 380) {
      frame.peak = true;
      lastPeak = now;
    }
  } else {
    frame.live = false;
    frame.level *= 0.9;
    frame.bass *= 0.9;
    for (let i = 0; i < BANDS; i++) frame.bands[i] *= 0.88;
    frame.wave.fill(0);
  }
  subs.forEach((fn) => fn(frame));
}

/** S'abonne à la boucle ; la boucle ne tourne que tant qu'il y a des abonnés. */
export function onPulse(fn: (p: Pulse) => void) {
  subs.add(fn);
  if (!raf) raf = requestAnimationFrame(tick);
  return () => {
    subs.delete(fn);
    if (!subs.size && raf) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
  };
}
