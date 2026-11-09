import { AnimatePresence, motion, useMotionValue, useSpring } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { fetchStats } from "@/lib/versusStats.js";
import type { Participant } from "@/lib/tournois/types";
import type { Player } from "../tournois/use-player";
import { EASE, FONT, LINE_2, PANEL, type Identity } from "./identities";

// Fonctions en plus de l'écran de duel : pronostic du site, série « en feu »,
// panneau des raccourcis, curseur du tournoi, boutons magnétiques, écoute
// alternée A/B.

type Side = "left" | "right";

// ── Pronostic du site ────────────────────────────────────────────────
// À partir des votes de toute la communauté (versus_stats) : la piste dont le
// taux de victoire (lissé) est le plus haut. Rien si l'une des deux a trop
// peu de duels pour qu'un pronostic veuille dire quelque chose.
export function usePrediction(statsId: string | undefined, left: Participant, right: Participant) {
  const [pick, setPick] = useState<{ side: Side; pct: number } | null>(null);
  useEffect(() => {
    let on = true;
    setPick(null);
    if (!statsId) return;
    fetchStats(statsId).then((m: Map<string, { wins: number; duels: number }> | null) => {
      if (!on || !m) return;
      const a = m.get(left.id);
      const b = m.get(right.id);
      if (!a || !b || a.duels < 3 || b.duels < 3) return;
      const ra = (a.wins + 1) / (a.duels + 2);
      const rb = (b.wins + 1) / (b.duels + 2);
      if (Math.abs(ra - rb) < 0.04) return;
      const side: Side = ra > rb ? "left" : "right";
      setPick({ side, pct: Math.round((Math.max(ra, rb) / (ra + rb)) * 100) });
    });
    return () => {
      on = false;
    };
  }, [statsId, left.id, right.id]);
  return pick;
}

// ── Série de votes ───────────────────────────────────────────────────
// Votes enchaînés sans pause de plus d'une minute, gardés pour la session.
const STREAK_KEY = "fight_streak";
export function bumpStreak(): number {
  try {
    const raw = sessionStorage.getItem(STREAK_KEY);
    const s = raw ? (JSON.parse(raw) as { n: number; at: number }) : { n: 0, at: 0 };
    const n = Date.now() - s.at < 60_000 ? s.n + 1 : 1;
    sessionStorage.setItem(STREAK_KEY, JSON.stringify({ n, at: Date.now() }));
    return n;
  } catch {
    return 0;
  }
}

/** « Tu es en feu » : une ligne de lumière qui traverse, le compte, puis s'efface. */
export function StreakBurst({ n, id }: { n: number; id: Identity }) {
  return (
    <motion.div
      role="status"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.4 } }}
      style={{ position: "absolute", inset: 0, zIndex: 45, display: "grid", placeItems: "center", pointerEvents: "none" }}
    >
      <motion.span
        aria-hidden
        initial={{ scaleX: 0, opacity: 0 }}
        animate={{ scaleX: [0, 1, 1], opacity: [0, 1, 0] }}
        transition={{ duration: 1.4, ease: EASE, times: [0, 0.45, 1] }}
        style={{ position: "absolute", left: 0, right: 0, top: "50%", height: 1, background: `linear-gradient(90deg, transparent, ${id.a}, transparent)`, boxShadow: `0 0 24px ${id.a}`, transformOrigin: "left" }}
      />
      <motion.div
        initial={{ opacity: 0, y: 14, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1, transition: { duration: 0.7, ease: EASE, delay: 0.15 } }}
        style={{ display: "grid", justifyItems: "center", gap: 10, padding: "20px 30px", borderRadius: 16, background: "rgba(14,16,20,0.92)", boxShadow: `inset 0 0 0 1px ${LINE_2}, 0 0 80px -20px ${id.a}`, color: id.ink, fontFamily: FONT.body }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 11, fontWeight: 600, letterSpacing: "0.22em", textTransform: "uppercase", color: id.a }}>
          <span aria-hidden style={{ width: 18, height: 1, background: id.a }} />
          Tu es en feu
        </span>
        <span style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 42, letterSpacing: "-0.035em", lineHeight: 1 }}>{n} votes d'affilée</span>
      </motion.div>
    </motion.div>
  );
}

