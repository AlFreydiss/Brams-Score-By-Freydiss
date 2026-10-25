import { AnimatePresence, animate, motion, useMotionValue, useMotionValueEvent, useReducedMotion } from "framer-motion";
import { ArrowDown, Pause, Play } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { fetchPair, recordDuel } from "@/lib/versusStats.js";
import type { Participant } from "@/lib/tournois/types";
import { Broadcast } from "./broadcast";

// Le haut du hub : un duel d'OST jouable, dans la mise en page de l'écran de
// duel du tournoi (coupe en biais, titres Anton blancs, pilule « Choisir »).
// On écoute les deux extraits (vumètre branché sur le vrai son), on choisit
// d'un clic sur la photo ou sur la pilule (le vote compte comme un duel du
// tournoi), la répartition du site s'affiche, puis la scène s'éteint et le
// duel suivant se pose.

const EASE = [0.16, 1, 0.3, 1] as const;

// Lecteur des extraits, branché sur un analyseur pour le vumètre (les extraits
// Apple autorisent le cross-origin).
function usePreview() {
  const el = useRef<HTMLAudioElement | null>(null);
  const ctx = useRef<AudioContext | null>(null);
  const analyser = useRef<AnalyserNode | null>(null);
  const [playing, setPlaying] = useState<string | null>(null);
  const stop = useCallback(() => {
    el.current?.pause();
    setPlaying(null);
  }, []);
  const toggle = useCallback(
    (p: Participant) => {
      if (p.sound?.k !== "audio") return;
      if (!el.current) {
        const a = new Audio();
        a.crossOrigin = "anonymous";
        a.addEventListener("ended", () => setPlaying(null));
        el.current = a;
        try {
          const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
          ctx.current = new AC();
          const an = ctx.current.createAnalyser();
          an.fftSize = 64;
          an.smoothingTimeConstant = 0.72;
          ctx.current.createMediaElementSource(a).connect(an);
          an.connect(ctx.current.destination);
          analyser.current = an;
        } catch {
          // Sans Web Audio, le son passe quand même : seul le vumètre reste immobile.
        }
      }
      if (ctx.current?.state === "suspended") ctx.current.resume().catch(() => {});
      const a = el.current;
      if (playing === p.id) return stop();
      if (a.dataset.id !== p.id) {
        a.src = p.sound.src;
        a.dataset.id = p.id;
      }
      a.volume = 0.7;
      a.play().then(
        () => setPlaying(p.id),
        () => setPlaying(null),
      );
    },
    [playing, stop],
  );
  useEffect(
    () => () => {
      el.current?.pause();
      ctx.current?.close().catch(() => {});
    },
    [],
  );
  return { playing, toggle, stop, analyser };
}

/** Vumètre : cinq barres qui suivent le vrai signal, mises à jour hors React. */
function Vu({ analyser }: { analyser: React.RefObject<AnalyserNode | null> }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const bars = [...(ref.current?.children ?? [])] as HTMLElement[];
    const data = new Uint8Array(32);
    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const an = analyser.current;
      if (!an) return;
      an.getByteFrequencyData(data);
      bars.forEach((b, k) => {
        b.style.transform = `scaleY(${Math.max(0.12, data[1 + k * 3] / 255).toFixed(2)})`;
      });
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [analyser]);
  return (
    <span className="ar-vu" ref={ref} aria-hidden>
      <i />
      <i />
      <i />
      <i />
      <i />
    </span>
  );
}

function Pct({ value }: { value: number }) {
  const v = useMotionValue(0);
  const [n, setN] = useState(0);
  useMotionValueEvent(v, "change", (x) => setN(Math.round(x)));
  useEffect(() => {
    const a = animate(v, value, { duration: 1.1, ease: EASE });
    return () => a.stop();
  }, [v, value]);
  return <>{n}</>;
}

/** Deux OST avec photo, d'animes différents, autres que la paire en cours. */
export function pickPair(list: Participant[], not?: Participant[]) {
  const pool = list.filter((p) => p.visual.k === "img" && !not?.some((x) => x.id === p.id));
  const a = pool[Math.floor(Math.random() * pool.length)];
  const rest = pool.filter((p) => p.group !== a?.group);
  const b = rest[Math.floor(Math.random() * rest.length)];
  return a && b ? [a, b] : [];
}

const big = (p: Participant) => (p.visual.k === "img" ? p.visual.src : p.thumb);
const photo = (p?: Participant) => (p ? { src: big(p) } : null);

