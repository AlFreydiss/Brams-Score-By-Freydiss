// src/styles/typography.js
// Système typo Brams — Bricolage Grotesque (titres) + Inter (texte/UI)
// Usage : import { type, fonts } from "./styles/typography";
//         <h1 style={type.hero}>...</h1>
// Les couleurs ne sont PAS ici : on garde les tokens couleur existants
// et on les passe en override -> <span style={{ ...type.eyebrow, color: gold }}>

export const fonts = {
  display: "'Bricolage Grotesque', system-ui, -apple-system, sans-serif",
  body: "'Inter', system-ui, -apple-system, sans-serif",
};

export const type = {
  // ——————————————————————————— DISPLAY (Bricolage)
  // optical-sizing auto = la graisse optique s'adapte à la taille, rien à régler
  hero: {
    fontFamily: fonts.display,
    fontWeight: 800,
    fontSize: "clamp(2.6rem, 5.2vw, 3.6rem)",
    lineHeight: 1.03,
    letterSpacing: "-0.025em",
    fontOpticalSizing: "auto",
  },
  h1: {
    fontFamily: fonts.display,
    fontWeight: 700,
    fontSize: "clamp(1.7rem, 3.2vw, 2.25rem)",
    lineHeight: 1.1,
    letterSpacing: "-0.02em",
    fontOpticalSizing: "auto",
  },
  h2: {
    fontFamily: fonts.display,
    fontWeight: 700,
    fontSize: "1.4rem",
    lineHeight: 1.15,
    letterSpacing: "-0.015em",
  },
  h3: {
    fontFamily: fonts.display,
    fontWeight: 700,
    fontSize: "1.1rem",
    lineHeight: 1.2,
    letterSpacing: "-0.01em",
  },

  // ——————————————————————————— TEXTE / UI (Inter)
  lead: {
    fontFamily: fonts.body,
    fontWeight: 400,
    fontSize: "1.0625rem",
    lineHeight: 1.6,
  },
  body: {
    fontFamily: fonts.body,
    fontWeight: 400,
    fontSize: "1rem",
    lineHeight: 1.6,
  },
  small: {
    fontFamily: fonts.body,
    fontWeight: 400,
    fontSize: "0.875rem",
    lineHeight: 1.5,
  },

  // Eyebrow (labels en capitales : "ATELIER DE CLASSEMENT", "POINT DE DÉPART"…)
  eyebrow: {
    fontFamily: fonts.body,
    fontWeight: 600,
    fontSize: "0.72rem",
    lineHeight: 1,
    letterSpacing: "0.18em",
    textTransform: "uppercase",
  },

  // Gros chiffres de stats (30 / 20 / 65) — en display pour l'impact
  stat: {
    fontFamily: fonts.display,
    fontWeight: 800,
    fontSize: "clamp(1.9rem, 3.5vw, 2.4rem)",
    lineHeight: 1,
    letterSpacing: "-0.01em",
    fontVariantNumeric: "tabular-nums",
  },
  // Label sous le chiffre ("ANIMES PRÊTS")
  statLabel: {
    fontFamily: fonts.body,
    fontWeight: 500,
    fontSize: "0.7rem",
    lineHeight: 1.2,
    letterSpacing: "0.14em",
    textTransform: "uppercase",
  },

  button: {
    fontFamily: fonts.body,
    fontWeight: 600,
    fontSize: "0.95rem",
    letterSpacing: "0.01em",
  },
  nav: {
    fontFamily: fonts.body,
    fontWeight: 500,
    fontSize: "0.9rem",
    letterSpacing: "0",
  },
};
