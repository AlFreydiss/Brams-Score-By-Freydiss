// Polices de l'arène (Barlow Condensed pour les titres façon plateau sportif,
// Anton pour les titres du duel, Inter pour le texte), chargées une fois depuis Google Fonts.
export function loadArenaFonts() {
  if (document.getElementById("ar-fonts-cast")) return;
  for (const href of ["https://fonts.googleapis.com", "https://fonts.gstatic.com"]) {
    if (document.querySelector(`link[rel="preconnect"][href="${href}"]`)) continue;
    const l = document.createElement("link");
    l.rel = "preconnect";
    l.href = href;
    if (href.includes("gstatic")) l.crossOrigin = "anonymous";
    document.head.appendChild(l);
  }
  const link = document.createElement("link");
  link.id = "ar-fonts-cast";
  link.rel = "stylesheet";
  link.href = "https://fonts.googleapis.com/css2?family=Anton&family=Barlow+Condensed:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap";
  document.head.appendChild(link);
}
