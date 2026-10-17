import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { Participant } from "@/lib/tournois/types";

// Un seul son à la fois, d'où qu'il vienne :
// - « yt » : lecteur YouTube présent dans la page mais jamais montré (OST) ;
// - « video » : la vidéo R2 affichée dans la moitié, qu'on démute pour l'écouter.
// Rien ne démarre sans un geste de l'utilisateur (le navigateur l'exige).

type YTPlayer = {
  loadVideoById(o: { videoId: string; startSeconds?: number; endSeconds?: number }): void;
  playVideo(): void;
  pauseVideo(): void;
  seekTo(s: number, allowSeekAhead: boolean): void;
  setVolume(v: number): void;
  getCurrentTime(): number;
  getDuration(): number;
  destroy(): void;
};
type YTNamespace = { Player: new (el: HTMLElement, o: object) => YTPlayer };
declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let ytPromise: Promise<YTNamespace> | null = null;
function loadYT(): Promise<YTNamespace> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (ytPromise) return ytPromise;
  ytPromise = new Promise((resolve) => {
    const done = () => {
      clearInterval(poll);
      resolve(window.YT as YTNamespace);
    };
    const poll = setInterval(() => window.YT?.Player && done(), 200);
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      done();
    };
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(tag);
  });
  return ytPromise;
}

const VOL_KEY = "tournoi_volume";

// Le volume d'une vidéo se règle sur l'élément lui-même.
function setElementVolume(el: HTMLVideoElement | null | undefined | false, v: number) {
  if (el) el.volume = v;
}
// Volume mémorisé pour tout le site. Lu via useSyncExternalStore : 70 côté
// serveur, la vraie valeur dans le navigateur, sans écart d'hydratation.
let volCache: number | null = null;
const volListeners = new Set<() => void>();
function readVolume() {
  if (volCache != null) return volCache;
  try {
    const v = Number(localStorage.getItem(VOL_KEY));
    volCache = Number.isFinite(v) && v >= 0 && localStorage.getItem(VOL_KEY) != null ? v : 70;
  } catch {
    volCache = 70;
  }
  return volCache;
}
function writeVolume(v: number) {
  volCache = v;
  try {
    localStorage.setItem(VOL_KEY, String(v));
  } catch {}
  volListeners.forEach((l) => l());
}
function subscribeVolume(cb: () => void) {
  volListeners.add(cb);
  return () => {
    volListeners.delete(cb);
  };
}

export type PlayerState = {
  id: string | null;
  playing: boolean;
  loading: boolean;
  ended: boolean;
};

const IDLE: PlayerState = { id: null, playing: false, loading: false, ended: false };

