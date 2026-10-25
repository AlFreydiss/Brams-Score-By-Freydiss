import { AnimatePresence, motion, useReducedMotion, type Variants } from "framer-motion";
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

// Passage d'un duel au suivant : un glissement continu. Le duel tranché sort
// par la droite pendant que le suivant entre par la gauche ; « Annuler » fait
// le chemin inverse. Accélère puis freine, 460 ms.
const SLIDE = { duration: 0.46, ease: [0.65, 0, 0.35, 1] } as const;
const SWIPE: Variants = {
  enter: (dir: number) => ({ x: dir > 0 ? "-100%" : "100%", opacity: 1, scale: 1 }),
  center: { x: 0, opacity: 1, scale: 1, transition: SLIDE },
  exit: (dir: number) => ({ x: dir > 0 ? "100%" : "-100%", opacity: 0.4, scale: 0.97, transition: SLIDE }),
};
const FADE_ONLY: Variants = {
  enter: { opacity: 0 },
  center: { opacity: 1, transition: { duration: 0.25 } },
  exit: { opacity: 0, transition: { duration: 0.2 } },
};

/** La piste des duels : le premier fait son entrée, les suivants arrivent en glissant. */
export function SwipeTrack({ id, dir, children }: { id: string; dir: number; children: (swiped: boolean) => React.ReactNode }) {
  const reduce = useReducedMotion();
  // Dès le premier glissement, plus aucun duel ne refait l'entrée (même en
  // revenant au premier avec « Annuler »).
  const first = useRef(id);
  const moved = useRef(false);
  if (id !== first.current) moved.current = true;
  return (
    <div className="t-swipe-zone">
      <AnimatePresence mode="popLayout" initial={false} custom={dir}>
        <motion.div key={id} className="t-swipe" custom={dir} variants={reduce ? FADE_ONLY : SWIPE} initial="enter" animate="center" exit="exit">
          {children(moved.current)}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export function DuelPage() {
  const { meta, saved } = useTournament();
  const run = saved.run;
  // Pendant l'animation du choix, on garde le duel affiché alors que le
  // tableau a déjà avancé : le vote est enregistré tout de suite.
  const [held, setHeld] = useState<{ match: Match; roundSize: number } | null>(null);
  const [recap, setRecap] = useState<{ size: number; qualified: Participant[] } | null>(null);
  // Sens du prochain glissement : 1 = duel suivant, -1 = retour (Annuler).
  const dir = useRef(1);

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

  // Les photos des deux duels suivants se chargent pendant qu'on écoute
  // celui-ci : la coupe suivante s'ouvre sur des images déjà prêtes.
  useEffect(() => {
    if (!run || !cur) return;
    const next = run.rounds
      .flatMap((r) => r.matches)
      .filter((m) => m.id !== cur.match.id && m.status !== "closed" && m.left && m.right)
      .slice(0, 2);
    for (const m of next)
      for (const p of [m.left, m.right]) {
        if (p?.visual.k !== "img") continue;
        const img = new Image();
        img.decoding = "async";
        img.src = p.visual.src;
      }
  }, [run, cur]);

  const showMatch = run ? (held?.match ?? cur?.match ?? null) : null;
  const showSize = held?.roundSize ?? cur?.round.size ?? 0;

  return (
    <div className="t-duel-page">
      {/* Départ, duels et champion se succèdent dans une seule transition. */}
      <AnimatePresence mode="wait">
        {!run ? (
          <motion.div key="setup" initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { duration: 0.4 } }} exit={{ opacity: 0, transition: { duration: 0.3 } }}>
            <Setup />
          </motion.div>
        ) : showMatch && showMatch.left && showMatch.right && !recap ? (
          <motion.div key="duels" initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { duration: 0.3 } }} exit={{ opacity: 0, transition: { duration: 0.3 } }}>
            <SwipeTrack id={showMatch.id} dir={dir.current}>
              {(swiped) => (
                <DuelScreen
                  swiped={swiped}
                  left={showMatch.left}
                  right={showMatch.right}
                  round={info}
                  isFinal={showSize === 2}
                  blind={!!run?.blind}
                  canUndo={!!saved.undo && !held}
                  onUndo={() => {
                    dir.current = -1;
                    actions.undo(meta.slug);
                  }}
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
                    dir.current = 1;
                    setHeld(null);
                    // Fin d'un tour (hors finale) : récap des qualifiés.
                    const r = runRef.current?.rounds.find((x) => x.size === size);
                    if (r && size > 2 && r.matches.every((m) => m.status === "closed")) {
                      setRecap({ size, qualified: r.matches.map(winnerOf).filter((p): p is Participant => !!p) });
                    }
                  }}
                />
              )}
            </SwipeTrack>
          </motion.div>
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
