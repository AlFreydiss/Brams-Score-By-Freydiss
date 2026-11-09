// Transition du hub vers un tournoi : l'image de la carte cliquée s'ouvre
// jusqu'à remplir l'écran (rideau clip-path qui part de la carte), s'assombrit
// en prenant la couleur du tournoi, puis se retire en fondu une fois la page
// du tournoi affichée dessous. WAAPI : animations hors du fil principal.

const EASE_IO = "cubic-bezier(0.77, 0, 0.175, 1)";

export function portalTo(card: HTMLElement, src: string, accent: string, go: () => void) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return go();
  const r = card.getBoundingClientRect();
  const W = window.innerWidth;
  const H = window.innerHeight;
  const radius = parseFloat(getComputedStyle(card).borderRadius) || 14;

  const veil = document.createElement("div");
  veil.setAttribute("aria-hidden", "true");
  Object.assign(veil.style, { position: "fixed", inset: "0", zIndex: "10060", pointerEvents: "none", background: "#08090d", overflow: "hidden" });
  const img = document.createElement("img");
  img.src = src;
  img.alt = "";
  Object.assign(img.style, { position: "absolute", inset: "0", width: "100%", height: "100%", maxWidth: "none", objectFit: "cover", transformOrigin: `${r.left + r.width / 2}px ${r.top + r.height / 2}px` });
  const tint = document.createElement("div");
  Object.assign(tint.style, { position: "absolute", inset: "0", background: `radial-gradient(80% 80% at 50% 60%, ${accent}55, transparent 70%), linear-gradient(to top, #08090d, rgba(8,9,13,0.4))`, opacity: "0" });
  veil.append(img, tint);
  document.body.appendChild(veil);

  const from = `inset(${r.top}px ${W - r.right}px ${H - r.bottom}px ${r.left}px round ${radius}px)`;
  const open = veil.animate([{ clipPath: from }, { clipPath: "inset(0px 0px 0px 0px round 0px)" }], { duration: 720, easing: EASE_IO, fill: "forwards" });
  img.animate([{ transform: "scale(1)", filter: "brightness(1)" }, { transform: "scale(1.08)", filter: "brightness(0.55) saturate(1.2)" }], { duration: 900, easing: EASE_IO, fill: "forwards" });
  tint.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 600, delay: 300, easing: "ease-out", fill: "forwards" });

  open.finished.then(() => {
    // Le voile couvre tout : on remonte en haut sans que ça se voie, puis on change de page.
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
    go();
    // Deux images plus tard la page du tournoi est peinte dessous : on se retire.
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        const out = veil.animate([{ opacity: 1, filter: "blur(0px)" }, { opacity: 0, filter: "blur(12px)" }], { duration: 650, delay: 120, easing: "ease-out", fill: "forwards" });
        out.finished.then(() => veil.remove(), () => veil.remove());
      }),
    );
  }, () => {
    veil.remove();
    go();
  });
}
