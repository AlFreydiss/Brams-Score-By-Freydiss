import { Minus, Pause, Play, Plus, RotateCcw } from "lucide-react";
import { animate, motion, useMotionValue, useReducedMotion } from "framer-motion";
import { Link } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import { champion, currentMatch, roundName } from "@/lib/tournois/bracket";
import type { Match, Participant } from "@/lib/tournois/types";
import { useTournament } from "../../tournois/provider";
import { EASE, FONT, IDENTITIES, LINE, LINE_2, PANEL, type FightSlug } from "../identities";

// « La route vers la finale » : le tableau entier en légère perspective. On le
// déplace en glissant, on zoome à la molette ou au pincement. Les traits
// s'allument tour par tour ; le chemin de chaque gagnant est tracé à la
// couleur du tournoi. Survoler un générique joue son extrait, muet.

const CARD_W = 236;
const CARD_H = 64;
const COL = 320;
const ROW = 84;
const SHORT: Record<number, string> = { 2: "Finale", 4: "Demies", 8: "Quarts", 16: "Huitièmes", 32: "Seizièmes", 64: "32es", 128: "64es", 256: "128es" };

export function RoadToFinal() {
  const { meta, saved, player, listen } = useTournament();
  const id = IDENTITIES[(meta.slug as FightSlug) in IDENTITIES ? (meta.slug as FightSlug) : "ost"];
  const reduce = !!useReducedMotion();
  const run = saved.run;
  const rounds = useMemo(() => run?.rounds ?? [], [run]);
  const cur = run ? currentMatch(run.rounds) : null;
  const champ = run ? champion(run.rounds) : null;
  const view = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const zoom = useMotionValue(1);
  const [z, setZ] = useState(1);

  // Géométrie : chaque duel du tour r est centré entre les deux duels qui l'alimentent.
  const layout = useMemo(() => {
    const first = rounds[0]?.matches.length ?? 0;
    const pos = new Map<string, { x: number; y: number; r: number }>();
    rounds.forEach((round, r) => {
      round.matches.forEach((m, k) => {
        const span = 2 ** r;
        const yy = (k * span + (span - 1) / 2) * ROW;
        pos.set(m.id, { x: r * COL, y: yy, r });
      });
    });
    return { pos, width: (rounds.length + 1) * COL, height: Math.max(1, first) * ROW };
  }, [rounds]);

  // Axe de l'inclinaison : le duel en cours (ou la finale). Autour du centre du plan,
  // un grand tableau (256, « Tout ») de 10 000 à 20 000 px de haut partait hors champ.
  const pivot = (() => {
    const t = cur ? layout.pos.get(cur.match.id) : rounds.length ? layout.pos.get(rounds[rounds.length - 1].matches[0].id) : null;
    return t ? `${t.x + CARD_W / 2}px ${t.y + CARD_H / 2}px` : "50% 50%";
  })();

  // Au montage : la vue se cale sur le duel en cours (ou la finale).
  useEffect(() => {
    const el = view.current;
    if (!el) return;
    const target = cur ? layout.pos.get(cur.match.id) : rounds.length ? layout.pos.get(rounds[rounds.length - 1].matches[0].id) : null;
    if (!target) return;
    // Centré sur le duel, mais jamais de vide au bord : un tableau qui tient en
    // largeur est centré en entier ; sinon on borne pour que le bord gauche (1er
    // tour) ou droit (finale) reste collé à la marge.
    const PAD = 36;
    const fit = (want: number, view: number, size: number) => (size + 2 * PAD <= view ? (view - size) / 2 : Math.min(PAD, Math.max(view - size - PAD, want)));
    const tx = fit(el.clientWidth / 2 - (target.x + CARD_W / 2), el.clientWidth, layout.width);
    const ty = fit(el.clientHeight / 2 - (target.y + CARD_H / 2), el.clientHeight, layout.height);
    if (reduce) {
      x.set(tx);
      y.set(ty);
    } else {
      animate(x, tx, { duration: 1.2, ease: EASE });
      animate(y, ty, { duration: 1.2, ease: EASE });
    }
    // Une fois, quand le tableau est prêt.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout]);

  const setZoom = (v: number, origin?: { x: number; y: number }) => {
    const el = view.current;
    const nz = Math.min(1.8, Math.max(0.25, v));
    const oz = zoom.get();
    // Le point sous le curseur reste sous le curseur.
    if (el && origin) {
      const r = el.getBoundingClientRect();
      const ox = origin.x - r.left;
      const oy = origin.y - r.top;
      x.set(ox - ((ox - x.get()) * nz) / oz);
      y.set(oy - ((oy - y.get()) * nz) / oz);
    }
    zoom.set(nz);
    setZ(nz);
  };

  // Molette = zoom ; pincement à deux doigts = zoom ; un doigt / souris = déplacement.
  useEffect(() => {
    const el = view.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      setZoom(zoom.get() * (e.deltaY < 0 ? 1.1 : 1 / 1.1), { x: e.clientX, y: e.clientY });
    };
    const touches = new Map<number, { x: number; y: number }>();
    let pinch0 = 0;
    let z0 = 1;
    const down = (e: PointerEvent) => {
      touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (touches.size === 2) {
        const [a, b] = [...touches.values()];
        pinch0 = Math.hypot(a.x - b.x, a.y - b.y);
        z0 = zoom.get();
      }
    };
    const move = (e: PointerEvent) => {
      const prev = touches.get(e.pointerId);
      if (!prev) return;
      touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (touches.size === 2 && pinch0) {
        const [a, b] = [...touches.values()];
        setZoom(z0 * (Math.hypot(a.x - b.x, a.y - b.y) / pinch0), { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
      } else if (touches.size === 1) {
        x.set(x.get() + e.clientX - prev.x);
        y.set(y.get() + e.clientY - prev.y);
      }
    };
    const up = (e: PointerEvent) => {
      touches.delete(e.pointerId);
      if (touches.size < 2) pinch0 = 0;
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!run) {
    return (
      <Shell id={id}>
        <Head id={id} title="La route vers la finale" text="Aucune partie en cours : le tableau apparaît dès que tu lances un tournoi." />
        <Link to={`/tournoi/${meta.path}/duel`} style={pill(id.a, id.bg)}>
          Lancer un tournoi
        </Link>
      </Shell>
    );
  }

  // Traits : de chaque duel vers celui du tour suivant qu'il alimente.
  const links: { d: string; lit: boolean; r: number; key: string }[] = [];
  rounds.forEach((round, r) => {
    const next = rounds[r + 1];
    if (!next) return;
    round.matches.forEach((m, k) => {
      const to = next.matches[Math.floor(k / 2)];
      const a = layout.pos.get(m.id);
      const b = to ? layout.pos.get(to.id) : null;
      if (!a || !b) return;
      const x1 = a.x + CARD_W;
      const y1 = a.y + CARD_H / 2;
      const x2 = b.x;
      const y2 = b.y + CARD_H / 2;
      const mx = x1 + (x2 - x1) / 2;
      links.push({ d: `M${x1} ${y1} H${mx} V${y2} H${x2}`, lit: !!m.winnerId && m.status === "closed", r, key: m.id });
    });
  });

  return (
    <Shell id={id}>
      <Head
        id={id}
        title="La route vers la finale"
        text={`${run.size} ${meta.unit}, élimination directe. ${cur ? `En cours : ${roundName(cur.round.size).toLowerCase()}.` : "Partie terminée."}`}
        action={
          cur ? (
            <Link to={`/tournoi/${meta.path}/duel`} style={pill(id.a, id.bg)}>
              Aller au duel
            </Link>
          ) : null
        }
      />

      <div
        ref={view}
        style={{ position: "relative", height: "min(72dvh, 760px)", minHeight: 420, overflow: "hidden", borderRadius: 16, background: `radial-gradient(80% 60% at 50% 0%, ${id.a}12, transparent 70%), ${PANEL}`, boxShadow: `0 0 0 1px ${LINE}`, cursor: "grab", touchAction: "none", perspective: 1800 }}
      >
        {/* Le plan du tableau, légèrement incliné : une vue en surplomb. */}
        <motion.div style={{ position: "absolute", left: 0, top: 0, x, y, scale: zoom, transformOrigin: "0 0", width: layout.width, height: layout.height }}>
          <div style={{ position: "absolute", inset: 0, transform: reduce ? undefined : "rotateX(14deg)", transformOrigin: pivot, transformStyle: "preserve-3d" }}>
            {/* Têtes de colonnes. */}
            {rounds.map((r, i) => (
              <p key={r.id} style={{ position: "absolute", left: i * COL, top: -46, margin: 0, display: "flex", alignItems: "center", gap: 10, fontFamily: FONT.body, fontSize: 11, fontWeight: 600, letterSpacing: "0.22em", textTransform: "uppercase", color: cur?.round.size === r.size ? id.ink : id.mute }}>
                <span aria-hidden style={{ width: 18, height: 1, background: cur?.round.size === r.size ? id.a : LINE_2 }} />
                {SHORT[r.size] ?? `${r.size / 2}es`}
              </p>
            ))}
            <svg width={layout.width} height={layout.height} style={{ position: "absolute", inset: 0, overflow: "visible" }} aria-hidden>
              {links.map((l) => (
                <g key={l.key}>
                  <path d={l.d} fill="none" stroke={LINE_2} strokeWidth={1} />
                  {l.lit ? (
                    <motion.path
                      d={l.d}
                      fill="none"
                      stroke={id.a}
                      strokeWidth={1.5}
                      initial={{ pathLength: reduce ? 1 : 0, opacity: 0.9 }}
                      animate={{ pathLength: 1, opacity: 0.9 }}
                      transition={{ duration: 0.9, ease: EASE, delay: reduce ? 0 : 0.3 + l.r * 0.18 }}
                      style={{ filter: `drop-shadow(0 0 4px ${id.a})` }}
                    />
                  ) : null}
                </g>
              ))}
            </svg>
            {rounds.map((round) =>
              round.matches.map((m) => {
                const p = layout.pos.get(m.id);
                if (!p || (!m.left && !m.right && round.size === rounds[0].size)) return null;
                return <Node key={m.id} m={m} at={p} now={m.id === cur?.match.id} id={id} posterAt={meta.posterAt} onListen={meta.mode === "audio" ? listen : undefined} playingId={player.playing ? player.id : null} />;
              }),
            )}
            {/* Le champion, au bout de la route. */}
            {rounds.length ? (
              <Champion
                p={champ}
                at={{ x: rounds.length * COL, y: layout.pos.get(rounds[rounds.length - 1].matches[0].id)?.y ?? 0 }}
                id={id}
                label={meta.championLabel}
              />
            ) : null}
          </div>
        </motion.div>

        {/* Zoom. */}
        <div style={{ position: "absolute", right: 14, bottom: 14, display: "flex", gap: 6 }}>
          {[
            { icon: <Minus size={15} />, label: "Dézoomer", on: () => setZoom(zoom.get() / 1.25, centerOf(view.current)) },
            { icon: <Plus size={15} />, label: "Zoomer", on: () => setZoom(zoom.get() * 1.25, centerOf(view.current)) },
            {
              icon: <RotateCcw size={15} />,
              label: "Recentrer",
              on: () => {
                setZoom(1);
                const el = view.current;
                const t = cur ? layout.pos.get(cur.match.id) : null;
                if (el && t) {
                  animate(x, el.clientWidth / 2 - (t.x + CARD_W / 2), { duration: 0.8, ease: EASE });
                  animate(y, el.clientHeight / 2 - (t.y + CARD_H / 2), { duration: 0.8, ease: EASE });
                }
              },
            },
          ].map((b) => (
            <button key={b.label} type="button" onClick={b.on} aria-label={b.label} title={b.label} style={roundBtn(id.ink)}>
              {b.icon}
            </button>
          ))}
          <span style={{ alignSelf: "center", marginLeft: 6, fontFamily: FONT.body, fontSize: 12, color: id.mute }}>{Math.round(z * 100)} %</span>
        </div>
        <p style={{ position: "absolute", left: 16, bottom: 14, margin: 0, fontFamily: FONT.body, fontSize: 12, color: id.mute }}>Glisse pour te déplacer, molette ou pincement pour zoomer.</p>
      </div>
    </Shell>
  );
}

const centerOf = (el: HTMLElement | null) => {
  if (!el) return undefined;
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
};

function Node({ m, at, now, id, posterAt, onListen, playingId }: { m: Match; at: { x: number; y: number; r: number }; now: boolean; id: (typeof IDENTITIES)[FightSlug]; posterAt?: number; onListen?: (p: Participant) => void; playingId: string | null }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: EASE, delay: Math.min(0.6, at.r * 0.08) }}
      style={{
        position: "absolute",
        left: at.x,
        top: at.y,
        width: CARD_W,
        height: CARD_H,
        display: "grid",
        gridTemplateRows: "1fr 1fr",
        borderRadius: 10,
        overflow: "hidden",
        background: "#0b0c10",
        boxShadow: now ? `0 0 0 1.5px ${id.a}, 0 0 30px -6px ${id.a}` : `0 0 0 1px ${LINE_2}`,
      }}
    >
      {[m.left, m.right].map((p, k) => (
        <Entry key={k} p={p} m={m} id={id} posterAt={posterAt} onListen={onListen} playing={!!p && playingId === p.id} top={k === 0} />
      ))}
    </motion.div>
  );
}

function Entry({ p, m, id, posterAt, onListen, playing, top }: { p: Participant | null; m: Match; id: (typeof IDENTITIES)[FightSlug]; posterAt?: number; onListen?: (p: Participant) => void; playing: boolean; top: boolean }) {
  const [hover, setHover] = useState(false);
  const decided = m.status === "closed" && !!m.winnerId;
  const win = decided && p && m.winnerId === p.id;
  const lose = decided && p && m.winnerId !== p.id;
  if (!p) {
    return (
      <span style={{ display: "flex", alignItems: "center", padding: "0 12px", fontFamily: FONT.body, fontSize: 12, color: id.mute, borderTop: top ? 0 : `1px solid ${LINE}` }}>
        {m.status === "closed" ? "Exempt" : "À venir"}
      </span>
    );
  }
  const start = p.sound?.k === "video" ? (p.sound.hook ?? posterAt ?? 20) : (posterAt ?? 20);
  return (
    <span
      onPointerEnter={() => setHover(true)}
      onPointerLeave={() => setHover(false)}
      style={{ position: "relative", display: "grid", gridTemplateColumns: "44px minmax(0, 1fr) auto", alignItems: "center", gap: 10, paddingRight: 8, borderTop: top ? 0 : `1px solid ${LINE}`, opacity: lose ? 0.38 : 1, background: win ? `${id.a}14` : "transparent" }}
    >
      <span style={{ position: "relative", height: "100%", overflow: "hidden", background: "#111" }}>
        <img src={p.thumb} alt="" draggable={false} loading="lazy" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", maxWidth: "none", objectFit: "cover" }} />
        {hover && p.visual.k === "video" ? <video src={`${p.visual.src}#t=${start}`} autoPlay muted playsInline style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} /> : null}
      </span>
      <span style={{ minWidth: 0, fontFamily: FONT.body, fontSize: 12.5, fontWeight: win ? 600 : 500, color: win ? id.ink : "#cfccc5", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={p.title}>
        {p.title}
      </span>
      {onListen ? (
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => onListen(p)}
          aria-label={`${playing ? "Mettre en pause" : "Écouter"} ${p.title}`}
          style={{ display: "grid", placeItems: "center", width: 24, height: 24, border: 0, borderRadius: 999, background: playing ? id.a : "transparent", color: playing ? id.bg : id.mute, cursor: "pointer" }}
        >
          {playing ? <Pause size={11} fill="currentColor" /> : <Play size={11} fill="currentColor" />}
        </button>
      ) : null}
    </span>
  );
}

function Champion({ p, at, id, label }: { p: Participant | null; at: { x: number; y: number }; id: (typeof IDENTITIES)[FightSlug]; label: string }) {
  return (
    <div style={{ position: "absolute", left: at.x, top: at.y - 40, width: 220 }}>
      <p style={{ margin: "0 0 10px", display: "flex", alignItems: "center", gap: 10, fontFamily: FONT.body, fontSize: 11, fontWeight: 600, letterSpacing: "0.22em", textTransform: "uppercase", color: p ? id.a : id.mute }}>
        <span aria-hidden style={{ width: 18, height: 1, background: p ? id.a : LINE_2 }} />
        {label}
      </p>
      <div style={{ borderRadius: 12, overflow: "hidden", background: "#0b0c10", boxShadow: p ? `0 0 0 1.5px ${id.a}, 0 0 50px -10px ${id.a}` : `0 0 0 1px ${LINE_2}` }}>
        {p ? (
          <>
            <img src={p.thumb.replace("/t/p/w300/", "/t/p/w780/")} alt="" style={{ display: "block", width: "100%", aspectRatio: "16 / 9", objectFit: "cover", maxWidth: "none" }} />
            <p style={{ margin: 0, padding: "10px 12px", fontFamily: FONT.display, fontWeight: 700, fontSize: 16, color: id.ink }}>{p.title}</p>
          </>
        ) : (
          <p style={{ margin: 0, padding: "26px 12px", textAlign: "center", fontFamily: FONT.body, fontSize: 13, color: id.mute }}>À venir</p>
        )}
      </div>
    </div>
  );
}

function Shell({ id, children }: { id: (typeof IDENTITIES)[FightSlug]; children: React.ReactNode }) {
  return <div style={{ maxWidth: 1360, margin: "0 auto", padding: "40px clamp(16px, 3vw, 32px) 64px", display: "grid", gap: 24, color: id.ink, fontFamily: FONT.body }}>{children}</div>;
}

function Head({ id, title, text, action }: { id: (typeof IDENTITIES)[FightSlug]; title: string; text: string; action?: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "end", justifyContent: "space-between", gap: 20, flexWrap: "wrap" }}>
      <div>
        <p style={{ margin: 0, display: "flex", alignItems: "center", gap: 10, fontSize: 11, fontWeight: 600, letterSpacing: "0.22em", textTransform: "uppercase", color: id.mute }}>
          <span aria-hidden style={{ width: 18, height: 1, background: id.a }} />
          {id.name}
        </p>
        <h1 className="rtf-title" style={{ margin: "12px 0 0", fontFamily: FONT.display, fontWeight: 700, fontSize: "clamp(30px, 3.4vw, 48px)", letterSpacing: "-0.03em", lineHeight: 1 }}>{title}</h1>
        <p style={{ margin: "10px 0 0", fontSize: 14.5, color: id.mute }}>{text}</p>
      </div>
      {action}
    </div>
  );
}

const pill = (bg: string, fg: string): React.CSSProperties => ({ display: "inline-flex", alignItems: "center", height: 44, padding: "0 20px", borderRadius: 999, background: bg, color: fg, fontWeight: 600, fontSize: 14, textDecoration: "none", justifySelf: "start" });
const roundBtn = (ink: string): React.CSSProperties => ({ display: "grid", placeItems: "center", width: 36, height: 36, border: 0, borderRadius: 999, background: "rgba(8,9,13,0.7)", boxShadow: `inset 0 0 0 1px ${LINE_2}`, color: ink, cursor: "pointer" });
