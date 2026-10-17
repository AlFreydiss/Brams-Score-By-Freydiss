import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { champion, currentMatch, roundName, winnerOf } from "@/lib/tournois/bracket";
import { actions } from "@/lib/tournois/store";
import { recordDuel } from "@/lib/versusStats.js";
import type { Match, Participant } from "@/lib/tournois/types";
import { Champion } from "./champion";
import { DuelScreen, type RoundInfo } from "./duel-screen";
import { useTournament } from "./provider";
import { Recap } from "./recap";
import { Setup } from "./setup";

export function DuelPage() {
  const { meta, saved } = useTournament();
  const run = saved.run;
  // Pendant l'animation du choix, on garde le duel affiché alors que le
  // tableau a déjà avancé : le vote est enregistré tout de suite.
  const [held, setHeld] = useState<{ match: Match; roundSize: number } | null>(null);
  const [recap, setRecap] = useState<{ size: number; qualified: Participant[] } | null>(null);

  // onDone est appelé après l'animation : il doit lire le tableau à jour.
  const runRef = useRef(run);
  useEffect(() => {
    runRef.current = run;
  }, [run]);

  const cur = useMemo(() => (run ? currentMatch(run.rounds) : null), [run]);
  const champ = useMemo(() => (run ? champion(run.rounds) : null), [run]);

  const info = useMemo((): RoundInfo | null => {
    if (!run) return null;
    const m = held?.match ?? cur?.match;
    const size = held?.roundSize ?? cur?.round.size;
    if (!m || !size) return null;
    const round = run.rounds.find((r) => r.size === size);
    const real = round?.matches.filter((x) => x.left && x.right) ?? [];
    const total = Math.max(1, run.size - 1);
    const done = run.rounds.reduce((n, r) => n + r.matches.filter((x) => x.status === "closed" && x.left && x.right).length, 0);
    return {
      label: roundName(size),
      index: real.findIndex((x) => x.id === m.id) + 1,
      total: real.length,
      remaining: total - done,
      progress: done / total,
    };
  }, [run, cur, held]);

  const showMatch = run ? (held?.match ?? cur?.match ?? null) : null;
  const showSize = held?.roundSize ?? cur?.round.size ?? 0;

  return (
    <div className="t-duel-page">
      {/* Départ, duels et champion se succèdent dans une seule transition. */}
      <AnimatePresence mode="wait">
        {!run ? (
          <motion.div key="setup" initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { duration: 0.4 } }} exit={{ opacity: 0, scale: 0.985, transition: { duration: 0.32, ease: [0.7, 0, 0.2, 1] } }}>
            <Setup />
          </motion.div>
        ) : showMatch && showMatch.left && showMatch.right && !recap ? (
          <DuelScreen
            key={showMatch.id}
            left={showMatch.left}
            right={showMatch.right}
            round={info}
            isFinal={showSize === 2}
            blind={!!run?.blind}
            canUndo={!!saved.undo && !held}
            onUndo={() => actions.undo(meta.slug)}
            onChoose={(side, ms) => {
              const winner = side === "left" ? showMatch.left : showMatch.right;
              if (!winner) return false;
              const ok = actions.vote(meta.slug, showMatch.id, winner.id, ms);
              if (ok) {
                setHeld({ match: showMatch, roundSize: showSize });
                // Statistiques du site (versus_duels), comme les anciennes pages Bankai et Panels.
                const loser = side === "left" ? showMatch.right : showMatch.left;
                if (meta.statsId && loser) recordDuel(meta.statsId, winner.id, loser.id);
              }
              return ok;
            }}
            onDone={() => {
              const size = showSize;
              setHeld(null);
              // Fin d'un tour (hors finale) : récap des qualifiés.
              const r = runRef.current?.rounds.find((x) => x.size === size);
              if (r && size > 2 && r.matches.every((m) => m.status === "closed")) {
                setRecap({ size, qualified: r.matches.map(winnerOf).filter((p): p is Participant => !!p) });
              }
            }}
          />
        ) : !showMatch && champ && !recap ? (
          <motion.div key="champ" initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { duration: 0.5 } }} exit={{ opacity: 0 }}>
            <Champion />
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>{recap ? <Recap key="recap" size={recap.size} qualified={recap.qualified} onClose={() => setRecap(null)} /> : null}</AnimatePresence>
    </div>
  );
}
