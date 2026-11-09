import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import "./jeux-hero.css";
import { Gommage } from "./gommage";
import { useAdobeKit } from "./adobe-kit";
import { Embers } from "../fight/Embers";

// Accueil du tournoi des OST de jeux vidéo : l'art des jeux en plein écran,
// sans logo, qui défile tout seul (fondu lent + léger recul de caméra). Une
// colonne de texte sur un voile, le nom du jeu en bas, un filet par image.
// Rien d'autre : c'est l'image qui parle.

// video : boucle animée (cheveux, lumière, fumée) générée depuis l'image ;
// l'image sert d'affiche le temps qu'elle charge, et de repli.
type Slide = { id: string; game: string; pos: string; w: number; video?: string };

const SLIDES: Slide[] = [
  { id: "clair-obscur", game: "Clair Obscur: Expedition 33", pos: "54% 42%", w: 2560, video: "/tournoi/jeux-hero/clair-obscur.mp4" },
  { id: "elden-ring", game: "Elden Ring", pos: "50% 46%", w: 3840, video: "/tournoi/jeux-hero/elden-ring.mp4" },
  { id: "ghost-of-tsushima", game: "Ghost of Tsushima", pos: "60% 50%", w: 3840 },
  { id: "journey", game: "Journey", pos: "50% 45%", w: 3840, video: "/tournoi/jeux-hero/journey.mp4" },
  { id: "god-of-war", game: "God of War", pos: "45% 40%", w: 3840 },
  { id: "nier-automata", game: "NieR:Automata", pos: "60% 55%", w: 3840, video: "/tournoi/jeux-hero/nier-automata.mp4" },
  { id: "ori", game: "Ori and the Blind Forest", pos: "50% 50%", w: 3840, video: "/tournoi/jeux-hero/ori.mp4" },
  { id: "last-of-us", game: "The Last of Us", pos: "62% 55%", w: 3840 },
  { id: "ff7", game: "Final Fantasy VII", pos: "40% 22%", w: 3840 },
];

const HOLD = 7000;

