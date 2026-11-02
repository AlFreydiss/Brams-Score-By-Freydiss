// Lecteur YouTube caché : les OST complètes passent par l'iframe officielle,
// pas par l'extrait Apple Music de 30 secondes.

type Handlers = {
  onPlaying: () => void;
  onPaused: () => void;
  onEnded: () => void;
  onError: () => void;
};

type Cue = { id: string; start?: number; end?: number; volume: number };

declare global {
  interface Window {
    YT?: {
      Player: new (el: HTMLElement, opts: Record<string, unknown>) => YtPlayer;
      PlayerState: { PLAYING: number; PAUSED: number; ENDED: number; CUED: number };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

type YtPlayer = {
  loadVideoById: (opts: { videoId: string; startSeconds?: number; endSeconds?: number }) => void;
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  setVolume: (v: number) => void;
  mute: () => void;
  unMute: () => void;
  stopVideo: () => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  destroy: () => void;
};

let api: Promise<void> | null = null;
let player: YtPlayer | null = null;
let ready: Promise<void> | null = null;
let cue: Cue | null = null;
let handlers: Handlers | null = null;
let poll: number | null = null;
// Chaque lecture a un jeton. Un évènement d'un chargement précédent est ignoré.
let token = 0;
let loadedId: string | null = null;
let alive = false;

function loadApi() {
  if (window.YT?.Player) return Promise.resolve();
  if (api) return api;
  api = new Promise((resolve) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve();
    };
    const s = document.createElement("script");
    s.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(s);
  });
  return api;
}

function host() {
  let el = document.getElementById("brams-yt-deck");
  if (!el) {
    el = document.createElement("div");
    el.id = "brams-yt-deck";
    el.setAttribute("aria-hidden", "true");
    // Trop petit ou opacity:0, YouTube refuse de jouer. Le cadre reste hors écran, à taille réelle.
    el.style.cssText = "position:fixed;left:-320px;top:0;width:240px;height:135px;opacity:1;pointer-events:none;overflow:hidden";
    document.body.appendChild(el);
  }
  return el;
}

function ensure() {
  if (ready) return ready;
  ready = loadApi().then(
    () =>
      new Promise<void>((resolve) => {
        player = new window.YT!.Player(host(), {
          width: 240,
          height: 135,
          playerVars: {
            autoplay: 1,
            controls: 0,
            disablekb: 1,
            fs: 0,
            modestbranding: 1,
            playsinline: 1,
            rel: 0,
          },
          events: {
            onReady: () => resolve(),
            onStateChange: (e: { data: number }) => {
              const st = window.YT!.PlayerState;
              if (e.data === st.PLAYING) {
                alive = true;
                handlers?.onPlaying();
              } else if (e.data === st.PAUSED) {
                alive = false;
                handlers?.onPaused();
              } else if (e.data === st.ENDED) {
                alive = false;
                handlers?.onEnded();
              }
            },
            // Erreur d'un chargement déjà remplacé : on ne lance pas le secours par-dessus.
            onError: () => {
              if (!cue || loadedId !== cue.id) return;
              alive = false;
              handlers?.onError();
            },
          },
        });
      }),
  );
  return ready;
}

function watchEnd() {
  if (poll) window.clearInterval(poll);
  poll = window.setInterval(() => {
    if (!player || !cue?.end) return;
    const t = player.getCurrentTime();
    if (Number.isFinite(t) && t >= cue.end - 0.25) {
      player.pauseVideo();
      handlers?.onEnded();
    }
  }, 400);
}

function applyLevel(volume: number) {
  if (!player) return;
  if (volume <= 0) player.mute();
  else {
    player.unMute();
    player.setVolume(Math.round(Math.max(0, Math.min(100, volume))));
  }
}

export function youtubeAlive() {
  return alive;
}

export function playYoutube(next: Cue, nextHandlers: Handlers) {
  const my = ++token;
  alive = false;
  loadedId = null;
  cue = next;
  handlers = nextHandlers;
  ensure().then(() => {
    if (my !== token || cue?.id !== next.id) return;
    try { player!.stopVideo(); } catch { /* première lecture */ }
    if (my !== token) return;
    const load: { videoId: string; startSeconds?: number; endSeconds?: number } = {
      videoId: next.id,
      startSeconds: next.start || 0,
    };
    if (next.end) load.endSeconds = next.end;
    loadedId = next.id;
    player!.loadVideoById(load);
    if (my !== token) return;
    applyLevel(next.volume);
    watchEnd();
  }).catch(() => {
    if (my === token) handlers?.onError();
  });
}

export function pauseYoutube() {
  alive = false;
  try { player?.pauseVideo(); } catch { /* pas encore prêt */ }
}

export function stopYoutube() {
  token++;
  alive = false;
  loadedId = null;
  if (poll) window.clearInterval(poll);
  poll = null;
  cue = null;
  handlers = null;
  try {
    player?.mute();
    player?.stopVideo();
  } catch {
    try { player?.pauseVideo(); } catch { /* pas encore prêt */ }
  }
}

export function seekYoutube(seconds: number) {
  const at = (cue?.start || 0) + Math.max(0, seconds);
  const cap = cue?.end ? Math.min(at, cue.end) : at;
  try { player?.seekTo(cap, true); } catch { /* ignore */ }
}

export function setYoutubeVolume(volume: number) {
  if (cue) cue.volume = volume;
  applyLevel(volume);
}

export function youtubeTime(): { now: number; total: number } | null {
  if (!player || !cue) return null;
  const start = cue.start || 0;
  const nowAbs = player.getCurrentTime() || 0;
  const dur = player.getDuration() || 0;
  const end = cue.end && cue.end > start ? cue.end : dur;
  const total = Math.max(0, end - start);
  return { now: Math.max(0, nowAbs - start), total: Number.isFinite(total) ? total : 0 };
}
