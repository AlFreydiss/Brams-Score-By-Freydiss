// Polices de l'arène (Anton pour les titres, Shippori Mincho pour le japonais,
// Inter pour le texte), chargées une fois depuis Google Fonts.
export function loadArenaFonts() {
  if (document.getElementById("ar-fonts")) return;
  for (const href of ["https://fonts.googleapis.com", "https://fonts.gstatic.com"]) {
    if (document.querySelector(`link[rel="preconnect"][href="${href}"]`)) continue;
    const l = document.createElement("link");
    l.rel = "preconnect";
    l.href = href;
    if (href.includes("gstatic")) l.crossOrigin = "anonymous";
    document.head.appendChild(l);
  }
  const link = document.createElement("link");
  link.id = "ar-fonts";
  link.rel = "stylesheet";
  link.href = "https://fonts.googleapis.com/css2?family=Anton&family=Shippori+Mincho:wght@500;700&family=Inter:wght@400;500;600;700&display=swap";
  document.head.appendChild(link);
}
