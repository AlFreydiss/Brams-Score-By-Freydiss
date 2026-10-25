import { motion, useReducedMotion, useScroll, useSpring, useTransform } from "framer-motion";
import { Swords } from "lucide-react";
import { useRef } from "react";
import { Link } from "react-router-dom";
import { Embers } from "./embers";

// Affiche « Rouge contre Bleu » : deux photos d'anime en bichromie, une lame de
// lumière au centre, le titre en métal brossé. Ouverture en une fois (la lame
// tombe, les deux camps s'écartent, le titre se pose), puis plus rien ne
// tourne à part les braises.

export type HeroSide = { src: string; pos?: string };

const EASE = [0.16, 1, 0.3, 1] as const;

export function ArenaHero({
  left,
  right,
  lines,
  tagline,
  jp,
  cta,
  children,
}: {
  left?: HeroSide | null;
  right?: HeroSide | null;
  /** Accroche sur deux lignes : la première en acier rouge, la seconde en acier bleu. */
  lines: [string, string];
  tagline: string;
  jp: [string, string];
  cta?: { label: string; to?: string; onClick?: () => void };
  children?: React.ReactNode;
}) {
  const reduce = useReducedMotion();
  const root = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: root, offset: ["start start", "end start"] });
  const drift = useTransform(scrollYProgress, [0, 1], ["0%", "14%"]);
  const fade = useTransform(scrollYProgress, [0, 0.75], [1, 0.3]);
  // En descendant, les deux camps s'écartent de la lame.
  const apartL = useTransform(scrollYProgress, [0, 0.6], ["0%", "-9%"]);
  const apartR = useTransform(scrollYProgress, [0, 0.6], ["0%", "9%"]);

  // Parallaxe à la souris : deux variables CSS, posées à l'évènement (pas de boucle).
  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse" || reduce) return;
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--px", (((e.clientX - r.left) / r.width) * 2 - 1).toFixed(3));
    e.currentTarget.style.setProperty("--py", (((e.clientY - r.top) / r.height) * 2 - 1).toFixed(3));
  };

  const btn = cta ? (
    <span className="ar-cta-in">
      <Swords size={16} aria-hidden />
      {cta.label}
    </span>
  ) : null;

  return (
    <div ref={root} className={children ? "ar-hero" : "ar-hero ar-hero--solo"} onPointerMove={onMove}>
      <motion.div className="ar-stage" style={reduce ? undefined : { y: drift, opacity: fade }} aria-hidden>
        {[left, right].map((s, i) => (
          <motion.div key={i} className={`ar-camp-wrap ar-camp-wrap--${i ? "blue" : "red"}`} style={reduce ? undefined : { x: i ? apartR : apartL }}>
            {/* Le choc : chaque camp fonce vers la lame et rebondit à l'impact. */}
            <motion.div
              className={`ar-camp ar-camp--${i ? "blue" : "red"}`}
              initial={reduce ? false : { x: i ? "38%" : "-38%", opacity: 0, scale: 1.08 }}
              animate={{ x: "0%", opacity: 1, scale: 1 }}
              transition={{ delay: 0.25, x: { type: "spring", stiffness: 90, damping: 13, mass: 1.1 }, opacity: { duration: 0.5 }, scale: { duration: 1.6, ease: EASE } }}
            >
              {s ? <img src={s.src} alt="" decoding="async" draggable={false} style={s.pos ? { objectPosition: s.pos } : undefined} /> : null}
            </motion.div>
          </motion.div>
        ))}
        <div className="ar-mist" />
        <Embers />
        <motion.i
          className="ar-blade"
          initial={reduce ? false : { scaleY: 0, opacity: 0 }}
          animate={{ scaleY: 1, opacity: 1 }}
          transition={{ delay: 0.55, duration: 0.6, ease: [0.7, 0, 0.2, 1] }}
        />
        {reduce ? null : (
          <>
            <motion.i className="ar-flash" initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 0] }} transition={{ delay: 0.78, duration: 0.8, times: [0, 0.12, 1] }} />
            <motion.i className="ar-shock" initial={{ scale: 0, opacity: 0.9 }} animate={{ scale: 4.2, opacity: 0 }} transition={{ delay: 0.8, duration: 1.3, ease: [0.2, 0.7, 0.2, 1] }} />
            <motion.i className="ar-shock ar-shock--2" initial={{ scale: 0, opacity: 0.7 }} animate={{ scale: 3, opacity: 0 }} transition={{ delay: 0.92, duration: 1.1, ease: [0.2, 0.7, 0.2, 1] }} />
          </>
        )}
      </motion.div>

      <motion.p className="ar-jp ar-jp--l" aria-hidden initial={reduce ? false : { opacity: 0, y: -30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.3, duration: 1.2, ease: EASE }}>
        {jp[0]}
      </motion.p>
      <motion.p className="ar-jp ar-jp--r" aria-hidden initial={reduce ? false : { opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.4, duration: 1.2, ease: EASE }}>
        {jp[1]}
      </motion.p>

      <div className="ar-head">
        <h1 className="ar-lines" aria-label={lines.join(" ")}>
          {lines.map((l, i) => (
            <span key={i} className="ar-line-mask" aria-hidden>
              <motion.span
                className={`ar-line ar-line--${i ? "blue" : "red"}`}
                initial={reduce ? false : { y: "110%", x: i ? 40 : -40 }}
                animate={{ y: "0%", x: 0 }}
                transition={{ delay: 0.95 + i * 0.14, duration: 1.05, ease: EASE }}
              >
                {l}
                <motion.span
                  className="ar-line-sheen"
                  initial={reduce ? false : { backgroundPositionX: "130%" }}
                  animate={{ backgroundPositionX: "-30%" }}
                  transition={{ delay: 1.7 + i * 0.18, duration: 1.3, ease: "easeInOut" }}
                >
                  {l}
                </motion.span>
              </motion.span>
            </span>
          ))}
        </h1>
        <motion.p
          className="ar-tagline"
          initial={reduce ? false : { opacity: 0, letterSpacing: "0.1em" }}
          animate={{ opacity: 1, letterSpacing: "0.42em" }}
          transition={{ delay: 1.45, duration: 1.1, ease: EASE }}
        >
          {tagline}
        </motion.p>
        {cta ? (
          <motion.div initial={reduce ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.7, duration: 0.7, ease: EASE }}>
            <Magnet>
              {cta.to ? (
                <Link to={cta.to} className="ar-cta">
                  {btn}
                </Link>
              ) : (
                <button type="button" className="ar-cta" onClick={cta.onClick}>
                  {btn}
                </button>
              )}
            </Magnet>
          </motion.div>
        ) : null}
      </div>

      {children ? (
        <motion.div className="ar-hero-body" initial={reduce ? false : { opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.85, duration: 0.9, ease: EASE }}>
          {children}
        </motion.div>
      ) : null}
    </div>
  );
}

