import { Info, Play, Volume2, VolumeX } from "lucide-react";
import { AnimatePresence, motion, MotionConfig, useReducedMotion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import type { ArenaItem } from "../fight/arena/Arena3D";
import { TOURNAMENTS, type TournamentMeta, type TournamentSlug } from "@/lib/tournois/catalog";
import { participants as loadParticipants } from "@/lib/tournois/data";
import { fontsReady } from "@/lib/tournois/fonts";
import { currentMatch, roundName } from "@/lib/tournois/bracket";
import { useSaved } from "@/lib/tournois/store";
import type { Participant } from "@/lib/tournois/types";
import { keyartSrc } from "../animehub/keyart.js";
import "../tournois/themes/noir.css";
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
  rap: "/tournoi/thumbs/rap/rap-booba-dkr.webp",
  rapvsost: TMDB("z0YhJvomqedHF85bplUJEotkN5l.jpg"),
  bankai: "/tournoi/bankai/tensa-zangetsu.webp",
  panels: "/tournoi/panels/aot-colossal.webp",
};
const KIND: Record<TournamentSlug, string> = {
  ost: "Musique",
  openings: "Génériques",
  endings: "Génériques",
  rap: "Rap français",
  rapvsost: "Deux mondes",
  bankai: "Bleach",
  panels: "Manga",
};

const MORE = [
  { title: "Doublage", text: "VF ou VOSTFR, à l'aveugle.", to: "/tournoi/doublage", img: keyartSrc("violet-evergarden", 960) },
  { title: "Studio", text: "Cette fois, c'est toi qui doubles.", to: "/tournoi/studio", img: keyartSrc("reze", 960) },
  { title: "OST Anime", text: "Openings et OST cultes en duel.", to: "/tournoi/ost-anime", img: keyartSrc("bleach", 960) },
  { title: "Jouer à plusieurs", text: "Un salon, des amis, un champion.", to: "/tournoi/salon", img: keyartSrc("jjk", 960) },
];
const SOON = ["Personnages", "Arcs", "Pouvoirs", "Théories", "Wiki Battles", "Blind Test", "Sakuga"];
const FEATURED: TournamentSlug[] = ["openings", "ost", "endings"];
// Couleur de chaque univers (mêmes que les écrans de duel, fight/identities.ts).
const ACCENT: Record<string, string> = { ost: "#d9a35a", openings: "#ef4d5a", endings: "#e9875f" };

// La scène 3D n'est chargée qu'à l'ouverture du hub, et seulement si WebGL répond.
const Arena3D = lazy(() => import("../fight/arena/Arena3D"));
function useWebGL() {
  const [ok] = useState(() => {
    if (typeof window === "undefined") return false;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
    try {
      const c = document.createElement("canvas");
      return !!(c.getContext("webgl2") || c.getContext("webgl"));
    } catch {
      return false;
    }
  });
  return ok;
}
const ROTATE_MS = 11000;

const bySlug = (s: TournamentSlug) => TOURNAMENTS.find((t) => t.slug === s) as TournamentMeta;

