import { Link } from "react-router-dom";
import { useMemo, useState } from "react";
import { roundName } from "@/lib/tournois/bracket";
import { actions } from "@/lib/tournois/store";
import { useTournament } from "./provider";
import { Thumb } from "./visual";
import { artOf } from "./art";
import { PageHead } from "./page-head";

const hour = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" });
const day = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" });
const secs = (ms: number) => `${(ms / 1000).toFixed(1).replace(".", ",")} s`;

// Historique de tes votes, regroupés par partie. Ce sont tes choix sur ce
// navigateur, pas des résultats officiels. En tête, quelques chiffres tirés
// de ces mêmes votes (rien d'inventé).
export function HistoryView() {
  const { meta, byId, saved } = useTournament();
  const [confirm, setConfirm] = useState(false);
  const parts = useMemo(() => {
    const m = new Map<number, typeof saved.votes>();
    for (const v of [...saved.votes].reverse()) m.set(v.run, [...(m.get(v.run) ?? []), v]);
    return [...m.entries()];
  }, [saved]);

  const stats = useMemo(() => {
    const votes = saved.votes;
    if (!votes.length) return null;
    const timed = votes.filter((v) => v.ms > 0);
    const fast = timed.length ? timed.reduce((a, b) => (b.ms < a.ms ? b : a)) : null;
    const avg = timed.length ? timed.reduce((n, v) => n + v.ms, 0) / timed.length : 0;
    const groups = new Map<string, number>();
    for (const v of votes) {
      const g = byId.get(v.winner)?.group;
      if (g) groups.set(g, (groups.get(g) ?? 0) + 1);
    }
    const top = [...groups.entries()].sort((a, b) => b[1] - a[1])[0];
    // Seulement s'il se détache (au moins deux fois gardé).
    const fav = top && top[1] >= 2 ? top : null;
    return { n: votes.length, parts: new Set(votes.map((v) => v.run)).size, fast, avg, fav };
  }, [saved.votes, byId]);

  return (
    <div className="t-page t-page--wide pg-history">
      <PageHead title="Historique" sub="Tes votes sur ce navigateur, du plus récent au plus ancien. Ils ne sont envoyés nulle part." />

      {stats ? (
        <dl className="pg-stats">
          <div>
            <dt>Votes</dt>
            <dd>{stats.n}</dd>
          </div>
          <div>
            <dt>Parties</dt>
            <dd>{stats.parts}</dd>
          </div>
          {stats.avg ? (
            <div>
              <dt>Temps moyen pour choisir</dt>
              <dd>{secs(stats.avg)}</dd>
            </div>
          ) : null}
          {stats.fav ? (
            <div>
              <dt>{meta.groupLabel.replace(/s$/, "")} que tu gardes le plus</dt>
              <dd className="pg-stats-txt">
                {stats.fav[0]} <small>{stats.fav[1]}×</small>
              </dd>
            </div>
          ) : null}
        </dl>
      ) : null}

      {parts.length === 0 ? (
        <div className="pg-empty">
          <p>Aucun vote pour l’instant. Chaque duel que tu tranches s’inscrit ici, avec le temps qu’il t’a fallu pour choisir.</p>
          <Link to={`/tournoi/${meta.path}/duel`} className="t-go">
            Participer au tournoi
          </Link>
        </div>
      ) : (
        parts.map(([run, votes]) => (
          <section key={run} className="pg-part" aria-label={`Partie du ${day.format(run)}`}>
            <header className="pg-part-head">
              <h2>Partie du {day.format(run)}</h2>
              <small>
                {votes.length} vote{votes.length > 1 ? "s" : ""}
              </small>
            </header>
            <ol className="pg-feed">
              {votes.map((v, k) => {
                const w = byId.get(v.winner);
                const l = byId.get(v.loser);
                if (!w || !l) return null;
                return (
                  <li key={`${v.at}-${v.matchId}`} className="pg-duel" style={{ "--i": Math.min(k, 12) } as React.CSSProperties}>
                    <span className="pg-duel-when">
                      <time dateTime={new Date(v.at).toISOString()}>{hour.format(v.at)}</time>
                      <small>{roundName(v.round)}</small>
                    </span>
                    <span className="pg-duel-win">
                      <img src={artOf(w, meta.slug)} alt="" loading="lazy" decoding="async" />
                      <span>
                        <small>{w.group}</small>
                        <b>{w.title}</b>
                      </span>
                    </span>
                    <span className="pg-duel-vs" aria-hidden>
                      plutôt que
                    </span>
                    <span className="pg-duel-lose">
                      <Thumb p={l} />
                      <span>
                        <b>{l.title}</b>
                        <small>{l.group}</small>
                      </span>
                    </span>
                    <span className="pg-duel-ms">{v.ms > 0 ? secs(v.ms) : ""}</span>
                  </li>
                );
              })}
            </ol>
          </section>
        ))
      )}
      {parts.length ? (
        <div className="t-danger">
          {confirm ? (
            <>
              <span>Effacer tout l’historique et les champions de ce tournoi ?</span>
              <button
                type="button"
                onClick={() => {
                  actions.clearHistory(meta.slug);
                  setConfirm(false);
                }}
              >
                Oui, tout effacer
              </button>
              <button type="button" onClick={() => setConfirm(false)}>
                Garder
              </button>
            </>
          ) : (
            <button type="button" onClick={() => setConfirm(true)}>
              Effacer l’historique
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
}
