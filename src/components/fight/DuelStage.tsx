import { Network, Pause, Play, RotateCcw } from "lucide-react";
import { animate, AnimatePresence, motion, useMotionValue, useReducedMotion, useSpring, useTransform, type MotionValue, type PanInfo } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { fetchPair } from "@/lib/versusStats.js";
import type { Participant } from "@/lib/tournois/types";
import type { RoundInfo, Side } from "../tournois/duel-screen";
import { useTournament } from "../tournois/provider";
import type { Player } from "../tournois/use-player";
import { AudioReactiveLayer } from "./AudioReactiveLayer";
import { impact, shatter as shatterSfx, whoosh } from "./audio/sfx";
import { FloatingPlayer } from "./FloatingPlayer";
import { EASE, FONT, IDENTITIES, LINE, LINE_2, PANEL, type FightSlug, type Identity } from "./identities";
import { dominantColors } from "./palette";
import { CommunityReveal, Confetti, Shatter, type Rect } from "./VoteShatter";
import { VersusIntro } from "./VersusIntro";
import { bumpStreak, Magnetic, ShortcutsPanel, StageCursor, StreakBurst, useAlternate, usePrediction } from "./FightExtras";
import { jeuArt } from "./jeux-art";
import { Gommage, type TransitionMode } from "../tournois/gommage";
import { useAdobeKit } from "../tournois/adobe-kit";
import { Embers } from "./Embers";
import "./jeux-duel.css";

// Tournoi des OST de jeux vidéo : l'univers du hero (art du jeu, Trajan doré),
// et au vote le perdant se consume en pétales (le Gommage de Clair Obscur).
const TRAJAN = '"trajan-pro-3", "Cinzel", Georgia, serif';

// Au vote, le perdant disparaît à la façon de son univers (voir gommage.ts).
const VOTE_FX: Record<FightSlug, TransitionMode> = { jeux: "burn", ost: "vinyl", openings: "tv", endings: "dust" };

// Duel « Fight Night » (OST, openings, endings). Deux panneaux en vrai 50/50 ;
// celui qu'on écoute ou survole s'étend (62/38) et l'autre se désature. Au
// vote, le perdant se brise, le gagnant prend l'écran, la communauté répond.

type Props = {
  left: Participant;
  right: Participant;
  round: RoundInfo | null;
  isFinal?: boolean;
  blind?: boolean;
  canUndo?: boolean;
  onUndo?: () => void;
  onChoose: (side: Side, ms: number) => boolean;
  onDone: () => void;
};

const KEY: Record<Side, string> = { left: "A", right: "B" };
const OTHER: Record<Side, Side> = { left: "right", right: "left" };
const imgOf = (p: Participant) => (p.visual.k === "img" ? p.visual.src : p.thumb.replace("/t/p/w300/", "/t/p/w1280/"));

function useNarrow() {
  const [n, setN] = useState(() => typeof window !== "undefined" && window.matchMedia("(max-width: 760px)").matches);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 760px)");
    const on = () => setN(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return n;
}

// Vrai dès qu'une intro a été montrée pendant cette visite.
let introSeen = false;

// Temps de lecture du verdict avant le duel suivant (un clic ou une touche le passe).
const VERDICT_MS = 1500;

