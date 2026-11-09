import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { de, fill } from "@/lib/tournois/catalog";
import { actions, draw } from "@/lib/tournois/store";
import { useTournament } from "./provider";
import type { Participant } from "@/lib/tournois/types";
import { isPillarbox } from "@/lib/tournois/pillarbox";
import { SetupWall } from "./setup-wall";
import { IDENTITIES, isFight } from "../fight/identities";
import { Embers } from "../fight/Embers";
import { useAdobeKit } from "./adobe-kit";
import "./setup-jeux.css";
import "./setup-arena.css";

// OST, openings, endings : le départ reprend l'univers de leur accueil
// (arena-hero) — un vrai générique du pool au refrain, la matière du tournoi.
type ArenaSlug = "ost" | "openings" | "endings";
const isArena = (s: string): s is ArenaSlug => s === "ost" || s === "openings" || s === "endings";
const ARENA_TITLE: Record<ArenaSlug, [string, string]> = {
  ost: ["Tournoi des", "OST"],
  openings: ["Tournoi des", "openings"],
  endings: ["Tournoi des", "endings"],
};

function pillarbox(v: HTMLVideoElement) {
  if (v.dataset.pb) return;
  v.dataset.pb = "1";
  window.setTimeout(() => {
    if (isPillarbox(v)) v.classList.add("is-pillar");
  }, 400);
}

function ArenaBackdrop({ slug, pool }: { slug: ArenaSlug; pool: Participant[] }) {
  // Tiré une fois à l'arrivée : le fond ne change pas à chaque clic de format.
  const [pick] = useState(() => {
    const vids = pool.filter((p) => p.visual.k === "video");
    const from = slug === "ost" || !vids.length ? pool : vids;
    return from[Math.floor(Math.random() * from.length)];
  });
  const reduce = useMemo(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches, []);
  if (!pick) return null;
  const still = pick.visual.k === "img" ? pick.visual.src : pick.thumb.replace("/t/p/w300/", "/t/p/w1280/");
  const hook = pick.sound?.k === "video" ? (pick.sound.hook ?? 20) : 20;
  return (
    <div className={`sa-bg sa-bg--${slug}`} aria-hidden>
      {pick.visual.k === "video" && !reduce ? (
        <video
          src={`${pick.visual.src}#t=${hook}`}
          poster={still}
          crossOrigin="anonymous"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          onPlaying={(e) => pillarbox(e.currentTarget)}
        />
      ) : (
        <img src={still} alt="" decoding="async" />
      )}
      <div className="sa-fog" />
      {slug === "openings" ? <div className="sa-scan" /> : <Embers active density={0.6} zIndex={2} tint={slug === "endings" ? "dust" : "gold"} />}
      <p className="sa-caption">
        <b>{pick.group}</b>
        <span>{pick.title}</span>
      </p>
    </div>
  );
}

// Jeux : formats en chiffres romains, comme les cartes d'un jeu de tarot.
const ROMAN: Record<number, string> = { 8: "VIII", 16: "XVI", 32: "XXXII", 64: "LXIV", 128: "CXXVIII", 256: "CCLVI" };

// Écran de départ : format, filtre, mode à l'aveugle. Le fond annonce déjà le
// duel : deux participants tirés au hasard, coupés dans le style du tournoi.
// Valeur de format qui veut dire « tout le pool » (suit le filtre).
const ALL = -1;

