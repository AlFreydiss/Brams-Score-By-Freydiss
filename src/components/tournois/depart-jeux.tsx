import { useMemo } from "react";
import { ChevronDown } from "lucide-react";
import "./depart-jeux.css";

// Écran de départ du tournoi des OST de jeux : un seul fond plein écran (la
// boucle Clair Obscur, nette), et une colonne de réglages à gauche, là où
// l'image est sombre. Rien d'autre.

export function DepartJeux({
  title,
  lead,
  unit,
  formats,
  capacity,
  all,
  effective,
  onSize,
  onAll,
  groups,
  shownGroups,
  off,
  poolCount,
  q,
  onQ,
  onToggle,
  onReset,
  onClear,
  blind,
  onBlind,
  launching,
  onLaunch,
}: {
  title: string;
  lead: string;
  unit: string;
  formats: number[];
  capacity: number;
  /** Taille du format « Tout », 0 s'il n'existe pas. */
  all: number;
  effective: number;
  onSize: (f: number) => void;
  onAll: () => void;
  groups: [string, number][];
  shownGroups: [string, number][];
  off: Set<string>;
  poolCount: number;
  q: string;
  onQ: (v: string) => void;
  onToggle: (g: string) => void;
  onReset: () => void;
  onClear: () => void;
  blind: boolean;
  onBlind: (v: boolean) => void;
  launching: boolean;
  onLaunch: () => void;
}) {
  const reduce = useMemo(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches, []);
  const tours = effective ? Math.ceil(Math.log2(effective)) : 0;

  return (
    <div className={`dj ${launching ? "is-go" : ""}`}>
      <div className="dj-bg" aria-hidden>
        {reduce ? (
          <img src="/tournoi/jeux-hero/clair-obscur.webp" alt="" decoding="async" />
        ) : (
          <video src="/tournoi/jeux-hero/clair-obscur.mp4" poster="/tournoi/jeux-hero/clair-obscur.webp" autoPlay muted loop playsInline preload="auto" />
        )}
      </div>

      <div className="dj-box">
        <h1 className="dj-title">{title}</h1>
        <p className="dj-lede">{lead}</p>

        <div className="dj-size">
          <div className="dj-formats" role="group" aria-label={`Nombre de ${unit}`}>
            {formats.map((f) => (
              <button key={f} type="button" disabled={f > capacity} className={effective === f ? "is-on" : ""} aria-pressed={effective === f} onClick={() => onSize(f)}>
                {f}
              </button>
            ))}
            {all ? (
              <button type="button" className={effective === all ? "is-on" : ""} aria-pressed={effective === all} onClick={onAll} title={`Les ${all} ${unit} dans un seul tableau`}>
                Tout
              </button>
            ) : null}
          </div>
          <p className="dj-count">{effective ? `${effective} ${unit}, ${effective - 1} duels, ${tours} tours` : "Pas assez de musiques dans le tirage"}</p>
        </div>

        <div className="dj-opts">
          {groups.length > 1 ? (
            <details className="dj-filter">
              <summary>
                Jeux <small>{off.size ? `${groups.length - off.size} sur ${groups.length}` : `les ${groups.length}`}</small>
                <ChevronDown size={16} aria-hidden />
              </summary>
              <div className="dj-filter-panel">
                <div className="dj-filter-tools">
                  <input type="search" value={q} onChange={(e) => onQ(e.target.value)} placeholder={`Chercher parmi ${groups.length} jeux`} aria-label="Chercher un jeu" />
                  {off.size ? (
                    <button type="button" onClick={onReset}>
                      Tout reprendre
                    </button>
                  ) : (
                    <button type="button" onClick={onClear}>
                      Tout retirer
                    </button>
                  )}
                </div>
                <p className="dj-filter-count">
                  {poolCount} {unit} dans le tirage
                </p>
                <div className="dj-chips">
                  {shownGroups.length === 0 ? <p>Aucun jeu pour « {q} ».</p> : null}
                  {shownGroups.map(([g, n]) => (
                    <button key={g} type="button" className={off.has(g) ? "" : "is-on"} aria-pressed={!off.has(g)} onClick={() => onToggle(g)}>
                      {g} <small>{n}</small>
                    </button>
                  ))}
                </div>
              </div>
            </details>
          ) : null}

          <label className="dj-blind" title="Image, titre et jeu restent cachés jusqu'à ton choix : seule l'écoute compte.">
            <input type="checkbox" checked={blind} onChange={(e) => onBlind(e.target.checked)} />
            <span aria-hidden />
            À l'aveugle
          </label>
        </div>

        <button type="button" className="dj-go" data-go disabled={!effective || launching} onClick={onLaunch}>
          Lancer le tournoi
        </button>
      </div>
    </div>
  );
}
