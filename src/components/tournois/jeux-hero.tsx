import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import "./jeux-hero.css";

// Accueil du tournoi des OST de jeux vidéo : l'art des jeux en plein écran,
// sans logo, qui défile tout seul (fondu lent + léger recul de caméra). Une
// colonne de texte sur un voile, le nom du jeu en bas, un filet par image.
// Rien d'autre : c'est l'image qui parle.

type Slide = { id: string; game: string; pos: string; w: number };

const SLIDES: Slide[] = [
  { id: "clair-obscur", game: "Clair Obscur: Expedition 33", pos: "54% 42%", w: 2560 },
  { id: "elden-ring", game: "Elden Ring", pos: "50% 46%", w: 1920 },
  { id: "ghost-of-tsushima", game: "Ghost of Tsushima", pos: "52% 55%", w: 1920 },
  { id: "hollow-knight", game: "Hollow Knight", pos: "70% 40%", w: 1920 },
  { id: "journey", game: "Journey", pos: "48% 62%", w: 1920 },
  { id: "god-of-war", game: "God of War", pos: "70% 40%", w: 1920 },
  { id: "nier-automata", game: "NieR:Automata", pos: "50% 42%", w: 1920 },
  { id: "ori", game: "Ori and the Blind Forest", pos: "52% 50%", w: 1920 },
  { id: "last-of-us", game: "The Last of Us", pos: "56% 36%", w: 1920 },
  { id: "ff7", game: "Final Fantasy VII", pos: "70% 50%", w: 1920 },
];

const HOLD = 7000;
const src = (s: Slide, small = false) => `/tournoi/jeux-hero/${s.id}${small ? "-s" : ""}.webp`;

export function JeuxHero({
  tracks,
  games,
  counts,
  cta,
  base,
}: {
  tracks: number;
  games: number;
  counts: Map<string, number>;
  cta: string;
  base: string;
}) {
  const [i, setI] = useState(0);
  // Images montées au fil du défilement : l'actuelle et la suivante seulement.
  const [mounted, setMounted] = useState(() => new Set([0, 1]));
  const [paused, setPaused] = useState(false);
  const reduce = useMemo(() => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches, []);

  const go = useCallback((n: number) => {
    const k = (n + SLIDES.length) % SLIDES.length;
    setI(k);
    setMounted((m) => (m.has(k) && m.has((k + 1) % SLIDES.length) ? m : new Set([...m, k, (k + 1) % SLIDES.length])));
  }, []);

  // Défilement automatique, en pause quand l'onglet est caché.
  useEffect(() => {
    const vis = () => setPaused(document.hidden);
    document.addEventListener("visibilitychange", vis);
    return () => document.removeEventListener("visibilitychange", vis);
  }, []);
  useEffect(() => {
    if (paused) return;
    const t = setTimeout(() => go(i + 1), reduce ? HOLD + 3000 : HOLD);
    return () => clearTimeout(t);
  }, [i, paused, go, reduce]);

  // Glisser du doigt (ou de la souris) pour changer d'image.
  const drag = useRef<{ x: number; y: number } | null>(null);
  const onDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("a, button")) return;
    drag.current = { x: e.clientX, y: e.clientY };
  };
  const onUp = (e: React.PointerEvent) => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    const dx = e.clientX - d.x;
    if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(e.clientY - d.y)) go(i + (dx < 0 ? 1 : -1));
  };

  const cur = SLIDES[i];
  const n = counts.get(cur.game) ?? 0;

  return (
    <section
      className={`jh ${reduce ? "is-still" : ""}`}
      aria-roledescription="carrousel"
      aria-label="Jeux du tournoi"
      onPointerDown={onDown}
      onPointerUp={onUp}
      onPointerCancel={() => (drag.current = null)}
    >
      <div className="jh-slides" aria-hidden>
        {SLIDES.map((s, k) =>
          mounted.has(k) ? (
            <img
              key={s.id}
              className={`jh-slide ${k === i ? "is-on" : ""}`}
              src={src(s)}
              srcSet={`${src(s, true)} ${s.w / 2}w, ${src(s)} ${s.w}w`}
              sizes="100vw"
              alt=""
              draggable={false}
              decoding="async"
              fetchPriority={k === 0 ? "high" : "low"}
              style={{ objectPosition: s.pos }}
            />
          ) : null,
        )}
      </div>
      <div className="jh-veil" aria-hidden />

      <div className="jh-copy">
        <p className="jh-eyebrow">
          <span>Tournoi</span>
          <span>{tracks} musiques</span>
          <span>{games} jeux</span>
        </p>
        <h1 className="jh-title">
          Les musiques
          <br />
          qui <em>restent.</em>
        </h1>
        <p className="jh-lede">Quand la manette est posée, il reste un thème. Tu écoutes les deux en entier, tu gardes celui qui te ramène quelque part.</p>
        <div className="jh-ctas">
          <Link to={`${base}/duel`} className="jh-go">
            {cta}
          </Link>
          <Link to={`${base}/classement`} className="jh-link">
            Voir le classement
          </Link>
        </div>
      </div>

      <div className="jh-foot">
        <p className="jh-caption" key={cur.id} aria-live="polite">
          <em>{cur.game}</em>
          {n ? <small>{n === 1 ? "1 piste en lice" : `${n} pistes en lice`}</small> : null}
        </p>
        <div className="jh-nav">
          <span className="jh-index">
            {String(i + 1).padStart(2, "0")}
            <i> / {String(SLIDES.length).padStart(2, "0")}</i>
          </span>
          <ol className="jh-ticks">
            {SLIDES.map((s, k) => (
              <li key={s.id}>
                <button type="button" aria-label={s.game} aria-current={k === i} className={k === i ? "is-on" : k < i ? "is-past" : ""} onClick={() => go(k)}>
                  <i style={k === i && !paused ? { animationDuration: `${reduce ? HOLD + 3000 : HOLD}ms` } : undefined} />
                </button>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
