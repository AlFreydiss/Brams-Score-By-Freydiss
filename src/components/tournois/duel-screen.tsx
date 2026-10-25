import { ArrowLeftRight, BookOpenText, Expand, Heart, Maximize, Minimize, Network, Pause, Play, RotateCcw, Settings, Volume2, VolumeX, X } from "lucide-react";
import { animate, motion, useMotionValue, useMotionValueEvent, useReducedMotion, useTransform, type Variants } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Seam } from "@/lib/tournois/catalog";
import { edgeFor, gapFor, shape } from "@/lib/tournois/geometry";
import { runStatus } from "@/lib/tournois/stats";
import { fetchPair } from "@/lib/versusStats.js";
import { actions } from "@/lib/tournois/store";
import type { Participant } from "@/lib/tournois/types";
import { SeekBar } from "./progress";
import { useTournament } from "./provider";
import { Visual } from "./visual";
import { Visualizer } from "./visualizer";

export type Side = "left" | "right";

export type RoundInfo = {
  label: string;
  index: number;
  total: number;
  remaining: number;
  /** Avancement du tournoi entier, 0 → 1. */
  progress: number;
};

type Props = {
  left: Participant;
  right: Participant;
  round: RoundInfo | null;
  isFinal?: boolean;
  practice?: boolean;
  blind?: boolean;
  canUndo?: boolean;
  onUndo?: () => void;
  /** Enregistre le choix ; false = refusé (duel déjà tranché). */
  onChoose: (side: Side, ms: number) => boolean;
  /** Fin de l'animation du choix : la page peut afficher la suite. */
  onDone: () => void;
  /** Le duel arrive en glissant depuis le précédent : pas de seconde entrée. */
  swiped?: boolean;
};

// Durée de l'entrée propre à chaque univers avant que le duel soit jouable.
// Même rythme dans chaque univers : seule la forme de la coupe change.
const ENTER_MS: Record<Seam, number> = { diag: 1100, screens: 1100, feather: 1100, tape: 1100, zigzag: 1100, slash: 1100, gutter: 1100 };
// Écart (px) entre les deux moitiés une fois coupées.
const PART_PX: Record<Seam, number> = { diag: 6, screens: 0, feather: 0, tape: 0, zigzag: 4, slash: 0, gutter: 0 };

const EASE = [0.2, 0.8, 0.2, 1] as const;
// Écoute alternée : durée d'un passage, et boucle sur l'extrait de 30 s.
const AB_SEG = 7;
const AB_LOOP = 28;
const CUT = [0.7, 0, 0.2, 1] as const;

function useNarrow() {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 760px)");
    const on = () => setNarrow(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return narrow;
}

export function DuelScreen(props: Props) {
  const narrow = useNarrow();
  // Changer d'orientation recalcule toute la géométrie : on remonte la scène.
  return <Stage key={narrow ? "v" : "h"} vertical={narrow} {...props} />;
}

