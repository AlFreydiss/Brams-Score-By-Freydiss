import { AnimatePresence, motion, useReducedMotion, type Variants } from "framer-motion";
import { Heart, Pause, Play, Sparkle } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import { createPortal } from "react-dom";
import { champion, currentMatch, ranking, roundName, shuffle } from "@/lib/tournois/bracket";
import { actions } from "@/lib/tournois/store";
import type { Match, Participant } from "@/lib/tournois/types";
import { emitVolTrail } from "../tournois/flame-ink";
import { useTournament } from "../tournois/provider";
import { Plane, useSpace } from "./space";
import { T } from "./tokens";
import { Backdrop } from "./backdrop";
import { portraitIn169, prefocus } from "./focus";
import { engrave, Photo, Press } from "./ui";

// Le plan Tournoi, en salle de projection : fond presque noir où les deux
// œuvres du duel reviennent en silhouettes géantes, deux cartes verticales
// encadrées, un séparateur VS doré. Toucher une carte écoute le morceau en entier ;
// « Garder » la fait passer au tour suivant.
//
// Au vote, la pastille reste en place. La feuille part du côté gardé :
// droite si le choix est à droite, gauche s'il est à gauche. Le suivant
// entre par le côté opposé. Le fond suit, plus court. « Annuler » inverse.

type Side = 0 | 1;

// dir : 1 la feuille sort à droite, -1 elle sort à gauche, 0 premier duel.
// Une seule translation. Le flou suit la course et se lève à l'arrivée :
// 8px, pas plus, sinon la salle saccade.
const SWIPE = 1.05;
const HAZE = "blur(8px)";
const STAGE: Variants = {
  enter: (dir: number) =>
    dir
      ? { transform: `translateX(${dir > 0 ? "-100%" : "100%"})`, filter: HAZE, opacity: 1 }
      : { transform: "translateX(0%)", filter: "blur(0px)", opacity: 0 },
  center: (dir: number) => ({
    transform: "translateX(0%)",
    filter: "blur(0px)",
    opacity: 1,
    transition: dir
      ? {
          transform: { duration: SWIPE, ease: T.ease.inOut },
          filter: { duration: SWIPE, ease: T.ease.out },
          opacity: { duration: 0 },
        }
      : { opacity: { duration: 0.35, ease: T.ease.out }, transform: { duration: 0 }, filter: { duration: 0 } },
    transitionEnd: { filter: "none" },
  }),
  exit: (dir: number) => ({
    transform: `translateX(${dir >= 0 ? "100%" : "-100%"})`,
    filter: HAZE,
    opacity: 1,
    transition: {
      transform: { duration: SWIPE, ease: T.ease.inOut },
      filter: { duration: 0.62, ease: T.ease.out },
      opacity: { duration: 0 },
    },
  }),
};
const FADE: Variants = {
  enter: { opacity: 0 },
  center: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.16 } },
};

