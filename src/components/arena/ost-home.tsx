import { useEffect, useMemo } from "react";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { currentMatch } from "@/lib/tournois/bracket";
import { useClientDraw } from "@/lib/tournois/client-draw";
import type { Participant } from "@/lib/tournois/types";
import { useTournament } from "../tournois/provider";
import { Broadcast, useReelPool } from "./broadcast";
import { loadArenaFonts } from "./fonts";
import "./arena.css";

// Accueil du tournoi d'OST, en affiche de combat : deux OST du catalogue en
// photo, l'accroche et le départ. Le duel jouable, le tableau et les OST
// populaires vivent sur l'accueil des tournois (/tournoi).

const photo = (p?: Participant) => (p ? { src: p.visual.k === "img" ? p.visual.src : p.thumb } : null);

export function OstArena() {
  const { meta, participants, saved } = useTournament();
  const pair = useClientDraw(`${meta.slug}:arena`, participants, 2) ?? [];
  const pool = useReelPool(useMemo(() => participants.map((p) => p.thumb), [participants]));
  useEffect(() => loadArenaFonts(), []);

  const run = saved.run;
  const cur = run ? currentMatch(run.rounds) : null;
  const done = run ? run.rounds.reduce((n, r) => n + r.matches.filter((m) => m.status === "closed" && m.left && m.right).length, 0) : 0;
  const groups = new Set(participants.map((p) => p.group)).size;

  return (
    <div className="ar ar--in">
      <Broadcast left={photo(pair[0])} right={photo(pair[1])} bug="Tournoi d'OST · 2026" chip={`${participants.length} pistes · ${groups} animes`} pool={pool} solo>
        <div className="ar-poster">
          <h1 className="ar-poster-title">
            Deux OST. <span>Une seule reste.</span>
          </h1>
          <Link to={`/tournoi/${meta.path}/duel`} className="ar-go">
            {run && cur ? `Reprendre · duel ${done + 1}` : "Commencer le tournoi"} <ArrowRight size={16} />
          </Link>
        </div>
      </Broadcast>
    </div>
  );
}
