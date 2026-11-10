import { useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { Participant } from "@/lib/tournois/types";
import "./setup-wall.css";

// Écran de départ : le mur des participants tirés. Il compte exactement le
// format choisi (au-delà de 64, les 64 premiers et le reste en chiffre) et se
// recompose quand on change de format. Au lancement, le mur se retire en
// vague et le premier duel du tableau s'avance au centre, face à face.

const CAP = 64;
// Largeur sur hauteur du mur entier.
const WALL = 1.45;
const EASE = [0.16, 1, 0.3, 1] as const;
const OUT = [0.5, 0, 0.9, 0.4] as const;
type Spot = { x: number; y: number; s: number };

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

  // Au lancement : où poser les deux premiers participants (le duel d'ouverture),
  // agrandis, de part et d'autre du centre de l'écran (les réglages se sont effacés).
  const grid = useRef<HTMLUListElement>(null);
  const [duo, setDuo] = useState<Spot[] | null>(null);
  const [line, setLine] = useState(0);
  useLayoutEffect(() => {
    const el = grid.current;
    if (!launching || reduce || !el || el.children.length < 2) return setDuo(null);
    const g = el.getBoundingClientRect();
    const a = (el.children[0] as HTMLElement).getBoundingClientRect();
    const b = (el.children[1] as HTMLElement).getBoundingClientRect();
    const mid = window.innerWidth / 2;
    const s = Math.max(1, Math.min(3, (window.innerWidth * 0.2) / a.width, (g.height * 0.92) / a.height));
    const gap = 16;
    // Sur téléphone le mur est sous les réglages : on l'amène à l'écran.
    if (g.top + g.height / 2 > window.innerHeight || g.top < 0) el.scrollIntoView({ block: "center", behavior: "smooth" });
    const at = (r: DOMRect, side: -1 | 1): Spot => ({
      x: mid + side * ((a.width * s) / 2 + gap) - (r.left + r.width / 2),
      y: g.top + g.height / 2 - (r.top + r.height / 2),
      s,
    });
    setLine(mid - g.left);
    setDuo([at(a, -1), at(b, 1)]);
  }, [launching, reduce, size]);

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
      <ul ref={grid} className={`sw-grid ${launching ? "is-launching" : ""}`}>
        <AnimatePresence initial={false} mode="popLayout">
          {shown.map((p, k) => {
            const src = art ? art(p) : p.thumb;
            // Vague en diagonale, du coin haut gauche au coin bas droit.
            const wave = (k % cols) + Math.floor(k / cols);
            const star = launching && duo && k < 2 ? duo[k] : null;
            return (
              <motion.li
                key={p.id}
                layout={!reduce && !launching}
                initial={reduce ? false : { opacity: 0, scale: 0.94, y: 12 }}
                animate={
                  star
                    ? { opacity: 1, x: star.x, y: star.y, scale: star.s, transition: { duration: 0.85, ease: EASE, delay: 0.16 } }
                    : launching && !reduce
                      ? { opacity: 0, scale: 0.9, y: -10, transition: { duration: 0.34, ease: OUT, delay: wave * 0.022 } }
                      : { opacity: 1, scale: 1, x: 0, y: 0, transition: { duration: 0.6, ease: EASE, delay: Math.min(wave, 16) * 0.03 } }
                }
                exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.94, transition: { duration: 0.22 } }}
                className={`sw-tile ${star ? "is-star" : ""}`}
              >
                <img
                  src={src}
                  className={src.includes("ytimg.com") ? "is-yt" : undefined}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  draggable={false}
                  onError={(e) => {
                    const el = e.currentTarget;
                    if (!el.dataset.fb) {
                      el.dataset.fb = "1";
                      el.src = p.thumb;
                    }
                  }}
                />
              </motion.li>
            );
          })}
        </AnimatePresence>
        {/* Le trait entre les deux premiers : le duel d'ouverture est annoncé. */}
        {launching && duo ? <motion.i className="sw-versus" style={{ left: line }} initial={{ scaleY: 0, opacity: 0 }} animate={{ scaleY: 1, opacity: 1, transition: { duration: 0.55, ease: EASE, delay: 0.5 } }} /> : null}
      </ul>
      {rest > 0 ? <p className="sw-rest">et {rest} autres</p> : null}
    </div>
  );
}