export function DuelPlane({ practice, onEndPractice }: { practice: boolean; onEndPractice: () => void }) {
  const { meta, saved, participants, player } = useTournament();
  const playerRef = useRef(player);
  playerRef.current = player;
  const volDrag = useRef<{ x: number; y: number; vol: number; on: boolean; prev: number } | null>(null);
  const [volNow, setVolNow] = useState<{ n: number; x: number; y: number } | null>(null);
  const onRoomDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const t = e.target as HTMLElement;
    if (t.closest("button, a, input, textarea, select, label, .ox-playbar")) return;
    const vol = player.muted ? 0 : player.volume;
    volDrag.current = { x: e.clientX, y: e.clientY, vol, on: false, prev: vol };
  };
  const onRoomMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = volDrag.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    const dy = d.y - e.clientY;
    if (!d.on) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      if (Math.abs(dx) > Math.abs(dy)) {
        volDrag.current = null;
        return;
      }
      d.on = true;
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    const next = Math.min(100, Math.max(0, Math.round(d.vol + dy * 0.45)));
    if (next < d.prev) emitVolTrail(e.clientX, e.clientY);
    d.prev = next;
    playerRef.current.setVolume(next);
    setVolNow({ n: next, x: e.clientX, y: e.clientY });
  };
  const onRoomUp = () => {
    volDrag.current = null;
    setVolNow(null);
  };
  const { goTo } = useSpace();
  const reduce = useReducedMotion();
  const run = saved.run;
  const [held, setHeld] = useState<{ match: Match; size: number } | null>(null);
  const dir = useRef(0);

  const cur = useMemo(() => (run ? currentMatch(run.rounds) : null), [run]);
  const champ = useMemo(() => (run ? champion(run.rounds) : null), [run]);
  const match = held?.match ?? cur?.match ?? null;
  const size = held?.size ?? cur?.round.size ?? 0;

  const info = useMemo(() => {
    if (!run || !match || !size) return null;
    const round = run.rounds.find((r) => r.size === size);
    const real = round?.matches.filter((x) => x.left && x.right) ?? [];
    const total = Math.max(1, run.size - 1);
    const done = run.rounds.reduce((n, r) => n + r.matches.filter((x) => x.status === "closed" && x.left && x.right).length, 0);
    return { label: roundName(size), index: real.findIndex((x) => x.id === match.id) + 1, total: real.length, progress: done / total };
  }, [run, match, size]);

  // Duel d'essai : deux OST au hasard, rien n'est enregistré.
  const pool = useMemo(() => participants.filter((p) => p.visual.k === "img"), [participants]);
  const [trial, setTrial] = useState(() => ({ n: 0, pair: shuffle(pool).slice(0, 2) }));
  const nextTrial = () => {
    setTrial((t) => ({ n: t.n + 1, pair: shuffle(pool).slice(0, 2) }));
  };

  // Les photos des deux duels suivants se chargent pendant celui-ci : le
  // glissement arrive sur des images prêtes.
  useEffect(() => {
    if (!run || !cur) return;
    const ahead = cur.round.matches.filter((m) => m.status !== "closed" && m.id !== cur.match.id).slice(0, 2);
    for (const m of ahead)
      for (const p of [m.left, m.right])
        if (p?.visual.k === "img") {
          // Même mode d'accès que les cartes (crossOrigin), sinon le navigateur
          // retélécharge l'image au moment du glissement ; le cadrage est calculé d'avance.
          const img = new Image();
          if (p.visual.src.startsWith("/")) img.crossOrigin = "anonymous";
          img.decoding = "async";
          img.src = p.visual.src;
          img.decode().catch(() => {});
          prefocus(p.visual.src, portraitIn169(0.6));
          const thumb = new Image();
          thumb.src = p.thumb;
        }
  }, [run, cur]);

  let key = "empty";
  let pair: [Participant, Participant] | null = null;
  let head: React.ReactNode = null;
  let body: React.ReactNode;
  if (practice && trial.pair.length === 2) {
    key = `trial-${trial.n}`;
    pair = [trial.pair[0], trial.pair[1]];
    head = (
      <Head title="Duel d'essai" sub="Rien n'est enregistré" progress={0}>
        <button type="button" className="ox-cap-link" onClick={onEndPractice}>
          Quitter l'essai
        </button>
      </Head>
    );
    body = (
      <Duel
        left={pair[0]}
        right={pair[1]}
        dir={dir.current}
        practice
        onChoose={(side) => {
          dir.current = side ? 1 : -1;
          return true;
        }}
        onDone={nextTrial}
      />
    );
  } else if (run && match?.left && match.right) {
    const m = match;
    key = m.id;
    pair = [m.left!, m.right!];
    head = (
      <Head title={info?.label ?? ""} sub={`Duel ${String(info?.index ?? 0).padStart(2, "0")} sur ${info?.total ?? 0}`} progress={info?.progress ?? 0}>
        {saved.undo && !held ? (
          <button
            type="button"
            className="ox-cap-link"
            onClick={() => {
              const vote = saved.undo?.vote;
              const match = saved.undo?.rounds.flatMap((r) => r.matches).find((x) => x.id === vote?.matchId);
              dir.current = match?.right?.id === vote?.winner ? -1 : 1;
              actions.undo(meta.slug);
            }}
          >
            Annuler mon choix
          </button>
        ) : null}
        <label className="ox-toggle">
          <input type="checkbox" checked={saved.settings.autoplay} onChange={(e) => actions.setAutoplay(meta.slug, e.target.checked)} />
          <i aria-hidden />
          <span>Lecture auto</span>
        </label>
      </Head>
    );
    body = (
      <Duel
        left={pair[0]}
        right={pair[1]}
        dir={dir.current}
        blind={run.blind}
        onChoose={(side, ms) => {
          dir.current = side ? 1 : -1;
          const winner = side ? m.right : m.left;
          if (!winner) return false;
          // Le store transmet aussi le duel aux statistiques du site.
          const ok = actions.vote(meta.slug, m.id, winner.id, ms, meta.statsId);
          if (ok) setHeld({ match: m, size });
          return ok;
        }}
        onDone={() => setHeld(null)}
      />
    );
  } else if (run && champ) {
    key = "champ";
    pair = [champ, champ];
    body = <Champion />;
  } else {
    body = (
      <div className="ox-empty">
        <p className="ox-micro">Aucune partie en cours</p>
        <h2 className="ox-empty-title">Le premier duel t'attend.</h2>
        <p className="ox-lead">Choisis la taille du tableau sur l'accueil, puis lance la partie.</p>
        <div className="ox-cta">
          <Press className="ox-pill" onClick={() => goTo(0)}>
            Régler la partie
          </Press>
        </div>
      </div>
    );
  }

  return (
    <Plane i={1} label="Tournoi">
      <div className="ox-room" onPointerDown={onRoomDown} onPointerMove={onRoomMove} onPointerUp={onRoomUp} onPointerCancel={onRoomUp}>
        {/* À l'aveugle, les silhouettes trahiraient les animes : elles n'arrivent qu'une fois le choix fait. */}
        <Backdrop k={key} pair={run?.blind && !practice && !held ? null : pair} dir={dir.current} />
        <motion.div className="ox-room-head" initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1, transition: { duration: 0.35, ease: T.ease.out } }}>
          {head}
        </motion.div>
        <div className="ox-room-stage">
          <AnimatePresence custom={dir.current}>
            <motion.div key={key} className="ox-room-slide" custom={dir.current} variants={reduce ? FADE : STAGE} initial="enter" animate="center" exit="exit">
              {body}
            </motion.div>
          </AnimatePresence>
        </div>
        {volNow
          ? createPortal(
              <span className="ox-vol-readout" style={{ left: volNow.x + 14, top: volNow.y - 8 }} aria-hidden>
                {volNow.n}
              </span>,
              document.body,
            )
          : null}
      </div>
    </Plane>
  );
}

