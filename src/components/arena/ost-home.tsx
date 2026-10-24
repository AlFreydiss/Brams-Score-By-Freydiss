import { useCallback, useEffect, useMemo, useState } from "react";
import { currentMatch, roundName } from "@/lib/tournois/bracket";
import { useClientDraw } from "@/lib/tournois/client-draw";
import type { Participant } from "@/lib/tournois/types";
import { useTournament } from "../tournois/provider";
import { ArenaHero } from "./hero";
import { MiniBracket } from "./mini-bracket";
import { RankRow, StatStrip } from "./rows";
import { VersusCard } from "./versus-card";
import { loadArenaFonts } from "./fonts";
import "./arena.css";

// Accueil du tournoi d'OST en « Rouge contre Bleu » : l'affiche, un duel
// jouable, ta partie en tableau, les OST populaires, les chiffres.

const HEADLINERS = ["aot-vogel", "naruto-sadness-and-sorrow", "ds-kamado-tanjiro", "op-binks", "jujutsu-kaisen-hollow-purple", "howl-merry-go-round"];
const src = (p?: Participant) => (p ? { src: p.visual.k === "img" ? p.visual.src : p.thumb } : null);

export function OstArena({ popular, siteDuels }: { popular: Participant[]; siteDuels: number }) {
  const { meta, participants, byId, saved, player, listen } = useTournament();
  const hero = useClientDraw(`${meta.slug}:arena`, participants, 2) ?? [];
  const first = useClientDraw(`${meta.slug}:affiche`, participants, 2) ?? [];
  const [duel, setDuel] = useState<Participant[]>([]);
  useEffect(() => {
    if (first.length === 2 && !duel.length) setDuel(first);
  }, [first, duel.length]);
  useEffect(() => loadArenaFonts(), []);

  const next = useCallback(() => {
    const pool = participants.filter((p) => !duel.some((d) => d.id === p.id));
    const a = pool[Math.floor(Math.random() * pool.length)];
    const rest = pool.filter((p) => p.group !== a.group);
    setDuel([a, rest[Math.floor(Math.random() * rest.length)]]);
  }, [participants, duel]);

  const run = saved.run;
  const cur = run ? currentMatch(run.rounds) : null;
  const done = run ? run.rounds.reduce((n, r) => n + r.matches.filter((m) => m.status === "closed" && m.left && m.right).length, 0) : 0;
  const teaser = useClientDraw(`${meta.slug}:bracket`, participants, 8) ?? [];
  const bracket = useMemo(() => {
    const list = run?.rounds[0]?.matches.flatMap((m) => [m.left, m.right]).filter((p): p is Participant => !!p) ?? [];
    const eight = list.length >= 8 ? list.slice(0, 8) : teaser;
    return { left: eight.slice(0, 4), right: eight.slice(4, 8) };
  }, [run, teaser]);

  const ranked = popular.length >= 6 ? popular : [...popular, ...HEADLINERS.map((id) => byId.get(id)).filter((p): p is Participant => !!p && !popular.includes(p))];
  const groups = new Set(participants.map((p) => p.group)).size;

  return (
    <div className="ar ar--in">
      <ArenaHero
        left={src(hero[0])}
        right={src(hero[1])}
        over="Le tournoi"
        title="OST"
        tagline="Les plus grandes OST · un seul vainqueur"
        jp={["音楽は、魂の戦いだ。", "最高の一曲を、決めよう。"]}
        cta={{ label: run && cur ? `Reprendre · duel ${done + 1}` : "Commencer le tournoi", to: `/tournoi/${meta.path}/duel` }}
      >
        {duel.length === 2 ? <VersusCard pair={duel} statsId={meta.statsId} label="Match 1v1 · à toi de trancher" onNext={next} /> : null}
        {bracket.left.length === 4 ? (
          <MiniBracket
            left={bracket.left}
            right={bracket.right}
            label={run ? (cur ? roundName(cur.round.size) : "Partie terminée") : "Phase actuelle"}
            value={cur ? `${done + 1}/${run!.size - 1}` : run ? "Fini" : `1/${Math.min(16, meta.defaultFormat / 2)}`}
          />
        ) : null}
        <RankRow
          title={popular.length ? "OST populaires" : "Têtes d'affiche"}
          items={ranked.slice(0, 6)}
          more={{ label: "Voir tout", to: `/tournoi/${meta.path}/classement` }}
          playing={player.playing ? player.id : null}
          onPlay={listen}
        />
        <StatStrip
          stats={[
            { n: String(participants.length), label: "OST en compétition", icon: "music" },
            { n: String(groups), label: "Animes", icon: "trophy" },
            { n: (siteDuels || saved.votes.length).toLocaleString("fr-FR"), label: siteDuels ? "Duels joués sur le site" : "Tes votes", icon: "swords" },
          ]}
          quote="« La musique n'est pas seulement un son, c'est une émotion qui traverse le temps. »"
        />
      </ArenaHero>
    </div>
  );
}
