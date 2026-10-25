import { AnimatePresence, animate, motion, useMotionValue, useMotionValueEvent, useReducedMotion } from "framer-motion";
import { ArrowDown, Pause, Play } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchPair, recordDuel } from "@/lib/versusStats.js";
import type { Participant } from "@/lib/tournois/types";
import { Broadcast, REEL_MS, useReelPool } from "./broadcast";

// Le haut du hub : l'affiche du duel d'OST en direct, jouable. On écoute les
// deux extraits (vumètre branché sur le vrai son), on choisit d'un clic sur la
// photo ou sur « Voter » (le vote compte comme un duel du tournoi), la
// répartition du site s'affiche, puis les bobines tournent jusqu'au duel suivant.

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
  const next = useRef<Participant[]>([]);
  const timer = useRef(0);
  const reel = useReelPool(useMemo(() => pool.map((p) => p.thumb), [pool]));

  useEffect(() => {
    if (pool.length && !pair.length) setPair(pickPair(pool));
  }, [pool, pair.length]);
  useEffect(() => () => clearTimeout(timer.current), []);

  const [a, b] = pair;
  useEffect(() => {
    setSplit(null);
    setPicked(null);
    if (!a || !b) return;
    // Le duel suivant est tiré et ses photos chargées pendant celui-ci :
    // la bobine se pose sur une image prête.
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
    };
    // Un tirage par duel.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statsId, a, b]);

  const total = split ? split.a + split.b : 0;
  const share = (i: 0 | 1) => (total ? Math.round(((i ? split!.b : split!.a) / total) * 100) : picked == null ? 0 : picked === i ? 100 : 0);

  const vote = (i: 0 | 1) => {
    if (picked != null || !a || !b) return;
    setPicked(i);
    stop();
    // Le vote du joueur compte tout de suite dans la répartition affichée.
    setSplit((s) => ({ a: (s?.a ?? 0) + (i ? 0 : 1), b: (s?.b ?? 0) + (i ? 1 : 0) }));
    recordDuel(statsId, (i ? b : a).id, (i ? a : b).id);
    timer.current = window.setTimeout(() => {
      setPair(next.current.length === 2 ? next.current : pickPair(pool, pair));
      setRound((r) => r + 1);
    }, 1700);
  };

  // Les noms tombent au moment où les bobines se posent.
  const hit = reduce ? 0 : REEL_MS / 1000 - 0.12;
  const ticker = useMemo(() => {
    const picks = [...pool].sort(() => Math.random() - 0.5).slice(0, 12);
    return [`${pool.length} OST en compétition`, ...picks.map((p) => `${p.title} · ${p.sub ?? p.group}`)];
  }, [pool]);

  return (
    <Broadcast
      left={photo(a)}
      right={photo(b)}
      bug="Tournoi 2026 · en direct"
      chip={
        <>
          Duel n° {round}
          {total ? <small> · {total} vote{total > 1 ? "s" : ""}</small> : null}
        </>
      }
      picked={picked}
      pool={reel}
      onPick={vote}
      pickLabels={a && b ? [`Choisir ${a.title}`, `Choisir ${b.title}`] : undefined}
      ticker={
        <>
          <span className="ar-live">En direct</span>
          <div className="ar-marquee" aria-hidden>
            <div className="ar-marquee-track">
              {[0, 1].map((copy) => (
                <span key={copy} className="ar-marquee-run">
                  <b>Deux camps, un seul vainqueur.</b>
                  {ticker.map((t, k) => (
                    <span key={k}>{t}</span>
                  ))}
                </span>
              ))}
            </div>
          </div>
          <p className="sr-only">Deux camps, un seul vainqueur.</p>
          <button type="button" className="ar-go" onClick={onPickArena}>
            Choisir mon arène <ArrowDown size={16} />
          </button>
        </>
      }
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
                  initial={reduce ? false : { opacity: 0, x: side ? 60 : -60 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: hit, duration: 0.5, ease: EASE }}
                >
                  <small>{[p.sub ?? p.group, p.artist].filter(Boolean).join(" · ")}</small>
                  <b>
                    <span className="ar-fighter-name">{p.title}</span>
                    {on ? <Vu analyser={analyser} /> : null}
                  </b>
                  <span className="ar-meter" aria-hidden>
                    <motion.i initial={{ scaleX: 0 }} animate={{ scaleX: share(side) / 100 }} transition={{ duration: 1.1, ease: EASE }} />
                  </span>
                  <div className="ar-fighter-row">
                    <span className="ar-pct">
                      {total || picked != null ? (
                        <>
                          <Pct value={share(side)} /> %
                        </>
                      ) : (
                        "—"
                      )}
                    </span>
                    <button type="button" className="ar-listen" onClick={() => toggle(p)} aria-pressed={on} aria-label={`${on ? "Pause" : "Écouter"} ${p.title}`}>
                      {on ? <Pause size={15} fill="currentColor" /> : <Play size={15} fill="currentColor" />}
                      <span>{on ? "Pause" : "Écouter"}</span>
                    </button>
                    <button type="button" className="ar-vote" onClick={() => vote(side)} disabled={picked != null} aria-label={`Voter pour ${p.title}`}>
                      {picked === side ? "Ton choix" : "Voter"}
                    </button>
                  </div>
                </motion.div>
              );
            })}
            {/* Le VS claque au moment de l'impact. */}
            <motion.span
              className="ar-fight-vs"
              aria-hidden
              initial={reduce ? false : { scale: 1.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: hit, type: "spring", stiffness: 520, damping: 18 }}
            >
              VS
            </motion.span>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </Broadcast>
  );
}
