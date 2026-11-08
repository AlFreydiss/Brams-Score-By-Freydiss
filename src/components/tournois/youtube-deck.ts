// Lecteur YouTube caché : les OST complètes passent par l'iframe officielle,
// pas par l'extrait Apple Music de 30 secondes.
//
// Deux cadres hors écran. « a » est le lecteur du site (un son à la fois).
// « b » est la seconde voix du duel OST, pour écouter les deux morceaux ensemble.
// Trop petit ou opacity:0, YouTube refuse de jouer.

type Handlers = {
  onPlaying: () => void;
  onPaused: () => void;
  onEnded: () => void;
  onError: () => void;
};

type Cue = { id: string; start?: number; end?: number; volume: number };

export type YtSlot = "a" | "b";

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
  cueVideoById: (opts: { videoId: string; startSeconds?: number; endSeconds?: number }) => void;
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

type Command = "play" | "pause" | "stop";

function createDeck(domId: string, left: number) {
  let player: YtPlayer | null = null;
  let ready: Promise<void> | null = null;
  let cue: Cue | null = null;
  let handlers: Handlers | null = null;
  let poll: number | null = null;
  let token = 0;
  let loadedId: string | null = null;
  let alive = false;
  // play : on veut du son. pause : tout PLAYING qui suit est recoupé.
  // stop : plus de piste. YouTube relance souvent tout seul après pauseVideo.
  let command: Command = "stop";

  function host() {
    let el = document.getElementById(domId);
    if (!el) {
      el = document.createElement("div");
      el.id = domId;
      el.setAttribute("aria-hidden", "true");
      el.style.cssText = `position:fixed;left:${left}px;top:0;width:240px;height:135px;opacity:1;pointer-events:none;overflow:hidden`;
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
              autoplay: 0,
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
                // 3 = BUFFERING. Hors lecture, on étouffe avant que le son revienne.
                if ((e.data === st.PLAYING || e.data === 3) && command !== "play") {
                  alive = false;
                  try {
                    player?.mute();
                    player?.pauseVideo();
                  } catch {
                    /* pas prêt */
                  }
                  return;
                }
                if (command === "stop") return;
                if (e.data === st.PLAYING) {
                  alive = true;
                  handlers?.onPlaying();
                } else if (e.data === st.PAUSED) {
                  alive = false;
                  if (command === "pause") handlers?.onPaused();
                } else if (e.data === st.ENDED) {
                  alive = false;
                  if (command !== "play") return;
                  command = "pause";
                  handlers?.onEnded();
                }
              },
              onError: () => {
                if (command !== "play" || !cue || loadedId !== cue.id) return;
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
      if (!player || !cue?.end || command !== "play") return;
      const t = player.getCurrentTime();
      if (Number.isFinite(t) && t >= cue.end - 0.25) {
        command = "pause";
        alive = false;
        try {
          player.pauseVideo();
        } catch {
          /* ignore */
        }
        handlers?.onEnded();
      }
    }, 400);
  }

  function kickPause() {
    if (command !== "pause") return;
    try {
      player?.mute();
      player?.pauseVideo();
    } catch {
      /* pas encore prêt */
    }
  }

  function applyLevel(volume: number) {
    if (!player) return;
    if (volume <= 0) player.mute();
    else {
      player.unMute();
      player.setVolume(Math.round(Math.max(0, Math.min(100, volume))));
    }
  }

  function loadOpts(next: Cue) {
    const load: { videoId: string; startSeconds?: number; endSeconds?: number } = {
      videoId: next.id,
      startSeconds: next.start || 0,
    };
    if (next.end) load.endSeconds = next.end;
    return load;
  }

  return {
    alive: () => alive,
    // Prépare l'API et le lecteur caché sans rien jouer.
    warm() {
      void ensure();
    },
    play(next: Cue, nextHandlers: Handlers) {
      const my = ++token;
      command = "play";
      alive = false;
      handlers = nextHandlers;
      if (cue?.id === next.id && loadedId === next.id && player) {
        cue = next;
        try {
          applyLevel(next.volume);
          player.playVideo();
          return;
        } catch {
          /* recharge */
        }
      }
      loadedId = null;
      cue = next;
      ensure()
        .then(() => {
          if (my !== token || command !== "play" || cue?.id !== next.id) return;
          try {
            player!.stopVideo();
          } catch {
            /* première lecture */
          }
          if (my !== token || command !== "play") return;
          loadedId = next.id;
          player!.loadVideoById(loadOpts(next));
          if (my !== token || command !== "play") {
            kickPause();
            return;
          }
          applyLevel(next.volume);
          watchEnd();
        })
        .catch(() => {
          if (my === token && command === "play") handlers?.onError();
        });
    },
    // Charge la vidéo sans la lancer. Ignoré si ce cadre joue déjà.
    cueOnly(next: Cue) {
      if (command === "play") return;
      const my = ++token;
      command = "pause";
      alive = false;
      handlers = null;
      cue = next;
      ensure()
        .then(() => {
          if (my !== token || command === "play" || cue?.id !== next.id) return;
          loadedId = next.id;
          try {
            player!.cueVideoById(loadOpts(next));
          } catch {
            /* pas prêt */
          }
        })
        .catch(() => {});
    },
    pause() {
      command = "pause";
      alive = false;
      kickPause();
      requestAnimationFrame(kickPause);
    },
    stop() {
      token++;
      command = "stop";
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
        try {
          player?.pauseVideo();
        } catch {
          /* pas encore prêt */
        }
      }
    },
    seek(seconds: number) {
      const at = (cue?.start || 0) + Math.max(0, seconds);
      const cap = cue?.end ? Math.min(at, cue.end) : at;
      try {
        player?.seekTo(cap, true);
      } catch {
        /* ignore */
      }
      if (command === "pause") requestAnimationFrame(kickPause);
    },
    setVolume(volume: number) {
      if (cue) cue.volume = volume;
      if (command !== "play") return;
      applyLevel(volume);
    },
    time(): { now: number; total: number } | null {
      // L'iframe existe avant que son API soit prête : pas encore de position à lire.
      if (!player || !cue || typeof player.getCurrentTime !== "function" || typeof player.getDuration !== "function") return null;
      const start = cue.start || 0;
      const nowAbs = player.getCurrentTime() || 0;
      const dur = player.getDuration() || 0;
      const end = cue.end && cue.end > start ? cue.end : dur;
      const total = Math.max(0, end - start);
      return { now: Math.max(0, nowAbs - start), total: Number.isFinite(total) ? total : 0 };
    },
  };
}

