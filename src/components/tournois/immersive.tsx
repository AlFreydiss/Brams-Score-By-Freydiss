import { ChevronLeft, ChevronRight, Heart, Maximize, Minimize, Network, Pause, Play, RotateCcw, SkipBack, SkipForward, Volume2, VolumeX } from "lucide-react";
import { animate, AnimatePresence, motion, useMotionValue, useReducedMotion, useTransform, type MotionValue, type PanInfo } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { fetchPair } from "@/lib/versusStats.js";
import { actions } from "@/lib/tournois/store";
import type { Participant } from "@/lib/tournois/types";
import type { RoundInfo, Side } from "./duel-screen";
import { useTournament } from "./provider";
import { SeekBar } from "./progress";
import { Visual } from "./visual";
import { Spectrum } from "./noir/art";

// Duel immersif (openings, endings) : chaque concurrent occupe tout l'écran,
// le suivant dépasse sur le bord droit. On passe de A à B au geste (1:1,
// élan projeté, ressort qui reprend la vitesse du doigt) ; après le vote, la
// piste glisse jusqu'au duel suivant, déjà visible au bord.

type Props = {
  left: Participant;
  right: Participant;
  /** Premier concurrent du duel suivant, pour l'aperçu au bord droit. */
  peek: Participant | null;
  peekLabel: string;
  round: RoundInfo | null;
  isFinal?: boolean;
  blind?: boolean;
  canUndo?: boolean;
  onUndo?: () => void;
  onChoose: (side: Side, ms: number) => boolean;
  onDone: () => void;
};

// Une piste qui jouait au moment du vote continue sur le duel suivant.
let keepPlaying = false;

// Projection d'élan d'Apple (Designing Fluid Interfaces) : où le geste
// s'arrêterait s'il continuait à décélérer.
const project = (v: number, rate = 0.998) => ((v / 1000) * rate) / (1 - rate);

const SIDES: Side[] = ["left", "right"];
const KEY: Record<Side, string> = { left: "A", right: "B" };

