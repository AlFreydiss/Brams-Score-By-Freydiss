import { AnimatePresence, motion, useMotionValue, useSpring, useTransform, type MotionValue } from "framer-motion";
import { ChevronLeft, ChevronRight, Play, Volume2, VolumeX } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createSilk, type Silk } from "./silk";
import "./stage.css";

// Accueil des tournois : la « scène ». Le texte du tournoi à gauche ; à droite
// un anneau d'écrans en vraie perspective, qui tourne sous la main (glissé,
// flèches, clavier) et se reflète au sol. Seul l'écran de face joue sa vidéo.
// Derrière, les images du tournoi choisi défilent en grand, lentement, avec
// une soie de lumière par-dessus.

export type StageClip = {
  id: string;
  title: string;
  sub?: string;
  still: string;
  pos?: string;
  video?: { src: string; start: number };
};

export type StageItem = {
  slug: string;
  title: string;
  short: string;
  tagline: string;
  kind: string;
  accent: string;
  /** Partie en cours : duels joués, total, tour actuel, tour suivant. */
  run: { done: number; total: number; now: string; next: string | null } | null;
  /** Sans partie en cours : « 2 champions », par exemple. */
  note: string | null;
  /** Le premier passe sur l'écran, les autres défilent en fond. */
  clips: StageClip[];
};

type Props = {
  items: StageItem[];
  onGo: (item: StageItem) => void;
  /** Dans le clic de lancement, avant l'animation (le son ne peut partir que là). */
  onLaunch?: (item: StageItem) => void;
  onInfo: (item: StageItem) => void;
  /** Couleur de l'univers choisi, pour le reste de la page. */
  onAccent?: (hex: string) => void;
};

const IDLE_MS = 9000;
const BACK_MS = 7000;
// Lancement : l'écran recule d'un souffle, puis fonce jusqu'à couvrir la page.
const DIVE_S = 1.05;
// Angle entre deux écrans de l'anneau, et rayon en largeurs d'écran.
const STEP = 34;
// Assez grand pour que le voisin passe derrière l'écran de face, jamais devant.
const RADIUS = 1.78;
// La scène est vue d'un peu au-dessus : on sent le sol.
const CAM = -4;
const EASE = [0.16, 1, 0.3, 1] as const;

const mod = (k: number, n: number) => ((k % n) + n) % n;
// Écart signé sur un anneau de n éléments (le plus court chemin).
const ring = (k: number, at: number, n: number) => {
  let d = mod(k - at, n);
  if (d > n / 2) d -= n;
  return d;
};