export function DuelStage(props: Props) {
  const { left, right, round, isFinal, blind, canUndo, onUndo, onChoose, onDone } = props;
  const { meta, player } = useTournament();
  const id = IDENTITIES[meta.slug as FightSlug];
  const jeux = meta.slug === "jeux";
  const navigate = useNavigate();
  const reduce = !!useReducedMotion();
  useAdobeKit(jeux);
  const narrow = useNarrow();
  const stage = useRef<HTMLDivElement>(null);
  const panels = { left: useRef<HTMLDivElement>(null), right: useRef<HTMLDivElement>(null) };
  const [hover, setHover] = useState<Side | null>(null);
  const [kbd, setKbd] = useState<Side | null>(null);
  const [picked, setPicked] = useState<Side | null>(null);
  const [fx, setFx] = useState<{ rect: Rect; src: string; origin: { x: number; y: number }; colors: string[] } | null>(null);
  const [reveal, setReveal] = useState<{ pct: number | null; total: number } | null>(null);
  const [leaving, setLeaving] = useState(false);
  // Intro « versus » seulement aux moments forts : premier duel de la session,
  // premier duel de chaque tour, finale. Les autres duels s'ouvrent tout de
  // suite (l'intro à chaque duel coûtait ~2,7 s, soit ~3 min sur un tournoi).
  // Tant qu'elle joue, le duel ne répond pas au clavier.
  const [intro, setIntro] = useState(() => {
    const full = !introSeen || !!isFinal || round?.index === 1;
    introSeen = true;
    return full;
  });
  const introRef = useRef(intro);
  introRef.current = intro;
  // Passage immédiat au duel suivant pendant le verdict (posé par choose).
  const advance = useRef<(() => void) | null>(null);
  useEffect(() => {
    if (!picked) return;
    // Petit délai : le clic qui a voté ne doit pas aussi sauter le verdict.
    let on = false;
    const t = setTimeout(() => (on = true), 350);
    const skip = (e: PointerEvent) => {
      if (!on || (e.target as HTMLElement | null)?.closest?.("a, [role=dialog]")) return;
      advance.current?.();
    };
    window.addEventListener("pointerdown", skip);
    return () => {
      clearTimeout(t);
      window.removeEventListener("pointerdown", skip);
    };
  }, [picked]);
  // En plus : écoute alternée (C), aide des raccourcis (?), série de votes, pronostic.
  const [ab, setAb] = useState(false);
  const [help, setHelp] = useState(false);
  const [burst, setBurst] = useState<number | null>(null);
  const prediction = usePrediction(meta.statsId, left, right);
  const shownAt = useRef(performance.now());
  const colors = useRef<Record<Side, string[]>>({ left: [id.a, id.b, id.ink], right: [id.a, id.b, id.ink] });
  const gom = useRef<Gommage | null>(null);
  useEffect(() => {
    if (reduce || !stage.current) return;
    const g = new Gommage(stage.current);
    gom.current = g;
    return () => {
      g.destroy();
      gom.current = null;
    };
  }, [reduce]);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  // Couleurs des deux images préparées dès l'arrivée du duel (confettis du gagnant).
  useEffect(() => {
    dominantColors(imgOf(left), [id.a, id.b, id.ink]).then((c) => (colors.current.left = c));
    dominantColors(imgOf(right), [id.a, id.b, id.ink]).then((c) => (colors.current.right = c));
  }, [left, right, id]);

  // La scène remplit l'écran sous les barres du site.
  useLayoutEffect(() => {
    const el = stage.current;
    if (!el) return;
    if (!document.fullscreenElement && window.scrollY > 0) window.scrollTo({ top: 0, behavior: "instant" });
    const fit = () => {
      if (document.fullscreenElement) return el.style.removeProperty("height");
      el.style.height = `calc(100dvh - ${Math.round(el.getBoundingClientRect().top + window.scrollY)}px)`;
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);


  // Au démontage, le duel coupe sa propre piste.
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

  const playingSide: Side | null = player.id === left.id ? "left" : player.id === right.id ? "right" : null;
  const audible = playingSide && player.playing ? playingSide : null;
  const focus: Side | null = picked ?? hover ?? audible ?? kbd;
  const masked = useCallback((p: Participant) => (blind && !picked ? `Piste ${p.id === left.id ? "A" : "B"}` : p.title), [blind, picked, left.id]);

  const listen = useCallback(
    (side: Side) => {
      const p = side === "left" ? left : right;
      if (picked || player.failed.has(p.id)) return;
      setKbd(side);
      player.toggle(p);
    },
    [left, right, picked, player],
  );

  const choose = useCallback(
    (side: Side) => {
      if (picked || leaving || introRef.current) return;
      const ok = onChoose(side, Math.round(performance.now() - shownAt.current));
      if (!ok) return;
      setAb(false);
      const streak = bumpStreak();
      if (streak >= 10 && streak % 10 === 0) {
        setBurst(streak);
        setTimeout(() => alive.current && setBurst(null), 1900);
      }
      const loser = OTHER[side];
      const lp = loser === "left" ? left : right;
      const st = stage.current?.getBoundingClientRect();
      const lr = panels[loser].current?.getBoundingClientRect();
      const wr = panels[side].current?.getBoundingClientRect();
      if (player.id === lp.id) player.pause();
      // Gommage : à lancer avant que le perdant ne disparaisse du DOM visible.
      const media = panels[loser].current?.querySelector<HTMLImageElement | HTMLVideoElement>("video, img");
      const burnt =
        !!st && !!lr && !!media && !!gom.current?.start(media, {
          box: { x: lr.left - st.left, y: lr.top - st.top, w: lr.width, h: lr.height },
          dir: loser === "left" ? 1 : -1,
          mode: VOTE_FX[meta.slug as FightSlug],
        });
      setPicked(side);
      if (burnt) {
        // Pas d'éclats ni de confettis : la disparition du perdant suffit.
      } else if (st && lr && wr) {
        setFx({
          rect: { x: lr.left - st.left, y: lr.top - st.top, w: lr.width, h: lr.height },
          src: imgOf(lp),
          origin: { x: wr.left - st.left + wr.width / 2, y: wr.top - st.top + wr.height * 0.55 },
          colors: colors.current[side],
        });
      }
      impact(1);
      if (!reduce) {
        if (burnt) whoosh(0.55);
        else setTimeout(shatterSfx, 260);
      }
      // Verdict de la communauté (la base garde le vote, puis on lit la répartition).
      if (meta.statsId) {
        const statsId = meta.statsId;
        setTimeout(() => {
          fetchPair(statsId, left.id, right.id).then((r: { a: number; b: number } | null) => {
            if (!alive.current) return;
            const total = r ? r.a + r.b : 0;
            const mine = r ? (side === "left" ? r.a : r.b) : 0;
            setReveal({ pct: total ? Math.round((mine / total) * 100) : null, total });
          });
        }, 450);
      } else setReveal({ pct: null, total: 0 });
      // Lecture du verdict, puis sortie propre au tournoi et duel suivant.
      // Un clic ou une touche pendant le verdict y passe tout de suite.
      let gone = false;
      const go = () => {
        if (gone || !alive.current) return;
        gone = true;
        advance.current = null;
        setLeaving(true);
        if (!reduce) whoosh(0.4);
        setTimeout(() => alive.current && onDone(), reduce ? 200 : id.exit === "fade" ? 500 : 400);
      };
      advance.current = go;
      setTimeout(go, reduce ? 1000 : VERDICT_MS);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [picked, leaving, onChoose, left, right, player, reduce, meta.statsId, onDone, id.exit, jeux],
  );

  // Clavier : A / B garder, ← → choisir le côté (et basculer l'écoute), Espace
  // lecture, Retour arrière annuler, T tableau.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (introRef.current || t?.closest?.("input, textarea, select, [role=dialog]") || e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key;
      if (picked && advance.current && k !== "Tab" && k !== "Shift") {
        e.preventDefault();
        advance.current();
        return;
      }
      if (k === "a" || k === "A") choose("left");
      else if (k === "b" || k === "B") choose("right");
      else if (k === "ArrowLeft" || k === "ArrowRight") {
        e.preventDefault();
        const side: Side = k === "ArrowLeft" ? "left" : "right";
        setKbd(side);
        if (audible && audible !== side) listen(side);
      } else if (k === " ") {
        e.preventDefault();
        listen(focus ?? "left");
      } else if (k === "Backspace" && canUndo && onUndo && !picked) {
        e.preventDefault();
        onUndo();
      } else if (k === "t" || k === "T") navigate(`/tournoi/${meta.path}/tableau`);
      else if ((k === "c" || k === "C") && !picked) setAb((v) => !v);
      else if (k === "?") setHelp((v) => !v);
      else if (k === "Escape") setHelp(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [choose, listen, focus, audible, canUndo, onUndo, picked, navigate, meta.path]);

  useAlternate(ab && !picked && !intro, player, left, right, setKbd);

  // Réglage « lancer la première piste à chaque duel » : elle part à la fin de l'intro.
  const { saved } = useTournament();
  const autoplay = saved.settings.autoplay;
  useEffect(() => {
    if (intro || !autoplay) return;
    const first = player.failed.has(left.id) ? right : left;
    if (!player.failed.has(first.id)) player.play(first);
    // Une fois par duel, quand l'intro se termine.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intro]);

  const roundLabel = round ? `${isFinal ? "Finale" : round.label} — Duel ${round.index}/${round.total}` : "Duel";
  const exit = leaving ? EXIT[id.exit] : { opacity: 1, scaleY: 1, scale: 1, clipPath: "circle(150% at 50% 50%)", filter: "brightness(1)" };

  return (
    <motion.div
      ref={stage}
      animate={exit}
      transition={leaving ? EXIT_T[id.exit] : { duration: 0 }}
      style={{
        position: "relative",
        height: "calc(100dvh - 120px)",
        minHeight: 540,
        overflow: "hidden",
        // Une seule lueur d'ambiance, à la couleur du tournoi, très basse.
        background: `radial-gradient(70% 55% at 50% -10%, ${id.a}1f, transparent 70%), ${id.bg}`,
        color: id.ink,
        fontFamily: FONT.body,
        userSelect: "none",
        transformOrigin: "50% 50%",
      }}
    >
      {narrow ? (
        <Deck {...{ left, right, id, player, picked, blind: !!blind, masked, listen, choose, reduce }} />
      ) : (
        <div style={{ display: "flex", gap: 7, height: "100%", padding: "76px 24px 108px", boxSizing: "border-box" }}>
          {(["left", "right"] as const).map((side) => (
            <PanelSlot key={side} side={side} first={side === "left"}>
              <Panel
                side={side}
                p={side === "left" ? left : right}
                id={id}
                player={player}
                focus={focus}
                picked={picked}
                hidden={!!blind && !picked}
                masked={masked}
                reduce={reduce}
                refEl={panels[side]}
                posterAt={meta.posterAt}
                isFinal={!!isFinal}
                championLabel={meta.championLabel}
                jeux={jeux}
                onHover={setHover}
                onListen={listen}
                onChoose={choose}
              />
            </PanelSlot>
          ))}
        </div>
      )}

      {meta.slug !== "openings" ? <Embers active={!!audible} zIndex={2} tint={meta.slug === "endings" ? "dust" : "gold"} density={jeux ? 1 : 0.7} /> : null}

      {/* En-tête : étiquette du tournoi et du round, filet de progression. */}
      <motion.div
        initial={reduce ? false : { opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0, transition: { duration: 0.8, ease: EASE, delay: 0.2 } }}
        style={{ position: "absolute", top: narrow ? 16 : 22, left: narrow ? 16 : 24, right: narrow ? 150 : undefined, zIndex: 24, display: "grid", gap: 10 }}
      >
        <p style={{ margin: 0, display: "flex", flexWrap: "wrap", alignItems: "center", gap: narrow ? 6 : 10, fontFamily: FONT.body, fontSize: narrow ? 10 : 11, fontWeight: 600, letterSpacing: narrow ? "0.14em" : "0.22em", textTransform: "uppercase", color: id.mute }}>
          <span aria-hidden style={{ width: 18, height: 1, background: id.a }} />
          {id.name}
          <span aria-hidden style={{ width: 3, height: 3, borderRadius: 999, background: id.mute }} />
          <span style={{ color: id.ink }}>{roundLabel}</span>
        </p>
        {round ? (
          <span aria-hidden style={{ display: "block", width: 180, height: 1, background: LINE_2, overflow: "hidden" }}>
            <motion.i initial={false} animate={{ scaleX: round.progress }} transition={{ duration: 1, ease: EASE }} style={{ display: "block", height: "100%", background: id.a, transformOrigin: "left" }} />
          </span>
        ) : null}
        {prediction && !blind ? (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { duration: 0.6, delay: 0.4 } }} style={{ margin: 0, fontSize: 12.5, color: id.mute }}>
            {picked
              ? picked === prediction.side
                ? "Comme le pronostic du site."
                : "Tu as déjoué le pronostic du site."
              : <>Pronostic du site : <span style={{ color: id.ink }}>{id.sides[prediction.side === "left" ? 0 : 1]}</span> ({prediction.pct} %)</>}
          </motion.p>
        ) : null}
        {ab && !picked ? <p style={{ margin: 0, fontSize: 12.5, color: id.a }}>Écoute alternée : A puis B, 7 s chacun</p> : null}
      </motion.div>

      {/* Raccourcis visibles, en haut à droite. */}
      <div style={{ position: "absolute", top: 16, right: 18, zIndex: 24, display: "flex", alignItems: "center", gap: 6 }}>
        {!narrow ? (
          <span style={{ display: "flex", gap: 10, marginRight: 8, fontSize: 12.5, color: id.mute }}>
            <span>
              <Kbd id={id}>A</Kbd> <Kbd id={id}>B</Kbd> garder
            </span>
            <span>
              <Kbd id={id}>Espace</Kbd> écouter
            </span>
            <span>
              <Kbd id={id}>←</Kbd> <Kbd id={id}>→</Kbd> choisir
            </span>
          </span>
        ) : null}
        <Chip id={id} onClick={() => setAb((v) => !v)} disabled={!!picked} label={ab ? "Arrêter l'écoute alternée (C)" : "Écoute alternée A puis B (C)"}>
          <span style={{ fontSize: 11, fontWeight: 600, color: ab ? id.a : id.ink }}>A/B</span>
        </Chip>
        <Chip id={id} onClick={() => setHelp((v) => !v)} label="Raccourcis clavier (?)">
          <span style={{ fontSize: 13, fontWeight: 600 }}>?</span>
        </Chip>
        {canUndo && onUndo ? (
          <Chip id={id} onClick={onUndo} disabled={!!picked} label="Annuler mon dernier choix">
            <RotateCcw size={15} />
          </Chip>
        ) : null}
        <Link to={`/tournoi/${meta.path}/tableau`} aria-label="Tableau du tournoi" style={chipStyle(id)}>
          <Network size={15} />
        </Link>
      </div>

      <AnimatePresence>
        {fx ? (
          <>
            <Shatter key="sh" rect={fx.rect} src={fx.src} reduce={reduce} />
            {!reduce ? <Confetti key="cf" origin={fx.origin} colors={fx.colors} /> : null}
          </>
        ) : null}
      </AnimatePresence>
      <AnimatePresence>{intro ? <VersusIntro key="intro" left={left} right={right} id={id} roundLabel={roundLabel} blind={!!blind} reduce={reduce} onDone={() => setIntro(false)} /> : null}</AnimatePresence>
      <AnimatePresence>{burst ? <StreakBurst key="burst" n={burst} id={id} /> : null}</AnimatePresence>
      <ShortcutsPanel open={help} onClose={() => setHelp(false)} id={id} alternate />
      {!narrow ? <StageCursor id={id} host={stage} /> : null}
      {reveal ? <CommunityReveal pct={reveal.pct} total={reveal.total} ink={id.ink} mute={id.mute} accent={id.a} reduce={reduce} /> : null}

      {!picked ? (
        <FloatingPlayer
          id={id}
          player={player}
          playing={playingSide ? (playingSide === "left" ? left : right) : null}
          ready={focus ? (focus === "left" ? left : right) : null}
          readyKey={focus ? KEY[focus] : null}
          masked={masked}
          onPlayReady={() => listen(focus ?? "left")}
        />
      ) : null}
    </motion.div>
  );
}

// Sorties propres à chaque univers.
const EXIT = {
  zap: { scaleY: 0.004, filter: "brightness(3)", opacity: 0.9, scale: 1, clipPath: "circle(150% at 50% 50%)" },
  spin: { clipPath: "circle(0% at 50% 50%)", scale: 1.06, opacity: 1, scaleY: 1, filter: "brightness(1)" },
  fade: { opacity: 0, scale: 1.02, scaleY: 1, clipPath: "circle(150% at 50% 50%)", filter: "brightness(0.4)" },
} as const;
const EXIT_T = {
  zap: { duration: 0.32, ease: [0.7, 0, 0.84, 0] },
  spin: { duration: 0.4, ease: [0.65, 0, 0.35, 1] },
  fade: { duration: 0.5, ease: [0.4, 0, 0.2, 1] },
} as const;

function PanelSlot({ side, first, children }: { side: Side; first: boolean; children: React.ReactNode }) {
  return (
    <>
      {!first ? <Divider /> : null}
      <div data-slot={side} style={{ display: "contents" }}>
        {children}
      </div>
    </>
  );
}

// Le VS vit dans la jointure : il suit la frontière quand un côté s'étend.
function Divider() {
  const { meta } = useTournament();
  const id = IDENTITIES[meta.slug as FightSlug];
  return (
    <div style={{ position: "relative", width: 0, zIndex: 12 }} aria-hidden>
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1, transition: { duration: 0.7, ease: EASE, delay: 0.3 } }}
        style={{
          position: "absolute",
          top: "50%",
          left: 0,
          translate: "-50% -50%",
          display: "grid",
          placeItems: "center",
          width: 46,
          height: 46,
          borderRadius: 999,
          background: PANEL,
          fontFamily: meta.slug === "jeux" ? TRAJAN : FONT.body,
          fontWeight: 600,
          fontSize: 11,
          letterSpacing: "0.14em",
          color: meta.slug === "jeux" ? id.b : id.ink,
          boxShadow: meta.slug === "jeux" ? `0 0 0 1px ${id.a}66, 0 10px 30px -10px rgba(0,0,0,0.8)` : `0 0 0 1px ${LINE_2}, 0 10px 30px -10px rgba(0,0,0,0.8)`,
        }}
      >
        VS
      </motion.div>
    </div>
  );
}

type PanelProps = {
  side: Side;
  p: Participant;
  id: Identity;
  player: Player;
  focus: Side | null;
  picked: Side | null;
  hidden: boolean;
  masked: (p: Participant) => string;
  reduce: boolean;
  refEl: React.RefObject<HTMLDivElement | null>;
  posterAt?: number;
  isFinal: boolean;
  championLabel: string;
  jeux?: boolean;
  onHover: (s: Side | null) => void;
  onListen: (s: Side) => void;
  onChoose: (s: Side) => void;
};

function Panel({ side, p, id, player, focus, picked, hidden, masked, reduce, refEl, posterAt, isFinal, championLabel, jeux, onHover, onListen, onChoose }: PanelProps) {
  const loaded = player.id === p.id;
  const playing = loaded && player.playing;
  const win = picked === side;
  const lose = !!picked && !win;
  const grow = picked ? (win ? 100 : 0.0001) : focus ? (focus === side ? 62 : 38) : 50;
  const dim = !picked && focus && focus !== side;

  // Inclinaison 3D légère sur 3 couches (fond, voile, texte), au ressort.
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 140, damping: 20 });
  const sy = useSpring(my, { stiffness: 140, damping: 20 });
  const rotY = useTransform(sx, (v) => v * 2);
  const rotX = useTransform(sy, (v) => -v * 1.5);
  const bgX = useTransform(sx, (v) => v * -10);
  const bgY = useTransform(sy, (v) => v * -6);
  const txX = useTransform(sx, (v) => v * 6);
  const txY = useTransform(sy, (v) => v * 4);

  return (
    <motion.div
      ref={refEl}
      initial={reduce ? false : { y: 28, opacity: 0 }}
      animate={{ y: 0, opacity: lose ? 0 : 1, flexGrow: grow }}
      transition={{
        y: { duration: 0.9, ease: EASE, delay: side === "left" ? 0.05 : 0.15 },
        opacity: lose ? { duration: 0.01 } : { duration: 0.6, ease: EASE },
        flexGrow: { duration: picked ? 0.9 : 0.75, ease: EASE },
      }}
      onPointerEnter={(e) => e.pointerType === "mouse" && onHover(side)}
      onPointerLeave={() => {
        onHover(null);
        mx.set(0);
        my.set(0);
      }}
      onPointerMove={(e) => {
        if (reduce || e.pointerType !== "mouse") return;
        const r = e.currentTarget.getBoundingClientRect();
        mx.set(((e.clientX - r.left) / r.width) * 2 - 1);
        my.set(((e.clientY - r.top) / r.height) * 2 - 1);
      }}
      style={{ position: "relative", flexBasis: 0, minWidth: 0, overflow: "hidden", perspective: 1200, cursor: picked ? "default" : "pointer", borderRadius: 16, background: PANEL, boxShadow: `0 0 0 1px ${LINE}` }}
      onClick={() => !picked && onListen(side)}
      role="group"
      aria-label={`${id.sides[side === "left" ? 0 : 1]} : ${masked(p)}`}
    >
      <motion.div style={{ position: "absolute", inset: 0, rotateY: rotY, rotateX: rotX, transformStyle: "preserve-3d" }}>
        {/* Couche 1 : l'image ou la vidéo. */}
        <motion.div
          animate={{ filter: dim ? "grayscale(0.85) blur(2px) brightness(0.55)" : "grayscale(0) blur(0px) brightness(1)", scale: win ? 1.06 : 1.1 }}
          transition={{ filter: { duration: 0.5 }, scale: { type: "spring", bounce: 0, duration: 1.2 } }}
          style={{ position: "absolute", inset: "-3%", x: bgX, y: bgY }}
        >
          {jeux ? <JeuxBackdrop p={p} playing={playing} /> : <Media p={p} player={player} posterAt={posterAt} />}
        </motion.div>
        {hidden ? (
          <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", background: id.bg, fontFamily: FONT.display, fontWeight: 800, fontSize: "clamp(140px, 20vw, 320px)", color: id.a, letterSpacing: "-0.06em" }}>
            {KEY[side]}
          </div>
        ) : null}
        {/* Couche 2 : voiles et calque réactif au son. */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            background: `linear-gradient(to top, ${id.bg} 0%, ${id.bg}cc 22%, transparent 58%), linear-gradient(to ${side === "left" ? "right" : "left"}, ${id.bg}99, transparent 40%)`,
          }}
        />
        <AudioReactiveLayer id={id} active={loaded} player={player} reduce={reduce} />
        {jeux && win && !reduce ? (
          <>
            {/* Sacre du gagnant : un reflet d'or traverse le panneau une fois, filet doré. */}
            <motion.div
              aria-hidden
              initial={{ x: "-120%" }}
              animate={{ x: "120%", transition: { duration: 1.3, ease: [0.4, 0, 0.2, 1], delay: 0.35 } }}
              style={{ position: "absolute", inset: 0, zIndex: 5, pointerEvents: "none", background: "linear-gradient(105deg, transparent 30%, rgba(255,231,176,0) 38%, rgba(255,231,176,0.32) 50%, rgba(255,231,176,0) 62%, transparent 70%)", mixBlendMode: "screen" }}
            />
            <motion.div
              aria-hidden
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, transition: { duration: 0.8, delay: 0.3 } }}
              style={{ position: "absolute", inset: 0, zIndex: 5, pointerEvents: "none", borderRadius: 16, boxShadow: `inset 0 0 0 1px ${id.a}aa, inset 0 0 80px -20px ${id.a}66` }}
            />
          </>
        ) : null}
        {/* Couche 3 : le texte et les commandes. */}
        <motion.div
          style={{
            position: "absolute",
            left: "clamp(22px, 2.6vw, 40px)",
            right: "clamp(22px, 2.6vw, 40px)",
            bottom: "clamp(22px, 3.4vh, 36px)",
            display: "grid",
            gap: 10,
            x: txX,
            y: txY,
            zIndex: 6,
          }}
        >
          {jeux && !hidden ? (
            <img src={p.thumb} alt="" draggable={false} style={{ width: 58, height: 58, objectFit: "cover", borderRadius: 2, boxShadow: `0 0 0 1px ${id.a}88, 0 12px 30px -8px rgba(0,0,0,0.9)`, marginBottom: 4 }} />
          ) : null}
          <p style={{ margin: 0, display: "flex", gap: 10, alignItems: "center", fontFamily: jeux ? TRAJAN : undefined, fontSize: jeux ? 12 : 11, fontWeight: 600, letterSpacing: "0.22em", textTransform: "uppercase", color: jeux ? id.b : id.mute }}>
            <span aria-hidden style={{ width: 18, height: 1, background: id.a }} />
            {jeux && !hidden && p.sub ? p.sub : id.sides[side === "left" ? 0 : 1]}
            {playing ? <EqBars color={id.a} /> : null}
          </p>
          <h2
            style={
              jeux
                ? {
                    margin: 0,
                    fontFamily: TRAJAN,
                    fontWeight: 400,
                    fontSize: p.title.length > 22 ? "clamp(22px, 2.2vw, 36px)" : "clamp(28px, 2.9vw, 50px)",
                    lineHeight: 1.06,
                    letterSpacing: "0.03em",
                    textTransform: "uppercase",
                    textWrap: "balance",
                    overflowWrap: "break-word",
                    filter: "drop-shadow(0 2px 1px rgba(0,0,0,0.55)) drop-shadow(0 10px 30px rgba(0,0,0,0.6))",
                  }
                : {
                    margin: 0,
                    fontFamily: FONT.display,
                    fontWeight: 700,
                    fontSize: p.title.length > 22 ? "clamp(24px, 2.4vw, 40px)" : "clamp(30px, 3.1vw, 54px)",
                    lineHeight: 1.02,
                    letterSpacing: "-0.03em",
                    color: id.ink,
                    textWrap: "balance",
                    overflowWrap: "break-word",
                  }
            }
          >
            {jeux
              ? masked(p)
                  .split(" ")
                  .map((w, k, all) => (
                    <motion.span
                      key={`${p.id}-${k}`}
                      className="jx-word"
                      initial={reduce ? false : { opacity: 0, y: "0.5em", filter: "blur(6px)" }}
                      animate={{ opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.9, ease: EASE, delay: 0.25 + k * 0.07 + (side === "right" ? 0.12 : 0) } }}
                      style={{ animationDelay: `${1.6 + k * 0.09}s`, marginRight: k < all.length - 1 ? "0.28em" : 0 }}
                    >
                      {w}
                    </motion.span>
                  ))
              : masked(p)}
          </h2>
          <p style={{ margin: 0, fontSize: jeux ? 13 : 14, fontFamily: jeux ? TRAJAN : undefined, letterSpacing: jeux ? "0.04em" : undefined, color: id.mute }}>
            {hidden ? "Titre caché jusqu'à ton choix" : jeux ? [p.note, p.artist].filter(Boolean).join(" — ") : [p.sub, p.note, p.artist].filter(Boolean).join(" — ")}
          </p>
          {win ? (
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE, delay: 0.2 } }}
              style={{ margin: "4px 0 0", display: "flex", alignItems: "center", gap: 10, fontFamily: jeux ? TRAJAN : undefined, fontSize: jeux ? 12 : 11, fontWeight: 600, letterSpacing: "0.22em", textTransform: "uppercase", color: id.a }}
            >
              <span aria-hidden style={{ width: 18, height: 1, background: id.a }} />
              {isFinal ? championLabel : "Passe au tour suivant"}
            </motion.p>
          ) : null}
          {!picked ? (
            <div style={{ display: "flex", gap: 8, marginTop: 10 }} onClick={(e) => e.stopPropagation()}>
              <motion.button
                type="button"
                whileTap={{ scale: 0.94 }}
                onClick={() => onListen(side)}
                disabled={player.failed.has(p.id)}
                aria-pressed={playing}
                aria-label={`${playing ? "Mettre en pause" : "Écouter"} ${masked(p)}`}
                style={{
                  display: "grid",
                  placeItems: "center",
                  width: 44,
                  height: 44,
                  border: 0,
                  borderRadius: 999,
                  background: playing ? id.ink : "rgba(8,9,13,0.55)",
                  backdropFilter: "blur(12px)",
                  boxShadow: `inset 0 0 0 1px ${playing ? id.ink : LINE_2}`,
                  color: playing ? id.bg : id.ink,
                  cursor: "pointer",
                  transition: "background-color 0.25s, color 0.25s",
                }}
              >
                {loaded && player.loading ? <Spinner /> : playing ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
              </motion.button>
              <Magnetic>
              <motion.button
                type="button"
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => onChoose(side)}
                aria-label={`Garder ${masked(p)}`}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 12,
                  height: 44,
                  padding: jeux ? "0 8px 0 22px" : "0 8px 0 20px",
                  border: 0,
                  borderRadius: jeux ? 2 : 999,
                  background: jeux ? "#f4f2ec" : id.a,
                  color: id.bg,
                  fontFamily: jeux ? TRAJAN : FONT.body,
                  fontWeight: 600,
                  fontSize: jeux ? 12.5 : 14,
                  letterSpacing: jeux ? "0.16em" : undefined,
                  textTransform: jeux ? "uppercase" : undefined,
                  cursor: "pointer",
                }}
              >
                Garder
                <span style={{ display: "grid", placeItems: "center", width: 28, height: 28, borderRadius: jeux ? 2 : 999, background: "rgba(8,9,13,0.12)", fontSize: 11.5, fontWeight: 600, letterSpacing: 0 }}>{KEY[side]}</span>
              </motion.button>
              </Magnetic>
            </div>
          ) : null}
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

