// Tournoi d'OST : tous les choix de design en un seul endroit. Le CSS lit ces
// valeurs en variables (--ox-*), posées sur la racine par cssVars().

export const T = {
  color: {
    // Noir charbon, graphite, os ; un seul accent, le champagne doré, pour ce
    // qui est actif : le plan, l'étape, l'écoute, le choix.
    bg: "#080909",
    raise: "#111212",
    ink: "#e9e4da",
    mute: "rgba(233, 228, 218, 0.56)",
    faint: "rgba(233, 228, 218, 0.2)",
    line: "rgba(233, 228, 218, 0.1)",
    accent: "#b9a17b",
    accentSoft: "rgba(185, 161, 123, 0.32)",
    onAccent: "#080909",
  },
  font: {
    // Capitales gravées (affiche de cinéma) pour les titres ; une grotesque
    // géométrique, légère, pour le texte et les micro-capitales.
    display: '"Cinzel", "Trajan Pro", serif',
    text: '"Outfit", system-ui, sans-serif',
  },
  space: {
    gutter: "clamp(18px, 3.2vw, 56px)",
    // Hauteur réservée en bas de chaque plan pour la navigation.
    foot: "clamp(72px, 9vh, 104px)",
  },
  ease: {
    // Courbe signature : départ vif, arrivée longue.
    out: [0.22, 1, 0.36, 1] as [number, number, number, number],
    in: [0.64, 0, 0.78, 0] as [number, number, number, number],
    inOut: [0.65, 0, 0.35, 1] as [number, number, number, number],
  },
  dur: { fast: 0.2, base: 0.45, slide: 0.72, slow: 0.95 },
  spring: {
    // Calage d'un plan après le geste : vif, sans rebond visible.
    settle: { type: "spring", stiffness: 300, damping: 38, mass: 1 } as const,
    soft: { type: "spring", stiffness: 170, damping: 26, mass: 1 } as const,
  },
} as const;

/** Variables CSS posées sur la racine de l'espace. */
export function cssVars(): React.CSSProperties {
  const c = T.color;
  return {
    "--ox-bg": c.bg,
    "--ox-raise": c.raise,
    "--ox-ink": c.ink,
    "--ox-mute": c.mute,
    "--ox-faint": c.faint,
    "--ox-line": c.line,
    "--ox-accent": c.accent,
    "--ox-accent-soft": c.accentSoft,
    "--ox-on-accent": c.onAccent,
    "--ox-display": T.font.display,
    "--ox-text": T.font.text,
    "--ox-gutter": T.space.gutter,
    "--ox-foot": T.space.foot,
    "--ox-ease": `cubic-bezier(${T.ease.out.join(",")})`,
    "--ox-fast": `${T.dur.fast}s`,
  } as React.CSSProperties;
}
