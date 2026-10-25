import { useEffect } from "react";
import { currentMatch } from "@/lib/tournois/bracket";
import { useClientDraw } from "@/lib/tournois/client-draw";
import type { Participant } from "@/lib/tournois/types";
import { useTournament } from "../tournois/provider";
import { ArenaHero } from "./hero";
import { loadArenaFonts } from "./fonts";
import "./arena.css";

// Accueil du tournoi d'OST en « Rouge contre Bleu ». Le duel à l'affiche, le
// tableau et les têtes d'affiche vivent sur l'accueil des tournois (/tournoi) :
// ici, l'affiche mène droit au jeu.

const src = (p?: Participant) => (p ? { src: p.visual.k === "img" ? p.visual.src : p.thumb } : null);

export function OstArena() {
  const { meta, participants, saved } = useTournament();
  const hero = useClientDraw(`${meta.slug}:arena`, participants, 2) ?? [];
  useEffect(() => loadArenaFonts(), []);

  const run = saved.run;
  const cur = run ? currentMatch(run.rounds) : null;
  const done = run ? run.rounds.reduce((n, r) => n + r.matches.filter((m) => m.status === "closed" && m.left && m.right).length, 0) : 0;
  const groups = new Set(participants.map((p) => p.group)).size;

  return (
    <div className="ar ar--in">
      <ArenaHero
        left={src(hero[0])}
        right={src(hero[1])}
        lines={["Deux OST.", "Une seule reste."]}
        tagline={`Le tournoi d'OST · ${participants.length} pistes · ${groups} animes`}
        jp={["音楽は、魂の戦いだ。", "最高の一曲を、決めよう。"]}
        cta={{ label: run && cur ? `Reprendre · duel ${done + 1}` : "Commencer le tournoi", to: `/tournoi/${meta.path}/duel` }}
      />
    </div>
  );
}