export function usePlayer({ playFrom = 0 }: { playFrom?: number } = {}) {
  const [state, setState] = useState<PlayerState>(IDLE);
  const [failed, setFailed] = useState<Set<string>>(() => new Set());
  const volume = useSyncExternalStore(subscribeVolume, readVolume, () => 70);
  const [muted, setMutedState] = useState(false);
  const mute = useRef(false);
  const current = useRef<Participant | null>(null);
  const videos = useRef(new Map<string, HTMLVideoElement>());
  const started = useRef(new WeakSet<HTMLVideoElement>());
  const yt = useRef<YTPlayer | null>(null);
  const ytReady = useRef(false);
  const ytPending = useRef<Participant | null>(null);

  const level = () => (mute.current ? 0 : readVolume());

  useEffect(
    () => () => {
      try {
        yt.current?.destroy();
      } catch {}
      yt.current = null;
      ytReady.current = false;
    },
    [],
  );

  const set = useCallback((id: string, patch: Partial<PlayerState>) => {
    setState((s) => ({ ...(s.id === id ? s : { ...IDLE, id }), ...patch }));
  }, []);

  const fail = useCallback(
    (id: string) => {
      setFailed((prev) => new Set(prev).add(id));
      set(id, { playing: false, loading: false });
    },
    [set],
  );

  const loadYt = useCallback((p: Participant) => {
    if (p.sound?.k !== "yt") return;
    yt.current?.loadVideoById({
      videoId: p.sound.id,
      startSeconds: p.sound.start || 0,
      ...(p.sound.end ? { endSeconds: p.sound.end } : {}),
    });
  }, []);

  const ensureYt = useCallback(async () => {
    if (yt.current) return;
    const YT = await loadYT();
    if (yt.current) return;
    let host = document.getElementById("t-yt-host");
    if (!host) {
      host = document.createElement("div");
      host.id = "t-yt-host";
      host.setAttribute("aria-hidden", "true");
      host.style.cssText = "position:fixed;right:0;bottom:0;width:200px;height:200px;opacity:0;pointer-events:none;z-index:-1";
      document.body.appendChild(host);
    }
    host.replaceChildren(document.createElement("div"));
    yt.current = new YT.Player(host.firstChild as HTMLElement, {
      width: 200,
      height: 200,
      playerVars: { autoplay: 1, controls: 0, rel: 0, playsinline: 1, disablekb: 1, iv_load_policy: 3, origin: window.location.origin },
      events: {
        onReady: (e: { target: YTPlayer }) => {
          ytReady.current = true;
          e.target.setVolume(level());
          if (ytPending.current) {
            loadYt(ytPending.current);
            ytPending.current = null;
          }
        },
        onStateChange: (e: { data: number }) => {
          const p = current.current;
          if (!p || p.sound?.k !== "yt") return;
          if (e.data === 1) set(p.id, { playing: true, loading: false, ended: false });
          else if (e.data === 2) set(p.id, { playing: false, loading: false });
          else if (e.data === 0) set(p.id, { playing: false, loading: false, ended: true });
          else if (e.data === 3) set(p.id, { loading: true });
        },
        onError: () => current.current && fail(current.current.id),
      },
    });
  }, [loadYt, fail, set]);

  // Les moitiés vidéo s'enregistrent ici ; leurs évènements pilotent l'état.
  const register = useCallback(
    (p: Participant, el: HTMLVideoElement | null) => {
      if (!el) return;
      if (videos.current.get(p.id) === el) return;
      videos.current.set(p.id, el);
      const mine = () => current.current?.id === p.id && videos.current.get(p.id) === el;
      el.addEventListener("playing", () => mine() && set(p.id, { playing: true, loading: false, ended: false }));
      el.addEventListener("pause", () => mine() && set(p.id, { playing: false, loading: false }));
      el.addEventListener("ended", () => mine() && set(p.id, { playing: false, loading: false, ended: true }));
      el.addEventListener("waiting", () => mine() && set(p.id, { loading: true }));
      el.addEventListener("error", () => fail(p.id));
      el.addEventListener("timeupdate", () => {
        const end = p.sound?.k === "video" ? p.sound.end : undefined;
        if (end && el.currentTime >= end && !el.paused) {
          el.pause();
          if (mine()) set(p.id, { playing: false, ended: true });
        }
      });
    },
    [fail, set],
  );

  const silence = useCallback(() => {
    const p = current.current;
    if (!p) return;
    if (p.sound?.k === "yt") {
      try {
        yt.current?.pauseVideo();
      } catch {}
    } else {
      const el = videos.current.get(p.id);
      if (el) {
        el.pause();
        el.muted = true;
      }
    }
  }, []);

  const play = useCallback(
    async (p: Participant | null | undefined) => {
      if (!p?.sound) return;
      const same = current.current?.id === p.id;
      if (!same) silence();
      current.current = p;
      if (p.sound.k === "video") {
        const el = videos.current.get(p.id);
        if (!el) return;
        if (!started.current.has(el) || el.ended) {
          started.current.add(el);
          el.currentTime = playFrom;
        }
        el.muted = false;
        el.volume = level() / 100;
        set(p.id, { loading: true, ended: false });
        el.play().catch(() => set(p.id, { playing: false, loading: false }));
        return;
      }
      if (same && ytReady.current) {
        if (state.ended) yt.current?.seekTo(p.sound.start || 0, true);
        yt.current?.playVideo();
        return;
      }
      set(p.id, { loading: true, ended: false, playing: false });
      await ensureYt();
      if (ytReady.current) loadYt(p);
      else ytPending.current = p;
    },
    // level lit des refs : pas de dépendance à ajouter.
    [ensureYt, loadYt, silence, playFrom, set, state.ended],
  );

  const pause = useCallback(() => silence(), [silence]);

  const toggle = useCallback(
    (p: Participant) => {
      if (state.id === p.id && (state.playing || state.loading)) pause();
      else play(p);
    },
    [state, play, pause],
  );

  const stop = useCallback(() => {
    silence();
    current.current = null;
    setState(IDLE);
  }, [silence]);

  const applyLevel = useCallback(() => {
    const v = level();
    try {
      yt.current?.setVolume(v);
    } catch {}
    const p = current.current;
    const el = p && videos.current.get(p.id);
    setElementVolume(el, v / 100);
  }, []);

  const setVolume = useCallback((v: number) => {
    writeVolume(v);
    if (v > 0 && mute.current) {
      mute.current = false;
      setMutedState(false);
    }
    applyLevel();
  }, [applyLevel]);

  const toggleMute = useCallback(() => {
    mute.current = !mute.current;
    setMutedState(mute.current);
    applyLevel();
  }, [applyLevel]);

  // Position dans la piste active, en secondes depuis son début.
  const getTime = useCallback((): { now: number; total: number } | null => {
    const p = current.current;
    if (!p?.sound) return null;
    if (p.sound.k === "video") {
      const el = videos.current.get(p.id);
      if (!el) return null;
      const total = p.sound.end || el.duration || 0;
      return { now: el.currentTime, total: Number.isFinite(total) ? total : 0 };
    }
    const y = yt.current;
    if (!y?.getCurrentTime) return null;
    const start = p.sound.start || 0;
    const end = p.sound.end || y.getDuration() || 0;
    return { now: Math.max(0, y.getCurrentTime() - start), total: Math.max(0, end - start) };
  }, []);

  const seek = useCallback((seconds: number) => {
    const p = current.current;
    if (!p?.sound) return;
    if (p.sound.k === "video") {
      const el = videos.current.get(p.id);
      if (el) el.currentTime = seconds;
    } else {
      yt.current?.seekTo((p.sound.start || 0) + seconds, true);
    }
  }, []);

  return { ...state, failed, volume, muted, setVolume, toggleMute, play, pause, toggle, stop, getTime, seek, register };
}

export type Player = ReturnType<typeof usePlayer>;