const decks = {
  a: createDeck("brams-yt-deck", -320),
  b: createDeck("brams-yt-deck-b", -580),
};

const deck = (slot: YtSlot = "a") => decks[slot];

export function youtubeAlive() {
  return decks.a.alive();
}
export function youtubeAliveSlot(slot: YtSlot) {
  return deck(slot).alive();
}

export function playYoutube(next: Cue, nextHandlers: Handlers) {
  decks.a.play(next, nextHandlers);
}
export function playYoutubeSlot(slot: YtSlot, next: Cue, nextHandlers: Handlers) {
  deck(slot).play(next, nextHandlers);
}

export function cueYoutubeSlot(slot: YtSlot, next: Cue) {
  deck(slot).cueOnly(next);
}

export function pauseYoutube() {
  decks.a.pause();
}
export function pauseYoutubeSlot(slot: YtSlot) {
  deck(slot).pause();
}

export function stopYoutube() {
  decks.a.stop();
}
export function stopYoutubeSlot(slot: YtSlot) {
  deck(slot).stop();
}

export function seekYoutube(seconds: number) {
  decks.a.seek(seconds);
}
export function seekYoutubeSlot(slot: YtSlot, seconds: number) {
  deck(slot).seek(seconds);
}

export function setYoutubeVolume(volume: number) {
  decks.a.setVolume(volume);
}
export function setYoutubeVolumeSlot(slot: YtSlot, volume: number) {
  deck(slot).setVolume(volume);
}

export function youtubeTime(): { now: number; total: number } | null {
  return decks.a.time();
}
export function youtubeTimeSlot(slot: YtSlot) {
  return deck(slot).time();
}

/** Charge l'API YouTube et prépare le lecteur principal à l'avance : le premier son part sans attente. */
export function warmYoutube() {
  decks.a.warm();
}
