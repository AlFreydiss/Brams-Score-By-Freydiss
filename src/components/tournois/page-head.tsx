import { useTournament } from "./provider";
import { universeOf } from "./art";

// En-tête commun des pages d'un tournoi : l'univers en petites capitales
// avec un filet à la couleur du tournoi, le titre, une phrase.
export function PageHead({ title, sub, children }: { title: string; sub?: React.ReactNode; children?: React.ReactNode }) {
  const { meta } = useTournament();
  return (
    <div className="t-page-head pg-head">
      <p className="pg-kicker">
        <span aria-hidden />
        {universeOf(meta.slug) ?? meta.title}
      </p>
      <h1 className="t-page-title">{title}</h1>
      {sub ? <p className="t-panel-sub pg-sub">{sub}</p> : null}
      {children}
    </div>
  );
}
