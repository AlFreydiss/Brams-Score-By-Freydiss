// Bruitages synthétisés (Web Audio) : aucun fichier, aucun droit. Ils suivent
// le volume du lecteur des tournois (clé localStorage « tournoi_volume ») et
// se taisent s'il est coupé.
//
// Couleur « féerique » : célesta (partiels de cloche inharmoniques), harpe
// pincée et poussière qui scintille, le tout dans une réverbe de salle générée.
// Pas de basse « boum » ni de souffle de bruit blanc : des notes, accordées
// sur une gamme pentatonique pour que tout sonne juste ensemble.

let ctx: AudioContext | null = null;
let bus: { input: GainNode; wet: ConvolverNode } | null = null;

function context() {
  if (typeof window === "undefined") return null;
  ctx ??= new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}

function gainLevel() {
  try {
    const v = Number(localStorage.getItem("tournoi_volume") ?? 70);
    return Number.isFinite(v) ? Math.max(0, Math.min(1, v / 100)) * 0.5 : 0.35;
  } catch {
    return 0.35;
  }
}

// Réverbe : réponse impulsionnelle stéréo générée (bruit qui décroît), 2,8 s.
function out(c: AudioContext) {
  if (bus) return bus.input;
  const len = Math.floor(c.sampleRate * 2.8);
  const ir = c.createBuffer(2, len, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2);
  }
  const wet = c.createConvolver();
  wet.buffer = ir;
  const wetGain = c.createGain();
  wetGain.gain.value = 0.55;
  const input = c.createGain();
  // Un peu d'air en haut, rien de grave sous 180 Hz.
  const hp = c.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 180;
  input.connect(hp);
  hp.connect(c.destination);
  hp.connect(wet).connect(wetGain).connect(c.destination);
  bus = { input, wet };
  return input;
}

// Gamme : pentatonique majeure (do ré mi sol la), sur plusieurs octaves.
const PENTA = [0, 2, 4, 7, 9];
const note = (root: number, step: number) => root * Math.pow(2, (PENTA[((step % 5) + 5) % 5] + 12 * Math.floor(step / 5)) / 12);

/** Une note de célesta : fondamentale + partiels de cloche, attaque nette, longue traîne. */
function celesta(c: AudioContext, dest: AudioNode, f: number, at: number, vol: number, len = 1.6) {
  const parts: [number, number][] = [
    [1, 1],
    [2.76, 0.32],
    [5.4, 0.12],
    [8.93, 0.05],
  ];
  for (const [ratio, amp] of parts) {
    const o = c.createOscillator();
    o.type = "sine";
    o.frequency.value = f * ratio;
    const g = c.createGain();
    const l = len / (1 + (ratio - 1) * 0.35);
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(vol * amp, at + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, at + l);
    o.connect(g).connect(dest);
    o.start(at);
    o.stop(at + l + 0.05);
  }
}

/** Harpe pincée (Karplus-Strong simplifié par un filtre qui se referme). */
function harp(c: AudioContext, dest: AudioNode, f: number, at: number, vol: number) {
  const o = c.createOscillator();
  o.type = "triangle";
  o.frequency.value = f;
  const lp = c.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.setValueAtTime(f * 6, at);
  lp.frequency.exponentialRampToValueAtTime(f * 1.2, at + 0.9);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(vol, at + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, at + 1.4);
  o.connect(lp).connect(g).connect(dest);
  o.start(at);
  o.stop(at + 1.5);
}

/** Poussière qui scintille : des grains très aigus et brefs, en pluie. */
function sparkle(c: AudioContext, dest: AudioNode, at: number, count: number, vol: number, spread = 0.6, root = 1760) {
  for (let i = 0; i < count; i++) {
    const t = at + Math.random() * spread;
    const f = note(root, Math.floor(Math.random() * 10));
    const o = c.createOscillator();
    o.type = "sine";
    o.frequency.value = f;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol * (0.4 + Math.random() * 0.6), t + 0.003);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18 + Math.random() * 0.25);
    const pan = c.createStereoPanner?.();
    if (pan) {
      pan.pan.value = Math.random() * 1.6 - 0.8;
      o.connect(g).connect(pan).connect(dest);
    } else o.connect(g).connect(dest);
    o.start(t);
    o.stop(t + 0.5);
  }
}

/** Entrée d'un duel, glissement : une montée de harpe très douce (remplace le souffle). */
export function whoosh(dur = 0.45) {
  const c = context();
  const g0 = gainLevel();
  if (!c || !g0) return;
  const dest = out(c);
  const t = c.currentTime;
  const steps = 6;
  for (let i = 0; i < steps; i++) harp(c, dest, note(392, i + 2), t + (i * dur) / steps, g0 * 0.12);
  sparkle(c, dest, t + dur * 0.6, 4, g0 * 0.05, 0.3);
}

/** Vote : un accord de célesta qui s'ouvre vers le haut, puis de la poussière d'or. */
export function impact(heavy = 1) {
  const c = context();
  const g0 = gainLevel();
  if (!c || !g0) return;
  const dest = out(c);
  const t = c.currentTime;
  const root = heavy > 1 ? 392 : 523.25;
  // Arpège rapide (4 notes) qui monte, la dernière tenue.
  [0, 2, 4, 7].forEach((s, i) => celesta(c, dest, note(root, s), t + i * 0.055, g0 * (i === 3 ? 0.3 : 0.22), i === 3 ? 2.4 : 1.4));
  harp(c, dest, note(root / 2, 0), t, g0 * 0.18);
  sparkle(c, dest, t + 0.18, 14, g0 * 0.06, 0.9, 2093);
}

