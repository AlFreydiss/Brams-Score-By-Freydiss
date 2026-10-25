import { AnimatePresence, motion, useReducedMotion, type Variants } from "framer-motion";
import { useEffect, useState } from "react";

// Affiche de combat : deux photos en couleur, le contexte en haut, le contenu
// en bas. En version duel (haut du hub), elle reprend l'écran de duel du
// tournoi : coupe en biais, filet blanc tracé de haut en bas.
//
// Un seul mouvement, le même partout : à chaque nouveau duel, la photo
// s'éteint, puis la suivante se pose en se resserrant à peine. Seuls opacité
// et transform bougent. Un clic sur une photo la choisit.

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

const RISE = (delay: number, y = 10): Variants => ({
  out: { opacity: 0, y },
  in: { opacity: 1, y: 0, transition: { delay, duration: 0.7, ease: EASE } },
});

/** Une moitié : la photo, qui s'éteint puis laisse se poser la suivante. */
function Half({ side, photo, show, onPick, pickLabel }: { side: 0 | 1; photo?: CastSide | null; show: boolean; onPick?: () => void; pickLabel?: string }) {
  const reduce = useReducedMotion();
  return (
    <div className={`ar-half ar-half--${side ? "blue" : "red"}`}>
      <AnimatePresence mode="wait">
        {show && photo ? (
          <motion.div
            key={photo.src}
            className="ar-zoom"
            initial={reduce ? false : { opacity: 0, scale: 1.035 }}
            animate={{ opacity: 1, scale: 1, transition: { opacity: { duration: 0.5, delay: side * 0.08 }, scale: { duration: 1.1, ease: EASE, delay: side * 0.08 } } }}
            exit={{ opacity: 0, transition: { duration: 0.3, ease: [0.4, 0, 1, 1] } }}
          >
            <img src={photo.src} alt="" decoding="async" draggable={false} style={photo.pos ? { objectPosition: photo.pos } : undefined} />
          </motion.div>
        ) : null}
      </AnimatePresence>
      {onPick ? <button type="button" className="ar-half-hit" onClick={onPick} aria-label={pickLabel} /> : null}
    </div>
  );
}

export function Broadcast({
  left,
  right,
  bug,
  chip,
  picked,
  onPick,
  pickLabels,
  ticker,
  solo,
  duel,
  children,
}: {
  left?: CastSide | null;
  right?: CastSide | null;
  /** Contexte en haut à gauche. */
  bug: React.ReactNode;
  /** Contexte ou outil en haut à droite. */
  chip?: React.ReactNode;
  /** Côté choisi au vote : l'autre photo passe en gris. */
  picked?: 0 | 1 | null;
  /** Clic sur une photo : la choisir. */
  onPick?: (side: 0 | 1) => void;
  pickLabels?: [string, string];
  /** Bandeau final, sous le contenu. */
  ticker?: React.ReactNode;
  /** Affiche plus courte, sans bandeau final (page d'un tournoi). */
  solo?: boolean;
  /** Version calquée sur l'écran de duel : coupe en biais, filet blanc. */
  duel?: boolean;
  children: React.ReactNode;
}) {
  const reduce = useReducedMotion();
  const show = useImagesReady([left?.src, right?.src]) || !!reduce;

  return (
    <motion.div
      className={`ar-cast ${solo ? "ar-cast--solo" : ""} ${duel ? "ar-cast--duel" : ""}`}
      data-picked={picked ?? undefined}
      initial={reduce ? "in" : "out"}
      animate={show ? "in" : "out"}
    >
      <div className="ar-halves">
        {[left, right].map((s, i) => (
          <Half
            key={i}
            side={i as 0 | 1}
            photo={s}
            show={show}
            onPick={onPick && picked == null ? () => onPick(i as 0 | 1) : undefined}
            pickLabel={pickLabels?.[i]}
          />
        ))}
      </div>
      {duel ? (
        // Le filet se trace de haut en bas, une fois, à l'arrivée.
        <motion.svg
          className="ar-seam"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden
          style={{ originY: 0 }}
          variants={{ out: { scaleY: 0 }, in: { scaleY: 1, transition: { delay: 0.15, duration: 0.6, ease: [0.7, 0, 0.2, 1] } } }}
        >
          <line x1="53" y1="0" x2="47" y2="100" />
        </motion.svg>
      ) : null}
      <div className="ar-cast-shade" aria-hidden />
      <motion.div className="ar-cast-top" variants={RISE(0.5, -8)}>
        <span className="ar-bug">
          <i aria-hidden />
          {bug}
        </span>
        {chip ? <span className="ar-chip">{chip}</span> : null}
      </motion.div>
      <motion.div className="ar-third" variants={RISE(0.6)}>
        {children}
      </motion.div>
      {ticker ? (
        <motion.div className="ar-ticker" variants={RISE(0.8, 24)}>
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
      <div className="ar-halves">
        {[left, right].map((s, i) => (
          <Half key={i} side={i as 0 | 1} photo={s} show={ready} />
        ))}
      </div>
      <div className="ar-cast-shade ar-cast-shade--setup" />
    </div>
  );
}
