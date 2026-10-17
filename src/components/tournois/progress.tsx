import { useEffect, useRef } from "react";
import type { Player } from "./use-player";

export const fmt = (s: number) => (Number.isFinite(s) && s >= 0 ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}` : "–:––");

// Barre de lecture liée à la vraie position de la piste active. Elle se met à
// jour dans sa propre boucle (pas de rendu React à chaque image) et seulement
// tant que la piste joue. On peut la déplacer à la souris, au doigt ou au clavier.
export function SeekBar({ player, active, label, className = "" }: { player: Player; active: boolean; label: string; className?: string }) {
  const range = useRef<HTMLInputElement>(null);
  const now = useRef<HTMLSpanElement>(null);
  const total = useRef<HTMLSpanElement>(null);
  const dragging = useRef(false);
  const { getTime, seek, playing } = player;

  useEffect(() => {
    const paint = () => {
      const t = active ? getTime() : null;
      if (range.current && !dragging.current) {
        const v = t && t.total ? Math.min(1000, Math.round((t.now / t.total) * 1000)) : 0;
        range.current.value = String(v);
        range.current.style.setProperty("--p", `${v / 10}%`);
        range.current.setAttribute("aria-valuetext", t ? `${fmt(t.now)} sur ${fmt(t.total)}` : "Piste non chargée");
      }
      if (now.current) now.current.textContent = t ? fmt(t.now) : "0:00";
      if (total.current) total.current.textContent = t && t.total ? fmt(t.total) : "–:––";
    };
    paint();
    if (!active || !playing) return;
    let raf = 0;
    const loop = () => {
      paint();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [active, playing, getTime]);

  const commit = () => {
    dragging.current = false;
    const t = getTime();
    if (!t?.total || !range.current) return;
    seek((Number(range.current.value) / 1000) * t.total);
  };

  return (
    <div className={`t-seek ${active ? "is-active" : ""} ${className}`}>
      <span ref={now} className="t-time">
        0:00
      </span>
      <input
        ref={range}
        type="range"
        min={0}
        max={1000}
        step={1}
        defaultValue={0}
        disabled={!active}
        aria-label={label}
        onPointerDown={() => (dragging.current = true)}
        onInput={(e) => e.currentTarget.style.setProperty("--p", `${Number(e.currentTarget.value) / 10}%`)}
        onChange={commit}
        onPointerUp={commit}
        onKeyUp={commit}
      />
      <span ref={total} className="t-time">
        –:––
      </span>
    </div>
  );
}
