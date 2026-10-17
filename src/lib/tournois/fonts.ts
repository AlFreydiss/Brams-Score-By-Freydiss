import type { TournamentSlug } from "./catalog";

// Une voix typographique par tournoi, chargée depuis Google Fonts seulement à
// l'ouverture du tournoi concerné. Les noms de familles sont exposés en
// variables CSS dans themes/base.css (--t-serif-ost, --t-display-op…).
const FAMILIES: Record<TournamentSlug, string> = {
  ost: "family=Cormorant+Garamond:ital,wght@0,500;0,600;0,700;1,500;1,600&family=Inter:wght@400;500;600;700",
  openings: "family=Dela+Gothic+One&family=Zen+Kaku+Gothic+New:wght@500;700",
  endings: "family=Instrument+Serif:ital@0;1&family=Karla:wght@400;500;600;700",
  rap: "family=Anton&family=Permanent+Marker&family=Inter:wght@400;500;600;700;800",
  rapvsost: "family=Big+Shoulders:wght@400;700;900&family=Inter:wght@400;500;600;700;800",
  bankai: "family=Shippori+Mincho+B1:wght@600;800&family=Zen+Kaku+Gothic+New:wght@500;700",
  panels: "family=Mochiy+Pop+One&family=Zen+Kaku+Gothic+New:wght@500;700",
};

// Familles d'affichage à attendre avant de montrer la page (évite le saut de
// police sur les grands titres).
const DISPLAY: Record<TournamentSlug, string[]> = {
  ost: ['600 1em "Cormorant Garamond"', '500 1em "Inter"'],
  openings: ['1em "Dela Gothic One"', '700 1em "Zen Kaku Gothic New"'],
  endings: ['italic 1em "Instrument Serif"', '1em "Karla"'],
  rap: ['1em "Anton"', '1em "Permanent Marker"'],
  rapvsost: ['900 1em "Big Shoulders"', '1em "Inter"'],
  bankai: ['800 1em "Shippori Mincho B1"', '1em "Zen Kaku Gothic New"'],
  panels: ['1em "Mochiy Pop One"', '1em "Zen Kaku Gothic New"'],
};

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
  const id = `t-fonts-${slug}`;
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
