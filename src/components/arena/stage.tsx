import { AnimatePresence, motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Play, Volume2, VolumeX } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createSilk, type Silk } from "./silk";
import "./stage.css";

// Accueil des tournois : la « scène ». Le texte du tournoi à gauche, sur le
// noir ; à droite un seul écran net, au centre d'un carrousel à deux axes en
// perspective. Gauche / droite change de tournoi, haut / bas change de
// générique (ou d'image) dans ce tournoi. Seul l'écran du centre joue sa
// vidéo. Derrière, une soie de lumière prend la couleur de l'univers choisi.

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
// Lancement : l'écran recule d'un souffle, puis fonce jusqu'à couvrir la page.
const DIVE_S = 1.05;
const SPRING = { type: "spring" as const, bounce: 0, duration: 0.95 };
const EASE = [0.16, 1, 0.3, 1] as const;

// Place d'un écran selon son écart au centre : dx en tournois, dy en génériques.
function pose(dx: number, dy: number, w: number, h: number, narrow: boolean) {
  if (dx === 0 && dy === 0) return { x: 0, y: 0, z: 0, rotateX: 0, rotateY: 0, opacity: 1, scale: 1 };
  if (dx !== 0) {
    const side = Math.sign(dx);
    const far = Math.abs(dx) > 1;
    // À gauche il y a le texte : l'écran précédent s'efface en reculant.
    if (side < 0) return { x: -w * 0.42, y: 0, z: -w * 0.5, rotateX: 0, rotateY: -34, opacity: 0 };
    return { x: w * (far ? 1.5 : narrow ? 0.9 : 0.94), y: 0, z: -w * (far ? 0.7 : 0.3), rotateX: 0, rotateY: far ? 52 : 40, opacity: far ? (narrow ? 0 : 0.2) : 0.55 };
  }
  const side = Math.sign(dy);
  const far = Math.abs(dy) > 1;
  // Les voisins du dessus et du dessous : de fines tranches, presque à plat.
  return { x: 0, y: side * h * (far ? 1.08 : 0.72), z: -h * (far ? 1.5 : 0.7), rotateX: side * (far ? -84 : -68), rotateY: 0, opacity: far || narrow ? 0 : 0.42 };
}

// Écart signé sur un anneau de n éléments (le plus court chemin).
const ring = (k: number, at: number, n: number) => {
  let d = (((k - at) % n) + n) % n;
  if (d > n / 2) d -= n;
  return d;
};

