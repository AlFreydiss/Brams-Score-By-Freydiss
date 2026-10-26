import { motion } from "framer-motion";
import { Play } from "lucide-react";
import { forwardRef, memo, useDeferredValue, useEffect, useMemo, useState } from "react";
import { currentMatch, roundName, winnerOf } from "@/lib/tournois/bracket";
import { computeRows, rowsFromSite, sortRows, type SiteStats } from "@/lib/tournois/stats";
import type { Match, Participant } from "@/lib/tournois/types";
import { fetchStats } from "@/lib/versusStats.js";
import { useTournament } from "../tournois/provider";
import { Backdrop } from "./backdrop";
import { Depth, Plane, useSpace } from "./space";
import { engrave, Photo, Press } from "./ui";

// Le plan Tableau : la partie en cours tour par tour, puis en descendant le
// classement, tes champions et tes derniers choix, tes favoris. Chaque partie
// a sa propre composition : une grille de duels, une liste classée, une
// chronologie, un mur de photos.

export const Board = forwardRef<HTMLDivElement>(function Board(_, ref) {
  const { saved, byId } = useTournament();
  // Le fond reprend le duel en cours (sauf à l'aveugle), sinon deux favoris ; assourdi pour la lecture.
  const cur = saved.run && !saved.run.blind ? currentMatch(saved.run.rounds) : null;
  const favs = saved.favorites.map((id) => byId.get(id)).filter((p): p is Participant => !!p);
  const pair: [Participant, Participant] | null = cur?.match.left && cur.match.right ? [cur.match.left, cur.match.right] : favs.length >= 2 ? [favs[0], favs[1]] : null;
  return (
    <Plane i={2} label="Tableau" scrollRef={ref}>
      <div className="ox-room">
        <Backdrop k={pair ? `${pair[0].id}|${pair[1].id}` : "none"} pair={pair} dim />
        <div className="ox-board">
          <Bracket />
          <Ranking />
          <History />
          <Favorites />
        </div>
      </div>
    </Plane>
  );
});

