import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
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
  title,
  over,
  tagline,
  jp,
  cta,
  children,
}: {
  left?: HeroSide | null;
  right?: HeroSide | null;
  title: string;
  /** Petit mot posé sur le titre (« Le tournoi »). */
  over?: string;
  tagline: string;
  jp: [string, string];
  cta?: { label: string; to?: string; onClick?: () => void };
  children?: React.ReactNode;
}) {
  const reduce = useReducedMotion();
  const root = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: root, offset: ["start start", "end start"] });
  const drift = useTransform(scrollYProgress, [0, 1], ["0%", "18%"]);
  const fade = useTransform(scrollYProgress, [0, 0.7], [1, 0.25]);

  // Parallaxe à la souris : deux variables CSS, posées à l'évènement (pas de boucle).
  const onMove = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse" || reduce) return;
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.setAttribute("style", `--px:${(((e.clientX - r.left) / r.width) * 2 - 1).toFixed(3)};--py:${(((e.clientY - r.top) / r.height) * 2 - 1).toFixed(3)}`);
  };

  const letters = title.split("");
  const btn = cta ? (
    <span className="ar-cta-in">
      <Swords size={16} aria-hidden />
      {cta.label}
    </span>
  ) : null;

  return (
    <div ref={root} className="ar-hero" onPointerMove={onMove}>
      {/* Bords rongés du titre, comme un trait de pinceau sur du métal. */}
      <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden>
        <filter id="ar-rough">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="1" seed="7" />
          <feDisplacementMap in="SourceGraphic" scale="2.2" />
        </filter>
      </svg>
      <motion.div className="ar-stage" style={reduce ? undefined : { y: drift, opacity: fade }} aria-hidden>
        {[left, right].map((s, i) => (
          <motion.div
            key={i}
            className={`ar-camp ar-camp--${i ? "blue" : "red"}`}
            initial={reduce ? false : { clipPath: i ? "inset(0 0 0 100%)" : "inset(0 100% 0 0)", scale: 1.12 }}
            animate={{ clipPath: "inset(0 0% 0 0%)", scale: 1 }}
            transition={{ delay: 0.45, duration: 1.4, ease: EASE }}
          >
            {s ? <img src={s.src} alt="" decoding="async" draggable={false} style={s.pos ? { objectPosition: s.pos } : undefined} /> : null}
          </motion.div>
        ))}
        <div className="ar-mist" />
        <Embers />
        <motion.i
          className="ar-blade"
          initial={reduce ? false : { scaleY: 0, opacity: 0 }}
          animate={{ scaleY: 1, opacity: 1 }}
          transition={{ duration: 0.7, ease: [0.7, 0, 0.2, 1] }}
        />
        <motion.i
          className="ar-flash"
          initial={reduce ? { opacity: 0 } : { opacity: 0 }}
          animate={reduce ? { opacity: 0 } : { opacity: [0, 0.9, 0] }}
          transition={{ delay: 0.55, duration: 0.7, times: [0, 0.15, 1] }}
        />
      </motion.div>

      <p className="ar-jp ar-jp--l" aria-hidden>
        {jp[0]}
      </p>
      <p className="ar-jp ar-jp--r" aria-hidden>
        {jp[1]}
      </p>

      <div className="ar-head">
        {over ? (
          <motion.p className="ar-over" initial={reduce ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.05, duration: 0.6, ease: EASE }}>
            {over}
          </motion.p>
        ) : null}
        <h1 className="ar-title" aria-label={title}>
          {letters.map((ch, i) => (
            <motion.span
              key={i}
              aria-hidden
              initial={reduce ? false : { opacity: 0, y: "0.4em", filter: "blur(14px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ delay: 0.8 + i * 0.06, duration: 0.9, ease: EASE }}
            >
              {ch === " " ? " " : ch}
            </motion.span>
          ))}
          <motion.span
            className="ar-title-sheen"
            aria-hidden
            initial={reduce ? false : { backgroundPositionX: "120%" }}
            animate={{ backgroundPositionX: "-20%" }}
            transition={{ delay: 1.5, duration: 1.4, ease: "easeInOut" }}
          >
            {title}
          </motion.span>
        </h1>
        <motion.p
          className="ar-tagline"
          initial={reduce ? false : { opacity: 0, letterSpacing: "0.1em" }}
          animate={{ opacity: 1, letterSpacing: "0.42em" }}
          transition={{ delay: 1.35, duration: 1.1, ease: EASE }}
        >
          {tagline}
        </motion.p>
        {cta ? (
          <motion.div initial={reduce ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.6, duration: 0.7, ease: EASE }}>
            {cta.to ? (
              <Link to={cta.to} className="ar-cta">
                {btn}
              </Link>
            ) : (
              <button type="button" className="ar-cta" onClick={cta.onClick}>
                {btn}
              </button>
            )}
          </motion.div>
        ) : null}
      </div>

      {children ? (
        <motion.div className="ar-hero-body" initial={reduce ? false : { opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.75, duration: 0.9, ease: EASE }}>
          {children}
        </motion.div>
      ) : null}
    </div>
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