export function Stage({ items, onGo, onInfo, onAccent, onLaunch }: Props) {
  const n = items.length;
  const [i, setI] = useState(0);
  const [vi, setVi] = useState<Record<string, number>>({});
  const [touched, setTouched] = useState(false);
  const [sound, setSound] = useState(false);
  const [live, setLive] = useState(true);
  const [box, setBox] = useState({ w: 0, h: 0, narrow: false });
  const [leaving, setLeaving] = useState(false);
  const [dive, setDive] = useState<{ x: number; y: number; s: number } | null>(null);
  const wrap = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const silk = useRef<Silk | null>(null);
  const reduce = useMemo(() => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches, []);

  // L'ensemble penche à peine vers la souris (valeurs hors du rendu React).
  const tx = useSpring(useMotionValue(0), { stiffness: 90, damping: 20 });
  const ty = useSpring(useMotionValue(0), { stiffness: 90, damping: 20 });

  const cur = items[i];
  const at = (it: StageItem) => Math.min(vi[it.slug] ?? 0, it.clips.length - 1);
  const clip = cur.clips[at(cur)];

  const pick = useCallback(
    (k: number, user = true) => {
      setI(((k % n) + n) % n);
      if (user) setTouched(true);
    },
    [n],
  );
  const turn = useCallback(
    (step: number) => {
      setTouched(true);
      setVi((old) => {
        const len = items[i].clips.length;
        if (len < 2) return old;
        return { ...old, [items[i].slug]: ((((old[items[i].slug] ?? 0) + step) % len) + len) % len };
      });
    },
    [items, i],
  );
  const go = useCallback(() => {
    if (leaving) return;
    setLeaving(true);
    onLaunch?.(cur);
    const el = track.current?.querySelector<HTMLElement>(".stg-card.is-on");
    if (!el || reduce) return onGo(cur);
    // L'écran fonce vers toi jusqu'à couvrir toute la page, sa vidéo toujours en route.
    tx.set(0);
    ty.set(0);
    silk.current?.boost();
    const r = el.getBoundingClientRect();
    setDive({
      x: window.innerWidth / 2 - (r.left + r.width / 2),
      y: window.innerHeight / 2 - (r.top + r.height / 2),
      s: Math.max(window.innerWidth / r.width, window.innerHeight / r.height) * 1.06,
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

  // Taille réelle de l'écran : les écarts du carrousel en dépendent.
  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const measure = () => {
      setBox({ w: el.offsetWidth, h: el.offsetHeight, narrow: window.innerWidth < 760 });
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
    const io = new IntersectionObserver(([e]) => {
      seen = e.isIntersecting;
      sync();
    }, { threshold: 0.25 });
    io.observe(el);
    document.addEventListener("visibilitychange", sync);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", sync);
    };
  }, []);

  // Fond : la soie, teintée par le tournoi choisi.
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

  // Tant que personne n'a touché, les tournois défilent seuls.
  useEffect(() => {
    if (touched || reduce || !live || leaving) return;
    const t = setTimeout(() => pick(i + 1, false), IDLE_MS);
    return () => clearTimeout(t);
  }, [i, touched, reduce, live, leaving, pick]);

  // Clavier. Gauche / droite partout sur la page ; haut / bas seulement quand
  // la scène a le focus, pour ne pas voler le défilement de la page.
  useEffect(() => {
    if (!live) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t?.closest?.("input, textarea, select, [contenteditable]")) return;
      const inside = !!t && !!wrap.current?.contains(t);
      if (e.key === "ArrowRight") pick(i + 1);
      else if (e.key === "ArrowLeft") pick(i - 1);
      else if (inside && e.key === "ArrowDown") (e.preventDefault(), turn(1));
      else if (inside && e.key === "ArrowUp") (e.preventDefault(), turn(-1));
      else if (e.key === "Enter" && (t === document.body || t === wrap.current)) go();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [live, i, pick, turn, go]);

  // Pavé tactile : un glissé horizontal à deux doigts change de tournoi.
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    let lock = 0;
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY) || Math.abs(e.deltaX) < 12) return;
      e.preventDefault();
      if (performance.now() < lock) return;
      lock = performance.now() + 520;
      setTouched(true);
      setI((old) => (old + (e.deltaX > 0 ? 1 : -1) + n) % n);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [n]);

  const tiltY = useTransform(tx, (v) => v * 2.4);
  const tiltX = useTransform(ty, (v) => v * -1.8);
  const drag = useRef<{ x: number; y: number } | null>(null);
  // Pendant un glissé, l'ensemble suit la main avant de basculer.
  const pullX = useSpring(useMotionValue(0), { stiffness: 260, damping: 30 });
  const pullY = useSpring(useMotionValue(0), { stiffness: 260, damping: 30 });

  // Les écrans à afficher : les génériques du tournoi choisi (axe vertical)
  // et l'écran courant des tournois voisins (axe horizontal).
  const cards = useMemo(() => {
    const out: { key: string; item: StageItem; clip: StageClip; dx: number; dy: number; ti: number; ci: number }[] = [];
    items.forEach((it, k) => {
      const dx = ring(k, i, n);
      if (dx < -1 || dx > 2) return;
      const a = Math.min(vi[it.slug] ?? 0, it.clips.length - 1);
      if (dx !== 0) return void out.push({ key: `${it.slug}/${it.clips[a].id}`, item: it, clip: it.clips[a], dx, dy: 0, ti: k, ci: a });
      const len = it.clips.length;
      it.clips.forEach((c, j) => {
        const dy = len >= 5 ? ring(j, a, len) : j - a;
        if (Math.abs(dy) <= 2) out.push({ key: `${it.slug}/${c.id}`, item: it, clip: c, dx: 0, dy, ti: k, ci: j });
      });
    });
    return out;
  }, [items, i, vi, n]);

  const many = cur.clips.length > 1;

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
        if (!t.closest("button, a")) wrap.current?.focus({ preventScroll: true });
        if (t.closest(".stg-track")) drag.current = { x: e.clientX, y: e.clientY };
      }}
      onPointerUp={(e) => {
        const d = drag.current;
        drag.current = null;
        pullX.set(0);
        pullY.set(0);
        if (!d) return;
        const dx = e.clientX - d.x;
        const dy = e.clientY - d.y;
        if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) pick(i + (dx < 0 ? 1 : -1));
        else if (e.pointerType === "mouse" && Math.abs(dy) > 40 && Math.abs(dy) > Math.abs(dx)) turn(dy < 0 ? 1 : -1);
        else if (Math.abs(dx) < 6 && Math.abs(dy) < 6 && (e.target as HTMLElement).closest(".stg-card.is-on")) go();
      }}
      onPointerCancel={() => ((drag.current = null), pullX.set(0), pullY.set(0))}
      onPointerMove={(e) => {
        if (leaving) return;
        if (drag.current && !reduce) {
          const dx = e.clientX - drag.current.x;
          const dy = e.clientY - drag.current.y;
          if (Math.abs(dx) > Math.abs(dy)) pullX.set(Math.max(-90, Math.min(90, dx * 0.3)));
          else if (e.pointerType === "mouse") pullY.set(Math.max(-60, Math.min(60, dy * 0.3)));
        }
        if (e.pointerType !== "mouse" || reduce) return;
        const r = e.currentTarget.getBoundingClientRect();
        tx.set(((e.clientX - r.left) / r.width - 0.5) * 2);
        ty.set(((e.clientY - r.top) / r.height - 0.5) * 2);
      }}
      onPointerLeave={() => (tx.set(0), ty.set(0))}
    >
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

      {/* Le carrousel : un écran net, ses voisins en profondeur. */}
      <div className="stg-scene">
        <motion.div ref={track} className="stg-track" style={{ rotateY: tiltY, rotateX: tiltX, x: pullX, y: pullY }}>
          <AnimatePresence initial={false}>
            {box.w
              ? cards.map((c) => {
                  const on = c.dx === 0 && c.dy === 0;
                  const p = pose(c.dx, c.dy, box.w, box.h, box.narrow);
                  // Lancement : l'écran du centre plonge, le prisme s'ouvre autour de lui.
                  const target = !dive
                    ? p
                    : on
                      ? { x: [0, 0, dive.x], y: [0, 0, dive.y], z: 0, rotateX: 0, rotateY: 0, opacity: 1, scale: [1, 0.93, dive.s] }
                      : c.dx
                        ? { ...p, x: box.w * 2.6, rotateY: 88, opacity: 0 }
                        : { ...p, y: Math.sign(c.dy) * box.h * 2.2, rotateX: Math.sign(c.dy) * -160, opacity: 0 };
                  const move = reduce
                    ? { duration: 0 }
                    : !dive
                      ? SPRING
                      : on
                        ? { duration: DIVE_S, times: [0, 0.24, 1], ease: ["easeOut", [0.7, 0, 0.84, 0]] as ("easeOut" | [number, number, number, number])[] }
                        : { duration: 0.55, ease: [0.6, 0, 0.9, 0.2] as [number, number, number, number], delay: Math.abs(c.dy) * 0.04 };
                  return (
                    <motion.div
                      key={c.key}
                      className={`stg-card ${on ? "is-on" : ""}`}
                      initial={{ ...p, opacity: 0, scale: on ? 0.94 : 1 }}
                      animate={target}
                      exit={{ opacity: 0, transition: { duration: 0.3 } }}
                      transition={move}
                      style={{ zIndex: on ? 3 : 1, pointerEvents: p.opacity ? "auto" : "none" }}
                      onClick={on ? undefined : () => (c.dx ? pick(c.ti) : turn(c.dy))}
                      aria-hidden={!on}
                    >
                      <img src={c.clip.still} alt="" draggable={false} decoding="async" style={c.clip.pos ? { objectPosition: c.clip.pos } : undefined} />
                      {on && c.clip.video && live && !reduce ? <Clip key={c.clip.id} video={c.clip.video} sound={sound} /> : null}
                      {on ? (
                        <span className="stg-play" aria-hidden>
                          <Play size={22} fill="currentColor" />
                        </span>
                      ) : null}
                      {on && dive ? <i className="stg-dive" style={{ animationDuration: `${DIVE_S}s` }} aria-hidden /> : null}
                    </motion.div>
                  );
                })
              : null}
          </AnimatePresence>
        </motion.div>

        {/* Axe vertical : les autres génériques du même tournoi. */}
        {many ? (
          <div className="stg-vert">
            <button type="button" onClick={() => turn(-1)} aria-label="Générique précédent">
              <ChevronUp size={16} />
            </button>
            <span aria-hidden>
              {cur.clips.map((c, k) => (
                <i key={c.id} className={k === at(cur) ? "is-on" : ""} />
              ))}
            </span>
            <button type="button" onClick={() => turn(1)} aria-label="Générique suivant">
              <ChevronDown size={16} />
            </button>
          </div>
        ) : null}

        <div className="stg-cap">
          <AnimatePresence mode="wait" initial={false}>
            <motion.p key={clip.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE, delay: 0.15 } }} exit={{ opacity: 0, transition: { duration: 0.12 } }}>
              <b>{clip.title}</b>
              {clip.sub ? <span>{clip.sub}</span> : null}
            </motion.p>
          </AnimatePresence>
          {clip.video ? (
            <button type="button" className={`stg-sound ${sound ? "is-on" : ""}`} aria-pressed={sound} aria-label={sound ? "Couper le son" : "Écouter"} onClick={() => setSound((s) => !s)}>
              {sound ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </button>
          ) : null}
        </div>
      </div>

      {/* Axe horizontal : les huit tournois. Le trait montre ta partie. */}
      <div className="stg-rail">
        <div className="stg-segs" role="tablist" aria-label="Tournois">
          {items.map((it, k) => (
            <button key={it.slug} type="button" role="tab" aria-selected={k === i} className={`stg-seg ${k === i ? "is-on" : ""}`} style={{ "--sc": it.accent } as React.CSSProperties} onClick={() => (k === i ? go() : pick(k))}>
              <i>
                {it.run ? <u style={{ transform: `scaleX(${it.run.done / Math.max(1, it.run.total)})` }} /> : null}
                {k === i && !touched && live && !reduce ? <s style={{ animationDuration: `${IDLE_MS}ms` }} /> : null}
              </i>
              {it.short}
            </button>
          ))}
        </div>
        <div className="stg-arrows">
          <button type="button" onClick={() => pick(i - 1)} aria-label="Tournoi précédent">
            <ChevronLeft size={17} />
          </button>
          <button type="button" onClick={() => pick(i + 1)} aria-label="Tournoi suivant">
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

// La vidéo de l'écran du centre : démarre au refrain, apparaît quand elle joue.
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
