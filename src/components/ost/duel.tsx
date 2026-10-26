import { AnimatePresence, animate, motion, useMotionValue, useReducedMotion, useTransform, type Variants } from "framer-motion";
import { Heart, Pause, Play, Sparkle } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { champion, currentMatch, ranking, roundName, shuffle } from "@/lib/tournois/bracket";
import { actions } from "@/lib/tournois/store";
import type { Match, Participant } from "@/lib/tournois/types";
import { fetchPair } from "@/lib/versusStats.js";
import { useTournament } from "../tournois/provider";
import { Plane, useSpace } from "./space";
import { T } from "./tokens";
import { Backdrop } from "./backdrop";
import { portraitIn169, prefocus } from "./focus";
import { engrave, Photo, Press } from "./ui";

// Le plan Tournoi, en salle de projection : fond presque noir où les deux
// œuvres du duel reviennent en silhouettes géantes, deux cartes verticales
// encadrées, un séparateur VS doré. Toucher une carte écoute son extrait ;
// « Garder » la fait passer au tour suivant.
//
// Un seul mouvement pour changer de duel : toute la composition glisse vers la
// droite et s'efface pendant que le duel suivant entre par la gauche ; le fond
// suit le même geste, plus lentement (parallaxe). « Annuler » fait l'inverse.

type Side = 0 | 1;

// Premier plan : les cartes et le VS. L'ancien duel s'efface dans la première
// moitié de sa course, le nouveau n'apparaît qu'ensuite : les deux ne se
// superposent jamais en transparence. Les cartes et le VS suivent le geste
// l'un après l'autre (l'élément de tête part le premier, arrive le premier)
// et reculent un peu en profondeur pendant le trajet.
// dir : 1 duel suivant (vers la droite), -1 retour (Annuler), 0 tout premier
// duel (il monte depuis le bas).
// Carrousel : l'ancien duel reste visible pendant qu'il accélère vers la
// droite et ne s'éteint qu'en fin de course ; le nouveau part de la gauche un
// instant plus tard et apparaît pendant qu'il avance. Les deux restent à des
// places différentes : aucun fantôme superposé.
const STAGE: Variants = {
  enter: (dir: number) => (dir ? { x: dir > 0 ? "-32vw" : "32vw", opacity: 0 } : { x: 0, opacity: 1 }),
  center: {
    x: 0,
    opacity: 1,
    transition: {
      x: { duration: 0.85, delay: 0.2, ease: T.ease.out },
      opacity: { duration: 0.45, delay: 0.22, ease: T.ease.out },
      staggerChildren: 0.07,
      delayChildren: 0.2,
    },
  },
  exit: (dir: number) => ({
    x: dir >= 0 ? "32vw" : "-32vw",
    opacity: [1, 1, 0],
    transition: {
      x: { duration: 0.55, ease: [0.45, 0, 0.2, 1] },
      opacity: { duration: 0.55, times: [0, 0.45, 1], ease: "easeIn" },
      staggerChildren: 0.05,
      staggerDirection: -1,
    },
  }),
};
// Une carte (ou le VS) dans ce mouvement.
const PIECE: Variants = {
  enter: (dir: number) => (dir ? { x: dir > 0 ? -56 : 56, opacity: 0, scale: 0.965 } : { y: 34, opacity: 0, scale: 1 }),
  center: { x: 0, y: 0, opacity: 1, scale: 1, transition: { duration: 0.85, ease: T.ease.out } },
  exit: (dir: number) => ({ x: dir >= 0 ? 56 : -56, opacity: 0, scale: 0.965, transition: { duration: 0.45, ease: T.ease.in } }),
};
const PIECE_VS: Variants = {
  enter: { opacity: 0, scaleY: 0.4 },
  center: { opacity: 1, scaleY: 1, transition: { duration: 0.9, ease: T.ease.out } },
  exit: { opacity: 0, scaleY: 0.6, transition: { duration: 0.35, ease: T.ease.in } },
};
const FADE: Variants = {
  enter: { opacity: 0 },
  center: { opacity: 1, transition: { duration: 0.25 } },
  exit: { opacity: 0, transition: { duration: 0.18 } },
};