// Statut de ta partie, un hook par tournoi dans un ordre fixe.
function useStatuses() {
  const s = {
    ost: useSaved("ost"),
    openings: useSaved("openings"),
    endings: useSaved("endings"),
    rap: useSaved("rap"),
    rapvsost: useSaved("rapvsost"),
    bankai: useSaved("bankai"),
    panels: useSaved("panels"),
  };
  return useMemo(() => {
    const out = {} as Record<TournamentSlug, { label: string | null; progress: number | null }>;
    for (const slug of Object.keys(s) as TournamentSlug[]) {
      const run = s[slug].run;
      if (!run) {
        const n = s[slug].champions.length;
        out[slug] = { label: n ? `${n} champion${n > 1 ? "s" : ""}` : null, progress: null };
        continue;
      }
      const cur = currentMatch(run.rounds);
      const done = run.rounds.reduce((k, r) => k + r.matches.filter((m) => m.status === "closed" && m.left && m.right).length, 0);
      out[slug] = { label: cur ? roundName(cur.round.size) : "Partie terminée", progress: cur ? done / Math.max(1, run.size - 1) : null };
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.ost, s.openings, s.endings, s.rap, s.rapvsost, s.bankai, s.panels]);
}

export default function HubPage() {
  const [ready, setReady] = useState(false);
  const [ost, setOst] = useState<Participant[]>([]);
  const [openings, setOpenings] = useState<Participant[]>([]);
  const [endings, setEndings] = useState<Participant[]>([]);
  const statuses = useStatuses();

  useEffect(() => {
    document.title = "Tournois · Brams Community";
    let on = true;
    fontsReady("ost").then(() => on && setReady(true));
    loadParticipants("ost").then((l) => on && setOst(l));
    loadParticipants("openings").then((l) => on && setOpenings(l));
    loadParticipants("endings").then((l) => on && setEndings(l));
    return () => {
      on = false;
    };
  }, []);

  // Une vidéo de fond par tournoi phare, tirée une fois.
  const backdrops = useMemo(() => {
    const pick = (l: Participant[]) => {
      const v = l.filter((p) => p.visual.k === "video");
      return v.length ? v[Math.floor(Math.random() * v.length)] : null;
    };
    const ostImg = ost.filter((p) => p.visual.k === "img" && (p.visual as { hi?: string }).hi);
    return {
      openings: pick(openings),
      endings: pick(endings),
      ost: ostImg.length ? ostImg[Math.floor(Math.random() * ostImg.length)] : null,
    } as Record<string, Participant | null>;
    // Tirage une fois les catalogues chargés.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ost.length > 0, openings.length > 0, endings.length > 0]);

  // Les trois portails de l'arène 3D (données prêtes une fois les fonds tirés).
  const navigate = useNavigate();
  const arenaItems = useMemo((): ArenaItem[] | null => {
    if (!backdrops.openings || !backdrops.endings) return null;
    return FEATURED.map((slug) => {
      const meta = bySlug(slug);
      const back = backdrops[slug];
      const st = statuses[slug];
      const media: ArenaItem["media"] =
        back?.visual.k === "video"
          ? { k: "video", src: back.visual.src, start: back.sound?.k === "video" ? (back.sound.hook ?? 30) : 30 }
          : { k: "img", src: back?.visual.k === "img" ? ((back.visual as { hi?: string }).hi ?? back.visual.src) : ART[slug] };
      return {
        slug,
        title: meta.title,
        tagline: meta.tagline,
        path: meta.path,
        kind: KIND[slug],
        accent: ACCENT[slug],
        status: st.progress != null ? `En cours, ${(st.label ?? "").toLowerCase()}` : st.label,
        media,
      };
    });
  }, [backdrops, statuses]);
  const three = useWebGL();

  return (
    <MotionConfig reducedMotion="user">
      <div className={`nx-root nf ${ready ? "is-ready" : ""}`}>
        {three && arenaItems ? (
          <Suspense fallback={<div style={{ height: "min(88dvh, 880px)", minHeight: 540, background: "#08090d" }} aria-busy="true" />}>
            <Arena3D
              items={arenaItems}
              onPlay={(it) => navigate(`/tournoi/${it.path}/duel`)}
              onInfo={(it) => navigate(`/tournoi/${it.path}`)}
            />
          </Suspense>
        ) : (
          <Billboard backdrops={backdrops} statuses={statuses} />
        )}

        <div className="nf-body">
          {GROUPS.map((g) => (
            <Block key={g.title} title={g.title} text={g.text}>
              <div className={`nf-grid nf-grid--${g.slugs.length > 3 ? "wide" : "tight"}`}>
                {g.slugs.map((s, k) => (
                  <TournamentCard key={s} meta={bySlug(s)} status={statuses[s]} index={k} />
                ))}
              </div>
            </Block>
          ))}

          <Block title="Autres modes" text="Doublage, studio, salon entre amis.">
            <div className="nf-grid nf-grid--modes">
              {MORE.map((m, k) => (
                <motion.div key={m.to} {...cardIn(k)}>
                  <Link to={m.to} className="nf-card">
                    <span className="nf-card-art">
                      <img src={m.img} alt="" loading="lazy" decoding="async" />
                    </span>
                    <span className="nf-card-body">
                      <b>{m.title}</b>
                      <small>{m.text}</small>
                    </span>
                  </Link>
                </motion.div>
              ))}
            </div>
          </Block>

          <Block title="Bientôt">
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
  { title: "Musique", text: "Tu écoutes les deux, tu gardes ta préférée.", slugs: ["ost", "openings", "endings", "rap", "rapvsost"] },
  { title: "Images", text: "Une image contre une autre, sans le son.", slugs: ["bankai", "panels"] },
];

// Apparition des cartes à l'entrée dans l'écran, en léger décalage.
const cardIn = (k: number) => ({
  initial: { opacity: 0, y: 18 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-40px" },
  transition: { type: "spring" as const, bounce: 0, duration: 0.8, delay: Math.min(k, 6) * 0.05 },
});

function Block({ title, text, children }: { title: string; text?: string; children: React.ReactNode }) {
  return (
    <div className="nf-block">
      <div className="nf-block-head">
        <h2 className="nf-row-title">{title}</h2>
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
function TournamentCard({ meta, status, index }: { meta: TournamentMeta; status: { label: string | null; progress: number | null }; index: number }) {
  const running = status.progress != null;
  return (
    <motion.div {...cardIn(index)}>
      <Link to={`/tournoi/${meta.path}${running ? "/duel" : ""}`} className="nf-card">
        <span className="nf-card-art">
          <img src={ART[meta.slug]} alt="" loading="lazy" decoding="async" />
          {running ? (
            <span className="nf-card-progress" aria-hidden>
              <i style={{ width: `${Math.round((status.progress ?? 0) * 100)}%` }} />
            </span>
          ) : null}
        </span>
        <span className="nf-card-body">
          <span className="nf-card-top">
            <b>{meta.title}</b>
            {status.label ? <em>{running ? `En cours, ${status.label.toLowerCase()}` : status.label}</em> : null}
          </span>
          <small>{meta.tagline}</small>
        </span>
      </Link>
    </motion.div>
  );
}
