import { motion, useReducedMotion, useScroll, useSpring, useTransform, type MotionValue, type Variants } from "framer-motion";
import { ArrowDown, ArrowRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

// Affiche du tournoi : deux camps (rouge à gauche, bleu à droite) en photos
// sombres éclairées de côté, un filet de lumière au centre, un grain léger.
// L'ouverture attend que les photos soient décodées puis se pose lentement ;
// ensuite plus rien ne bouge, sauf au défilement et, à peine, sous la souris.
// Seuls des calques composés bougent (transform et opacité).

export type HeroSide = { src: string; pos?: string };

const EASE = [0.16, 1, 0.3, 1] as const;

/** Vrai quand les photos sont téléchargées et décodées (1,5 s au plus). Ne repasse jamais à faux. */
export function useImagesReady(srcs: (string | undefined | null)[], max = 1500) {
  const key = srcs.filter(Boolean).join("|");
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (ready) return;
    let on = true;
    const timer = setTimeout(() => on && setReady(true), max);
    if (key) {
      Promise.all(
        key.split("|").map((src) => {
          const img = new Image();
          img.decoding = "async";
          img.src = src;
          return img.decode().catch(() => undefined);
        }),
      ).then(() => on && setReady(true));
    }
    return () => {
      on = false;
      clearTimeout(timer);
    };
  }, [key, max, ready]);
  return ready;
}

// Ouverture, en secondes après le décodage des photos : les camps sortent de
// la nuit, le filet se trace, le titre se pose, puis le reste suit.
const CAMP: Variants = { out: { opacity: 0, scale: 1.06 }, in: { opacity: 1, scale: 1, transition: { duration: 2.2, ease: EASE } } };
const BLADE: Variants = { out: { scaleY: 0 }, in: { scaleY: 1, transition: { delay: 0.25, duration: 1.4, ease: [0.65, 0, 0.35, 1] } } };
const WORD = (i: number): Variants => ({
  out: { opacity: 0, x: i ? 28 : -28 },
  in: { opacity: 1, x: 0, transition: { delay: 0.45, duration: 1.2, ease: EASE } },
});
const LINE = (i: number): Variants => ({
  out: { opacity: 0, y: 22 },
  in: { opacity: 1, y: 0, transition: { delay: 0.45 + i * 0.12, duration: 1.1, ease: EASE } },
});
const RISE = (delay: number, y = 10): Variants => ({
  out: { opacity: 0, y },
  in: { opacity: 1, y: 0, transition: { delay, duration: 0.9, ease: EASE } },
});

type Parallax = { l: MotionValue<number>; r: MotionValue<number>; y: MotionValue<number> };

function Camps({ left, right, par }: { left?: HeroSide | null; right?: HeroSide | null; par?: Parallax }) {
  return (
    <>
      {[left, right].map((s, i) => (
        <div key={i} className={`ar-camp-wrap ar-camp-wrap--${i ? "blue" : "red"}`}>
          <motion.div className="ar-camp-par" style={par ? { x: i ? par.r : par.l, y: par.y } : undefined}>
            <motion.div className={`ar-camp ar-camp--${i ? "blue" : "red"}`} variants={CAMP}>
              {s ? <img src={s.src} alt="" decoding="async" draggable={false} style={s.pos ? { objectPosition: s.pos } : undefined} /> : null}
            </motion.div>
          </motion.div>
        </div>
      ))}
    </>
  );
}

