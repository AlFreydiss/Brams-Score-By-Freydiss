import { ListMusic, Pause, Play, Square } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { champion, ranking, roundName } from "@/lib/tournois/bracket";
import { actions } from "@/lib/tournois/store";
import type { Participant } from "@/lib/tournois/types";
import { useTournament } from "./provider";
import { Thumb, Visual } from "./visual";
import { shareChampionCard } from "../fight/shareCard";
import { bgOf, type Bg } from "../fight/jeux-art";
import { gameTheme } from "../fight/jeux-themes";
import "../fight/jeux-themes.css";

// Couleur de chaque univers sur la carte partagée (mêmes que fight/identities.ts).
const ACCENTS: Record<string, string> = { ost: "#d9a35a", openings: "#ef4d5a", endings: "#e9875f", jeux: "#8fb2ff" };

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
  const [card, setCard] = useState<null | "busy" | "shared" | "downloaded" | "failed">(null);
  // Compte à rebours : ton top joué du dernier au champion, extrait après extrait.
  const countdown = useMemo(() => [...top].reverse().map((r) => r.p), [top]);
  const [step, setStep] = useState<number | null>(null);
  const cur = step != null ? countdown[step] : null;
  useEffect(() => {
    if (step == null) return;
    if (!cur) return setStep(null);
    // Une autre piste lancée à la main arrête le compte à rebours.
    if (player.id && player.id !== cur.id) return setStep(null);
    if (player.id === cur.id && player.ended) {
      if (step + 1 < countdown.length) {
        setStep(step + 1);
        player.play(countdown[step + 1]);
      } else setStep(null);
    }
  }, [step, cur, countdown, player]);
  if (!run || !champ) return null;
  const audio = meta.mode === "audio";
  const playing = player.id === champ.id && player.playing;
  // Jeux : le fond 4K de la piste et l'univers de son jeu (police, encre, entrée).
  const jeux = meta.slug === "jeux";
  const bg = jeux ? bgOf(champ as Participant & { bg?: Bg }) : null;
  const th = jeux ? gameTheme(champ.sub) : null;

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
    <div className={`t-champ ${jeux ? "t-champ--jeux" : ""}`} style={th ? ({ "--jg-font": th.font, "--jg-accent": th.accent, "--jg-ink": th.ink, "--jg-shadow": th.shadow } as React.CSSProperties) : undefined}>
      <div className="t-champ-hero">
        <div className="t-champ-media">
          {bg && !bg.video ? (
            <img className="t-champ-bg" src={bg.src} srcSet={bg.hi ? `${bg.src} 1920w, ${bg.hi} 3840w` : undefined} sizes="100vw" alt="" style={{ objectPosition: bg.pos }} />
          ) : bg?.video ? (
            <video className="t-champ-bg" src={bg.video} poster={bg.src} muted loop autoPlay playsInline style={{ objectPosition: bg.pos }} />
          ) : (
            <Visual p={champ} posterAt={meta.posterAt} alt="" sizes="100vw" />
          )}
        </div>
        <div className="t-champ-txt">
          <p className="t-kept">
            {meta.championLabel}, sur {run.size} {meta.unit}
          </p>
          <p className="t-sub">{champ.sub}</p>
          <h1 className={`t-title ${champ.title.length > 24 ? "is-long" : ""}`} style={th ? { fontFamily: th.font, fontWeight: th.weight, letterSpacing: `${th.track}em`, textTransform: th.upper ? "uppercase" : "none" } : undefined}>
            {th
              ? champ.title.split(" ").map((w, k, all) => (
                  <span key={k} className={`jg-e jg-in--${th.entry}`} style={{ animationDelay: `${0.5 + k * 0.08}s`, marginRight: k < all.length - 1 ? "0.26em" : 0 }}>
                    <span className={`jg-w ${th.ink.startsWith("linear") ? "is-grad" : "is-solid"}`}>{w}</span>
                  </span>
                ))
              : champ.title}
          </h1>
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
          <div className="t-champ-head">
            <h2>Ton classement de la partie</h2>
            {audio && countdown.length > 1 ? (
              <button
                type="button"
                className={`t-countdown ${step != null ? "is-on" : ""}`}
                onClick={() => {
                  if (step != null) {
                    setStep(null);
                    player.pause();
                  } else {
                    setStep(0);
                    player.play(countdown[0]);
                  }
                }}
              >
                {step != null ? <Square size={14} fill="currentColor" /> : <ListMusic size={16} />}
                <span>{step != null ? `Compte à rebours : n° ${top.find((r) => r.p.id === cur?.id)?.rank ?? ""}` : "Écouter mon top en compte à rebours"}</span>
              </button>
            ) : null}
          </div>
          <ol className="t-rank-list">
            {top.map((r, i) => (
              <li key={r.p.id} className={player.id === r.p.id && player.playing ? "is-playing" : ""} style={{ "--i": i } as React.CSSProperties}>
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
          <button
            type="button"
            disabled={card === "busy"}
            onClick={async () => {
              setCard("busy");
              const r = await shareChampionCard({ tournament: meta.title, accent: ACCENTS[meta.slug] ?? "#d9a35a", champ, podium: top.map((t) => t.p) });
              setCard(r);
              setTimeout(() => setCard(null), 2500);
            }}
          >
            {card === "busy" ? "Préparation…" : card === "shared" ? "Carte partagée" : card === "downloaded" ? "Carte téléchargée" : card === "failed" ? "Carte indisponible" : "Partager ma carte"}
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
