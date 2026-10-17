import { Pause, Play } from "lucide-react";
import { Link } from "react-router-dom";
import { useMemo, useState } from "react";
import { champion, ranking } from "@/lib/tournois/bracket";
import { actions } from "@/lib/tournois/store";
import { useTournament } from "./provider";
import { Thumb, Visual } from "./visual";

// Fin de partie : le champion en plein écran, puis le top 8 de la partie.
export function Champion() {
  const { meta, saved, player, listen } = useTournament();
  const run = saved.run;
  const champ = run ? champion(run.rounds) : null;
  const top = useMemo(() => (run ? ranking(run.rounds) : []), [run]);
  const [copied, setCopied] = useState(false);
  if (!run || !champ) return null;
  const audio = meta.mode === "audio";
  const playing = player.id === champ.id && player.playing;

  const copy = async () => {
    const lines = [`Mon top ${meta.title} sur Brams Community :`, ...top.slice(0, 4).map((r) => `${r.rank}. ${r.p.title} (${r.p.sub ?? r.p.group})`)];
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {}
  };

  return (
    <div className="t-champ">
      <div className="t-champ-hero">
        <div className="t-champ-media">
          <Visual p={champ} posterAt={meta.posterAt} alt="" />
        </div>
        <div className="t-champ-txt">
          <p className="t-kept">
            {meta.championLabel}, sur {run.size} {meta.unit}
          </p>
          <p className="t-sub">{champ.sub}</p>
          <h1 className={`t-title ${champ.title.length > 24 ? "is-long" : ""}`}>{champ.title}</h1>
          {champ.artist ? <p className="t-artist">{champ.artist}</p> : null}
          <div className="t-ctrl">
            {audio ? (
              <button type="button" className="t-btn t-btn--play" onClick={() => listen(champ)} aria-pressed={playing}>
                {playing ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
                <span>{playing ? "Pause" : "Réécouter"}</span>
              </button>
            ) : null}
            <button type="button" className="t-choose" onClick={() => actions.quit(meta.slug)}>
              Nouvelle partie
            </button>
          </div>
        </div>
      </div>

      <div className="t-champ-body">
        <section className="t-panel">
          <h2>Ton classement de la partie</h2>
          <ol className="t-rank-list">
            {top.map((r) => (
              <li key={r.p.id}>
                <span className="t-rank-n">{r.rank}</span>
                <Thumb p={r.p} />
                <span className="t-rank-t">
                  <b>{r.p.title}</b>
                  <small>{r.p.sub}</small>
                </span>
                {audio ? (
                  <button type="button" className="t-btn t-btn--icon" onClick={() => listen(r.p)} aria-label={`Écouter ${r.p.title}`}>
                    {player.id === r.p.id && player.playing ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
                  </button>
                ) : null}
              </li>
            ))}
          </ol>
        </section>
        <div className="t-champ-actions">
          <Link to={`/tournoi/${meta.path}/tableau`}>Voir le tableau</Link>
          <Link to={`/tournoi/${meta.path}/classement`}>Voir le classement</Link>
          <button type="button" onClick={copy}>
            {copied ? "Top copié" : "Copier mon top"}
          </button>
          {saved.undo ? (
            <button type="button" onClick={() => actions.undo(meta.slug)}>
              Rejouer la finale
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