/** En-tête : l'étape en micro-capitales, l'avancement en filet doré, les réglages à droite. */
function Head({ title, sub, progress, children }: { title: string; sub: string; progress: number; children: React.ReactNode }) {
  return (
    <>
      <div className="ox-head-left">
        <Sparkle className="ox-star" size={20} strokeWidth={1} aria-hidden />
        <p className="ox-head-title">
          <b>{title}</b>
          <span>{sub}</span>
        </p>
        <span className="ox-head-rule" aria-hidden>
          <i style={{ transform: `scaleX(${Math.max(0.04, progress)})` }} />
        </span>
      </div>
      <div className="ox-head-right">{children}</div>
    </>
  );
}

function Duel({
  left,
  right,
  dir,
  blind,
  practice,
  onChoose,
  onDone,
}: {
  left: Participant;
  right: Participant;
  dir: number;
  blind?: boolean;
  practice?: boolean;
  onChoose: (side: Side, ms: number) => boolean;
  onDone: () => void;
}) {
  const { meta, player, saved } = useTournament();
  const reduce = useReducedMotion();
  const [picked, setPicked] = useState<Side | null>(null);
  const shownAt = useRef(performance.now());
  const live = useRef(player);
  live.current = player;
  // Minuteurs lancés par le choix, et la suite du duel (onDone) pas encore jouée.
  const timers = useRef<number[]>([]);
  const owed = useRef<(() => void) | null>(null);
  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout);
      // Démonté avant la fin : la suite part quand même, sinon le duel resterait figé.
      owed.current?.();
    },
    [],
  );

  // Lecture automatique de la première OST, si elle est demandée.
  useEffect(() => {
    if (saved.settings.autoplay && !practice) live.current.play(left);
    // Une fois, à l'arrivée du duel.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // En partant, le duel ne coupe que ses propres pistes : le suivant a pu en lancer une.
  useEffect(
    () => () => {
      const pl = live.current;
      if (pl.id === left.id || pl.id === right.id) pl.stop();
    },
    // Au démontage seulement.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const choose = (side: Side) => {
    // Un seul choix par duel : les doubles clics ne passent pas.
    if (picked != null) return;
    if (!onChoose(side, Math.round(performance.now() - shownAt.current))) return;
    setPicked(side);
    const loser = side ? left : right;
    if (player.id === loser.id) player.pause();
    // L'appui a le temps de se poser, puis la feuille part. Pas d'attente du pourcentage.
    owed.current = () => {
      owed.current = null;
      onDone();
    };
    timers.current.push(window.setTimeout(() => owed.current?.(), reduce ? 80 : 90));
  };

  const hidden = !!blind && picked == null;
  return (
    <div className="ox-duel" data-picked={picked ?? undefined}>
      {[left, null, right].map((p, i) => {
        if (!p)
          return (
            <div key="vs" className="ox-vs" aria-hidden>
              <i className="ox-vs-line" />
              <span>VS</span>
              <i className="ox-vs-line" />
            </div>
          );
        const side = (i ? 1 : 0) as Side;
        return (
          <Card
            key={p.id}
            p={p}
            side={side}
            dir={dir}
            state={picked == null ? "idle" : picked === side ? "win" : "lose"}
            hidden={hidden}
            fav={saved.favorites.includes(p.id)}
            onFav={() => actions.toggleFavorite(meta.slug, p.id)}
            onListen={() => player.toggle(p)}
            onChoose={() => choose(side)}
          />
        );
      })}
    </div>
  );
}

const INFO: Variants = {
  hidden: { opacity: 0 },
  shown: (k: number) => ({ opacity: 1, transition: { duration: 0.28, delay: 0.06 + k * 0.04, ease: T.ease.out } }),
};

function Card({
  p,
  side,
  dir,
  state,
  hidden,
  fav,
  onFav,
  onListen,
  onChoose,
}: {
  p: Participant;
  side: Side;
  dir: number;
  state: "idle" | "win" | "lose";
  hidden: boolean;
  fav: boolean;
  onFav: () => void;
  onListen: () => void;
  onChoose: () => void;
}) {
  const { player } = useTournament();
  const reduce = useReducedMotion();
  const on = player.id === p.id && (player.playing || player.loading);
  const failed = player.failed.has(p.id);
  const scrub = useRef<HTMLInputElement>(null);
  const nowEl = useRef<HTMLSpanElement>(null);
  const endEl = useRef<HTMLSpanElement>(null);
  const dragging = useRef(false);
  const live = useRef(player);
  live.current = player;
  const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

  // La barre suit la musique, sauf pendant que tu la tires.
  useEffect(() => {
    if (!on) return;
    let raf = 0;
    const loop = () => {
      const t = live.current.getTime();
      const el = scrub.current;
      if (el && !dragging.current && t?.total) {
        const v = Math.min(1000, Math.round((t.now / t.total) * 1000));
        el.value = String(v);
        el.style.setProperty("--p", `${v / 10}%`);
      }
      if (nowEl.current) nowEl.current.textContent = t?.total ? clock(t.now) : "0:00";
      if (endEl.current) endEl.current.textContent = t?.total ? clock(t.total) : "–:––";
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [on]);

  const place = () => {
    const t = live.current.getTime();
    const el = scrub.current;
    if (!t?.total || !el) return;
    live.current.seek((Number(el.value) / 1000) * t.total);
  };

  const name = hidden ? (side ? "OST B" : "OST A") : engrave(p.title);
  const arrive = !reduce && dir === 0;
  return (
    <div className={`ox-seat ox-seat--${side ? "b" : "a"}`}>
    <article
      className={`ox-card ox-card--${side ? "b" : "a"} is-${state} ${on ? "is-on" : ""}`}
      style={state === "idle" ? undefined : { ["--px" as string]: "0", ["--py" as string]: "0" }}
      // L'œuvre suit à peine la souris, comme vue à travers une fenêtre.
      onPointerMove={(e) => {
        if (e.pointerType !== "mouse" || reduce || state !== "idle") return;
        const r = e.currentTarget.getBoundingClientRect();
        e.currentTarget.style.setProperty("--px", (((e.clientX - r.left) / r.width) * 2 - 1).toFixed(3));
        e.currentTarget.style.setProperty("--py", (((e.clientY - r.top) / r.height) * 2 - 1).toFixed(3));
      }}
      onPointerLeave={(e) => {
        e.currentTarget.style.setProperty("--px", "0");
        e.currentTarget.style.setProperty("--py", "0");
      }}
    >
      <button type="button" className="ox-card-art" onClick={onListen} aria-pressed={on} aria-label={`${on ? "Mettre en pause" : "Écouter"} ${name}`} disabled={failed}>
        {hidden ? (
          <span className="ox-card-blind">{side ? "B" : "A"}</span>
        ) : (
          <motion.span
            className="ox-card-img"
            initial={arrive ? { scale: 1.14 } : false}
            animate={arrive ? { scale: 1, transition: { duration: 1.5, ease: T.ease.out } } : undefined}
          >
            <Photo p={p} eager portrait={0.6} sizes="(min-height: 900px) 1100px, 900px" />
          </motion.span>
        )}
        <span className="ox-card-play" aria-hidden>
          {on && player.playing ? <Pause size={18} fill="currentColor" strokeWidth={0} /> : <Play size={18} fill="currentColor" strokeWidth={0} />}
        </span>
      </button>
      <i className="ox-card-tick" aria-hidden />
      <i className="ox-card-corners" aria-hidden />
      {state === "win" ? <i className="ox-card-sweep" aria-hidden /> : null}
      {on && player.playing ? (
        <span className="ox-eq" aria-hidden>
          <i />
          <i />
          <i />
          <i />
        </span>
      ) : null}
      <div className="ox-card-info">
        <motion.p className="ox-micro" variants={INFO} custom={0} initial={arrive ? "hidden" : false} animate="shown">
          {hidden ? "Titre caché" : (p.sub ?? p.group)}
        </motion.p>
        <h2 className={`ox-card-title ${name.length > 24 ? "is-long" : ""}`}>
          <span className="ox-card-title-mask">
            {/* Le titre monte derrière un masque, comme un générique. */}
            <motion.span
              className="ox-card-title-in"
              initial={arrive ? { transform: "translateY(110%)" } : false}
              animate={arrive ? { transform: "translateY(0%)", transition: { duration: 0.45, delay: 0.08, ease: T.ease.out } } : undefined}
            >
              {name}
            </motion.span>
          </span>
        </h2>
        {!hidden && p.artist ? (
          <motion.p className="ox-card-artist" variants={INFO} custom={2} initial={arrive ? "hidden" : false} animate="shown">
            {p.artist}
          </motion.p>
        ) : null}
        {failed ? <p className="ox-card-artist">Piste indisponible, tu peux quand même choisir.</p> : null}
        <motion.div className="ox-card-actions" variants={INFO} custom={3} initial={arrive ? "hidden" : false} animate="shown">
          {!hidden ? (
            <Press className={`ox-heart ${fav ? "is-on" : ""}`} onClick={onFav} aria-pressed={fav} aria-label={fav ? `Retirer ${p.title} des favoris` : `Ajouter ${p.title} aux favoris`}>
              <motion.span key={String(fav)} initial={fav && !reduce ? { scale: 0.6 } : false} animate={{ scale: 1, transition: { type: "spring", stiffness: 520, damping: 14 } }}>
                <Heart size={15} fill={fav ? "currentColor" : "none"} strokeWidth={1.4} />
              </motion.span>
            </Press>
          ) : null}
          <button type="button" className="ox-keep" onClick={onChoose} style={state === "lose" ? { visibility: "hidden" } : undefined}>
            {state === "win" ? "Gardée" : "Garder"}
          </button>
        </motion.div>
      </div>
    </article>
    <div className={`ox-playbar ${on ? "is-on" : ""}`} onPointerDown={(e) => e.stopPropagation()}>
      <span ref={nowEl} className="ox-scrub-time">0:00</span>
      <input
        ref={scrub}
        className="ox-scrub"
        type="range"
        min={0}
        max={1000}
        step={1}
        defaultValue={0}
        aria-label={`Position dans ${name}`}
        onPointerDown={() => {
          dragging.current = true;
          if (live.current.id !== p.id) live.current.play(p);
        }}
        onInput={(e) => {
          dragging.current = true;
          e.currentTarget.style.setProperty("--p", `${Number(e.currentTarget.value) / 10}%`);
        }}
        onChange={place}
        onPointerUp={() => {
          place();
          dragging.current = false;
        }}
      />
      <span ref={endEl} className="ox-scrub-time ox-scrub-time--end">–:––</span>
    </div>
    </div>
  );
}

function Champion() {
  const { meta, saved } = useTournament();
  const { goTo } = useSpace();
  const run = saved.run;
  const c = run ? champion(run.rounds) : null;
  const rest = useMemo(() => (run ? ranking(run.rounds).slice(1, 6) : []), [run]);
  if (!c) return null;
  return (
    <div className="ox-champ">
      <div className="ox-card ox-card--a is-win ox-champ-card">
        <div className="ox-card-art">
          <span className="ox-card-img">
            <Photo p={c} eager portrait={0.6} sizes="(min-height: 900px) 1100px, 900px" />
          </span>
        </div>
        <i className="ox-card-tick" aria-hidden />
      </div>
      <div className="ox-champ-text">
        <p className="ox-micro">{meta.championLabel}</p>
        <h2 className="ox-champ-title">{engrave(c.title)}</h2>
        <p className="ox-card-artist">{[c.sub ?? c.group, c.artist].filter(Boolean).join(", ")}</p>
        <div className="ox-cta">
          <Press
            className="ox-pill ox-pill--gold"
            onClick={() => {
              actions.quit(meta.slug);
              goTo(0);
            }}
          >
            Rejouer
          </Press>
          <Press className="ox-pill" onClick={() => goTo(2)}>
            Voir le tableau
          </Press>
        </div>
        {rest.length ? (
          <ol className="ox-podium">
            {rest.map(({ p, rank }) => (
              <li key={p.id}>
                <b>{rank.replace("–", "-")}</b>
                <span>{engrave(p.title)}</span>
              </li>
            ))}
          </ol>
        ) : null}
      </div>
    </div>
  );
}
