import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import type { Participant } from "@/lib/tournois/types";
import { useClientDraw } from "@/lib/tournois/client-draw";
import "./jeux-hero.css";
import "./arena-hero.css";
import { Gommage, type TransitionMode } from "./gommage";
import { Embers } from "../fight/Embers";

// Accueil des tournois OST, openings et endings : même mise en scène que le
// tournoi des OST de jeux vidéo (plein écran, une colonne de texte, l'image
// qui parle), mais chaque univers a sa matière et sa transition :
//   ost      → la Salle de Concert : art des animes, le disque tourne (vinyl)
//   openings → l'Antenne : les vrais openings à l'écran, on zappe (tv)
//   endings  → le Générique de fin : les endings, dissolution en poussière (dust)

type Universe = {
  mode: TransitionMode;
  hold: number;
  title: [string, string];
  unit: [string, string];
  /** Couleurs des braises (ost, endings) ; null = pas de braises. */
  embers: boolean;
};

const U: Record<"ost" | "openings" | "endings", Universe> = {
  ost: { mode: "vinyl", hold: 7000, title: ["Les thèmes", "qu'on n'oublie pas."], unit: ["thèmes", "animes"], embers: true },
  openings: { mode: "tv", hold: 6000, title: ["Deux écrans,", "un seul générique."], unit: ["openings", "animes"], embers: false },
  endings: { mode: "dust", hold: 8000, title: ["Ce qui reste", "après le dernier plan."], unit: ["endings", "animes"], embers: true },
};

const MOVES = [
  { x0: "-2.5%", y0: "1%", s0: 1.16, x1: "1.5%", y1: "-1%", s1: 1.05 },
  { x0: "0%", y0: "0%", s0: 1.03, x1: "-1%", y1: "1.5%", s1: 1.17 },
  { x0: "2.5%", y0: "-1.5%", s0: 1.14, x1: "-2%", y1: "1%", s1: 1.07 },
  { x0: "0%", y0: "2.5%", s0: 1.15, x1: "0%", y1: "-2%", s1: 1.06 },
];
const vars = (k: number) => {
  const m = MOVES[k % MOVES.length];
  return { objectPosition: "50% 40%", "--cx": "50%", "--cy": "40%", "--x0": m.x0, "--y0": m.y0, "--s0": m.s0, "--x1": m.x1, "--y1": m.y1, "--s1": m.s1 } as React.CSSProperties;
};
const big = (p: Participant) => (p.visual.k === "img" ? p.visual.src : p.thumb.replace("/t/p/w300/", "/t/p/w1280/"));

