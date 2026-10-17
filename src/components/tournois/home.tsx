import { Pause, Play } from "lucide-react";
import { de, fill } from "@/lib/tournois/catalog";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { champion, currentMatch, roundName } from "@/lib/tournois/bracket";
import { useClientDraw } from "@/lib/tournois/client-draw";
import { computeRows, rowsFromSite, sortRows, type SiteStats } from "@/lib/tournois/stats";
import { fetchStats } from "@/lib/versusStats.js";
import { useTournament } from "./provider";
import { PosterScene, useNarrow } from "./poster";
import { Thumb } from "./visual";

const dateFmt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long" });
const LINEUP = 24;
const SHORT: Record<number, string> = { 2: "Finale", 4: "Demies", 8: "Quarts", 16: "8es", 32: "16es", 64: "32es", 128: "64es", 256: "128es" };

// Accueil d'un tournoi : une affiche dans son univers (un duel à l'affiche,
// coupé comme les vrais duels), puis le programme à écouter, la
// programmation (qui est dans le tournoi, en têtes d'affiche), ta partie, le
// dernier champion et le classement. Les blocs vides ne s'affichent pas.
export function TournamentHome() {
  const { meta, participants, byId, saved, player, listen } = useTournament();
  const narrow = useNarrow();
  const preview = useClientDraw(`${meta.slug}:home`, participants, 2) ?? [];
  const rail = useClientDraw(`${meta.slug}:rail`, participants, 18) ?? [];
  const audio = meta.mode === "audio";
  const base = `/tournoi/${meta.path}`;

  const run = saved.run;
  const cur = run ? currentMatch(run.rounds) : null;
  const finished = run ? champion(run.rounds) : null;
  const done = run ? run.rounds.reduce((n, r) => n + r.matches.filter((m) => m.status === "closed" && m.left && m.right).length, 0) : 0;
  const total = run ? run.size - 1 : 0;
  const last = saved.champions[0];
  const lastP = last ? byId.get(last.id) : null;
  const lineup = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of participants) m.set(p.group, (m.get(p.group) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "fr"));
  }, [participants]);
  const groups = lineup.length;

  // Stats du site (tous les joueurs) ; à défaut, tes propres choix.
  const [site, setSite] = useState<SiteStats | null>(null);
  useEffect(() => {
    let on = true;
    if (meta.statsId) fetchStats(meta.statsId).then((m: SiteStats | null) => on && setSite(m));
    return () => {
      on = false;
    };
  }, [meta.statsId]);
  const siteRows = useMemo(() => (site ? rowsFromSite(site, participants, null) : []), [site, participants]);
  const siteDuels = siteRows.reduce((n, r) => n + r.wins, 0);
  const sitePopular = useMemo(
    () =>
      sortRows(siteRows, "rate")
        .filter((r) => r.rate != null)
        .slice(0, 8),
    [siteRows],
  );
  const localPopular = useMemo(
    () =>
      sortRows(computeRows(saved.votes, participants, null), "rank")
        .filter((r) => r.wins > 0)
        .slice(0, 8),
    [saved.votes, participants],
  );
  const fromSite = sitePopular.length > 0;
  const popular = fromSite ? sitePopular : localPopular;

  return (
    <div className="t-home" data-seam={meta.seam}>
      <section className={`t-hero ${narrow ? "is-v" : "is-h"}`}>
        <PosterScene pair={preview} />
        <div className="t-hero-copy">
          <p className="t-eyebrow">{meta.signature}</p>
          <h1 className="t-hero-title">{meta.title}</h1>
          <p className="t-lead">{fill(meta.lead, participants)}</p>
          <div className="t-home-ctas">
            <Link to={`${base}/duel`} className="t-go">
              {run && !finished ? `Reprendre ma partie, duel ${done + 1}` : "Participer au tournoi"}
            </Link>
            <Link to={`${base}/classement`} className="t-ghost">
              Découvrir le classement
            </Link>
          </div>
        </div>
        {preview.length === 2 ? (
          <p className="t-hero-bill">
            <span>À l’affiche</span>
            <b>{preview[0].title}</b>
            <i>contre</i>
            <b>{preview[1].title}</b>
          </p>
        ) : null}
      </section>

      <div className="t-home-body">
        <dl className="t-facts">
          <div>
            <dt>Participants</dt>
            <dd>{participants.length}</dd>
          </div>
          <div>
            <dt>{meta.groupLabel}</dt>
            <dd>{groups}</dd>
          </div>
          {site ? (
            <div>
              <dt>Duels joués sur le site</dt>
              <dd>{siteDuels.toLocaleString("fr-FR")}</dd>
            </div>
          ) : null}
          <div>
            <dt>Tes votes</dt>
            <dd>{saved.votes.length.toLocaleString("fr-FR")}</dd>
          </div>
        </dl>

        <section className="t-program">
          <div className="t-program-head">
            <h2>Au programme</h2>
            <p>{audio ? "Un aperçu du pool : écoute ce qui t’attend." : "Un aperçu du pool."}</p>
          </div>
          <ul className="t-rail">
            {rail.map((p) => {
              const playing = player.id === p.id && player.playing;
              const loading = player.id === p.id && player.loading;
              return (
                <li key={p.id} className={playing ? "is-playing" : ""}>
                  {audio ? (
                    <button
                      type="button"
                      className="t-rail-item"
                      onClick={() => listen(p)}
                      aria-pressed={playing}
                      aria-label={`${playing ? "Mettre en pause" : "Écouter"} ${p.title}`}
                    >
                      <span className="t-rail-img">
                        <Thumb p={p} />
                        <span className="t-rail-play">{playing ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}</span>
                      </span>
                      <b>{p.title}</b>
                      <small>{loading ? "Chargement…" : p.sub}</small>
                    </button>
                  ) : (
                    <div className="t-rail-item">
                      <span className="t-rail-img">
                        <Thumb p={p} />
                      </span>
                      <b>{p.title}</b>
                      <small>{p.sub}</small>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>

        {groups > 1 ? (
          <section className="t-lineup-wrap">
            <div className="t-program-head">
              <h2>La programmation</h2>
              <p>
                Par nombre {de(meta.unit)} dans le tournoi{groups > LINEUP ? ` (${LINEUP} ${meta.groupLabel.toLowerCase()} sur ${groups})` : ""}.
              </p>
            </div>
            <ul className="t-lineup">
              {lineup.slice(0, LINEUP).map(([g, n], i) => (
                <li key={g} className={i < 3 ? "is-head" : i < 9 ? "is-mid" : ""}>
                  {g}
                  <sup>{n}</sup>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {cur || lastP || popular.length ? (
          <div className="t-home-grid">
            {cur ? (
              <section className="t-panel t-panel--run">
                <h2>Ta partie</h2>
                {cur ? (
                  <>
                    <p className="t-panel-big">{roundName(cur.round.size)}</p>
                    <p className="t-panel-sub">
                      {done} duel{done > 1 ? "s" : ""} joué{done > 1 ? "s" : ""} sur {total}, {total - done} restant{total - done > 1 ? "s" : ""}
                    </p>
                    <ol className="t-rounds" aria-label="Tours de ta partie">
                      {run.rounds.map((r) => {
                        const state = r.size > cur.round.size ? "is-done" : r.size === cur.round.size ? "is-now" : "";
                        return (
                          <li key={r.id} className={state}>
                            {SHORT[r.size] ?? r.size}
                          </li>
                        );
                      })}
                    </ol>
                    <Link to={`${base}/duel`} className="t-go t-go--small">
                      Reprendre au duel {done + 1}
                    </Link>
                  </>
                ) : null}
              </section>
            ) : null}

            {lastP ? (
              <section className={`t-panel t-panel--champ ${cur ? "" : "is-solo"}`}>
                <h2>Dernier champion</h2>
                <figure className="t-champ-card">
                  <Thumb p={lastP} />
                  <figcaption>
                    <b>{lastP.title}</b>
                    <small>
                      {lastP.sub}, le {dateFmt.format(last.at)} sur {last.size} {meta.unit}
                    </small>
                    {finished?.id === lastP.id ? (
                      <Link to={`${base}/duel`} className="t-link">
                        Voir le résultat de la partie
                      </Link>
                    ) : null}
                  </figcaption>
                </figure>
              </section>
            ) : null}

            {popular.length ? (
              <section className="t-panel t-panel--wide">
                <h2>{fromSite ? "Les plus choisis sur le site" : "Ce que tu choisis le plus"}</h2>
                <ol className="t-best">
                  {popular.map((r, i) => (
                    <li key={r.p.id}>
                      <span className="t-rank-n">{i + 1}</span>
                      <Thumb p={r.p} />
                      <span className="t-rank-t">
                        <b>{r.p.title}</b>
                        <small>{r.p.sub}</small>
                      </span>
                      {fromSite ? (
                        <span className="t-best-bar" aria-label={`${r.rate} % de victoires sur ${r.duels} duels`}>
                          <i style={{ width: `${r.rate}%` }} />
                          <em>{r.rate} %</em>
                        </span>
                      ) : (
                        <span className="t-rank-v">
                          {r.wins} victoire{r.wins > 1 ? "s" : ""}
                        </span>
                      )}
                    </li>
                  ))}
                </ol>
              </section>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
