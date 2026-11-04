import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { roundName } from "@/lib/tournois/bracket";
import { runStatus } from "@/lib/tournois/stats";
import type { Participant } from "@/lib/tournois/types";
import { fetchStats } from "@/lib/versusStats.js";
import { useTournament } from "../tournois/provider";
import { engrave, Photo } from "./ui";

// Fiche d'une OST. Uniquement ce que le catalogue, la partie et les votes
// réels portent : pas d'album, d'année ou d'anecdote inventés.

function ytUrl(p: Participant) {
  if (p.sound?.k !== "youtube") return null;
  const t = p.sound.start ? `&t=${p.sound.start}s` : "";
  return `https://www.youtube.com/watch?v=${p.sound.id}${t}`;
}

function record(rounds: { size: number; matches: { left: Participant | null; right: Participant | null; status: string; winnerId: string | null }[] }[] | undefined, id: string, blind: boolean) {
  const path: { round: string; opp: string; result: string }[] = [];
  let wins = 0;
  let losses = 0;
  if (!rounds) return { wins, losses, path };
  for (const round of rounds) {
    for (const m of round.matches) {
      if (m.left?.id !== id && m.right?.id !== id) continue;
      const opp = m.left?.id === id ? m.right : m.left;
      const name = roundName(round.size);
      if (m.status === "closed" && m.left && m.right && m.winnerId) {
        const win = m.winnerId === id;
        if (win) wins++;
        else losses++;
        path.push({ round: name, opp: opp?.title ?? "—", result: win ? "Victoire" : "Défaite" });
      } else if (blind) path.push({ round: name, opp: "Caché", result: "À venir" });
      else path.push({ round: name, opp: opp?.title ?? "À venir", result: m.status === "voting" ? "En cours" : "À venir" });
    }
  }
  return { wins, losses, path };
}

export function Fiche({
  p,
  clock,
  onClose,
}: {
  p: Participant;
  clock: () => { now: number; total: number } | null;
  onClose: () => void;
}) {
  const { meta, saved } = useTournament();
  const closeRef = useRef<HTMLButtonElement>(null);
  const [site, setSite] = useState<{ wins: number; duels: number } | null | undefined>(undefined);
  const [copied, setCopied] = useState(false);
  const run = saved.run;
  // À l'aveugle, un duel pas encore joué ne nomme pas l'adversaire.
  const shown = record(run?.rounds, p.id, !!run?.blind);
  const mine = saved.votes.filter((v) => v.winner === p.id || v.loser === p.id);
  const myWins = mine.filter((v) => v.winner === p.id).length;
  const status = runStatus(run, p.id);
  const link = ytUrl(p);
  const time = clock();
  const clockText = time?.total ? `${fmt(time.now)} / ${fmt(time.total)}` : null;

  useEffect(() => {
    closeRef.current?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [onClose]);

  useEffect(() => {
    if (!meta.statsId) return;
    let on = true;
    fetchStats(meta.statsId).then((map: Map<string, { wins: number; duels: number }> | null) => {
      if (!on) return;
      setSite(map?.get(p.id) ?? null);
    });
    return () => {
      on = false;
    };
  }, [meta.statsId, p.id]);

  const share = async () => {
    const text = `${p.title} — ${p.sub ?? p.group}`;
    const url = link ?? window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: p.title, text, url });
      else if (link) {
        await navigator.clipboard.writeText(link);
        setCopied(true);
      }
    } catch {
      /* annulé */
    }
  };

  const host = document.querySelector(".ox") ?? document.body;
  return createPortal(
    <div className="ox-fiche" role="presentation" onClick={onClose}>
      <article className="ox-fiche-card" role="dialog" aria-modal="true" aria-labelledby="ox-fiche-title" onClick={(e) => e.stopPropagation()}>
        <div className="ox-fiche-art">
          <Photo p={p} eager portrait={0.62} sizes="640px" />
        </div>
        <div className="ox-fiche-body">
          <button ref={closeRef} type="button" className="ox-cap-link ox-fiche-close" onClick={onClose}>
            Fermer
          </button>
          <p className="ox-micro">{p.sub ?? p.group}</p>
          <h2 id="ox-fiche-title">{engrave(p.title)}</h2>
          {p.artist ? <p className="ox-fiche-artist">{p.artist}</p> : null}
          <dl className="ox-fiche-facts">
            <div>
              <dt>Dans cette partie</dt>
              <dd>{status.label}</dd>
            </div>
            {shown.wins + shown.losses > 0 ? (
              <div>
                <dt>Duels de cette partie</dt>
                <dd>
                  {shown.wins} victoire{shown.wins > 1 ? "s" : ""} sur {shown.wins + shown.losses}
                </dd>
              </div>
            ) : null}
            {mine.length ? (
              <div>
                <dt>Tes duels, sur cet appareil</dt>
                <dd>
                  {myWins} sur {mine.length}
                  {mine.length >= 3 ? ` · ${Math.round((myWins / mine.length) * 100)} %` : ""}
                </dd>
              </div>
            ) : null}
            {site && site.duels > 0 ? (
              <div>
                <dt>Tout le site</dt>
                <dd>
                  {site.wins} sur {site.duels}
                  {site.duels >= 5 ? ` · ${Math.round((site.wins / site.duels) * 100)} %` : ""}
                </dd>
              </div>
            ) : null}
            {clockText ? (
              <div>
                <dt>Lecture en cours</dt>
                <dd>{clockText}</dd>
              </div>
            ) : null}
            {p.note ? (
              <div>
                <dt>Note</dt>
                <dd>{p.note}</dd>
              </div>
            ) : null}
          </dl>
          {shown.path.length ? (
            <ol className="ox-fiche-path">
              {shown.path.map((step, i) => (
                <li key={`${step.round}-${i}`}>
                  <b>{step.round}</b>
                  <span>{step.opp}</span>
                  <em>{step.result}</em>
                </li>
              ))}
            </ol>
          ) : (
            <p className="ox-fiche-artist">Cette OST n'est pas dans la partie en cours.</p>
          )}
          {link || typeof navigator.share === "function" ? (
            <div className="ox-fiche-links">
              {link ? (
                <a className="ox-pill" href={link} target="_blank" rel="noreferrer">
                  YouTube
                </a>
              ) : null}
              <button type="button" className="ox-pill" onClick={share}>
                {copied ? "Lien copié" : "Partager"}
              </button>
            </div>
          ) : null}
        </div>
      </article>
    </div>,
    host,
  );
}

function fmt(s: number) {
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}
