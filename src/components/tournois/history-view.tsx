import { Link } from "react-router-dom";
import { useMemo, useState } from "react";
import { roundName } from "@/lib/tournois/bracket";
import { actions } from "@/lib/tournois/store";
import { useTournament } from "./provider";
import { Thumb } from "./visual";

const when = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const day = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" });

// Historique de tes votes, regroupés par partie. Ce sont tes choix sur ce
// navigateur, pas des résultats officiels.
export function HistoryView() {
  const { meta, byId, saved } = useTournament();
  const [confirm, setConfirm] = useState(false);
  const parts = useMemo(() => {
    const m = new Map<number, typeof saved.votes>();
    for (const v of [...saved.votes].reverse()) m.set(v.run, [...(m.get(v.run) ?? []), v]);
    return [...m.entries()];
  }, [saved]);

  return (
    <div className="t-page">
      <div className="t-page-head">
        <h1 className="t-page-title">Historique</h1>
        <p className="t-panel-sub">Tes votes sur ce navigateur, du plus récent au plus ancien. Ils ne sont envoyés nulle part.</p>
      </div>
      {parts.length === 0 ? (
        <div className="t-panel">
          <p className="t-panel-sub">Aucun vote pour l’instant.</p>
          <Link to={`/tournoi/${meta.path}/duel`} className="t-go">
            Participer au tournoi
          </Link>
        </div>
      ) : (
        parts.map(([run, votes]) => (
          <section key={run} className="t-panel">
            <h2>
              Partie du {day.format(run)} <small>{votes.length} vote{votes.length > 1 ? "s" : ""}</small>
            </h2>
            <ol className="t-history">
              {votes.map((v) => {
                const w = byId.get(v.winner);
                const l = byId.get(v.loser);
                if (!w || !l) return null;
                return (
                  <li key={`${v.at}-${v.matchId}`}>
                    <span className="t-history-when">
                      <time dateTime={new Date(v.at).toISOString()}>{when.format(v.at)}</time>
                      <small>{roundName(v.round)}</small>
                    </span>
                    <span className="t-history-pair">
                      <span className="t-mini is-win">
                        <Thumb p={w} />
                        <span>
                          <b>{w.title}</b>
                          <small>{w.sub}</small>
                        </span>
                      </span>
                      <span className="t-history-vs">plutôt que</span>
                      <span className="t-mini is-lose">
                        <Thumb p={l} />
                        <span>
                          <b>{l.title}</b>
                          <small>{l.sub}</small>
                        </span>
                      </span>
                    </span>
                    <span className="t-history-ms">{v.ms > 0 ? `${(v.ms / 1000).toFixed(1).replace(".", ",")} s` : ""}</span>
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
