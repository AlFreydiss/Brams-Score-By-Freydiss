import { Info, Play, Volume2, VolumeX } from "lucide-react";
import { AnimatePresence, motion, MotionConfig, useReducedMotion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import { DailyDuel, RefrainRadio } from "./hub-extras";
import { Collection } from "./collection";
import { Stage, type StageClip, type StageItem } from "./stage";
import { bgOf, type Bg } from "../fight/jeux-art";
import { Atmosphere, setAtmosphere } from "./atmosphere";
import { portalTo } from "./portal";
import { playLumiere } from "./jingle";
import "./modes.css";
import { TOURNAMENTS, type TournamentMeta, type TournamentSlug } from "@/lib/tournois/catalog";
import { participants as loadParticipants } from "@/lib/tournois/data";
import { fontsReady } from "@/lib/tournois/fonts";
import { currentMatch, roundName } from "@/lib/tournois/bracket";
import { useSaved } from "@/lib/tournois/store";
import type { Participant } from "@/lib/tournois/types";
import { keyartSrc } from "../animehub/keyart.js";
import "../tournois/themes/noir.css";
import { JEUX_REEL, PosterReel, reelFrom, type ReelItem } from "./jeux-reel";
import "./hub.css";

// Hub des tournois façon plateforme de streaming : un grand panneau qui fait
// défiler les trois tournois phares (vidéo d'un vrai générique en fond), puis
// des rangées qui défilent à l'horizontale. Noir, sobre ; le mouvement vient
// des vidéos et des cartes qui s'ouvrent au survol.

const TMDB = (p: string) => `https://image.tmdb.org/t/p/w1280/${p}`;

const ART: Record<TournamentSlug, string> = {
  ost: "/tournoi/ost/aot-vogel.webp",
  openings: TMDB("rqbCbjB19amtOtFQbb3K2lgm2zv.jpg"),
  endings: TMDB("g9vvplRihZv1RipxRDgJ1WLaTQB.jpg"),
  // Fond d'écran de Clair Obscur : Expedition 33 en 16:9 (la pochette carrée s'étirait floue sur l'écran large).
  jeux: "/tournoi/jeux-hero/clair-obscur.webp",
  rap: "/tournoi/thumbs/rap/rap-booba-dkr.webp",
  rapvsost: TMDB("z0YhJvomqedHF85bplUJEotkN5l.jpg"),
  bankai: "/tournoi/bankai/tensa-zangetsu.webp",
  panels: "/tournoi/panels/aot-colossal.webp",
};
const KIND: Record<TournamentSlug, string> = {
  ost: "Musique",
  openings: "Génériques",
  endings: "Génériques",
  jeux: "Jeux vidéo",
  rap: "Rap français",
  rapvsost: "Deux mondes",
  bankai: "Bleach",
  panels: "Manga",
};

const MORE = [
  { title: "Doublage", text: "VF ou VOSTFR, à l'aveugle.", to: "/tournoi/doublage", img: keyartSrc("violet-evergarden", 960), sign: "dub", acc: "#9fc4ff" },
  { title: "Studio", text: "Cette fois, c'est toi qui doubles.", to: "/tournoi/studio", img: keyartSrc("reze", 960), sign: "rec", acc: "#ff5a5f" },
  { title: "OST Anime", text: "Openings et OST cultes en duel.", to: "/tournoi/ost-anime", img: keyartSrc("bleach", 960), sign: "eq", acc: "#d9a35a" },
  { title: "Jouer à plusieurs", text: "Un salon, des amis, un champion.", to: "/tournoi/salon", img: keyartSrc("jjk", 960), sign: "party", acc: "#b9f2c8" },
] as const;

// Petit signe propre à chaque mode : figé au repos, animé au survol (modes.css).
function ModeSign({ kind }: { kind: (typeof MORE)[number]["sign"] }) {
  if (kind === "dub")
    return (
      <span className="md-sign md-dub" aria-hidden>
        <i>VF</i>
        <i>VOSTFR</i>
      </span>
    );
  if (kind === "rec")
    return (
      <span className="md-sign md-rec" aria-hidden>
        <i />
        REC
      </span>
    );
  if (kind === "eq")
    return (
      <span className="md-sign md-eq" aria-hidden>
        <i />
        <i />
        <i />
        <i />
        <i />
      </span>
    );
  return (
    <span className="md-sign md-party" aria-hidden>
      <i />
      <i />
      <i />
      <b>+</b>
    </span>
  );
}
const SOON = ["Personnages", "Arcs", "Pouvoirs", "Théories", "Wiki Battles", "Blind Test", "Sakuga"];
const FEATURED: TournamentSlug[] = ["openings", "ost", "endings", "jeux"];
// Couleur de chaque univers (mêmes que les écrans de duel, fight/identities.ts).
const ACCENT: Record<string, string> = { ost: "#d9a35a", openings: "#ef4d5a", endings: "#e9875f", jeux: "#d2ad6e", rap: "#f4f2ec", rapvsost: "#f4f2ec", bankai: "#9fc4ff", panels: "#f4f2ec" };

// Écran de sélection : ordre des cases et nom court de chaque tournoi.
const ORDER: TournamentSlug[] = ["openings", "ost", "endings", "jeux", "rap", "rapvsost", "bankai", "panels"];
const SHORT: Record<TournamentSlug, string> = { openings: "Openings", ost: "OST", endings: "Endings", jeux: "Jeux vidéo", rap: "Rap FR", rapvsost: "Rap vs OST", bankai: "Bankai", panels: "Panels" };
// Écrans du carrousel : jusqu'à six par tournoi, tirés une fois. Une vidéo du
// site démarre à son refrain ; sinon l'image du participant en grand.
function clipsFrom(list: Participant[], slug: TournamentSlug, count = 6): StageClip[] {
  const pool = [...list].sort(() => Math.random() - 0.5);
  const seen = new Set<string>();
  const out: StageClip[] = [];
  for (const p of pool) {
    const key = p.sub ?? p.group;
    if (seen.has(key)) continue;
    const v = p.visual as { k: string; src: string; hi?: string; pos?: string };
    const art = slug === "jeux" ? bgOf(p as Participant & { bg?: Bg }) : null;
    const still = art?.src ?? (v.k === "img" ? (v.hi ?? v.src) : p.thumb.replace("/t/p/w300/", "/t/p/w1280/"));
    if (!still) continue;
    seen.add(key);
    out.push({
      id: p.id,
      title: p.title,
      sub: [p.sub, p.artist].filter(Boolean).join(", ") || undefined,
      still,
      pos: art?.pos ?? v.pos,
      video: v.k === "video" ? { src: v.src, start: p.sound?.k === "video" ? (p.sound.hook ?? 25) : 25 } : undefined,
    });
    if (out.length >= count) break;
  }
  return out;
}
const ROTATE_MS = 11000;

const bySlug = (s: TournamentSlug) => TOURNAMENTS.find((t) => t.slug === s) as TournamentMeta;

// Statut de ta partie, un hook par tournoi dans un ordre fixe.
function useStatuses() {
  const s = {
    ost: useSaved("ost"),
    openings: useSaved("openings"),
    endings: useSaved("endings"),
    jeux: useSaved("jeux"),
    rap: useSaved("rap"),
    rapvsost: useSaved("rapvsost"),
    bankai: useSaved("bankai"),
    panels: useSaved("panels"),
  };
  return useMemo(() => {
    const out = {} as Record<TournamentSlug, { label: string | null; progress: number | null; run: StageItem["run"] }>;
    for (const slug of Object.keys(s) as TournamentSlug[]) {
      const run = s[slug].run;
      if (!run) {
        const n = s[slug].champions.length;
        out[slug] = { label: n ? `${n} champion${n > 1 ? "s" : ""}` : null, progress: null, run: null };
        continue;
      }
      const cur = currentMatch(run.rounds);
      const done = run.rounds.reduce((k, r) => k + r.matches.filter((m) => m.status === "closed" && m.left && m.right).length, 0);
      // Vrais duels de la partie : un de moins que de participants (les exempts ne jouent pas).
      const players = (run.rounds[0]?.matches ?? []).reduce((k, m) => k + (m.left ? 1 : 0) + (m.right ? 1 : 0), 0);
      out[slug] = {
        label: cur ? roundName(cur.round.size) : "Partie terminée",
        progress: cur ? done / Math.max(1, run.size - 1) : null,
        run: cur ? { done, total: Math.max(done + 1, players - 1), now: roundName(cur.round.size), next: cur.round.size > 2 ? roundName(cur.round.size / 2) : null } : null,
      };
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.ost, s.openings, s.endings, s.jeux, s.rap, s.rapvsost, s.bankai, s.panels]);
}

export default function HubPage() {
  const [ready, setReady] = useState(false);
  // Cartes du hub : elles penchent vers la souris, reflet holo (comme les cartes du haut).
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = rootRef.current;
    if (!el || !window.matchMedia("(hover: hover)").matches) return;
    const move = (e: PointerEvent) => {
      const card = (e.target as HTMLElement).closest<HTMLElement>(".nf-card");
      if (!card) return;
      const r = card.getBoundingClientRect();
      card.style.setProperty("--mx", ((e.clientX - r.left) / r.width - 0.5).toFixed(3));
      card.style.setProperty("--my", ((e.clientY - r.top) / r.height - 0.5).toFixed(3));
    };
    el.addEventListener("pointermove", move);
    return () => el.removeEventListener("pointermove", move);
  }, []);
  const [ost, setOst] = useState<Participant[]>([]);
  const [openings, setOpenings] = useState<Participant[]>([]);
  const [endings, setEndings] = useState<Participant[]>([]);
  const [jeux, setJeux] = useState<Participant[]>([]);
  const [rest, setRest] = useState<Partial<Record<TournamentSlug, Participant[]>>>({});
  const statuses = useStatuses();

  useEffect(() => {
    document.title = "Tournois · Brams Community";
    let on = true;
    fontsReady("ost").then(() => on && setReady(true));
    loadParticipants("ost").then((l) => on && setOst(l));
    loadParticipants("openings").then((l) => on && setOpenings(l));
    loadParticipants("endings").then((l) => on && setEndings(l));
    loadParticipants("jeux").then((l) => on && setJeux(l));
    // Les autres tournois : seulement pour les écrans du carrousel, sans rien bloquer.
    for (const slug of ["rap", "rapvsost", "bankai", "panels"] as TournamentSlug[]) loadParticipants(slug).then((l) => on && setRest((r) => ({ ...r, [slug]: l })));
    return () => {
      on = false;
    };
  }, []);

  const navigate = useNavigate();
  // Les écrans de chaque tournoi, tirés une fois par catalogue chargé.
  const clips = useMemo(() => {
    const lists: Record<TournamentSlug, Participant[]> = { ost, openings, endings, jeux, rap: rest.rap ?? [], rapvsost: rest.rapvsost ?? [], bankai: rest.bankai ?? [], panels: rest.panels ?? [] };
    const out = {} as Record<TournamentSlug, StageClip[]>;
    for (const slug of ORDER) {
      const drawn = clipsFrom(lists[slug], slug);
      // Jeux : toujours la boucle de Clair Obscur en premier.
      const head: StageClip[] = slug === "jeux" ? [{ id: "jeux-hero", title: "Clair Obscur: Expedition 33", still: ART.jeux, video: { src: "/tournoi/jeux-hero/clair-obscur.mp4", start: 0 } }] : [];
      out[slug] = [...head, ...drawn].slice(0, 6);
      if (!out[slug].length) out[slug] = [{ id: `${slug}-art`, title: bySlug(slug).title, still: ART[slug] }];
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ost.length, openings.length, endings.length, jeux.length, rest]);
  const stageItems = useMemo((): StageItem[] | null => {
    if (!openings.length) return null;
    return ORDER.map((slug) => {
      const meta = bySlug(slug);
      const st = statuses[slug];
      return { slug, title: meta.title, short: SHORT[slug], tagline: meta.tagline, kind: KIND[slug], accent: ACCENT[slug], run: st.run, note: st.run ? null : st.label, clips: clips[slug] };
    });
  }, [clips, statuses, openings.length]);

  // Duel du jour : tiré parmi les génériques et les musiques de jeux (sons lisibles par le site).
  const dailyPools = useMemo(
    () => [
      { slug: "openings", statsId: "anime-openings", title: "openings", accent: ACCENT.openings, list: openings },
      { slug: "endings", statsId: "anime-endings", title: "endings", accent: ACCENT.endings, list: endings },
      { slug: "jeux", statsId: "video-game-ost", title: "OST de jeux vidéo", accent: ACCENT.jeux, list: jeux },
    ],
    [openings, endings, jeux],
  );
  const radioList = useMemo(() => [...openings, ...endings], [openings, endings]);
  // Affiches vivantes : les images de chaque tournoi musical défilent sur sa carte.
  const reels = useMemo<Partial<Record<TournamentSlug, ReelItem[]>>>(() => ({ jeux: JEUX_REEL, openings: reelFrom(openings), endings: reelFrom(endings), ost: reelFrom(ost) }), [openings, endings, ost]);

  return (
    <MotionConfig reducedMotion="user">
      <div ref={rootRef} className={`nx-root nf ${ready ? "is-ready" : ""}`}>
        {stageItems ? (
          <Stage items={stageItems} onAccent={setAtmosphere} onLaunch={(it) => it.slug === "jeux" && playLumiere()} onGo={(it) => navigate(`/tournoi/${bySlug(it.slug as TournamentSlug).path}/duel`)} onInfo={(it) => {
              if (it.slug === "jeux") playLumiere();
              navigate(`/tournoi/${bySlug(it.slug as TournamentSlug).path}`);
            }}
          />
        ) : (
          <div style={{ height: "min(100dvh, 960px)", minHeight: 640, background: "#08090d" }} aria-busy="true" />
        )}

        {/* Brume vivante derrière les rangées (sous l'arène, fixe à l'écran). */}
        <Atmosphere />
        <div className="nf-body">
          <div className="nf-block">
            <DailyDuel pools={dailyPools} aside={<RefrainRadio list={radioList} />} />
          </div>
          <div className="nf-block">
            <Collection />
          </div>
          {GROUPS.map((g, gi) => (
            <Block key={g.title} title={g.title} text={g.text} n={gi + 1}>
              <div className={`nf-grid nf-grid--${g.slugs.length > 3 ? "wide" : "tight"}`}>
                {g.slugs.map((s, k) => (
                  <TournamentCard key={s} meta={bySlug(s)} status={statuses[s]} index={k} reel={reels[s]} />
                ))}
              </div>
            </Block>
          ))}

          <Block title="Autres modes" text="Doublage, studio, salon entre amis." n={GROUPS.length + 1}>
            <div className="nf-grid nf-grid--modes">
              {MORE.map((m, k) => (
                <motion.div key={m.to} {...cardIn(k)}>
                  <Link
                    to={m.to}
                    onClick={(e) => {
                      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
                      e.preventDefault();
                      const art = e.currentTarget.querySelector<HTMLElement>(".nf-card-art") ?? e.currentTarget;
                      portalTo(art, m.img, m.acc, () => navigate(m.to));
                    }}
                    className={`nf-card nf-card--poster nf-card--mode md-${m.sign}-card`}
                    style={{ "--acc": m.acc } as React.CSSProperties}
                  >
                    <span className="nf-card-art">
                      <img src={m.img} alt="" loading="lazy" decoding="async" />
                      <i className="nf-holo" aria-hidden />
                      <ModeSign kind={m.sign} />
                      <span className="nf-card-body">
                        <b>{m.title}</b>
                        <small>{m.text}</small>
                      </span>
                    </span>
                  </Link>
                </motion.div>
              ))}
            </div>
          </Block>

          <Block title="Bientôt" n={GROUPS.length + 2}>
            <p className="nf-soon">
              {SOON.map((s) => (
                <span key={s}>{s}</span>
              ))}
            </p>
          </Block>
        </div>
      </div>
    </MotionConfig>
  );
}

// Les tournois rangés par nature : ce qu'on écoute, ce qu'on regarde.
const GROUPS: { title: string; text: string; slugs: TournamentSlug[] }[] = [
  { title: "Musique", text: "Tu écoutes les deux, tu gardes ta préférée.", slugs: ["ost", "openings", "endings", "jeux", "rap", "rapvsost"] },
  { title: "Images", text: "Une image contre une autre, sans le son.", slugs: ["bankai", "panels"] },
];

// Apparition des cartes à l'entrée dans l'écran, en léger décalage.
const cardIn = (k: number) => ({
  initial: { opacity: 0, y: 18 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-40px" },
  transition: { type: "spring" as const, bounce: 0, duration: 0.8, delay: Math.min(k, 6) * 0.05 },
});

function Block({ title, text, n, children }: { title: string; text?: string; n?: number; children: React.ReactNode }) {
  return (
    <div className="nf-block">
      <div className="nf-block-head">
        <h2 className="nf-row-title">
          {/* Numéro de section, façon sommaire. */}
          {n ? <span className="nf-block-idx" aria-hidden>{String(n).padStart(2, "0")}</span> : null}
          {title}
        </h2>
        {text ? <p>{text}</p> : null}
      </div>
      {children}
    </div>
  );
}

// ── Panneau d'accueil ────────────────────────────────────────────────
function Billboard({ backdrops, statuses }: { backdrops: Record<string, Participant | null>; statuses: ReturnType<typeof useStatuses> }) {
  const reduce = useReducedMotion();
  const navigate = useNavigate();
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(true);
  const slug = FEATURED[i];
  const meta = bySlug(slug);
  const back = backdrops[slug];
  const st = statuses[slug];

  // Rotation douce entre les trois tournois phares ; pause au survol.
  useEffect(() => {
    if (paused || reduce) return;
    const t = setTimeout(() => setI((v) => (v + 1) % FEATURED.length), ROTATE_MS);
    return () => clearTimeout(t);
  }, [i, paused, reduce]);

  const start = back?.sound?.k === "video" ? (back.sound.hook ?? 30) : 0;

  return (
    <section className="nf-bill" onPointerEnter={() => setPaused(true)} onPointerLeave={() => setPaused(false)} aria-label="Tournois à la une">
      <AnimatePresence initial={false}>
        <motion.div
          key={slug}
          className="nf-bill-media"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { duration: 1.1, ease: [0.16, 1, 0.3, 1] } }}
          exit={{ opacity: 0, transition: { duration: 0.9 } }}
        >
          {back?.visual.k === "video" && !reduce ? (
            <BackVideo src={back.visual.src} start={start} muted={muted} poster={back.thumb} />
          ) : (
            <img src={back?.visual.k === "img" ? ((back.visual as { hi?: string }).hi ?? back.visual.src) : ART[slug]} alt="" decoding="async" />
          )}
        </motion.div>
      </AnimatePresence>
      <div className="nf-bill-shade" aria-hidden />

      <div className="nf-bill-copy">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={slug}
            initial="out"
            animate="in"
            exit="gone"
            variants={{ in: { transition: { staggerChildren: 0.07, delayChildren: 0.15 } }, gone: { opacity: 0, transition: { duration: 0.25 } } }}
          >
            <motion.p className="nf-kind" variants={RISE}>
              {KIND[slug]}
              {st.label ? <span>{st.label}</span> : null}
            </motion.p>
            <motion.h1 className="nf-bill-title" variants={RISE}>
              {meta.title}
            </motion.h1>
            <motion.p className="nf-bill-text" variants={RISE}>
              {meta.tagline}
            </motion.p>
            {back && back.visual.k === "video" ? (
              <motion.p className="nf-bill-now" variants={RISE}>
                En fond : {back.title}, {back.sub}
              </motion.p>
            ) : null}
            <motion.div className="nf-bill-actions" variants={RISE}>
              <button type="button" className="nf-play" onClick={() => navigate(`/tournoi/${meta.path}/duel`)}>
                <Play size={20} fill="currentColor" />
                {st.progress != null ? "Reprendre" : "Jouer"}
              </button>
              <Link to={`/tournoi/${meta.path}`} className="nf-more">
                <Info size={20} />
                Plus d'infos
              </Link>
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="nf-bill-side">
        {back?.visual.k === "video" && !reduce ? (
          <button type="button" className="nf-mute" onClick={() => setMuted((m) => !m)} aria-pressed={!muted} aria-label={muted ? "Activer le son de la vidéo" : "Couper le son de la vidéo"}>
            {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
        ) : null}
        <div className="nf-dots" role="tablist" aria-label="Tournoi à la une">
          {FEATURED.map((s, k) => (
            <button key={s} type="button" role="tab" aria-selected={k === i} aria-label={bySlug(s).title} className={k === i ? "is-on" : ""} onClick={() => setI(k)}>
              <i style={{ animationDuration: `${ROTATE_MS}ms`, animationPlayState: paused ? "paused" : "running" }} key={`${s}-${i}`} />
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

const RISE = {
  out: { opacity: 0, y: 18 },
  in: { opacity: 1, y: 0, transition: { type: "spring" as const, bounce: 0, duration: 0.8 } },
};

function BackVideo({ src, start, muted, poster }: { src: string; start: number; muted: boolean; poster: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    v.muted = muted;
    if (!muted) v.volume = 0.5;
  }, [muted]);
  return (
    <video
      ref={ref}
      src={`${src}#t=${start}`}
      poster={poster}
      autoPlay
      muted
      loop
      playsInline
      preload="auto"
      onLoadedMetadata={(e) => {
        if (e.currentTarget.currentTime < start - 1) e.currentTarget.currentTime = start;
      }}
    />
  );
}

// ── Carte de tournoi ─────────────────────────────────────────────────
function TournamentCard({ meta, status, index, reel }: { meta: TournamentMeta; status: { label: string | null; progress: number | null }; index: number; reel?: ReelItem[] }) {
  const running = status.progress != null;
  const navigate = useNavigate();
  const to = `/tournoi/${meta.path}${running ? "/duel" : ""}`;
  const [hot, setHot] = useState(false);
  return (
    <motion.div {...cardIn(index)}>
      <Link
        to={to}
        onPointerEnter={() => {
          setAtmosphere(ACCENT[meta.slug] ?? "#d9a35a");
          setHot(true);
        }}
        onPointerLeave={() => setHot(false)}
        onClick={(e) => {
          // Clic simple : l'affiche s'ouvre en plein écran avant d'arriver sur le tournoi.
          if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
          e.preventDefault();
          if (meta.slug === "jeux") playLumiere();
          const art = e.currentTarget.querySelector<HTMLElement>(".nf-card-art") ?? e.currentTarget;
          portalTo(art, ART[meta.slug], ACCENT[meta.slug] ?? "#f4f2ec", () => navigate(to));
        }}
        className={`nf-card nf-card--poster nf-card--${meta.slug}`}
        style={{ "--acc": ACCENT[meta.slug] ?? "#f4f2ec" } as React.CSSProperties}
      >
        <span className="nf-card-art">
          <i className="nf-holo" aria-hidden />
          {reel?.length ? <PosterReel items={reel} hot={hot} fallback={ART[meta.slug]} offset={index * 1400} /> : <img src={ART[meta.slug]} alt="" loading="lazy" decoding="async" />}
          {running ? (
            <span className="nf-card-progress" aria-hidden>
              <i style={{ width: `${Math.round((status.progress ?? 0) * 100)}%` }} />
            </span>
          ) : null}
          <span className="nf-card-body">
            {status.label ? <em className="nf-card-status">{running ? `En cours, ${status.label.toLowerCase()}` : status.label}</em> : null}
            <b>{meta.title}</b>
            <small>{meta.tagline}</small>
          </span>
        </span>
      </Link>
    </motion.div>
  );
}
