import { AnimatePresence } from "framer-motion";
import { useCallback, useState } from "react";
import { shuffle } from "@/lib/tournois/bracket";
import type { Participant } from "@/lib/tournois/types";
import { DuelScreen } from "./duel-screen";
import { useTournament } from "./provider";

// Duel test : deux participants au hasard, l'interface complète, mais rien
// n'est enregistré (ni partie, ni historique, ni classement).
export function Practice() {
  const { participants } = useTournament();
  const [pair, setPair] = useState<Participant[] | null>(null);
  const [n, setN] = useState(0);
  const next = useCallback(() => {
    setPair(shuffle(participants).slice(0, 2));
    setN((v) => v + 1);
  }, [participants]);

  if (!pair) {
    return (
      <div className="t-page">
        <h1 className="t-page-title">Duel test</h1>
        <p className="t-lead">Essaie l’écran de duel sans toucher à ta partie : rien n’est compté, ni dans l’historique ni dans le classement.</p>
        <button type="button" className="t-go" onClick={next}>
          Lancer un duel test
        </button>
      </div>
    );
  }

  return (
    <div className="t-duel-page">
      <AnimatePresence mode="wait">
        <DuelScreen key={n} left={pair[0]} right={pair[1]} round={null} practice onChoose={() => true} onDone={next} />
      </AnimatePresence>
    </div>
  );
}
