import { animate, motion, useInView, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
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
              <dd>
                <Count value={s.n} />
              </dd>
              <dt>{s.label}</dt>
            </div>
          );
        })}
      </dl>
      {quote ? <p className="ar-quote">{quote}</p> : null}
    </div>
  );
}

/** Chiffre qui défile jusqu'à sa valeur à l'arrivée à l'écran (« +269 », « 1 546 »). */
function Count({ value }: { value: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const seen = useInView(ref, { once: true, margin: "-40px" });
  const reduce = useReducedMotion();
  const target = Number(value.replace(/[^\d]/g, ""));
  const prefix = value.match(/^\D*/)?.[0] ?? "";
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!seen || !target) return;
    if (reduce) return setN(target);
    const a = animate(0, target, { duration: 1.4, ease: [0.16, 1, 0.3, 1], onUpdate: (v) => setN(Math.round(v)) });
    return () => a.stop();
  }, [seen, target, reduce]);
  return <span ref={ref}>{target ? `${prefix}${n.toLocaleString("fr-FR")}` : value}</span>;
}
