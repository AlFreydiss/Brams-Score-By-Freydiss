import type { Participant } from "@/lib/tournois/types";
import { IDENTITIES, isFight } from "../fight/identities";
import { bgOf } from "../fight/jeux-art";

// Grande image d'un participant : art Steam pour les jeux, photo TMDB w1280
// (au lieu de la vignette w300) ailleurs.
export const artOf = (p: Participant, slug: string) =>
  slug === "jeux" ? (bgOf(p as Participant & { sub?: string })?.src ?? p.thumb) : p.visual.k === "img" ? p.visual.src : p.thumb.replace("/t/p/w300/", "/t/p/w1280/");

/** Couleur du tournoi (identities.ts) ou ivoire pour les autres. */
export const accentOf = (slug: string) => (isFight(slug) ? IDENTITIES[slug].a : "#f4f2ec");
/** Nom de l'univers (« L'Antenne »…) ou null. */
export const universeOf = (slug: string) => (isFight(slug) ? IDENTITIES[slug].name : null);
