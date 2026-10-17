import { Crown } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { useTournament } from "./provider";

const LINKS = [
  { seg: "", label: "Accueil" },
  { seg: "duel", label: "Tournoi" },
  { seg: "tableau", label: "Tableau" },
  { seg: "classement", label: "Classement" },
  { seg: "historique", label: "Historique" },
  { seg: "favoris", label: "Favoris" },
  { seg: "essai", label: "Duel test" },
  { seg: "regles", label: "Règles" },
];

export function SubNav() {
  const { meta, saved } = useTournament();
  const path = useLocation().pathname.replace(/\/$/, "") || "/";
  const base = `/tournoi/${meta.path}`;
  const current = LINKS.find((l) => (l.seg ? `${base}/${l.seg}` : base) === path);

  // Les métadonnées des pages sont statiques (prérendu) : le titre précis de
  // l'onglet, avec le nom du tournoi, est posé ici.
  useEffect(() => {
    document.title = current && current.seg ? `${current.label} – ${meta.title} · Brams Community` : `${meta.title} · Brams Community`;
  }, [current, meta.title]);
  return (
    <nav className="t-subnav" aria-label={meta.title}>
      <Link to={base} className="t-brand">
        <Crown size={16} aria-hidden />
        <span className="t-brand-name">{meta.brand}</span>
        <span className="t-brand-sig">{meta.signature}</span>
      </Link>
      <div className="t-subnav-links">
        {LINKS.map((l) => {
          const href = l.seg ? `${base}/${l.seg}` : base;
          const active = path === href;
          const count = l.seg === "favoris" && saved.favorites.length ? saved.favorites.length : null;
          return (
            <Link key={l.seg} to={href} aria-current={active ? "page" : undefined} className={active ? "is-on" : ""}>
              {l.label}
              {count ? <span className="t-count">{count}</span> : null}
            </Link>
          );
        })}
      </div>
      <Link to="/tournoi" className="t-all">
        Tous les tournois
      </Link>
    </nav>
  );
}
