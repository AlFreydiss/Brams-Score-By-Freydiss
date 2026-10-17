import { useEffect, useState } from "react";
import { seamPoints, shape } from "@/lib/tournois/geometry";
import type { Participant } from "@/lib/tournois/types";
import { useTournament } from "./provider";
import { Visual } from "./visual";

export function useNarrow() {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 760px)");
    const on = () => setNarrow(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return narrow;
}

// « polygon(0% 0%, 54% 0%, …) » → tracé SVG dans un repère 0–100.
const polyD = (poly: string) =>
  poly
    .slice(8, -1)
    .split(",")
    .map((pair, i) => {
      const [x, y] = pair.trim().split(" ").map((v) => parseFloat(v));
      return `${i ? "L" : "M"}${x} ${y}`;
    })
    .join(" ") + " Z";

// Deux participants coupés comme dans les duels du tournoi : l'affiche de
// l'accueil et le fond de l'écran de départ.
export function PosterScene({ pair }: { pair: Participant[] }) {
  const { meta } = useTournament();
  const narrow = useNarrow();
  const geo = shape(meta.seam, 50, narrow, meta.seam === "screens" ? 0.35 : meta.seam === "gutter" ? 0.5 : 0);
  const seamD = seamPoints(meta.seam, 50, narrow)
    .map(([x, y], i) => `${i ? "L" : "M"}${narrow ? y : x} ${narrow ? x : y}`)
    .join(" ");
  return (
    <div className={`t-hero-scene ${narrow ? "is-v" : "is-h"}`} aria-hidden>
      {pair.map((p, i) => (
        <div key={p.id} className={`t-hero-half t-hero-half--${i ? "right" : "left"}`} style={meta.seam === "feather" ? undefined : { clipPath: i ? geo.right : geo.left }}>
          <div className="t-hero-media" style={{ [narrow ? "height" : "width"]: `${Math.min(100, (i ? geo.rightBox : geo.leftBox) + 8)}%` }}>
            <Visual p={p} posterAt={meta.posterAt} />
          </div>
        </div>
      ))}
      {meta.seam === "gutter" ? (
        <svg className="t-hero-frames" viewBox="0 0 100 100" preserveAspectRatio="none">
          <path d={polyD(geo.left)} vectorEffect="non-scaling-stroke" />
          <path d={polyD(geo.right)} vectorEffect="non-scaling-stroke" />
        </svg>
      ) : meta.seam !== "screens" && meta.seam !== "feather" ? (
        <svg className="t-hero-seam" viewBox="0 0 100 100" preserveAspectRatio="none">
          <path d={seamD} vectorEffect="non-scaling-stroke" />
        </svg>
      ) : null}
    </div>
  );
}
