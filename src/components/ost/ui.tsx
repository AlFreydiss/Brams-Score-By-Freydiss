import { motion, type HTMLMotionProps } from "framer-motion";
import { useState } from "react";
import type { Participant } from "@/lib/tournois/types";
import { portraitIn169, useFocus } from "./focus";

// Briques communes de l'espace : le bouton (enfoncé à l'appui), la photo d'un
// participant (nette, bien cadrée, sans apparition brutale) et la casse des
// titres gravés.

export function Press({ className = "", ...rest }: HTMLMotionProps<"button">) {
  return <motion.button type="button" className={`ox-press ${className}`} whileTap={{ scale: 0.965 }} transition={{ type: "spring", stiffness: 700, damping: 32 }} {...rest} />;
}

// Petits mots laissés en minuscules au milieu d'un titre.
const SMALL = new Set(["of", "the", "a", "an", "and", "in", "on", "to", "for", "no", "wa", "ga", "wo", "ni", "de", "du", "des", "la", "le", "les", "et", "à", "vs", "x", "feat."]);

/**
 * Casse de titre pour Cinzel : la police grave les majuscules en grandes
 * capitales et les minuscules en petites capitales. Les titres du catalogue
 * mélangent les casses (« ONE PUNCH MAN », « YouSeeBIGGIRL ») ; remis en
 * casse de titre, ils gardent tous le même dessin. Les chiffres romains et
 * les lettres seules restent tels quels.
 */
export function engrave(title: string) {
  let first = true;
  return title.replace(/[\p{L}\p{N}'’.]+/gu, (w) => {
    const keep = /^[IVX]+$/.test(w) || w.length === 1;
    const lower = w.toLocaleLowerCase("fr");
    const out = keep ? w : !first && SMALL.has(lower) ? lower : lower.charAt(0).toLocaleUpperCase("fr") + lower.slice(1);
    first = false;
    return out;
  });
}

/** Grande image d'un participant (photo de son anime), sinon sa vignette. */
export const photoOf = (p: Participant) => (p.visual.k === "img" ? p.visual.src : p.thumb);
const hiOf = (p: Participant) => (p.visual.k === "img" ? (p.visual as { hi?: string }).hi : undefined);

/**
 * Photo d'un participant.
 * @param portrait rapport largeur/hauteur du cadre (0,6 pour une carte) : la
 *   photo, en 16:9, est alors recadrée sur son sujet (voir focus.ts).
 * @param sizes largeur d'affichage de l'image entière (le cadre coupe le reste),
 *   pour choisir entre la version 1280 px et l'originale.
 * Pendant le chargement, la vignette floue tient la place ; l'image nette
 * arrive en fondu par-dessus.
 */
export function Photo({ p, className = "", eager, small, portrait, sizes }: { p: Participant; className?: string; eager?: boolean; small?: boolean; portrait?: number; sizes?: string }) {
  const src = small ? p.thumb : photoOf(p);
  const hi = small ? undefined : hiOf(p);
  const pos = useFocus(portrait && !small ? src : undefined, portrait ? portraitIn169(portrait) : 1);
  const manual = p.visual.k === "img" ? p.visual.pos : undefined;
  const [ready, setReady] = useState(false);
  const place = manual ? { objectPosition: manual } : pos != null ? { objectPosition: `${pos}% 50%` } : undefined;
  const img = (
    <img
      className={`ox-photo ${className} ${small ? "" : ready ? "is-ready" : "is-loading"}`}
      src={src}
      srcSet={hi ? `${src} 1280w, ${hi} 2560w` : undefined}
      sizes={hi ? (sizes ?? "100vw") : undefined}
      crossOrigin="anonymous"
      alt=""
      draggable={false}
      decoding="async"
      loading={eager ? "eager" : "lazy"}
      style={place}
      ref={(el) => {
        // Déjà en cache : pas de fondu à rejouer.
        if (el?.complete && el.naturalWidth && !ready) setReady(true);
      }}
      onLoad={() => setReady(true)}
    />
  );
  if (small || src === p.thumb) return img;
  return (
    <>
      <img className="ox-photo ox-photo-blur" src={p.thumb} alt="" draggable={false} decoding="async" aria-hidden style={place} />
      {img}
    </>
  );
}