function Stage({ left, right, round, isFinal, practice, blind, canUndo, onUndo, onChoose, onDone, swiped, vertical }: Props & { vertical: boolean }) {
  const { meta, player, saved } = useTournament();
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  const seam = meta.seam;
  const audio = meta.mode === "audio";
  // Openings et endings gardent leur régie d'origine : pas d'écoute alternée.
  const abOk = audio && seam !== "screens" && seam !== "feather";
  const stageRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<"enter" | "open" | "picked">(reduce || swiped ? "open" : "enter");
  const [picked, setPicked] = useState<Side | null>(null);
  const [focus, setFocus] = useState<Side>("left");
  const [toast, setToast] = useState<{ text: string; tone: "ok" | "err" } | null>(null);
  const [settings, setSettings] = useState(false);
  const [zoom, setZoom] = useState<Participant | null>(null);
  // Le plein écran vit sur la page du duel, pas sur la scène : chaque duel
  // remonte une scène neuve, et le navigateur quitte le plein écran quand
  // l'élément affiché disparaît.
  const [full, setFull] = useState(() => typeof document !== "undefined" && !!document.fullscreenElement);
  // Répartition des votes du site sur ce duel, lue juste après le choix.
  const [split, setSplit] = useState<{ left: number; total: number } | null>(null);
  // Écoute alternée : A puis B, 7 s chacun, au même passage du morceau.
  const [ab, setAb] = useState(false);
  const [abTurn, setAbTurn] = useState<{ side: Side; n: number } | null>(null);
  const alive = useRef(true);
  useEffect(() => {
    // Remis à vrai au montage : le double montage du mode strict ne le laisse pas à faux.
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const shownAt = useRef(0);

  const s = useMotionValue(50);
  const open = useMotionValue(reduce || swiped ? 1 : 0);
  const w = useMotionValue(1200);
  const h = useMotionValue(800);

  // Le duel occupe tout l'écran sous les barres : on le remet en place s'il a
  // défilé (bouton de départ cliqué plus bas dans la page, par exemple).
  useEffect(() => {
    if (window.scrollY > 0 && !document.fullscreenElement) window.scrollTo({ top: 0, behavior: "instant" });
  }, []);

  // Taille réelle de la scène (marges comprises pour la planche) : sert aux
  // écarts en pixels et au tracé du trait.
  useEffect(() => {
    const el = sceneRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      w.set(e.contentRect.width);
      h.set(e.contentRect.height);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [w, h]);

  const geo = () => shape(seam, s.get(), vertical, gapFor(seam, vertical ? h.get() : w.get()));
  const clipL = useTransform(() => geo().left);
  const clipR = useTransform(() => geo().right);
  const boxL = useTransform(() => `${geo().leftBox}%`);
  const boxR = useTransform(() => `${geo().rightBox}%`);
  const seamPath = useTransform(() => {
    const pts = geo().seam;
    const W = w.get();
    const H = h.get();
    return pts.map(([x, y], i) => `${i ? "L" : "M"}${((x * W) / 100).toFixed(1)} ${((y * H) / 100).toFixed(1)}`).join(" ");
  });
  const outlineL = useTransform(() => polyPath(geo().left, w.get(), h.get()));
  const outlineR = useTransform(() => polyPath(geo().right, w.get(), h.get()));
  const featherVar = useTransform(() => `${s.get()}%`);
  const vsX = useTransform(() => {
    const pts = geo().seam;
    return `${(pts[0][0] + pts[pts.length - 1][0]) / 2}%`;
  });
  const vsY = useTransform(() => {
    const pts = geo().seam;
    return `${(pts[0][1] + pts[pts.length - 1][1]) / 2}%`;
  });
  const partL = useTransform(open, (o) => -o * PART_PX[seam]);
  const partR = useTransform(open, (o) => o * PART_PX[seam]);

  // Entrée : chaque univers a sa propre ouverture (CSS, selon data-phase), puis
  // les deux moitiés s'écartent et le duel devient jouable.
  useEffect(() => {
    if (reduce || swiped) {
      shownAt.current = performance.now();
      return;
    }
    const enter = ENTER_MS[seam];
    const a = animate(open, 1, { delay: (enter * 0.72) / 1000, duration: 0.8, ease: EASE });
    const t = setTimeout(() => {
      setPhase("open");
      shownAt.current = performance.now();
    }, enter);
    return () => {
      a.stop();
      clearTimeout(t);
    };
    // Une seule entrée, au montage.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduce, seam, open]);

  // Lecture automatique de la piste A, seulement si l'utilisateur l'a demandée.
  useEffect(() => {
    if (phase !== "open" || !audio || !saved.settings.autoplay) return;
    const first = player.failed.has(left.id) ? right : left;
    player.play(first);
    // Une seule fois par duel, à l'ouverture.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // Le duel suivant repart d'un lecteur propre. Pendant le glissement, l'ancien
  // duel ne coupe que sa propre piste : le nouveau a déjà pu en lancer une.
  const live = useRef(player);
  live.current = player;
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
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  const lean = (side: Side | null) => {
    // Des écrans de régie ne bougent pas : pas de bascule au survol.
    if (vertical || picked || phase !== "open" || seam === "screens") return;
    animate(s, side === "left" ? 53 : side === "right" ? 47 : 50, { type: "spring", stiffness: 260, damping: 30 });
  };

  const choose = useCallback(
    (side: Side) => {
      if (picked || phase !== "open") return;
      const ok = onChoose(side, Math.round(performance.now() - shownAt.current));
      if (!ok) {
        setToast({ text: "Ce duel est déjà tranché. Recharge la page pour reprendre.", tone: "err" });
        return;
      }
      setPicked(side);
      setPhase("picked");
      setAb(false);
      // Le perdant se tait : seul le gagnant peut encore jouer pendant le verdict.
      const loser = side === "left" ? right : left;
      if (player.id === loser.id) player.pause();
      setToast({ text: practice ? "Duel test : ce choix ne compte pas." : "Vote enregistré. L'aventure continue.", tone: "ok" });
      animate(s, edgeFor(seam, side, vertical), { duration: reduce ? 0 : 0.8, ease: CUT });
      if (meta.statsId) {
        const statsId = meta.statsId;
        // Laisse le vote arriver en base avant de lire la répartition.
        setTimeout(() => {
          fetchPair(statsId, left.id, right.id).then((r: { a: number; b: number } | null) => {
            if (!r || !alive.current) return;
            const total = r.a + r.b;
            // Le verdict prend la place du message de confirmation.
            if (total) setToast(null);
            setSplit({ left: total ? Math.round((r.a / total) * 100) : 50, total });
          });
        }, 400);
      }
      // Le verdict se lit, puis le duel suivant arrive sans faire attendre.
      setTimeout(onDone, reduce ? 900 : meta.statsId ? 1800 : 1100);
    },
    [picked, phase, onChoose, practice, s, seam, vertical, reduce, onDone, meta.statsId, left, right, player],
  );

  const listen = useCallback(
    (side: Side) => {
      const p = side === "left" ? left : right;
      setFocus(side);
      setAb(false);
      if (!audio || player.failed.has(p.id)) return;
      player.toggle(p);
    },
    [audio, left, right, player],
  );

  // Écoute alternée : chaque tour relance l'autre moitié au même passage
  // (0 s, 0 s, puis 7 s, 7 s…), pour comparer à l'oreille sans rien toucher.
  const playerRef = useRef(player);
  playerRef.current = player;
  useEffect(() => {
    if (!ab || !abOk) {
      setAbTurn(null);
      return;
    }
    let n = 0;
    const turn = () => {
      const pl = playerRef.current;
      const okL = !pl.failed.has(left.id);
      const okR = !pl.failed.has(right.id);
      if (!okL && !okR) return setAb(false);
      const side: Side = (n % 2 === 0 && okL) || !okR ? "left" : "right";
      const p = side === "left" ? left : right;
      pl.play(p);
      pl.seek((Math.floor(n / 2) * AB_SEG) % AB_LOOP);
      setFocus(side);
      setAbTurn({ side, n });
      n++;
    };
    turn();
    const t = setInterval(turn, AB_SEG * 1000);
    return () => clearInterval(t);
  }, [ab, abOk, left, right]);

  const toggleFull = useCallback(() => {
    const el = stageRef.current?.closest<HTMLElement>(".t-duel-page") ?? stageRef.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else el.requestFullscreen?.().catch(() => {});
  }, []);

  useEffect(() => {
    const on = () => setFull(!!document.fullscreenElement?.contains(stageRef.current));
    document.addEventListener("fullscreenchange", on);
    return () => document.removeEventListener("fullscreenchange", on);
  }, []);

  // Clavier : ← → écouter (ou choisir, pour les images), Entrée choisir,
  // Espace pause, F favori, T tableau, Retour arrière annuler.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t?.closest("input, textarea, select, [role=dialog]") || e.metaKey || e.ctrlKey || e.altKey) return;
      if (zoom || settings) return;
      const k = e.key;
      if (k === "ArrowLeft" || k === "ArrowRight") {
        e.preventDefault();
        const side: Side = k === "ArrowLeft" ? "left" : "right";
        if (audio) listen(side);
        else choose(side);
      } else if (k === "Enter" && t === document.body) {
        e.preventDefault();
        choose(focus);
      } else if (k === " " && t === document.body && audio) {
        e.preventDefault();
        listen(focus);
      } else if ((k === "c" || k === "C") && abOk && !picked) {
        setAb((v) => !v);
      } else if (k === "f" || k === "F") {
        actions.toggleFavorite(meta.slug, (focus === "left" ? left : right).id);
      } else if ((k === "t" || k === "T") && !practice) {
        navigate(`/tournoi/${meta.path}/tableau`);
      } else if (k === "Backspace" && canUndo && onUndo && !picked) {
        e.preventDefault();
        onUndo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [audio, listen, choose, focus, zoom, settings, meta.slug, left, right, practice, navigate, canUndo, onUndo, picked]);

  const halves: { side: Side; p: Participant; clip: typeof clipL; box: typeof boxL; part: typeof partL; outline: typeof outlineL }[] = [
    { side: "left", p: left, clip: clipL, box: boxL, part: partL, outline: outlineL },
    { side: "right", p: right, clip: clipR, box: boxR, part: partR, outline: outlineR },
  ];

  return (
    <div
      ref={stageRef}
      className={`t-stage ${vertical ? "is-v" : "is-h"} ${full ? "is-full" : ""}`}
      data-seam={seam}
      data-swiped={swiped || undefined}
      data-phase={phase}
      data-picked={picked ?? undefined}
      onPointerLeave={(e) => {
        lean(null);
        e.currentTarget.style.setProperty("--mx", "0");
        e.currentTarget.style.setProperty("--my", "0");
      }}
      onPointerMove={(e) => {
        if (e.pointerType !== "mouse" || reduce) return;
        const r = e.currentTarget.getBoundingClientRect();
        e.currentTarget.style.setProperty("--mx", (((e.clientX - r.left) / r.width) * 2 - 1).toFixed(3));
        e.currentTarget.style.setProperty("--my", (((e.clientY - r.top) / r.height) * 2 - 1).toFixed(3));
      }}
    >
      <motion.div
        ref={sceneRef}
        className="t-scene"
        initial={swiped ? false : reduce ? { opacity: 0 } : "hidden"}
        animate={reduce ? { opacity: 1 } : "shown"}
        exit={reduce ? { opacity: 0 } : "gone"}
        variants={SCENE_VARIANTS[seam]}
        style={seam === "feather" ? ({ "--s": featherVar } as never) : undefined}
      >
        {halves.map(({ side, p, clip, box, part, outline }) => {
          const loaded = player.id === p.id;
          const playing = loaded && player.playing;
          const loading = loaded && player.loading;
          const failed = player.failed.has(p.id);
          const fav = saved.favorites.includes(p.id);
          const win = picked === side;
          const lose = !!picked && !win;
          const hidden = blind && !picked;
          const sideName = meta.balanced && p.camp ? (p.camp === "rap" ? "Rap FR" : "OST anime") : meta.sides[side === "left" ? 0 : 1];
          return (
            <motion.section
              key={side}
              data-camp={p.camp}
              aria-label={`${sideName} : ${hidden ? "titre caché" : `${p.title}, ${p.sub ?? ""}`}`}
              className={`t-half t-half--${side} ${playing ? "is-playing" : ""} ${focus === side ? "is-focus" : ""} ${win ? "is-win" : ""} ${lose ? "is-lose" : ""} ${failed ? "is-failed" : ""}`}
              style={{ clipPath: seam === "feather" ? undefined : clip, [vertical ? "y" : "x"]: part }}
              onPointerEnter={(e) => e.pointerType !== "touch" && lean(side)}
            >
              <motion.div className="t-media" style={{ [vertical ? "height" : "width"]: box }}>
                {hidden ? (
                  <span className="t-blind" aria-hidden>
                    {side === "left" ? "A" : "B"}
                  </span>
                ) : (
                  <Visual p={p} player={player} posterAt={meta.posterAt} />
                )}
              </motion.div>
              {audio ? <Visualizer seam={seam} active={playing} side={side} /> : null}
              <button
                type="button"
                className="t-hit"
                tabIndex={-1}
                aria-hidden
                disabled={phase !== "open"}
                onClick={() => (audio ? listen(side) : choose(side))}
              />
              <div className="t-info">
                {win ? <p className="t-kept">{practice ? "Ton choix (essai)" : isFinal ? meta.championLabel : "Passe au tour suivant"}</p> : null}
                <p className="t-side">
                  {sideName}
                  {abTurn?.side === side ? <i key={abTurn.n} className="t-ab-tick" aria-hidden /> : null}
                </p>
                <p className="t-sub">{hidden ? "Titre caché jusqu'à ton choix" : p.sub}</p>
                <h2 className={`t-title ${!hidden && p.title.length > 24 ? "is-long" : ""}`}>{hidden ? "À l'aveugle" : p.title}</h2>
                {!hidden && (p.artist || p.note) ? (
                  <p className="t-artist">{[p.artist, p.note].filter(Boolean).join(", ")}</p>
                ) : null}
                {win && split && !split.total ? <p className="t-rate">Aucun autre vote sur ce duel pour l’instant.</p> : null}
                {failed ? <p className="t-fail">Lecture impossible : la source ne répond pas. Tu peux quand même voter.</p> : null}
                {!picked ? (
                  <>
                    <div className="t-ctrl">
                      {audio ? (
                        <button
                          type="button"
                          className="t-btn t-btn--play"
                          onClick={() => listen(side)}
                          disabled={failed || phase === "enter"}
                          aria-pressed={playing}
                          aria-label={`${playing ? "Mettre en pause" : "Écouter"} ${hidden ? sideName : p.title}`}
                        >
                          {playing ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
                          <span>{failed ? "Indisponible" : loading ? "Chargement…" : playing ? "Pause" : loaded && player.ended ? "Réécouter" : loaded ? "Reprendre" : "Écouter"}</span>
                        </button>
                      ) : (
                        <button type="button" className="t-btn t-btn--play" onClick={() => setZoom(p)} disabled={hidden}>
                          <Expand size={16} />
                          <span>Agrandir</span>
                        </button>
                      )}
                      <button
                        type="button"
                        className={`t-btn t-btn--icon t-fav ${fav ? "is-on" : ""}`}
                        onClick={() => actions.toggleFavorite(meta.slug, p.id)}
                        aria-pressed={fav}
                        aria-label={fav ? `Retirer ${p.title} des favoris` : `Ajouter ${p.title} aux favoris`}
                        title={fav ? "Retirer des favoris" : "Ajouter aux favoris"}
                        disabled={hidden}
                      >
                        <Heart size={18} fill={fav ? "currentColor" : "none"} />
                      </button>
                    </div>
                    {audio ? <SeekBar player={player} active={loaded} label={`Position dans ${hidden ? sideName : p.title}`} /> : null}
                    <button
                      type="button"
                      className="t-choose"
                      onClick={() => choose(side)}
                      disabled={phase !== "open"}
                      aria-label={`${meta.choose} : ${hidden ? sideName : p.title}`}
                    >
                      {meta.choose}
                    </button>
                  </>
                ) : null}
              </div>
              {seam === "gutter" ? (
                <svg className="t-frame" aria-hidden>
                  <motion.path d={outline} />
                </svg>
              ) : null}
            </motion.section>
          );
        })}

        <svg className="t-seam" aria-hidden>
          <defs>
            <motion.path id={`seam-${meta.slug}`} d={seamPath} />
          </defs>
          <motion.path className="t-seam-line" d={seamPath} />
          {seam === "tape" ? (
            <>
              <motion.path className="t-tape" d={seamPath} />
              <text className="t-tape-text">
                <textPath href={`#seam-${meta.slug}`} startOffset="50%" textAnchor="middle">
                  {meta.sides[0]}  ·  {meta.sides[1]}
                </textPath>
              </text>
            </>
          ) : null}
        </svg>

        {/* Le VS, posé au milieu de la coupe, la suit quand elle penche. */}
        <motion.span className="t-vs" style={{ left: vsX, top: vsY }} aria-hidden>
          VS
        </motion.span>

        <div className="t-card" aria-hidden>
          <Card seam={seam} round={round} isFinal={isFinal} practice={practice} />
        </div>
      </motion.div>

      <div className="t-top">
        <div className="t-top-progress" aria-hidden>
          <i style={{ transform: `scaleX(${round?.progress ?? 0})` }} />
        </div>
        <p className="t-round">
          {practice ? (
            <span>Duel test : rien n’est enregistré</span>
          ) : round ? (
            <>
              <span>{round.label}</span>
              <b>
                Duel {round.index} / {round.total}
              </b>
              <small>
                {round.remaining} duel{round.remaining > 1 ? "s" : ""} restant{round.remaining > 1 ? "s" : ""} avant le champion
              </small>
            </>
          ) : null}
        </p>
        {meta.balanced && !practice ? <CampMeter /> : null}
        <div className="t-tools">
          {canUndo && onUndo ? (
            <button type="button" onClick={onUndo} title="Annuler mon dernier choix (Retour arrière)" disabled={!!picked}>
              <RotateCcw size={16} />
              <span>Annuler</span>
            </button>
          ) : null}
          {!practice ? (
            <Link to={`/tournoi/${meta.path}/tableau`} title="Voir tout le tableau (T)">
              <Network size={16} />
              <span>Tableau</span>
            </Link>
          ) : null}
          <Link to={`/tournoi/${meta.path}/regles`} title="Règles du tournoi">
            <BookOpenText size={16} />
            <span>Règles</span>
          </Link>
          {audio ? (
            <button type="button" onClick={() => setSettings((v) => !v)} aria-expanded={settings} title="Paramètres">
              <Settings size={16} />
              <span>Paramètres</span>
            </button>
          ) : null}
        </div>
        {settings ? (
          <div className="t-settings" role="dialog" aria-label="Paramètres du duel">
            <label className="t-switch">
              <input type="checkbox" checked={saved.settings.autoplay} onChange={(e) => actions.setAutoplay(meta.slug, e.target.checked)} />
              <span aria-hidden />
              <span>
                <b>Lancer la première piste à chaque duel</b>
                <small>Désactivé par défaut : rien ne joue sans que tu le demandes.</small>
              </span>
            </label>
            <p className="t-keys">
              <kbd>←</kbd> <kbd>→</kbd> écouter, {abOk ? <><kbd>C</kbd> écoute alternée, </> : null}<kbd>Entrée</kbd> choisir, <kbd>Espace</kbd> pause, <kbd>F</kbd> favori, <kbd>T</kbd> tableau
            </p>
            <button type="button" className="t-close" onClick={() => setSettings(false)} aria-label="Fermer les paramètres">
              <X size={16} />
            </button>
          </div>
        ) : null}
      </div>

      {split ? <VoteSplit split={split} picked={picked} reduce={!!reduce} /> : null}

      <AudioBar
        left={left}
        right={right}
        audio={audio}
        full={full}
        onFull={toggleFull}
        ab={ab}
        onAb={picked ? undefined : () => setAb((v) => !v)}
        abOk={abOk}
      />

      <div className="t-toast-slot" role="status" aria-live="polite">
        {toast ? <p className={`t-toast t-toast--${toast.tone}`}>{toast.text}</p> : null}
      </div>

      {zoom ? (
        <div className="t-zoom" role="dialog" aria-label={zoom.title} onClick={() => setZoom(null)}>
          <img src={zoom.visual.k === "img" ? zoom.visual.src : zoom.thumb} alt={zoom.title} />
          <p>
            {zoom.title} <small>{zoom.sub}</small>
          </p>
          <button type="button" className="t-close" onClick={() => setZoom(null)} aria-label="Fermer">
            <X size={18} />
          </button>
        </div>
      ) : null}
    </div>
  );
}

function polyPath(poly: string, W: number, H: number) {
  const pts = poly
    .slice(8, -1)
    .split(",")
    .map((pair) => pair.trim().split(" ").map((v) => parseFloat(v)));
  return pts.map(([x, y], i) => `${i ? "L" : "M"}${((x * W) / 100).toFixed(1)} ${((y * H) / 100).toFixed(1)}`).join(" ") + " Z";
}

// Ouverture et fermeture de la scène : un fondu, le même pour tous les univers.
const FADE: Variants = {
  hidden: { opacity: 0 },
  shown: { opacity: 1, transition: { duration: 0.3, ease: "easeOut" } },
  gone: { opacity: 0, transition: { duration: 0.32, ease: [0.4, 0, 1, 1] } },
};
const SCENE_VARIANTS: Record<Seam, Variants> = { diag: FADE, screens: FADE, feather: FADE, tape: FADE, zigzag: FADE, slash: FADE, gutter: FADE };

// Carton affiché avant la coupe, dans le ton de chaque univers.
function Card({ seam, round, isFinal, practice }: { seam: Seam; round: RoundInfo | null; isFinal?: boolean; practice?: boolean }) {
  const n = practice ? "Essai" : isFinal ? "Finale" : `${round?.index ?? ""}`;
  const label = practice ? "Duel test" : (round?.label ?? "");
  if (seam === "screens") {
    return (
      <>
        <span className="t-bars" />
        <b>{n}</b>
      </>
    );
  }
  if (seam === "slash") {
    return (
      <>
        <span className="t-kanji">卍解</span>
        <p>{label}</p>
      </>
    );
  }
  if (seam === "gutter") {
    return (
      <>
        <p>Planche</p>
        <b>{n}</b>
      </>
    );
  }
  return (
    <>
      <p>{label}</p>
      <b>{n}</b>
    </>
  );
}

// Barre audio globale : une seule piste active, nommée, jamais d'ambiguïté.
function AudioBar({
  left,
  right,
  audio,
  full,
  onFull,
  ab,
  onAb,
  abOk,
}: {
  left: Participant;
  right: Participant;
  audio: boolean;
  full: boolean;
  onFull: () => void;
  ab: boolean;
  onAb?: () => void;
  abOk: boolean;
}) {
  const { player } = useTournament();
  const active = player.id === left.id ? left : player.id === right.id ? right : null;
  return (
    <div className="t-bar">
      {audio ? (
        <>
          <button
            type="button"
            className="t-bar-play"
            onClick={() => active && player.toggle(active)}
            disabled={!active}
            aria-label={active ? (player.playing ? `Mettre en pause ${active.title}` : `Reprendre ${active.title}`) : "Aucune piste en lecture"}
          >
            {player.playing ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
          </button>
          <p className="t-bar-now">
            {active ? (
              <>
                <b>{active.title}</b>
                <small>{active.sub}</small>
              </>
            ) : (
              <small>Aucune piste en lecture. Lance l’une des deux pour comparer.</small>
            )}
          </p>
          <SeekBar player={player} active={!!active} label={active ? `Position dans ${active.title}` : "Aucune piste en lecture"} className="t-bar-seek" />
          {abOk ? (
          <button
            type="button"
            className={`t-bar-ab ${ab ? "is-on" : ""}`}
            onClick={onAb}
            disabled={!onAb}
            aria-pressed={ab}
            title="Écoute alternée : A puis B, 7 secondes chacun (C)"
          >
            <ArrowLeftRight size={16} />
            <span>{ab ? "Alternance en cours" : "Écoute alternée"}</span>
          </button>
          ) : null}
          <div className="t-vol">
            <button type="button" onClick={player.toggleMute} aria-pressed={player.muted} aria-label={player.muted ? "Rétablir le son" : "Couper le son"} title={player.muted ? "Rétablir le son" : "Couper le son"}>
              {player.muted || player.volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
            <input type="range" min={0} max={100} value={player.muted ? 0 : player.volume} onChange={(e) => player.setVolume(Number(e.target.value))} aria-label="Volume" style={{ "--p": `${player.muted ? 0 : player.volume}%` } as React.CSSProperties} />
          </div>
        </>
      ) : (
        <p className="t-bar-now is-hint">
          <small className="t-hint-pointer">Clique sur une moitié pour la choisir, ou utilise ← →.</small>
          <small className="t-hint-touch">Touche une moitié pour la choisir.</small>
        </p>
      )}
      <button type="button" className="t-bar-full" onClick={onFull} aria-label={full ? "Quitter le plein écran" : "Plein écran"} title={full ? "Quitter le plein écran" : "Plein écran"}>
        {full ? <Minimize size={18} /> : <Maximize size={18} />}
      </button>
    </div>
  );
}

// Après le choix : le verdict du site sur ce duel. Un filet coupé à la
// proportion des votes, les deux pourcentages qui montent jusqu'à leur valeur.
function VoteSplit({ split, picked, reduce }: { split: { left: number; total: number }; picked: Side | null; reduce: boolean }) {
  const v = useMotionValue(reduce ? split.left : 50);
  const [shown, setShown] = useState(reduce ? split.left : 50);
  useMotionValueEvent(v, "change", (x) => setShown(Math.round(x)));
  useEffect(() => {
    if (reduce) return;
    const a = animate(v, split.left, { duration: 1.1, ease: [0.16, 1, 0.3, 1] });
    return () => a.stop();
  }, [v, split.left, reduce]);
  const width = useTransform(v, (x) => `${x}%`);
  if (!split.total) return null;
  return (
    <motion.div
      className="t-split"
      data-picked={picked ?? undefined}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: { duration: 0.3 } }}
      role="img"
      aria-label={`Votes du site sur ce duel : ${split.left} % à gauche, ${100 - split.left} % à droite, ${split.total} votes`}
    >
      <b className="t-split-n t-split-n--l">{shown}<small>%</small></b>
      <span className="t-split-track">
        <motion.i style={{ width }} />
      </span>
      <b className="t-split-n t-split-n--r">{100 - shown}<small>%</small></b>
      <small className="t-split-total">
        {split.total} vote{split.total > 1 ? "s" : ""} sur le site
      </small>
    </motion.div>
  );
}

// Rap contre OST : combien de chaque camp sont encore en lice.
function CampMeter() {
  const { saved } = useTournament();
  const run = saved.run;
  if (!run) return null;
  const alive = { rap: 0, ost: 0 };
  for (const m of run.rounds[0]?.matches ?? [])
    for (const p of [m.left, m.right]) if (p && runStatus(run, p.id).kind !== "out") alive[p.camp === "rap" ? "rap" : "ost"]++;
  const total = alive.rap + alive.ost || 1;
  return (
    <div className="t-camps" role="img" aria-label={`Encore en lice : ${alive.rap} rap, ${alive.ost} OST`}>
      <span>Rap FR {alive.rap}</span>
      <i style={{ "--r": `${(alive.rap / total) * 100}%` } as React.CSSProperties} />
      <span>{alive.ost} OST anime</span>
    </div>
  );
}
