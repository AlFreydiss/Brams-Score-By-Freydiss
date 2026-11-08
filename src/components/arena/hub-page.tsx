import { ChevronLeft, ChevronRight, Info, Pause, Play, Volume2, VolumeX } from "lucide-react";
import { AnimatePresence, motion, MotionConfig, useReducedMotion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { TOURNAMENTS, type TournamentMeta, type TournamentSlug } from "@/lib/tournois/catalog";
import { participants as loadParticipants } from "@/lib/tournois/data";
import { fontsReady } from "@/lib/tournois/fonts";
import { currentMatch, roundName } from "@/lib/tournois/bracket";
import { useSaved } from "@/lib/tournois/store";
import type { Participant } from "@/lib/tournois/types";
import { fetchStats } from "@/lib/versusStats.js";
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
const HEADLINERS = ["aot-vogel", "naruto-sadness-and-sorrow", "ds-kamado-tanjiro", "op-binks", "jujutsu-kaisen-hollow-purple", "howl-merry-go-round"];
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
  const [site, setSite] = useState<Map<string, { wins: number; duels: number }> | null>(null);
  const statuses = useStatuses();

  useEffect(() => {
    document.title = "Tournois · Brams Community";
    let on = true;
    fontsReady("ost").then(() => on && setReady(true));
    loadParticipants("ost").then((l) => on && setOst(l));
    loadParticipants("openings").then((l) => on && setOpenings(l));
    loadParticipants("endings").then((l) => on && setEndings(l));
    fetchStats("anime-ost").then((m: Map<string, { wins: number; duels: number }> | null) => on && setSite(m));
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

  const popular = useMemo(() => {
    const byId = new Map(ost.map((p) => [p.id, p]));
    const ranked = site
      ? [...site.entries()]
          .filter(([, s]) => s.duels >= 3)
          .sort((a, b) => b[1].wins / b[1].duels - a[1].wins / a[1].duels || b[1].wins - a[1].wins)
          .map(([id]) => byId.get(id))
          .filter((p): p is Participant => !!p)
      : [];
    const fill = HEADLINERS.map((id) => byId.get(id)).filter((p): p is Participant => !!p);
    const rest = ost.filter((p) => p.visual.k === "img").slice(0, 24);
    return [...new Set([...ranked, ...fill, ...rest])].slice(0, 18);
  }, [site, ost]);

  const showcase = useMemo(() => {
    const v = openings.filter((p) => p.visual.k === "video");
    return [...v].sort(() => Math.random() - 0.5).slice(0, 18);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openings.length]);

  const resume = TOURNAMENTS.filter((t) => statuses[t.slug].progress != null);

  return (
    <MotionConfig reducedMotion="user">
      <div className={`nx-root nf ${ready ? "is-ready" : ""}`}>
        <Billboard backdrops={backdrops} statuses={statuses} />

        <div className="nf-rows">
          {resume.length ? (
            <Row title="Reprendre ta partie">
              {resume.map((t) => (
                <TournamentCard key={t.slug} meta={t} status={statuses[t.slug]} resume />
              ))}
            </Row>
          ) : null}

          <Row title="Tous les tournois">
            {TOURNAMENTS.map((t) => (
              <TournamentCard key={t.slug} meta={t} status={statuses[t.slug]} />
            ))}
          </Row>

          {showcase.length ? (
            <Row title="Openings à l'affiche" more={{ label: "Lancer le tournoi", to: "/tournoi/openings/duel" }}>
              {showcase.map((p) => (
                <VideoCard key={p.id} p={p} to="/tournoi/openings" />
              ))}
            </Row>
          ) : null}

          {popular.length ? <OstRow items={popular} /> : null}

          <Row title="Autres modes">
            {MORE.map((m) => (
              <Link key={m.to} to={m.to} className="nf-card nf-card--mode">
                <span className="nf-card-art">
                  <img src={m.img} alt="" loading="lazy" decoding="async" />
                </span>
                <span className="nf-card-body">
                  <b>{m.title}</b>
                  <small>{m.text}</small>
                </span>
              </Link>
            ))}
          </Row>

          <section className="nf-soon" aria-label="Bientôt">
            <h2 className="nf-row-title">Bientôt</h2>
            <p>
              {SOON.map((s) => (
                <span key={s}>{s}</span>
              ))}
            </p>
          </section>
        </div>
      </div>
    </MotionConfig>
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

// ── Rangées ──────────────────────────────────────────────────────────
function Row({ title, more, children }: { title: string; more?: { label: string; to: string }; children: React.ReactNode }) {
  const track = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: true, end: false });
  const measure = useCallback(() => {
    const el = track.current;
    if (!el) return;
    setEdges({ start: el.scrollLeft < 8, end: el.scrollLeft + el.clientWidth > el.scrollWidth - 8 });
  }, []);
  useEffect(() => {
    measure();
    const el = track.current;
    if (!el) return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [measure]);
  const page = (dir: number) => track.current?.scrollBy({ left: dir * track.current.clientWidth * 0.82, behavior: "smooth" });
  return (
    <motion.section className="nf-row" initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-60px" }} transition={{ type: "spring", bounce: 0, duration: 0.9 }}>
      <div className="nf-row-head">
        <h2 className="nf-row-title">{title}</h2>
        {more ? (
          <Link to={more.to} className="nf-row-more">
            {more.label}
            <ChevronRight size={15} />
          </Link>
        ) : null}
      </div>
      <div className="nf-row-wrap">
        <button type="button" className="nf-arrow nf-arrow--l" onClick={() => page(-1)} disabled={edges.start} aria-label={`Défiler ${title} vers la gauche`}>
          <ChevronLeft size={26} />
        </button>
        <div ref={track} className="nf-track" onScroll={measure}>
          {children}
        </div>
        <button type="button" className="nf-arrow nf-arrow--r" onClick={() => page(1)} disabled={edges.end} aria-label={`Défiler ${title} vers la droite`}>
          <ChevronRight size={26} />
        </button>
      </div>
    </motion.section>
  );
}

function TournamentCard({ meta, status, resume }: { meta: TournamentMeta; status: { label: string | null; progress: number | null }; resume?: boolean }) {
  return (
    <Link to={`/tournoi/${meta.path}${resume ? "/duel" : ""}`} className="nf-card">
      <span className="nf-card-art">
        <img src={ART[meta.slug]} alt="" loading="lazy" decoding="async" />
        {status.progress != null ? (
          <span className="nf-card-progress" aria-hidden>
            <i style={{ width: `${Math.round(status.progress * 100)}%` }} />
          </span>
        ) : null}
      </span>
      <span className="nf-card-body">
        <b>{meta.title}</b>
        <small>{resume && status.label ? status.label : meta.tagline}</small>
      </span>
    </Link>
  );
}

// Carte vidéo : l'image au repos, la vidéo (muette, au passage fort) après un
// court survol, comme sur une plateforme de streaming.
function VideoCard({ p, to }: { p: Participant; to: string }) {
  const [hover, setHover] = useState(false);
  const [live, setLive] = useState(false);
  const timer = useRef(0);
  const start = p.sound?.k === "video" ? (p.sound.hook ?? 30) : 0;
  return (
    <Link
      to={to}
      className={`nf-card nf-card--video ${live ? "is-live" : ""}`}
      onPointerEnter={() => {
        setHover(true);
        timer.current = window.setTimeout(() => setLive(true), 450);
      }}
      onPointerLeave={() => {
        clearTimeout(timer.current);
        setHover(false);
        setLive(false);
      }}
    >
      <span className="nf-card-art">
        <img src={p.thumb} alt="" loading="lazy" decoding="async" />
        {hover && p.visual.k === "video" ? <video src={`${p.visual.src}#t=${start}`} autoPlay muted playsInline preload="auto" onPlaying={() => setLive(true)} /> : null}
      </span>
      <span className="nf-card-body">
        <b>{p.title}</b>
        <small>{[p.sub, p.note].filter(Boolean).join(", ")}</small>
      </span>
    </Link>
  );
}

// OST populaires : l'extrait officiel (Apple Music) quand il existe.
function OstRow({ items }: { items: Participant[] }) {
  const audio = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState<string | null>(null);
  useEffect(() => () => audio.current?.pause(), []);
  const src = (p: Participant) => (p.sound?.k === "audio" ? p.sound.src : p.sound?.k === "youtube" ? p.sound.fallback : undefined);
  const toggle = (p: Participant) => {
    const s = src(p);
    if (!s) return;
    audio.current ??= new Audio();
    const a = audio.current;
    if (playing === p.id) {
      a.pause();
      setPlaying(null);
      return;
    }
    a.src = s;
    a.volume = 0.7;
    a.onended = () => setPlaying(null);
    a.play().then(
      () => setPlaying(p.id),
      () => setPlaying(null),
    );
  };
  return (
    <Row title="OST populaires" more={{ label: "Classement", to: "/tournoi/ost/classement" }}>
      {items.map((p) => {
        const on = playing === p.id;
        const can = !!src(p);
        return (
          <div key={p.id} className={`nf-card nf-card--ost ${on ? "is-playing" : ""}`}>
            <span className="nf-card-art">
              <img src={p.visual.k === "img" ? p.visual.src : p.thumb} alt="" loading="lazy" decoding="async" />
              {can ? (
                <button type="button" className="nf-card-play" onClick={() => toggle(p)} aria-pressed={on} aria-label={`${on ? "Mettre en pause" : "Écouter un extrait de"} ${p.title}`}>
                  {on ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
                </button>
              ) : null}
            </span>
            <span className="nf-card-body">
              <b>{p.title}</b>
              <small>{p.sub}</small>
            </span>
          </div>
        );
      })}
    </Row>
  );
}
