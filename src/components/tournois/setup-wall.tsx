import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { Participant } from "@/lib/tournois/types";
import "./setup-wall.css";

// Écran de départ : le mur des participants tirés. Il compte exactement le
// format choisi (au-delà de 64, les 64 premiers et le reste en chiffre) et se
// recompose quand on change de format. Au lancement, les participants
// s'apparient deux par deux avant l'ouverture du premier duel.

const CAP = 64;
// Largeur sur hauteur du mur entier.
const WALL = 1.45;
const EASE = [0.16, 1, 0.3, 1] as const;

export function SetupWall({ pool, size, launching, accent, art }: { pool: Participant[]; size: number; launching: boolean; accent: string; /** Image de chaque case, si ce n'est pas la vignette. */ art?: (p: Participant) => string }) {
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

  // Forme des cases : le mur garde à peu près le même cadre (3:2) quel que soit
  // le format, donc des cases en portrait quand il y a deux fois plus de colonnes.
  const rows = Math.ceil(n / cols);
  const ratio = Math.min(1.5, Math.max(0.72, (WALL * rows) / cols));

  return (
    <div className="sw" aria-hidden style={{ "--sw-cols": cols, "--sw-accent": accent, "--sw-ratio": ratio } as React.CSSProperties}>
      <div className="sw-head">
        <motion.b key={size} initial={reduce ? false : { y: "60%", opacity: 0 }} animate={{ y: 0, opacity: 1, transition: { duration: 0.6, ease: EASE } }}>
          {size}
        </motion.b>
        <span>
          dans le tirage
          <small>
            {size - 1} duels · {Math.ceil(Math.log2(size))} tours
          </small>
        </span>
      </div>
      <ul className={`sw-grid ${launching ? "is-launching" : ""}`}>
        <AnimatePresence initial={false} mode="popLayout">
          {shown.map((p, k) => {
            const pairLeft = k % 2 === 0;
            const src = art ? art(p) : p.thumb;
            return (
              <motion.li
                key={p.id}
                layout={!reduce}
                initial={reduce ? false : { opacity: 0, scale: 0.6 }}
                animate={
                  launching && !reduce
                    ? { opacity: [1, 1, 0], scale: [1, 0.92, 0.6], x: pairLeft ? ["0%", "52%", "52%"] : ["0%", "-52%", "-52%"], transition: { duration: 0.75, ease: EASE, delay: (k % cols) * 0.012 + Math.floor(k / cols) * 0.02 } }
                    : { opacity: 1, scale: 1, x: "0%", transition: { duration: 0.55, ease: EASE, delay: Math.min(k, 40) * 0.012 } }
                }
                exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.6, transition: { duration: 0.3 } }}
                className="sw-tile"
              >
                <img src={src} className={src.includes("ytimg.com") ? "is-yt" : undefined} alt="" loading="lazy" decoding="async" draggable={false} onError={(e) => { const el = e.currentTarget; if (!el.dataset.fb) { el.dataset.fb = "1"; el.src = p.thumb; } }} />
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ul>
      {rest > 0 ? <p className="sw-rest">et {rest} autres</p> : null}
    </div>
  );
}
