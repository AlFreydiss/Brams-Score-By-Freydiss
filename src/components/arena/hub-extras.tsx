import { Pause, Play, Radio, SkipForward, Square } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { fetchPair, recordDuel } from "@/lib/versusStats.js";
import type { Participant } from "@/lib/tournois/types";
import { EASE, FONT, LINE, LINE_2, PANEL } from "../fight/identities";
import { bgOf, type Bg } from "../fight/jeux-art";
import { gameTheme } from "../fight/jeux-themes";
import "../fight/jeux-themes.css";
import "./daily.css";

// Deux nouveautés du hub : le Duel du jour (le même pour tout le monde, un vote
// par jour, puis la réponse de la communauté) et la Radio des refrains (des
// génériques enchaînés, chacun lancé à son passage fort).

const INK = "#f4f2ec";
const MUTE = "#8b8a85";
const BG = "#08090d";

export type Pool = { slug: string; statsId: string; title: string; accent: string; list: Participant[] };

// Tirage déterministe à partir de la date : tout le monde voit le même duel.
function seeded(seed: number) {
  let s = seed % 2147483647 || 1;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}
// Le jour change à minuit, heure de Paris (et pas à 1 h ou 2 h du matin).
const PARIS = new Intl.DateTimeFormat("fr-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit" });
const dayOf = (shift = 0) => PARIS.format(new Date(Date.now() + shift * 86400000));
const today = () => dayOf(0);

// Le duel d'un jour donné : même tirage pour tout le monde.
function drawFor(day: string, ready: Pool[]) {
  if (!ready.length) return null;
  const rnd = seeded(Number(day.replace(/-/g, "")));
  const pool = ready[Math.floor(rnd() * ready.length)];
  // Sons lisibles ici : vidéo du site, extrait audio, ou YouTube avec son extrait de secours.
  const list = pool.list.filter((p) => p.sound?.k === "video" || p.sound?.k === "audio" || (p.sound?.k === "youtube" && !!p.sound.fallback));
  if (list.length < 2) return null;
  const a = list[Math.floor(rnd() * list.length)];
  let b = list[Math.floor(rnd() * list.length)];
  for (let k = 0; b.id === a.id && k < 8; k++) b = list[Math.floor(rnd() * list.length)];
  return { pool, a, b };
}

