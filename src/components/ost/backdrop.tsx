import { AnimatePresence, motion, useReducedMotion, type Variants } from "framer-motion";
import type { Participant } from "@/lib/tournois/types";
import { T } from "./tokens";
import { Photo } from "./ui";

// Le fond de salle, commun aux trois plans : deux œuvres en silhouettes
// géantes, très sombres, fondues vers le centre et qui dérivent lentement ;
// une lueur dorée au centre, un vignettage, des filets en biais, quelques
// pétales et poussières lumineuses, le grain de pellicule. Les silhouettes
// changent avec la clé, en glissant dans le sens du duel (parallaxe) ; le
// reste ne bouge pas d'un plan à l'autre.

const BACK: Variants = {
  enter: (dir: number) => ({ x: dir > 0 ? "-12vw" : "12vw", opacity: 0 }),
  center: { x: 0, opacity: 1, transition: { duration: 1.2, ease: T.ease.out } },
  exit: (dir: number) => ({ x: dir > 0 ? "12vw" : "-12vw", opacity: 0, transition: { duration: 0.8, ease: T.ease.in } }),
};
const FADE: Variants = {
  enter: { opacity: 0 },
  center: { opacity: 1, transition: { duration: 0.4 } },
  exit: { opacity: 0, transition: { duration: 0.2 } },
};

// Pétales : position (%), durée et décalage (s), taille, profondeur (0 loin, 2 près).
const PETALS: [number, number, number, number, number, number][] = [
  [6, 62, 34, 4, 1, 1],
  [15, 22, 41, 12, 0.6, 0],
  [27, 86, 30, 9, 0.9, 1],
  [41, 10, 44, 20, 0.5, 0],
  [57, 78, 33, 2, 1.25, 2],
  [69, 24, 39, 15, 0.7, 0],
  [82, 60, 31, 7, 1.1, 1],
  [92, 16, 37, 22, 0.6, 0],
  [49, 48, 46, 30, 0.45, 0],
];
// Poussières : position (%), durée, décalage.
const DUST: [number, number, number, number][] = [
  [12, 40, 9, 1],
  [22, 70, 12, 4],
  [33, 30, 10, 7],
  [46, 66, 13, 2],
  [54, 36, 11, 6],
  [63, 58, 9, 3],
  [74, 34, 12, 8],
  [86, 72, 10, 5],
  [38, 52, 14, 9],
  [66, 18, 11, 1],
];

export function Backdrop({ k, pair, dir = 1, dim = false }: { k: string; pair: [Participant, Participant] | null; dir?: number; dim?: boolean }) {
  const reduce = useReducedMotion();
  return (
    <div className={`ox-back ${dim ? "is-dim" : ""}`} aria-hidden>
      <motion.div className="ox-back-base" initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1, transition: { duration: 1.2 } }} />
      <AnimatePresence initial={false} custom={dir}>
        {pair ? (
          <motion.div key={k} className="ox-back-pair" custom={dir} variants={reduce ? FADE : BACK} initial="enter" animate="center" exit="exit">
            <div className="ox-ghost ox-ghost--a">
              <Photo p={pair[0]} portrait={0.9} sizes="60vw" />
            </div>
            {pair[1] !== pair[0] ? (
              <div className="ox-ghost ox-ghost--b">
                <Photo p={pair[1]} portrait={0.9} sizes="60vw" />
              </div>
            ) : null}
          </motion.div>
        ) : null}
      </AnimatePresence>
      <i className="ox-back-glow" />
      <i className="ox-back-line ox-back-line--1" />
      <i className="ox-back-line ox-back-line--2" />
      <i className="ox-back-line ox-back-line--3" />
      {reduce ? null : (
        <>
          <div className="ox-petals">
            {PETALS.map((p, n) => (
              <i
                key={n}
                data-z={p[5]}
                style={{ left: `${p[0]}%`, top: `${p[1]}%`, animationDuration: `${p[2]}s`, animationDelay: `-${p[3]}s`, ["--s" as string]: p[4] }}
              />
            ))}
          </div>
          <div className="ox-dust">
            {DUST.map((p, n) => (
              <i key={n} style={{ left: `${p[0]}%`, top: `${p[1]}%`, animationDuration: `${p[2]}s`, animationDelay: `-${p[3]}s` }} />
            ))}
          </div>
        </>
      )}
      <div className="ox-vignette" />
      <div className="ox-grain" />
    </div>
  );
}