export function ArenaHero({
  left,
  right,
  split,
  lines,
  motto,
  tagline,
  cta,
  children,
}: {
  left?: HeroSide | null;
  right?: HeroSide | null;
  /** Titre coupé par le filet : un mot par camp. */
  split?: [string, string];
  /** Accroche sur deux lignes, la première côté rouge, la seconde côté bleu. */
  lines?: [string, string];
  /** Phrase coupée elle aussi par le filet, sous le titre. */
  motto?: [string, string];
  tagline?: string;
  cta?: { label: string; to?: string; onClick?: () => void };
  children?: React.ReactNode;
}) {
  const reduce = useReducedMotion();
  const ready = useImagesReady([left?.src, right?.src]) || !!reduce;
  const root = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: root, offset: ["start start", "end start"] });
  const drift = useTransform(scrollYProgress, [0, 1], ["0%", "12%"]);
  const fade = useTransform(scrollYProgress, [0, 0.8], [1, 0.35]);
  // Parallaxe à peine perceptible, sur des calques composés : pas de repeinture.
  const mx = useSpring(0, { stiffness: 30, damping: 20 });
  const my = useSpring(0, { stiffness: 30, damping: 20 });
  const parL = useTransform(mx, (v) => v * -10);
  const parR = useTransform(mx, (v) => v * -6);
  const parY = useTransform(my, (v) => v * -6);

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse" || reduce) return;
    const r = e.currentTarget.getBoundingClientRect();
    mx.set(((e.clientX - r.left) / r.width) * 2 - 1);
    my.set(((e.clientY - r.top) / r.height) * 2 - 1);
  };

  const Icon = cta?.to ? ArrowRight : ArrowDown;
  const btn = cta ? (
    <span className="ar-cta-in">
      <span>{cta.label}</span>
      <span className="ar-cta-ico" aria-hidden>
        <Icon size={16} />
      </span>
    </span>
  ) : null;

  return (
    <motion.div
      ref={root}
      className={children ? "ar-hero" : "ar-hero ar-hero--solo"}
      onPointerMove={onMove}
      initial={reduce ? "in" : "out"}
      animate={ready ? "in" : "out"}
    >
      <motion.div className="ar-stage" style={reduce ? undefined : { y: drift, opacity: fade }} aria-hidden>
        <Camps left={left} right={right} par={reduce ? undefined : { l: parL, r: parR, y: parY }} />
        <div className="ar-mist" />
        <motion.i className="ar-blade" variants={BLADE} />
      </motion.div>

      <div className="ar-head">
        {split ? (
          <h1 className="ar-split" aria-label={split.join(" ")}>
            {split.map((w, i) => (
              <motion.span key={i} className={`ar-word ar-word--${i ? "blue" : "red"}`} variants={WORD(i)} aria-hidden>
                {w}
              </motion.span>
            ))}
          </h1>
        ) : null}
        {lines ? (
          <h1 className="ar-lines" aria-label={lines.join(" ")}>
            {lines.map((l, i) => (
              <motion.span key={i} className={`ar-word ar-word--${i ? "blue" : "red"}`} variants={LINE(i)} aria-hidden>
                {l}
              </motion.span>
            ))}
          </h1>
        ) : null}
        {motto ? (
          <motion.p className="ar-motto" variants={RISE(0.85)}>
            <span className="is-red">{motto[0]}</span>
            <span className="is-blue">{motto[1]}</span>
          </motion.p>
        ) : null}
        {tagline ? (
          <motion.p className="ar-tagline" variants={RISE(0.9)}>
            {tagline}
          </motion.p>
        ) : null}
        {cta ? (
          <motion.div variants={RISE(1.05)}>
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
        <motion.div className="ar-hero-body" variants={RISE(1.2, 24)}>
          {children}
        </motion.div>
      ) : null}
    </motion.div>
  );
}

/** Bouton aimanté : il suit un peu la souris, puis revient en ressort. */
export function Magnet({ children, strength = 0.18 }: { children: React.ReactNode; strength?: number }) {
  const reduce = useReducedMotion();
  const x = useSpring(0, { stiffness: 200, damping: 18 });
  const y = useSpring(0, { stiffness: 200, damping: 18 });
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

/** Fond seul (écran de départ) : les deux camps, la brume et le filet. */
export function ArenaBackdrop({ left, right }: { left?: HeroSide | null; right?: HeroSide | null }) {
  const reduce = useReducedMotion();
  const ready = useImagesReady([left?.src, right?.src], 1200) || !!reduce;
  return (
    <motion.div className="ar-stage ar-stage--fixed" aria-hidden initial={reduce ? "in" : "out"} animate={ready ? "in" : "out"}>
      <Camps left={left} right={right} />
      <div className="ar-mist ar-mist--setup" />
      <motion.i className="ar-blade" variants={BLADE} />
    </motion.div>
  );
}
