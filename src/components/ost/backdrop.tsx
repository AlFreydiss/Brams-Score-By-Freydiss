import { AnimatePresence, motion, useReducedMotion, type Variants } from "framer-motion";
import { useRef } from "react";
import type { Participant } from "@/lib/tournois/types";
import { T } from "./tokens";
import { Photo } from "./ui";

// Le fond de salle, commun aux trois plans : deux œuvres en silhouettes
// géantes, très sombres, fondues vers le centre et qui dérivent lentement ;
// une lueur dorée au centre, un vignettage, des filets en biais, quelques
// pétales et poussières lumineuses, le grain de pellicule. Les silhouettes
// changent avec la clé. Plan lointain : même phrase que les cartes
// (dézoom, travelling, retour) mais Z plus court. Vignette, grain, pétales restent.
// CAM identique à duel.tsx.

const CAM = 1.4;
const BEAT = [0, 0.32, 0.7, 1] as const;
const far = (x: string, z: number, yaw: number, tilt = 0) =>
  `perspective(900px) rotateY(${yaw}deg) rotateX(${tilt}deg) translate3d(${x}, 0px, ${z}px)`;
const FAR_ID = far("0%", 0, 0);

const backIn = (dir: number) => {
  const right = dir > 0;
  const x = (n: number) => `${right ? n : -n}%`;
  const yaw = right ? -8 : 8;
  return {
    transform: [far(x(42), -160, yaw, 6), far(x(36), -160, yaw, 6), far("0%", -90, 0, 3), FAR_ID],
    opacity: [0.35, 0.4, 1, 1],
    transition: {
      duration: CAM,
      times: [...BEAT],
      ease: [T.ease.inOut, T.ease.inOut, T.ease.out],
    },
  };
};

const BACK_EXIT: Variants = {
  exit: (dir: number) => {
    const right = dir >= 0;
    const x = (n: number) => `${right ? -n : n}%`;
    const yaw = right ? 8 : -8;
    return {
      transform: [FAR_ID, far("0%", -160, yaw, 6), far(x(26), -150, yaw * 0.3, 2), far(x(36), -40, 0, 0)],
      opacity: [1, 0.85, 0, 0],
      transition: {
        duration: CAM,
        times: [...BEAT],
        ease: [T.ease.out, T.ease.inOut, T.ease.inOut],
      },
    };
  },
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
  const shot = useRef<{ k: string; incoming: ReturnType<typeof backIn> | null } | null>(null);
  if (pair && (!shot.current || shot.current.k !== k)) {
    shot.current = { k, incoming: !reduce && dir !== 0 ? backIn(dir) : null };
  }
  const incoming = pair && shot.current?.k === k ? shot.current.incoming : null;
  return (
    <div className={`ox-back ${dim ? "is-dim" : ""}`} aria-hidden>
      <motion.div className="ox-back-base" initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1, transition: { duration: 1.2 } }} />
      <AnimatePresence initial={false} custom={dir}>
        {pair ? (
          <motion.div
            key={k}
            className="ox-back-pair"
            custom={dir}
            initial={
              reduce ? { opacity: 0 } : incoming ? { transform: incoming.transform[0], opacity: incoming.opacity[0] } : { opacity: 0, transform: FAR_ID }
            }
            animate={reduce ? { opacity: 1, transition: { duration: 0.4 } } : (incoming ?? { opacity: 1, transform: FAR_ID, transition: { duration: 0.4 } })}
            exit="exit"
            variants={reduce ? FADE : BACK_EXIT}
          >
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
