import { SwipeTrack } from "./duel-page";
import { useCallback, useState } from "react";
import { Shuffle } from "lucide-react";
import { shuffle } from "@/lib/tournois/bracket";
import type { Participant } from "@/lib/tournois/types";
import { DuelScreen } from "./duel-screen";
import { useTournament } from "./provider";
import { artOf } from "./art";
import { PageHead } from "./page-head";

// Duel test : deux participants au hasard, l'interface complète, mais rien
// n'est enregistré (ni partie, ni historique, ni classement). Avant de lancer,
// on voit déjà le duel tiré, et on peut en tirer un autre.
export function Practice() {
  const { meta, participants } = useTournament();
  const [draft, setDraft] = useState<Participant[]>(() => shuffle(participants).slice(0, 2));
  const [pair, setPair] = useState<Participant[] | null>(null);
  const [n, setN] = useState(0);
  const next = useCallback(() => {
    setPair(shuffle(participants).slice(0, 2));
    setN((v) => v + 1);
  }, [participants]);

  if (!pair) {
    const [a, b] = draft;
    return (
      <div className="t-page t-page--wide pg-practice">
        <div className="pg-practice-copy">
          <PageHead title="Duel test" sub="Essaie l’écran de duel sans toucher à ta partie : rien n’est compté, ni dans l’historique ni dans le classement." />
          <div className="pg-practice-ctas">
            <button
              type="button"
              className="t-go"
              onClick={() => {
                setPair(draft);
                setN((v) => v + 1);
              }}
            >
              Lancer ce duel
            </button>
            <button type="button" className="pg-reroll" onClick={() => setDraft(shuffle(participants).slice(0, 2))}>
              <Shuffle size={15} aria-hidden /> Autre tirage
            </button>
          </div>
        </div>
        {a && b ? (
          <div className="pg-versus" key={`${a.id}-${b.id}`} aria-label={`${a.title} contre ${b.title}`}>
            {[a, b].map((p, k) => (
              <figure key={p.id} className={`pg-versus-side pg-versus-side--${k ? "r" : "l"}`}>
                <img src={artOf(p, meta.slug)} alt="" decoding="async" />
                <figcaption>
                  <small>{p.group}</small>
                  <b>{p.title}</b>
                </figcaption>
              </figure>
            ))}
            <span className="pg-versus-seal" aria-hidden>
              VS
            </span>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="t-duel-page">
      <SwipeTrack id={String(n)} dir={1}>
        {(swiped) => <DuelScreen swiped={swiped} left={pair[0]} right={pair[1]} round={null} practice onChoose={() => true} onDone={next} />}
      </SwipeTrack>
    </div>
  );
}
