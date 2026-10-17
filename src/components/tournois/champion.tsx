import { Pause, Play } from "lucide-react";
import { Link } from "react-router-dom";
import { useMemo, useState } from "react";
import { champion, ranking, roundName } from "@/lib/tournois/bracket";
import { actions } from "@/lib/tournois/store";
import type { Participant } from "@/lib/tournois/types";
import { useTournament } from "./provider";
import { Thumb, Visual } from "./visual";

// Temps passé sur un duel avant de choisir (écoute comprise).
function duration(ms: number) {
  const s = ms / 1000;
  if (s < 10) return `${s.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} s`;
  if (s < 60) return `${Math.round(s)} s`;
  const m = Math.floor(s / 60);
  return `${m} min ${String(Math.round(s % 60)).padStart(2, "0")}`;
}

// Fin de partie : le champion en plein écran, puis son parcours (qui il a
// battu à chaque tour) et le classement de la partie.
export function Champion() {
  const { meta, saved, player, listen } = useTournament();
  const run = saved.run;
  const champ = run ? champion(run.rounds) : null;
  const top = useMemo(() => (run ? ranking(run.rounds) : []), [run]);
  const path = useMemo(() => {
    if (!run || !champ) return [];
    const steps: { size: number; foe: Participant; ms: number | null }[] = [];
    for (const r of run.rounds)
      for (const m of r.matches) {
        if (m.status !== "closed" || m.winnerId !== champ.id || !m.left || !m.right) continue;
        const vote = saved.votes.find((v) => v.run === run.startedAt && v.matchId === m.id);
        steps.push({ size: r.size, foe: m.left.id === champ.id ? m.right : m.left, ms: vote?.ms ?? null });
      }
    return steps;
  }, [run, champ, saved.votes]);
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

  const listenBtn = (p: Participant) =>
    audio ? (
      <button type="button" className="t-btn t-btn--icon" onClick={() => listen(p)} aria-label={`${player.id === p.id && player.playing ? "Mettre en pause" : "Écouter"} ${p.title}`}>
        {player.id === p.id && player.playing ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
      </button>
    ) : null;

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
        {path.length ? (
          <section className="t-champ-sec">
            <h2>Son parcours</h2>
            <ol className="t-path">
              {path.map((s, i) => (
                <li key={s.size} className={s.size === 2 ? "is-final" : ""} style={{ "--i": i } as React.CSSProperties}>
                  <span className="t-path-round">{roundName(s.size)}</span>
                  <Thumb p={s.foe} />
                  <span className="t-rank-t">
                    <small>contre</small>
                    <b>{s.foe.title}</b>
                    <small>{s.foe.sub}</small>
                  </span>
                  {s.ms != null ? <span className="t-path-ms">choisi en {duration(s.ms)}</span> : null}
                </li>
              ))}
            </ol>
          </section>
        ) : null}

        <section className="t-champ-sec">
          <h2>Ton classement de la partie</h2>
          <ol className="t-rank-list">
            {top.map((r, i) => (
              <li key={r.p.id} style={{ "--i": i } as React.CSSProperties}>
                <span className="t-rank-n">{r.rank}</span>
                <Thumb p={r.p} />
                <span className="t-rank-t">
                  <b>{r.p.title}</b>
                  <small>{r.p.sub}</small>
                </span>
                {listenBtn(r.p)}
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
