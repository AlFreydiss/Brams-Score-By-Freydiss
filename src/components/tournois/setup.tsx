import { useMemo, useState } from "react";
import { actions, draw } from "@/lib/tournois/store";
import { useClientDraw } from "@/lib/tournois/client-draw";
import { useTournament } from "./provider";
import { Visual } from "./visual";

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
  const preview = useClientDraw(`${meta.slug}:setup`, participants, 2) ?? [];

  const pool = participants.filter((p) => !off.has(p.group));
  const capacity = meta.balanced ? 2 * Math.min(pool.filter((p) => p.camp === "rap").length, pool.filter((p) => p.camp !== "rap").length) : pool.length;
  const fits = meta.formats.filter((f) => f <= capacity);
  const effective = fits.includes(size) ? size : fits[fits.length - 1];
  const showGroups = groups.length > 1 && groups.length <= 60;

  const toggle = (g: string) =>
    setOff((prev) => {
      const n = new Set(prev);
      if (n.has(g)) n.delete(g);
      else n.add(g);
      return n;
    });

  return (
    <div className="t-setup">
      <div className="t-setup-bg" aria-hidden>
        {preview.map((p, i) => (
          <div key={p.id} className={`t-setup-half t-setup-half--${i ? "right" : "left"}`}>
            <Visual p={p} posterAt={meta.posterAt} />
          </div>
        ))}
      </div>
      <div className="t-setup-box">
        <p className="t-eyebrow">{meta.signature}</p>
        <h1 className="t-setup-title">{meta.title}</h1>
        <p className="t-lead">{meta.lead}</p>

        <fieldset className="t-field">
          <legend>Nombre de {meta.unit}</legend>
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
          <fieldset className="t-field">
            <legend>
              {meta.groupLabel} <small>{pool.length} {meta.unit} retenus</small>
              {off.size ? (
                <button type="button" className="t-link" onClick={() => setOff(new Set())}>
                  Tout reprendre
                </button>
              ) : null}
            </legend>
            <div className="t-chips">
              {groups.map(([g, n]) => (
                <button key={g} type="button" className={off.has(g) ? "" : "is-on"} aria-pressed={!off.has(g)} onClick={() => toggle(g)}>
                  {g} <small>{n}</small>
                </button>
              ))}
            </div>
          </fieldset>
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
