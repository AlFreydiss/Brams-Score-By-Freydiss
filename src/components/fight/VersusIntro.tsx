import { motion, useAnimate } from "framer-motion";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import type { Participant } from "@/lib/tournois/types";
import { impact, whoosh } from "./audio/sfx";
import { EASE, FONT, LINE_2, type Identity } from "./identities";

// « Versus screen » : 2,5 s avant chaque duel, passable au clic ou à n'importe
// quelle touche. Écran coupé en diagonale, les deux visuels claquent depuis
// les bords (ressort qui dépasse + secousse), VS qui s'écrase avec onde de
// choc et éclats, titres en cascade, bandeau du round. Puis les deux moitiés
// s'ouvrent sur le duel.

type Props = {
  left: Participant;
  right: Participant;
  id: Identity;
  roundLabel: string;
  blind: boolean;
  reduce: boolean;
  onDone: () => void;
};

// Vignettes TMDB en 300 px trop floues en plein écran : on prend la 1280.
const sharp = (u: string) => u.replace("/t/p/w300/", "/t/p/w1280/");
const imgOf = (p: Participant) => (p.visual.k === "img" ? ((p.visual as { hi?: string }).hi && !(p.visual as { hi?: string }).hi?.includes("/original/") ? (p.visual as { hi?: string }).hi : p.visual.src) : sharp(p.thumb));

const HOLD = 1800;
const SLAM = 0.08;
const HIT = 0.56;

