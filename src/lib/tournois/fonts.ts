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

export function loadFonts(slug: TournamentSlug) {
  const id = `t-fonts-${slug}`;
  if (document.getElementById(id)) return;
  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?${FAMILIES[slug]}&display=swap`;
  document.head.appendChild(link);
}
