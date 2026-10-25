import { motion, useTransform } from "framer-motion";
import { currentMatch, roundName } from "@/lib/tournois/bracket";
import { useTournament } from "../tournois/provider";
import { useSpace } from "./space";
import { T } from "./tokens";

// La navigation basse. À gauche, un filet dont le segment doré glisse avec le
// geste d'un plan à l'autre, puis les noms des plans en micro-capitales : celui
// où l'on est s'allume, les autres restent dans l'ombre. À droite, les tours de
// la partie, numérotés ; le tour en cours porte le trait doré.

export function Wordline({ labels, current }: { labels: string[]; current: number }) {
  const { progress, goTo } = useSpace();
  // Le segment fait un tiers du filet ; il avance d'une fois sa largeur par plan.
  const seg = useTransform(progress, (p) => `${Math.max(0, Math.min(labels.length - 1, p)) * 100}%`);
  return (
    <div className="ox-nav">
      <nav className="ox-nav-planes" aria-label="Plans du tournoi">
        <span className="ox-nav-rail" aria-hidden>
          <motion.i style={{ x: seg, width: `${100 / labels.length}%` }} />
        </span>
        {labels.map((l, i) => (
          <Label key={l} i={i} label={l} current={current === i} onGo={() => goTo(i)} />
        ))}
      </nav>
      <Rounds />
    </div>
  );
}

function Label({ i, label, current, onGo }: { i: number; label: string; current: boolean; onGo: () => void }) {
  const { progress } = useSpace();
  const d = useTransform(progress, (p) => Math.min(1, Math.abs(p - i)));
  const color = useTransform(d, [0, 1], [T.color.ink, T.color.faint]);
  return (
    <motion.button type="button" className="ox-nav-label" style={{ color }} onClick={onGo} aria-current={current ? "page" : undefined} whileTap={{ scale: 0.96 }}>
      {label}
    </motion.button>
  );
}

/** Les tours de la partie en cours, du premier à la finale. */
function Rounds() {
  const { saved } = useTournament();
  const run = saved.run;
  if (!run) return null;
  const cur = currentMatch(run.rounds);
  const rounds = run.rounds.filter((r) => r.matches.some((m) => m.left || m.right) || r.size <= run.size);
  return (
    <ol className="ox-nav-rounds" aria-label="Tours de la partie">
      {rounds.map((r, k) => {
        const on = cur?.round.size === r.size;
        const done = r.matches.every((m) => m.status === "closed");
        return (
          <li key={r.id} className={on ? "is-on" : done ? "is-done" : ""} title={roundName(r.size)} aria-current={on ? "step" : undefined}>
            <i aria-hidden />
            <span>{String(k + 1).padStart(2, "0")}</span>
          </li>
        );
      })}
    </ol>
  );
}
