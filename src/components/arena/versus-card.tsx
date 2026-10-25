import { AnimatePresence, animate, motion, useMotionValue, useMotionValueEvent, useReducedMotion } from "framer-motion";
import { Pause, Play } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { fetchPair, recordDuel } from "@/lib/versusStats.js";
import type { Participant } from "@/lib/tournois/types";

// Le duel en cours : deux OST face à face, leur pochette, l'extrait de 30 s et
// le vote du site. Un vote ici compte comme un duel du tournoi, puis le duel change.

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

export function VersusCard({ pair, statsId, label = "Duel à l'affiche", onNext }: { pair: Participant[]; statsId?: string; label?: string; onNext?: () => void }) {
  const reduce = useReducedMotion();
  const [a, b] = pair;
  const { playing, toggle, stop } = usePreview();
  const [split, setSplit] = useState<{ a: number; b: number } | null>(null);
  const [picked, setPicked] = useState<0 | 1 | null>(null);

  useEffect(() => {
    setSplit(null);
    setPicked(null);
    if (!statsId || !a || !b) return;
    let on = true;
    fetchPair(statsId, a.id, b.id).then((r: { a: number; b: number } | null) => on && r && setSplit(r));
    return () => {
      on = false;
    };
  }, [statsId, a, b]);

  if (!a || !b) return null;
  const total = split ? split.a + split.b : 0;
  const share = (i: 0 | 1) => (total ? Math.round(((i ? split!.b : split!.a) / total) * 100) : picked == null ? 0 : picked === i ? 100 : 0);

  const vote = (i: 0 | 1) => {
    if (picked != null) return;
    setPicked(i);
    stop();
    const w = i ? b : a;
    const l = i ? a : b;
    // Le vote du joueur compte tout de suite dans la répartition affichée.
    setSplit((s) => ({ a: (s?.a ?? 0) + (i ? 0 : 1), b: (s?.b ?? 0) + (i ? 1 : 0) }));
    if (statsId) recordDuel(statsId, w.id, l.id);
    if (onNext) setTimeout(onNext, 2600);
  };

  return (
    <div className="ar-vs" data-picked={picked ?? undefined}>
      <p className="ar-vs-label">{label}</p>
      <AnimatePresence mode="wait">
        <motion.div
          key={`${a.id}|${b.id}`}
          className="ar-vs-row"
          initial={reduce ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE } }}
          exit={{ opacity: 0, y: -10, transition: { duration: 0.25 } }}
        >
          {[a, b].map((p, i) => {
            const side = i as 0 | 1;
            const on = playing === p.id;
            return (
              <motion.div
                key={p.id}
                className={`ar-vs-side ar-vs-side--${side ? "blue" : "red"} ${picked === side ? "is-win" : picked != null ? "is-lose" : ""}`}
                initial={reduce ? false : { x: side ? 24 : -24, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.8, ease: EASE, delay: 0.05 }}
              >
                <button type="button" className={`ar-vs-art ${on ? "is-on" : ""}`} onClick={() => toggle(p)} aria-label={`${on ? "Pause" : "Écouter"} ${p.title}`}>
                  <img src={p.thumb} alt="" loading="lazy" decoding="async" />
                  <span className="ar-vs-play">{on ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}</span>
                  {on ? <i className="ar-vs-eq" aria-hidden><b /><b /><b /><b /></i> : null}
                </button>
                <div className="ar-vs-txt">
                  <b>{p.title}</b>
                  <small>{p.sub ?? p.group}</small>
                  <span className="ar-vs-bar" aria-hidden>
                    <motion.i initial={{ scaleX: 0 }} animate={{ scaleX: share(side) / 100 }} transition={{ duration: 1.1, ease: EASE }} />
                  </span>
                  <span className="ar-vs-pct">{total || picked != null ? <><Pct value={share(side)} /> %</> : "—"}</span>
                  <button type="button" className="ar-vs-vote" onClick={() => vote(side)} disabled={picked != null}>
                    {picked === side ? "Ton choix" : "Voter"}
                  </button>
                </div>
              </motion.div>
            );
          })}
          <motion.span
            className="ar-vs-mark"
            aria-hidden
            initial={reduce ? false : { scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: picked != null ? 0.35 : 1 }}
            transition={{ duration: 0.7, ease: EASE, delay: 0.2 }}
          >
            VS
          </motion.span>
        </motion.div>
      </AnimatePresence>
      <p className="ar-vs-foot">
        {picked != null
          ? total > 1
            ? `${total} votes sur ce duel. Le prochain arrive…`
            : "Premier vote sur ce duel. Le prochain arrive…"
          : total
            ? `${total} vote${total > 1 ? "s" : ""} sur le site`
            : "Écoute les deux extraits, puis vote."}
      </p>
    </div>
  );
}
