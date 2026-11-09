import { AnimatePresence, motion } from "framer-motion";
import { Play, Volume2, VolumeX } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./select.css";

// Accueil des tournois façon écran de sélection d'un jeu de combat : la
// grande image du tournoi survolé occupe l'écran (son générique en vidéo),
// la rangée des tournois est en bas, un curseur « P1 » glisse de case en
// case. Clic (ou Entrée) = validation : la case clignote, « C'est parti »
// tombe sur l'écran, et on entre dans le tournoi.

export type SelectItem = {
  slug: string;
  title: string;
  short: string;
  tagline: string;
  kind: string;
  accent: string;
  status: string | null;
  progress: number | null;
  media: { k: "video"; src: string; start: number } | { k: "img"; src: string };
  still: string;
  caption?: string;
};

/** Scène 3D facultative qui remplace la grande image et la rangée de cases. */
export type DeckProps = {
  items: SelectItem[];
  active: number;
  ready: SelectItem | null;
  sound: boolean;
  onPick: (k: number) => void;
  onGo: (item: SelectItem) => void;
};

type Props = {
  items: SelectItem[];
  onGo: (item: SelectItem) => void;
  onInfo: (item: SelectItem) => void;
  Deck?: React.ComponentType<DeckProps>;
};

const IDLE_MS = 9000;
const READY_MS = 1050;

