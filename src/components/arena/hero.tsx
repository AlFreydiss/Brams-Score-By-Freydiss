import { motion, useReducedMotion, useScroll, useSpring, useTransform, type Variants } from "framer-motion";
import { ArrowDown, ArrowRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Embers } from "./embers";

// Affiche « Rouge contre Bleu » : deux photos d'anime en bichromie, une lame de
// lumière au centre. L'ouverture attend que les deux photos soient décodées,
// puis se joue d'un bloc : les camps se percutent, la lame tombe, l'onde part
// du centre, le titre se pose. Seuls des calques déjà peints bougent (transform
// et opacité) ; après l'ouverture, plus rien ne tourne à part les braises.

export type HeroSide = { src: string; pos?: string };

const EASE = [0.16, 1, 0.3, 1] as const;
const CUT = [0.7, 0, 0.2, 1] as const;

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

// Chorégraphie de l'ouverture, en secondes après le décodage des photos.
const CAMP = (i: number): Variants => ({
  out: { x: i ? "34%" : "-34%", opacity: 0 },
  in: { x: "0%", opacity: 1, transition: { x: { type: "spring", stiffness: 80, damping: 15, mass: 1.1 }, opacity: { duration: 0.45 } } },
});
const BLADE: Variants = { out: { scaleY: 0, opacity: 0 }, in: { scaleY: 1, opacity: 1, transition: { delay: 0.32, duration: 0.55, ease: CUT } } };
const FLASH: Variants = { out: { opacity: 0 }, in: { opacity: [0, 1, 0], transition: { delay: 0.5, duration: 0.8, times: [0, 0.12, 1] } } };
const SHOCK = (k: number): Variants => ({
  out: { scale: 0, opacity: 0 },
  in: { scale: k ? 3 : 4, opacity: [k ? 0.7 : 0.9, 0], transition: { delay: 0.52 + k * 0.12, duration: k ? 1.1 : 1.3, ease: [0.2, 0.7, 0.2, 1] } },
});
const WORD = (i: number): Variants => ({
  out: { x: i ? 110 : -110, opacity: 0, skewX: -8 },
  in: { x: 0, opacity: 1, skewX: -8, transition: { type: "spring", stiffness: 120, damping: 16, delay: 0.42 } },
});
const LINE = (i: number): Variants => ({
  out: { y: 46, opacity: 0, skewX: -8 },
  in: { y: 0, opacity: 1, skewX: -8, transition: { delay: 0.55 + i * 0.12, duration: 0.9, ease: EASE } },
});
const SHEEN = (i: number): Variants => ({
  out: { backgroundPositionX: "130%" },
  in: { backgroundPositionX: "-30%", transition: { delay: 1.2 + i * 0.16, duration: 1.2, ease: "easeInOut" } },
});
const RISE = (delay: number, y = 12): Variants => ({
  out: { opacity: 0, y },
  in: { opacity: 1, y: 0, transition: { delay, duration: 0.8, ease: EASE } },
});

