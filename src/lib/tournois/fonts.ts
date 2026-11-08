import type { TournamentSlug } from "./catalog";

// Une voix typographique par tournoi, chargée depuis Google Fonts seulement à
// l'ouverture du tournoi concerné. Les noms de familles sont exposés en
// variables CSS dans themes/base.css (--t-serif-ost, --t-display-op…).
// DA « Noir » : une seule voix pour tous les tournois, Geist et Geist Mono.
const PH = "family=Geist:wght@300..600&family=Geist+Mono:wght@400;500";
const FAMILIES: Record<TournamentSlug, string> = { ost: PH, openings: PH, endings: PH, rap: PH, rapvsost: PH, bankai: PH, panels: PH };

// Familles d'affichage à attendre avant de montrer la page (évite le saut de
// police sur les grands titres).
const PH_FACES = ['300 1em "Geist"', '500 1em "Geist"', '400 1em "Geist Mono"'];
const DISPLAY: Record<TournamentSlug, string[]> = { ost: PH_FACES, openings: PH_FACES, endings: PH_FACES, rap: PH_FACES, rapvsost: PH_FACES, bankai: PH_FACES, panels: PH_FACES };

function preconnect() {
  for (const href of ["https://fonts.googleapis.com", "https://fonts.gstatic.com"]) {
    if (document.querySelector(`link[rel="preconnect"][href="${href}"]`)) continue;
    const l = document.createElement("link");
    l.rel = "preconnect";
    l.href = href;
    if (href.includes("gstatic")) l.crossOrigin = "anonymous";
    document.head.appendChild(l);
  }
}

export function loadFonts(slug: TournamentSlug): HTMLLinkElement {
  // Même feuille pour tous les tournois : un seul chargement.
  const id = "t-fonts-noir";
  void slug;
  const found = document.getElementById(id) as HTMLLinkElement | null;
  if (found) return found;
  preconnect();
  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?${FAMILIES[slug]}&display=swap`;
  document.head.appendChild(link);
  return link;
}

const ready = new Map<TournamentSlug, Promise<void>>();

/** Résolue quand les polices d'affichage du tournoi sont prêtes (1,6 s au plus). */
export function fontsReady(slug: TournamentSlug): Promise<void> {
  let p = ready.get(slug);
  if (p) return p;
  const link = loadFonts(slug);
  const sheet = new Promise<void>((res) => {
    if (link.sheet) res();
    else {
      link.addEventListener("load", () => res(), { once: true });
      link.addEventListener("error", () => res(), { once: true });
    }
  });
  const faces = sheet.then(() => Promise.all(DISPLAY[slug].map((f) => document.fonts?.load(f).catch(() => [])))).then(() => undefined);
  p = Promise.race([faces, new Promise<void>((res) => setTimeout(res, 1600))]);
  ready.set(slug, p);
  return p;
}
