import { motion } from "framer-motion";
import { Play } from "lucide-react";
import { forwardRef, memo, useDeferredValue, useEffect, useMemo, useState } from "react";
import { currentMatch, roundName, winnerOf } from "@/lib/tournois/bracket";
import { computeRows, rowsFromSite, runStatus, sortRows, type SiteStats, type SortKey } from "@/lib/tournois/stats";
import type { Match, Participant } from "@/lib/tournois/types";
import { fetchStats } from "@/lib/versusStats.js";
import { useTournament } from "../tournois/provider";
import { Backdrop } from "./backdrop";
import { Depth, Plane, useSpace } from "./space";
import { Tree } from "./tree";
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
          <Insights />
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
  const [tree, setTree] = useState(false);
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
      <div className="ox-seg" role="tablist" aria-label="Présentation du tableau">
        <button type="button" role="tab" aria-selected={!tree} onClick={() => setTree(false)}>
          Liste
        </button>
        <button type="button" role="tab" aria-selected={tree} onClick={() => setTree(true)}>
          Arbre
        </button>
      </div>
      {tree ? (
        <Tree rounds={run.rounds} currentId={cur?.match.id ?? null} blind={run.blind} onOpenCurrent={() => goTo(1)} />
      ) : null}
      {!tree && rounds.map((r) => (
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
  const [sort, setSort] = useState<SortKey>("rank");
  const [group, setGroup] = useState("");
  const [artist, setArtist] = useState("");
  const [compare, setCompare] = useState<string[]>([]);
  useEffect(() => {
    let on = true;
    if (meta.statsId) fetchStats(meta.statsId, { fresh: true }).then((m: SiteStats | null) => on && setSite(m));
    return () => {
      on = false;
    };
  }, [meta.statsId]);
  const siteRows = useMemo(() => (site ? rowsFromSite(site, participants, saved.run) : []), [site, participants, saved.run]);
  const localRows = useMemo(() => computeRows(saved.votes, participants, saved.run), [saved.votes, participants, saved.run]);
  const useMine = mine || !siteRows.length;
  const base = (useMine ? localRows : siteRows).filter((r) => r.duels > 0);
  const groups = useMemo(() => [...new Set(base.map((r) => r.p.group))].sort((a, b) => a.localeCompare(b, "fr")), [base]);
  const artists = useMemo(() => [...new Set(base.map((r) => r.p.artist).filter((a): a is string => !!a))].sort((a, b) => a.localeCompare(b, "fr")), [base]);
  const rows = sortRows(
    base.filter((r) => (!group || r.p.group === group) && (!artist || r.p.artist === artist)),
    useMine && sort === "rate" ? "rank" : sort,
  );
  const shown = all ? rows : rows.slice(0, 10);
  const compared = rows.filter((r) => compare.includes(r.p.id));
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
      <p className="ox-hint">{useMine ? "Tes duels, sur cet appareil. Distincts des votes du site." : "Votes de tout le site. Distincts de tes choix."}</p>
      {rows.length ? (
        <div className="ox-filters">
          <label>
            Trier
            <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
              <option value="rank">Victoires</option>
              <option value="rate">Pourcentage</option>
              <option value="duels">Duels</option>
              <option value="title">Titre</option>
              <option value="group">Anime</option>
            </select>
          </label>
          <label>
            Anime
            <select value={group} onChange={(e) => setGroup(e.target.value)}>
              <option value="">Tous</option>
              {groups.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </label>
          {artists.length ? (
            <label>
              Compositeur
              <select value={artist} onChange={(e) => setArtist(e.target.value)}>
                <option value="">Tous</option>
                {artists.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </div>
      ) : null}
      {compared.length >= 2 ? (
        <ul className="ox-compare">
          {compared.map((r) => (
            <li key={r.p.id}>
              <b>{engrave(r.p.title)}</b>
              <span>
                {r.wins} victoire{r.wins > 1 ? "s" : ""} sur {r.duels}
                {r.rate != null ? ` · ${r.rate} %` : ""}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
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
                <button
                  type="button"
                  className={`ox-link ${compare.includes(r.p.id) ? "is-on" : ""}`}
                  aria-pressed={compare.includes(r.p.id)}
                  onClick={() =>
                    setCompare((curIds) => (curIds.includes(r.p.id) ? curIds.filter((id) => id !== r.p.id) : curIds.length >= 3 ? curIds : [...curIds, r.p.id]))
                  }
                >
                  {compare.includes(r.p.id) ? "Retirer" : "Comparer"}
                </button>
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

function Insights() {
  const { participants, saved, byId } = useTournament();
  const run = saved.run;
  const votes = saved.votes;
  const rows = useMemo(() => computeRows(votes, participants, run).filter((r) => r.duels > 0), [votes, participants, run]);
  if (!rows.length && !votes.length && !saved.listens.length) return null;
  const top = [...rows].sort((a, b) => b.wins - a.wins || a.losses - b.losses)[0];
  const dropped = [...rows].sort((a, b) => b.losses - a.losses)[0];
  const alive = run ? participants.filter((p) => {
    const k = runStatus(run, p.id).kind;
    return k === "alive" || k === "champion";
  }) : [];
  const lead = (pick: (p: (typeof alive)[number]) => string | undefined) => {
    const m = new Map<string, number>();
    for (const p of alive) {
      const k = pick(p);
      if (!k) continue;
      m.set(k, (m.get(k) ?? 0) + 1);
    }
    return [...m].sort((a, b) => b[1] - a[1])[0];
  };
  const anime = alive.length ? lead((p) => p.group) : undefined;
  const composer = alive.length ? lead((p) => p.artist) : undefined;
  const deep = [...votes].sort((a, b) => a.round - b.round)[0];
  const slow = [...votes].filter((v) => v.ms > 0).sort((a, b) => b.ms - a.ms)[0];
  const byGroup = new Map<string, number>();
  for (const r of rows) byGroup.set(r.p.group, (byGroup.get(r.p.group) ?? 0) + r.wins);
  const bars = [...byGroup].filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const max = bars[0]?.[1] ?? 1;
  const name = (id: string) => byId.get(id)?.title ?? "—";
  return (
    <section className="ox-sec" id="statistiques">
      <Depth depth={-0.12}>
        <h2 className="ox-h1">Statistiques</h2>
      </Depth>
      <p className="ox-hint">Tes duels sur cet appareil, et la partie en cours. Aucun chiffre n'est complété.</p>
      <dl className="ox-facts">
        {votes.length ? (
          <div>
            <dt>Choix enregistrés</dt>
            <dd>{votes.length}</dd>
          </div>
        ) : null}
        {saved.listens.length ? (
          <div>
            <dt>Écoutes lancées</dt>
            <dd>{saved.listens.length}</dd>
          </div>
        ) : null}
        {top && top.wins > 0 ? (
          <div>
            <dt>La plus gardée</dt>
            <dd>
              {engrave(top.p.title)}
              <small>
                {top.wins} victoire{top.wins > 1 ? "s" : ""}
              </small>
            </dd>
          </div>
        ) : null}
        {dropped && dropped.losses > 0 ? (
          <div>
            <dt>La plus souvent écartée</dt>
            <dd>
              {engrave(dropped.p.title)}
              <small>
                {dropped.losses} défaite{dropped.losses > 1 ? "s" : ""}
              </small>
            </dd>
          </div>
        ) : null}
        {anime && anime[1] > 0 ? (
          <div>
            <dt>Anime encore le plus représenté</dt>
            <dd>
              {anime[0]}
              <small>
                {anime[1]} en lice
              </small>
            </dd>
          </div>
        ) : null}
        {composer && composer[1] > 0 ? (
          <div>
            <dt>Compositeur encore le plus représenté</dt>
            <dd>
              {composer[0]}
              <small>
                {composer[1]} en lice
              </small>
            </dd>
          </div>
        ) : null}
        {deep ? (
          <div>
            <dt>Victoire la plus avancée</dt>
            <dd>
              {name(deep.winner)}
              <small>{roundName(deep.round)}</small>
            </dd>
          </div>
        ) : null}
        {slow ? (
          <div>
            <dt>Hésitation la plus longue</dt>
            <dd>
              {name(slow.winner)} bat {name(slow.loser)}
              <small>{(slow.ms / 1000).toFixed(1)} s</small>
            </dd>
          </div>
        ) : null}
      </dl>
      {bars.length ? (
        <>
          <p className="ox-micro ox-bars-label">Tes victoires par anime</p>
          <ul className="ox-bars">
            {bars.map(([label, n]) => (
              <li key={label}>
                <span>{label}</span>
                <i style={{ transform: `scaleX(${n / max})` }} />
                <b>{n}</b>
              </li>
            ))}
          </ul>
        </>
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
