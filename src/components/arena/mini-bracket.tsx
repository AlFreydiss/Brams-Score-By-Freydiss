import { motion, useReducedMotion } from "framer-motion";
import { Crown } from "lucide-react";
import type { Participant } from "@/lib/tournois/types";

// Aperçu du tableau : quatre OST par camp, les tours suivants en « ? », la
// couronne au centre. Les traits se tracent une fois, à l'arrivée à l'écran.

const W = 1000;
const H = 260;
const THUMB = [40, 100, 160, 220];
const MID = [70, 190];
const X = { t: 70, m: 235, s: 385, c: 500 };

function link(x1: number, y1: number, x2: number, y2: number) {
  const k = (x1 + x2) / 2;
  return `M${x1} ${y1} H${k} V${y2} H${x2}`;
}

export function MiniBracket({ left, right, label, value }: { left: Participant[]; right: Participant[]; label: string; value: string }) {
  const reduce = useReducedMotion();
  const mirror = (x: number) => W - x;
  const paths: { d: string; side: 0 | 1 }[] = [];
  for (const side of [0, 1] as const) {
    const fx = (x: number) => (side ? mirror(x) : x);
    const dir = side ? -1 : 1;
    THUMB.forEach((y, i) => paths.push({ d: link(fx(X.t) + dir * 44, y, fx(X.m) - dir * 22, MID[i >> 1]), side }));
    MID.forEach((y) => paths.push({ d: link(fx(X.m) + dir * 22, y, fx(X.s) - dir * 22, 130), side }));
    paths.push({ d: `M${fx(X.s) + dir * 22} 130 H${fx(X.c) - dir * 30}`, side });
  }
  const box = (x: number, y: number) => ({ left: `${(x / W) * 100}%`, top: `${(y / H) * 100}%` });

  return (
    <div className="ar-bracket">
      <p className="ar-bracket-phase">
        <span>{label}</span>
        <b>{value}</b>
      </p>
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
              transition={{ delay: 0.15 + (i % 7) * 0.08, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            />
          ))}
        </svg>
        {[left, right].map((list, side) =>
          THUMB.map((y, i) => {
            const p = list[i];
            const x = side ? mirror(X.t) : X.t;
            return (
              <span key={`${side}-${i}`} className={`ar-b-thumb ${side ? "is-blue" : "is-red"}`} style={box(x, y)}>
                {p ? <img src={p.thumb} alt={p.title} title={`${p.title} · ${p.sub ?? p.group}`} loading="lazy" decoding="async" /> : null}
              </span>
            );
          }),
        )}
        {[0, 1].flatMap((side) => [
          ...MID.map((y, i) => (
            <span key={`m${side}${i}`} className={`ar-b-q ${side ? "is-blue" : "is-red"}`} style={box(side ? mirror(X.m) : X.m, y)}>
              ?
            </span>
          )),
          <span key={`s${side}`} className={`ar-b-q ${side ? "is-blue" : "is-red"}`} style={box(side ? mirror(X.s) : X.s, 130)}>
            ?
          </span>,
        ])}
        <motion.span
          className="ar-b-crown"
          style={box(X.c, 130)}
          initial={reduce ? false : { scale: 0.4, opacity: 0, rotate: -20 }}
          whileInView={{ scale: 1, opacity: 1, rotate: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ delay: 0.9, type: "spring", stiffness: 260, damping: 13 }}
        >
          <Crown size={20} />
        </motion.span>
      </div>
    </div>
  );
}