export function Stage({ items, onGo, onLaunch, onInfo, onAccent }: Props) {
  const n = items.length;
  // Position sur l'anneau, sans borne : tourner toujours dans le même sens ne revient pas en arrière.
  const [pos, setPosState] = useState(0);
  const i = mod(pos, n);
  const [touched, setTouched] = useState(false);
  const [sound, setSound] = useState(false);
  const [live, setLive] = useState(true);
  const [box, setBox] = useState({ w: 0, narrow: false });
  const [leaving, setLeaving] = useState(false);
  const [dive, setDive] = useState<{ x: number; y: number; s: number } | null>(null);
  const wrap = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const silk = useRef<Silk | null>(null);
  const reduce = useMemo(() => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches, []);

  // Angle de l'anneau (en écrans), suivi par un ressort : le glissé le pousse en direct.
  const aim = useMotionValue(0);
  const rot = useSpring(aim, reduce ? { stiffness: 1000, damping: 100 } : { stiffness: 110, damping: 21, mass: 1 });
  // Souris : l'ensemble penche à peine, le fond glisse à l'opposé.
  const tx = useSpring(useMotionValue(0), { stiffness: 90, damping: 20 });
  const ty = useSpring(useMotionValue(0), { stiffness: 90, damping: 20 });
  // 0 → 1 au lancement : la caméra se remet de face, les voisins s'écartent.
  const flat = useSpring(useMotionValue(0), { stiffness: 170, damping: 26 });
  const tiltY = useTransform([tx, flat], ([a, f]: number[]) => a * 3.2 * (1 - f));
  const tiltX = useTransform([ty, flat], ([a, f]: number[]) => (CAM + a * -2.2) * (1 - f));
  const backX = useTransform(tx, (v) => v * -22);
  const backY = useTransform(ty, (v) => v * -14);

  const cur = items[i];
  const clip = cur.clips[0];

  const setPos = useCallback(
    (p: number, user = true) => {
      setPosState(p);
      aim.set(p);
      if (user) setTouched(true);
    },
    [aim],
  );
  const step = useCallback((d: number, user = true) => setPos(Math.round(aim.get()) + d, user), [aim, setPos]);

  const go = useCallback(() => {
    if (leaving) return;
    setLeaving(true);
    onLaunch?.(cur);
    const el = track.current?.querySelector<HTMLElement>(".stg-card.is-on");
    if (!el || reduce) return onGo(cur);
    // L'écran fonce vers toi jusqu'à couvrir toute la page, sa vidéo toujours en route.
    tx.set(0);
    ty.set(0);
    flat.set(1);
    silk.current?.boost();
    const r = el.getBoundingClientRect();
    setDive({
      x: window.innerWidth / 2 - (r.left + r.width / 2),
      y: window.innerHeight / 2 - (r.top + r.height / 2),
      s: Math.max(window.innerWidth / r.width, window.innerHeight / r.height) * 1.1,
    });
    window.setTimeout(() => {
      // Un voile de la couleur du tournoi tient le temps que la page suivante s'affiche dessous.
      const veil = document.createElement("div");
      veil.setAttribute("aria-hidden", "true");
      Object.assign(veil.style, { position: "fixed", inset: "0", zIndex: "10060", pointerEvents: "none", background: `radial-gradient(90% 90% at 50% 55%, ${cur.accent}3d, transparent 70%), #08090d` });
      document.body.appendChild(veil);
      window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
      onGo(cur);
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          const fade = veil.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 700, delay: 120, easing: "ease-out", fill: "forwards" });
          fade.finished.then(() => veil.remove(), () => veil.remove());
        }),
      );
    }, DIVE_S * 1000);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leaving, cur, onGo, onLaunch, reduce]);

  // Taille réelle de l'écran : le rayon de l'anneau en dépend.
  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const measure = () => {
      setBox({ w: el.offsetWidth, narrow: window.innerWidth < 760 });
      // Le halo du fond se cale sur l'écran.
      const a = el.getBoundingClientRect();
      const b = wrap.current?.getBoundingClientRect();
      if (b?.width) silk.current?.setFocus((a.left + a.width / 2 - b.left) / b.width, (a.top + a.height / 2 - b.top) / b.height, (a.height / b.height) * 0.78);
    };
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    if (wrap.current) ro.observe(wrap.current);
    return () => ro.disconnect();
  }, []);

  // La scène ne tourne que si on la regarde.
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    let seen = true;
    const sync = () => setLive(seen && !document.hidden);
    const io = new IntersectionObserver(
      ([e]) => {
        seen = e.isIntersecting;
        sync();
      },
      { threshold: 0.25 },
    );
    io.observe(el);
    document.addEventListener("visibilitychange", sync);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", sync);
    };
  }, []);

  // Soie de lumière, teintée par le tournoi choisi.
  useEffect(() => {
    if (!canvas.current) return;
    silk.current = createSilk(canvas.current, items[0].accent);
    return () => silk.current?.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    silk.current?.setColor(cur.accent);
    onAccent?.(cur.accent);
  }, [cur.accent, onAccent]);

  // Tant que personne n'a touché, l'anneau tourne seul.
  useEffect(() => {
    if (touched || reduce || !live || leaving) return;
    const t = setTimeout(() => step(1, false), IDLE_MS);
    return () => clearTimeout(t);
  }, [pos, touched, reduce, live, leaving, step]);

  // Clavier : flèches pour tourner, Entrée pour lancer.
  useEffect(() => {
    if (!live) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t?.closest?.("input, textarea, select, [contenteditable]")) return;
      if (e.key === "ArrowRight") step(1);
      else if (e.key === "ArrowLeft") step(-1);
      else if (e.key === "Enter" && (t === document.body || t === wrap.current)) go();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [live, step, go]);

  // Pavé tactile : un glissé horizontal à deux doigts fait tourner l'anneau.
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    let lock = 0;
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY) || Math.abs(e.deltaX) < 12) return;
      e.preventDefault();
      if (performance.now() < lock) return;
      lock = performance.now() + 520;
      step(e.deltaX > 0 ? 1 : -1);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [step]);

  // Glissé : l'anneau suit la main, puis se cale sur l'écran le plus proche.
  const drag = useRef<{ x: number; y: number; base: number; t: number; moved: boolean } | null>(null);

  return (
    <section
      ref={wrap}
      tabIndex={-1}
      className={`stg ${leaving ? "is-leaving" : ""}`}
      style={{ "--acc": cur.accent } as React.CSSProperties}
      aria-label="Choisis ton tournoi"
      aria-roledescription="carrousel"
      onPointerDown={(e) => {
        const t = e.target as HTMLElement;
        if (leaving || t.closest("button, a")) return;
        wrap.current?.focus({ preventScroll: true });
        if (t.closest(".stg-track")) drag.current = { x: e.clientX, y: e.clientY, base: aim.get(), t: performance.now(), moved: false };
      }}
      onPointerUp={(e) => {
        const d = drag.current;
        drag.current = null;
        if (!d) return;
        const dx = e.clientX - d.x;
        if (!d.moved) {
          // Simple clic : l'écran de face lance le tournoi, un voisin vient au centre.
          const card = (e.target as HTMLElement).closest<HTMLElement>(".stg-card");
          if (!card || Math.abs(e.clientY - d.y) > 8) return;
          if (card.classList.contains("is-on")) go();
          else setPos(Math.round(aim.get()) + ring(Number(card.dataset.k), i, n));
          return;
        }
        // Un geste vif passe à l'écran suivant même s'il est court.
        const speed = dx / Math.max(1, performance.now() - d.t);
        setPos(Math.round(aim.get() - Math.max(-0.45, Math.min(0.45, speed * 0.5))));
      }}
      onPointerCancel={() => {
        if (drag.current) setPos(Math.round(aim.get()));
        drag.current = null;
      }}
      onPointerMove={(e) => {
        if (leaving) return;
        const d = drag.current;
        if (d && box.w) {
          const dx = e.clientX - d.x;
          if (!d.moved && Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(e.clientY - d.y)) {
            d.moved = true;
            setTouched(true);
          }
          if (d.moved) aim.set(d.base - dx / (box.w * 0.78));
        }
        if (e.pointerType !== "mouse" || reduce) return;
        const r = e.currentTarget.getBoundingClientRect();
        tx.set(((e.clientX - r.left) / r.width - 0.5) * 2);
        ty.set(((e.clientY - r.top) / r.height - 0.5) * 2);
      }}
      onPointerLeave={() => (tx.set(0), ty.set(0))}
    >
      {/* Fond : les images du tournoi, en grand, qui dérivent ; la soie par-dessus. */}
      <motion.div className="stg-back" style={{ x: backX, y: backY }} aria-hidden>
        <Backdrop item={cur} moving={live && !reduce && !leaving} />
      </motion.div>
      <div className="stg-scrim" aria-hidden />
      <canvas ref={canvas} className="stg-silk" aria-hidden />

      {/* Le tournoi choisi : nom, phrase, ta partie, boutons. */}
      <div className="stg-copy" aria-live="polite">
        <AnimatePresence mode="wait">
          <motion.div key={cur.slug} className="stg-copy-in" initial="a" animate="b" exit="c" variants={{ b: { transition: { staggerChildren: 0.05 } } }}>
            <motion.p className="stg-kind" variants={RISE}>
              {cur.kind}
              {cur.run ? <span>{cur.run.now}</span> : cur.note ? <span>{cur.note}</span> : null}
            </motion.p>
            <h1 className="stg-title" aria-label={cur.short}>
              {cur.short.split(" ").map((w, k) => (
                <span key={k} aria-hidden>
                  <motion.span variants={{ a: { y: "105%" }, b: { y: 0, transition: { duration: 0.8, ease: EASE, delay: k * 0.06 } }, c: { opacity: 0, transition: { duration: 0.14 } } }}>{w}</motion.span>
                </span>
              ))}
            </h1>
            <motion.p className="stg-tag" variants={RISE}>
              {cur.tagline}
            </motion.p>
            {cur.run ? (
              <motion.div className="stg-run" variants={RISE}>
                <p>
                  <span>
                    <b>{cur.run.done}</b> duel{cur.run.done > 1 ? "s" : ""} sur {cur.run.total}
                  </span>
                  <span>{cur.run.next ? `Ensuite : ${cur.run.next.toLowerCase()}` : "Dernier duel"}</span>
                </p>
                <i role="progressbar" aria-label="Ta partie" aria-valuemin={0} aria-valuemax={cur.run.total} aria-valuenow={cur.run.done}>
                  <motion.u initial={{ scaleX: 0 }} animate={{ scaleX: cur.run.done / Math.max(1, cur.run.total), transition: { delay: 0.3, duration: 0.9, ease: EASE } }} />
                </i>
              </motion.div>
            ) : null}
          </motion.div>
        </AnimatePresence>
        <div className="stg-ctas">
          <button type="button" className="stg-go" onClick={go}>
            <Play size={15} fill="currentColor" />
            {cur.run ? "Reprendre" : "Jouer"}
          </button>
          <button type="button" className="stg-more" onClick={() => onInfo(cur)}>
            Voir le tournoi
          </button>
        </div>
      </div>

      {/* L'anneau d'écrans. */}
      <div className="stg-scene">
        <motion.div
          ref={track}
          className="stg-track"
          style={{ rotateY: tiltY, rotateX: tiltX }}
          animate={dive ? { x: [0, 0, dive.x], y: [0, 0, dive.y], scale: [1, 0.93, dive.s] } : { x: 0, y: 0, scale: 1 }}
          transition={dive ? { duration: DIVE_S, times: [0, 0.24, 1], ease: ["easeOut", [0.7, 0, 0.84, 0]] as ("easeOut" | [number, number, number, number])[] } : { duration: 0 }}
        >
          <div className="stg-ring" style={{ transform: `translateZ(${-box.w * RADIUS}px)` }}>
            {box.w
              ? items.map((it, k) => (
                  <Card key={it.slug} item={it} k={k} n={n} on={k === i} rot={rot} flat={flat} radius={box.w * RADIUS} narrow={box.narrow}>
                    {k === i && it.clips[0].video && live && !reduce ? <Clip key={it.clips[0].id} video={it.clips[0].video} sound={sound} /> : null}
                    {k === i ? (
                      <>
                        <span className="stg-play" aria-hidden>
                          <Play size={22} fill="currentColor" />
                        </span>
                        <div className="stg-cap">
                          <p>
                            <b>{clip.title}</b>
                            {clip.sub ? <span>{clip.sub}</span> : null}
                          </p>
                          {clip.video ? (
                            <button type="button" className={`stg-sound ${sound ? "is-on" : ""}`} aria-pressed={sound} aria-label={sound ? "Couper le son" : "Écouter"} onClick={() => setSound((s) => !s)}>
                              {sound ? <Volume2 size={16} /> : <VolumeX size={16} />}
                            </button>
                          ) : null}
                        </div>
                        {dive ? <i className="stg-dive" style={{ animationDuration: `${DIVE_S}s` }} aria-hidden /> : null}
                      </>
                    ) : null}
                  </Card>
                ))
              : null}
          </div>
        </motion.div>
      </div>

      {/* Les huit tournois. Le trait montre ta partie. */}
      <div className="stg-rail">
        <div className="stg-segs" role="tablist" aria-label="Tournois">
          {items.map((it, k) => (
            <button key={it.slug} type="button" role="tab" aria-selected={k === i} className={`stg-seg ${k === i ? "is-on" : ""}`} style={{ "--sc": it.accent } as React.CSSProperties} onClick={() => (k === i ? go() : setPos(pos + ring(k, i, n)))}>
              <i>
                {it.run ? <u style={{ transform: `scaleX(${it.run.done / Math.max(1, it.run.total)})` }} /> : null}
                {k === i && !touched && live && !reduce ? <s style={{ animationDuration: `${IDLE_MS}ms` }} /> : null}
              </i>
              {it.short}
            </button>
          ))}
        </div>
        <div className="stg-arrows">
          <button type="button" onClick={() => step(-1)} aria-label="Tournoi précédent">
            <ChevronLeft size={17} />
          </button>
          <button type="button" onClick={() => step(1)} aria-label="Tournoi suivant">
            <ChevronRight size={17} />
          </button>
        </div>
      </div>
    </section>
  );
}

