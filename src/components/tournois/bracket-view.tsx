import { Pause, Play } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import { champion, currentMatch, roundName } from "@/lib/tournois/bracket";
import type { Match, Participant } from "@/lib/tournois/types";
import { useTournament } from "./provider";
import { Thumb } from "./visual";

const SHORT: Record<number, string> = { 2: "Finale", 4: "Demies", 8: "Quarts", 16: "Huitièmes", 32: "Seizièmes" };
const short = (size: number) => SHORT[size] ?? `${size / 2}es`;

// Tableau complet : une colonne par tour sur ordinateur, reliées par des
// traits comme un tableau imprimé, et le champion au bout. Un tour à la fois
// (onglets) sur mobile. Cliquer un duel affiche son détail.
export function BracketView() {
  const { meta, saved, player, listen } = useTournament();
  const run = saved.run;
  const cur = run ? currentMatch(run.rounds) : null;
  const champ = run ? champion(run.rounds) : null;
  const [tab, setTab] = useState<number | null>(null);
  const [sel, setSel] = useState<Match | null>(null);
  const nowRef = useRef<HTMLButtonElement>(null);
  const rounds = useMemo(() => run?.rounds ?? [], [run]);
  const activeTab = tab ?? cur?.round.size ?? rounds[0]?.size ?? 0;

  useEffect(() => {
    nowRef.current?.scrollIntoView({ block: "nearest", inline: "center" });
  }, []);

  if (!run) {
    return (
      <div className="t-page">
        <h1 className="t-page-title">Tableau</h1>
        <p className="t-panel-sub">Aucune partie en cours : le tableau apparaît dès que tu lances un tournoi.</p>
        <Link to={`/tournoi/${meta.path}/duel`} className="t-go">
          Lancer un tournoi
        </Link>
      </div>
    );
  }

  const firstSize = rounds[0]?.size;
  const entry = (m: Match, p: Participant | null, side: "left" | "right") => {
    const state = m.status !== "closed" || !m.winnerId ? "" : m.winnerId === p?.id ? "is-win" : "is-lose";
    if (!p) return <span className={`t-b-entry is-tbd`}>{m.status === "closed" ? "Exempt" : "À venir"}</span>;
    return (
      <span className={`t-b-entry ${state}`} data-side={side}>
        <Thumb p={p} />
        <span className="t-b-name">{p.title}</span>
        {state === "is-win" ? <span className="sr-only">(vainqueur)</span> : state === "is-lose" ? <span className="sr-only">(éliminé)</span> : null}
      </span>
    );
  };

  return (
    <div className="t-page t-page--wide">
      <div className="t-page-head">
        <h1 className="t-page-title">Tableau</h1>
        <p className="t-panel-sub">
          {run.size} {meta.unit}, élimination directe.{" "}
          {cur ? (
            <>
              En cours : {roundName(cur.round.size).toLowerCase()}.{" "}
              <Link to={`/tournoi/${meta.path}/duel`} className="t-link">
                Aller au duel
              </Link>
            </>
          ) : (
            "Partie terminée."
          )}
        </p>
      </div>

      <div className="t-b-tabs" role="tablist" aria-label="Tours">
        {rounds.map((r) => (
          <button key={r.id} type="button" role="tab" aria-selected={activeTab === r.size} className={activeTab === r.size ? "is-on" : ""} onClick={() => setTab(r.size)}>
            {short(r.size)}
          </button>
        ))}
      </div>

      {sel ? (
        <div className="t-b-detail" role="region" aria-label="Détail du duel">
          <p className="t-eyebrow">
            {roundName(sel.size)}, duel {sel.position + 1}
            {sel.id === cur?.match.id ? " (en cours)" : sel.status === "closed" ? " (terminé)" : " (à venir)"}
          </p>
          <div className="t-b-detail-row">
            {[sel.left, sel.right].map((p, i) =>
              p ? (
                <div key={p.id} className={`t-mini ${sel.winnerId ? (sel.winnerId === p.id ? "is-win" : "is-lose") : ""}`}>
                  <Thumb p={p} />
                  <span>
                    <b>{p.title}</b>
                    <small>
                      {p.sub}
                      {sel.winnerId === p.id ? ", passe au tour suivant" : ""}
                    </small>
                  </span>
                  {meta.mode === "audio" ? (
                    <button type="button" className="t-btn t-btn--icon" onClick={() => listen(p)} aria-label={`Écouter ${p.title}`}>
                      {player.id === p.id && player.playing ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
                    </button>
                  ) : null}
                </div>
              ) : (
                <div key={i} className="t-mini is-tbd">
                  <span>
                    <b>À venir</b>
                  </span>
                </div>
              ),
            )}
          </div>
          <button type="button" className="t-link" onClick={() => setSel(null)}>
            Fermer le détail
          </button>
        </div>
      ) : null}

      <div className="t-b-scroll">
        <div className="t-b-grid">
          {rounds.map((r) => (
            <section key={r.id} className={`t-b-col ${activeTab === r.size ? "is-tab" : ""}`} aria-label={roundName(r.size)}>
              <h2>{short(r.size)}</h2>
              <ol className="t-b-matches">
                {r.matches
                  .filter((m) => m.left || m.right || r.size < firstSize)
                  .map((m) => {
                    const now = m.id === cur?.match.id;
                    return (
                      <li key={m.id} className={m.status === "closed" && m.left && m.right ? "is-closed" : ""}>
                        <button
                          type="button"
                          ref={now ? nowRef : undefined}
                          className={`t-b-match ${now ? "is-now" : ""} ${m.status === "closed" ? "is-done" : ""}`}
                          onClick={() => setSel(m)}
                          aria-label={`${roundName(r.size)}, duel ${m.position + 1} : ${m.left?.title ?? "à venir"} contre ${m.right?.title ?? "à venir"}${now ? ", en cours" : ""}`}
                        >
                          {entry(m, m.left, "left")}
                          {entry(m, m.right, "right")}
                        </button>
                      </li>
                    );
                  })}
              </ol>
            </section>
          ))}
          <section className="t-b-col t-b-col--champ" aria-label="Champion">
            <h2>Champion</h2>
            <div className="t-b-matches">
              {champ ? (
                <div className="t-b-champ">
                  <Thumb p={champ} />
                  <b>{champ.title}</b>
                  <small>{champ.sub}</small>
                </div>
              ) : (
                <div className="t-b-champ is-tbd">À venir</div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
