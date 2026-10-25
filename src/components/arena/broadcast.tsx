import { motion, useAnimationControls, useReducedMotion, type Variants } from "framer-motion";
import { useEffect, useRef, useState } from "react";

// Affiche de combat, façon plateau sportif en direct : deux photos en couleur
// côte à côte (sans trait entre elles), une pastille « en direct » en haut, un
// bandeau bas pour le contenu, un bandeau final optionnel.
//
// Chaque moitié est une bobine : à l'arrivée et à chaque nouveau duel, les
// autres OST défilent à toute vitesse (flou de vitesse), ralentissent et se
// posent sur la nouvelle photo — « BAM » : flash, petit à-coup, l'image se
// tasse. Les deux bobines tournent en sens inverse. Au repos, la photo avance
// très lentement. Un clic sur une photo la choisit.
// Seuls des calques composés bougent (transform, opacité, flou).

export type CastSide = { src: string; pos?: string };

const EASE = [0.16, 1, 0.3, 1] as const;
/** Durée d'un tour de bobine, jusqu'à l'impact (ms). */
export const REEL_MS = 1050;
const FILLERS = 7;

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
  in: { opacity: 1, y: 0, transition: { delay, duration: 0.7, ease: EASE } },
});

const shuffle = <T,>(list: T[]) => [...list].sort(() => Math.random() - 0.5);

/**
 * Une moitié : la photo posée, ou la bobine qui tourne vers la suivante.
 * @param pool vignettes déjà chargées, qui défilent pendant le tour.
 */
function Reel({
  side,
  photo,
  pool,
  show,
  onLand,
  onPick,
  pickLabel,
}: {
  side: 0 | 1;
  photo?: CastSide | null;
  pool: string[];
  show: boolean;
  onLand: () => void;
  onPick?: () => void;
  pickLabel?: string;
}) {
  const reduce = useReducedMotion();
  const [current, setCurrent] = useState<CastSide | null>(null);
  const [strip, setStrip] = useState<string[] | null>(null);
  const [land, setLand] = useState(0);
  const target = useRef<CastSide | null>(null);

  useEffect(() => {
    if (!show || !photo || photo.src === current?.src || photo.src === target.current?.src) return;
    target.current = photo;
    if (reduce || pool.length < 3) {
      setCurrent(photo);
      return;
    }
    const fillers = shuffle(pool.filter((u) => u !== photo.src)).slice(0, FILLERS);
    const first = current?.src ?? fillers.pop() ?? photo.src;
    // La gauche défile vers le haut, la droite vers le bas : la cible est en bout de bande.
    const list = [first, ...fillers, photo.src];
    setStrip(side ? list.reverse() : list);
  }, [photo, show, current, pool, reduce, side]);

  const n = strip?.length ?? 1;
  const end = `-${((n - 1) / n) * 100}%`;
  const landed = () => {
    if (target.current) setCurrent(target.current);
    setStrip(null);
    setLand((k) => k + 1);
    onLand();
  };

  return (
    <div className={`ar-half ar-half--${side ? "blue" : "red"}`}>
      {current && !strip ? (
        // Impact : l'image arrive un peu grande et se tasse.
        <motion.div key={`${current.src}|${land}`} className="ar-zoom" initial={land ? { scale: 1.07 } : false} animate={{ scale: 1 }} transition={{ duration: 0.55, ease: EASE }}>
          <img src={current.src} alt="" decoding="async" draggable={false} style={current.pos ? { objectPosition: current.pos } : undefined} />
        </motion.div>
      ) : null}
      {strip ? (
        <motion.div
          className="ar-reel"
          style={{ height: `${n * 100}%` }}
          initial={{ y: side ? end : "0%", filter: "blur(0px)" }}
          animate={{ y: side ? "0%" : end, filter: ["blur(0px)", "blur(9px)", "blur(9px)", "blur(0px)"] }}
          transition={{ y: { duration: REEL_MS / 1000, ease: [0.25, 0.8, 0.2, 1] }, filter: { duration: REEL_MS / 1000, times: [0, 0.12, 0.72, 1] } }}
          onAnimationComplete={landed}
        >
          {strip.map((u, k) => (
            <img key={k} src={u} alt="" decoding="async" draggable={false} style={{ top: `${(k / n) * 100}%`, height: `${100 / n}%` }} />
          ))}
        </motion.div>
      ) : null}
      {land ? <motion.i key={land} className="ar-flash" initial={{ opacity: 0.7 }} animate={{ opacity: 0 }} transition={{ duration: 0.5, ease: "easeOut" }} /> : null}
      {onPick ? (
        <button type="button" className="ar-half-hit" onClick={onPick} aria-label={pickLabel}>
          <span className="ar-half-hint" aria-hidden>
            Choisir
          </span>
        </button>
      ) : null}
    </div>
  );
}

