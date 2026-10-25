import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import type { Participant } from "@/lib/tournois/types";

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
          <li key={p.id}>
            <button
              type="button"
              className={`ar-rank-card ${playing === p.id ? "is-on" : ""}`}
              onClick={() => onPlay?.(p)}
              aria-label={`Écouter ${p.title}`}
            >
              <img src={p.thumb} alt="" loading="lazy" decoding="async" />
              <span className="ar-rank-n">{i + 1}</span>
              <span className="ar-rank-t">
                <b>{p.title}</b>
                <small>{p.sub ?? p.group}</small>
              </span>
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}
