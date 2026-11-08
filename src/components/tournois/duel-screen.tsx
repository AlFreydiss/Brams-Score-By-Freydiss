import { ArrowLeftRight, BookOpenText, Expand, Heart, Maximize, Minimize, Network, Pause, Play, RotateCcw, Settings, SkipBack, SkipForward, Volume2, VolumeX, X } from "lucide-react";
import { animate, motion, useMotionValue, useMotionValueEvent, useReducedMotion, useTransform } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { useCallback, useEffect, useRef, useState } from "react";
import { runStatus } from "@/lib/tournois/stats";
import { fetchPair } from "@/lib/versusStats.js";
import { actions } from "@/lib/tournois/store";
import type { Participant } from "@/lib/tournois/types";
import { useTournament } from "./provider";
import { NoirArt, Spectrum } from "./noir/art";
import { SeekBar } from "./progress";

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

// Écoute alternée : chaque passage dure 7 s. Sur une piste complète, la boucle
// couvre tout le morceau. Sur un extrait court, elle reste dans les 28 premières secondes.
const AB_SEG = 7;
const AB_LOOP = 28;
const KEY: Record<Side, string> = { left: "A", right: "B" };

// Duel « Phosphore violet » : deux cartes côte à côte (l'une sous l'autre sur
// mobile). Chaque visuel est dessiné en caractères violets et devient photo
// quand sa piste joue, au survol, et pour la carte gardée.
export function DuelScreen({ left, right, round, isFinal, practice, blind, canUndo, onUndo, onChoose, onDone, swiped }: Props) {
  const { meta, player, saved } = useTournament();
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  const audio = meta.mode === "audio";
  // Les génériques vidéo gardent une écoute simple : pas d'alternance A/B.
  const abOk = audio && meta.slug !== "openings" && meta.slug !== "endings";
  const stageRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(!!(reduce || swiped));
  const [picked, setPicked] = useState<Side | null>(null);
  const [focus, setFocus] = useState<Side>("left");
  const [toast, setToast] = useState<{ text: string; tone: "ok" | "err" } | null>(null);
  const [settings, setSettings] = useState(false);
  const [zoom, setZoom] = useState<Participant | null>(null);
  const [full, setFull] = useState(() => typeof document !== "undefined" && !!document.fullscreenElement);
  const [split, setSplit] = useState<{ left: number; total: number } | null>(null);
  const [ab, setAb] = useState(false);
  const [abTurn, setAbTurn] = useState<{ side: Side; n: number } | null>(null);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const shownAt = useRef(0);

  // Le duel commence en haut de page ; il devient jouable après l'impression des cartes.
  useEffect(() => {
    if (window.scrollY > 0 && !document.fullscreenElement) window.scrollTo({ top: 0, behavior: "instant" });
    if (ready) {
      shownAt.current = performance.now();
      return;
    }
    const t = setTimeout(() => {
      setReady(true);
      shownAt.current = performance.now();
    }, 520);
    return () => clearTimeout(t);
    // Une seule entrée, au montage.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Lecture automatique de la piste A, seulement si l'utilisateur l'a demandée.
  useEffect(() => {
    if (!ready || !audio || !saved.settings.autoplay) return;
    player.play(player.failed.has(left.id) ? right : left);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  // Le duel suivant repart d'un lecteur propre : l'ancien ne coupe que sa propre piste.
  const live = useRef(player);
  live.current = player;
  useEffect(
    () => () => {
      const pl = live.current;
      if (pl.id === left.id || pl.id === right.id) pl.stop();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  const choose = useCallback(
    (side: Side) => {
      if (picked || !ready) return;
      const ok = onChoose(side, Math.round(performance.now() - shownAt.current));
      if (!ok) {
        setToast({ text: "Ce duel est déjà tranché. Recharge la page pour reprendre.", tone: "err" });
        return;
      }
      setPicked(side);
      setAb(false);
      const loser = side === "left" ? right : left;
      if (player.id === loser.id) player.pause();
      setToast({ text: practice ? "Duel test : ce choix ne compte pas." : "Vote enregistré.", tone: "ok" });
      if (meta.statsId) {
        const statsId = meta.statsId;
        setTimeout(() => {
          fetchPair(statsId, left.id, right.id).then((r: { a: number; b: number } | null) => {
            if (!r || !alive.current) return;
            const total = r.a + r.b;
            if (total) setToast(null);
            setSplit({ left: total ? Math.round((r.a / total) * 100) : 50, total });
          });
        }, 400);
      }
      setTimeout(onDone, reduce ? 900 : meta.statsId ? 1800 : 1100);
    },
    [picked, ready, onChoose, practice, reduce, onDone, meta.statsId, left, right, player],
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

  // Écoute alternée : chaque tour relance l'autre carte au même passage.
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
      pl.play(side === "left" ? left : right);
      const total = pl.getTime()?.total ?? 0;
      const span = total > 40 ? total : AB_LOOP;
      pl.seek((Math.floor(n / 2) * AB_SEG) % span);
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

  // Clavier : A / B garder, ← → écouter (ou choisir, pour les images),
  // Entrée garder la carte active, Espace pause, C alternance, F favori,
  // T tableau, Retour arrière annuler.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t?.closest("input, textarea, select, [role=dialog]") || e.metaKey || e.ctrlKey || e.altKey) return;
      if (zoom || settings) return;
      const k = e.key;
      if (k === "a" || k === "A") choose("left");
      else if (k === "b" || k === "B") choose("right");
      else if (k === "ArrowLeft" || k === "ArrowRight") {
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
  }, [audio, abOk, listen, choose, focus, zoom, settings, meta.slug, meta.path, left, right, practice, navigate, canUndo, onUndo, picked]);

  const ratio = audio ? 2 : 4 / 3;

  return (
    <div ref={stageRef} className={`nx-duel ${full ? "is-full" : ""}`} data-ready={ready || undefined} data-picked={picked ?? undefined}>
      <header className="nx-duel-head">
        <div>
          <h1 className="nx-title">{meta.title}</h1>
          <p className="nx-lede">{practice ? "Duel test : rien n'est enregistré." : meta.signature}</p>
        </div>
        <div className="nx-round">
          {practice ? (
            <span>Essai</span>
          ) : round ? (
            <>
              <span>{isFinal ? "Finale" : round.label}</span>
              <b>
                Duel {round.index} / {round.total}
              </b>
              <span className="nx-round-bar" aria-hidden>
                <i style={{ transform: `scaleX(${round.progress})` }} />
              </span>
            </>
          ) : null}
        </div>
      </header>

      {meta.balanced && !practice ? <CampMeter /> : null}

      <div className="nx-cards">
        {(["left", "right"] as const).map((side) => {
          const p = side === "left" ? left : right;
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
            <motion.article
              key={side}
              className={`nx-card ${playing ? "is-playing" : ""} ${focus === side ? "is-focus" : ""} ${win ? "is-win" : ""} ${lose ? "is-lose" : ""} ${failed ? "is-failed" : ""}`}
              aria-label={`${sideName} : ${hidden ? "titre caché" : `${p.title}${p.sub ? `, ${p.sub}` : ""}`}`}
              initial={swiped || reduce ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0, transition: { duration: 0.5, delay: side === "left" ? 0.04 : 0.12, ease: [0.16, 1, 0.3, 1] } }}
              onPointerEnter={() => setFocus(side)}
            >
              <button
                type="button"
                className="nx-card-art"
                onClick={() => (audio ? listen(side) : choose(side))}
                disabled={!ready || !!picked}
                tabIndex={-1}
                aria-hidden
              >
                {hidden && p.sound?.k !== "video" ? (
                  <span className="nx-blind">{KEY[side]}</span>
                ) : (
                  <NoirArt p={p} player={player} ratio={ratio} posterAt={meta.posterAt} sizes="(max-width: 760px) 100vw, 48vw" />
                )}
                {hidden && p.sound?.k === "video" ? <span className="nx-blind is-over">{KEY[side]}</span> : null}
                {abTurn?.side === side ? <i key={abTurn.n} className="nx-ab-tick" aria-hidden /> : null}
              </button>

              <div className="nx-card-meta">
                <p className="nx-card-sub">
                  {hidden ? "Titre caché jusqu'à ton choix" : [p.sub, p.artist].filter(Boolean).join(", ")}
                </p>
                <h2 className={`nx-card-title ${!hidden && p.title.length > 26 ? "is-long" : ""}`}>{hidden ? `Piste ${KEY[side]}` : p.title}</h2>
                {win ? <p className="nx-kept">{practice ? "Ton choix, pour l'essai" : isFinal ? meta.championLabel : "Passe au tour suivant"}</p> : null}
                {win && split && !split.total ? <p className="nx-note">Aucun autre vote sur ce duel pour l'instant.</p> : null}
                {failed ? <p className="nx-note">Lecture impossible : la source ne répond pas. Tu peux quand même voter.</p> : null}

                {audio ? (
                  <div className="nx-sound">
                    <Spectrum active={loaded} player={player} />
                    <SeekBar player={player} active={loaded} label={`Position dans ${hidden ? `la piste ${KEY[side]}` : p.title}`} className="nx-seek" />
                  </div>
                ) : null}

                {!picked ? (
                  <div className="nx-row">
                    {audio ? (
                      <button
                        type="button"
                        className="nx-play"
                        onClick={() => listen(side)}
                        disabled={failed || !ready}
                        aria-pressed={playing}
                        aria-label={`${playing ? "Mettre en pause" : loaded && player.ended ? "Réécouter" : "Écouter"} ${hidden ? `la piste ${KEY[side]}` : p.title}`}
                      >
                        {loading ? <span className="nx-spin" aria-hidden /> : playing ? <Pause size={15} fill="currentColor" /> : <Play size={15} fill="currentColor" />}
                      </button>
                    ) : (
                      <button type="button" className="nx-ghost" onClick={() => setZoom(p)} disabled={hidden} aria-label={`Agrandir ${p.title}`}>
                        <Expand size={15} />
                        <span>Agrandir</span>
                      </button>
                    )}
                    <button type="button" className="nx-keep" onClick={() => choose(side)} disabled={!ready} aria-label={`${meta.choose} : ${hidden ? `piste ${KEY[side]}` : p.title}`}>
                      Garder
                    </button>
                    <kbd className="nx-key" aria-hidden>
                      {KEY[side]}
                    </kbd>
                    <button
                      type="button"
                      className={`nx-fav ${fav ? "is-on" : ""}`}
                      onClick={() => actions.toggleFavorite(meta.slug, p.id)}
                      aria-pressed={fav}
                      aria-label={fav ? `Retirer ${p.title} des favoris` : `Ajouter ${p.title} aux favoris`}
                      title={fav ? "Retirer des favoris" : "Ajouter aux favoris"}
                      disabled={hidden}
                    >
                      <Heart size={16} fill={fav ? "currentColor" : "none"} />
                    </button>
                  </div>
                ) : null}
              </div>
            </motion.article>
          );
        })}
      </div>

      {split ? <VoteSplit split={split} picked={picked} reduce={!!reduce} /> : null}

      <footer className="nx-dock">
        <div className="nx-dock-tools">
          {canUndo && onUndo ? (
            <button type="button" onClick={onUndo} title="Annuler mon dernier choix (Retour arrière)" disabled={!!picked}>
              <RotateCcw size={15} />
              <span>Annuler</span>
            </button>
          ) : null}
          {!practice ? (
            <Link to={`/tournoi/${meta.path}/tableau`} title="Voir tout le tableau (T)">
              <Network size={15} />
              <span>Tableau</span>
            </Link>
          ) : null}
          <Link to={`/tournoi/${meta.path}/regles`}>
            <BookOpenText size={15} />
            <span>Règles</span>
          </Link>
          {abOk ? (
            <button type="button" className={ab ? "is-on" : ""} onClick={() => setAb((v) => !v)} disabled={!!picked} aria-pressed={ab} title="Écoute alternée : A puis B, 7 secondes chacun (C)">
              <ArrowLeftRight size={15} />
              <span>{ab ? "Alternance en cours" : "Écoute alternée"}</span>
            </button>
          ) : null}
        </div>
        {audio ? <Transport left={left} right={right} masked={!!blind && !picked} /> : <p className="nx-hint">Clique une image ou appuie sur A ou B pour garder.</p>}
        <div className="nx-dock-tools">
          {audio ? (
            <button type="button" onClick={() => setSettings((v) => !v)} aria-expanded={settings} title="Paramètres">
              <Settings size={15} />
              <span className="nx-sr">Paramètres</span>
            </button>
          ) : null}
          <button type="button" onClick={toggleFull} aria-label={full ? "Quitter le plein écran" : "Plein écran"} title={full ? "Quitter le plein écran" : "Plein écran"}>
            {full ? <Minimize size={15} /> : <Maximize size={15} />}
          </button>
        </div>
        {settings ? (
          <div className="nx-settings" role="dialog" aria-label="Paramètres du duel">
            <label className="nx-switch">
              <input type="checkbox" checked={saved.settings.autoplay} onChange={(e) => actions.setAutoplay(meta.slug, e.target.checked)} />
              <span aria-hidden />
              <span>
                <b>Lancer la première piste à chaque duel</b>
                <small>Désactivé par défaut : rien ne joue sans que tu le demandes.</small>
              </span>
            </label>
            <p className="nx-keys">
              <kbd>A</kbd> <kbd>B</kbd> garder, <kbd>←</kbd> <kbd>→</kbd> écouter, {abOk ? <><kbd>C</kbd> alternance, </> : null}<kbd>Espace</kbd> pause, <kbd>F</kbd> favori, <kbd>T</kbd> tableau
            </p>
            <button type="button" className="nx-close" onClick={() => setSettings(false)} aria-label="Fermer les paramètres">
              <X size={15} />
            </button>
          </div>
        ) : null}
      </footer>

      <div className="nx-toast-slot" role="status" aria-live="polite">
        {toast ? <p className={`nx-toast nx-toast--${toast.tone}`}>{toast.text}</p> : null}
      </div>

      {zoom ? (
        <div className="nx-zoom" role="dialog" aria-label={zoom.title} onClick={() => setZoom(null)}>
          <img src={zoom.visual.k === "img" ? zoom.visual.src : zoom.thumb} alt={zoom.title} />
          <p>
            {zoom.title} <small>{zoom.sub}</small>
          </p>
          <button type="button" className="nx-close" onClick={() => setZoom(null)} aria-label="Fermer">
            <X size={16} />
          </button>
        </div>
      ) : null}
    </div>
  );
}

// Lecteur commun : la piste active, nommée, avance / recul et volume.
function Transport({ left, right, masked }: { left: Participant; right: Participant; masked: boolean }) {
  const { player } = useTournament();
  const playing = player.id === left.id ? left : player.id === right.id ? right : null;
  const name = playing ? (masked ? `Piste ${playing === left ? "A" : "B"}` : playing.title) : null;
  const jump = (delta: number) => {
    const t = player.getTime();
    if (!playing || !t) return;
    const cap = t.total > 0 ? t.total : t.now + Math.max(0, delta);
    player.seek(Math.min(Math.max(0, t.now + delta), cap));
  };
  const vol = player.muted ? 0 : player.volume;
  return (
    <div className="nx-transport">
      <button type="button" onClick={() => jump(-10)} disabled={!playing} aria-label="Reculer de 10 secondes" title="Reculer de 10 secondes">
        <SkipBack size={14} />
      </button>
      <button type="button" className="nx-transport-play" onClick={() => playing && player.toggle(playing)} disabled={!playing} aria-label={name ? (player.playing ? `Mettre en pause ${name}` : `Reprendre ${name}`) : "Aucune piste en lecture"}>
        {player.playing ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
      </button>
      <button type="button" onClick={() => jump(10)} disabled={!playing} aria-label="Avancer de 10 secondes" title="Avancer de 10 secondes">
        <SkipForward size={14} />
      </button>
      <p className="nx-now">{name ?? "Aucune piste en lecture"}</p>
      <button type="button" onClick={player.toggleMute} aria-pressed={player.muted} aria-label={player.muted ? "Rétablir le son" : "Couper le son"}>
        {player.muted || player.volume === 0 ? <VolumeX size={15} /> : <Volume2 size={15} />}
      </button>
      <input
        type="range"
        className="nx-vol"
        min={0}
        max={100}
        value={vol}
        onChange={(e) => player.setVolume(Number(e.target.value))}
        aria-label="Volume"
        style={{ "--p": `${vol}%` } as React.CSSProperties}
      />
    </div>
  );
}

// Après le choix : la répartition des votes du site sur ce duel.
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
      className="nx-split"
      data-picked={picked ?? undefined}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: { duration: 0.3 } }}
      role="img"
      aria-label={`Votes du site sur ce duel : ${split.left} % pour A, ${100 - split.left} % pour B, ${split.total} votes`}
    >
      <b>{shown} %</b>
      <span className="nx-split-track">
        <motion.i style={{ width }} />
      </span>
      <b>{100 - shown} %</b>
      <small>
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
    <div className="nx-camps" role="img" aria-label={`Encore en lice : ${alive.rap} rap, ${alive.ost} OST`}>
      <span>Rap FR {alive.rap}</span>
      <i style={{ "--r": `${(alive.rap / total) * 100}%` } as React.CSSProperties} />
      <span>{alive.ost} OST anime</span>
    </div>
  );
}
