import { AnimatePresence, motion, useReducedMotion, type Variants } from "framer-motion";
import { Heart, Pause, Play, RotateCcw, Sparkle } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import { createPortal } from "react-dom";
import { champion, currentMatch, ranking, roundName, shuffle } from "@/lib/tournois/bracket";
import { actions } from "@/lib/tournois/store";
import type { Match, Participant } from "@/lib/tournois/types";
import { fetchPair } from "@/lib/versusStats.js";
import { emitVolTrail } from "../tournois/flame-ink";
import { useTournament } from "../tournois/provider";
import { cueYoutubeSlot } from "../tournois/youtube-deck";
import { Backdrop } from "./backdrop";
import { Fiche } from "./fiche";
import { portraitIn169, prefocus } from "./focus";
import { useRightLane } from "./lanes";
import { Plane, useSpace } from "./space";
import { T } from "./tokens";
import { engrave, Photo, Press } from "./ui";

// Le plan Tournoi, en salle de projection : fond presque noir où les deux
// œuvres du duel reviennent en silhouettes géantes, deux cartes verticales
// encadrées, un séparateur VS doré. Toucher une carte écoute le morceau en entier ;
// « Garder » la fait passer au tour suivant.
//
// Au vote, la pastille reste. Au repos les cartes sont plates. Le volume
// n'existe que le temps du Garder : un dézoom court, un yaw léger vers la
// carte, le travelling, le rezoom. Le flou de vitesse reste sur l'œuvre,
// au pic seulement. Droite → on va à droite. « Annuler » inverse.
// Même minutage que le fond (backdrop.tsx, CAM).

type Side = 0 | 1;

const PACE_MS = { short: 900, normal: 1700, long: 2600 } as const;

let chimeCtx: AudioContext | null = null;
function chime() {
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    chimeCtx = chimeCtx || new AC();
    const o = chimeCtx.createOscillator();
    const g = chimeCtx.createGain();
    o.type = "sine";
    o.frequency.value = 740;
    g.gain.setValueAtTime(0.0001, chimeCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.028, chimeCtx.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, chimeCtx.currentTime + 0.18);
    o.connect(g);
    g.connect(chimeCtx.destination);
    o.start();
    o.stop(chimeCtx.currentTime + 0.2);
  } catch {
    /* pas de son */
  }
}

// dir : 1 on marche à droite, -1 à gauche, 0 premier duel (fondu, pas de travelling).
const CAM = 1.4;
const pose = (x: string, z: number, yaw: number, tilt: number) =>
  `perspective(1500px) rotateY(${yaw}deg) rotateX(${tilt}deg) translate3d(${x}, 0px, ${z}px)`;
const ID = pose("0%", 0, 0, 0);
const BEAT = [0, 0.32, 0.7, 1] as const;

// Léger : ~6° et un petit recul. Les cartes ne tournent pas tant qu'on n'a pas voté.
const rideIn = (dir: number) => {
  const right = dir > 0;
  const x = (n: number) => `${right ? n : -n}%`;
  const yaw = right ? -5 : 5;
  return {
    transform: [pose(x(112), -80, yaw, 2), pose(x(106), -80, yaw * 0.6, 2), pose("0%", -56, 0, 1), ID],
    opacity: 1,
    transition: {
      duration: CAM,
      times: [...BEAT],
      ease: [T.ease.inOut, T.ease.inOut, T.ease.out],
    },
  };
};

const FADE_IN = {
  opacity: 1,
  transform: ID,
  transition: { opacity: { duration: 0.35, ease: T.ease.out }, transform: { duration: 0 } },
};

