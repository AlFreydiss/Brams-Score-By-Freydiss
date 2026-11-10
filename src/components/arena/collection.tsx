import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { TOURNAMENTS, type TournamentMeta, type TournamentSlug } from "@/lib/tournois/catalog";
import { participants as loadParticipants } from "@/lib/tournois/data";
import { useSaved } from "@/lib/tournois/store";
import type { Participant } from "@/lib/tournois/types";
import { bgOf, type Bg } from "../fight/jeux-art";
import type { ChampCardData } from "../tournois/champion-card";
import "./collection.css";

// Ta collection : chaque champion de tes parties devient une carte légendaire.
// Un clic la ressort en 3D (même révélation qu'en fin de partie).

const ChampionCardReveal = lazy(() => import("../tournois/champion-card"));
const SLUGS: TournamentSlug[] = ["openings", "ost", "endings", "jeux", "rap", "rapvsost", "bankai", "panels"];
const bySlug = (s: TournamentSlug) => TOURNAMENTS.find((t) => t.slug === s) as TournamentMeta;

type Entry = { key: string; meta: TournamentMeta; p: Participant; size: number; at: number; art: string };

const artOf = (slug: TournamentSlug, p: Participant) => {
  if (slug === "jeux") {
    const bg = bgOf(p as Participant & { bg?: Bg });
    if (bg?.src) return bg.src;
  }
  return p.visual.k === "img" ? ((p.visual as { hi?: string }).hi ?? p.visual.src) : p.thumb.replace("/t/p/w300/", "/t/p/w1280/");
};

export function Collection() {
  // Un abonnement par tournoi, dans un ordre fixe.
  const saved = {
    openings: useSaved("openings"),
    ost: useSaved("ost"),
    endings: useSaved("endings"),
    jeux: useSaved("jeux"),
    rap: useSaved("rap"),
    rapvsost: useSaved("rapvsost"),
    bankai: useSaved("bankai"),
    panels: useSaved("panels"),
  };
  const wins = SLUGS.flatMap((s) => saved[s].champions.map((c) => ({ slug: s, ...c })));
  const sig = wins.map((w) => `${w.slug}:${w.id}:${w.at}`).join("|");
  const [entries, setEntries] = useState<Entry[]>([]);
  useEffect(() => {
    let on = true;
    const slugs = [...new Set(wins.map((w) => w.slug))];
    Promise.all(slugs.map((s) => loadParticipants(s).then((l) => [s, l] as const))).then((pairs) => {
      if (!on) return;
      const by = new Map(pairs);
      const out: Entry[] = [];
      for (const w of wins) {
        const p = by.get(w.slug)?.find((x) => x.id === w.id);
        if (p) out.push({ key: `${w.slug}:${w.id}:${w.at}`, meta: bySlug(w.slug), p, size: w.size, at: w.at, art: artOf(w.slug, p) });
      }
      out.sort((a, b) => b.at - a.at);
      setEntries(out);
    });
    return () => {
      on = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig]);

  const [open, setOpen] = useState<ChampCardData | null>(null);
  const total = entries.length;
  const tournaments = useMemo(() => new Set(entries.map((e) => e.meta.slug)).size, [entries]);

  // Aucune carte : une bande courte qui dit comment en gagner une, pas une rangée vide.
  if (!wins.length)
    return (
      <section className="cl cl--none" aria-label="Ta collection de cartes">
        <span className="cl-ghosts" aria-hidden>
          <i />
          <i />
          <i />
        </span>
        <div>
          <h2>Ta collection est vide</h2>
          <p>Va au bout d'un tournoi : ton champion devient une carte légendaire, rangée ici.</p>
        </div>
        <Link to="/tournoi/openings/duel" className="cl-start">
          Gagner ma première carte
        </Link>
      </section>
    );

  return (
    <section className="cl" aria-label="Ta collection de cartes">
      <div className="cl-head">
        <h2>
          Ta collection <span>{total ? `${total} carte${total > 1 ? "s" : ""} · ${tournaments}/${SLUGS.length} tournois` : "vide pour l'instant"}</span>
        </h2>
        <p>Chaque champion de tes parties devient une carte légendaire.</p>
      </div>
      <div className="cl-row">
        {entries.map((e, k) => (
          <button
            key={e.key}
            type="button"
            className="cl-card"
            style={{ "--k": k } as React.CSSProperties}
            onPointerMove={(ev) => {
              const r = ev.currentTarget.getBoundingClientRect();
              ev.currentTarget.style.setProperty("--mx", ((ev.clientX - r.left) / r.width - 0.5).toFixed(3));
              ev.currentTarget.style.setProperty("--my", ((ev.clientY - r.top) / r.height - 0.5).toFixed(3));
            }}
            onClick={() =>
              setOpen({ title: e.p.title, sub: e.p.sub ?? e.p.group ?? "", art: e.art, label: e.meta.championLabel, tournament: e.meta.title, size: e.size })
            }
            aria-label={`${e.p.title}, ${e.meta.title}`}
          >
            <span className="cl-in">
              <img src={e.art} alt="" loading="lazy" decoding="async" />
              <i className="cl-holo" aria-hidden />
              <span className="cl-txt">
                <small>{e.meta.title.replace(/^Tournoi (des |du |de |d'|d’)/i, "")}</small>
                <b>{e.p.title}</b>
                <em>{e.p.sub ?? e.p.group}</em>
              </span>
            </span>
          </button>
        ))}
        {/* Emplacement à gagner : une carte face cachée. */}
        <Link to="/tournoi/openings/duel" className="cl-card cl-card--empty" aria-label="Gagner une carte : lancer un tournoi">
          <span className="cl-in">
            <b>BRAMS</b>
            <small>{total ? "Gagne la suivante" : "Gagne ta première carte"}</small>
          </span>
        </Link>
      </div>
      {open ? (
        <Suspense fallback={null}>
          <ChampionCardReveal data={open} kicker="De ta collection" onClose={() => setOpen(null)} />
        </Suspense>
      ) : null}
    </section>
  );
}