// ── Panneau des raccourcis (touche ?) ────────────────────────────────
export function ShortcutsPanel({ open, onClose, id, alternate }: { open: boolean; onClose: () => void; id: Identity; alternate: boolean }) {
  const rows: [string, string][] = [
    ["A / B", "Garder la piste A ou B"],
    ["Espace", "Écouter ou mettre en pause"],
    ["← / →", "Choisir un côté (l'écoute suit)"],
    ...(alternate ? ([["C", "Écoute alternée A puis B, 7 s chacun"]] as [string, string][]) : []),
    ["Retour arrière", "Annuler le dernier choix"],
    ["T", "Ouvrir le tableau"],
    ["F", "Plein écran"],
    ["?", "Afficher ou masquer cette aide"],
  ];
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          role="dialog"
          aria-label="Raccourcis clavier"
          initial={{ opacity: 0, y: 10, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1, transition: { duration: 0.35, ease: EASE } }}
          exit={{ opacity: 0, y: 6, transition: { duration: 0.18 } }}
          onClick={onClose}
          style={{ position: "absolute", right: 18, top: 62, zIndex: 50, width: "min(360px, calc(100% - 36px))", padding: "16px 18px", borderRadius: 14, background: PANEL, boxShadow: `inset 0 0 0 1px ${LINE_2}, 0 30px 60px -30px rgba(0,0,0,0.9)`, color: id.ink, fontFamily: FONT.body }}
        >
          <p style={{ margin: "0 0 12px", display: "flex", alignItems: "center", gap: 10, fontSize: 11, fontWeight: 600, letterSpacing: "0.22em", textTransform: "uppercase", color: id.mute }}>
            <span aria-hidden style={{ width: 18, height: 1, background: id.a }} />
            Raccourcis
          </p>
          <dl style={{ margin: 0, display: "grid", gridTemplateColumns: "auto 1fr", gap: "9px 14px", fontSize: 13.5 }}>
            {rows.map(([k, v]) => (
              <div key={k} style={{ display: "contents" }}>
                <dt>
                  <kbd style={{ padding: "3px 7px", borderRadius: 6, boxShadow: `inset 0 0 0 1px ${LINE_2}`, fontFamily: "ui-monospace, monospace", fontSize: 11.5 }}>{k}</kbd>
                </dt>
                <dd style={{ margin: 0, color: "#cfccc5" }}>{v}</dd>
              </div>
            ))}
          </dl>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

// ── Curseur du tournoi ───────────────────────────────────────────────
// Un anneau fin qui suit la souris avec un léger retard et s'ouvre au-dessus
// de ce qui se clique. Le vrai curseur reste visible (accessibilité).
export function StageCursor({ id, host, tint }: { id: Identity; host: React.RefObject<HTMLElement | null>; tint?: string }) {
  const x = useMotionValue(-1000);
  const y = useMotionValue(-1000);
  // Ressort mou : la lueur traîne un peu derrière la souris, comme une lanterne qu'on porte.
  const sx = useSpring(x, { stiffness: 120, damping: 22, mass: 0.8 });
  const sy = useSpring(y, { stiffness: 120, damping: 22, mass: 0.8 });
  const [on, setOn] = useState(false);
  const [hot, setHot] = useState(false);
  useEffect(() => {
    const el = host.current;
    if (!el || !window.matchMedia("(pointer: fine)").matches || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      x.set(e.clientX - r.left);
      y.set(e.clientY - r.top);
      setHot(!!(e.target as HTMLElement | null)?.closest?.("button, a"));
    };
    const enter = () => setOn(true);
    const leave = () => setOn(false);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerenter", enter);
    el.addEventListener("pointerleave", leave);
    return () => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerenter", enter);
      el.removeEventListener("pointerleave", leave);
    };
  }, [host, x, y]);
  const c = tint ?? id.a;
  // Pas d'anneau sur le curseur : une lumière douce qui éclaire la scène là où on regarde.
  return (
    <motion.div
      aria-hidden
      animate={{ opacity: on ? (hot ? 0.55 : 1) : 0 }}
      transition={{ duration: 0.5, ease: EASE }}
      style={{ position: "absolute", left: 0, top: 0, x: sx, y: sy, width: 560, height: 560, marginLeft: -280, marginTop: -280, borderRadius: 999, background: `radial-gradient(circle, ${c}38 0%, ${c}14 32%, transparent 62%)`, mixBlendMode: "screen", pointerEvents: "none", zIndex: 11, transition: "background 0.6s ease" }}
    />
  );
}

// ── Bouton magnétique ────────────────────────────────────────────────
// Le bouton se laisse attirer un peu vers le curseur, puis revient au ressort.
export function Magnetic({ children, strength = 0.25 }: { children: React.ReactNode; strength?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 260, damping: 18 });
  const sy = useSpring(y, { stiffness: 260, damping: 18 });
  return (
    <motion.span
      ref={ref}
      style={{ display: "inline-flex", x: sx, y: sy }}
      onPointerMove={(e) => {
        if (e.pointerType !== "mouse") return;
        const r = ref.current?.getBoundingClientRect();
        if (!r) return;
        x.set((e.clientX - (r.left + r.width / 2)) * strength);
        y.set((e.clientY - (r.top + r.height / 2)) * strength);
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

// ── Écoute alternée ──────────────────────────────────────────────────
// A puis B, 7 s chacun, au même passage du morceau (0 s, 0 s, puis 7 s, 7 s…).
const AB_SEG = 7;
export function useAlternate(on: boolean, player: Player, left: Participant, right: Participant, onTurn: (s: Side) => void) {
  const ref = useRef(player);
  ref.current = player;
  const turnRef = useRef(onTurn);
  turnRef.current = onTurn;
  useEffect(() => {
    if (!on) return;
    let n = 0;
    const turn = () => {
      const pl = ref.current;
      const okL = !pl.failed.has(left.id);
      const okR = !pl.failed.has(right.id);
      if (!okL && !okR) return;
      const side: Side = (n % 2 === 0 && okL) || !okR ? "left" : "right";
      const p = side === "left" ? left : right;
      pl.play(p);
      const total = pl.getTime()?.total ?? 0;
      const span = total > 40 ? total : 28;
      const base = p.sound?.k === "video" ? (p.sound.hook ?? 0) : 0;
      pl.seek((base + Math.floor(n / 2) * AB_SEG) % Math.max(span, base + AB_SEG));
      turnRef.current(side);
      n++;
    };
    turn();
    const t = setInterval(turn, AB_SEG * 1000);
    return () => clearInterval(t);
  }, [on, left, right]);
}
