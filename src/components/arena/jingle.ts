// Entrée dans le tournoi des OST de jeux vidéo : « Lumière » de Clair Obscur
// (extrait officiel Apple Music de 30 s) monte pendant l'ouverture et
// accompagne l'arrivée. Elle s'efface dès qu'un autre son démarre sur la
// page, au premier clic une fois arrivé, ou à la fin de l'extrait.

const LUMIERE = "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/4d/38/0e/4d380ef6-1b13-d931-fc7f-3f260b6b7e79/mzaf_8647643450660213230.plus.aac.p.m4a";
const VOLUME = 0.55;

let current: { stop: () => void } | null = null;

function fade(el: HTMLAudioElement, to: number, ms: number, done?: () => void) {
  const from = el.volume;
  const t0 = performance.now();
  const step = (now: number) => {
    const k = Math.min(1, (now - t0) / ms);
    el.volume = Math.max(0, Math.min(1, from + (to - from) * k));
    if (k < 1) requestAnimationFrame(step);
    else done?.();
  };
  requestAnimationFrame(step);
}

/** À appeler dans le clic lui-même (le navigateur n'autorise le son qu'à ce moment-là). */
export function playLumiere() {
  current?.stop();
  const el = new Audio(LUMIERE);
  el.volume = 0;
  let over = false;

  const stop = () => {
    if (over) return;
    over = true;
    document.removeEventListener("play", onOther, true);
    document.removeEventListener("volumechange", onOther, true);
    window.removeEventListener("pointerdown", onTouch, true);
    clearTimeout(arm);
    if (current?.stop === stop) current = null;
    fade(el, 0, 900, () => el.pause());
  };
  // Un autre son de la page prend le relais.
  const onOther = (e: Event) => {
    const m = e.target as HTMLMediaElement;
    if (m !== el && m instanceof HTMLMediaElement && !m.paused && !m.muted && m.volume > 0) stop();
  };
  // Une fois arrivé sur le tournoi, le premier clic rend la main (écoute d'une piste, vote…).
  const onTouch = () => stop();
  const arm = window.setTimeout(() => window.addEventListener("pointerdown", onTouch, true), 2200);

  document.addEventListener("play", onOther, true);
  document.addEventListener("volumechange", onOther, true);
  el.addEventListener("ended", stop);
  el.addEventListener("error", stop);
  el.play().then(
    () => fade(el, VOLUME, 1400),
    () => stop(),
  );
  current = { stop };
}