export function Setup() {
  const { meta, participants } = useTournament();
  const jeux = meta.slug === "jeux";
  const arena = isArena(meta.slug) ? meta.slug : null;
  useAdobeKit(jeux);
  const groups = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of participants) m.set(p.group, (m.get(p.group) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "fr"));
  }, [participants]);
  const [off, setOff] = useState<Set<string>>(() => new Set());
  const [size, setSize] = useState(meta.defaultFormat);
  const [blind, setBlind] = useState(false);
  const [q, setQ] = useState("");

  const pool = participants.filter((p) => !off.has(p.group));
  const capacity = meta.balanced ? 2 * Math.min(pool.filter((p) => p.camp === "rap").length, pool.filter((p) => p.camp !== "rap").length) : pool.length;
  const fits = meta.formats.filter((f) => f <= capacity);
  // « Tout » : tout le pool dans un seul tableau, quand il dépasse le plus grand format
  // (les places en trop deviennent des qualifiés d'office, voir spreadByes).
  const all = !meta.balanced && capacity > meta.formats[meta.formats.length - 1] ? capacity : 0;
  const effective = size === ALL && all ? all : fits.includes(size) ? size : fits[fits.length - 1];
  // Rap contre OST tire autant dans chaque camp : pas de filtre par camp.
  const showGroups = !meta.balanced && groups.length > 1;
  // Beaucoup d'animes : une recherche pour retrouver le sien dans la liste.
  const needle = q.trim().toLocaleLowerCase("fr");
  const shownGroups = needle ? groups.filter(([g]) => g.toLocaleLowerCase("fr").includes(needle)) : groups;

  // Le tirage est fait ici, pas au clic : le mur montre la vraie partie.
  const offKey = [...off].sort().join("|");
  const drawn = useMemo(
    () => (effective ? draw(pool, effective, meta.balanced) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [offKey, effective, meta.balanced, participants],
  );
  const [launching, setLaunching] = useState(false);
  const timer = useRef(0);
  useEffect(() => () => clearTimeout(timer.current), []);
  const launch = () => {
    if (!effective || launching) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setLaunching(true);
    timer.current = window.setTimeout(() => actions.start(meta.slug, drawn, blind), reduce ? 0 : 820);
  };
  const accent = isFight(meta.slug) ? IDENTITIES[meta.slug].a : "#f4f2ec";

  const toggle = (g: string) =>
    setOff((prev) => {
      const n = new Set(prev);
      if (n.has(g)) n.delete(g);
      else n.add(g);
      return n;
    });

  return (
    <div className={`nx-setup ${jeux ? "nx-setup--jeux" : ""} ${arena ? `nx-setup--arena nx-setup--${arena}` : ""}`} style={arena ? ({ "--sa-acc": accent } as React.CSSProperties) : undefined}>
      {jeux ? (
        // Univers Clair Obscur / Elden Ring : boucle vidéo du jeu, brume, braises.
        <div className="sj-bg" aria-hidden>
          <video src="/tournoi/jeux-hero/clair-obscur.mp4" poster="/tournoi/jeux-hero/clair-obscur.webp" autoPlay muted loop playsInline preload="auto" />
          <div className="sj-fog" />
          <Embers active density={0.7} zIndex={2} />
        </div>
      ) : null}
      {arena ? <ArenaBackdrop slug={arena} pool={participants} /> : null}
      <div className="nx-setup-box">
        {jeux ? <p className="sj-kicker">Tournoi · {participants.length} musiques</p> : null}
        {arena ? (
          <p className="sa-kicker">
            <span>{IDENTITIES[arena].name}</span>
            <span>
              {participants.length} {meta.unit}
            </span>
            <span>{groups.length} animes</span>
          </p>
        ) : null}
        <h1 className="nx-title">
          {jeux
            ? meta.title.split(" ").map((w, k, all) => (
                <span key={k} className="jx-word" style={{ animationDelay: `${1.4 + k * 0.08}s`, marginRight: k < all.length - 1 ? "0.26em" : 0 }}>
                  {w}
                </span>
              ))
            : arena
              ? (
                  <>
                    {ARENA_TITLE[arena][0]} <em>{ARENA_TITLE[arena][1]}</em>
                  </>
                )
              : meta.title}
        </h1>
        <p className="nx-lede">{fill(meta.lead, participants)}</p>

        <fieldset className="t-field">
          <legend>Nombre {de(meta.unit)}</legend>
          <div className="t-formats">
            {meta.formats.map((f) => (
              <button key={f} type="button" disabled={f > capacity} className={effective === f ? "is-on" : ""} aria-pressed={effective === f} onClick={() => setSize(f)}>
                <b>{jeux ? ROMAN[f] ?? f : f}</b>
                <small>{jeux ? `${f} · ${f - 1} duels` : `${f - 1} duels`}</small>
              </button>
            ))}
            {all ? (
              <button type="button" className={effective === all ? "is-on" : ""} aria-pressed={effective === all} onClick={() => setSize(ALL)} title={`Les ${all} ${meta.unit} dans un seul tableau`}>
                <b>{jeux ? "Tout" : `Tout · ${all}`}</b>
                <small>{jeux ? `${all} · ${all - 1} duels` : `${all - 1} duels`}</small>
              </button>
            ) : null}
          </div>
        </fieldset>

        {showGroups ? (
          // Filtre replié par défaut : le bouton de départ reste visible sans défiler.
          <details className="t-field t-filter">
            <summary>
              <span>
                {meta.groupLabel} <small>{off.size ? `${groups.length - off.size} sur ${groups.length}, ${pool.length} ${meta.unit} dans le tirage` : `${groups.length} sur ${groups.length}`}</small>
              </span>
              <ChevronDown size={16} aria-hidden />
            </summary>
            <div className="t-filter-tools">
              {groups.length > 16 ? (
                <input
                  type="search"
                  className="t-filter-q"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder={`Chercher parmi ${groups.length} ${meta.groupLabel.toLowerCase()}`}
                  aria-label={`Chercher ${meta.groupLabel.toLowerCase()}`}
                />
              ) : null}
              {off.size ? (
                <button type="button" className="t-link t-filter-reset" onClick={() => setOff(new Set())}>
                  Tout reprendre
                </button>
              ) : (
                <button type="button" className="t-link t-filter-reset" onClick={() => setOff(new Set(groups.map(([g]) => g)))}>
                  Tout retirer
                </button>
              )}
            </div>
            <div className="t-chips">
              {shownGroups.length === 0 ? <p className="t-note">Aucun résultat pour « {q} ».</p> : null}
              {shownGroups.map(([g, n]) => (
                <button key={g} type="button" className={off.has(g) ? "" : "is-on"} aria-pressed={!off.has(g)} onClick={() => toggle(g)}>
                  {g} <small>{n}</small>
                </button>
              ))}
            </div>
          </details>
        ) : (
          <p className="t-note">{participants.length} {meta.unit} dans le pool, {groups.length} {meta.groupLabel.toLowerCase()}.</p>
        )}

        <label className="t-switch">
          <input type="checkbox" checked={blind} onChange={(e) => setBlind(e.target.checked)} />
          <span aria-hidden />
          <span>
            <b>À l’aveugle</b>
            <small>{meta.mode === "audio" ? "Image, titre et anime restent cachés jusqu'à ton choix : seule l'écoute compte." : "Les titres restent cachés jusqu'à ton choix."}</small>
          </span>
        </label>

        <button
          type="button"
          className="t-go"
          disabled={!effective || launching}
          onClick={launch}
        >
          {effective ? `Lancer le tournoi en ${effective} ${meta.unit}` : "Pas assez de participants"}
        </button>
        <p className="t-note">Tirage au hasard à chaque partie. Ta partie est sauvegardée sur ce navigateur : tu peux la reprendre plus tard.</p>
      </div>
      {effective ? <SetupWall pool={drawn} size={effective} launching={launching} accent={accent} /> : null}
    </div>
  );
}
