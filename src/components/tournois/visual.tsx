import { useCallback, useState } from "react";
import type { Participant } from "@/lib/tournois/types";
import type { Player } from "./use-player";

// Fond d'une moitié : photo, image, ou la vidéo R2 elle-même (arrêtée sur une
// image tant qu'on ne l'écoute pas). L'image n'apparaît qu'une fois chargée,
// en fondu : jamais de photo à moitié peinte. Une source qui ne répond pas
// laisse place à la vignette, puis à un aplat avec l'initiale.
export function Visual({
  p,
  player,
  posterAt = 20,
  alt = "",
  sizes = "(max-width: 760px) 100vw, 56vw",
}: {
  p: Participant;
  player?: Player;
  posterAt?: number;
  alt?: string;
  /** Largeur affichée, pour choisir la bonne taille d'image (une moitié de duel par défaut). */
  sizes?: string;
}) {
  const [src, setSrc] = useState(p.visual.k === "img" ? p.visual.src : null);
  const [broken, setBroken] = useState(false);
  const [ready, setReady] = useState(false);
  const videoFailed = p.visual.k === "video" && player?.failed.has(p.id);
  // Ref stable : une ref inline serait nettoyée puis rappelée à chaque rendu
  // (React 19), ce qui débranchait le son de la vidéo en pleine écoute et
  // empilait ses écouteurs.
  const register = player?.register;
  const release = player?.release;
  const videoRef = useCallback(
    (el: HTMLVideoElement | null) => {
      if (!el || !register || !release) return;
      register(p, el);
      return () => release(p, el);
    },
    // Le participant compte par son id : un nouvel objet pour la même piste ne rebranche rien.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [p.id, register, release],
  );

  if (broken) {
    return (
      <span className="t-visual t-visual--empty is-ready" aria-hidden>
        {p.title.slice(0, 1)}
      </span>
    );
  }

  if (p.visual.k === "video" && !videoFailed) {
    return (
      <video
        className={`t-visual ${ready ? "is-ready" : ""}`}
        ref={videoRef}
        crossOrigin="anonymous"
        src={`${p.visual.src}#t=${posterAt}`}
        muted
        playsInline
        preload="metadata"
        aria-label={alt || undefined}
        onLoadedData={() => setReady(true)}
      />
    );
  }

  const isImg = p.visual.k === "img";
  const imgSrc = isImg ? src : p.thumb;
  const pos = isImg ? (p.visual as { pos?: string }).pos : undefined;
  // Les originaux TMDB vont jusqu'à la 4K (plusieurs Mo à décoder) : on s'en tient au w1280.
  const hiSrc = isImg && src === p.visual.src ? (p.visual as { hi?: string }).hi : undefined;
  const hi = hiSrc && !hiSrc.includes("/t/p/original/") ? hiSrc : undefined;
  return (
    <img
      className={`t-visual ${ready ? "is-ready" : ""}`}
      src={imgSrc ?? p.thumb}
      srcSet={hi ? `${imgSrc} 1600w, ${hi} 2400w` : undefined}
      sizes={hi ? sizes : undefined}
      alt={alt}
      draggable={false}
      decoding="async"
      style={pos ? { objectPosition: pos } : undefined}
      ref={(el) => {
        if (el?.complete && el.naturalWidth && !ready) setReady(true);
      }}
      onLoad={() => setReady(true)}
      onError={() => {
        const fb = isImg ? (p.visual as { fallback?: string }).fallback : undefined;
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
  return <img className={`t-thumb ${className}`} src={p.thumb} alt="" loading="lazy" decoding="async" onError={() => setBroken(true)} />;
}
