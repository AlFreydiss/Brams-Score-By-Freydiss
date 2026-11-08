import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { Participant } from "@/lib/tournois/types";
import "./setup-wall.css";

// Écran de départ : le mur des participants tirés. Il compte exactement le
// format choisi (au-delà de 64, les 64 premiers et le reste en chiffre) et se
// recompose quand on change de format. Au lancement, les participants
// s'apparient deux par deux avant l'ouverture du premier duel.

const CAP = 64;
const EASE = [0.16, 1, 0.3, 1] as const;

export function SetupWall({ pool, size, launching, accent }: { pool: Participant[]; size: number; launching: boolean; accent: string }) {
  const reduce = !!useReducedMotion();
  const shown = pool.slice(0, Math.min(size, CAP));
  const rest = size - shown.length;
  // Colonnes : un mur plein (le nombre de colonnes divise le format), à peu
  // près carré, en nombre pair (les duels vont par deux).
  const n = shown.length;
  let cols = 2;
  for (let c = 2; c <= n; c += 2) {
    if (n % c === 0 && c >= Math.sqrt(n)) {
      cols = c;
      break;
    }
  }

  return (
    <div className="sw" aria-hidden style={{ "--sw-cols": cols, "--sw-accent": accent } as React.CSSProperties}>
      <div className="sw-head">
        <motion.b key={size} initial={reduce ? false : { y: "60%", opacity: 0 }} animate={{ y: 0, opacity: 1, transition: { duration: 0.6, ease: EASE } }}>
          {size}
        </motion.b>
        <span>
          dans le tirage
          <small>
            {size - 1} duels · {Math.log2(size)} tours
          </small>
        </span>
      </div>
      <ul className={`sw-grid ${launching ? "is-launching" : ""}`}>
        <AnimatePresence initial={false} mode="popLayout">
          {shown.map((p, k) => {
            const pairLeft = k % 2 === 0;
            return (
              <motion.li
                key={p.id}
                layout={!reduce}
                initial={reduce ? false : { opacity: 0, scale: 0.6, filter: "blur(8px)" }}
                animate={
                  launching && !reduce
                    ? { opacity: [1, 1, 0], scale: [1, 0.92, 0.6], x: pairLeft ? ["0%", "52%", "52%"] : ["0%", "-52%", "-52%"], filter: "blur(0px)", transition: { duration: 0.75, ease: EASE, delay: (k % cols) * 0.012 + Math.floor(k / cols) * 0.02 } }
                    : { opacity: 1, scale: 1, x: "0%", filter: "blur(0px)", transition: { duration: 0.55, ease: EASE, delay: Math.min(k, 40) * 0.012 } }
                }
                exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.6, filter: "blur(8px)", transition: { duration: 0.3 } }}
                className="sw-tile"
              >
                <img src={p.thumb} alt="" loading="lazy" decoding="async" draggable={false} />
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ul>
      {rest > 0 ? <p className="sw-rest">et {rest} autres</p> : null}
    </div>
  );
}