/** Le perdant s'efface : une pluie de grains qui descend et se perd. */
export function shatter() {
  const c = context();
  const g0 = gainLevel();
  if (!c || !g0) return;
  const dest = out(c);
  const t = c.currentTime;
  for (let i = 0; i < 9; i++) celesta(c, dest, note(1046.5, 9 - i), t + i * 0.045 + Math.random() * 0.015, g0 * 0.07, 0.7);
}

// ── Voix par univers (duel des OST de jeux) ─────────────────────────────

export type Voice = "celesta" | "bell" | "chip" | "synth" | "box" | "harp";

function osc(c: AudioContext, dest: AudioNode, type: OscillatorType, f: number, at: number, vol: number, len: number, detune = 0) {
  const o = c.createOscillator();
  o.type = type;
  o.frequency.value = f;
  o.detune.value = detune;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(vol, at + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, at + len);
  o.connect(g).connect(dest);
  o.start(at);
  o.stop(at + len + 0.05);
}

// Mineur pentatonique (boîte à musique inquiétante).
const MINOR = [0, 3, 5, 7, 10];
const minor = (root: number, step: number) => root * Math.pow(2, (MINOR[((step % 5) + 5) % 5] + 12 * Math.floor(step / 5)) / 12);

/** Vote dans la couleur du jeu gagnant. */
export function voteVoice(voice: Voice, root: number) {
  const c = context();
  const g0 = gainLevel();
  if (!c || !g0) return;
  const dest = out(c);
  const t = c.currentTime;
  switch (voice) {
    case "chip":
      // Arpège 8 bits rapide + « pièce » d'une octave au-dessus.
      [0, 2, 4, 5, 7].forEach((s, i) => osc(c, dest, "square", note(root, s), t + i * 0.045, g0 * 0.07, 0.12));
      osc(c, dest, "square", note(root, 10), t + 0.24, g0 * 0.08, 0.35);
      osc(c, dest, "triangle", root / 2, t, g0 * 0.12, 0.3);
      break;
    case "synth":
      // Accord de synthé (dents de scie désaccordées) qui s'ouvre dans un filtre.
      for (const [s, d] of [[0, -7], [0, 7], [3, 0], [5, 4]] as [number, number][]) {
        const o = c.createOscillator();
        o.type = "sawtooth";
        o.frequency.value = note(root, s);
        o.detune.value = d;
        const lp = c.createBiquadFilter();
        lp.type = "lowpass";
        lp.frequency.setValueAtTime(300, t);
        lp.frequency.exponentialRampToValueAtTime(4200, t + 0.25);
        lp.frequency.exponentialRampToValueAtTime(600, t + 1.4);
        const g = c.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(g0 * 0.05, t + 0.03);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);
        o.connect(lp).connect(g).connect(dest);
        o.start(t);
        o.stop(t + 1.7);
      }
      sparkle(c, dest, t + 0.1, 6, g0 * 0.04, 0.5, root * 4);
      break;
    case "bell":
      // Cloches graves, longues, une quinte au-dessus.
      celesta(c, dest, root / 2, t, g0 * 0.3, 3.6);
      celesta(c, dest, note(root / 2, 3), t + 0.09, g0 * 0.2, 3);
      celesta(c, dest, note(root, 2), t + 0.2, g0 * 0.12, 2.4);
      sparkle(c, dest, t + 0.3, 6, g0 * 0.03, 1.2, root * 2);
      break;
    case "box":
      // Boîte à musique en mineur, un peu lente et désaccordée.
      [0, 2, 4, 3].forEach((s, i) => osc(c, dest, "sine", minor(root * 2, s), t + i * 0.13, g0 * 0.16, 1.4, (Math.random() - 0.5) * 18));
      break;
    case "harp":
      // Glissando de harpe qui monte, puis la note du dessus tenue.
      for (let i = 0; i < 9; i++) harp(c, dest, note(root / 2, i), t + i * 0.035, g0 * 0.16);
      celesta(c, dest, note(root, 4), t + 0.32, g0 * 0.18, 2.2);
      break;
    default:
      impact(1);
  }
}

/** Le perdant s'efface, dans la couleur de son jeu. */
export function fadeVoice(voice: Voice, root: number) {
  const c = context();
  const g0 = gainLevel();
  if (!c || !g0) return;
  const dest = out(c);
  const t = c.currentTime;
  if (voice === "chip") {
    // Descente « game over » en carrés.
    [7, 5, 4, 2, 0].forEach((s, i) => osc(c, dest, "square", note(root, s), t + i * 0.06, g0 * 0.05, 0.1));
    return;
  }
  if (voice === "synth") {
    const o = c.createOscillator();
    o.type = "sawtooth";
    o.frequency.setValueAtTime(note(root, 5), t);
    o.frequency.exponentialRampToValueAtTime(root / 4, t + 0.6);
    const lp = c.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.setValueAtTime(2200, t);
    lp.frequency.exponentialRampToValueAtTime(200, t + 0.6);
    const g = c.createGain();
    g.gain.setValueAtTime(g0 * 0.05, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.65);
    o.connect(lp).connect(g).connect(dest);
    o.start(t);
    o.stop(t + 0.7);
    return;
  }
  if (voice === "box") {
    [4, 3, 1, 0].forEach((s, i) => osc(c, dest, "sine", minor(root * 2, s), t + i * 0.1, g0 * 0.07, 0.9, -20 * i));
    return;
  }
  shatter();
}