export function DailyDuel({ pools, aside }: { pools: Pool[]; aside?: React.ReactNode }) {
  const ready = pools.filter((p) => p.list.length > 1);
  const day = today();
  // Un tirage par jour, une fois les catalogues chargés.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const duel = useMemo(() => drawFor(day, ready), [day, ready.length]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const past = useMemo(() => drawFor(dayOf(-1), ready), [day, ready.length]);
  const [pastSplit, setPastSplit] = useState<{ a: number; b: number } | null>(null);
  useEffect(() => {
    if (!past) return;
    let on = true;
    fetchPair(past.pool.statsId, past.a.id, past.b.id).then((r: { a: number; b: number } | null) => on && r && setPastSplit(r));
    return () => {
      on = false;
    };
  }, [past]);

  const key = `daily_duel_${day}`;
  const [voted, setVoted] = useState<string | null>(() => {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  });
  const [split, setSplit] = useState<{ a: number; b: number } | null>(null);
  const [playing, setPlaying] = useState<string | null>(null);
  const [lean, setLean] = useState<"l" | "r" | null>(null);
  const media = useRef<HTMLMediaElement | null>(null);

  useEffect(() => {
    if (!duel || !voted) return;
    fetchPair(duel.pool.statsId, duel.a.id, duel.b.id).then((r: { a: number; b: number } | null) => r && setSplit(r));
  }, [duel, voted]);
  useEffect(() => () => media.current?.pause(), []);

  if (!duel) return aside ? <div className="dd-foot">{aside}</div> : null;
  const { pool, a, b } = duel;

  const listen = (p: Participant) => {
    media.current?.pause();
    if (playing === p.id) return setPlaying(null);
    const el = p.visual.k === "video" ? Object.assign(document.createElement("video"), { crossOrigin: "anonymous" }) : Object.assign(new Audio(), { crossOrigin: "anonymous" });
    el.src = p.visual.k === "video" ? p.visual.src : p.sound?.k === "audio" ? p.sound.src : p.sound?.k === "youtube" ? (p.sound.fallback ?? "") : "";
    const start = p.sound?.k === "video" ? (p.sound.hook ?? 0) : 0;
    el.addEventListener("loadedmetadata", () => (el.currentTime = start), { once: true });
    el.volume = Math.min(1, 0.7 * (p.gain ?? 1));
    el.onended = () => setPlaying(null);
    el.play().then(
      () => setPlaying(p.id),
      () => setPlaying(null),
    );
    media.current = el;
  };

  const vote = (w: Participant, l: Participant) => {
    if (voted) return;
    recordDuel(pool.statsId, w.id, l.id);
    try {
      localStorage.setItem(key, w.id);
    } catch {}
    setVoted(w.id);
    media.current?.pause();
    setPlaying(null);
  };

  const total = split ? split.a + split.b : 0;
  const pct = (p: Participant) => (split && total ? Math.round(((p.id === a.id ? split.a : split.b) / total) * 100) : null);
  const jeux = pool.slug === "jeux";
  // Hier : qui l'a emporté, et de combien.
  const yTotal = pastSplit ? pastSplit.a + pastSplit.b : 0;
  const yWin = past && pastSplit && yTotal >= 3 && pastSplit.a !== pastSplit.b ? (pastSplit.a > pastSplit.b ? past.a : past.b) : null;
  const yLose = past && yWin ? (yWin.id === past.a.id ? past.b : past.a) : null;
  const yPct = pastSplit && yTotal ? Math.round((Math.max(pastSplit.a, pastSplit.b) / yTotal) * 100) : 0;
  // Aujourd'hui, une fois le vote fait : avec ou contre la majorité.
  const minePct = voted && split && total ? Math.round(((voted === a.id ? split.a : split.b) / total) * 100) : null;
  const art = (p: Participant) => (jeux ? (bgOf(p as Participant & { bg?: Bg })?.src ?? p.thumb) : p.visual.k === "img" ? ((p.visual as { hi?: string }).hi ?? p.visual.src) : p.thumb.replace("/t/p/w300/", "/t/p/w1280/"));

  return (
    <div className="dd" style={{ "--dd-a": pool.accent } as React.CSSProperties}>
      <div className="dd-head">
        <div>
          <p style={eyebrow(pool.accent)}>
            <span aria-hidden style={{ width: 18, height: 1, background: pool.accent }} />
            Duel du jour, {pool.title}
          </p>
          <h2 className="dd-title">Le même duel pour tout le monde, aujourd'hui.</h2>
        </div>
        <Countdown voted={!!voted} />
      </div>

      <div className={`dd-stage ${voted ? "is-voted" : ""}`} onPointerLeave={() => setLean(null)}>
        {[a, b].map((p, k) => {
          const side = k === 0 ? "l" : "r";
          const other = k === 0 ? b : a;
          const mine = voted === p.id;
          const lost = !!voted && !mine;
          const v = pct(p);
          const th = jeux ? gameTheme(p.sub) : null;
          const vars = { "--dd-c": th?.accent ?? pool.accent, ...(th ? { "--jg-font": th.font, "--jg-accent": th.accent, "--jg-ink": th.ink, "--jg-shadow": th.shadow } : {}) } as React.CSSProperties;
          return (
            <div
              key={p.id}
              className={`dd-side dd-side--${side} ${lean === side ? "is-lean" : lean ? "is-back" : ""} ${mine ? "is-mine" : ""} ${lost ? "is-lost" : ""}`}
              style={vars}
              onPointerEnter={(e) => e.pointerType === "mouse" && setLean(side)}
            >
              <img className="dd-art" src={art(p)} alt="" loading="lazy" decoding="async" crossOrigin={jeux ? "anonymous" : undefined} />
              <div className="dd-shade" aria-hidden />
              <div className="dd-copy">
                <span className="dd-game">{p.sub}</span>
                <b className="dd-name" style={th ? { fontFamily: th.font, fontWeight: th.weight, textTransform: th.upper ? "uppercase" : "none", letterSpacing: `${th.track}em`, fontSize: `calc(clamp(24px, 2.6vw, 42px) * ${th.scale})` } : undefined}>
                  <span className={th ? `jg-w ${th.ink.startsWith("linear") ? "is-grad" : "is-solid"}` : undefined}>{p.title}</span>
                </b>
                <small className="dd-artist">{p.artist}</small>
                {voted ? (
                  <motion.span className="dd-pct" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0, transition: { duration: 0.8, ease: EASE, delay: 0.2 + k * 0.1 } }}>
                    {v == null ? (mine ? "Ton choix" : "") : <><b>{v}</b>% {mine ? "· ton choix" : ""}</>}
                  </motion.span>
                ) : (
                  <div className="dd-actions">
                    <button type="button" onClick={() => listen(p)} aria-label={`${playing === p.id ? "Mettre en pause" : "Écouter"} ${p.title}`} style={roundBtn(playing === p.id)}>
                      {playing === p.id ? <Pause size={15} fill="currentColor" /> : <Play size={15} fill="currentColor" />}
                    </button>
                    <button type="button" className={th ? `jg-btn jg-btn--${th.btn}` : "dd-keep"} onClick={() => vote(p, other)}>
                      Garder
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {/* Filet de lumière sur la coupe : il suit le côté survolé (ou gagnant). */}
        <svg className="dd-seam" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
          <defs>
            <linearGradient id="dd-seam-g" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={jeux ? gameTheme(b.sub).accent : pool.accent} />
              <stop offset="0.5" stopColor="#fff6e0" />
              <stop offset="1" stopColor={jeux ? gameTheme(a.sub).accent : pool.accent} />
            </linearGradient>
          </defs>
          {(() => {
            const sp = lean === "l" || voted === a.id ? 60 : lean === "r" || voted === b.id ? 40 : 50;
            return (
              <motion.line
                initial={false}
                animate={{ x1: sp + 5, x2: sp - 5 }}
                transition={{ duration: 0.9, ease: [0.77, 0, 0.175, 1] }}
                y1={0}
                y2={100}
                stroke="url(#dd-seam-g)"
                strokeWidth={1.25}
                vectorEffect="non-scaling-stroke"
              />
            );
          })()}
        </svg>
        {voted && total ? (
          <div className="dd-bar" aria-label="Répartition des votes">
            <motion.i initial={{ width: "50%" }} animate={{ width: `${pct(a) ?? 50}%` }} transition={{ duration: 1.2, ease: EASE, delay: 0.3 }} />
          </div>
        ) : null}
      </div>
      <div className="dd-foot">
        <p>
          {minePct != null && total >= 3 ? (
            <span>
              {minePct > 50 ? "Tu es avec la majorité : " : minePct < 50 ? "Tu es en minorité : " : "Égalité parfaite : "}
              <b>{minePct} %</b> des {total} votants ont fait comme toi.
            </span>
          ) : null}
          {yWin && yLose ? (
            <span>
              Hier, <b>{yWin.title}</b> a battu {yLose.title} avec {yPct} % des voix.
            </span>
          ) : null}
        </p>
        {aside}
      </div>
    </div>
  );
}

// Temps restant avant le prochain duel (minuit à Paris, comme le tirage).
function Countdown({ voted }: { voted: boolean }) {
  const left = () => {
    const [hh, mm, ss] = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).format(new Date()).split(":").map(Number);
    const ms = Math.max(0, 86400 - (hh * 3600 + mm * 60 + ss)) * 1000;
    const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000), sec = Math.floor((ms % 60000) / 1000);
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };
  const [t, setT] = useState(left);
  useEffect(() => {
    const i = setInterval(() => setT(left()), 1000);
    return () => clearInterval(i);
  }, []);
  return (
    <p className="dd-clock">
      <span>{voted ? "Vote compté · prochain duel dans" : "Un vote par jour · fin dans"}</span>
      <b>{t}</b>
    </p>
  );
}

// ── Radio des refrains ───────────────────────────────────────────────
const SLOT = 20;
export function RefrainRadio({ list }: { list: Participant[] }) {
  const pool = useMemo(() => list.filter((p) => p.visual.k === "video" && p.sound?.k === "video" && p.sound.hook != null), [list]);
  const [now, setNow] = useState<Participant | null>(null);
  const [on, setOn] = useState(false);
  const [paused, setPaused] = useState(false);
  const el = useRef<HTMLVideoElement | null>(null);
  const timer = useRef(0);
  const bar = useRef<HTMLSpanElement>(null);

  const next = () => {
    if (!pool.length) return;
    const p = pool[Math.floor(Math.random() * pool.length)];
    const v = (el.current ??= Object.assign(document.createElement("video"), { crossOrigin: "anonymous", playsInline: true }));
    v.src = (p.visual as { src: string }).src;
    v.volume = 0.7;
    const start = p.sound?.k === "video" ? (p.sound.hook ?? 0) : 0;
    v.addEventListener("loadedmetadata", () => (v.currentTime = start), { once: true });
    v.play().catch(() => {});
    setNow(p);
    setPaused(false);
    clearTimeout(timer.current);
    timer.current = window.setTimeout(next, SLOT * 1000);
    if (bar.current) {
      bar.current.style.transition = "none";
      bar.current.style.transform = "scaleX(0)";
      requestAnimationFrame(() => {
        if (!bar.current) return;
        bar.current.style.transition = `transform ${SLOT}s linear`;
        bar.current.style.transform = "scaleX(1)";
      });
    }
  };
  const stop = () => {
    clearTimeout(timer.current);
    el.current?.pause();
    setOn(false);
    setNow(null);
  };
  useEffect(() => () => stop(), []);

  if (!pool.length) return null;
  return (
    <>
      <motion.button
        type="button"
        whileTap={{ scale: 0.97 }}
        onClick={() => {
          if (on) return stop();
          setOn(true);
          next();
        }}
        style={{ display: "inline-flex", alignItems: "center", gap: 10, height: 44, padding: "0 20px 0 16px", border: 0, borderRadius: 999, background: on ? INK : "transparent", boxShadow: `inset 0 0 0 1px ${on ? INK : LINE_2}`, color: on ? BG : INK, fontFamily: FONT.body, fontWeight: 500, fontSize: 14, cursor: "pointer" }}
      >
        <Radio size={16} />
        {on ? "Couper la radio" : "Radio des refrains"}
      </motion.button>
      <AnimatePresence>
        {on && now ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } }}
            exit={{ opacity: 0, y: 20, transition: { duration: 0.25 } }}
            style={{ position: "fixed", left: "50%", bottom: 18, translate: "-50% 0", zIndex: 80, width: "min(520px, calc(100% - 24px))", display: "grid", gridTemplateColumns: "56px minmax(0, 1fr) auto", alignItems: "center", gap: 14, padding: 8, borderRadius: 16, background: "rgba(14,16,20,0.9)", backdropFilter: "blur(18px)", boxShadow: `inset 0 0 0 1px ${LINE_2}, 0 24px 60px -24px rgba(0,0,0,0.9)`, fontFamily: FONT.body, color: INK }}
          >
            <img src={now.thumb} alt="" style={{ width: 56, height: 56, borderRadius: 10, objectFit: "cover", maxWidth: "none" }} />
            <div style={{ minWidth: 0, display: "grid", gap: 4 }}>
              <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.22em", textTransform: "uppercase", color: MUTE }}>Radio des refrains</span>
              <b style={{ fontSize: 14, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{now.title}</b>
              <span style={{ fontSize: 12.5, color: MUTE, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{[now.sub, now.note].filter(Boolean).join(", ")}</span>
              <span style={{ display: "block", height: 2, background: LINE_2, overflow: "hidden", marginTop: 2 }}>
                <span ref={bar} style={{ display: "block", height: "100%", background: INK, transformOrigin: "left", transform: "scaleX(0)" }} />
              </span>
            </div>
            <div style={{ display: "flex", gap: 4 }}>
              <button
                type="button"
                aria-label={paused ? "Reprendre" : "Mettre en pause"}
                onClick={() => {
                  const v = el.current;
                  if (!v) return;
                  if (v.paused) {
                    v.play().catch(() => {});
                    setPaused(false);
                  } else {
                    v.pause();
                    setPaused(true);
                  }
                }}
                style={roundBtn(false)}
              >
                {paused ? <Play size={15} fill="currentColor" /> : <Pause size={15} fill="currentColor" />}
              </button>
              <button type="button" aria-label="Générique suivant" onClick={next} style={roundBtn(false)}>
                <SkipForward size={15} />
              </button>
              <button type="button" aria-label="Couper la radio" onClick={stop} style={roundBtn(false)}>
                <Square size={13} fill="currentColor" />
              </button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}

const eyebrow = (accent: string): React.CSSProperties => ({ margin: 0, display: "flex", alignItems: "center", gap: 10, fontFamily: FONT.body, fontSize: 11, fontWeight: 600, letterSpacing: "0.22em", textTransform: "uppercase", color: MUTE, ...(accent ? {} : {}) });
const roundBtn = (on: boolean): React.CSSProperties => ({ display: "grid", placeItems: "center", width: 40, height: 40, border: 0, borderRadius: 999, background: on ? INK : "transparent", boxShadow: `inset 0 0 0 1px ${on ? INK : LINE_2}`, color: on ? BG : INK, cursor: "pointer" });
