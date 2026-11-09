import { motion, useReducedMotion } from "framer-motion";
import { useState } from "react";
import type { Participant } from "@/lib/tournois/types";
import type { IDENTITIES, FightSlug } from "../identities";

// Tableau « fantôme » quand aucune partie n'est lancée : seize vrais
// participants du pool à gauche, les traits se tracent tour par tour jusqu'à
// la place du champion, encore vide. Ça montre ce qui t'attend.

const N = 16;
const ROW = 34;
const COL = 120;
const SLOT = 26;
const TEXT = 150; // largeur de la première colonne (vignette + nom)
// Abscisse de la colonne du tour r ; les traits partent du bord droit (end).
const xOf = (r: number) => (r === 0 ? 0 : TEXT + 24 + (r - 1) * COL + 40);
const endOf = (r: number) => (r === 0 ? TEXT : xOf(r) + SLOT);
const W = xOf(4) + 120;
const H = N * ROW;

export function GhostRoad({ id, participants }: { id: (typeof IDENTITIES)[FightSlug]; participants: Participant[] }) {
  const reduce = !!useReducedMotion();
  const [seed] = useState(() => [...participants].sort(() => Math.random() - 0.5).slice(0, N));
  const rounds = [16, 8, 4, 2, 1];
  // Centre vertical du k-ième emplacement du tour r.
  const cy = (r: number, k: number) => (k * 2 ** r + (2 ** r - 1) / 2) * ROW + ROW / 2;
  const paths: { d: string; r: number }[] = [];
  for (let r = 0; r < 4; r++)
    for (let k = 0; k < rounds[r]; k++) {
      const x0 = endOf(r) + 6;
      const x1 = xOf(r + 1);
      const xm = (x0 + x1) / 2;
      const y0 = cy(r, k);
      const y1 = cy(r + 1, Math.floor(k / 2));
      paths.push({ d: `M${x0} ${y0} H${xm} V${y1} H${x1}`, r });
    }
  const champX = xOf(4);
  const champY = cy(4, 0);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Aperçu d'un tableau de seize" style={{ width: "100%", maxWidth: 820, height: "auto", overflow: "visible" }}>
      <defs>
        {seed.map((p, k) => (
          <clipPath key={p.id} id={`gr-c${k}`}>
            <rect x={0} y={cy(0, k) - SLOT / 2} width={SLOT} height={SLOT} rx={6} />
          </clipPath>
        ))}
        <filter id="gr-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="8" />
        </filter>
      </defs>
      {paths.map((p, k) => (
        <motion.path
          key={k}
          d={p.d}
          fill="none"
          stroke={p.r === 3 ? id.a : "rgba(244,242,236,0.22)"}
          strokeWidth={1.2}
          initial={reduce ? false : { pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.25 + p.r * 0.35 + (k % 4) * 0.02, ease: [0.16, 1, 0.3, 1] }}
        />
      ))}
      {seed.map((p, k) => (
        <motion.g key={p.id} initial={reduce ? false : { opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: k * 0.03 }}>
          <image href={p.thumb} x={0} y={cy(0, k) - SLOT / 2} width={SLOT} height={SLOT} preserveAspectRatio="xMidYMid slice" clipPath={`url(#gr-c${k})`} opacity={0.85} />
          <text x={SLOT + 14} y={cy(0, k) + 4} fill="rgba(244,242,236,0.55)" fontSize={11} fontFamily="Inter, system-ui, sans-serif">
            {p.group.length > 16 ? `${p.group.slice(0, 15)}…` : p.group}
          </text>
        </motion.g>
      ))}
      {/* Places des tours suivants, encore vides. */}
      {[1, 2, 3].map((r) =>
        Array.from({ length: rounds[r] }, (_, k) => (
          <motion.rect
            key={`${r}-${k}`}
            x={xOf(r)}
            y={cy(r, k) - SLOT / 2}
            width={SLOT}
            height={SLOT}
            rx={6}
            fill="rgba(244,242,236,0.04)"
            stroke="rgba(244,242,236,0.16)"
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.5 + r * 0.35 }}
          />
        )),
      )}
      {/* Le champion : une place, la couleur du tournoi, un point d'interrogation. */}
      <motion.g initial={reduce ? false : { opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8, delay: 1.9, ease: [0.16, 1, 0.3, 1] }} style={{ transformOrigin: `${champX + 30}px ${champY}px` }}>
        <circle cx={champX + 30} cy={champY} r={30} fill={id.a} opacity={0.35} filter="url(#gr-glow)" />
        <rect x={champX} y={champY - 30} width={60} height={60} rx={14} fill="rgba(8,9,13,0.9)" stroke={id.a} strokeWidth={1.5} />
        <text x={champX + 30} y={champY + 11} textAnchor="middle" fill={id.a} fontSize={30} fontWeight={800} fontFamily="'Bricolage Grotesque', system-ui, sans-serif">
          ?
        </text>
        <text x={champX + 30} y={champY + 52} textAnchor="middle" fill="rgba(244,242,236,0.6)" fontSize={10} letterSpacing="0.2em" fontFamily="Inter, system-ui, sans-serif">
          CHAMPION
        </text>
      </motion.g>
    </svg>
  );
}