export function SelectScreen({ items, onGo, onInfo, Deck }: Props) {
  const [i, setI] = useState(0);
  const [touched, setTouched] = useState(false);
  const [ready, setReady] = useState<SelectItem | null>(null);
  const [sound, setSound] = useState(false);
  const [hidden, setHidden] = useState(false);
  const wrap = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(true);
  const reduce = useMemo(() => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches, []);
  const n = items.length;
  const cur = items[i];

  // Le choix précédent pour donner le sens du glissé (droite ou gauche).
  const dir = useRef(1);
  const pick = useCallback(
    (k: number, user = true) => {
      if (ready) return;
      const nk = (k + n) % n;
      setI((old) => {
        dir.current = nk >= old ? 1 : -1;
        return nk;
      });
      if (user) setTouched(true);
    },
    [n, ready],
  );

  const go = useCallback(
    (it: SelectItem) => {
      if (ready) return;
      setReady(it);
      setTimeout(() => onGo(it), reduce ? 0 : READY_MS);
    },
    [ready, onGo, reduce],
  );

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.1 });
    io.observe(el);
    const v = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", v);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", v);
    };
  }, []);

  // Écran d'attente : tant que personne n'a touché, la sélection défile seule.
  useEffect(() => {
    if (touched || reduce || !visible || hidden || ready) return;
    const t = setTimeout(() => pick(i + 1, false), IDLE_MS);
    return () => clearTimeout(t);
  }, [i, touched, reduce, visible, hidden, ready, pick]);

  // Clavier : flèches pour déplacer le curseur, Entrée pour valider.
  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t?.closest?.("input, textarea, select, [contenteditable]")) return;
      if (e.key === "ArrowRight") pick(i + 1);
      else if (e.key === "ArrowLeft") pick(i - 1);
      else if (e.key === "Enter" && t === document.body) go(items[i]);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visible, i, items, pick, go]);

  // Glisser sur l'image : tournoi suivant / précédent (mobile surtout).
  const drag = useRef<{ x: number; y: number } | null>(null);

  const resume = cur.status && cur.status !== "Partie terminée" && !/champion/.test(cur.status);

  return (
    <section
      ref={wrap}
      className={`sel ${ready ? "is-ready" : ""} ${Deck ? "sel--deck" : ""}`}
      style={{ "--acc": cur.accent } as React.CSSProperties}
      aria-label="Choisis ton tournoi"
      onPointerDown={(e) => {
        if ((e.target as HTMLElement).closest("button, a")) return;
        drag.current = { x: e.clientX, y: e.clientY };
      }}
      onPointerUp={(e) => {
        const d = drag.current;
        drag.current = null;
        if (!d) return;
        const dx = e.clientX - d.x;
        if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(e.clientY - d.y)) pick(i + (dx < 0 ? 1 : -1));
      }}
      onPointerCancel={() => (drag.current = null)}
    >
      {Deck ? (
        <>
          {/* Fond : l'art de la carte choisie, très flou, pour la couleur de la pièce. */}
          <div className="sel-stage" aria-hidden>
            <AnimatePresence initial={false}>
              <motion.img key={cur.slug} className="sel-blur" src={cur.still} alt="" crossOrigin="anonymous" initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { duration: 0.8 } }} exit={{ opacity: 0, transition: { duration: 0.8 } }} />
            </AnimatePresence>
            <div className="sel-veil" />
          </div>
          <Deck items={items} active={i} ready={ready} sound={sound && visible && !hidden} onPick={(k) => pick(k)} onGo={go} />
        </>
      ) : null}
      {/* Grande image : la nouvelle entre en biais par-dessus l'ancienne. */}
      {Deck ? null : <div className="sel-stage" aria-hidden>
        <AnimatePresence initial={false} custom={dir.current}>
          <motion.div
            key={cur.slug}
            className="sel-splash"
            custom={dir.current}
            variants={{
              enter: (d: number) => ({ clipPath: d > 0 ? "polygon(100% 0, 140% 0, 120% 100%, 80% 100%)" : "polygon(-40% 0, 0 0, -20% 100%, -60% 100%)", scale: 1.08 }),
              on: { clipPath: "polygon(-20% 0, 120% 0, 120% 100%, -20% 100%)", scale: 1, transition: { clipPath: { duration: 0.62, ease: [0.76, 0, 0.24, 1] }, scale: { duration: 1.4, ease: [0.16, 1, 0.3, 1] } } },
              exit: { opacity: 0.35, scale: 1.02, transition: { duration: 0.62 } },
            }}
            initial="enter"
            animate="on"
            exit="exit"
          >
            <Splash item={cur} sound={sound && visible && !hidden} />
          </motion.div>
        </AnimatePresence>
        <div className="sel-veil" />
        {/* Trait de couleur qui balaie l'écran à chaque changement. */}
        <motion.i key={`sweep-${cur.slug}`} className="sel-sweep" initial={{ x: "-30%", opacity: 0.9 }} animate={{ x: "130%", opacity: 0, transition: { duration: 0.7, ease: [0.76, 0, 0.24, 1] } }} />
      </div>}

      {/* Fiche du tournoi, comme la fiche d'un combattant. */}
      <div className="sel-card">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={cur.slug} initial="a" animate="b" exit="c" className="sel-card-in">
            <motion.p className="sel-kicker" variants={{ a: { opacity: 0, x: -20 }, b: { opacity: 1, x: 0, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] } }, c: { opacity: 0, transition: { duration: 0.15 } } }}>
              <b>{String(i + 1).padStart(2, "0")}</b>
              <span>{cur.kind}</span>
              {cur.status ? <em>{cur.status}</em> : null}
            </motion.p>
            <h1 className="sel-title">
              {cur.title.replace(/^Tournoi (des |du |de |d'|d’)/i, "").split(" ").map((w, k) => (
                <motion.span
                  key={k}
                  variants={{
                    a: { opacity: 0, y: "0.5em", skewX: -12 },
                    b: { opacity: 1, y: 0, skewX: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: 0.05 + k * 0.05 } },
                    c: { opacity: 0, y: "-0.2em", transition: { duration: 0.15 } },
                  }}
                >
                  {w}
                </motion.span>
              ))}
            </h1>
            <motion.p className="sel-tag" variants={{ a: { opacity: 0 }, b: { opacity: 1, transition: { delay: 0.2, duration: 0.5 } }, c: { opacity: 0, transition: { duration: 0.1 } } }}>
              {cur.tagline}
            </motion.p>
            {cur.caption ? (
              <motion.p className="sel-now" variants={{ a: { opacity: 0 }, b: { opacity: 1, transition: { delay: 0.3, duration: 0.5 } }, c: { opacity: 0, transition: { duration: 0.1 } } }}>
                <i aria-hidden>
                  <span />
                  <span />
                  <span />
                </i>
                {cur.caption}
              </motion.p>
            ) : null}
            {cur.progress != null ? (
              <motion.div className="sel-gauge" aria-label={`Partie avancée à ${Math.round(cur.progress * 100)} %`} variants={{ a: { opacity: 0 }, b: { opacity: 1, transition: { delay: 0.25 } }, c: { opacity: 0 } }}>
                <span>Ta partie</span>
                <i>
                  <motion.em initial={{ scaleX: 0 }} animate={{ scaleX: cur.progress, transition: { delay: 0.35, duration: 0.9, ease: [0.16, 1, 0.3, 1] } }} />
                </i>
                <b>{Math.round(cur.progress * 100)} %</b>
              </motion.div>
            ) : null}
          </motion.div>
        </AnimatePresence>
        <div className="sel-ctas">
          <button type="button" className="sel-go" onClick={() => go(cur)}>
            <Play size={16} fill="currentColor" />
            {resume ? "Reprendre" : "Jouer"}
            <kbd>Entrée</kbd>
          </button>
          <button type="button" className="sel-more" onClick={() => onInfo(cur)}>
            Voir le tournoi
          </button>
          {cur.media.k === "video" ? (
            <button
              type="button"
              className={`sel-sound ${sound ? "is-on" : ""}`}
              aria-pressed={sound}
              aria-label={sound ? "Couper le son" : "Écouter le générique"}
              title={sound ? "Couper le son" : "Écouter"}
              onClick={() => setSound((s) => !s)}
            >
              {sound ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </button>
          ) : null}
        </div>
      </div>

      {/* La rangée des tournois et le curseur P1 (cachée visuellement en 3D, gardée pour le clavier). */}
      <div className={`sel-roster ${Deck ? "sel-roster--sr" : ""}`} role="listbox" aria-label="Tournois">
        {items.map((it, k) => (
          <button
            key={it.slug}
            type="button"
            role="option"
            aria-selected={k === i}
            className={`sel-tile ${k === i ? "is-on" : ""} ${ready?.slug === it.slug ? "is-picked" : ""}`}
            style={{ "--tc": it.accent } as React.CSSProperties}
            onPointerEnter={(e) => {
              if (e.pointerType === "mouse") pick(k);
            }}
            onFocus={() => pick(k)}
            onClick={() => (k === i ? go(it) : pick(k))}
          >
            <span className="sel-tile-art">
              <img src={it.still} alt="" loading="lazy" decoding="async" draggable={false} />
            </span>
            <span className="sel-tile-name">
              <small>{String(k + 1).padStart(2, "0")}</small>
              {it.short}
            </span>
            {k === i ? (
              <motion.span layoutId="sel-p1" className="sel-p1" transition={{ type: "spring", stiffness: 520, damping: 38 }}>
                P1
              </motion.span>
            ) : null}
          </button>
        ))}
      </div>

      {/* Validation : flash, puis « C'est parti » qui tombe sur l'écran. */}
      <AnimatePresence>
        {ready ? (
          <motion.div key="ready" className="sel-ready" initial={{ opacity: 0 }} animate={{ opacity: 1 }} aria-live="assertive">
            <motion.i className="sel-flash" initial={{ opacity: 0.9 }} animate={{ opacity: 0, transition: { duration: 0.5 } }} />
            <motion.p
              className="sel-ready-word"
              initial={{ scale: 2.4, opacity: 0, skewX: -14 }}
              animate={{ scale: 1, opacity: 1, skewX: -8, transition: { type: "spring", stiffness: 420, damping: 22, delay: 0.12 } }}
            >
              C'est parti
            </motion.p>
            <motion.small initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0, transition: { delay: 0.35 } }}>
              {ready.title}
            </motion.small>
            <motion.i className="sel-out" initial={{ scaleX: 0 }} animate={{ scaleX: 1, transition: { delay: 0.62, duration: 0.42, ease: [0.76, 0, 0.24, 1] } }} />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  );
}

// Image ou vidéo du tournoi. La vidéo démarre au refrain, muette sauf si le son est mis.
function Splash({ item, sound }: { item: SelectItem; sound: boolean }) {
  const v = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const el = v.current;
    if (!el) return;
    el.muted = !sound;
    if (sound) el.volume = 0.7;
    el.play().catch(() => {});
  }, [sound]);
  if (item.media.k === "video") {
    const start = item.media.start;
    return (
      <video
        ref={v}
        src={`${item.media.src}#t=${start}`}
        poster={item.still}
        muted
        autoPlay
        loop
        playsInline
        preload="auto"
        onLoadedMetadata={(e) => {
          if (e.currentTarget.currentTime < start - 1) e.currentTarget.currentTime = start;
        }}
      />
    );
  }
  return <img src={item.media.src} alt="" decoding="async" draggable={false} />;
}