export function DuelPlane({ practice, onEndPractice }: { practice: boolean; onEndPractice: () => void }) {
  const { meta, saved, participants } = useTournament();
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
    dir.current = 1;
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
          img.crossOrigin = "anonymous";
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
    body = <Duel left={pair[0]} right={pair[1]} dir={dir.current} practice onChoose={() => true} onDone={nextTrial} />;
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
              dir.current = -1;
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
          dir.current = 1;
          const winner = side ? m.right : m.left;
          if (!winner) return false;
          // Le store transmet aussi le duel aux statistiques du site.
          const ok = actions.vote(meta.slug, m.id, winner.id, ms, meta.statsId);
          if (ok) setHeld({ match: m, size });
          return ok;
        }}
        onDone={() => {
          dir.current = 1;
          setHeld(null);
        }}
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
      <div className="ox-room">
        {/* À l'aveugle, les silhouettes trahiraient les animes : elles n'arrivent qu'une fois le choix fait. */}
        <Backdrop k={key} pair={run?.blind && !practice && !held ? null : pair} dir={dir.current} />
        <motion.div className="ox-room-head" initial={reduce ? false : { opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0, transition: { duration: 0.8, delay: 0.55, ease: T.ease.out } }}>
          {head}
        </motion.div>
        <div className="ox-room-stage">
          <AnimatePresence mode="popLayout" custom={dir.current}>
            <motion.div key={key} className="ox-room-slide" custom={dir.current} variants={reduce ? FADE : STAGE} initial="enter" animate="center" exit="exit">
              {body}
            </motion.div>
          </AnimatePresence>
        </div>
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
  const [split, setSplit] = useState<number | null>(null);
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
    if (meta.statsId && !practice) {
      const statsId = meta.statsId;
      timers.current.push(
        window.setTimeout(() => {
          fetchPair(statsId, left.id, right.id).then((r: { a: number; b: number } | null) => {
            if (!r) return;
            const total = r.a + r.b;
            setSplit(total ? Math.round((r.a / total) * 100) : null);
          });
        }, 300),
      );
    }
    owed.current = () => {
      owed.current = null;
      onDone();
    };
    timers.current.push(window.setTimeout(() => owed.current?.(), reduce ? 700 : meta.statsId && !practice ? 1450 : 900));
  };

  const hidden = !!blind && picked == null;
  const pct = (side: Side) => (split == null ? null : side ? 100 - split : split);
  return (
    <div className="ox-duel" data-picked={picked ?? undefined}>
      {[left, null, right].map((p, i) => {
        if (!p)
          return (
            <motion.div key="vs" className="ox-vs" aria-hidden variants={reduce ? undefined : PIECE_VS}>
              <i className="ox-vs-line" />
              <span>VS</span>
              <i className="ox-vs-line" />
            </motion.div>
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
            pct={pct(side)}
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
  hidden: { opacity: 0, y: 10 },
  shown: (k: number) => ({ opacity: 1, y: 0, transition: { duration: 0.6, delay: 0.32 + k * 0.06, ease: T.ease.out } }),
};

function Card({
  p,
  side,
  dir,
  state,
  hidden,
  pct,
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
  pct: number | null;
  fav: boolean;
  onFav: () => void;
  onListen: () => void;
  onChoose: () => void;
}) {
  const { player } = useTournament();
  const reduce = useReducedMotion();
  const on = player.id === p.id && (player.playing || player.loading);
  const failed = player.failed.has(p.id);
  const bar = useRef<HTMLElement>(null);
  const live = useRef(player);
  live.current = player;

  // Avancement de l'extrait : lu à chaque image, posé en transform, hors React.
  useEffect(() => {
    if (!on) return;
    let raf = 0;
    const loop = () => {
      const t = live.current.getTime();
      if (bar.current) bar.current.style.transform = `scaleX(${t.total ? Math.min(1, t.now / t.total) : 0})`;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [on]);

  const name = hidden ? (side ? "OST B" : "OST A") : engrave(p.title);
  return (
    <motion.article
      className={`ox-card ox-card--${side ? "b" : "a"} is-${state} ${on ? "is-on" : ""}`}
      variants={reduce ? undefined : PIECE}
      custom={dir}
      // L'œuvre suit à peine la souris, comme vue à travers une fenêtre.
      onPointerMove={(e) => {
        if (e.pointerType !== "mouse" || reduce) return;
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
            initial={reduce ? false : { scale: 1.14 }}
            animate={{ scale: 1, transition: { duration: 1.5, ease: T.ease.out } }}
          >
            <Photo p={p} eager portrait={0.6} sizes="(min-height: 900px) 1100px, 900px" />
          </motion.span>
        )}
        <span className="ox-card-play" aria-hidden>
          {on && player.playing ? <Pause size={18} fill="currentColor" strokeWidth={0} /> : <Play size={18} fill="currentColor" strokeWidth={0} />}
        </span>
        <span className="ox-card-bar" aria-hidden>
          <i ref={bar} />
        </span>
      </button>
      <i className="ox-card-tick" aria-hidden />
      <i className="ox-card-corners" aria-hidden />
      {state === "win" ? <i className="ox-card-sweep" aria-hidden /> : null}
      {/* Pendant l'écoute : un égaliseur doré, en haut à droite de l'œuvre. */}
      {on && player.playing ? (
        <span className="ox-eq" aria-hidden>
          <i />
          <i />
          <i />
          <i />
        </span>
      ) : null}
      <div className="ox-card-info">
        <motion.p className="ox-micro" variants={INFO} custom={0} initial={reduce ? false : "hidden"} animate="shown">
          {hidden ? "Titre caché" : (p.sub ?? p.group)}
        </motion.p>
        <h2 className={`ox-card-title ${name.length > 24 ? "is-long" : ""}`}>
          {/* Le titre monte derrière un masque, comme un générique. */}
          <motion.span
            className="ox-card-title-in"
            initial={reduce ? false : { y: "110%" }}
            animate={{ y: 0, transition: { duration: 0.9, delay: 0.34, ease: T.ease.out } }}
          >
            {name}
          </motion.span>
        </h2>
        {!hidden && p.artist ? (
          <motion.p className="ox-card-artist" variants={INFO} custom={2} initial={reduce ? false : "hidden"} animate="shown">
            {p.artist}
          </motion.p>
        ) : null}
        {failed ? <p className="ox-card-artist">Extrait indisponible, tu peux quand même choisir.</p> : null}
        <motion.div className="ox-card-actions" variants={INFO} custom={3} initial={reduce ? false : "hidden"} animate="shown">
          {!hidden ? (
            <Press className={`ox-heart ${fav ? "is-on" : ""}`} onClick={onFav} aria-pressed={fav} aria-label={fav ? `Retirer ${p.title} des favoris` : `Ajouter ${p.title} aux favoris`}>
              <motion.span key={String(fav)} initial={fav && !reduce ? { scale: 0.6 } : false} animate={{ scale: 1, transition: { type: "spring", stiffness: 520, damping: 14 } }}>
                <Heart size={15} fill={fav ? "currentColor" : "none"} strokeWidth={1.4} />
              </motion.span>
            </Press>
          ) : null}
          {state === "idle" ? (
            <Press className="ox-keep" onClick={onChoose}>
              Garder
            </Press>
          ) : (
            <Result pct={pct} win={state === "win"} />
          )}
        </motion.div>
      </div>
    </motion.article>
  );
}

/** Après le choix : « Gardée », puis la part des votes du site qui défile. */
function Result({ pct, win }: { pct: number | null; win: boolean }) {
  const v = useMotionValue(0);
  const text = useTransform(v, (x) => `${Math.round(x)} %`);
  useEffect(() => {
    if (pct == null) return;
    const a = animate(v, pct, { duration: 0.9, ease: T.ease.out });
    return () => a.stop();
  }, [pct, v]);
  return (
    <p className="ox-result">
      {win ? <span className="ox-kept">Gardée</span> : null}
      {pct != null ? <motion.b>{text}</motion.b> : null}
    </p>
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