function Bracket() {
  const { saved } = useTournament();
  const { goTo } = useSpace();
  // Priorité basse : un vote ne redessine pas tout le tableau pendant le
  // glissement du duel ; il se met à jour dès que le navigateur a le temps.
  const run = useDeferredValue(saved.run);
  const cur = run ? currentMatch(run.rounds) : null;
  if (!run) {
    return (
      <section className="ox-sec" id="tableau">
        <Depth depth={-0.12}>
          <h2 className="ox-h1">Le tableau</h2>
        </Depth>
        <p className="ox-lead">Il se remplit pendant que tu joues : chaque duel gagné fait avancer ton OST d'une case.</p>
        <div className="ox-cta">
          <Press className="ox-btn ox-btn--line" onClick={() => goTo(0)}>
            Lancer une partie
          </Press>
        </div>
      </section>
    );
  }
  const rounds = run.rounds.filter((r) => r.matches.some((m) => m.left || m.right));
  const played = run.rounds.reduce((n, r) => n + r.matches.filter((m) => m.status === "closed" && m.left && m.right).length, 0);
  return (
    <section className="ox-sec" id="tableau">
      <Depth depth={-0.12}>
        <h2 className="ox-h1">Le tableau</h2>
      </Depth>
      <p className="ox-lead">
        {played} duel{played > 1 ? "s" : ""} joué{played > 1 ? "s" : ""} sur {run.size - 1}.
      </p>
      {rounds.map((r) => (
        <div key={r.id} className="ox-round-block">
          <h3 className="ox-h3">{roundName(r.size)}</h3>
          <div className="ox-matches">
            {r.matches.map((m) => (
              <MatchTile key={m.id} m={m} current={cur?.match.id === m.id} masked={run.blind && m.status !== "closed"} onOpen={() => goTo(1)} />
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}

// Une tuile ne se redessine que si son duel a changé.
const MatchTile = memo(
  function MatchTile({ m, current, masked, onOpen }: { m: Match; current: boolean; masked: boolean; onOpen: () => void }) {
    const w = winnerOf(m);
    // À l'aveugle, un duel pas encore joué ne dit pas qui s'affronte.
    const side = (p: Participant | null, label: string) =>
      p && masked ? (
        <span className="ox-mt-side is-empty">
          <span className="ox-mt-img" />
          <span className="ox-mt-t">{label}</span>
        </span>
      ) : p ? (
        <span className={`ox-mt-side ${w ? (w.id === p.id ? "is-win" : "is-out") : ""}`}>
          <span className="ox-mt-img">
            <Photo p={p} small />
          </span>
          <span className="ox-mt-t">{p.title}</span>
        </span>
      ) : (
        <span className="ox-mt-side is-empty">
          <span className="ox-mt-img" />
          <span className="ox-mt-t">À venir</span>
        </span>
      );
    const body = (
      <>
        {side(m.left, "OST A")}
        <i className="ox-mt-vs" aria-hidden>
          VS
        </i>
        {side(m.right, "OST B")}
      </>
    );
    return current ? (
      <button type="button" className="ox-mt is-current" onClick={onOpen} aria-label="Aller au duel en cours">
        {body}
      </button>
    ) : (
      <div className="ox-mt">{body}</div>
    );
  },
  (a, b) => a.current === b.current && a.masked === b.masked && a.m.id === b.m.id && a.m.winnerId === b.m.winnerId && a.m.left?.id === b.m.left?.id && a.m.right?.id === b.m.right?.id,
);

function Ranking() {
  const { meta, participants, saved, listen, player } = useTournament();
  const [site, setSite] = useState<SiteStats | null>(null);
  const [mine, setMine] = useState(false);
  const [all, setAll] = useState(false);
  useEffect(() => {
    let on = true;
    if (meta.statsId) fetchStats(meta.statsId, { fresh: true }).then((m: SiteStats | null) => on && setSite(m));
    return () => {
      on = false;
    };
  }, [meta.statsId]);
  const siteRows = useMemo(() => (site ? sortRows(rowsFromSite(site, participants, saved.run), "rate") : []), [site, participants, saved.run]);
  const localRows = useMemo(() => sortRows(computeRows(saved.votes, participants, saved.run), "rank"), [saved.votes, participants, saved.run]);
  const useMine = mine || !siteRows.length;
  const rows = (useMine ? localRows : siteRows).filter((r) => r.duels > 0);
  const shown = all ? rows : rows.slice(0, 10);
  return (
    <section className="ox-sec" id="classement">
      <div className="ox-sec-head">
        <Depth depth={-0.12}>
          <h2 className="ox-h1">Classement</h2>
        </Depth>
        {siteRows.length ? (
          <div className="ox-seg" role="tablist" aria-label="Source du classement">
            <button type="button" role="tab" aria-selected={!useMine} onClick={() => setMine(false)}>
              Sur le site
            </button>
            <button type="button" role="tab" aria-selected={useMine} onClick={() => setMine(true)}>
              Tes duels
            </button>
          </div>
        ) : null}
      </div>
      {rows.length ? (
        <ol className="ox-rank">
          {shown.map((r, i) => {
            const on = player.id === r.p.id && player.playing;
            return (
              <motion.li key={r.p.id} layout="position" className={on ? "is-on" : ""}>
                <b className="ox-rank-n">{i + 1}</b>
                <button type="button" className="ox-rank-photo" onClick={() => listen(r.p)} aria-label={`Écouter ${r.p.title}`}>
                  <Photo p={r.p} small />
                  <Play size={14} fill="currentColor" strokeWidth={0} />
                </button>
                <span className="ox-rank-t">
                  <span>{engrave(r.p.title)}</span>
                  <small>{r.p.sub ?? r.p.group}</small>
                </span>
                <span className="ox-rank-v">
                  {r.rate != null ? `${r.rate} %` : "-"}
                  <small>
                    {r.wins} sur {r.duels}
                  </small>
                </span>
              </motion.li>
            );
          })}
        </ol>
      ) : (
        <p className="ox-lead">{useMine ? "Joue quelques duels : tes OST préférées apparaîtront ici." : "Le classement du site se charge."}</p>
      )}
      {rows.length > 10 ? (
        <button type="button" className="ox-link" onClick={() => setAll((v) => !v)} aria-expanded={all}>
          {all ? "Voir les 10 premières" : `Voir les ${rows.length}`}
        </button>
      ) : null}
    </section>
  );
}

function History() {
  const { byId, saved } = useTournament();
  const champs = saved.champions.map((c) => ({ ...c, p: byId.get(c.id) })).filter((c) => c.p);
  const votes = [...saved.votes].reverse().slice(0, 12);
  if (!champs.length && !votes.length) return null;
  const date = (at: number) => new Date(at).toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
  return (
    <section className="ox-sec" id="historique">
      <Depth depth={-0.12}>
        <h2 className="ox-h1">Ton parcours</h2>
      </Depth>
      {champs.length ? (
        <div className="ox-champs">
          {champs.slice(0, 6).map((c) => (
            <figure key={c.at} className="ox-champ-card">
              <span className="ox-frame">
                <Photo p={c.p!} portrait={0.75} sizes="420px" />
              </span>
              <figcaption>
                <b>{engrave(c.p!.title)}</b>
                <small>
                  Championne sur {c.size}, le {date(c.at)}
                </small>
              </figcaption>
            </figure>
          ))}
        </div>
      ) : null}
      {votes.length ? (
        <ul className="ox-log">
          {votes.map((v) => (
            <li key={`${v.at}-${v.matchId}`}>
              <b>{byId.get(v.winner)?.title ?? "?"}</b>
              <span>bat</span>
              <em>{byId.get(v.loser)?.title ?? "?"}</em>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

function Favorites() {
  const { byId, saved, listen, player } = useTournament();
  const favs = saved.favorites.map((id) => byId.get(id)).filter((p): p is Participant => !!p);
  return (
    <section className="ox-sec" id="favoris">
      <Depth depth={-0.12}>
        <h2 className="ox-h1">Favoris</h2>
      </Depth>
      {favs.length ? (
        <div className="ox-favs">
          {favs.map((p) => {
            const on = player.id === p.id && player.playing;
            return (
              <button key={p.id} type="button" className={`ox-fav ${on ? "is-on" : ""}`} onClick={() => listen(p)} aria-label={`Écouter ${p.title}`}>
                <span className="ox-card-img">
                  <Photo p={p} portrait={0.7} sizes="520px" />
                </span>
                <span className="ox-fav-info">
                  <small>{p.sub ?? p.group}</small>
                  <b>{engrave(p.title)}</b>
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <p className="ox-lead">Touche le cœur sous une OST pendant un duel pour la garder ici.</p>
      )}
    </section>
  );
}