export function ArenaHero({
  left,
  right,
  split,
  lines,
  motto,
  tagline,
  jp,
  cta,
  children,
}: {
  left?: HeroSide | null;
  right?: HeroSide | null;
  /** Titre coupé par la lame : le premier mot en acier rouge, le second en acier bleu. */
  split?: [string, string];
  /** Accroche sur deux lignes : la première en acier rouge, la seconde en acier bleu. */
  lines?: [string, string];
  /** Phrase coupée elle aussi par la lame, sous le titre. */
  motto?: [string, string];
  tagline?: string;
  jp: [string, string];
  cta?: { label: string; to?: string; onClick?: () => void };
  children?: React.ReactNode;
}) {
  const reduce = useReducedMotion();
  const ready = useImagesReady([left?.src, right?.src]) || !!reduce;
  const root = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: root, offset: ["start start", "end start"] });
  const drift = useTransform(scrollYProgress, [0, 1], ["0%", "14%"]);
  const fade = useTransform(scrollYProgress, [0, 0.75], [1, 0.3]);
  // En descendant, les deux camps s'écartent de la lame.
  const apartL = useTransform(scrollYProgress, [0, 0.6], ["0%", "-9%"]);
  const apartR = useTransform(scrollYProgress, [0, 0.6], ["0%", "9%"]);
  // Parallaxe à la souris, sur des calques composés : pas de repeinture.
  const mx = useSpring(0, { stiffness: 40, damping: 18 });
  const my = useSpring(0, { stiffness: 40, damping: 18 });
  const parL = useTransform(mx, (v) => v * -18);
  const parR = useTransform(mx, (v) => v * -10);
  const parY = useTransform(my, (v) => v * -10);

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
        {[left, right].map((s, i) => (
          <motion.div key={i} className={`ar-camp-wrap ar-camp-wrap--${i ? "blue" : "red"}`} style={reduce ? undefined : { x: i ? apartR : apartL }}>
            <motion.div className="ar-camp-par" style={reduce ? undefined : { x: i ? parR : parL, y: parY }}>
              {/* Le choc : chaque camp fonce vers la lame et rebondit à l'impact. */}
              <motion.div className={`ar-camp ar-camp--${i ? "blue" : "red"}`} variants={CAMP(i)}>
                {s ? <img src={s.src} alt="" decoding="async" draggable={false} style={s.pos ? { objectPosition: s.pos } : undefined} /> : null}
              </motion.div>
            </motion.div>
          </motion.div>
        ))}
        <div className="ar-mist" />
        <Embers start={ready} delay={reduce ? 0 : 1600} />
        <motion.i className="ar-blade" variants={BLADE} />
        {reduce ? null : (
          <>
            <motion.i className="ar-flash" variants={FLASH} />
            <motion.i className="ar-shock" variants={SHOCK(0)} />
            <motion.i className="ar-shock ar-shock--2" variants={SHOCK(1)} />
          </>
        )}
      </motion.div>

      <motion.p className="ar-jp ar-jp--l" aria-hidden variants={RISE(1, -24)}>
        {jp[0]}
      </motion.p>
      <motion.p className="ar-jp ar-jp--r" aria-hidden variants={RISE(1.1, 24)}>
        {jp[1]}
      </motion.p>

      <div className="ar-head">
        {split ? (
          <h1 className="ar-split" aria-label={split.join(" ")}>
            {split.map((w, i) => (
              <motion.span key={i} className={`ar-word ar-word--${i ? "blue" : "red"}`} variants={WORD(i)} aria-hidden>
                <span className="ar-word-txt">{w}</span>
                <motion.span className="ar-word-sheen" variants={SHEEN(i)}>
                  {w}
                </motion.span>
              </motion.span>
            ))}
          </h1>
        ) : null}
        {lines ? (
          <h1 className="ar-lines" aria-label={lines.join(" ")}>
            {lines.map((l, i) => (
              <motion.span key={i} className={`ar-line ar-line--${i ? "blue" : "red"}`} variants={LINE(i)} aria-hidden>
                <span className="ar-line-txt">{l}</span>
                <motion.span className="ar-line-sheen" variants={SHEEN(i)}>
                  {l}
                </motion.span>
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
          <motion.p className="ar-tagline" variants={RISE(0.95)}>
            {tagline}
          </motion.p>
        ) : null}
        {cta ? (
          <motion.div variants={RISE(1.1)}>
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
        <motion.div className="ar-hero-body" variants={RISE(1.25, 40)}>
          {children}
        </motion.div>
      ) : null}
    </motion.div>
  );
}

/** Bouton aimanté : il suit un peu la souris, puis revient en ressort. */
export function Magnet({ children, strength = 0.25 }: { children: React.ReactNode; strength?: number }) {
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

/** Fond seul (écran de départ) : les deux camps, la brume, la lame et les braises. */
export function ArenaBackdrop({ left, right }: { left?: HeroSide | null; right?: HeroSide | null }) {
  const reduce = useReducedMotion();
  const ready = useImagesReady([left?.src, right?.src], 1200) || !!reduce;
  return (
    <motion.div className="ar-stage ar-stage--fixed" aria-hidden initial={reduce ? "in" : "out"} animate={ready ? "in" : "out"}>
      {[left, right].map((s, i) => (
        <div key={i} className={`ar-camp-wrap ar-camp-wrap--${i ? "blue" : "red"}`}>
          <motion.div className={`ar-camp ar-camp--${i ? "blue" : "red"}`} variants={CAMP(i)}>
            {s ? <img src={s.src} alt="" decoding="async" draggable={false} /> : null}
          </motion.div>
        </div>
      ))}
      <div className="ar-mist ar-mist--setup" />
      <Embers density={0.6} start={ready} delay={reduce ? 0 : 1400} />
      <motion.i className="ar-blade" variants={BLADE} />
    </motion.div>
  );
}
