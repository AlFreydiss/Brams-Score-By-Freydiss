import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { Participant } from "@/lib/tournois/types";
import { pauseYoutube, playYoutube, seekYoutube, setYoutubeVolume, stopYoutube, youtubeAlive, youtubeTime } from "./youtube-deck";

// Un seul son à la fois :
// - « youtube » : la piste complète, iframe cachée ;
// - « video » : la vidéo R2 affichée dans la moitié ;
// - « audio » : un extrait lu par un <audio> partagé.
// Vidéo et audio passent par un analyseur. La pause est une intention :
// un chargement encore en vol n'a pas le droit de relancer le son.

const VOL_KEY = "tournoi_volume";

// Volume mémorisé pour tout le site, lu via useSyncExternalStore : 70 côté
// serveur, la vraie valeur dans le navigateur.
let volCache: number | null = null;
const volListeners = new Set<() => void>();
function readVolume() {
  if (volCache != null) return volCache;
  try {
    const raw = localStorage.getItem(VOL_KEY);
    const v = Number(raw);
    volCache = raw != null && Number.isFinite(v) && v >= 0 ? v : 70;
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

// Les propriétés d'un élément média se règlent sur l'élément lui-même.
function setMedia(el: HTMLMediaElement | null | undefined, patch: { volume?: number; muted?: boolean }) {
  if (!el) return;
  if (patch.volume != null) el.volume = patch.volume;
  if (patch.muted != null) el.muted = patch.muted;
}

// Fondus de volume : chaque lecture démarre en douceur et chaque pause
// s'éteint en ~0,16 s, sans clic. Un nouveau fondu annule le précédent.
const fades = new WeakMap<HTMLMediaElement, number>();
function fade(el: HTMLMediaElement, to: number, ms: number, done?: () => void) {
  const prev = fades.get(el);
  if (prev) cancelAnimationFrame(prev);
  fades.delete(el);
  const from = el.volume;
  if (ms <= 0 || Math.abs(from - to) < 0.01) {
    el.volume = to;
    done?.();
    return;
  }
  const t0 = performance.now();
  const step = (now: number) => {
    const k = Math.min(1, (now - t0) / ms);
    el.volume = Math.max(0, Math.min(1, from + (to - from) * k));
    if (k < 1) fades.set(el, requestAnimationFrame(step));
    else {
      fades.delete(el);
      done?.();
    }
  };
  fades.set(el, requestAnimationFrame(step));
}
const stopFade = (el: HTMLMediaElement | null | undefined) => {
  const id = el && fades.get(el);
  if (id) cancelAnimationFrame(id);
  if (el) fades.delete(el);
};

// Graphe audio commun : chaque élément est branché une seule fois sur l'analyseur.
let ctx: AudioContext | null = null;
let analyser: AnalyserNode | null = null;
const sources = new WeakMap<HTMLMediaElement, MediaElementAudioSourceNode>();
const wired = new WeakSet<HTMLMediaElement>();
// Lecture en cours. Un vieux onError ne doit pas lancer le secours par-dessus.
let playGen = 0;
function wire(el: HTMLMediaElement) {
  try {
    if (!ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctx = new AC();
      analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.78;
      analyser.connect(ctx.destination);
    }
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    if (!analyser) return;
    // createMediaElementSource est unique pour la vie de l'élément.
    // connect() une deuxième fois additionne le signal : le morceau sort deux fois.
    let src = sources.get(el);
    if (!src) {
      src = ctx.createMediaElementSource(el);
      sources.set(el, src);
    }
    if (!wired.has(el)) {
      src.connect(analyser);
      wired.add(el);
    }
  } catch {
    // Sans Web Audio, la lecture continue : seul le visualiseur reste immobile.
  }
}
export const getAnalyser = () => analyser;
function unwire(el: HTMLMediaElement) {
  sources.get(el)?.disconnect();
  wired.delete(el);
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
  const want = useRef<"play" | "pause">("pause");
  const current = useRef<Participant | null>(null);
  const videos = useRef(new Map<string, HTMLVideoElement>());
  const started = useRef(new WeakSet<HTMLVideoElement>());
  const audio = useRef<HTMLAudioElement | null>(null);

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

  // Évènements communs d'un élément média, attribués à la piste en cours.
  const bind = useCallback(
    (el: HTMLMediaElement, owner: () => Participant | null) => {
      const mine = () => {
        const p = owner();
        return p && current.current?.id === p.id ? p : null;
      };
      el.addEventListener("playing", () => {
        if (want.current !== "play") {
          el.pause();
          return;
        }
        const p = mine();
        if (p) set(p.id, { playing: true, loading: false, ended: false });
      });
      el.addEventListener("pause", () => {
        if (want.current !== "pause") return;
        const p = mine();
        if (p) set(p.id, { playing: false, loading: false });
      });
      el.addEventListener("ended", () => {
        const p = mine();
        if (p) {
          want.current = "pause";
          set(p.id, { playing: false, loading: false, ended: true });
        }
      });
      el.addEventListener("waiting", () => {
        if (want.current !== "play") return;
        const p = mine();
        if (p) set(p.id, { loading: true });
      });
      el.addEventListener("error", () => {
        const p = owner();
        if (p && current.current?.id === p.id) want.current = "pause";
        if (p) fail(p.id);
      });
      el.addEventListener("timeupdate", () => {
        const p = mine();
        const end = p?.sound?.k === "video" ? p.sound.end : undefined;
        if (p && end && el.currentTime >= end && !el.paused) {
          want.current = "pause";
          el.pause();
          set(p.id, { playing: false, loading: false, ended: true });
        }
      });
    },
    [set, fail],
  );

  // L'élément <audio> partagé des extraits, créé au premier besoin.
  const audioEl = useCallback(() => {
    if (!audio.current) {
      const a = new Audio();
      a.crossOrigin = "anonymous";
      a.preload = "auto";
      audio.current = a;
      bind(a, () => (current.current?.sound?.k === "audio" ? current.current : null));
    }
    return audio.current;
  }, [bind]);

  useEffect(
    () => () => {
      audio.current?.pause();
      audio.current = null;
    },
    [],
  );

  // Les moitiés vidéo s'enregistrent ici.
  const register = useCallback(
    (p: Participant, el: HTMLVideoElement | null) => {
      if (!el || videos.current.get(p.id) === el) return;
      videos.current.set(p.id, el);
      bind(el, () => (videos.current.get(p.id) === el ? p : null));
    },
    [bind],
  );

  // Une vidéo qui quitte l'écran libère son branchement audio.
  const release = useCallback((p: Participant, el: HTMLVideoElement) => {
    if (videos.current.get(p.id) === el) videos.current.delete(p.id);
    unwire(el);
  }, []);

  const elementOf = useCallback((p: Participant | null): HTMLMediaElement | null => {
    if (!p?.sound || p.sound.k === "youtube") return null;
    return p.sound.k === "video" ? (videos.current.get(p.id) ?? null) : audio.current;
  }, []);

  const silence = useCallback(() => {
    const p = current.current;
    if (p?.sound?.k === "youtube") {
      pauseYoutube();
      audio.current?.pause();
      return;
    }
    const el = elementOf(p);
    if (!el) return;
    el.pause();
    if (p?.sound?.k === "video") setMedia(el, { muted: true });
  }, [elementOf]);

  const level = () => (mute.current ? 0 : readVolume() / 100);

  const hush = () => {
    if (audio.current) {
      stopFade(audio.current);
      audio.current.pause();
    }
    videos.current.forEach((v) => {
      stopFade(v);
      if (!v.paused) v.pause();
    });
  };

  const play = useCallback(
    (p: Participant | null | undefined) => {
      if (!p?.sound) return;
      if (p.sound.k === "youtube") {
        // Déjà cette vidéo : un deuxième loadVideoById laisse l'ancien flux audible.
        if (current.current?.id === p.id && youtubeAlive()) return;
        want.current = "play";
        if (current.current && current.current.id !== p.id) silence();
        hush();
        current.current = p;
        const gen = ++playGen;
        set(p.id, { loading: true, ended: false });
        const live = () => want.current === "play" && gen === playGen && current.current?.id === p.id;
        playYoutube(
          { id: p.sound.id, start: p.sound.start, end: p.sound.end, volume: mute.current ? 0 : readVolume() },
          {
            onPlaying: () => { if (live()) set(p.id, { playing: true, loading: false, ended: false }); },
            onPaused: () => { if (want.current === "pause" && current.current?.id === p.id) set(p.id, { playing: false, loading: false }); },
            onEnded: () => {
              if (!live()) return;
              want.current = "pause";
              set(p.id, { playing: false, loading: false, ended: true });
            },
            onError: () => {
              if (!live() || p.sound?.k !== "youtube") return;
              // La vidéo parle déjà : le secours Apple ferait le même morceau par-dessus.
              if (youtubeAlive()) return;
              const fb = p.sound.fallback;
              if (!fb) { want.current = "pause"; fail(p.id); return; }
              const preview: Participant = { ...p, sound: { k: "audio", src: fb, preview: true } };
              current.current = null;
              stopYoutube();
              play(preview);
            },
          },
        );
        return;
      }
      if (
        p.sound.k === "audio" &&
        want.current === "play" &&
        current.current?.id === p.id &&
        current.current.sound?.k === "audio" &&
        audio.current &&
        !audio.current.paused &&
        audio.current.dataset.id === p.id
      ) return;
      want.current = "play";
      stopYoutube();
      const gen = ++playGen;
      if (current.current?.id !== p.id) silence();
      current.current = p;
      let el: HTMLMediaElement | null;
      if (p.sound.k === "video") {
        const v = videos.current.get(p.id) ?? null;
        if (v && (!started.current.has(v) || v.ended)) {
          started.current.add(v);
          v.currentTime = playFrom;
        }
        el = v;
      } else {
        el = audioEl();
        if (el.dataset.id !== p.id) {
          el.src = p.sound.src;
          el.dataset.id = p.id;
        } else if (el.ended) el.currentTime = 0;
      }
      if (!el) return;
      // Écouter avec le curseur oublié à zéro : on rend le son plutôt qu'un silence.
      if (readVolume() === 0) writeVolume(70);
      if (mute.current) {
        mute.current = false;
        setMutedState(false);
      }
      wire(el);
      stopFade(el);
      setMedia(el, { muted: false, volume: 0 });
      set(p.id, { loading: true, ended: false });
      const target = level();
      el.play().then(
        () => {
          if (want.current !== "play" || gen !== playGen) {
            el.pause();
            return;
          }
          fade(el, target, 240);
        },
        () => {
          if (gen !== playGen) return;
          want.current = "pause";
          set(p.id, { playing: false, loading: false });
        },
      );
    },
    // level lit des valeurs hors React.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [silence, audioEl, playFrom, set],
  );

  // Pause immédiate. Le fondu laissait le play() en vol rallumer le volume.
  const pause = useCallback(() => {
    want.current = "pause";
    playGen++;
    pauseYoutube();
    hush();
    setState((s) => (s.id ? { ...s, playing: false, loading: false } : s));
  }, []);

  const toggle = useCallback(
    (p: Participant) => {
      if (current.current?.id === p.id && want.current === "play") pause();
      else play(p);
    },
    [play, pause],
  );

  const stop = useCallback(() => {
    want.current = "pause";
    playGen++;
    stopYoutube();
    hush();
    current.current = null;
    setState(IDLE);
  }, []);

  const applyLevel = useCallback(() => {
    if (current.current?.sound?.k === "youtube") {
      setYoutubeVolume(mute.current ? 0 : readVolume());
      return;
    }
    stopFade(elementOf(current.current));
    setMedia(elementOf(current.current), { volume: mute.current ? 0 : readVolume() / 100 });
  }, [elementOf]);

  const setVolume = useCallback(
    (v: number) => {
      writeVolume(v);
      if (v > 0 && mute.current) {
        mute.current = false;
        setMutedState(false);
      }
      applyLevel();
    },
    [applyLevel],
  );

  const toggleMute = useCallback(() => {
    mute.current = !mute.current;
    setMutedState(mute.current);
    applyLevel();
  }, [applyLevel]);

  // Position dans la piste active, en secondes.
  const getTime = useCallback((): { now: number; total: number } | null => {
    const p = current.current;
    if (p?.sound?.k === "youtube") return youtubeTime();
    const el = elementOf(p);
    if (!p || !el) return null;
    const end = p.sound?.k === "video" ? p.sound.end : undefined;
    const total = end || el.duration || 0;
    return { now: el.currentTime, total: Number.isFinite(total) ? total : 0 };
  }, [elementOf]);

  const seek = useCallback(
    (seconds: number) => {
      if (current.current?.sound?.k === "youtube") {
        seekYoutube(seconds);
        return;
      }
      const el = elementOf(current.current);
      if (el) el.currentTime = seconds;
    },
    [elementOf],
  );

  return { ...state, failed, volume, muted, setVolume, toggleMute, play, pause, toggle, stop, getTime, seek, register, release };
}

export type Player = ReturnType<typeof usePlayer>;