export function ImmersiveDuel({ left, right, peek, peekLabel, round, isFinal, blind, canUndo, onUndo, onChoose, onDone }: Props) {
  const { meta, player, saved } = useTournament();
  const navigate = useNavigate();
  const reduce = !!useReducedMotion();
  const stage = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const [step, setStep] = useState(0);
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<Side | null>(null);
  const [split, setSplit] = useState<{ left: number; total: number } | null>(null);
  const [full, setFull] = useState(() => typeof document !== "undefined" && !!document.fullscreenElement);
  const shownAt = useRef(performance.now());
  const dragged = useRef(false);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const parts = [left, right];
  const max = picked ? 2 : 1;

  // La scène remplit exactement l'écran sous les barres du site : leur
  // hauteur réelle est mesurée (elle varie selon l'écran), puis on remonte en haut.
  useLayoutEffect(() => {
    const el = stage.current;
    if (!el) return;
    if (!document.fullscreenElement && window.scrollY > 0) window.scrollTo({ top: 0, behavior: "instant" });
    const fit = () => {
      if (document.fullscreenElement) {
        el.style.removeProperty("height");
        return;
      }
      const top = el.getBoundingClientRect().top + window.scrollY;
      el.style.height = `calc(100dvh - ${Math.round(top)}px)`;
    };
    fit();
    window.addEventListener("resize", fit);
    document.addEventListener("fullscreenchange", fit);
    return () => {
      window.removeEventListener("resize", fit);
      document.removeEventListener("fullscreenchange", fit);
    };
  }, []);

  // Largeur d'une slide : l'écran moins l'aperçu du suivant.
  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      const w = e.contentRect.width;
      const slide = w * (w < 760 ? 0.88 : 0.86);
      const next = slide + 12;
      setStep(next);
      x.set(-idx * next);
    });
    ro.observe(el);
    return () => ro.disconnect();
    // La position suit l'index courant au redimensionnement seulement.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [x]);

  const go = useCallback(
    (target: number, velocity = 0) => {
      const i = Math.max(0, Math.min(max, target));
      setIdx(i);
      if (!step) return;
      const to = -i * step;
      if (reduce) x.set(to);
      // Ressort amorti par défaut ; un léger rebond seulement si un geste a donné de l'élan.
      else animate(x, to, { type: "spring", bounce: Math.abs(velocity) > 400 ? 0.16 : 0, duration: 0.55, velocity });
      // Continuité : si une piste du duel joue, celle de la slide d'arrivée prend le relais.
      if (i < 2 && !picked) {
        const p = parts[i];
        const playingDuel = player.playing && (player.id === left.id || player.id === right.id);
        if (playingDuel && player.id !== p.id && !player.failed.has(p.id)) player.play(p);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [max, step, reduce, x, picked, player, left, right],
  );

  // Piste qui jouait au vote du duel précédent : elle continue sur celui-ci.
  useEffect(() => {
    if (keepPlaying && !player.failed.has(left.id)) player.play(left);
    keepPlaying = false;
    // Au montage seulement.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Au démontage, le duel ne coupe que sa propre piste.
  const live = useRef(player);
  live.current = player;
  useEffect(
    () => () => {
      const pl = live.current;
      if (!keepPlaying && (pl.id === left.id || pl.id === right.id)) pl.stop();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const choose = useCallback(
    (side: Side) => {
      if (picked) return;
      const ok = onChoose(side, Math.round(performance.now() - shownAt.current));
      if (!ok) return;
      setPicked(side);
      const winner = side === "left" ? left : right;
      const loser = side === "left" ? right : left;
      keepPlaying = player.playing && (player.id === left.id || player.id === right.id);
      if (player.id === loser.id) {
        if (keepPlaying) player.play(winner);
        else player.pause();
      }
      // La slide gardée vient au centre le temps du verdict.
      const at = side === "left" ? 0 : 1;
      setIdx(at);
      if (step && !reduce) animate(x, -at * step, { type: "spring", bounce: 0, duration: 0.45 });
      else if (step) x.set(-at * step);
      if (meta.statsId) {
        const statsId = meta.statsId;
        setTimeout(() => {
          fetchPair(statsId, left.id, right.id).then((r: { a: number; b: number } | null) => {
            if (!r || !alive.current) return;
            const total = r.a + r.b;
            setSplit({ left: total ? Math.round((r.a / total) * 100) : 50, total });
          });
        }, 350);
      }
      // Verdict lisible, puis glissement jusqu'au duel suivant (déjà au bord droit).
      const hold = reduce ? 700 : meta.statsId ? 1500 : 1000;
      setTimeout(() => {
        if (!alive.current) return;
        if (keepPlaying) player.pause();
        setIdx(2);
        if (!step || reduce) {
          onDone();
          return;
        }
        animate(x, -2 * step, { type: "spring", bounce: 0, duration: 0.7 }).then(() => alive.current && onDone());
      }, hold);
    },
    [picked, onChoose, left, right, player, step, reduce, x, meta.statsId, onDone],
  );

  const listen = useCallback(
    (side: Side) => {
      const p = side === "left" ? left : right;
      if (player.failed.has(p.id)) return;
      player.toggle(p);
      const at = side === "left" ? 0 : 1;
      if (idx !== at) go(at);
    },
    [left, right, player, idx, go],
  );

  const toggleFull = useCallback(() => {
    const el = stage.current?.closest<HTMLElement>(".t-duel-page") ?? stage.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else el.requestFullscreen?.().catch(() => {});
  }, []);
  useEffect(() => {
    const on = () => setFull(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", on);
    return () => document.removeEventListener("fullscreenchange", on);
  }, []);

  // Clavier : ← → changer de slide, A / B garder, Entrée garder la slide
  // affichée, Espace lecture, F favori, T tableau, Retour arrière annuler.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t?.closest("input, textarea, select, [role=dialog]") || e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key;
      const focusSide: Side = idx === 1 ? "right" : "left";
      if (k === "ArrowRight") {
        e.preventDefault();
        go(idx + 1);
      } else if (k === "ArrowLeft") {
        e.preventDefault();
        go(idx - 1);
      } else if (k === "a" || k === "A") choose("left");
      else if (k === "b" || k === "B") choose("right");
      else if (k === "Enter" && t === document.body && idx < 2) {
        e.preventDefault();
        choose(focusSide);
      } else if (k === " " && t === document.body && idx < 2) {
        e.preventDefault();
        listen(focusSide);
      } else if (k === "f" || k === "F") actions.toggleFavorite(meta.slug, parts[Math.min(idx, 1)].id);
      else if (k === "t" || k === "T") navigate(`/tournoi/${meta.path}/tableau`);
      else if (k === "Backspace" && canUndo && onUndo && !picked) {
        e.preventDefault();
        onUndo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, go, choose, listen, meta.slug, meta.path, navigate, canUndo, onUndo, picked]);

  // Trackpad / Maj + molette : un cran horizontal = une slide.
  const wheelLock = useRef(0);
  const onWheel = (e: React.WheelEvent) => {
    const dx = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.shiftKey ? e.deltaY : 0;
    if (Math.abs(dx) < 18 || performance.now() < wheelLock.current) return;
    wheelLock.current = performance.now() + 520;
    go(idx + (dx > 0 ? 1 : -1));
  };

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (!step) return;
    const projected = x.get() + project(info.velocity.x);
    // Un petit geste rapide suffit à changer de slide.
    let target = Math.round(-projected / step);
    // Un geste rapide, ou un glissé franc même lent (18 % d'une slide), change de slide.
    if (target === idx && ((Math.abs(info.offset.x) > 40 && Math.abs(info.velocity.x) > 250) || Math.abs(info.offset.x) > step * 0.18)) target = idx + (info.offset.x < 0 ? 1 : -1);
    target = Math.max(idx - 1, Math.min(idx + 1, target));
    go(target, info.velocity.x);
    setTimeout(() => (dragged.current = false), 0);
  };

  const playingP = player.id === left.id ? left : player.id === right.id ? right : null;
  const nowName = playingP ? (blind && !picked ? `Piste ${playingP === left ? "A" : "B"}` : playingP.title) : null;
  const vol = player.muted ? 0 : player.volume;
  const jump = (d: number) => {
    const t = player.getTime();
    if (!playingP || !t) return;
    player.seek(Math.min(Math.max(0, t.now + d), t.total || t.now + Math.max(0, d)));
  };

  return (
    <div ref={stage} className={`im-stage ${full ? "is-full" : ""}`} onWheel={onWheel} data-picked={picked ?? undefined}>
      <div className="im-progress" aria-hidden>
        <i style={{ transform: `scaleX(${round?.progress ?? 0})` }} />
      </div>

      <motion.div
        className="im-track"
        style={{ x }}
        drag={step ? "x" : false}
        dragConstraints={{ left: -max * step, right: 0 }}
        dragElastic={0.14}
        dragMomentum={false}
        onDragStart={() => (dragged.current = true)}
        onDragEnd={onDragEnd}
      >
        {SIDES.map((side, i) => {
          const p = parts[i];
          const hidden = !!blind && !picked;
          const loaded = player.id === p.id;
          const playing = loaded && player.playing;
          const fav = saved.favorites.includes(p.id);
          return (
            <Slide key={side} i={i} x={x} step={step} focus={idx === i} reduce={reduce} onPeek={() => !dragged.current && idx !== i && go(i)}>
              <div className={`im-media ${playing ? "is-playing" : ""}`}>
                <Visual p={p} player={player} posterAt={meta.posterAt} sizes="90vw" />
              </div>
              {hidden ? (
                <div className="im-blind" aria-hidden>
                  {KEY[side]}
                </div>
              ) : null}
              <div className="im-shade" aria-hidden />
              <span className="im-tag">{KEY[side]}</span>
              <AnimatePresence>{picked === side ? <Kept key="kept" text={isFinal ? meta.championLabel : "Passe au tour suivant"} /> : null}</AnimatePresence>
              <div className="im-info">
                <p className="im-kicker">
                  <span>{round ? (isFinal ? "Finale" : round.label) : "Duel"}</span>
                  {round ? <span className="im-num">Duel {round.index} / {round.total}</span> : null}
                </p>
                <h2 className={`im-title ${!hidden && p.title.length > 22 ? "is-long" : ""}`}>{hidden ? `Piste ${KEY[side]}` : p.title}</h2>
                <p className="im-sub">{hidden ? "Titre caché jusqu'à ton choix" : [p.sub, p.note, p.artist].filter(Boolean).join(" — ")}</p>
                {!picked ? (
                  <div className="im-actions">
                    <button type="button" className="im-keep" onClick={() => choose(side)} aria-label={`${meta.choose} : ${hidden ? `piste ${KEY[side]}` : p.title}`}>
                      Garder <kbd aria-hidden>{KEY[side]}</kbd>
                    </button>
                    <button
                      type="button"
                      className="im-round-btn"
                      onClick={() => listen(side)}
                      aria-pressed={playing}
                      aria-label={`${playing ? "Mettre en pause" : "Écouter"} ${hidden ? `la piste ${KEY[side]}` : p.title}`}
                      disabled={player.failed.has(p.id)}
                    >
                      {loaded && player.loading ? <span className="nx-spin" aria-hidden /> : playing ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
                    </button>
                    <button
                      type="button"
                      className={`im-round-btn ${fav ? "is-on" : ""}`}
                      onClick={() => actions.toggleFavorite(meta.slug, p.id)}
                      aria-pressed={fav}
                      aria-label={fav ? `Retirer ${p.title} des favoris` : `Ajouter ${p.title} aux favoris`}
                      disabled={hidden}
                    >
                      <Heart size={18} fill={fav ? "currentColor" : "none"} />
                    </button>
                  </div>
                ) : null}
              </div>
            </Slide>
          );
        })}

        <Slide i={2} x={x} step={step} focus={idx === 2} reduce={reduce} onPeek={() => undefined} isPeek>
          {peek ? (
            <div className="im-media">
              <Visual p={peek} posterAt={meta.posterAt} sizes="90vw" />
            </div>
          ) : null}
          <div className="im-shade" aria-hidden />
          <div className="im-info im-info--peek">
            <p className="im-kicker">
              <span>{peekLabel}</span>
            </p>
            <h2 className="im-title">{peek && !blind ? peek.title : "La suite du tableau"}</h2>
            {peek && !blind ? <p className="im-sub">{peek.sub}</p> : null}
          </div>
        </Slide>
      </motion.div>

      <div className="im-nav" aria-hidden={false}>
        <button type="button" onClick={() => go(idx - 1)} disabled={idx === 0} aria-label="Slide précédente">
          <ChevronLeft size={20} />
        </button>
        <button type="button" onClick={() => go(idx + 1)} disabled={idx >= max} aria-label="Slide suivante">
          <ChevronRight size={20} />
        </button>
      </div>

      <AnimatePresence>
        {split && split.total ? (
          <motion.div
            className="im-split"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0, transition: { type: "spring", bounce: 0, duration: 0.5 } }}
            exit={{ opacity: 0 }}
            role="img"
            aria-label={`Votes du site : ${split.left} % pour A, ${100 - split.left} % pour B, sur ${split.total} votes`}
          >
            <b>A {split.left} %</b>
            <span>
              <motion.i initial={{ width: "50%" }} animate={{ width: `${split.left}%`, transition: { type: "spring", bounce: 0, duration: 1 } }} />
            </span>
            <b>{100 - split.left} % B</b>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className="im-bar">
        <div className="im-bar-group">
          <button type="button" onClick={() => jump(-10)} disabled={!playingP} aria-label="Reculer de 10 secondes">
            <SkipBack size={16} />
          </button>
          <button
            type="button"
            className="im-bar-play"
            onClick={() => (playingP ? player.toggle(playingP) : idx < 2 && listen(idx === 1 ? "right" : "left"))}
            aria-label={playingP ? (player.playing ? `Mettre en pause ${nowName}` : `Reprendre ${nowName}`) : "Écouter la slide affichée"}
          >
            {player.playing && playingP ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
          </button>
          <button type="button" onClick={() => jump(10)} disabled={!playingP} aria-label="Avancer de 10 secondes">
            <SkipForward size={16} />
          </button>
        </div>
        <div className="im-bar-now">
          <p>{nowName ?? "Rien en lecture"}</p>
          <SeekBar player={player} active={!!playingP} label={nowName ? `Position dans ${nowName}` : "Aucune piste en lecture"} className="im-seek" />
        </div>
        <div className="im-bar-group">
          <div className="im-bar-spectrum">
            <Spectrum active={!!playingP} player={player} bars={24} />
          </div>
          <button type="button" onClick={player.toggleMute} aria-pressed={player.muted} aria-label={player.muted ? "Rétablir le son" : "Couper le son"}>
            {player.muted || player.volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
          <input
            type="range"
            className="im-vol"
            min={0}
            max={100}
            value={vol}
            onChange={(e) => player.setVolume(Number(e.target.value))}
            aria-label="Volume"
            style={{ "--p": `${vol}%` } as React.CSSProperties}
          />
          {canUndo && onUndo ? (
            <button type="button" onClick={onUndo} disabled={!!picked} aria-label="Annuler mon dernier choix" title="Annuler (Retour arrière)">
              <RotateCcw size={16} />
            </button>
          ) : null}
          <Link to={`/tournoi/${meta.path}/tableau`} aria-label="Tableau du tournoi" title="Tableau (T)">
            <Network size={16} />
          </Link>
          <button type="button" onClick={toggleFull} aria-label={full ? "Quitter le plein écran" : "Plein écran"} title={full ? "Quitter le plein écran" : "Plein écran"}>
            {full ? <Minimize size={16} /> : <Maximize size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
}

// Une slide : sa profondeur (échelle, voile) dépend en continu de sa distance
// au centre, calculée depuis la position du doigt, pas d'un état final.
function Slide({ i, x, step, focus, reduce, onPeek, isPeek, children }: { i: number; x: MotionValue<number>; step: number; focus: boolean; reduce: boolean; onPeek: () => void; isPeek?: boolean; children: React.ReactNode }) {
  const d = useTransform(x, (v) => (step ? Math.min(1.4, Math.abs(v + i * step) / step) : i));
  const scale = useTransform(d, (t) => (reduce ? 1 : 1 - Math.min(t, 1) * 0.07));
  const veil = useTransform(d, (t) => Math.min(t, 1) * 0.62);
  const info = useTransform(d, (t) => Math.max(0, 1 - t * 2.2));
  const lift = useTransform(d, (t) => (reduce ? 0 : Math.min(t, 1) * 18));
  return (
    <motion.section className={`im-slide ${focus ? "is-focus" : ""} ${isPeek ? "is-peek" : ""}`} style={{ scale }} onClick={onPeek} aria-hidden={isPeek || undefined}>
      <motion.div className="im-slide-in" style={{ "--info": info, "--lift": lift } as never}>
        {children}
      </motion.div>
      <motion.div className="im-veil" style={{ opacity: veil }} aria-hidden />
    </motion.section>
  );
}

function Kept({ text }: { text: string }) {
  return (
    <motion.p
      className="im-kept"
      initial={{ opacity: 0, scale: 0.9, y: 6 }}
      animate={{ opacity: 1, scale: 1, y: 0, transition: { type: "spring", bounce: 0.25, duration: 0.5 } }}
      exit={{ opacity: 0 }}
    >
      {text}
    </motion.p>
  );
}
