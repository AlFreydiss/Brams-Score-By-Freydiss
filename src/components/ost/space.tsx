import { animate, motion, useMotionValue, useReducedMotion, useTransform, type AnimationPlaybackControls, type MotionValue } from "framer-motion";
import { createContext, useCallback, useContext, useEffect, useImperativeHandle, useLayoutEffect, useRef, type Ref } from "react";
import { T } from "./tokens";

// L'espace du tournoi : les plans côte à côte, une seule piste qui glisse.
//
// Le geste ne passe jamais par React : la position est une valeur animée
// (x, en px) posée en transform sur la piste ; le doigt la pilote en 1:1,
// puis un ressort la cale sur le plan visé en reprenant la vitesse du geste.
// Au-delà des bords, la piste résiste (élastique). React n'apprend le plan
// atteint qu'une fois le calage fini.
//
// Entrées : doigt et souris (glisser), trackpad (défilement horizontal),
// molette + Maj, flèches du clavier. Le défilement vertical d'un plan reste
// natif : le sens du geste est décidé dans les premiers pixels.

export type SpaceApi = { goTo: (i: number) => void };

type Ctx = {
  /** Position en plans : 0 = premier plan, 1,5 = entre le 2e et le 3e. */
  progress: MotionValue<number>;
  /** Largeur d'un plan, en px. */
  width: MotionValue<number>;
  goTo: (i: number) => void;
};
const SpaceContext = createContext<Ctx | null>(null);
export const useSpace = () => {
  const c = useContext(SpaceContext);
  if (!c) throw new Error("useSpace hors de SwipeSpace");
  return c;
};

const LOCK_PX = 7;
// Au-delà de cette vitesse (px/s), un geste court suffit à changer de plan.
const FLICK = 420;

/** Élastique des bords : la piste avance de moins en moins. */
function rubber(over: number, w: number) {
  const k = 0.5;
  return (1 - 1 / ((Math.abs(over) * k) / w + 1)) * w * Math.sign(over);
}

