import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { Participant } from "@/lib/tournois/types";

// Lecteur des tournois, sans YouTube. Un seul son à la fois :
// - « video » : la vidéo R2 affichée dans la moitié, démutée pour l'écoute ;
// - « audio » : un extrait officiel lu par un élément <audio> partagé.
// Les deux passent par un analyseur Web Audio : les visualiseurs lisent le
// vrai signal (les sources autorisent le cross-origin). Rien ne démarre sans
// un geste de l'utilisateur.

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
    // Un élément ne peut avoir qu'une seule source de toute sa vie : on la rebranche.
    let src = sources.get(el);
    if (!src) {
      src = ctx.createMediaElementSource(el);
      sources.set(el, src);
    }
    src.connect(analyser);
  } catch {
    // Sans Web Audio, la lecture continue : seul le visualiseur reste immobile.
  }
}
export const getAnalyser = () => analyser;
function unwire(el: HTMLMediaElement) {
  sources.get(el)?.disconnect();
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
        const p = mine();
        if (p) set(p.id, { playing: true, loading: false, ended: false });
      });
      el.addEventListener("pause", () => {
        const p = mine();
        if (p) set(p.id, { playing: false, loading: false });
      });
      el.addEventListener("ended", () => {
        const p = mine();
        if (p) set(p.id, { playing: false, loading: false, ended: true });
      });
      el.addEventListener("waiting", () => {
        const p = mine();
        if (p) set(p.id, { loading: true });
      });
      el.addEventListener("error", () => {
        const p = owner();
        if (p) fail(p.id);
      });
      el.addEventListener("timeupdate", () => {
        const p = mine();
        const end = p?.sound?.k === "video" ? p.sound.end : undefined;
        if (p && end && el.currentTime >= end && !el.paused) {
          el.pause();
          set(p.id, { playing: false, ended: true });
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
    if (!p?.sound) return null;
    return p.sound.k === "video" ? (videos.current.get(p.id) ?? null) : audio.current;
  }, []);

  const silence = useCallback(() => {
    const p = current.current;
    const el = elementOf(p);
    if (!el) return;
    el.pause();
    if (p?.sound?.k === "video") setMedia(el, { muted: true });
  }, [elementOf]);

  const level = () => (mute.current ? 0 : readVolume() / 100);

  const play = useCallback(
    (p: Participant | null | undefined) => {
      if (!p?.sound) return;
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
        () => fade(el, target, 240),
        () => set(p.id, { playing: false, loading: false }),
      );
    },
    // level lit des valeurs hors React.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [silence, audioEl, playFrom, set],
  );

  // Pause demandée : le son s'éteint en fondu, puis s'arrête (sauf si une
  // lecture a repris entre-temps sur le même élément).
  const pause = useCallback(() => {
    const p = current.current;
    const el = elementOf(p);
    if (!el || el.paused) return silence();
    fade(el, 0, 160, () => {
      if (current.current?.id === p?.id) silence();
    });
  }, [elementOf, silence]);

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
    const el = elementOf(p);
    if (!p || !el) return null;
    const end = p.sound?.k === "video" ? p.sound.end : undefined;
    const total = end || el.duration || 0;
    return { now: el.currentTime, total: Number.isFinite(total) ? total : 0 };
  }, [elementOf]);

  const seek = useCallback(
    (seconds: number) => {
      const el = elementOf(current.current);
      if (el) el.currentTime = seconds;
    },
    [elementOf],
  );

  return { ...state, failed, volume, muted, setVolume, toggleMute, play, pause, toggle, stop, getTime, seek, register, release };
}

export type Player = ReturnType<typeof usePlayer>;
