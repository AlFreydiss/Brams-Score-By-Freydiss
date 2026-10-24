import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Music2, Swords, Trophy } from "lucide-react";
import { Link } from "react-router-dom";
import type { Participant } from "@/lib/tournois/types";

const EASE = [0.16, 1, 0.3, 1] as const;

/** Rangée classée (OST populaires, têtes d'affiche) : cartes photo numérotées. */
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
          {title}
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
            <button type="button" className={`ar-rank-card ${playing === p.id ? "is-on" : ""}`} onClick={() => onPlay?.(p)} aria-label={`Écouter ${p.title}`}>
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

/** Bandeau de chiffres en bas d'affiche. */
export function StatStrip({ stats, quote }: { stats: { n: string; label: string; icon: "trophy" | "swords" | "music" }[]; quote?: string }) {
  const Icon = { trophy: Trophy, swords: Swords, music: Music2 };
  return (
    <div className="ar-stats">
      <dl>
        {stats.map((s) => {
          const I = Icon[s.icon];
          return (
            <div key={s.label}>
              <I size={20} aria-hidden />
              <dd>{s.n}</dd>
              <dt>{s.label}</dt>
            </div>
          );
        })}
      </dl>
      {quote ? <p className="ar-quote">{quote}</p> : null}
    </div>
  );
}
