import { Maximize2, Minimize2, Network, Pause, Play, RotateCcw } from "lucide-react";
import { animate, AnimatePresence, motion, useMotionValue, useReducedMotion, useSpring, useTransform, type MotionValue, type PanInfo } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { fetchPair } from "@/lib/versusStats.js";
import type { Participant } from "@/lib/tournois/types";
import type { RoundInfo, Side } from "../tournois/duel-screen";
import { useTournament } from "../tournois/provider";
import type { Player } from "../tournois/use-player";
import { AudioReactiveLayer } from "./AudioReactiveLayer";
import { fadeVoice, impact, shatter as shatterSfx, voteVoice, whoosh } from "./audio/sfx";
import { gameTheme, labelColor } from "./jeux-themes";
import { GameAura } from "./GameAura";
import { FloatingPlayer } from "./FloatingPlayer";
import { EASE, FONT, IDENTITIES, LINE, LINE_2, PANEL, type FightSlug, type Identity } from "./identities";
import { dominantColors } from "./palette";
import { CommunityReveal, Confetti, Shatter, type Rect } from "./VoteShatter";
import { VersusIntro } from "./VersusIntro";
import { bumpStreak, Magnetic, ShortcutsPanel, StageCursor, StreakBurst, useAlternate, usePrediction } from "./FightExtras";
import { bgOf, jeuArt, type Bg } from "./jeux-art";
import { Gommage, type TransitionMode } from "../tournois/gommage";
import { useAdobeKit } from "../tournois/adobe-kit";
import { Embers } from "./Embers";
import "./jeux-duel.css";
import "./jeux-themes.css";

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
// Jeux : largeur (px) de la coupe en biais entre les deux panneaux.
const SLANT = 72;
// Même gabarit de points à chaque état : framer interpole la découpe sans sauter.
const cut = (side: Side, s: number) =>
  side === "left" ? `polygon(0% 0%, 100% 0%, calc(100% - ${s}px) 100%, 0% 100%)` : `polygon(${s}px 0%, 100% 0%, 100% 100%, 0px 100%)`;
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
    document.addEventListener("fullscreenchange", fit);
    return () => {
      window.removeEventListener("resize", fit);
      document.removeEventListener("fullscreenchange", fit);
    };
  }, []);

  // Plein écran (bouton ou touche F) : le duel seul, sans les barres du site ni du tournoi.
  const [full, setFull] = useState(() => typeof document !== "undefined" && !!document.fullscreenElement);
  useEffect(() => {
    const on = () => setFull(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", on);
    return () => document.removeEventListener("fullscreenchange", on);
  }, []);
  const toggleFull = useCallback(() => {
    const el = stage.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else el.requestFullscreen?.().catch(() => {});
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
          // Jeux : le perdant disparaît à la façon de SON jeu (pixels, givre, signal coupé…).
          ...(jeux
            ? { mode: gameTheme(lp.sub).fx, edge: gameTheme(lp.sub).fxEdge, parts: gameTheme(lp.sub).fxParts }
            : { mode: VOTE_FX[meta.slug as FightSlug] }),
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
      if (jeux) {
        // Le son du vote prend la voix du jeu gagnant ; le perdant s'efface dans la sienne.
        const wt = gameTheme((side === "left" ? left : right).sub);
        const lt = gameTheme(lp.sub);
        voteVoice(wt.voice, wt.root);
        if (!reduce) setTimeout(() => fadeVoice(lt.voice, lt.root), 180);
      } else {
        impact(1);
        if (!reduce) {
          if (burnt) whoosh(0.55);
          else setTimeout(shatterSfx, 260);
        }
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
      else if (k === "f" || k === "F") toggleFull();
      else if (k === "?") setHelp((v) => !v);
      else if (k === "Escape") setHelp(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [choose, listen, focus, audible, canUndo, onUndo, picked, navigate, meta.path, toggleFull]);

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
        <Deck {...{ left, right, id, player, picked, blind: !!blind, masked, listen, choose, reduce, jeux }} />
      ) : (
        // Jeux : une seule scène coupée en biais (pas deux cartes) ; le cadre arrondi est découpé sur la zone utile.
        <div style={{ display: "flex", gap: jeux ? 0 : 7, height: "100%", padding: "76px 24px 108px", boxSizing: "border-box", clipPath: jeux ? "inset(76px 24px 108px round 18px)" : undefined }}>
          {(["left", "right"] as const).map((side) => (
            <PanelSlot key={side} side={side} first={side === "left"} accents={jeux ? [gameTheme(left.sub).accent, gameTheme(right.sub).accent] : undefined} gone={!!picked}>
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

      {meta.slug !== "openings" && !jeux ? <Embers active={!!audible} zIndex={2} tint={meta.slug === "endings" ? "dust" : "gold"} density={jeux ? 1 : 0.7} /> : null}

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
      <div className={jeux ? "jx-tools" : undefined} style={{ position: "absolute", top: 16, right: 18, zIndex: 24, display: "flex", alignItems: "center", gap: 6 }}>
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
        <Chip id={id} onClick={toggleFull} label={full ? "Quitter le plein écran (F)" : "Plein écran (F)"}>
          {full ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
        </Chip>
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
      {!narrow ? <StageCursor id={id} host={stage} tint={jeux && focus ? gameTheme((focus === "left" ? left : right).sub).accent : undefined} /> : null}
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
          accentOf={jeux ? (p) => gameTheme(p.sub).accent : undefined}
          hideArt={!!blind}
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

function PanelSlot({ side, first, accents, gone, children }: { side: Side; first: boolean; accents?: [string, string]; gone?: boolean; children: React.ReactNode }) {
  return (
    <>
      {!first ? <Divider accents={accents} gone={gone} /> : null}
      <div data-slot={side} style={{ display: "contents" }}>
        {children}
      </div>
    </>
  );
}

// Le VS vit dans la jointure : il suit la frontière quand un côté s'étend.
// Jeux : le médaillon est coupé aux couleurs des deux jeux, chacun rayonne de son côté.
function Divider({ accents, gone }: { accents?: [string, string]; gone?: boolean }) {
  const { meta } = useTournament();
  const id = IDENTITIES[meta.slug as FightSlug];
  if (accents) {
    const [a, b] = accents;
    return (
      <div style={{ position: "relative", width: 0, zIndex: 12, pointerEvents: "none", opacity: gone ? 0 : 1, transition: "opacity 0.25s ease" }} aria-hidden>
        {/* La coupe : un filet de lumière aux deux couleurs, traversé d'éclats qui courent. */}
        <svg className="jx-seam" viewBox={`0 0 ${SLANT} 100`} preserveAspectRatio="none" style={{ position: "absolute", top: 0, bottom: 0, left: -SLANT / 2, width: SLANT, maxWidth: "none", height: "100%", overflow: "visible" }}>
          <defs>
            <linearGradient id="jx-seam-g" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={b} />
              <stop offset="0.5" stopColor="#fff6e0" />
              <stop offset="1" stopColor={a} />
            </linearGradient>
          </defs>
          <line x1={SLANT} y1="0" x2="0" y2="100" stroke="url(#jx-seam-g)" strokeWidth="10" vectorEffect="non-scaling-stroke" opacity="0.22" style={{ filter: "blur(6px)" }} />
          <line x1={SLANT} y1="0" x2="0" y2="100" stroke="url(#jx-seam-g)" strokeWidth="1.25" vectorEffect="non-scaling-stroke" opacity="0.9" />
          <line className="jx-seam-run" x1={SLANT} y1="0" x2="0" y2="100" pathLength={100} stroke="#fffaf0" strokeWidth="2" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          <line className="jx-seam-run jx-seam-run--2" x1={SLANT} y1="0" x2="0" y2="100" pathLength={100} stroke="#fffaf0" strokeWidth="1.5" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        </svg>
        {/* Sceau en losange posé sur la coupe : moitié de chaque couleur, lettres gravées au centre. */}
        <motion.div
          className="jx-vs"
          initial={{ scale: 0.5, opacity: 0, rotate: -45 }}
          animate={{ scale: 1, opacity: 1, rotate: 0, transition: { type: "spring", bounce: 0.35, duration: 0.9, delay: 0.35 } }}
          style={{ "--vs-a": a, "--vs-b": b } as React.CSSProperties}
        >
          <i className="jx-vs-ring" />
          <i className="jx-vs-gem" />
          <span>VS</span>
        </motion.div>
      </div>
    );
  }
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
  const mirror = !!jeux && side === "right";
  // Jeux : l'univers du jeu (police, encre, bouton, particules).
  const th = jeux ? gameTheme(p.sub) : null;
  const vars = th ? ({ "--jg-font": th.font, "--jg-accent": th.accent, "--jg-ink": th.ink, "--jg-shadow": th.shadow, "--jg-mute": th.mute } as React.CSSProperties) : undefined;

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
      animate={{ y: 0, opacity: lose ? 0 : 1, flexGrow: grow, ...(jeux ? { clipPath: cut(side, win ? 0 : SLANT) } : {}) }}
      transition={{
        y: { duration: 0.9, ease: EASE, delay: side === "left" ? 0.05 : 0.15 },
        opacity: lose ? { duration: 0.01 } : { duration: 0.6, ease: EASE },
        flexGrow: { duration: picked ? 0.9 : 0.75, ease: EASE },
        clipPath: { duration: 0.9, ease: EASE },
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
      style={
        jeux
          ? // Les deux panneaux se chevauchent de SLANT px : la coupe en biais passe au milieu.
            { ...vars, position: "relative", flexBasis: 0, minWidth: 0, overflow: "hidden", perspective: 1200, cursor: picked ? "default" : "pointer", background: PANEL, [side === "left" ? "marginRight" : "marginLeft"]: -SLANT / 2 }
          : { ...vars, position: "relative", flexBasis: 0, minWidth: 0, overflow: "hidden", perspective: 1200, cursor: picked ? "default" : "pointer", borderRadius: 16, background: PANEL, boxShadow: `0 0 0 1px ${LINE}` }
      }
      onClick={() => !picked && onListen(side)}
      role="group"
      aria-label={`${id.sides[side === "left" ? 0 : 1]} : ${masked(p)}`}
    >
      {/* Jeux : pas d'inclinaison (la coupe en biais déborderait), seulement la parallaxe des couches. */}
      <motion.div style={jeux ? { position: "absolute", inset: 0 } : { position: "absolute", inset: 0, rotateY: rotY, rotateX: rotX, transformStyle: "preserve-3d" }}>
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
            background: th
              ? `linear-gradient(to top, rgba(4,4,6,0.94) 0%, ${th.veil} 30%, transparent 62%), linear-gradient(to ${side === "left" ? "right" : "left"}, rgba(4,4,6,0.55), transparent 40%)`
              : `linear-gradient(to top, ${id.bg} 0%, ${id.bg}cc 22%, transparent 58%), linear-gradient(to ${side === "left" ? "right" : "left"}, ${id.bg}99, transparent 40%)`,
          }}
        />
        <AudioReactiveLayer id={id} active={loaded} player={player} reduce={reduce} />
        {th && !hidden ? <GameAura kind={th.aura} accent={th.accent} active={loaded} /> : null}
        {jeux && win && !reduce ? (
          <>
            {/* Sacre du gagnant : un reflet d'or traverse le panneau une fois, filet doré. */}
            <motion.div
              aria-hidden
              initial={{ x: "-120%" }}
              animate={{ x: "120%", transition: { duration: 1.3, ease: [0.4, 0, 0.2, 1], delay: 0.35 } }}
              style={{ position: "absolute", inset: 0, zIndex: 5, pointerEvents: "none", background: `linear-gradient(105deg, transparent 30%, ${th?.accent ?? "#ffe7b0"}00 38%, ${th?.accent ?? "#ffe7b0"}55 50%, ${th?.accent ?? "#ffe7b0"}00 62%, transparent 70%)`, mixBlendMode: "screen" }}
            />
            <motion.div
              aria-hidden
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, transition: { duration: 0.8, delay: 0.3 } }}
              style={{ position: "absolute", inset: 0, zIndex: 5, pointerEvents: "none", borderRadius: 16, boxShadow: `inset 0 0 0 1px ${th?.accent ?? id.a}aa, inset 0 0 80px -20px ${th?.accent ?? id.a}66` }}
            />
          </>
        ) : null}
        {/* Couche 3 : le texte et les commandes. */}
        <motion.div
          style={{
            position: "absolute",
            // Jeux : on s'écarte de la coupe, et le côté droit est en miroir (face-à-face).
            left: jeux && side === "right" ? `calc(clamp(22px, 2.6vw, 40px) + ${SLANT * 0.6}px)` : "clamp(22px, 2.6vw, 40px)",
            right: jeux && side === "left" ? `calc(clamp(22px, 2.6vw, 40px) + ${SLANT}px)` : "clamp(22px, 2.6vw, 40px)",
            bottom: "clamp(22px, 3.4vh, 36px)",
            display: "grid",
            justifyItems: mirror ? "end" : undefined,
            textAlign: mirror ? "right" : undefined,
            gap: 10,
            x: txX,
            y: txY,
            zIndex: 6,
          }}
        >
          <p style={{ margin: 0, display: "flex", flexDirection: mirror ? "row-reverse" : undefined, gap: 10, alignItems: "center", fontFamily: th ? th.font : undefined, fontSize: th ? Math.round(12 * Math.min(1, th.scale + 0.2)) : 11, fontWeight: th ? th.weight : 600, letterSpacing: th?.id === "pixel" ? "0.06em" : "0.22em", textTransform: "uppercase", color: th ? labelColor(th) : id.mute }}>
            <span aria-hidden style={{ width: 18, height: th?.id === "pixel" ? 4 : 1, background: th ? th.accent : id.a }} />
            {jeux && !hidden && p.sub ? p.sub : id.sides[side === "left" ? 0 : 1]}
            {playing ? <EqBars color={id.a} /> : null}
          </p>
          <h2
            style={
              th
                ? {
                    margin: 0,
                    fontFamily: th.font,
                    fontWeight: th.weight,
                    fontSize: `calc(${p.title.length > 22 ? "clamp(22px, 2.2vw, 36px)" : "clamp(28px, 2.9vw, 50px)"} * ${th.scale})`,
                    lineHeight: th.id === "pixel" ? 1.45 : 1.06,
                    letterSpacing: `${th.track}em`,
                    textTransform: th.upper ? "uppercase" : "none",
                    textWrap: "balance",
                    overflowWrap: "break-word",
                    filter: th.ink.startsWith("linear") ? "drop-shadow(0 2px 1px rgba(0,0,0,0.55)) drop-shadow(0 10px 30px rgba(0,0,0,0.6))" : undefined,
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
            {th
              ? masked(p)
                  .split(" ")
                  .map((w, k, all) => (
                    // Entrée propre à l'univers (machine à écrire, néon qui grésille, rebond…), puis l'encre.
                    <span
                      key={`${p.id}-${k}`}
                      className={`jg-e jg-in--${th.entry}`}
                      style={{ animationDelay: `${0.2 + k * (th.entry === "type" ? 0.16 : 0.07) + (side === "right" ? 0.12 : 0)}s`, marginRight: k < all.length - 1 ? "0.28em" : 0 }}
                    >
                      <span className={`jg-w ${th.ink.startsWith("linear") ? "is-grad" : "is-solid"}`} style={{ animationDelay: `${1.8 + k * 0.09}s` }}>
                        {w}
                      </span>
                    </span>
                  ))
              : masked(p)}
          </h2>
          <p style={{ margin: 0, fontSize: 13.5, fontFamily: th ? FONT.body : undefined, letterSpacing: th ? "0.02em" : undefined, color: th ? th.mute : id.mute }}>
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
            <div style={{ display: "flex", flexDirection: mirror ? "row-reverse" : undefined, gap: 8, marginTop: 10 }} onClick={(e) => e.stopPropagation()}>
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
              {th ? (
                <button type="button" className={`jg-btn jg-btn--${th.btn}`} onClick={() => onChoose(side)} aria-label={`Garder ${masked(p)}`}>
                  Garder
                  <span className="jg-key">{KEY[side]}</span>
                </button>
              ) : (
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
              )}
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

// Fond d'un panneau jeux. Chaque piste a le sien (p.bg) : art du jeu, capture
// officielle en 4K (srcset : la 4K seulement sur les grands écrans) ou boucle
// vidéo. Sans fond : une scène dans la couleur du jeu, pochette au centre.

function JeuxBackdrop({ p, playing }: { p: Participant; playing: boolean }) {
  const bg = bgOf(p);
  const th = gameTheme(p.sub);
  const [ready, setReady] = useState(false);
  const fill: React.CSSProperties = { position: "absolute", inset: 0, width: "100%", height: "100%", maxWidth: "none", objectFit: "cover", opacity: ready ? 1 : 0, transition: "opacity 0.6s ease, filter 0.9s ease" };
  const cls = `jx-art ${playing ? "is-playing" : ""}`;
  // Pendant l'écoute, le fond passe par les autres images du même jeu (celles des autres pistes).
  const { participants } = useTournament();
  const slides = useMemo(() => {
    if (!bg || bg.video) return [];
    const seen = new Set([bg.src]);
    const out: Bg[] = [bg];
    for (const q of participants) {
      if (q.sub !== p.sub) continue;
      const b = bgOf(q as Participant & { bg?: Bg });
      if (!b || b.video || seen.has(b.src)) continue;
      seen.add(b.src);
      out.push(b);
    }
    // Ordre propre à la piste : deux pistes du même jeu ne défilent pas pareil.
    const rest = out.slice(1);
    const h = [...p.id].reduce((n, c) => (n * 31 + c.charCodeAt(0)) >>> 0, 7);
    const k = rest.length ? h % rest.length : 0;
    return [bg, ...rest.slice(k), ...rest.slice(0, k)].slice(0, 7);
  }, [participants, p.id, p.sub, bg]);
  const [slide, setSlide] = useState(0);
  useEffect(() => setSlide(0), [p.id]);
  useEffect(() => {
    if (!playing || slides.length < 2) return;
    const t = setInterval(() => setSlide((s) => (s + 1) % slides.length), 7000);
    return () => clearInterval(t);
  }, [playing, slides.length]);
  useEffect(() => {
    // Précharge l'image suivante pour que le fondu ne tombe jamais sur du vide.
    if (!playing || slides.length < 2) return;
    const n = slides[(slide + 1) % slides.length];
    const im = new Image();
    im.crossOrigin = "anonymous";
    im.src = window.innerWidth >= 1500 && n.hi ? n.hi : n.src;
  }, [playing, slide, slides]);
  const cur = slide > 0 ? slides[slide] : null;
  if (bg?.video)
    return (
      <video
        key={bg.video}
        className={`${cls} is-video`}
        src={bg.video}
        poster={bg.src}
        crossOrigin="anonymous"
        muted
        loop
        autoPlay
        playsInline
        preload="auto"
        onLoadedData={() => setReady(true)}
        style={{ ...fill, objectPosition: bg.pos }}
      />
    );
  if (bg)
    return (
      <>
        <img
          key={bg.src}
          className={cls}
          src={bg.src}
          srcSet={bg.hi ? `${bg.src} 1920w, ${bg.hi} 3840w` : undefined}
          sizes="(min-width: 1500px) 62vw, 100vw"
          crossOrigin="anonymous"
          alt=""
          draggable={false}
          decoding="async"
          onLoad={() => setReady(true)}
          onError={() => setReady(true)}
          style={{ ...fill, objectPosition: bg.pos }}
        />
        <AnimatePresence>
          {cur ? (
            <motion.img
              key={cur.src}
              className={`jx-slide ${playing ? "is-playing" : ""}`}
              data-kb={slide % 4}
              src={cur.src}
              srcSet={cur.hi ? `${cur.src} 1920w, ${cur.hi} 3840w` : undefined}
              sizes="(min-width: 1500px) 62vw, 100vw"
              crossOrigin="anonymous"
              alt=""
              draggable={false}
              decoding="async"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, transition: { duration: 1.6, ease: "easeInOut" } }}
              exit={{ opacity: 0, transition: { duration: 1.6, ease: "easeInOut" } }}
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", maxWidth: "none", objectFit: "cover", objectPosition: cur.pos, filter: "brightness(1.08) saturate(1.1)" }}
            />
          ) : null}
        </AnimatePresence>
      </>
    );
  const src = imgOf(p);
  return (
    <>
      <div aria-hidden style={{ position: "absolute", inset: 0, background: `radial-gradient(70% 60% at 50% 32%, ${th.accent}2e, transparent 70%), radial-gradient(120% 90% at 50% 120%, ${th.accent}22, transparent 60%), #07070a` }} />
      <img src={src} alt="" draggable={false} decoding="async" onLoad={() => setReady(true)} style={{ position: "absolute", top: "10%", left: "50%", translate: "-50% 0", width: "min(42%, 340px)", aspectRatio: "1", objectFit: "cover", borderRadius: 4, boxShadow: `0 40px 90px -24px rgba(0,0,0,0.95), 0 0 0 1px ${th.accent}44, 0 0 120px -30px ${th.accent}`, opacity: ready ? 1 : 0, transition: "opacity 0.6s ease" }} />
    </>
  );
}

// ── Mobile : deck de deux cartes, swipe façon Tinder ─────────────────
function Deck({ left, right, id, player, picked, blind, masked, listen, choose, reduce, jeux }: { left: Participant; right: Participant; id: Identity; player: Player; picked: Side | null; blind: boolean; masked: (p: Participant) => string; listen: (s: Side) => void; choose: (s: Side) => void; reduce: boolean; jeux: boolean }) {
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
          jeux={jeux}
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

function DeckCard({ side, p, id, player, isTop, picked, hidden, masked, reduce, jeux, onKeep, onPass, onListen }: { side: Side; p: Participant; id: Identity; player: Player; isTop: boolean; picked: Side | null; hidden: boolean; masked: (p: Participant) => string; reduce: boolean; jeux: boolean; onKeep: () => void; onPass: () => void; onListen: () => void }) {
  const th = jeux ? gameTheme(p.sub) : null;
  const vars = th ? ({ "--jg-font": th.font, "--jg-accent": th.accent, "--jg-ink": th.ink, "--jg-shadow": th.shadow, "--jg-mute": th.mute } as React.CSSProperties) : undefined;
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
        {/* Jeux : même fond que sur grand écran (art du jeu recadré sur son sujet). */}
        {jeux ? <JeuxBackdrop p={p} playing={playing} /> : <Media p={p} player={player} />}
      </div>
      {hidden ? <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", background: id.bg, fontFamily: FONT.display, fontWeight: 800, fontSize: 160, color: id.a }}>{KEY[side]}</div> : null}
      <div aria-hidden style={{ position: "absolute", inset: 0, background: `linear-gradient(to top, ${id.bg} 0%, ${id.bg}aa 30%, transparent 60%)` }} />
      <AudioReactiveLayer id={id} active={player.id === p.id} player={player} reduce={reduce} />
      {/* La couleur fuit sur le bord de sortie. */}
      <motion.div aria-hidden style={{ position: "absolute", inset: 0, opacity: keepGlow, background: `linear-gradient(to left, ${id.a}cc, transparent 55%)` }} />
      <motion.div aria-hidden style={{ position: "absolute", inset: 0, opacity: passGlow, background: `linear-gradient(to right, ${id.b}aa, transparent 55%)` }} />
      {th && !hidden ? <GameAura kind={th.aura} accent={th.accent} active={player.id === p.id} zIndex={5} /> : null}
      <div style={{ ...vars, position: "absolute", left: 20, right: 20, bottom: 20, display: "grid", gap: 8, zIndex: 6 } as React.CSSProperties}>
        <p style={{ margin: 0, display: "flex", alignItems: "center", gap: 8, fontFamily: th ? th.font : undefined, fontSize: th ? Math.round(11 * Math.min(1, th.scale + 0.25)) : 12, fontWeight: th ? th.weight : 600, letterSpacing: th ? (th.id === "pixel" ? "0.04em" : "0.2em") : "0.06em", textTransform: "uppercase", color: th ? labelColor(th) : id.a }}>
          {th && !hidden && p.sub ? p.sub : id.sides[side === "left" ? 0 : 1]} {playing ? (th ? <EqBars color={th.accent} /> : "— en écoute") : ""}
        </p>
        {th ? (
          <h2 style={{ margin: 0, fontFamily: th.font, fontWeight: th.weight, fontSize: (masked(p).length > 22 ? 23 : 30) * th.scale, lineHeight: th.id === "pixel" ? 1.45 : 1.06, letterSpacing: `${th.track}em`, textTransform: th.upper ? "uppercase" : "none", textWrap: "balance", overflowWrap: "break-word", filter: th.ink.startsWith("linear") ? "drop-shadow(0 2px 1px rgba(0,0,0,0.55)) drop-shadow(0 10px 30px rgba(0,0,0,0.6))" : undefined }}>
            {masked(p)
              .split(" ")
              .map((w, k, all) => (
                <span key={`${p.id}-${k}`} className={`jg-e jg-in--${th.entry}`} style={{ animationDelay: `${0.15 + k * (th.entry === "type" ? 0.16 : 0.07)}s`, marginRight: k < all.length - 1 ? "0.28em" : 0 }}>
                  <span className={`jg-w ${th.ink.startsWith("linear") ? "is-grad" : "is-solid"}`} style={{ animationDelay: `${1.6 + k * 0.09}s` }}>
                    {w}
                  </span>
                </span>
              ))}
          </h2>
        ) : (
          <h2 style={{ margin: 0, fontFamily: FONT.display, fontWeight: 800, fontSize: 36, lineHeight: 0.98, letterSpacing: "-0.04em", color: id.ink }}>{masked(p)}</h2>
        )}
        <p style={{ margin: 0, fontSize: th ? 13 : 14, color: th ? th.mute : id.ink, opacity: th ? 1 : 0.8 }}>{hidden ? "Titre caché" : th ? p.artist : [p.sub, p.artist].filter(Boolean).join(" — ")}</p>
        {isTop && !picked ? (
          <div style={{ display: "flex", gap: 10, marginTop: 6, alignItems: "center" }} onClick={(e) => e.stopPropagation()}>
            <motion.button type="button" whileTap={{ scale: 0.92 }} onClick={onListen} aria-label={`${playing ? "Mettre en pause" : "Écouter"} ${masked(p)}`} style={{ flex: "none", width: 50, height: 50, border: 0, borderRadius: 999, display: "grid", placeItems: "center", background: playing ? (th?.accent ?? id.a) : "rgba(255,255,255,0.16)", color: playing ? id.bg : id.ink }}>
              {playing ? <Pause size={19} fill="currentColor" /> : <Play size={19} fill="currentColor" />}
            </motion.button>
            {th ? (
              <button type="button" className={`jg-btn jg-btn--${th.btn}`} onClick={onKeep} style={{ flex: 1, justifyContent: "center", height: 50 }}>
                Garder
              </button>
            ) : (
              <motion.button type="button" whileTap={{ scale: 0.94 }} onClick={onKeep} style={{ flex: 1, height: 50, border: 0, borderRadius: 999, background: id.a, color: id.bg, fontFamily: FONT.body, fontWeight: 600, fontSize: 15 }}>
                Garder
              </motion.button>
            )}
            <motion.button type="button" whileTap={{ scale: 0.94 }} onClick={onPass} style={{ flex: "none", height: 50, padding: "0 16px", border: 0, borderRadius: th ? 2 : 999, background: "rgba(255,255,255,0.14)", color: id.ink, fontFamily: th ? th.font : undefined, fontWeight: 600, fontSize: th ? 12 * Math.min(1, th.scale + 0.2) : 14, letterSpacing: th ? "0.08em" : undefined, textTransform: th ? "uppercase" : undefined }}>
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