// Mouvements de caméra, un par image (panoramique, zoom avant, zoom arrière…).
const MOVES = [
  { x0: "-2.5%", y0: "1%", s0: 1.16, x1: "1.5%", y1: "-1%", s1: 1.05 },
  { x0: "0%", y0: "0%", s0: 1.03, x1: "-1%", y1: "1.5%", s1: 1.17 },
  { x0: "2.5%", y0: "-1.5%", s0: 1.14, x1: "-2%", y1: "1%", s1: 1.07 },
  { x0: "0%", y0: "2.5%", s0: 1.15, x1: "0%", y1: "-2%", s1: 1.06 },
];
const vars = (s: Slide, k: number) => {
  const m = MOVES[k % MOVES.length];
  const [cx, cy] = s.pos.split(" ");
  return { objectPosition: s.pos, "--cx": cx, "--cy": cy, "--x0": m.x0, "--y0": m.y0, "--s0": m.s0, "--x1": m.x1, "--y1": m.y1, "--s1": m.s1 } as React.CSSProperties;
};
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
  useAdobeKit();
  const [i, setI] = useState(0);
  // Image qui s'en va (elle avance vers nous en se floutant).
  const [prev, setPrev] = useState<number | null>(null);
  const iRef = useRef(0);
  // Images montées au fil du défilement : l'actuelle et la suivante seulement.
  const [mounted, setMounted] = useState(() => new Set([0, 1]));
  const [paused, setPaused] = useState(false);
  const reduce = useMemo(() => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches, []);

  // Gommage : l'image sortante est redessinée en WebGL et s'efface en pétales.
  const slidesRef = useRef<HTMLDivElement>(null);
  const els = useRef<(HTMLImageElement | HTMLVideoElement | null)[]>([]);
  const gom = useRef<Gommage | null>(null);
  const [burning, setBurning] = useState(false);
  useEffect(() => {
    if (reduce || !slidesRef.current) return;
    const g = new Gommage(slidesRef.current);
    gom.current = g;
    return () => {
      g.destroy();
      gom.current = null;
    };
  }, [reduce]);

  const go = useCallback((n: number) => {
    const k = (n + SLIDES.length) % SLIDES.length;
    if (k === iRef.current) return;
    const out = els.current[iRef.current];
    setBurning(!!(out && gom.current?.start(out)));
    setPrev(iRef.current);
    iRef.current = k;
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
      onPointerMove={(e) => {
        // Profondeur : le décor glisse un peu à l'opposé de la souris.
        if (reduce || e.pointerType !== "mouse") return;
        const r = e.currentTarget.getBoundingClientRect();
        e.currentTarget.style.setProperty("--px", ((e.clientX - r.left) / r.width - 0.5).toFixed(3));
        e.currentTarget.style.setProperty("--py", ((e.clientY - r.top) / r.height - 0.5).toFixed(3));
      }}
      onPointerUp={onUp}
      onPointerCancel={() => (drag.current = null)}
    >
      <div className={`jh-slides ${burning ? "is-burning" : ""}`} ref={slidesRef} aria-hidden>
        {SLIDES.map((s, k) =>
          mounted.has(k) ? (
            s.video && !reduce ? (
              <video
                key={s.id}
                ref={(e) => {
                  els.current[k] = e;
                }}
                className={`jh-slide ${k === i ? "is-on" : k === prev ? "is-off" : ""}`}
                src={s.video}
                poster={src(s, true)}
                muted
                loop
                playsInline
                autoPlay
                preload={k === i ? "auto" : "metadata"}
                style={vars(s, k)}
              />
            ) : (
            <img
              key={s.id}
              ref={(e) => {
                  els.current[k] = e;
                }}
              className={`jh-slide ${k === i ? "is-on" : k === prev ? "is-off" : ""}`}
              src={src(s)}
              srcSet={`${src(s, true)} ${s.w / 2}w, ${src(s)} ${s.w}w`}
              sizes="100vw"
              alt=""
              draggable={false}
              decoding="async"
              fetchPriority={k === 0 ? "high" : "low"}
              style={vars(s, k)}
            />
            )
          ) : null,
        )}
      </div>
      <div className="jh-veil" aria-hidden />
      <Embers active density={0.8} zIndex={0} />

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

// ── Sous le hero : la tracklist et le générique de fin ───────────────

type Track = { id: string; title: string; sub?: string; thumb: string };

/**
 * « Au programme » façon dos de vinyle (pistes numérotées, une à écouter),
 * et la liste des jeux en générique de fin qui défile tout seul.
 */
export function JeuxProgram({
  tracks,
  lineup,
  playingId,
  loadingId,
  onListen,
}: {
  tracks: Track[];
  lineup: [string, number][];
  playingId: string | null;
  loadingId: string | null;
  onListen: (id: string) => void;
}) {
  const list = tracks.slice(0, 12);
  return (
    <section className="jp" aria-label="Programme du tournoi">
      <div className="jp-tracks">
        <header className="jp-head">
          <h2>Au programme</h2>
          <p>Une sélection du tournoi. Appuie pour écouter.</p>
        </header>
        <ol className="jp-list">
          {list.map((t, k) => {
            const on = playingId === t.id;
            return (
              <li key={t.id}>
                <button type="button" className={`jp-row ${on ? "is-on" : ""}`} onClick={() => onListen(t.id)} aria-pressed={on} aria-label={`${on ? "Mettre en pause" : "Écouter"} ${t.title}`}>
                  <span className="jp-n">{on ? <i className="jp-eq" aria-hidden><b /><b /><b /></i> : String(k + 1).padStart(2, "0")}</span>
                  <img className="jp-cover" src={t.thumb} alt="" loading="lazy" decoding="async" />
                  <span className="jp-text">
                    <b>{t.title}</b>
                    <small>{loadingId === t.id ? "Chargement…" : t.sub}</small>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </div>

      <div className="jp-credits">
        <header className="jp-head">
          <h2>Générique</h2>
          <p>
            {lineup.length} jeux, par nombre de musiques.
          </p>
        </header>
        <div className="jp-roll" tabIndex={0} aria-label={`Les ${lineup.length} jeux du tournoi`}>
          {/* Deux copies à la suite : la boucle ne se voit pas. */}
          <div className="jp-roll-in">
            {[0, 1].map((copy) => (
              <dl key={copy} aria-hidden={copy === 1}>
                {lineup.map(([g, n]) => (
                  <div key={g}>
                    <dt>{n === 1 ? "1 musique" : `${n} musiques`}</dt>
                    <dd>{g}</dd>
                  </div>
                ))}
              </dl>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
