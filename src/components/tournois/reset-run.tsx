import { useEffect, useRef, useState } from "react";
import { RotateCcw } from "lucide-react";
import { actions } from "@/lib/tournois/store";
import "./reset-run.css";

// Recommencer le tournoi : efface la partie en cours (pas l'historique ni les
// favoris) et ramène à l'écran de départ. Deux temps, sans fenêtre : un clic
// arme le bouton, un second confirme ; il se désarme seul au bout de 4 s.
export function ResetRun({ slug, className = "" }: { slug: string; className?: string }) {
  const [armed, setArmed] = useState(false);
  const timer = useRef(0);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const arm = () => {
    setArmed(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setArmed(false), 4000);
  };
  if (!armed)
    return (
      <button type="button" className={`t-reset ${className}`} onClick={arm}>
        <RotateCcw size={13} aria-hidden /> Recommencer
      </button>
    );
  return (
    <span className={`t-reset is-armed ${className}`} role="group" aria-label="Recommencer le tournoi">
      <span>Effacer cette partie ?</span>
      <button type="button" className="t-reset-yes" autoFocus onClick={() => actions.quit(slug)}>
        Oui, recommencer
      </button>
      <button type="button" className="t-reset-no" onClick={() => setArmed(false)}>
        Non
      </button>
    </span>
  );
}
