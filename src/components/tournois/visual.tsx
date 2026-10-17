import { useState } from "react";
import type { Participant } from "@/lib/tournois/types";
import type { Player } from "./use-player";

// Fond d'une moitié : photo, image, ou la vidéo R2 elle-même (arrêtée sur une
// image tant qu'on ne l'écoute pas). Une source qui ne charge pas laisse place
// à la vignette, puis à un aplat avec l'initiale : jamais de cadre vide.
export function Visual({ p, player, posterAt = 20, alt = "" }: { p: Participant; player?: Player; posterAt?: number; alt?: string }) {
  const [src, setSrc] = useState(p.visual.k === "img" ? p.visual.src : null);
  const [broken, setBroken] = useState(false);
  const videoFailed = p.visual.k === "video" && player?.failed.has(p.id);

  if (broken) {
    return (
      <span className="t-visual t-visual--empty" aria-hidden>
        {p.title.slice(0, 1)}
      </span>
    );
  }

  if (p.visual.k === "video" && !videoFailed) {
    return (
      <video
        className="t-visual"
        ref={(el) => player?.register(p, el)}
        src={`${p.visual.src}#t=${posterAt}`}
        muted
        playsInline
        preload="metadata"
        aria-label={alt || undefined}
      />
    );
  }

  const imgSrc = p.visual.k === "img" ? src : p.thumb;
  const pos = p.visual.k === "img" ? p.visual.pos : undefined;
  return (
    <img
      className="t-visual"
      src={imgSrc ?? p.thumb}
      alt={alt}
      draggable={false}
      style={pos ? { objectPosition: pos } : undefined}
      onError={() => {
        const fb = p.visual.k === "img" ? p.visual.fallback : undefined;
        if (fb && src !== fb) setSrc(fb);
        else if (src !== p.thumb && p.thumb) setSrc(p.thumb);
        else setBroken(true);
      }}
    />
  );
}

/** Vignette des listes et grilles (récap, classement, tableau…). */
export function Thumb({ p, className = "" }: { p: Participant; className?: string }) {
  const [broken, setBroken] = useState(false);
  if (broken) return <span className={`t-thumb t-thumb--empty ${className}`}>{p.title.slice(0, 1)}</span>;
  return (
    <img className={`t-thumb ${className}`} src={p.thumb} alt="" loading="lazy" decoding="async" onError={() => setBroken(true)} />
  );
}
