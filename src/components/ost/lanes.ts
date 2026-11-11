import { useCallback, useEffect, useRef, useState } from "react";
import { gained, type Participant } from "@/lib/tournois/types";
import {
  pauseYoutubeSlot,
  playYoutubeSlot,
  seekYoutubeSlot,
  setYoutubeVolumeSlot,
  stopYoutubeSlot,
  youtubeTimeSlot,
} from "../tournois/youtube-deck";

// Seconde voix du duel. Le lecteur « a » reste celui du site : la carte de
// gauche et le mode solo passent par lui. La carte de droite, en écoute
// ensemble, passe par le cadre « b » et son propre volume.

const VOL_KEY = "tournoi_lane_b";

export type LaneState = {
  id: string | null;
  playing: boolean;
  loading: boolean;
  failed: boolean;
  volume: number;
};

function readVol() {
  try {
    const n = Number(localStorage.getItem(VOL_KEY));
    if (Number.isFinite(n) && n >= 0 && n <= 100) return n;
  } catch {
    /* navigation privée */
  }
  return 70;
}

function writeVol(v: number) {
  try {
    localStorage.setItem(VOL_KEY, String(v));
  } catch {
    /* ignore */
  }
}

const IDLE = (): LaneState => ({ id: null, playing: false, loading: false, failed: false, volume: readVol() });

export function useRightLane(active: boolean) {
  const [lane, setLane] = useState<LaneState>(IDLE);
  const laneRef = useRef(lane);
  laneRef.current = lane;
  const owner = useRef<Participant | null>(null);
  const want = useRef<"play" | "pause">("pause");
  const gen = useRef(0);
  const via = useRef<"yt" | "audio" | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const audio = () => {
    if (!audioRef.current) {
      const el = new Audio();
      el.preload = "auto";
      audioRef.current = el;
    }
    return audioRef.current;
  };

  const stop = useCallback(() => {
    gen.current++;
    want.current = "pause";
    via.current = null;
    owner.current = null;
    stopYoutubeSlot("b");
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.removeAttribute("src");
      delete audioRef.current.dataset.id;
    }
    setLane((l) => ({ ...l, id: null, playing: false, loading: false }));
  }, []);

  useEffect(() => {
    if (!active) stop();
  }, [active, stop]);

  const applyVol = useCallback((raw: number) => {
    const v = gained(owner.current, raw);
    setYoutubeVolumeSlot("b", v);
    if (audioRef.current) audioRef.current.volume = Math.max(0, Math.min(1, v / 100));
  }, []);

  // Fichier audio (R2 ou extrait) lu par l'élément <audio> de ce cadre.
  const playFile = (p: Participant, src: string, vol: number, my: number) => {
    const live = () => want.current === "play" && gen.current === my && owner.current?.id === p.id;
    via.current = "audio";
    const el = audio();
    if (el.dataset.id !== p.id) {
      el.src = src;
      el.dataset.id = p.id;
    } else if (el.ended) el.currentTime = 0;
    el.volume = Math.max(0, Math.min(1, vol / 100));
    el.onended = () => {
      if (!live()) return;
      want.current = "pause";
      setLane((l) => ({ ...l, playing: false, loading: false }));
    };
    el.play().then(
      () => {
        if (live()) setLane((l) => ({ ...l, playing: true, loading: false, failed: false }));
        else el.pause();
      },
      () => {
        if (gen.current !== my) return;
        want.current = "pause";
        setLane((l) => ({ ...l, playing: false, loading: false, failed: true }));
      },
    );
  };

  const play = useCallback(
    (p: Participant) => {
      if (p.sound?.k !== "youtube" && p.sound?.k !== "audio") return;
      const my = ++gen.current;
      want.current = "play";
      owner.current = p;
      const vol = gained(p, laneRef.current.volume);
      setLane((l) => ({ ...l, id: p.id, loading: true, failed: false, playing: false }));
      if (p.sound.k === "audio") {
        stopYoutubeSlot("b");
        playFile(p, p.sound.src, vol, my);
        return;
      }
      via.current = "yt";
      if (audioRef.current) audioRef.current.pause();
      const live = () => want.current === "play" && gen.current === my && owner.current?.id === p.id;
      playYoutubeSlot(
        "b",
        { id: p.sound.id, start: p.sound.start, end: p.sound.end, volume: vol },
        {
          onPlaying: () => {
            if (live()) setLane((l) => ({ ...l, playing: true, loading: false, failed: false }));
          },
          onPaused: () => {
            if (want.current === "pause" && owner.current?.id === p.id) setLane((l) => ({ ...l, playing: false, loading: false }));
          },
          onEnded: () => {
            if (!live()) return;
            want.current = "pause";
            setLane((l) => ({ ...l, playing: false, loading: false }));
          },
          onError: () => {
            if (!live() || p.sound?.k !== "youtube") return;
            const fb = p.sound.fallback;
            if (!fb) {
              want.current = "pause";
              setLane((l) => ({ ...l, playing: false, loading: false, failed: true }));
              return;
            }
            stopYoutubeSlot("b");
            playFile(p, fb, vol, my);
          },
        },
      );
    },
    [],
  );

  const pause = useCallback(() => {
    want.current = "pause";
    pauseYoutubeSlot("b");
    audioRef.current?.pause();
    setLane((l) => ({ ...l, playing: false, loading: false }));
  }, []);

  const toggle = useCallback(
    (p: Participant) => {
      if (owner.current?.id === p.id && want.current === "play" && (laneRef.current.playing || laneRef.current.loading)) pause();
      else play(p);
    },
    [pause, play],
  );

  const seek = useCallback((seconds: number) => {
    if (via.current === "audio" && audioRef.current) {
      audioRef.current.currentTime = seconds;
      return;
    }
    seekYoutubeSlot("b", seconds);
  }, []);

  const getTime = useCallback((): { now: number; total: number } | null => {
    if (!laneRef.current.id) return null;
    if (via.current === "audio" && audioRef.current) {
      const total = audioRef.current.duration || 0;
      return { now: audioRef.current.currentTime || 0, total: Number.isFinite(total) ? total : 0 };
    }
    return youtubeTimeSlot("b");
  }, []);

  const setVolume = useCallback(
    (v: number) => {
      const next = Math.min(100, Math.max(0, Math.round(v)));
      writeVol(next);
      setLane((l) => ({ ...l, volume: next }));
      applyVol(next);
    },
    [applyVol],
  );

  const restart = useCallback(
    (p: Participant) => {
      seek(0);
      if (want.current !== "play") play(p);
    },
    [play, seek],
  );

  return { lane, play, pause, toggle, stop, seek, getTime, setVolume, restart };
}
