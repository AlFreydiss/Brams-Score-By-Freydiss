import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { MotionConfig } from "framer-motion";
import { TOURNAMENTS, type TournamentSlug } from "@/lib/tournois/catalog";
import { participants as loadParticipants } from "@/lib/tournois/data";
import { currentMatch, roundName } from "@/lib/tournois/bracket";
import { useSaved } from "@/lib/tournois/store";
import type { Participant } from "@/lib/tournois/types";
import { fetchStats } from "@/lib/versusStats.js";
import { keyartSrc } from "../animehub/keyart.js";
import { ArenaHero } from "./hero";
import { VersusCard } from "./versus-card";
import { MiniBracket } from "./mini-bracket";
import { RankRow, StatStrip } from "./rows";
import { ArenaList, type Arena } from "./arena-list";
import { loadArenaFonts } from "./fonts";
import "./arena.css";

// Hub des tournois, refait en « Rouge contre Bleu » (2026-10-25) : l'affiche
// d'un duel d'OST jouable, l'aperçu du tableau, les OST populaires, puis le
// choix de l'arène, une bande par tournoi.

const TMDB = (p: string) => `https://image.tmdb.org/t/p/w1280/${p}`;

// Visuels et effectifs des arènes (les deux camps de chaque bande). Les
// effectifs suivent les catalogues de src/lib/tournois/data ; l'OST est lue en direct.
const ARENA_ART: Record<TournamentSlug, { kind: string; images: [string, string]; count: number }> = {
  ost: { kind: "Musique", images: ["/tournoi/ost/aot-vogel.webp", "/tournoi/ost/dn-light.webp"], count: 270 },
  openings: { kind: "Génériques", images: [TMDB("rqbCbjB19amtOtFQbb3K2lgm2zv.jpg"), TMDB("s85RKl2eqRvXdcS4AQ2CK0CLS0J.jpg")], count: 489 },
  endings: { kind: "Génériques", images: [TMDB("g9vvplRihZv1RipxRDgJ1WLaTQB.jpg"), TMDB("qtfMr08KQsWXnCHY0a96N8NpQ2l.jpg")], count: 344 },
  rap: { kind: "Rap français", images: ["/tournoi/thumbs/rap/rap-booba-dkr.webp", "/tournoi/thumbs/rap/rap-pnl-naha.webp"], count: 102 },
  rapvsost: { kind: "Deux mondes", images: ["/tournoi/thumbs/rap/rap-booba-dkr.webp", TMDB("z0YhJvomqedHF85bplUJEotkN5l.jpg")], count: 124 },
  bankai: { kind: "Bleach", images: ["/tournoi/bankai/tensa-zangetsu.webp", "/tournoi/bankai/zanka-no-tachi.webp"], count: 32 },
  panels: { kind: "Manga", images: ["/tournoi/panels/aot-colossal.webp", "/tournoi/panels/op-ace.webp"], count: 186 },
};
const UNIT: Record<TournamentSlug, string> = { ost: "OST", openings: "openings", endings: "endings", rap: "sons", rapvsost: "sons", bankai: "Bankai", panels: "cases" };

const MORE = [
  { title: "Doublage", text: "VF ou VOSTFR : tranche à l'aveugle.", to: "/tournoi/doublage", img: keyartSrc("violet-evergarden", 960) },
  { title: "Studio", text: "Cette fois, c'est toi qui doubles.", to: "/tournoi/studio", img: keyartSrc("reze", 960) },
  { title: "OST Anime", text: "Openings et OST cultes en duel.", to: "/tournoi/ost-anime", img: keyartSrc("bleach", 960) },
  { title: "Jouer à plusieurs", text: "Un salon, des amis, un seul champion.", to: "/tournoi/salon", img: keyartSrc("jjk", 960) },
];
const SOON = ["Personnages", "Arcs", "Pouvoirs", "Théories", "Wiki Battles", "Blind Test", "Sakuga"];

// Têtes d'affiche tant que le site n'a pas assez de votes pour classer.
const HEADLINERS = ["aot-vogel", "naruto-sadness-and-sorrow", "ds-kamado-tanjiro", "op-binks", "jujutsu-kaisen-hollow-purple", "howl-merry-go-round"];

function pickPair(list: Participant[], not?: Participant[]) {
  const pool = list.filter((p) => p.visual.k === "img" && !not?.some((x) => x.id === p.id));
  const a = pool[Math.floor(Math.random() * pool.length)];
  const rest = pool.filter((p) => p.group !== a?.group);
  const b = rest[Math.floor(Math.random() * rest.length)];
  return a && b ? [a, b] : [];
}

function useStatus(slug: TournamentSlug) {
  const saved = useSaved(slug);
  const run = saved.run;
  if (!run) return saved.champions.length ? `${saved.champions.length} champion${saved.champions.length > 1 ? "s" : ""}` : undefined;
  const cur = currentMatch(run.rounds);
  return cur ? `Partie en cours · ${roundName(cur.round.size)}` : "Partie terminée";
}

function ArenaRows({ ostCount }: { ostCount: number }) {
  // Un hook par tournoi, dans un ordre fixe.
  const status = {
    ost: useStatus("ost"),
    openings: useStatus("openings"),
    endings: useStatus("endings"),
    rap: useStatus("rap"),
    rapvsost: useStatus("rapvsost"),
    bankai: useStatus("bankai"),
    panels: useStatus("panels"),
  };
  const arenas: Arena[] = TOURNAMENTS.map((t) => ({
    id: t.slug,
    title: t.title,
    tagline: t.tagline,
    to: `/tournoi/${t.path}`,
    images: ARENA_ART[t.slug].images,
    kind: ARENA_ART[t.slug].kind,
    count: `${t.slug === "ost" && ostCount ? ostCount : ARENA_ART[t.slug].count} ${UNIT[t.slug]}`,
    status: status[t.slug],
  }));
  return <ArenaList arenas={arenas} />;
}