const RISE = {
  a: { opacity: 0, y: 14 },
  b: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
  c: { opacity: 0, transition: { duration: 0.14 } },
};

// Un écran de l'anneau. Sa place et sa lumière se calculent à chaque image
// depuis l'angle de l'anneau, sans repasser par React.
function Card({ item, k, n, on, rot, flat, radius, narrow, children }: { item: StageItem; k: number; n: number; on: boolean; rot: MotionValue<number>; flat: MotionValue<number>; radius: number; narrow: boolean; children: React.ReactNode }) {
  const off = (r: number) => {
    let d = mod(k - r, n);
    if (d > n / 2) d -= n;
    return d;
  };
  // Au lancement, les voisins s'écartent de l'écran qui plonge.
  const angle = useTransform([rot, flat], ([r, f]: number[]) => off(r) * STEP * (1 + f * 1.1));
  const opacity = useTransform([rot, flat], ([r, f]: number[]) => {
    const d = off(r);
    const a = Math.abs(d);
    let o: number;
    // À droite : deux voisins visibles, de plus en plus sombres. À gauche il y a le texte : l'écran s'efface vite.
    if (d >= 0) o = a <= 1 ? 1 - 0.4 * a : a <= 2 ? 0.6 - (narrow ? 0.6 : 0.34) * (a - 1) : Math.max(0, 0.26 - 0.4 * (a - 2));
    else o = Math.max(0, 1 - 1.05 * a);
    return o * (1 - f * Math.min(1, a * 3));
  });
  const events = useTransform(opacity, (o) => (o > 0.06 ? "auto" : "none"));
  const c = item.clips[0];
  return (
    <motion.div
      className={`stg-card ${on ? "is-on" : ""}`}
      data-k={k}
      style={{ rotateY: angle, opacity, pointerEvents: events }}
      transformTemplate={({ rotateY }) => `rotateY(${typeof rotateY === "number" ? `${rotateY}deg` : rotateY}) translateZ(${radius}px)`}
      aria-hidden={!on}
    >
      <img src={c.still} alt="" draggable={false} decoding="async" style={c.pos ? { objectPosition: c.pos } : undefined} />
      {children}
    </motion.div>
  );
}