// Sortie : dézoom + yaw vers la carte, travelling dans le volume, hors champ.
const EXIT: Variants = {
  exit: (dir: number) => {
    const right = dir >= 0;
    const x = (n: number) => `${right ? -n : n}%`;
    const yaw = right ? 5 : -5;
    return {
      transform: [ID, pose("0%", -80, yaw, 2), pose(x(106), -72, yaw * 0.3, 1), pose(x(114), -16, 0, 0)],
      opacity: 1,
      transition: {
        duration: CAM,
        times: [...BEAT],
        ease: [T.ease.out, T.ease.inOut, T.ease.inOut],
      },
    };
  },
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
  const calm = saved.settings.motion === "calme";
  const soft = reduce || calm;
  const both = saved.settings.listen === "both";
  const paceMs = reduce ? 80 : calm ? 640 : PACE_MS[saved.settings.pace];
  const rightLane = useRightLane(both);
  const [sheet, setSheet] = useState<Participant | null>(null);
  const [bridgeOn, setBridgeOn] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const voteCount = saved.votes.length;
  const seenVotes = useRef(voteCount);
  const run = saved.run;
  const [held, setHeld] = useState<{ match: Match; size: number } | null>(null);
  const [vel, setVel] = useState(0);
  const dir = useRef(0);
  // Le travelling d'entrée est figé au premier rendu de la clé. Un vote
  // suivant change dir pendant que la feuille est encore là : on ne rejoue pas l'entrée.
  const shot = useRef<{ key: string; incoming: ReturnType<typeof rideIn> | null } | null>(null);

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
    // Le duel suivant est chargé dans le second cadre, sans lecture.
    // En écoute ensemble ce cadre est déjà pris.
    if (both) return;
    const nxt = ahead[0]?.left;
    if (nxt?.sound?.k === "youtube" && player.id !== nxt.id)
      cueYoutubeSlot("b", { id: nxt.sound.id, start: nxt.sound.start, end: nxt.sound.end, volume: 0 });
  }, [run, cur, both, player.id]);

  useEffect(() => {
    if (!held || paceMs < 400) {
      setBridgeOn(false);
      return;
    }
    const t = window.setTimeout(() => setBridgeOn(true), Math.round(paceMs * 0.4));
    return () => window.clearTimeout(t);
  }, [held, paceMs]);

  useEffect(() => {
    if (voteCount > seenVotes.current) {
      setSavedFlash(true);
      const t = window.setTimeout(() => setSavedFlash(false), 1600);
      seenVotes.current = voteCount;
      return () => window.clearTimeout(t);
    }
    seenVotes.current = voteCount;
  }, [voteCount]);

  const bridge = useMemo(() => {
    if (!held || !run) return null;
    if (!cur) return { kicker: "Manche terminée", title: "Finale", line: "Le tableau est joué." };
    const real = cur.round.matches.filter((x) => x.left && x.right);
    const index = real.findIndex((x) => x.id === cur.match.id) + 1;
    return {
      kicker: cur.round.size !== held.size ? "Manche terminée" : "Duel suivant",
      title: roundName(cur.round.size),
      line: `Duel ${String(Math.max(1, index)).padStart(2, "0")} sur ${real.length}`,
    };
  }, [held, run, cur]);

  const tools = (
    <>
      {savedFlash ? <span className="ox-saved">Enregistré</span> : null}
      <label className="ox-toggle" title="Écouter les deux morceaux en même temps. Chacun a son volume.">
        <input
          type="checkbox"
          checked={both}
          onChange={(e) => {
            const on = e.target.checked;
            if (on && match?.right && player.id === match.right.id) player.stop();
            actions.setPrefs(meta.slug, { listen: on ? "both" : "solo" });
          }}
        />
        <i aria-hidden />
        <span>Ensemble</span>
      </label>
      <button
        type="button"
        className="ox-cap-link"
        aria-pressed={saved.settings.cinematic}
        title="Mode cinéma (C)"
        onClick={() => actions.setPrefs(meta.slug, { cinematic: !saved.settings.cinematic })}
      >
        {saved.settings.cinematic ? "Quitter le cinéma" : "Cinéma"}
      </button>
      <label className="ox-toggle">
        <input type="checkbox" checked={saved.settings.autoplay} onChange={(e) => actions.setAutoplay(meta.slug, e.target.checked)} />
        <i aria-hidden />
        <span>Lecture auto</span>
      </label>
    </>
  );

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
        {tools}
      </Head>
    );
    body = (
      <Duel
        left={pair[0]}
        right={pair[1]}
        dir={dir.current}
        practice
        both={both}
        paceMs={paceMs}
        sfx={false}
        lane={rightLane}
        onOpen={setSheet}
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
        {tools}
      </Head>
    );
    body = (
      <Duel
        left={pair[0]}
        right={pair[1]}
        dir={dir.current}
        blind={run.blind}
        both={both}
        paceMs={paceMs}
        sfx={saved.settings.sfx && !reduce}
        lane={rightLane}
        onOpen={setSheet}
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

  if (!shot.current || shot.current.key !== key) {
    const mountDir = dir.current;
    shot.current = { key, incoming: !soft && mountDir !== 0 ? rideIn(mountDir) : null };
  }
  const incoming = shot.current.incoming;

  useEffect(() => {
    if (soft || dir.current === 0) return;
    const sign = dir.current > 0 ? 1 : -1;
    setVel(0);
    const raf = requestAnimationFrame(() => setVel(sign));
    const stop = window.setTimeout(() => setVel(0), CAM * 1000);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(stop);
    };
  }, [key, soft]);

  const sheetClock = () => {
    if (!sheet) return null;
    if (both && rightLane.lane.id === sheet.id) return rightLane.getTime();
    if (player.id === sheet.id) return player.getTime();
    return null;
  };

  return (
    <Plane i={1} label="Tournoi">
      <div className={`ox-room${both ? " is-both" : ""}`} onPointerDown={onRoomDown} onPointerMove={onRoomMove} onPointerUp={onRoomUp} onPointerCancel={onRoomUp}>
        {/* À l'aveugle, les silhouettes trahiraient les animes : elles n'arrivent qu'une fois le choix fait. */}
        <Backdrop k={key} pair={run?.blind && !practice && !held ? null : pair} dir={dir.current} />
        <motion.div className="ox-room-head" initial={soft ? false : { opacity: 0 }} animate={{ opacity: 1, transition: { duration: 0.35, ease: T.ease.out } }}>
          {head}
        </motion.div>
        <div className="ox-room-stage" data-vel={vel || undefined}>
          <AnimatePresence custom={dir.current}>
            <motion.div
              key={key}
              className="ox-room-slide"
              style={{ transformOrigin: "50% 42%" }}
              custom={dir.current}
              initial={soft ? { opacity: 0 } : incoming ? { transform: incoming.transform[0], opacity: 1 } : { opacity: 0, transform: ID }}
              animate={soft ? { opacity: 1, transition: { duration: 0.2 } } : (incoming ?? FADE_IN)}
              exit="exit"
              variants={soft ? FADE : EXIT}
            >
              {body}
            </motion.div>
          </AnimatePresence>
          {bridgeOn && bridge ? (
            <div className="ox-bridge" role="status">
              <p className="ox-micro">{bridge.kicker}</p>
              <h2>{bridge.title}</h2>
              <p>{bridge.line}</p>
            </div>
          ) : null}
        </div>
        {sheet ? <Fiche p={sheet} clock={sheetClock} onClose={() => setSheet(null)} /> : null}
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

type LaneApi = ReturnType<typeof useRightLane>;

function Duel({
  left,
  right,
  dir,
  blind,
  practice,
  both,
  paceMs,
  sfx,
  lane,
  onOpen,
  onChoose,
  onDone,
}: {
  left: Participant;
  right: Participant;
  dir: number;
  blind?: boolean;
  practice?: boolean;
  both: boolean;
  paceMs: number;
  sfx: boolean;
  lane: LaneApi;
  onOpen: (p: Participant) => void;
  onChoose: (side: Side, ms: number) => boolean;
  onDone: () => void;
}) {
  const { meta, player, saved } = useTournament();
  const { progress } = useSpace();
  const reduce = useReducedMotion();
  const [picked, setPicked] = useState<Side | null>(null);
  const [crowd, setCrowd] = useState<{ a: number; b: number } | null>(null);
  const shownAt = useRef(performance.now());
  const live = useRef(player);
  live.current = player;
  const laneRef = useRef(lane);
  laneRef.current = lane;
  const timers = useRef<number[]>([]);
  const owed = useRef<(() => void) | null>(null);
  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout);
      owed.current?.();
      laneRef.current.stop();
    },
    [],
  );

  // Lecture automatique. « Ensemble » lance les deux. Sinon, seulement la gauche.
  useEffect(() => {
    if (!saved.settings.autoplay || practice) return;
    live.current.play(left);
    actions.noteListen(meta.slug, left.id);
    if (both) {
      laneRef.current.play(right);
      actions.noteListen(meta.slug, right.id);
    }
    // Une fois, à l'arrivée du duel.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(
    () => () => {
      const pl = live.current;
      if (pl.id === left.id || pl.id === right.id) pl.stop();
    },
    // Au démontage seulement.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useEffect(() => {
    if (practice || blind || !meta.statsId) {
      setCrowd(null);
      return;
    }
    let on = true;
    fetchPair(meta.statsId, left.id, right.id).then((r: { a: number; b: number } | null) => {
      if (on) setCrowd(r && r.a + r.b > 0 ? r : null);
    });
    return () => {
      on = false;
    };
  }, [practice, blind, meta.statsId, left.id, right.id]);

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey || e.repeat) return;
      if (Math.round(progress.get()) !== 1) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(t.tagName))) return;
      if (picked != null) return;
      if (e.key === "1") choose(0);
      else if (e.key === "2") choose(1);
      else if (e.key === " ") {
        e.preventDefault();
        const playingLeft = live.current.id === left.id && live.current.playing;
        const playingRight = both && laneRef.current.lane.id === right.id && laneRef.current.lane.playing;
        if (playingLeft || playingRight) {
          if (playingLeft) live.current.pause();
          if (playingRight) laneRef.current.pause();
          return;
        }
        live.current.play(left);
        actions.noteListen(meta.slug, left.id);
      } else if ((e.key === "z" || e.key === "Z") && saved.undo && !practice) {
        actions.undo(meta.slug);
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
    // choose est recréé : on relie à chaque rendu pour lire l'état à jour.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  });

  const choose = (side: Side) => {
    if (picked != null) return;
    if (!onChoose(side, Math.round(performance.now() - shownAt.current))) return;
    setPicked(side);
    const loser = side ? left : right;
    if (player.id === loser.id) player.pause();
    if (lane.lane.id === loser.id) lane.pause();
    if (sfx) chime();
    owed.current = () => {
      owed.current = null;
      onDone();
    };
    timers.current.push(window.setTimeout(() => owed.current?.(), paceMs));
  };

  const transport = (p: Participant, side: Side) => {
    const rightLane = both && side === 1;
    return {
      on: rightLane ? lane.lane.id === p.id && (lane.lane.playing || lane.lane.loading) : player.id === p.id && (player.playing || player.loading),
      playing: rightLane ? lane.lane.id === p.id && lane.lane.playing : player.id === p.id && player.playing,
      failed: rightLane ? lane.lane.failed && lane.lane.id === p.id : player.failed.has(p.id),
      toggle: () => {
        const was = rightLane ? lane.lane.id === p.id && (lane.lane.playing || lane.lane.loading) : player.id === p.id && (player.playing || player.loading);
        if (rightLane) lane.toggle(p);
        else player.toggle(p);
        if (!was) actions.noteListen(meta.slug, p.id);
      },
      play: () => {
        if (rightLane) lane.play(p);
        else player.play(p);
        actions.noteListen(meta.slug, p.id);
      },
      seek: (s: number) => (rightLane ? lane.seek(s) : player.seek(s)),
      getTime: () => (rightLane ? lane.getTime() : player.id === p.id ? player.getTime() : null),
      restart: () => {
        if (rightLane) lane.restart(p);
        else {
          player.seek(0);
          if (player.id !== p.id || !player.playing) player.play(p);
        }
        actions.noteListen(meta.slug, p.id);
      },
      volume: rightLane ? lane.lane.volume : both ? player.volume : null,
      setVolume: rightLane ? lane.setVolume : both ? player.setVolume : null,
    };
  };

  const hidden = !!blind && picked == null;
  const crowdText =
    crowd && !hidden ? `Communauté ${Math.round((crowd.a / (crowd.a + crowd.b)) * 100)} % / ${Math.round((crowd.b / (crowd.a + crowd.b)) * 100)} %` : null;
  return (
    <div className="ox-duel" data-picked={picked ?? undefined}>
      {[left, null, right].map((p, i) => {
        if (!p)
          return (
            <div key="vs" className="ox-vs" aria-hidden={crowdText ? undefined : true}>
              <i className="ox-vs-line" />
              <span>VS</span>
              {crowdText ? <p className="ox-crowd">{crowdText}</p> : null}
              <i className="ox-vs-line" />
            </div>
          );
        const side = (i ? 1 : 0) as Side;
        const bus = transport(p, side);
        return (
          <Card
            key={p.id}
            p={p}
            side={side}
            dir={dir}
            state={picked == null ? "idle" : picked === side ? "win" : "lose"}
            hidden={hidden}
            fav={saved.favorites.includes(p.id)}
            bus={bus}
            onFav={() => actions.toggleFavorite(meta.slug, p.id)}
            onOpen={() => onOpen(p)}
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
  bus,
  onFav,
  onOpen,
  onChoose,
}: {
  p: Participant;
  side: Side;
  dir: number;
  state: "idle" | "win" | "lose";
  hidden: boolean;
  fav: boolean;
  bus: {
    on: boolean;
    playing: boolean;
    failed: boolean;
    toggle: () => void;
    play: () => void;
    seek: (s: number) => void;
    getTime: () => { now: number; total: number } | null;
    restart: () => void;
    volume: number | null;
    setVolume: ((n: number) => void) | null;
  };
  onFav: () => void;
  onOpen: () => void;
  onChoose: () => void;
}) {
  const reduce = useReducedMotion();
  const on = bus.on;
  const failed = bus.failed;
  const scrub = useRef<HTMLInputElement>(null);
  const nowEl = useRef<HTMLSpanElement>(null);
  const endEl = useRef<HTMLSpanElement>(null);
  const dragging = useRef(false);
  const hold = useRef<number | null>(null);
  const suppress = useRef(false);
  const busRef = useRef(bus);
  busRef.current = bus;
  const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

  // La barre suit la musique, sauf pendant que tu la tires.
  useEffect(() => {
    if (!on) return;
    let raf = 0;
    const loop = () => {
      const t = busRef.current.getTime();
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
    const t = busRef.current.getTime();
    const el = scrub.current;
    if (!t?.total || !el) return;
    busRef.current.seek((Number(el.value) / 1000) * t.total);
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
      <button
        type="button"
        className="ox-card-art"
        onPointerDown={() => {
          if (hidden) return;
          suppress.current = false;
          hold.current = window.setTimeout(() => {
            suppress.current = true;
            onOpen();
          }, 520);
        }}
        onPointerUp={() => {
          if (hold.current) window.clearTimeout(hold.current);
        }}
        onPointerLeave={() => {
          if (hold.current) window.clearTimeout(hold.current);
        }}
        onClick={() => {
          if (suppress.current) {
            suppress.current = false;
            return;
          }
          bus.toggle();
        }}
        aria-pressed={on}
        aria-label={`${on ? "Mettre en pause" : "Écouter"} ${name}. Maintiens pour la fiche.`}
        disabled={failed}
      >
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
          {bus.playing ? <Pause size={18} fill="currentColor" strokeWidth={0} /> : <Play size={18} fill="currentColor" strokeWidth={0} />}
        </span>
        <Wave on={bus.playing} timeOf={() => busRef.current.getTime()} />
      </button>
      <i className="ox-card-tick" aria-hidden />
      <i className="ox-card-corners" aria-hidden />
      {state === "win" ? <i className="ox-card-sweep" aria-hidden /> : null}
      <div className="ox-card-info">
        {hidden ? (
          <motion.p className="ox-micro" variants={INFO} custom={0} initial={arrive ? "hidden" : false} animate="shown">
            Titre caché
          </motion.p>
        ) : (
          <motion.button type="button" className="ox-micro ox-card-open" variants={INFO} custom={0} initial={arrive ? "hidden" : false} animate="shown" onClick={onOpen}>
            {p.sub ?? p.group}
          </motion.button>
        )}
        <h2 className={`ox-card-title ${name.length > 24 ? "is-long" : ""}`}>
          <span className="ox-card-title-mask">
            <motion.span
              className="ox-card-title-in"
              initial={arrive ? { transform: "translateY(110%)" } : false}
              animate={arrive ? { transform: "translateY(0%)", transition: { duration: 0.45, delay: 0.08, ease: T.ease.out } } : undefined}
            >
              {hidden ? (
                name
              ) : (
                <button type="button" className="ox-card-title-btn" onClick={onOpen}>
                  {name}
                </button>
              )}
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
          if (!busRef.current.on) busRef.current.play();
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
      <button type="button" className="ox-restart" onClick={() => bus.restart()} aria-label={`Recommencer ${name}`}>
        <RotateCcw size={13} strokeWidth={1.6} />
      </button>
      {bus.setVolume ? (
        <input
          className="ox-lane-vol"
          type="range"
          min={0}
          max={100}
          value={bus.volume ?? 0}
          aria-label={`Volume de ${name}`}
          onPointerDown={(e) => e.stopPropagation()}
          onChange={(e) => bus.setVolume?.(Number(e.target.value))}
        />
      ) : null}
    </div>
    </div>
  );
}

/** Trait doré calé sur la position de lecture. YouTube ne livre pas le signal audio. */
function Wave({ on, timeOf }: { on: boolean; timeOf: () => { now: number; total: number } | null }) {
  const line = useRef<SVGPolylineElement>(null);
  const read = useRef(timeOf);
  read.current = timeOf;
  useEffect(() => {
    if (!on) return;
    let raf = 0;
    const loop = () => {
      const now = read.current()?.now ?? 0;
      const pts: string[] = [];
      for (let i = 0; i <= 28; i++) {
        const x = (i / 28) * 100;
        const y = 50 + Math.sin(now * 2.4 + i * 0.62) * 22 + Math.sin(now * 5.1 + i * 0.28) * 8;
        pts.push(`${x.toFixed(2)},${y.toFixed(2)}`);
      }
      line.current?.setAttribute("points", pts.join(" "));
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [on]);
  if (!on) return null;
  return (
    <svg className="ox-wave" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
      <polyline ref={line} />
    </svg>
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