export function FightCard({ pool, statsId, onPickArena }: { pool: Participant[]; statsId: string; onPickArena: () => void }) {
  const reduce = useReducedMotion();
  const [pair, setPair] = useState<Participant[]>([]);
  const [round, setRound] = useState(1);
  const { playing, toggle, stop, analyser } = usePreview();
  const [split, setSplit] = useState<{ a: number; b: number } | null>(null);
  const [picked, setPicked] = useState<0 | 1 | null>(null);
  // Le perdant reste en gris le temps que l'ancienne photo s'éteigne.
  const [shade, setShade] = useState<0 | 1 | null>(null);
  const next = useRef<Participant[]>([]);
  const timer = useRef(0);

  useEffect(() => {
    if (pool.length && !pair.length) setPair(pickPair(pool));
  }, [pool, pair.length]);
  useEffect(() => () => clearTimeout(timer.current), []);

  const [a, b] = pair;
  useEffect(() => {
    setSplit(null);
    setPicked(null);
    const fade = window.setTimeout(() => setShade(null), 350);
    if (!a || !b) return () => clearTimeout(fade);
    // Le duel suivant est tiré et ses photos chargées pendant celui-ci :
    // elles se posent sans attendre le réseau.
    next.current = pickPair(pool, pair);
    for (const p of next.current) {
      const img = new Image();
      img.decoding = "async";
      img.src = big(p);
    }
    let on = true;
    fetchPair(statsId, a.id, b.id).then((r: { a: number; b: number } | null) => on && r && setSplit(r));
    return () => {
      on = false;
      clearTimeout(fade);
    };
    // Un tirage par duel.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statsId, a, b]);

  const total = split ? split.a + split.b : 0;
  const share = (i: 0 | 1) => (total ? Math.round(((i ? split!.b : split!.a) / total) * 100) : picked == null ? 0 : picked === i ? 100 : 0);

  const vote = (i: 0 | 1) => {
    if (picked != null || !a || !b) return;
    setPicked(i);
    setShade(i);
    stop();
    // Le vote du joueur compte tout de suite dans la répartition affichée.
    setSplit((s) => ({ a: (s?.a ?? 0) + (i ? 0 : 1), b: (s?.b ?? 0) + (i ? 1 : 0) }));
    recordDuel(statsId, (i ? b : a).id, (i ? a : b).id);
    timer.current = window.setTimeout(() => {
      setPair(next.current.length === 2 ? next.current : pickPair(pool, pair));
      setRound((r) => r + 1);
    }, 1700);
  };

  // Les noms arrivent quand les photos se posent.
  const hit = reduce ? 0 : 0.55;

  return (
    <Broadcast
      duel
      left={photo(a)}
      right={photo(b)}
      bug={
        <>
          Tournoi 2026 <b>Duel n° {round}</b>
          {total ? (
            <small>
              {total} vote{total > 1 ? "s" : ""}
            </small>
          ) : null}
        </>
      }
      chip={
        <button type="button" className="ar-tool" onClick={onPickArena}>
          <ArrowDown size={14} />
          Choisir mon arène
        </button>
      }
      picked={shade}
      onPick={vote}
      pickLabels={a && b ? [`Choisir ${a.title}`, `Choisir ${b.title}`] : undefined}
    >
      <AnimatePresence mode="wait">
        {a && b ? (
          <motion.div key={`${a.id}|${b.id}`} className="ar-fight" exit={{ opacity: 0, transition: { duration: 0.2 } }}>
            {[a, b].map((p, i) => {
              const side = i as 0 | 1;
              const on = playing === p.id;
              return (
                <motion.div
                  key={p.id}
                  className={`ar-fighter ar-fighter--${side ? "blue" : "red"} ${picked === side ? "is-win" : picked != null ? "is-lose" : ""}`}
                  initial={reduce ? false : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: hit, duration: 0.7, ease: EASE }}
                >
                  <p className="ar-side">OST {side ? "B" : "A"}</p>
                  {p.sub ?? p.group ? <p className="ar-from">{p.sub ?? p.group}</p> : null}
                  <h2 className={`ar-fighter-name ${p.title.length > 24 ? "is-long" : ""}`}>{p.title}</h2>
                  {p.artist ? <p className="ar-artist">{p.artist}</p> : null}
                  {picked == null ? (
                    <>
                      <div className="ar-fighter-row">
                        <button type="button" className="ar-listen" onClick={() => toggle(p)} aria-pressed={on} aria-label={`${on ? "Pause" : "Écouter"} ${p.title}`}>
                          <span className="ar-listen-dot">{on ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}</span>
                          <span>{on ? "Pause" : "Écouter"}</span>
                          {on ? <Vu analyser={analyser} /> : null}
                        </button>
                      </div>
                      <button type="button" className="ar-vote" onClick={() => vote(side)} aria-label={`Voter pour ${p.title}`}>
                        Choisir cette OST
                      </button>
                    </>
                  ) : (
                    // La répartition des votes du site, une fois le choix fait.
                    <p className="ar-result">
                      <b>
                        <Pct value={share(side)} /> %
                      </b>
                      {picked === side ? <span>Ton choix</span> : null}
                    </p>
                  )}
                </motion.div>
              );
            })}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </Broadcast>
  );
}