// Image, vidéo R2 (arrêtée sur une image tant qu'on ne l'écoute pas), ou repli
// sur la vignette. La vidéo s'enregistre auprès du lecteur pour porter le son.
function Media({ p, player, posterAt = 20 }: { p: Participant; player: Player; posterAt?: number }) {
  const [src, setSrc] = useState(p.visual.k === "img" ? ((p.visual as { hi?: string }).hi && !(p.visual as { hi?: string }).hi?.includes("/original/") ? (p.visual as { hi?: string }).hi : p.visual.src) : null);
  const [ready, setReady] = useState(false);
  const register = player.register;
  const release = player.release;
  const videoRef = useCallback(
    (el: HTMLVideoElement | null) => {
      if (!el) return;
      register(p, el);
      // Vidéo déjà prête (cache) : l'événement de chargement est passé avant nous.
      if (el.readyState >= 2) setReady(true);
      return () => release(p, el);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [p.id, register, release],
  );
  const fill: React.CSSProperties = { position: "absolute", inset: 0, width: "100%", height: "100%", maxWidth: "none", objectFit: "cover", opacity: ready ? 1 : 0, transition: "opacity 0.6s ease" };
  if (p.visual.k === "video" && !player.failed.has(p.id)) {
    return <video ref={videoRef} crossOrigin="anonymous" src={`${p.visual.src}#t=${p.sound?.k === "video" ? (p.sound.hook ?? posterAt) : posterAt}`} muted playsInline preload="metadata" onLoadedData={() => setReady(true)} onCanPlay={() => setReady(true)} onSeeked={() => setReady(true)} style={fill} />;
  }
  return (
    <img
      src={src ?? p.thumb}
      alt=""
      draggable={false}
      decoding="async"
      onLoad={() => setReady(true)}
      onError={() => (src !== p.thumb ? setSrc(p.thumb) : setReady(true))}
      style={fill}
    />
  );
}

// Fond d'un panneau jeux : l'art officiel du jeu ; à défaut, la pochette
// agrandie et floutée, avec la pochette nette posée dessus.
function JeuxBackdrop({ p, playing }: { p: Participant; playing: boolean }) {
  const art = jeuArt(p.sub);
  const [ready, setReady] = useState(false);
  const fill: React.CSSProperties = { position: "absolute", inset: 0, width: "100%", height: "100%", maxWidth: "none", objectFit: "cover", opacity: ready ? 1 : 0, transition: "opacity 0.6s ease" };
  const cls = `jx-art ${playing ? "is-playing" : ""}`;
  if (art) return <img className={cls} src={art.src} alt="" draggable={false} decoding="async" onLoad={() => setReady(true)} style={{ ...fill, objectPosition: art.pos, transition: "opacity 0.6s ease, filter 0.9s ease" }} />;
  const src = imgOf(p);
  return (
    <>
      <img src={src} alt="" draggable={false} decoding="async" onLoad={() => setReady(true)} style={{ ...fill, filter: "blur(36px) saturate(1.2) brightness(0.55)", transform: "scale(1.25)" }} />
      <img src={src} alt="" draggable={false} style={{ position: "absolute", top: "12%", left: "50%", translate: "-50% 0", width: "min(44%, 340px)", aspectRatio: "1", objectFit: "cover", borderRadius: 3, boxShadow: "0 40px 80px -20px rgba(0,0,0,0.9)", opacity: ready ? 1 : 0, transition: "opacity 0.6s ease" }} />
    </>
  );
}

// ── Mobile : deck de deux cartes, swipe façon Tinder ─────────────────
function Deck({ left, right, id, player, picked, blind, masked, listen, choose, reduce }: { left: Participant; right: Participant; id: Identity; player: Player; picked: Side | null; blind: boolean; masked: (p: Participant) => string; listen: (s: Side) => void; choose: (s: Side) => void; reduce: boolean }) {
  const [top, setTop] = useState<Side>("left");
  const order: Side[] = top === "left" ? ["right", "left"] : ["left", "right"];
  return (
    <div style={{ position: "absolute", inset: "70px 14px 112px" }}>
      {order.map((side, k) => (
        <DeckCard
          key={side}
          side={side}
          p={side === "left" ? left : right}
          id={id}
          player={player}
          isTop={k === 1}
          picked={picked}
          hidden={blind && !picked}
          masked={masked}
          reduce={reduce}
          onKeep={() => choose(side)}
          onPass={() => setTop(OTHER[side])}
          onListen={() => listen(side)}
        />
      ))}
      <p style={{ position: "absolute", left: 0, right: 0, bottom: -34, margin: 0, textAlign: "center", fontSize: 12.5, color: id.mute }}>
        Glisse à droite pour garder, à gauche pour voir l'autre
      </p>
    </div>
  );
}

function DeckCard({ side, p, id, player, isTop, picked, hidden, masked, reduce, onKeep, onPass, onListen }: { side: Side; p: Participant; id: Identity; player: Player; isTop: boolean; picked: Side | null; hidden: boolean; masked: (p: Participant) => string; reduce: boolean; onKeep: () => void; onPass: () => void; onListen: () => void }) {
  const x = useMotionValue(0);
  const rot = useTransform(x, (v) => v / 18);
  const keepGlow = useTransform(x, (v) => Math.max(0, Math.min(1, v / 140)));
  const passGlow = useTransform(x, (v) => Math.max(0, Math.min(1, -v / 140)));
  const playing = player.id === p.id && player.playing;
  const lose = !!picked && picked !== side;
  const end = (_: unknown, info: PanInfo) => {
    const v = info.offset.x + info.velocity.x * 0.2;
    if (v > 130) {
      animate(x, 600, { type: "spring", bounce: 0, duration: 0.45, velocity: info.velocity.x });
      onKeep();
    } else if (v < -130) {
      animate(x, -600, { type: "spring", bounce: 0, duration: 0.4, velocity: info.velocity.x }).then(() => {
        onPass();
        x.set(0);
      });
    } else animate(x, 0, { type: "spring", bounce: 0.3, duration: 0.5, velocity: info.velocity.x });
  };
  return (
    <motion.div
      drag={isTop && !picked ? "x" : false}
      dragElastic={0.9}
      dragMomentum={false}
      onDragEnd={end}
      animate={{ scale: isTop ? 1 : 0.93, y: isTop ? 0 : 14, opacity: lose ? 0 : 1 }}
      transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
      style={{ position: "absolute", inset: 0, x, rotate: reduce ? 0 : rot, borderRadius: 20, overflow: "hidden", background: id.bg, boxShadow: "0 30px 60px -30px rgba(0,0,0,0.9), inset 0 0 0 1px rgba(255,255,255,0.1)", touchAction: "pan-y" }}
      onClick={() => isTop && !picked && onListen()}
    >
      <div style={{ position: "absolute", inset: 0 }}>
        <Media p={p} player={player} />
      </div>
      {hidden ? <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", background: id.bg, fontFamily: FONT.display, fontWeight: 800, fontSize: 160, color: id.a }}>{KEY[side]}</div> : null}
      <div aria-hidden style={{ position: "absolute", inset: 0, background: `linear-gradient(to top, ${id.bg} 0%, ${id.bg}aa 30%, transparent 60%)` }} />
      <AudioReactiveLayer id={id} active={player.id === p.id} player={player} reduce={reduce} />
      {/* La couleur fuit sur le bord de sortie. */}
      <motion.div aria-hidden style={{ position: "absolute", inset: 0, opacity: keepGlow, background: `linear-gradient(to left, ${id.a}cc, transparent 55%)` }} />
      <motion.div aria-hidden style={{ position: "absolute", inset: 0, opacity: passGlow, background: `linear-gradient(to right, ${id.b}aa, transparent 55%)` }} />
      <div style={{ position: "absolute", left: 20, right: 20, bottom: 20, display: "grid", gap: 8, zIndex: 6 }}>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: id.a }}>
          {id.sides[side === "left" ? 0 : 1]} {playing ? "— en écoute" : ""}
        </p>
        <h2 style={{ margin: 0, fontFamily: FONT.display, fontWeight: 800, fontSize: 36, lineHeight: 0.98, letterSpacing: "-0.04em", color: id.ink }}>{masked(p)}</h2>
        <p style={{ margin: 0, fontSize: 14, color: id.ink, opacity: 0.8 }}>{hidden ? "Titre caché" : [p.sub, p.artist].filter(Boolean).join(" — ")}</p>
        {isTop && !picked ? (
          <div style={{ display: "flex", gap: 10, marginTop: 6 }} onClick={(e) => e.stopPropagation()}>
            <motion.button type="button" whileTap={{ scale: 0.92 }} onClick={onListen} aria-label={`${playing ? "Mettre en pause" : "Écouter"} ${masked(p)}`} style={{ width: 50, height: 50, border: 0, borderRadius: 999, display: "grid", placeItems: "center", background: playing ? id.a : "rgba(255,255,255,0.16)", color: playing ? id.bg : id.ink }}>
              {playing ? <Pause size={19} fill="currentColor" /> : <Play size={19} fill="currentColor" />}
            </motion.button>
            <motion.button type="button" whileTap={{ scale: 0.94 }} onClick={onKeep} style={{ flex: 1, height: 50, border: 0, borderRadius: 999, background: id.a, color: id.bg, fontFamily: FONT.body, fontWeight: 600, fontSize: 15 }}>
              Garder
            </motion.button>
            <motion.button type="button" whileTap={{ scale: 0.94 }} onClick={onPass} style={{ height: 50, padding: "0 18px", border: 0, borderRadius: 999, background: "rgba(255,255,255,0.14)", color: id.ink, fontWeight: 600, fontSize: 14 }}>
              L'autre
            </motion.button>
          </div>
        ) : null}
      </div>
    </motion.div>
  );
}

