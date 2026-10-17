import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef } from "react";
import { roundName } from "@/lib/tournois/bracket";
import type { Participant } from "@/lib/tournois/types";
import { useTournament } from "./provider";
import { Thumb } from "./visual";

// Fin de tour : les qualifiés, avant d'enchaîner sur le tour suivant.
export function Recap({ size, qualified, onClose }: { size: number; qualified: Participant[]; onClose: () => void }) {
  const { meta } = useTournament();
  const reduce = useReducedMotion();
  const btn = useRef<HTMLButtonElement>(null);
  const next = size === 4 ? "la finale" : `les ${roundName(size / 2).toLowerCase()}`;
  const dense = qualified.length > 16;

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

  return (
    <div className="t-recap" role="dialog" aria-label={`${roundName(size)} terminés`}>
      <div className="t-recap-box">
        <p className="t-eyebrow">{roundName(size)} terminés</p>
        <h2 className="t-recap-title">
          {qualified.length} {meta.unit} passent en {size === 4 ? "finale" : roundName(size / 2).toLowerCase()}
        </h2>
        <ul className={`t-recap-grid ${dense ? "is-dense" : ""}`}>
          {qualified.map((p, i) => (
            <motion.li
              key={p.id}
              initial={reduce ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: Math.min(i * (dense ? 0.01 : 0.04), 0.6) }}
            >
              <Thumb p={p} />
              <b>{p.title}</b>
              {!dense ? <small>{p.sub}</small> : null}
            </motion.li>
          ))}
        </ul>
        <button ref={btn} type="button" className="t-go" onClick={onClose}>
          Continuer vers {next}
        </button>
      </div>
    </div>
  );
}