// Fond : les images du tournoi se relaient en fondu, chacune avec son lent
// mouvement de caméra. Celle de l'écran passe en dernier.
function Backdrop({ item, moving }: { item: StageItem; moving: boolean }) {
  const slides = item.clips.length > 1 ? [...item.clips.slice(1), item.clips[0]] : item.clips;
  const [k, setK] = useState(0);
  useEffect(() => setK(0), [item.slug]);
  useEffect(() => {
    if (!moving || slides.length < 2) return;
    const t = setTimeout(() => setK((v) => (v + 1) % slides.length), BACK_MS);
    return () => clearTimeout(t);
  }, [k, moving, slides.length]);
  const s = slides[Math.min(k, slides.length - 1)];
  return (
    <AnimatePresence initial={false}>
      <motion.div key={`${item.slug}/${s.id}`} className="stg-slide" initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { duration: 1.6, ease: "easeOut" } }} exit={{ opacity: 0, transition: { duration: 1.6 } }}>
        <img className={`stg-drift-${k % 3}`} src={s.still} alt="" draggable={false} decoding="async" style={{ objectPosition: s.pos, animationPlayState: moving ? "running" : "paused" }} />
      </motion.div>
    </AnimatePresence>
  );
}

// La vidéo de l'écran de face : démarre au refrain, apparaît quand elle joue.
function Clip({ video, sound }: { video: { src: string; start: number }; sound: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [on, setOn] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.muted = !sound;
    if (sound) el.volume = 0.7;
    el.play().catch(() => {});
  }, [sound]);
  return (
    <video
      ref={ref}
      className={on ? "is-on" : ""}
      src={`${video.src}#t=${video.start}`}
      muted
      autoPlay
      loop
      playsInline
      preload="auto"
      onLoadedMetadata={(e) => {
        if (e.currentTarget.currentTime < video.start - 1) e.currentTarget.currentTime = video.start;
      }}
      onPlaying={() => setOn(true)}
    />
  );
}
