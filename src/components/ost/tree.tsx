import { useEffect, useRef, useState } from "react";
import { roundName, winnerOf } from "@/lib/tournois/bracket";
import type { Match, Participant, Round } from "@/lib/tournois/types";

// Arbre d'élimination. Zoom et déplacement réels. Un clic sur un nom
// éclaire le parcours de cette OST. Les cases vides restent « À venir ».

const COL = 220;
const ROW = 56;

export function Tree({
  rounds,
  currentId,
  blind,
  onOpenCurrent,
}: {
  rounds: Round[];
  currentId: string | null;
  blind: boolean;
  onOpenCurrent: () => void;
}) {
  const view = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 24, y: 24 });
  const [focus, setFocus] = useState<string | null>(null);
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(null);

  const shown = rounds.filter((r) => r.matches.some((m) => m.left || m.right));
  const first = shown[0]?.matches.length ?? 1;
  const width = shown.length * COL + 40;
  const height = first * ROW + 24;

  useEffect(() => {
    const el = view.current;
    if (!el || !shown.length) return;
    const fit = Math.min(1, (el.clientWidth - 48) / width, (el.clientHeight - 48) / Math.max(height, 1));
    setZoom(Math.max(0.25, fit));
    setPan({ x: 24, y: 24 });
    // Au montage du tableau seulement.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shown.length, first]);

  useEffect(() => {
    const el = view.current;
    if (!el) return;
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setZoom((z) => Math.min(1.6, Math.max(0.2, z * (e.deltaY > 0 ? 0.92 : 1.08))));
    };
    el.addEventListener("wheel", wheel, { passive: false });
    return () => el.removeEventListener("wheel", wheel);
  }, []);

  const yOf = (round: number, index: number) => {
    const stride = ROW * 2 ** round;
    return index * stride + (stride - ROW) / 2 + 8;
  };

  const onPath = (m: Match) => !!focus && (m.left?.id === focus || m.right?.id === focus || m.winnerId === focus);

  const links: { d: string; on: boolean; key: string }[] = [];
  shown.forEach((round, ri) => {
    if (ri === shown.length - 1) return;
    round.matches.forEach((m, mi) => {
      const next = shown[ri + 1]?.matches[Math.floor(mi / 2)];
      if (!next) return;
      const x1 = ri * COL + 168;
      const y1 = yOf(ri, mi) + 22;
      const x2 = (ri + 1) * COL;
      const y2 = yOf(ri + 1, Math.floor(mi / 2)) + 22;
      const mid = x1 + (x2 - x1) / 2;
      const on = onPath(m) || (!!focus && (next.left?.id === focus || next.right?.id === focus || next.winnerId === focus));
      links.push({ key: m.id, on, d: `M ${x1} ${y1} H ${mid} V ${y2} H ${x2}` });
    });
  });

  const jump = (ri: number) => {
    setPan({ x: 24 - ri * COL * zoom, y: 24 });
  };

  return (
    <div className="ox-tree">
      <div className="ox-tree-nav">
        {shown.map((r, i) => (
          <button key={r.id} type="button" className="ox-link" onClick={() => jump(i)}>
            {roundName(r.size)}
          </button>
        ))}
        {focus ? (
          <button type="button" className="ox-link" onClick={() => setFocus(null)}>
            Tout le tableau
          </button>
        ) : null}
      </div>
      <div
        ref={view}
        className="ox-tree-view"
        data-noswipe
        onPointerDown={(e) => {
          if ((e.target as HTMLElement).closest("button")) return;
          drag.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y };
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          const d = drag.current;
          if (!d) return;
          setPan({ x: d.px + e.clientX - d.x, y: d.py + e.clientY - d.y });
        }}
        onPointerUp={() => {
          drag.current = null;
        }}
      >
        <div className="ox-tree-world" style={{ width, height, transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}>
          <svg className="ox-tree-svg" width={width} height={height} aria-hidden>
            {links.map((l) => (
              <path key={l.key} d={l.d} className={l.on ? "is-on" : focus ? "is-dim" : ""} />
            ))}
          </svg>
          {shown.map((round, ri) =>
            round.matches.map((m, mi) => {
              const masked = blind && m.status !== "closed";
              const win = winnerOf(m);
              const lit = !focus || onPath(m);
              const current = m.id === currentId;
              const body = (
                <>
                  <Side p={m.left} masked={masked} win={!!win && win.id === m.left?.id} out={!!win && m.left != null && win.id !== m.left.id} onFocus={setFocus} />
                  <Side p={m.right} masked={masked} win={!!win && win.id === m.right?.id} out={!!win && m.right != null && win.id !== m.right.id} onFocus={setFocus} />
                </>
              );
              const style = { left: ri * COL, top: yOf(ri, mi) };
              return (
                <div key={m.id} className={`ox-node ${current ? "is-current" : ""} ${lit ? "" : "is-dim"}`} style={style}>
                  {body}
                  {current ? (
                    <button type="button" className="ox-node-go" onClick={onOpenCurrent}>
                      Duel
                    </button>
                  ) : null}
                </div>
              );
            }),
          )}
        </div>
      </div>
    </div>
  );
}

function Side({
  p,
  masked,
  win,
  out,
  onFocus,
}: {
  p: Participant | null;
  masked: boolean;
  win: boolean;
  out: boolean;
  onFocus: (id: string) => void;
}) {
  if (!p || masked)
    return <span className="ox-node-side is-empty">{masked ? "Caché" : "À venir"}</span>;
  return (
    <button type="button" className={`ox-node-side ${win ? "is-win" : ""} ${out ? "is-out" : ""}`} onClick={() => onFocus(p.id)}>
      {p.title}
    </button>
  );
}
