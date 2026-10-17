import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef } from "react";
import { roundName } from "@/lib/tournois/bracket";
import type { Participant } from "@/lib/tournois/types";
import { PosterScene } from "./poster";
import { Thumb } from "./visual";

const EASE = [0.16, 1, 0.3, 1] as const;

// Fin de tour : les affiches du tour suivant (les qualifiés, deux par deux,
// dans l'ordre du tableau). Avant la finale, une seule affiche, coupée comme
// les duels du tournoi.
export function Recap({ size, qualified, onClose }: { size: number; qualified: Participant[]; onClose: () => void }) {
  const reduce = useReducedMotion();
  const btn = useRef<HTMLButtonElement>(null);
  const final = size === 4 && qualified.length === 2;
  const next = roundName(size / 2).toLowerCase();
  const done = `${roundName(size)} ${size === 4 ? "terminées" : "terminés"}`;
  const pairs: [Participant, Participant | undefined][] = [];
  for (let i = 0; i < qualified.length; i += 2) pairs.push([qualified[i], qualified[i + 1]]);
  const dense = pairs.length > 8;

  useEffect(() => {
    btn.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const rise = (delay: number) => (reduce ? {} : { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE, delay } } });

  return (
    <motion.div
      className={`t-recap ${final ? "t-recap--final" : ""}`}
      role="dialog"
      aria-label={done}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: { duration: 0.35 } }}
      exit={{ opacity: 0, transition: { duration: 0.25 } }}
    >
      {final ? <PosterScene pair={qualified} /> : null}
      <div className="t-recap-box">
        <p className="t-eyebrow">{done}</p>
        {final ? (
          <>
            <motion.h2 className="t-recap-title" {...rise(0.15)}>
              La finale
            </motion.h2>
            <motion.p className="t-recap-vs" {...rise(0.3)}>
              <b>{qualified[0].title}</b>
              <i>contre</i>
              <b>{qualified[1].title}</b>
            </motion.p>
          </>
        ) : (
          <>
            <motion.h2 className="t-recap-title" {...rise(0)}>
              Les affiches des {next}
            </motion.h2>
            <ol className={`t-recap-pairs ${dense ? "is-dense" : ""}`}>
              {pairs.map(([a, b], i) => {
                const delay = Math.min(0.15 + i * (dense ? 0.02 : 0.06), 0.8);
                // Les deux moitiés d'une affiche se rejoignent au centre.
                const from = (x: number) => (reduce ? {} : { initial: { opacity: 0, x }, animate: { opacity: 1, x: 0, transition: { duration: 0.6, ease: EASE, delay } } });
                return (
                  <li key={a.id}>
                    <motion.span className="t-recap-side" {...from(-14)}>
                      <Thumb p={a} />
                      <span>
                        <b>{a.title}</b>
                        {!dense ? <small>{a.sub}</small> : null}
                      </span>
                    </motion.span>
                    <motion.i className="t-recap-x" {...(reduce ? {} : { initial: { opacity: 0 }, animate: { opacity: 1, transition: { delay: delay + 0.25 } } })}>
                      contre
                    </motion.i>
                    {b ? (
                      <motion.span className="t-recap-side is-right" {...from(14)}>
                        <span>
                          <b>{b.title}</b>
                          {!dense ? <small>{b.sub}</small> : null}
                        </span>
                        <Thumb p={b} />
                      </motion.span>
                    ) : (
                      <span className="t-recap-side is-right">Exempt</span>
                    )}
                  </li>
                );
              })}
            </ol>
          </>
        )}
        <motion.div {...rise(final ? 0.45 : 0.2)}>
          <button ref={btn} type="button" className="t-go" onClick={onClose}>
            {final ? "Lancer la finale" : `Continuer vers les ${next}`}
          </button>
        </motion.div>
      </div>
    </motion.div>
  );
}
