import { motion, useReducedMotion } from "framer-motion";
import { Crown } from "lucide-react";
import type { Participant } from "@/lib/tournois/types";

// Le tableau en raccourci : la frise des tours (1/64 → finale), puis quatre
// OST par camp qui convergent vers la couronne. Les traits se tracent une
// fois, à l'arrivée à l'écran.

const PHASES = [
  [128, "1/64"],
  [64, "1/32"],
  [32, "1/16"],
  [16, "1/8"],
  [8, "Quarts"],
  [4, "Demies"],
  [2, "Finale"],
] as const;

const W = 1000;
const H = 260;
const THUMB = [40, 100, 160, 220];
const MID = [70, 190];
const X = { t: 70, m: 235, s: 385, c: 500 };

function link(x1: number, y1: number, x2: number, y2: number) {
  const k = (x1 + x2) / 2;
  return `M${x1} ${y1} H${k} V${y2} H${x2}`;
}

/** Un nœud du tableau : creux, puis plein de la couleur de son camp quand le signal passe. */
function Node({ side, at, delay }: { side: number; at: React.CSSProperties; delay: number }) {
  return (
    <motion.i
      className={`ar-b-node ${side ? "is-blue" : "is-red"}`}
      style={at}
      initial={{ scale: 1 }}
      whileInView={{ scale: [1, 1.7, 1] }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ delay, duration: 0.5, ease: "easeOut" }}
    >
      <motion.b initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true, margin: "-60px" }} transition={{ delay, duration: 0.2 }} />
    </motion.i>
  );
}

/**
 * @param current taille du tour en cours de ta partie (32 = 1/16…), ou rien.
 * @param size taille de ta partie : les tours plus larges n'en font pas partie.
 */
export function MiniBracket({ left, right, current, size }: { left: Participant[]; right: Participant[]; current?: number | null; size?: number | null }) {
  const reduce = useReducedMotion();
  const mirror = (x: number) => W - x;
  const paths: { d: string; side: 0 | 1 }[] = [];
  for (const side of [0, 1] as const) {
    const fx = (x: number) => (side ? mirror(x) : x);
    const dir = side ? -1 : 1;
    THUMB.forEach((y, i) => paths.push({ d: link(fx(X.t) + dir * 44, y, fx(X.m) - dir * 8, MID[i >> 1]), side }));
    MID.forEach((y) => paths.push({ d: link(fx(X.m) + dir * 8, y, fx(X.s) - dir * 8, 130), side }));
    paths.push({ d: `M${fx(X.s) + dir * 8} 130 H${fx(X.c) - dir * 26}`, side });
  }
  const box = (x: number, y: number) => ({ left: `${(x / W) * 100}%`, top: `${(y / H) * 100}%` });
  const phase = (s: number) => (!current ? "" : size && s > size ? "is-out" : s > current ? "is-done" : s === current ? "is-now" : "");

  return (
    <div className="ar-bracket">
      <ol className="ar-phases" aria-label="Tours du tournoi, du 1/64 à la finale">
        {PHASES.map(([s, label]) => (
          <li key={s} className={phase(s)} aria-current={s === current ? "step" : undefined}>
            {label}
          </li>
        ))}
      </ol>
      <div className="ar-bracket-field">
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden>
          {paths.map((p, i) => (
            <motion.path
              key={i}
              d={p.d}
              className={p.side ? "is-blue" : "is-red"}
              initial={reduce ? false : { pathLength: 0 }}
              whileInView={{ pathLength: 1 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ delay: 0.15 + (i % 7) * 0.08, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            />
          ))}
        </svg>
        {[left, right].map((list, side) =>
          THUMB.map((y, i) => {
            const p = list[i];
            return (
              <span key={`${side}-${i}`} className={`ar-b-thumb ${side ? "is-blue" : "is-red"}`} style={box(side ? mirror(X.t) : X.t, y)}>
                {p ? <img src={p.thumb} alt={p.title} title={`${p.title} · ${p.sub ?? p.group}`} loading="lazy" decoding="async" /> : null}
              </span>
            );
          }),
        )}
        {[0, 1].flatMap((side) => [
          ...MID.map((y, i) => <Node key={`m${side}${i}`} side={side} at={box(side ? mirror(X.m) : X.m, y)} delay={0.55 + i * 0.08} />),
          <Node key={`s${side}`} side={side} at={box(side ? mirror(X.s) : X.s, 130)} delay={0.85} />,
        ])}
        <motion.span
          className="ar-b-crown"
          style={box(X.c, 130)}
          initial={reduce ? false : { scale: 0.6, opacity: 0 }}
          whileInView={{ scale: 1, opacity: 1 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ delay: 0.9, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          <Crown size={18} strokeWidth={1.6} />
        </motion.span>
      </div>
    </div>
  );
}