export function SwipeSpace({
  count,
  index,
  onSettle,
  onAim,
  apiRef,
  children,
  overlay,
}: {
  count: number;
  /** Plan affiché au montage et après une navigation extérieure (URL). */
  index: number;
  /** Le calage sur un plan est terminé. */
  onSettle: (i: number) => void;
  /** Plan visé au lâcher, avant le calage : les contenus peuvent déjà arriver. */
  onAim?: (i: number) => void;
  apiRef?: Ref<SpaceApi>;
  children: React.ReactNode;
  overlay?: React.ReactNode;
}) {
  const reduce = useReducedMotion();
  const root = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const width = useMotionValue(1);
  const progress = useTransform(() => -x.get() / Math.max(1, width.get()));
  const at = useRef(index);
  const anim = useRef<AnimationPlaybackControls | null>(null);
  const moving = useRef(false);
  // Numéro du calage en cours : un calage remplacé ne prévient personne.
  const seq = useRef(0);
  const cbs = useRef({ onSettle, onAim });
  cbs.current = { onSettle, onAim };

  const clampX = useCallback(
    (v: number) => {
      const w = width.get();
      const min = -(count - 1) * w;
      if (v > 0) return rubber(v, w);
      if (v < min) return min + rubber(v - min, w);
      return v;
    },
    [count, width],
  );

  const goTo = useCallback(
    (i: number, velocity = 0) => {
      const to = Math.max(0, Math.min(count - 1, i));
      at.current = to;
      cbs.current.onAim?.(to);
      anim.current?.stop();
      const target = -to * width.get();
      moving.current = true;
      const token = ++seq.current;
      const done = () => {
        if (token !== seq.current) return;
        moving.current = false;
        cbs.current.onSettle(to);
      };
      anim.current = animate(
        x,
        target,
        reduce ? { duration: 0.22, ease: T.ease.out, onComplete: done } : { ...T.spring.settle, velocity, restDelta: 0.5, restSpeed: 8, onComplete: done },
      );
    },
    [count, reduce, width, x],
  );

  useImperativeHandle(apiRef, () => ({ goTo: (i: number) => goTo(i) }), [goTo]);

  // Largeur réelle : la piste se recale sans animation au redimensionnement.
  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    const set = () => {
      width.set(el.clientWidth || 1);
      if (!moving.current) x.jump(-at.current * width.get());
    };
    set();
    const ro = new ResizeObserver(set);
    ro.observe(el);
    return () => ro.disconnect();
  }, [width, x]);

  // Navigation extérieure (retour arrière du navigateur, lien) : on y va.
  useEffect(() => {
    if (index !== at.current) goTo(index);
  }, [index, goTo]);

  // Glisser au doigt ou à la souris.
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    let start: { x: number; y: number; base: number; id: number } | null = null;
    let lock: "h" | "v" | null = null;
    let dragged = false;

    const down = (e: PointerEvent) => {
      if (e.button !== 0 || !e.isPrimary) return;
      const t = e.target as HTMLElement;
      if (t.closest("input, textarea, select, [data-noswipe]")) return;
      start = { x: e.clientX, y: e.clientY, base: x.get(), id: e.pointerId };
      lock = null;
      dragged = false;
    };
    const move = (e: PointerEvent) => {
      if (!start || e.pointerId !== start.id) return;
      const dx = e.clientX - start.x;
      const dy = e.clientY - start.y;
      if (!lock) {
        if (Math.abs(dx) < LOCK_PX && Math.abs(dy) < LOCK_PX) return;
        lock = Math.abs(dx) > Math.abs(dy) * 1.15 ? "h" : "v";
        if (lock === "v") return;
        // On reprend la piste là où elle est, même en plein calage.
        anim.current?.stop();
        seq.current++;
        moving.current = false;
        start.base = x.get() - dx;
        el.setPointerCapture(e.pointerId);
        el.dataset.drag = "";
      }
      if (lock !== "h") return;
      dragged = true;
      x.set(clampX(start.base + dx));
    };
    const up = (e: PointerEvent) => {
      if (!start || e.pointerId !== start.id) return;
      const wasH = lock === "h";
      start = null;
      lock = null;
      delete el.dataset.drag;
      if (wasH) settle();
    };
    const settle = () => {
      const w = width.get();
      const v = x.getVelocity();
      const here = -x.get() / w;
      let to = Math.round(here);
      if (Math.abs(v) > FLICK) to = v < 0 ? Math.ceil(here) : Math.floor(here);
      goTo(to, v);
    };
    // Un glisser ne vaut pas un clic sur ce qu'il y a dessous.
    const click = (e: MouseEvent) => {
      if (!dragged) return;
      dragged = false;
      e.stopPropagation();
      e.preventDefault();
    };

    // Trackpad (glissement horizontal) et molette + Maj.
    let wheelTimer = 0;
    let notchAt = 0;
    const wheel = (e: WheelEvent) => {
      const horiz = Math.abs(e.deltaX) > Math.abs(e.deltaY);
      if (!horiz && !e.shiftKey) return;
      e.preventDefault();
      const d = horiz ? e.deltaX : e.deltaY;
      // Molette à crans (souris) : un cran, un plan.
      if (!horiz && e.deltaMode !== 0) {
        const now = performance.now();
        if (now - notchAt > 380) goTo(at.current + Math.sign(d));
        notchAt = now;
        return;
      }
      if (!horiz && Math.abs(d) >= 50 && Number.isInteger(d)) {
        const now = performance.now();
        if (now - notchAt > 380) goTo(at.current + Math.sign(d));
        notchAt = now;
        return;
      }
      anim.current?.stop();
      seq.current++;
      moving.current = false;
      x.set(clampX(x.get() - d));
      clearTimeout(wheelTimer);
      wheelTimer = window.setTimeout(settle, 90);
    };

    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    el.addEventListener("click", click, true);
    el.addEventListener("wheel", wheel, { passive: false });
    return () => {
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
      el.removeEventListener("click", click, true);
      el.removeEventListener("wheel", wheel);
      clearTimeout(wheelTimer);
    };
  }, [clampX, goTo, width, x]);

  // Flèches du clavier.
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      const t = e.target as HTMLElement | null;
      // Un groupe de choix (taille du tableau) garde ses flèches.
      if (t?.closest("input, textarea, select, [contenteditable], [role=radiogroup]")) return;
      if (e.key === "ArrowRight") goTo(at.current + 1);
      else if (e.key === "ArrowLeft") goTo(at.current - 1);
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [goTo]);

  return (
    <SpaceContext.Provider value={{ progress, width, goTo: (i: number) => goTo(i) }}>
      <div ref={root} className="ox-space">
        <motion.div className="ox-track" style={{ x, ["--ox-count" as string]: count }}>
          {children}
        </motion.div>
        {overlay}
      </div>
    </SpaceContext.Provider>
  );
}

const PlaneContext = createContext<MotionValue<number> | null>(null);

/** Un plan de l'espace. offset = 0 quand il est en place, ±1 quand il est à côté. */
export function Plane({ i, label, children, scrollRef }: { i: number; label: string; children: React.ReactNode; scrollRef?: Ref<HTMLDivElement> }) {
  const { progress } = useSpace();
  const offset = useTransform(progress, (p) => p - i);
  return (
    <PlaneContext.Provider value={offset}>
      <section className="ox-plane" aria-label={label} ref={scrollRef}>
        {children}
      </section>
    </PlaneContext.Provider>
  );
}

/**
 * Parallaxe pendant le geste : depth > 0 avance plus vite que le plan,
 * depth < 0 traîne derrière. Aucun mouvement au repos.
 */
export function Depth({ depth, children, className, style }: { depth: number; children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  const offset = useContext(PlaneContext);
  const { width } = useSpace();
  const reduce = useReducedMotion();
  const x = useTransform(() => (reduce || !offset ? 0 : -(offset.get() * width.get() * depth)));
  return (
    <motion.div className={className} style={{ ...style, x }}>
      {children}
    </motion.div>
  );
}
