import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";

// Le choix de l'arène : une bande par tournoi, deux photos de son catalogue
// côte à côte. Rien ne bouge à l'arrivée ; au survol la bande s'éclaire et
// une lumière suit la souris.

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

export function ArenaList({ arenas }: { arenas: Arena[] }) {
  return (
    <ol className="ar-arenas">
      {arenas.map((a, i) => (
        <li key={a.id}>
          <Link
            to={a.to}
            className="ar-arena"
            onPointerMove={(e) => {
              if (e.pointerType !== "mouse") return;
              const r = e.currentTarget.getBoundingClientRect();
              e.currentTarget.style.setProperty("--sx", `${e.clientX - r.left}px`);
              e.currentTarget.style.setProperty("--sy", `${e.clientY - r.top}px`);
            }}
          >
            <i className="ar-arena-spot" aria-hidden />
            <span className="ar-arena-media" aria-hidden>
              <span className="ar-arena-half is-red">
                <img src={a.images[0]} alt="" loading="lazy" decoding="async" />
              </span>
              <span className="ar-arena-half is-blue">
                <img src={a.images[1]} alt="" loading="lazy" decoding="async" />
              </span>
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
        </li>
      ))}
    </ol>
  );
}
