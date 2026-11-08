import { useEffect } from "react";

// Trajan Pro 3, la police du logo de Clair Obscur, via un web project Adobe
// Fonts (licence de l'abonnement Adobe ; domaines brams.community + localhost).
// Vide = Cinzel, son équivalent libre.
const ADOBE_KIT = "hpu1sfw";

export function useAdobeKit(on = true) {
  useEffect(() => {
    if (!on || !ADOBE_KIT || document.getElementById("adobe-kit")) return;
    const l = document.createElement("link");
    l.id = "adobe-kit";
    l.rel = "stylesheet";
    l.href = `https://use.typekit.net/${ADOBE_KIT}.css`;
    document.head.appendChild(l);
  }, [on]);
}