export function ArenaHero({
  slug,
  participants,
  groups,
  lede,
  cta,
  extra,
  base,
}: {
  slug: "ost" | "openings" | "endings";
  participants: Participant[];
  groups: number;
  lede: string;
  cta: string;
  /** Sous les boutons (ex. « Recommencer » quand une partie est en cours). */
  extra?: React.ReactNode;
  base: string;
}) {
  const u = U[slug];
  // Une sélection tirée au hasard à chaque visite (seulement des vidéos pour
  // les génériques).
  const pool = useMemo(() => participants.filter((p) => (slug === "ost" ? true : p.visual.k === "video")), [participants, slug]);
  const slides = useClientDraw(`${slug}:hero`, pool, 9) ?? [];
  const N = slides.length;

  const [i, setI] = useState(0);
  const [prev, setPrev] = useState<number | null>(null);
  const iRef = useRef(0);
  const [mounted, setMounted] = useState(() => new Set([0, 1]));
  const [paused, setPaused] = useState(false);
  const [osd, setOsd] = useState(0);
  const reduce = useMemo(() => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches, []);

  const slidesRef = useRef<HTMLDivElement>(null);
  const els = useRef<(HTMLImageElement | HTMLVideoElement | null)[]>([]);
  const fx = useRef<Gommage | null>(null);
  const [burning, setBurning] = useState(false);
  useEffect(() => {
    if (reduce || !slidesRef.current) return;
    const g = new Gommage(slidesRef.current);
    fx.current = g;
    return () => {
      g.destroy();
      fx.current = null;
    };
  }, [reduce]);

  const go = useCallback(
    (n: number) => {
      if (!N) return;
      const k = (n + N) % N;
      if (k === iRef.current) return;
      const out = els.current[iRef.current];
      setBurning(!!(out && fx.current?.start(out, { mode: u.mode })));
      setPrev(iRef.current);
      iRef.current = k;
      setI(k);
      setOsd((o) => o + 1);
      setMounted((m) => (m.has(k) && m.has((k + 1) % N) ? m : new Set([...m, k, (k + 1) % N])));
    },
    [N, u.mode],
  );

  // Seule la vidéo à l'écran joue ; les autres attendent, arrêtées.
  useEffect(() => {
    els.current.forEach((el, k) => {
      if (!(el instanceof HTMLVideoElement)) return;
      if (k === i) el.play().catch(() => {});
      else if (k !== prev) el.pause();
    });
  }, [i, prev, mounted]);

  useEffect(() => {
    const vis = () => setPaused(document.hidden);
    document.addEventListener("visibilitychange", vis);
    return () => document.removeEventListener("visibilitychange", vis);
  }, []);
  useEffect(() => {
    if (paused || !N) return;
    const t = setTimeout(() => go(i + 1), reduce ? u.hold + 3000 : u.hold);
    return () => clearTimeout(t);
  }, [i, paused, go, reduce, u.hold, N]);

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

  const cur = slides[i];

  return (
    <section
      className={`jh ah ah--${slug} ${reduce ? "is-still" : ""}`}
      aria-roledescription="carrousel"
      aria-label="À l'affiche du tournoi"
      onPointerDown={onDown}
      onPointerMove={(e) => {
        if (reduce || e.pointerType !== "mouse") return;
        const r = e.currentTarget.getBoundingClientRect();
        e.currentTarget.style.setProperty("--px", ((e.clientX - r.left) / r.width - 0.5).toFixed(3));
        e.currentTarget.style.setProperty("--py", ((e.clientY - r.top) / r.height - 0.5).toFixed(3));
      }}
      onPointerUp={onUp}
      onPointerCancel={() => (drag.current = null)}
    >
      <div className={`jh-slides ${burning ? "is-burning" : ""}`} ref={slidesRef} aria-hidden>
        {slides.map((p, k) => {
          if (!mounted.has(k)) return null;
          const cls = `jh-slide ${k === i ? "is-on" : k === prev ? "is-off" : ""}`;
          const ref = (e: HTMLImageElement | HTMLVideoElement | null) => {
            els.current[k] = e;
          };
          if (p.visual.k === "video" && !reduce) {
            const hook = p.sound?.k === "video" ? (p.sound.hook ?? 20) : 20;
            return (
              <video
                key={p.id}
                ref={ref}
                className={cls}
                src={`${p.visual.src}#t=${hook}`}
                poster={big(p)}
                crossOrigin="anonymous"
                muted
                playsInline
                loop
                preload={k === i ? "auto" : "metadata"}
                style={vars(k)}
              />
            );
          }
          return <img key={p.id} ref={ref} className={cls} src={big(p)} alt="" draggable={false} decoding="async" crossOrigin="anonymous" fetchPriority={k === 0 ? "high" : "low"} style={vars(k)} />;
        })}
      </div>
      <div className="jh-veil" aria-hidden />
      {u.embers ? <Embers active density={0.7} zIndex={0} tint={slug === "endings" ? "dust" : "gold"} /> : null}
      {slug === "openings" ? <div className="ah-scan" aria-hidden /> : null}
      {slug === "endings" && !reduce ? <Credits list={participants} /> : null}
      {/* Bandes cinéma qui s'ouvrent à l'arrivée, comme une séance qui commence. */}
      <div className="ah-bars" aria-hidden>
        <i />
        <i />
      </div>
      {slug === "openings" && cur ? (
        <p className="ah-osd" key={osd} aria-hidden>
          CH {String(i + 1).padStart(2, "0")}
        </p>
      ) : null}

      <div className="jh-copy">
        <p className="jh-eyebrow">
          <span>Tournoi</span>
          <span>
            {participants.length} {u.unit[0]}
          </span>
          <span>
            {groups} {u.unit[1]}
          </span>
        </p>
        <h1 className="jh-title ah-title">
          {u.title[0]}
          <br />
          <em>{u.title[1]}</em>
        </h1>
        <p className="jh-lede ah-lede">{lede}</p>
        <div className="jh-ctas">
          <Link to={`${base}/duel`} className="jh-go">
            {cta}
          </Link>
          <Link to={`${base}/classement`} className="jh-link">
            Voir le classement
          </Link>
          {extra}
        </div>
      </div>

      {cur ? (
        <div className="jh-foot">
          <p className="jh-caption" key={cur.id} aria-live="polite">
            <em>{cur.sub}</em>
            <small>{[cur.note, cur.title].filter(Boolean).join(" · ")}</small>
          </p>
          <div className="jh-nav">
            <span className="jh-index">
              {String(i + 1).padStart(2, "0")}
              <i> / {String(N).padStart(2, "0")}</i>
            </span>
            <ol className="jh-ticks">
              {slides.map((p, k) => (
                <li key={p.id}>
                  <button type="button" aria-label={p.sub} aria-current={k === i} className={k === i ? "is-on" : k < i ? "is-past" : ""} onClick={() => go(k)}>
                    <i style={k === i && !paused ? { animationDuration: `${reduce ? u.hold + 3000 : u.hold}ms` } : undefined} />
                  </button>
                </li>
              ))}
            </ol>
          </div>
        </div>
      ) : null}
    </section>
  );
}

// Générique de fin : les endings du tournoi défilent comme les crédits d'un film.
function Credits({ list }: { list: Participant[] }) {
  const rows = useMemo(() => {
    const a = list.filter((p) => p.title && p.sub);
    for (let k = a.length - 1; k > 0; k--) {
      const j = Math.floor(Math.random() * (k + 1));
      [a[k], a[j]] = [a[j], a[k]];
    }
    return a.slice(0, 36);
  }, [list]);
  if (!rows.length) return null;
  const block = (key: string) => (
    <div className="ah-roll-block" key={key}>
      <p className="ah-roll-head">Générique de fin</p>
      {rows.map((p) => (
        <p key={`${key}-${p.id}`} className="ah-roll-row">
          <small>{p.sub}</small>
          <span>{p.title}</span>
        </p>
      ))}
    </div>
  );
  return (
    <div className="ah-credits" aria-hidden>
      <div className="ah-roll" style={{ animationDuration: `${rows.length * 2.6}s` }}>
        {block("a")}
        {block("b")}
      </div>
    </div>
  );
}
