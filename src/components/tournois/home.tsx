import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { champion, currentMatch, roundName } from "@/lib/tournois/bracket";
import { computeRows, rowsFromSite, sortRows, type SiteStats } from "@/lib/tournois/stats";
import { fetchStats } from "@/lib/versusStats.js";
import { useClientDraw } from "@/lib/tournois/client-draw";
import { useTournament } from "./provider";
import { Thumb, Visual } from "./visual";

const dateFmt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long" });

export function TournamentHome() {
  const { meta, participants, byId, saved } = useTournament();
  const preview = useClientDraw(`${meta.slug}:home`, participants, 2) ?? [];
  const run = saved.run;
  const cur = run ? currentMatch(run.rounds) : null;
  const finished = run ? champion(run.rounds) : null;
  const done = run ? run.rounds.reduce((n, r) => n + r.matches.filter((m) => m.status === "closed" && m.left && m.right).length, 0) : 0;
  const total = run ? run.size - 1 : 0;
  const last = saved.champions[0];
  const lastP = last ? byId.get(last.id) : null;
  const groups = useMemo(() => new Set(participants.map((p) => p.group)).size, [participants]);
  // Les plus choisis sur le site (tous les joueurs) ; à défaut, tes propres choix.
  const [site, setSite] = useState<SiteStats | null>(null);
  useEffect(() => {
    let on = true;
    if (meta.statsId) fetchStats(meta.statsId).then((m: SiteStats | null) => on && setSite(m));
    return () => {
      on = false;
    };
  }, [meta.statsId]);
  const sitePopular = useMemo(() => (site ? sortRows(rowsFromSite(site, participants, null), "rate").filter((r) => r.rate != null).slice(0, 6) : []), [site, participants]);
  const localPopular = useMemo(() => sortRows(computeRows(saved.votes, participants, null), "rank").filter((r) => r.wins > 0).slice(0, 6), [saved.votes, participants]);
  const fromSite = sitePopular.length > 0;
  const popular = fromSite ? sitePopular : localPopular;
  const base = `/tournoi/${meta.path}`;

  return (
    <div className="t-home">
      <section className="t-home-hero">
        <div className="t-setup-bg" aria-hidden>
          {preview.map((p, i) => (
            <div key={p.id} className={`t-setup-half t-setup-half--${i ? "right" : "left"}`}>
              <Visual p={p} posterAt={meta.posterAt} />
            </div>
          ))}
        </div>
        <div className="t-home-copy">
          <p className="t-eyebrow">{meta.signature}</p>
          <h1 className="t-setup-title">{meta.title}</h1>
          <p className="t-lead">{meta.lead}</p>
          <div className="t-home-ctas">
            <Link to={`${base}/duel`} className="t-go">
              {run && !finished ? "Reprendre ma partie" : "Participer au tournoi"}
            </Link>
            <Link to={`${base}/classement`} className="t-ghost">
              Découvrir le classement
            </Link>
          </div>
          <dl className="t-facts">
            <div>
              <dt>Participants</dt>
              <dd>{participants.length}</dd>
            </div>
            <div>
              <dt>{meta.groupLabel}</dt>
              <dd>{groups}</dd>
            </div>
            <div>
              <dt>Formats</dt>
              <dd>{meta.formats.join(", ")}</dd>
            </div>
          </dl>
        </div>
      </section>

      <div className="t-home-grid">
        <section className="t-panel">
          <h2>Ta partie</h2>
          {run && cur ? (
            <>
              <p className="t-panel-big">{roundName(cur.round.size)}</p>
              <p className="t-panel-sub">
                {done} duel{done > 1 ? "s" : ""} joué{done > 1 ? "s" : ""} sur {total}, {total - done} restant{total - done > 1 ? "s" : ""}
              </p>
              <div className="t-meter" aria-hidden>
                <i style={{ transform: `scaleX(${total ? done / total : 0})` }} />
              </div>
              <Link to={`${base}/duel`} className="t-link">
                Reprendre au duel {done + 1}
              </Link>
            </>
          ) : finished ? (
            <>
              <p className="t-panel-big">Terminée</p>
              <p className="t-panel-sub">Champion : {finished.title}</p>
              <Link to={`${base}/duel`} className="t-link">
                Voir le résultat
              </Link>
            </>
          ) : (
            <p className="t-panel-sub">Aucune partie en cours. Lance un tournoi pour commencer.</p>
          )}
        </section>

        <section className="t-panel">
          <h2>Dernier champion</h2>
          {lastP ? (
            <div className="t-mini">
              <Thumb p={lastP} />
              <span>
                <b>{lastP.title}</b>
                <small>
                  {lastP.sub}, le {dateFmt.format(last.at)} sur {last.size} {meta.unit}
                </small>
              </span>
            </div>
          ) : (
            <p className="t-panel-sub">Pas encore de champion : termine une partie pour le voir ici.</p>
          )}
        </section>

        <section className="t-panel t-panel--wide">
          <h2>{fromSite ? "Les plus choisis sur le site" : "Ce que tu choisis le plus"}</h2>
          {popular.length ? (
            <ol className="t-rank-list">
              {popular.map((r, i) => (
                <li key={r.p.id}>
                  <span className="t-rank-n">{i + 1}</span>
                  <Thumb p={r.p} />
                  <span className="t-rank-t">
                    <b>{r.p.title}</b>
                    <small>{r.p.sub}</small>
                  </span>
                  <span className="t-rank-v">
                    {fromSite ? `${r.rate} % de victoires sur ${r.duels} duels` : `${r.wins} victoire${r.wins > 1 ? "s" : ""}`}
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="t-panel-sub">Rien encore : ce classement se remplit avec les votes.</p>
          )}
        </section>
      </div>
    </div>
  );
}