export function Broadcast({
  left,
  right,
  bug,
  chip,
  picked,
  pool,
  onPick,
  pickLabels,
  onLand,
  ticker,
  solo,
  children,
}: {
  left?: CastSide | null;
  right?: CastSide | null;
  /** Texte de la pastille rouge « en direct ». */
  bug: string;
  /** Pastille de droite (numéro du duel, nombre de pistes…). */
  chip?: React.ReactNode;
  /** Côté choisi au vote : l'autre photo passe en gris. */
  picked?: 0 | 1 | null;
  /** Vignettes déjà chargées qui défilent dans les bobines. */
  pool?: string[];
  /** Clic sur une photo : la choisir. */
  onPick?: (side: 0 | 1) => void;
  pickLabels?: [string, string];
  /** Les deux bobines se sont posées. */
  onLand?: () => void;
  /** Bandeau final, sous le contenu. */
  ticker?: React.ReactNode;
  /** Affiche plus courte, sans bandeau final (page d'un tournoi). */
  solo?: boolean;
  children: React.ReactNode;
}) {
  const reduce = useReducedMotion();
  const ready = useImagesReady([left?.src, right?.src]) || !!reduce;
  // Avec une bobine, l'ouverture attend ses vignettes (1,8 s au plus).
  const [waited, setWaited] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setWaited(true), 1800);
    return () => clearTimeout(t);
  }, []);
  const show = ready && (!pool || pool.length >= 3 || waited);
  const shake = useAnimationControls();
  const landed = useRef(0);
  // Les deux bobines se posent ensemble : à-coup de l'affiche, puis signal.
  const land = () => {
    landed.current += 1;
    if (landed.current % 2) return;
    if (!reduce) shake.start({ x: [0, -7, 6, -4, 2, 0], transition: { duration: 0.38, ease: "easeOut" } });
    onLand?.();
  };

  return (
    <motion.div
      className={`ar-cast ${solo ? "ar-cast--solo" : ""}`}
      data-picked={picked ?? undefined}
      initial={reduce ? "in" : "out"}
      animate={show ? "in" : "out"}
    >
      <motion.div className="ar-halves" animate={shake}>
        {[left, right].map((s, i) => (
          <Reel
            key={i}
            side={i as 0 | 1}
            photo={s}
            pool={pool ?? []}
            show={show}
            onLand={land}
            onPick={onPick && picked == null ? () => onPick(i as 0 | 1) : undefined}
            pickLabel={pickLabels?.[i]}
          />
        ))}
      </motion.div>
      <div className="ar-cast-shade" aria-hidden />
      <motion.div className="ar-cast-top" variants={RISE(0.4, -10)}>
        <span className="ar-bug">
          <i aria-hidden />
          {bug}
        </span>
        {chip ? <span className="ar-chip">{chip}</span> : null}
      </motion.div>
      <motion.div className="ar-third" variants={RISE(0.5)}>
        {children}
      </motion.div>
      {ticker ? (
        <motion.div className="ar-ticker" variants={RISE(0.7, 64)}>
          {ticker}
        </motion.div>
      ) : null}
    </motion.div>
  );
}

/** Fond seul (écran de départ) : les deux photos, une bobine à l'arrivée, l'ombre du bas. */
export function BroadcastBackdrop({ left, right, pool = [] }: { left?: CastSide | null; right?: CastSide | null; pool?: string[] }) {
  const reduce = useReducedMotion();
  const ready = useImagesReady([left?.src, right?.src], 1200) || !!reduce;
  return (
    <div className="ar-cast-bg" aria-hidden>
      <div className="ar-halves">
        {[left, right].map((s, i) => (
          <Reel key={i} side={i as 0 | 1} photo={s} pool={pool} show={ready} onLand={() => {}} />
        ))}
      </div>
      <div className="ar-cast-shade ar-cast-shade--setup" />
    </div>
  );
}

/** Précharge des vignettes pour les bobines ; rend celles qui sont prêtes. */
export function useReelPool(urls: string[], count = 24) {
  const [pool, setPool] = useState<string[]>([]);
  const key = urls.length;
  useEffect(() => {
    if (!key) return;
    let on = true;
    const pick = shuffle(urls).slice(0, count);
    Promise.all(
      pick.map((u) => {
        const img = new Image();
        img.decoding = "async";
        img.src = u;
        return img.decode().then(
          () => u,
          () => null,
        );
      }),
    ).then((done) => on && setPool(done.filter((u): u is string => !!u)));
    return () => {
      on = false;
    };
    // Un tirage par catalogue chargé.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, count]);
  return pool;
}
