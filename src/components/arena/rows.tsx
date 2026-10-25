import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import type { Participant } from "@/lib/tournois/types";
import { Reveal } from "./reveal";

const EASE = [0.16, 1, 0.3, 1] as const;

/** Rangée classée (OST populaires, têtes d'affiche) : pochettes numérotées, sous une barre « titre · Voir tout ». */
export function RankRow({
  title,
  items,
  more,
  playing,
  onPlay,
}: {
  title: string;
  items: Participant[];
  more?: { label: string; to: string };
  playing?: string | null;
  onPlay?: (p: Participant) => void;
}) {
  const reduce = useReducedMotion();
  if (!items.length) return null;
  return (
    <div className="ar-rank">
      <div className="ar-rank-head">
        <h2>
          <i aria-hidden />
          <Reveal>{title}</Reveal>
        </h2>
        {more ? (
          <Link to={more.to}>
            {more.label} <ArrowRight size={14} />
          </Link>
        ) : null}
      </div>
      <ol className="ar-rank-list">
        {items.map((p, i) => (
          <motion.li
            key={p.id}
            initial={reduce ? false : { opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ delay: i * 0.07, duration: 0.7, ease: EASE }}
          >
            <button
              type="button"
              className={`ar-rank-card ${playing === p.id ? "is-on" : ""}`}
              onClick={() => onPlay?.(p)}
              aria-label={`Écouter ${p.title}`}
              // Inclinaison 3D qui suit la souris, remise à plat en sortant.
              onPointerMove={(e) => {
                if (e.pointerType !== "mouse" || reduce) return;
                const r = e.currentTarget.getBoundingClientRect();
                e.currentTarget.style.setProperty("--rx", `${((e.clientY - r.top) / r.height - 0.5) * -14}deg`);
                e.currentTarget.style.setProperty("--ry", `${((e.clientX - r.left) / r.width - 0.5) * 16}deg`);
              }}
              onPointerLeave={(e) => {
                e.currentTarget.style.setProperty("--rx", "0deg");
                e.currentTarget.style.setProperty("--ry", "0deg");
              }}
            >
              <img src={p.thumb} alt="" loading="lazy" decoding="async" />
              <span className="ar-rank-n">{i + 1}</span>
              <span className="ar-rank-t">
                <b>{p.title}</b>
                <small>{p.sub ?? p.group}</small>
              </span>
            </button>
          </motion.li>
        ))}
      </ol>
    </div>
  );
}
