import { motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";

// Le choix de l'arène : une bande par tournoi, ses deux camps en bichromie de
// part et d'autre de la lame. Au survol la bande s'ouvre, les photos
// reprennent leurs couleurs et la lame s'allume.

export type Arena = {
  id: string;
  title: string;
  tagline: string;
  to: string;
  images: [string, string];
  /** « 269 OST », « 32 Bankai »… */
  count?: string;
  /** « Partie en cours · Quarts », « Champion : … » */
  status?: string;
  kind: string;
};

const EASE = [0.16, 1, 0.3, 1] as const;

export function ArenaList({ arenas }: { arenas: Arena[] }) {
  const reduce = useReducedMotion();
  return (
    <ol className="ar-arenas">
      {arenas.map((a, i) => (
        <motion.li
          key={a.id}
          initial={reduce ? false : { opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.8, ease: EASE, delay: (i % 3) * 0.06 }}
        >
          <Link to={a.to} className="ar-arena">
            <span className="ar-arena-media" aria-hidden>
              <span className="ar-arena-half is-red">
                <img src={a.images[0]} alt="" loading="lazy" decoding="async" />
              </span>
              <span className="ar-arena-half is-blue">
                <img src={a.images[1]} alt="" loading="lazy" decoding="async" />
              </span>
              <i className="ar-arena-blade" />
            </span>
            <span className="ar-arena-n" aria-hidden>
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className="ar-arena-txt">
              <small>{a.kind}</small>
              <b>{a.title}</b>
              <em>{a.tagline}</em>
            </span>
            <span className="ar-arena-meta">
              {a.count ? <span>{a.count}</span> : null}
              {a.status ? <span className="is-live">{a.status}</span> : null}
              <span className="ar-arena-go">
                Entrer <ArrowUpRight size={16} />
              </span>
            </span>
          </Link>
        </motion.li>
      ))}
    </ol>
  );
}
