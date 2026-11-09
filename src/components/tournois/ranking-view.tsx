import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { computeRows, MIN_DUELS_FOR_RATE, MIN_SITE_DUELS, rowsFromSite, sortRows, type SiteStats, type SortKey } from "@/lib/tournois/stats";
import { fetchStats } from "@/lib/versusStats.js";
import { useTournament } from "./provider";
import { Thumb } from "./visual";
import { Pause, Play } from "lucide-react";
import type { Participant } from "@/lib/tournois/types";
import { IDENTITIES, isFight } from "../fight/identities";
import { bgOf } from "../fight/jeux-art";
import "./ranking.css";

type Row = ReturnType<typeof computeRows>[number];
const artOf = (p: Participant, jeux: boolean) => (jeux ? (bgOf(p as Participant & { sub?: string })?.src ?? p.thumb) : p.visual.k === "img" ? p.visual.src : p.thumb.replace("/t/p/w300/", "/t/p/w1280/"));

// Podium : les trois premiers en affiches, le premier au centre et plus haut.
function Podium({ rows, jeux, accent }: { rows: Row[]; jeux: boolean; accent: string }) {
  const { player, listen } = useTournament();
  const order = [rows[1], rows[0], rows[2]].filter(Boolean);
  return (
    <ol className={`rk-podium ${jeux ? "rk-podium--jeux" : ""}`} style={{ "--rk-acc": accent } as React.CSSProperties} aria-label="Podium">
      {order.map((r) => {
        const rank = rows.indexOf(r) + 1;
        const on = player.id === r.p.id && player.playing;
        return (
          <li key={r.p.id} className={`rk-step rk-step--${rank}`} style={{ "--d": `${rank === 1 ? 0 : rank === 2 ? 0.12 : 0.2}s` } as React.CSSProperties}>
            <img className="rk-art" src={artOf(r.p, jeux)} alt="" loading="lazy" decoding="async" />
            <span className="rk-rank" aria-label={`Rang ${rank}`}>{rank}</span>
            <div className="rk-copy">
              <small>{r.p.group}</small>
              <b>{r.p.title}</b>
              <span className="rk-stat">
                {r.rate != null ? <>{r.rate} %<em> de victoires</em></> : <>{r.wins}<em> victoire{r.wins > 1 ? "s" : ""}</em></>}
                <i>{r.duels} vote{r.duels > 1 ? "s" : ""}</i>
              </span>
            </div>
            <button type="button" className="rk-play" onClick={() => listen(r.p)} aria-label={`${on ? "Pause" : "Écouter"} ${r.p.title}`}>
              {on ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
            </button>
          </li>
        );
      })}
    </ol>
  );
}

const SORTS: { k: SortKey; label: string }[] = [
  { k: "rank", label: "Rang" },
  { k: "rate", label: "% de victoires" },
  { k: "wins", label: "Victoires" },
  { k: "duels", label: "Duels joués" },
  { k: "group", label: "Anime ou groupe" },
  { k: "title", label: "Titre" },
];

type Source = "site" | "local";

// Deux classements, jamais inventés : « Sur le site » vient des duels de tous
// les joueurs (Supabase, versus_stats) ; « Tes duels » de ce navigateur.
export function RankingView() {
  const { meta, participants, saved } = useTournament();
  const [site, setSite] = useState<SiteStats | null | "loading">(meta.statsId ? "loading" : null);
  const [pick, setPick] = useState<Source | null>(null);
  const [sort, setSort] = useState<SortKey | null>(null);
  const [group, setGroup] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    let on = true;
    if (!meta.statsId) return;
    fetchStats(meta.statsId, { fresh: true }).then((m: SiteStats | null) => on && setSite(m));
    return () => {
      on = false;
    };
  }, [meta.statsId]);

  const siteRows = useMemo(() => (site && site !== "loading" ? rowsFromSite(site, participants, saved.run) : []), [site, participants, saved.run]);
  const localRows = useMemo(() => computeRows(saved.votes, participants, saved.run), [saved.votes, participants, saved.run]);
  const source: Source = pick ?? (siteRows.length ? "site" : "local");
  const rows = source === "site" ? siteRows : localRows;
  const by: SortKey = sort ?? (source === "site" ? "rate" : "rank");
  const groups = useMemo(() => [...new Set(rows.map((r) => r.p.group))].sort((a, b) => a.localeCompare(b, "fr")), [rows]);
  const shown = useMemo(() => sortRows(rows, by).filter((r) => (!group || r.p.group === group) && (!status || r.status.kind === status)), [rows, by, group, status]);
  const ranked = useMemo(() => new Map(sortRows(rows, source === "site" ? "rate" : "rank").map((r, i) => [r.p.id, i + 1])), [rows, source]);
  const siteDuels = siteRows.reduce((n, r) => n + r.wins, 0);
  const top = useMemo(() => sortRows(rows, source === "site" ? "rate" : "rank").slice(0, 3), [rows, source]);
  const accent = isFight(meta.slug) ? IDENTITIES[meta.slug].a : "#f4f2ec";

  return (
    <div className="t-page t-page--wide">
      <div className="t-page-head">
        <h1 className="t-page-title">Classement</h1>
        <div className="t-b-tabs t-source-tabs" role="tablist" aria-label="Source du classement">
          <button type="button" role="tab" aria-selected={source === "site"} className={source === "site" ? "is-on" : ""} onClick={() => setPick("site")}>
            Sur le site
          </button>
          <button type="button" role="tab" aria-selected={source === "local"} className={source === "local" ? "is-on" : ""} onClick={() => setPick("local")}>
            Tes duels
          </button>
        </div>
        <p className="t-panel-sub">
          {source === "site"
            ? site === "loading"
              ? "Chargement des statistiques du site…"
              : site === null
                ? "Les statistiques du site ne répondent pas pour l’instant. Réessaie plus tard, ou regarde tes propres duels."
                : `${siteDuels} duel${siteDuels > 1 ? "s" : ""} joués par la communauté. Le pourcentage de victoires s’affiche à partir de ${MIN_SITE_DUELS} duels.`
            : `Calculé à partir des ${saved.votes.length} duel${saved.votes.length > 1 ? "s" : ""} que tu as joués sur ce navigateur, toutes parties confondues. Le pourcentage de victoires s’affiche à partir de ${MIN_DUELS_FOR_RATE} duels.`}
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="t-panel">
          <p className="t-panel-sub">{source === "site" ? "Aucun duel enregistré sur le site pour ce tournoi." : "Aucun duel joué pour l’instant. Le classement se remplit à chaque vote."}</p>
          <Link to={`/tournoi/${meta.path}/duel`} className="t-go">
            Participer au tournoi
          </Link>
        </div>
      ) : (
        <>
          {top.length >= 3 ? <Podium rows={top} jeux={meta.slug === "jeux"} accent={accent} /> : null}
          <div className="t-filters">
            <label>
              <span>Trier par</span>
              <select value={by} onChange={(e) => setSort(e.target.value as SortKey)}>
                {SORTS.map((s) => (
                  <option key={s.k} value={s.k}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>{meta.groupLabel}</span>
              <select value={group} onChange={(e) => setGroup(e.target.value)}>
                <option value="">Tous</option>
                {groups.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Statut dans ta partie</span>
              <select value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="">Tous</option>
                <option value="champion">Champion</option>
                <option value="alive">En lice</option>
                <option value="out">Éliminés</option>
                <option value="none">Hors partie</option>
              </select>
            </label>
            <p className="t-filters-n">
              {shown.length} sur {rows.length}
            </p>
          </div>

          <table className="t-table">
            <thead>
              <tr>
                <th scope="col">Rang</th>
                <th scope="col">{meta.unitOne === "OST" ? "OST" : "Titre"}</th>
                <th scope="col">{meta.groupLabel.replace(/s$/, "")}</th>
                <th scope="col" className="num">Victoires</th>
                <th scope="col" className="num">Défaites</th>
                <th scope="col" className="num">Votes</th>
                <th scope="col" className="num">% victoires</th>
                <th scope="col">Statut</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.p.id}>
                  <td className="t-table-rank">{ranked.get(r.p.id)}</td>
                  <td>
                    <span className="t-table-title">
                      <Thumb p={r.p} />
                      <span>
                        <b>{r.p.title}</b>
                        {r.p.artist ? <small>{r.p.artist}</small> : null}
                      </span>
                    </span>
                  </td>
                  <td data-label={meta.groupLabel}>{r.p.group}</td>
                  <td className="num" data-label="Victoires">
                    {r.wins}
                  </td>
                  <td className="num" data-label="Défaites">
                    {r.losses}
                  </td>
                  <td className="num" data-label="Votes">
                    {r.duels}
                  </td>
                  <td className="num" data-label="% victoires">
                    {r.rate == null ? "–" : `${r.rate} %`}
                  </td>
                  <td data-label="Statut">
                    <span className={`t-status t-status--${r.status.kind}`}>{r.status.label}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
