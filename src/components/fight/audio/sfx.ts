// Bruitages synthétisés (Web Audio) : aucun fichier, aucun droit. Ils suivent
// le volume du lecteur des tournois (clé localStorage « tournoi_volume ») et
// se taisent s'il est coupé ou si l'utilisateur préfère réduire les animations.

let ctx: AudioContext | null = null;

function context() {
  if (typeof window === "undefined") return null;
  ctx ??= new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}

function gainLevel() {
  try {
    const v = Number(localStorage.getItem("tournoi_volume") ?? 70);
    return Number.isFinite(v) ? Math.max(0, Math.min(1, v / 100)) * 0.55 : 0.4;
  } catch {
    return 0.4;
  }
}

function noise(c: AudioContext, seconds: number) {
  const buf = c.createBuffer(1, Math.ceil(c.sampleRate * seconds), c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buf;
  return src;
}

/** Souffle qui balaie (entrée des panneaux, transitions). */
export function whoosh(dur = 0.45) {
  const c = context();
  const g0 = gainLevel();
  if (!c || !g0) return;
  const t = c.currentTime;
  const src = noise(c, dur);
  const bp = c.createBiquadFilter();
  bp.type = "bandpass";
  bp.Q.value = 1.4;
  bp.frequency.setValueAtTime(320, t);
  bp.frequency.exponentialRampToValueAtTime(3200, t + dur * 0.8);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(g0 * 0.6, t + dur * 0.35);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(bp).connect(g).connect(c.destination);
  src.start(t);
  src.stop(t + dur);
}

/** Impact sourd + éclat (vote, VS qui s'écrase). */
export function impact(heavy = 1) {
  const c = context();
  const g0 = gainLevel();
  if (!c || !g0) return;
  const t = c.currentTime;
  const o = c.createOscillator();
  o.type = "sine";
  o.frequency.setValueAtTime(120 * heavy, t);
  o.frequency.exponentialRampToValueAtTime(38, t + 0.32);
  const og = c.createGain();
  og.gain.setValueAtTime(g0 * 0.95, t);
  og.gain.exponentialRampToValueAtTime(0.0001, t + 0.42);
  o.connect(og).connect(c.destination);
  o.start(t);
  o.stop(t + 0.45);
  const n = noise(c, 0.25);
  const hp = c.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 1800;
  const ng = c.createGain();
  ng.gain.setValueAtTime(g0 * 0.35, t);
  ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
  n.connect(hp).connect(ng).connect(c.destination);
  n.start(t);
  n.stop(t + 0.25);
}

/** Verre qui se brise, en grains (le perdant se fracture). */
export function shatter() {
  const c = context();
  const g0 = gainLevel();
  if (!c || !g0) return;
  const t = c.currentTime;
  for (let i = 0; i < 7; i++) {
    const at = t + i * 0.035 + Math.random() * 0.02;
    const n = noise(c, 0.12);
    const bp = c.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 2400 + Math.random() * 4200;
    bp.Q.value = 8;
    const g = c.createGain();
    g.gain.setValueAtTime(g0 * 0.28, at);
    g.gain.exponentialRampToValueAtTime(0.0001, at + 0.11);
    n.connect(bp).connect(g).connect(c.destination);
    n.start(at);
    n.stop(at + 0.12);
  }
}
