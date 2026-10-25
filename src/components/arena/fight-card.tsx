import { AnimatePresence, animate, motion, useMotionValue, useMotionValueEvent, useReducedMotion } from "framer-motion";
import { ArrowDown, Pause, Play } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { fetchPair, recordDuel } from "@/lib/versusStats.js";
import type { Participant } from "@/lib/tournois/types";
import { Broadcast } from "./broadcast";

// Le haut du hub : l'affiche du duel d'OST en cours, jouable. On écoute les
// deux extraits, on vote (le vote compte comme un duel du tournoi), la
// répartition du site s'affiche, puis le duel suivant arrive.

const EASE = [0.16, 1, 0.3, 1] as const;

function usePreview() {
  const el = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState<string | null>(null);
  const stop = useCallback(() => {
    el.current?.pause();
    setPlaying(null);
  }, []);
  const toggle = useCallback(
    (p: Participant) => {
      if (p.sound?.k !== "audio") return;
      if (!el.current) {
        el.current = new Audio();
        el.current.addEventListener("ended", () => setPlaying(null));
      }
      const a = el.current;
      if (playing === p.id) return stop();
      if (a.dataset.id !== p.id) {
        a.src = p.sound.src;
        a.dataset.id = p.id;
      }
      a.volume = 0.7;
      a.play().then(() => setPlaying(p.id), () => setPlaying(null));
    },
    [playing, stop],
  );
  useEffect(() => () => el.current?.pause(), []);
  return { playing, toggle, stop };
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

const photo = (p?: Participant) => (p ? { src: p.visual.k === "img" ? p.visual.src : p.thumb } : null);

export function FightCard({ pool, statsId, onPickArena }: { pool: Participant[]; statsId: string; onPickArena: () => void }) {
  const reduce = useReducedMotion();
  const [pair, setPair] = useState<Participant[]>([]);
  const { playing, toggle, stop } = usePreview();
  const [split, setSplit] = useState<{ a: number; b: number } | null>(null);
  const [picked, setPicked] = useState<0 | 1 | null>(null);
  const timer = useRef(0);

  useEffect(() => {
    if (pool.length && !pair.length) setPair(pickPair(pool));
  }, [pool, pair.length]);
  useEffect(() => () => clearTimeout(timer.current), []);

  const [a, b] = pair;
  useEffect(() => {
    setSplit(null);
    setPicked(null);
    if (!a || !b) return;
    let on = true;
    fetchPair(statsId, a.id, b.id).then((r: { a: number; b: number } | null) => on && r && setSplit(r));
    return () => {
      on = false;
    };
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
    timer.current = window.setTimeout(() => setPair((cur) => pickPair(pool, cur)), 2600);
  };

  const chip = picked != null ? (total > 1 ? `${total} votes sur ce duel` : "Premier vote sur ce duel") : total ? `${total} vote${total > 1 ? "s" : ""} sur ce duel` : "Duel du moment";

  return (
    <Broadcast
      left={photo(a)}
      right={photo(b)}
      bug="Tournoi 2026 · en direct"
      chip={chip}
      picked={picked}
      ticker={
        <>
          <p>Deux camps, un seul vainqueur.</p>
          <button type="button" className="ar-go" onClick={onPickArena}>
            Choisir mon arène <ArrowDown size={16} />
          </button>
        </>
      }
    >
      <AnimatePresence mode="wait">
        {a && b ? (
          <motion.div
            key={`${a.id}|${b.id}`}
            className="ar-fight"
            initial={reduce ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } }}
            exit={{ opacity: 0, y: -8, transition: { duration: 0.25 } }}
          >
            {[a, b].map((p, i) => {
              const side = i as 0 | 1;
              const on = playing === p.id;
              return (
                <div key={p.id} className={`ar-fighter ar-fighter--${side ? "blue" : "red"} ${picked === side ? "is-win" : picked != null ? "is-lose" : ""}`}>
                  <small>{[p.sub ?? p.group, p.artist].filter(Boolean).join(" · ")}</small>
                  <b>
                    {p.title}
                    {on ? (
                      <i className="ar-eq" aria-hidden>
                        <i />
                        <i />
                        <i />
                      </i>
                    ) : null}
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
                </div>
              );
            })}
            <span className="ar-fight-vs" aria-hidden>
              VS
            </span>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </Broadcast>
  );
}