/** Bouton aimanté : il suit un peu la souris, puis revient en ressort. */
export function Magnet({ children, strength = 0.3 }: { children: React.ReactNode; strength?: number }) {
  const reduce = useReducedMotion();
  const x = useSpring(0, { stiffness: 220, damping: 16 });
  const y = useSpring(0, { stiffness: 220, damping: 16 });
  return (
    <motion.span
      className="ar-magnet"
      style={{ x, y }}
      onPointerMove={(e) => {
        if (reduce || e.pointerType !== "mouse") return;
        const r = e.currentTarget.getBoundingClientRect();
        x.set((e.clientX - r.left - r.width / 2) * strength);
        y.set((e.clientY - r.top - r.height / 2) * strength);
      }}
      onPointerLeave={() => {
        x.set(0);
        y.set(0);
      }}
    >
      {children}
    </motion.span>
  );
}

/** Fond seul (écran de départ) : les deux camps, la brume et les braises. */
export function ArenaBackdrop({ left, right }: { left?: HeroSide | null; right?: HeroSide | null }) {
  const reduce = useReducedMotion();
  return (
    <div className="ar-stage ar-stage--fixed" aria-hidden>
      {[left, right].map((s, i) => (
        <motion.div
          key={i}
          className={`ar-camp ar-camp--${i ? "blue" : "red"}`}
          initial={reduce ? false : { clipPath: i ? "inset(0 0 0 100%)" : "inset(0 100% 0 0)" }}
          animate={{ clipPath: "inset(0 0% 0 0%)" }}
          transition={{ delay: 0.1, duration: 1.1, ease: EASE }}
        >
          {s ? <img src={s.src} alt="" decoding="async" draggable={false} /> : null}
        </motion.div>
      ))}
      <div className="ar-mist ar-mist--left" />
      <Embers density={0.7} />
      <motion.i className="ar-blade" initial={reduce ? false : { scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ duration: 0.7, ease: [0.7, 0, 0.2, 1] }} />
    </div>
  );
}