// ── Petits éléments ──────────────────────────────────────────────────
function EqBars({ color }: { color: string }) {
  return (
    <span aria-hidden style={{ display: "inline-flex", alignItems: "end", gap: 2, height: 12 }}>
      {[0, 1, 2].map((k) => (
        <motion.i
          key={k}
          animate={{ scaleY: [0.3, 1, 0.5, 0.9, 0.3] }}
          transition={{ duration: 0.9 + k * 0.15, repeat: Infinity, ease: "easeInOut" }}
          style={{ display: "block", width: 3, height: 12, background: color, transformOrigin: "bottom", borderRadius: 1 }}
        />
      ))}
    </span>
  );
}

function Spinner() {
  return <motion.span aria-hidden animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }} style={{ display: "block", width: 18, height: 18, borderRadius: 999, border: "2px solid currentColor", borderRightColor: "transparent" }} />;
}

function Kbd({ id, children }: { id: Identity; children: React.ReactNode }) {
  return <kbd style={{ display: "inline-block", minWidth: 20, padding: "2px 6px", borderRadius: 5, boxShadow: `inset 0 0 0 1px ${id.ink}40`, fontFamily: "ui-monospace, monospace", fontSize: 11, color: id.ink, textAlign: "center" }}>{children}</kbd>;
}

const chipStyle = (id: Identity): React.CSSProperties => ({
  display: "grid",
  placeItems: "center",
  width: 36,
  height: 36,
  border: 0,
  borderRadius: 999,
  background: "rgba(10,10,12,0.55)",
  backdropFilter: "blur(12px)",
  boxShadow: `inset 0 0 0 1px ${id.ink}30`,
  color: id.ink,
  cursor: "pointer",
});

function Chip({ id, onClick, disabled, label, children }: { id: Identity; onClick: () => void; disabled?: boolean; label: string; children: React.ReactNode }) {
  return (
    <motion.button type="button" whileTap={{ scale: 0.9 }} onClick={onClick} disabled={disabled} aria-label={label} title={label} style={{ ...chipStyle(id), opacity: disabled ? 0.35 : 1 }}>
      {children}
    </motion.button>
  );
}

export type { MotionValue };