export default function ArenaHubPage() {
  const [ost, setOst] = useState<Participant[]>([]);
  const [hero, setHero] = useState<Participant[]>([]);
  const [duel, setDuel] = useState<Participant[]>([]);
  const [site, setSite] = useState<Map<string, { wins: number; duels: number }> | null>(null);
  const saved = useSaved("ost");
  const arenasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.title = "Tournois · Brams Community";
    loadArenaFonts();
    let on = true;
    loadParticipants("ost").then((list) => {
      if (!on) return;
      setOst(list);
      const h = pickPair(list);
      setHero(h);
      setDuel(pickPair(list, h));
    });
    fetchStats("anime-ost").then((m: Map<string, { wins: number; duels: number }> | null) => on && setSite(m));
    return () => {
      on = false;
    };
  }, []);

  const byId = useMemo(() => new Map(ost.map((p) => [p.id, p])), [ost]);
  const next = useCallback(() => setDuel((d) => pickPair(ost, d)), [ost]);

  // Le tableau de ta partie d'OST si elle existe, sinon huit OST au hasard.
  const bracket = useMemo(() => {
    const first = saved.run?.rounds[0]?.matches.flatMap((m) => [m.left, m.right]).filter((p): p is Participant => !!p) ?? [];
    const list = first.length >= 8 ? first.slice(0, 8) : ost.filter((p) => p.visual.k === "img").sort(() => Math.random() - 0.5).slice(0, 8);
    const cur = saved.run ? currentMatch(saved.run.rounds) : null;
    return { left: list.slice(0, 4), right: list.slice(4, 8), value: cur ? `1/${cur.round.size / 2}` : saved.run ? "Fini" : "1/16" };
    // Tirage fait une fois le catalogue chargé.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ost.length, saved.run?.startedAt]);

  const popular = useMemo(() => {
    const ranked = site
      ? [...site.entries()]
          .filter(([, s]) => s.duels >= 3)
          .sort((a, b) => b[1].wins / b[1].duels - a[1].wins / a[1].duels || b[1].wins - a[1].wins)
          .map(([id]) => byId.get(id))
          .filter((p): p is Participant => !!p)
      : [];
    const fill = HEADLINERS.map((id) => byId.get(id)).filter((p): p is Participant => !!p);
    return [...ranked, ...fill.filter((p) => !ranked.includes(p))].slice(0, 6);
  }, [site, byId]);

  // Une seule écoute à la fois pour la rangée.
  const audio = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState<string | null>(null);
  const play = (p: Participant) => {
    if (p.sound?.k !== "audio") return;
    audio.current ??= new Audio();
    const a = audio.current;
    if (playing === p.id) {
      a.pause();
      return setPlaying(null);
    }
    a.src = p.sound.src;
    a.volume = 0.7;
    a.onended = () => setPlaying(null);
    a.play().then(() => setPlaying(p.id), () => setPlaying(null));
  };
  useEffect(() => () => audio.current?.pause(), []);

  const totalEntries = Object.values(ARENA_ART).reduce((n, a) => n + a.count, 0) - ARENA_ART.ost.count + (ost.length || ARENA_ART.ost.count);

  return (
    <MotionConfig reducedMotion="user">
      <div className="ar">
        <ArenaHero
          left={hero[0] ? { src: hero[0].visual.k === "img" ? hero[0].visual.src : hero[0].thumb } : null}
          right={hero[1] ? { src: hero[1].visual.k === "img" ? hero[1].visual.src : hero[1].thumb } : null}
          split={["Tournoi", "2026"]}
          motto={["Deux camps,", "un seul vainqueur."]}
          jp={["音楽は、魂の戦いだ。", "最高の一曲を、決めよう。"]}
          cta={{ label: "Choisir mon arène", onClick: () => arenasRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }) }}
        >
          {duel.length === 2 ? <VersusCard pair={duel} statsId="anime-ost" label="Duel d'OST à l'affiche" onNext={next} /> : null}
          {bracket.left.length === 4 ? <MiniBracket left={bracket.left} right={bracket.right} label={saved.run ? "Ta partie d'OST" : "Phase actuelle"} value={bracket.value} /> : null}
          <RankRow title="OST populaires" items={popular} more={{ label: "Voir tout", to: "/tournoi/ost/classement" }} playing={playing} onPlay={play} />
          <StatStrip
            stats={[
              { n: String(TOURNAMENTS.length + MORE.length - 1), label: "Tournois", icon: "trophy" },
              { n: totalEntries.toLocaleString("fr-FR"), label: "Participants", icon: "swords" },
              { n: `+${ost.length || ARENA_ART.ost.count}`, label: "OST en compétition", icon: "music" },
            ]}
          />
        </ArenaHero>

        <div ref={arenasRef} className="ar-section">
          <h2 className="ar-h2">
            Choisis ton arène <small>Chaque duel oppose deux camps. Tu tranches, le tableau avance.</small>
          </h2>
          <ArenaRows ostCount={ost.length} />
        </div>

        <div className="ar-section">
          <h2 className="ar-h2">Autres modes</h2>
          <ul className="ar-mini">
            {MORE.map((m) => (
              <li key={m.to}>
                <Link to={m.to}>
                  <img src={m.img} alt="" loading="lazy" decoding="async" />
                  <b>{m.title}</b>
                  <small>{m.text}</small>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="ar-section ar-end">
          <h2 className="ar-h2">Bientôt</h2>
          <p className="ar-soon">
            {SOON.map((s) => (
              <span key={s}>{s}</span>
            ))}
          </p>
        </div>
      </div>
    </MotionConfig>
  );
}