export const VersusIntro = memo(function VersusIntro({ left, right, id, roundLabel, blind, reduce, onDone }: Props) {
  const [scope, animate] = useAnimate();
  const [out, setOut] = useState(false);
  const done = useRef(false);

  // Fin (ou passage) : les deux moitiés repartent par où elles sont venues.
  const finish = useRef(() => {});
  finish.current = () => {
    if (done.current) return;
    done.current = true;
    setOut(true);
    setTimeout(onDone, reduce ? 200 : 420);
  };

  useEffect(() => {
    if (reduce) {
      const t = setTimeout(() => finish.current(), 900);
      return () => clearTimeout(t);
    }
    const a = setTimeout(() => whoosh(0.42), SLAM * 1000);
    const b = setTimeout(() => {
      impact(1.1);
      // Secousse de caméra au moment où le VS s'écrase.
      animate(scope.current, { x: [0, -5, 4, -2, 0], y: [0, 3, -2, 1, 0] }, { duration: 0.36, ease: "easeOut" });
    }, HIT * 1000);
    const c = setTimeout(() => finish.current(), HOLD);
    return () => [a, b, c].forEach(clearTimeout);
    // Une seule fois par duel.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Clic ou touche : on passe.
  useEffect(() => {
    // Toute touche passe l'intro, sauf Tab et les modificateurs (navigation au clavier).
    const skip = (e: KeyboardEvent) => {
      if (e.key === "Tab" || e.key === "Shift" || e.key === "Alt" || e.key === "Control" || e.key === "Meta") return;
      e.preventDefault();
      e.stopPropagation();
      finish.current();
    };
    window.addEventListener("keydown", skip, { capture: true });
    return () => window.removeEventListener("keydown", skip, { capture: true });
  }, []);

  const sparks = useMemo(
    () =>
      Array.from({ length: 10 }, (_, k) => {
        const a = (k / 10) * Math.PI * 2 + Math.random() * 0.3;
        const d = 180 + Math.random() * 260;
        return { x: Math.cos(a) * d, y: Math.sin(a) * d, s: 2 + Math.random() * 2, c: k % 2 ? id.a : id.b };
      }),
    [id],
  );

  if (reduce) {
    return (
      <motion.div
        role="dialog"
        aria-label={`${left.title} contre ${right.title}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: out ? 0 : 1 }}
        transition={{ duration: 0.25 }}
        onClick={() => finish.current()}
        style={{ position: "absolute", inset: 0, zIndex: 60, display: "grid", placeItems: "center", background: id.bg, color: id.ink, fontFamily: FONT.display, textAlign: "center" }}
      >
        <div>
          <p style={{ margin: 0, fontSize: 13, letterSpacing: "0.08em", textTransform: "uppercase", color: id.a }}>{roundLabel}</p>
          <p style={{ margin: "10px 0 0", fontWeight: 800, fontSize: 40 }}>
            {blind ? "Piste A" : left.title} <span style={{ color: id.a }}>VS</span> {blind ? "Piste B" : right.title}
          </p>
        </div>
      </motion.div>
    );
  }

  const halfStyle = (side: "l" | "r"): React.CSSProperties => ({
    position: "absolute",
    inset: 0,
    clipPath: side === "l" ? "polygon(0 0, 58% 0, 42% 100%, 0 100%)" : "polygon(58% 0, 100% 0, 100% 100%, 42% 100%)",
    overflow: "hidden",
  });

  return (
    <motion.div
      role="dialog"
      aria-label={`${blind ? "Piste A" : left.title} contre ${blind ? "Piste B" : right.title}. Clique ou appuie sur une touche pour passer.`}
      onClick={() => finish.current()}
      animate={{ opacity: out ? 0 : 1 }}
      transition={{ duration: 0.3, delay: out ? 0.18 : 0 }}
      style={{ position: "absolute", inset: 0, zIndex: 60, background: id.bg, cursor: "pointer", overflow: "hidden", fontFamily: FONT.display }}
    >
      <div ref={scope} style={{ position: "absolute", inset: "-24px" }}>
        {(["l", "r"] as const).map((side) => {
          const p = side === "l" ? left : right;
          return (
            <motion.div
              key={side}
              initial={{ x: side === "l" ? "-110%" : "110%" }}
              animate={{ x: out ? (side === "l" ? "-110%" : "110%") : "0%" }}
              transition={out ? { duration: 0.5, ease: [0.7, 0, 0.84, 0] } : { duration: 0.95, ease: EASE, delay: SLAM }}
              style={halfStyle(side)}
            >
              {blind ? (
                <div style={{ position: "absolute", inset: 0, background: side === "l" ? `${id.a}22` : `${id.b}22` }} />
              ) : (
                <motion.img
                  src={imgOf(p)}
                  alt=""
                  initial={{ scale: 1.35 }}
                  animate={{ scale: 1.08 }}
                  transition={{ duration: 2.6, ease: [0.16, 1, 0.3, 1] }}
                  style={{ position: "absolute", inset: 0, width: "100%", height: "100%", maxWidth: "none", objectFit: "cover", filter: "saturate(1.1) contrast(1.05)" }}
                />
              )}
              <div
                aria-hidden
                style={{
                  position: "absolute",
                  inset: 0,
                  background: side === "l" ? `linear-gradient(105deg, ${id.bg}ee 0%, ${id.bg}66 30%, transparent 55%)` : `linear-gradient(285deg, ${id.bg}ee 0%, ${id.bg}66 30%, transparent 55%)`,
                }}
              />
            </motion.div>
          );
        })}

        {/* La coupe : un trait lumineux sur la diagonale. */}
        <motion.svg
          aria-hidden
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          initial={{ opacity: 0 }}
          animate={{ opacity: out ? 0 : 1 }}
          transition={{ delay: out ? 0 : HIT - 0.05, duration: 0.15 }}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible" }}
        >
          <line x1="58" y1="0" x2="42" y2="100" stroke={id.ink} strokeWidth="0.35" vectorEffect="non-scaling-stroke" style={{ filter: `drop-shadow(0 0 8px ${id.a})` }} />
        </motion.svg>

        {/* Onde de choc + éclats + VS. */}
        <div style={{ position: "absolute", left: "50%", top: "50%", width: 0, height: 0 }}>
          <motion.div
            aria-hidden
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: [0, 7], opacity: [0.9, 0] }}
            transition={{ delay: HIT, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            style={{ position: "absolute", left: -60, top: -60, width: 120, height: 120, borderRadius: 999, border: `1px solid ${LINE_2}` }}
          />
          {sparks.map((s, k) => (
            <motion.i
              key={k}
              aria-hidden
              initial={{ x: 0, y: 0, opacity: 0, scale: 1 }}
              animate={{ x: s.x, y: s.y, opacity: [0, 1, 0], scale: [1, 1, 0.3] }}
              transition={{ delay: HIT, duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
              style={{ position: "absolute", left: -s.s / 2, top: -s.s / 2, width: s.s, height: s.s, borderRadius: 999, background: s.c, opacity: 0.8 }}
            />
          ))}
          <motion.div
            initial={{ scale: 1.8, opacity: 0, rotate: 0 }}
            animate={out ? { scale: 0.8, opacity: 0, rotate: 0 } : { scale: 1, opacity: 1, rotate: 0 }}
            transition={out ? { duration: 0.25 } : { delay: HIT - 0.12, duration: 0.6, ease: EASE }}
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              translate: "-50% -50%",
              fontWeight: 700,
              fontSize: "clamp(64px, 8vw, 128px)",
              lineHeight: 0.8,
              letterSpacing: "-0.06em",
              color: id.ink,
              textShadow: `0 0 60px ${id.a}55`,
              whiteSpace: "nowrap",
            }}
          >
            VS
          </motion.div>
        </div>

        {/* Titres en cascade, en diagonale : A en bas à gauche, B en haut à droite. */}
        <Title p={left} hidden={blind} label={id.sides[0]} id={id} align="left" out={out} />
        <Title p={right} hidden={blind} label={id.sides[1]} id={id} align="right" out={out} />

      </div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: out ? 0 : 0.6 }}
        transition={{ delay: 1.2 }}
        style={{ position: "absolute", right: 22, bottom: 18, margin: 0, fontFamily: FONT.body, fontSize: 12.5, color: id.ink }}
      >
        Clique ou appuie sur une touche pour passer
      </motion.p>
      <RoundStrip label={roundLabel} id={id} out={out} />
    </motion.div>
  );
});

// Bandeau broadcast centré en bas, qui glisse depuis la gauche.
function RoundStrip({ label, id, out }: { label: string; id: Identity; out: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: out ? 0 : 1, y: 0 }}
      transition={out ? { duration: 0.25 } : { delay: 0.95, duration: 0.7, ease: EASE }}
      style={{
        position: "absolute",
        left: "50%",
        bottom: "9%",
        translate: "-50% 0",
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "10px 18px",
        borderRadius: 999,
        background: "rgba(8,9,13,0.7)",
        backdropFilter: "blur(14px)",
        boxShadow: `inset 0 0 0 1px ${LINE_2}`,
        color: id.ink,
        fontFamily: FONT.body,
        fontWeight: 600,
        fontSize: 11.5,
        letterSpacing: "0.22em",
        textTransform: "uppercase",
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ width: 9, height: 9, borderRadius: 999, background: id.a }} aria-hidden />
      {label}
    </motion.div>
  );
}

function Title({ p, hidden, label, id, align, out }: { p: Participant; hidden: boolean; label: string; id: Identity; align: "left" | "right"; out: boolean }) {
  const text = hidden ? `Piste ${align === "left" ? "A" : "B"}` : p.title;
  const words = text.split(" ");
  const base = align === "left" ? 0.72 : 0.86;
  let n = 0;
  return (
    <div
      style={{
        position: "absolute",
        [align === "left" ? "left" : "right"]: "clamp(32px, 5vw, 80px)",
        [align === "left" ? "bottom" : "top"]: "clamp(70px, 14vh, 140px)",
        maxWidth: "46%",
        textAlign: align,
        color: id.ink,
      }}
    >
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: out ? 0 : 1, y: 0 }}
        transition={{ delay: out ? 0 : base - 0.08, duration: 0.3 }}
        style={{ margin: "0 0 12px", display: "inline-flex", alignItems: "center", gap: 10, fontFamily: FONT.body, fontSize: 11, fontWeight: 600, letterSpacing: "0.22em", textTransform: "uppercase", color: id.ink, opacity: 0.75 }}
      >
        {label}
      </motion.p>
      <h2 aria-label={text} style={{ margin: 0, fontWeight: 700, fontSize: text.length > 22 ? "clamp(30px, 3.2vw, 52px)" : "clamp(38px, 4.4vw, 72px)", lineHeight: 1, letterSpacing: "-0.035em", textShadow: "0 6px 30px rgba(0,0,0,0.6)" }}>
        {words.map((w, wi) => (
          <span key={wi} aria-hidden style={{ display: "inline-block", whiteSpace: "nowrap", marginRight: "0.22em", overflow: "hidden", paddingBottom: "0.06em" }}>
            {[...w].map((ch, ci) => {
              const k = n++;
              return (
                <motion.span
                  key={ci}
                  initial={{ y: "105%", opacity: 0 }}
                  animate={out ? { y: "-30%", opacity: 0 } : { y: "0%", opacity: 1 }}
                  transition={out ? { duration: 0.2 } : { delay: base + Math.min(k, 30) * 0.014, duration: 0.7, ease: EASE }}
                  style={{ display: "inline-block" }}
                >
                  {ch}
                </motion.span>
              );
            })}
          </span>
        ))}
      </h2>
      {!hidden ? (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: out ? 0 : 0.85 }}
          transition={{ delay: out ? 0 : base + 0.35, duration: 0.4 }}
          style={{ margin: "12px 0 0", fontFamily: FONT.body, fontSize: 16, color: id.ink }}
        >
          {[p.sub, p.artist].filter(Boolean).join(" — ")}
        </motion.p>
      ) : null}
    </div>
  );
}
