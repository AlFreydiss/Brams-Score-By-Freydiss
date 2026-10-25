import { AnimatePresence, motion, useReducedMotion, type Variants } from "framer-motion";
import { useEffect, useState } from "react";

// Affiche de combat, façon plateau sportif en direct : deux photos en couleur
// côte à côte (sans trait entre elles), une pastille « en direct » en haut, un
// bandeau bas pour le contenu, un bandeau final optionnel. Les photos changent
// en fondu quand le duel change. Seuls des calques composés bougent.

export type CastSide = { src: string; pos?: string };

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

const RISE = (delay: number, y = 16): Variants => ({
  out: { opacity: 0, y },
  in: { opacity: 1, y: 0, transition: { delay, duration: 0.8, ease: EASE } },
});

/** Les deux photos, côte à côte ; une nouvelle photo remplace l'ancienne en fondu. */
function Halves({ left, right, show }: { left?: CastSide | null; right?: CastSide | null; show: boolean }) {
  return (
    <div className="ar-halves" aria-hidden>
      {[left, right].map((s, i) => (
        <div key={i} className={`ar-half ar-half--${i ? "blue" : "red"}`}>
          <AnimatePresence initial={false}>
            {s && show ? (
              <motion.img
                key={s.src}
                src={s.src}
                alt=""
                decoding="async"
                draggable={false}
                style={s.pos ? { objectPosition: s.pos } : undefined}
                initial={{ opacity: 0, scale: 1.04 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.1, ease: EASE }}
              />
            ) : null}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
}

export function Broadcast({
  left,
  right,
  bug,
  chip,
  picked,
  ticker,
  solo,
  children,
}: {
  left?: CastSide | null;
  right?: CastSide | null;
  /** Texte de la pastille rouge « en direct ». */
  bug: string;
  /** Pastille de droite (tour, nombre de pistes…). */
  chip?: string;
  /** Côté choisi au vote : l'autre photo passe en gris. */
  picked?: 0 | 1 | null;
  /** Bandeau final, sous le contenu. */
  ticker?: React.ReactNode;
  /** Affiche plus courte, sans bandeau final (page d'un tournoi). */
  solo?: boolean;
  children: React.ReactNode;
}) {
  const reduce = useReducedMotion();
  const ready = useImagesReady([left?.src, right?.src]) || !!reduce;
  return (
    <motion.div
      className={`ar-cast ${solo ? "ar-cast--solo" : ""}`}
      data-picked={picked ?? undefined}
      initial={reduce ? "in" : "out"}
      animate={ready ? "in" : "out"}
    >
      <Halves left={left} right={right} show={ready} />
      <div className="ar-cast-shade" aria-hidden />
      <motion.div className="ar-cast-top" variants={RISE(0.25, -8)}>
        <span className="ar-bug">
          <i aria-hidden />
          {bug}
        </span>
        {chip ? <span className="ar-chip">{chip}</span> : null}
      </motion.div>
      <motion.div className="ar-third" variants={RISE(0.4)}>
        {children}
      </motion.div>
      {ticker ? (
        <motion.div className="ar-ticker" variants={RISE(0.55, 0)}>
          {ticker}
        </motion.div>
      ) : null}
    </motion.div>
  );
}

/** Fond seul (écran de départ) : les deux photos et l'ombre du bas. */
export function BroadcastBackdrop({ left, right }: { left?: CastSide | null; right?: CastSide | null }) {
  const reduce = useReducedMotion();
  const ready = useImagesReady([left?.src, right?.src], 1200) || !!reduce;
  return (
    <div className="ar-cast-bg" aria-hidden>
      <Halves left={left} right={right} show={ready} />
      <div className="ar-cast-shade ar-cast-shade--setup" />
    </div>
  );
}
