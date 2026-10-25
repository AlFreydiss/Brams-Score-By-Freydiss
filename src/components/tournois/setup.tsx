import { useEffect, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { de, fill } from "@/lib/tournois/catalog";
import { actions, draw } from "@/lib/tournois/store";
import { useClientDraw } from "@/lib/tournois/client-draw";
import { useTournament } from "./provider";
import { PosterScene } from "./poster";
import { BroadcastBackdrop } from "../arena/broadcast";
import { loadArenaFonts } from "../arena/fonts";
import "../arena/arena.css";

// Écran de départ : format, filtre, mode à l'aveugle. Le fond annonce déjà le
// duel : deux participants tirés au hasard, coupés dans le style du tournoi.
export function Setup() {
  const { meta, participants } = useTournament();
  const groups = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of participants) m.set(p.group, (m.get(p.group) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "fr"));
  }, [participants]);
  const [off, setOff] = useState<Set<string>>(() => new Set());
  const [size, setSize] = useState(meta.defaultFormat);
  const [blind, setBlind] = useState(false);
  const [q, setQ] = useState("");
  const preview = useClientDraw(`${meta.slug}:setup`, participants, 2) ?? [];
  // Le tournoi d'OST se lance sur son affiche de combat.
  const arena = meta.slug === "ost";
  useEffect(() => {
    if (arena) loadArenaFonts();
  }, [arena]);

  const pool = participants.filter((p) => !off.has(p.group));
  const capacity = meta.balanced ? 2 * Math.min(pool.filter((p) => p.camp === "rap").length, pool.filter((p) => p.camp !== "rap").length) : pool.length;
  const fits = meta.formats.filter((f) => f <= capacity);
  const effective = fits.includes(size) ? size : fits[fits.length - 1];
  // Rap contre OST tire autant dans chaque camp : pas de filtre par camp.
  const showGroups = !meta.balanced && groups.length > 1;
  // Beaucoup d'animes : une recherche pour retrouver le sien dans la liste.
  const needle = q.trim().toLocaleLowerCase("fr");
  const shownGroups = needle ? groups.filter(([g]) => g.toLocaleLowerCase("fr").includes(needle)) : groups;

  const toggle = (g: string) =>
    setOff((prev) => {
      const n = new Set(prev);
      if (n.has(g)) n.delete(g);
      else n.add(g);
      return n;
    });

  return (
    <div className={arena ? "t-setup ar ar-setup" : "t-setup"}>
      {arena ? (
        <BroadcastBackdrop
          left={preview[0] ? { src: preview[0].visual.k === "img" ? preview[0].visual.src : preview[0].thumb } : null}
          right={preview[1] ? { src: preview[1].visual.k === "img" ? preview[1].visual.src : preview[1].thumb } : null}
        />
      ) : (
        <PosterScene pair={preview} />
      )}
      <div className="t-setup-box">
        <p className="t-eyebrow">{meta.signature}</p>
        <h1 className="t-setup-title">{meta.title}</h1>
        <p className="t-lead">{fill(meta.lead, participants)}</p>

        <fieldset className="t-field">
          <legend>Nombre {de(meta.unit)}</legend>
          <div className="t-formats">
            {meta.formats.map((f) => (
              <button key={f} type="button" disabled={f > capacity} className={effective === f ? "is-on" : ""} aria-pressed={effective === f} onClick={() => setSize(f)}>
                <b>{f}</b>
                <small>{f - 1} duels</small>
              </button>
            ))}
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
          disabled={!effective}
          onClick={() => effective && actions.start(meta.slug, draw(pool, effective, meta.balanced), blind)}
        >
          {effective ? `Lancer le tournoi en ${effective} ${meta.unit}` : "Pas assez de participants"}
        </button>
        <p className="t-note">Tirage au hasard à chaque partie. Ta partie est sauvegardée sur ce navigateur : tu peux la reprendre plus tard.</p>
      </div>
    </div>
  );
}
