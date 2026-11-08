import { Pause, Play, Radio, SkipForward, Square } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { fetchPair, recordDuel } from "@/lib/versusStats.js";
import type { Participant } from "@/lib/tournois/types";
import { EASE, FONT, LINE, LINE_2, PANEL } from "../fight/identities";

// Deux nouveautés du hub : le Duel du jour (le même pour tout le monde, un vote
// par jour, puis la réponse de la communauté) et la Radio des refrains (des
// génériques enchaînés, chacun lancé à son passage fort).

const INK = "#f4f2ec";
const MUTE = "#8b8a85";
const BG = "#08090d";

type Pool = { slug: string; statsId: string; title: string; accent: string; list: Participant[] };

// Tirage déterministe à partir de la date : tout le monde voit le même duel.
function seeded(seed: number) {
  let s = seed % 2147483647 || 1;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}
const today = () => new Date().toISOString().slice(0, 10);

export function DailyDuel({ pools }: { pools: Pool[] }) {
  const ready = pools.filter((p) => p.list.length > 1);
  const day = today();
  const duel = useMemo(() => {
    if (!ready.length) return null;
    const rnd = seeded(Number(day.replace(/-/g, "")));
    const pool = ready[Math.floor(rnd() * ready.length)];
    // Sons lisibles ici : vidéo du site, extrait audio, ou YouTube avec son extrait de secours.
    const list = pool.list.filter((p) => p.sound?.k === "video" || p.sound?.k === "audio" || (p.sound?.k === "youtube" && !!p.sound.fallback));
    const a = list[Math.floor(rnd() * list.length)];
    let b = list[Math.floor(rnd() * list.length)];
    for (let k = 0; b.id === a.id && k < 8; k++) b = list[Math.floor(rnd() * list.length)];
    return { pool, a, b };
    // Un tirage par jour, une fois les catalogues chargés.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day, ready.length]);

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
  const media = useRef<HTMLMediaElement | null>(null);

  useEffect(() => {
    if (!duel || !voted) return;
    fetchPair(duel.pool.statsId, duel.a.id, duel.b.id).then((r: { a: number; b: number } | null) => r && setSplit(r));
  }, [duel, voted]);
  useEffect(() => () => media.current?.pause(), []);

  if (!duel) return null;
  const { pool, a, b } = duel;

  const listen = (p: Participant) => {
    media.current?.pause();
    if (playing === p.id) return setPlaying(null);
    const el = p.visual.k === "video" ? Object.assign(document.createElement("video"), { crossOrigin: "anonymous" }) : new Audio();
    el.src = p.visual.k === "video" ? p.visual.src : p.sound?.k === "audio" ? p.sound.src : p.sound?.k === "youtube" ? (p.sound.fallback ?? "") : "";
    const start = p.sound?.k === "video" ? (p.sound.hook ?? 0) : 0;
    el.addEventListener("loadedmetadata", () => (el.currentTime = start), { once: true });
    el.volume = 0.7;
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

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 20, flexWrap: "wrap" }}>
        <div>
          <p style={eyebrow(pool.accent)}>
            <span aria-hidden style={{ width: 18, height: 1, background: pool.accent }} />
            Duel du jour, {pool.title}
          </p>
          <h2 style={{ margin: "10px 0 0", fontFamily: FONT.display, fontWeight: 700, fontSize: "clamp(24px, 2.2vw, 32px)", letterSpacing: "-0.03em", color: INK }}>Le même duel pour tout le monde, aujourd'hui.</h2>
        </div>
        <p style={{ margin: 0, fontFamily: FONT.body, fontSize: 13.5, color: MUTE }}>{voted ? "Ton vote est compté. Nouveau duel demain." : "Un vote par jour."}</p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))", gap: 14 }}>
        {[a, b].map((p, k) => {
          const other = k === 0 ? b : a;
          const mine = voted === p.id;
          const v = pct(p);
          return (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, ease: EASE, delay: k * 0.08 }}
              style={{ position: "relative", borderRadius: 14, overflow: "hidden", background: PANEL, boxShadow: `0 0 0 1px ${mine ? pool.accent : LINE}` }}
            >
              <div style={{ position: "relative", aspectRatio: "16 / 8" }}>
                <img src={p.thumb.replace("/t/p/w300/", "/t/p/w780/")} alt="" loading="lazy" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", maxWidth: "none", objectFit: "cover", opacity: voted && !mine ? 0.35 : 1, transition: "opacity 0.6s" }} />
                <div aria-hidden style={{ position: "absolute", inset: 0, background: `linear-gradient(to top, ${PANEL}, transparent 60%)` }} />
              </div>
              <div style={{ display: "grid", gap: 6, padding: "4px 18px 18px" }}>
                <p style={{ margin: 0, fontFamily: FONT.display, fontWeight: 700, fontSize: 20, letterSpacing: "-0.02em", color: INK }}>{p.title}</p>
                <p style={{ margin: 0, fontFamily: FONT.body, fontSize: 13.5, color: MUTE }}>{[p.sub, p.artist].filter(Boolean).join(" — ")}</p>
                {voted ? (
                  <div style={{ display: "grid", gap: 6, marginTop: 8 }}>
                    <span style={{ display: "block", height: 2, background: LINE_2, overflow: "hidden" }}>
                      <motion.i initial={{ width: 0 }} animate={{ width: `${v ?? 0}%` }} transition={{ duration: 1.1, ease: EASE }} style={{ display: "block", height: "100%", background: mine ? pool.accent : MUTE }} />
                    </span>
                    <span style={{ fontFamily: FONT.body, fontSize: 12.5, color: mine ? INK : MUTE }}>{v == null ? (mine ? "Ton choix" : "") : `${v} % de la communauté${mine ? ", dont toi" : ""}`}</span>
                  </div>
                ) : (
                  <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                    <button type="button" onClick={() => listen(p)} aria-label={`${playing === p.id ? "Mettre en pause" : "Écouter"} ${p.title}`} style={roundBtn(playing === p.id)}>
                      {playing === p.id ? <Pause size={15} fill="currentColor" /> : <Play size={15} fill="currentColor" />}
                    </button>
                    <motion.button type="button" whileTap={{ scale: 0.96 }} onClick={() => vote(p, other)} style={{ height: 42, padding: "0 20px", border: 0, borderRadius: 999, background: pool.accent, color: BG, fontFamily: FONT.body, fontWeight: 600, fontSize: 14, cursor: "pointer" }}>
                      Garder
                    </motion.button>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
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
