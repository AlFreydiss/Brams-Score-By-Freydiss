import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { Participant } from "@/lib/tournois/types";
import { jeuArt } from "../fight/jeux-art";

// Affiches vivantes du hub : les images d'un tournoi défilent en fondu, chacune
// avec son mouvement de caméra ; le nom (jeu, anime) passe en petites
// capitales. Lent quand on regarde la page, rapide au survol (« le tournoi
// défile sous la main »). Arrêté hors de l'écran.

export type ReelItem = { src: string; pos?: string; label: string };

const PICK = [
  "Clair Obscur: Expedition 33",
  "Elden Ring",
  "Hollow Knight",
  "Persona 5",
  "God of War Ragnarök",
  "Red Dead Redemption 2",
  "NieR:Automata",
  "Cyberpunk 2077",
  "Ghost of Tsushima",
  "The Witcher 3",
  "Final Fantasy VII",
  "Outer Wilds",
  "Baldur's Gate 3",
  "Death Stranding",
  "Marvel's Spider-Man",
  "Ori and the Will of the Wisps",
];
export const JEUX_REEL: ReelItem[] = PICK.flatMap((game) => {
  const a = jeuArt(game);
  return a ? [{ src: a.src, pos: a.pos, label: game }] : [];
});

/** Une image par anime (ou jeu), tirage du jour : l'affiche ne montre pas toujours les mêmes. */
export function reelFrom(list: Participant[], n = 14): ReelItem[] {
  const seen = new Set<string>();
  const items: ReelItem[] = [];
  for (const p of list) {
    const key = p.sub ?? p.group;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    const v = p.visual as { k: string; src?: string; hi?: string };
    const src = v.k === "img" && v.src ? (v.hi ?? v.src) : p.thumb?.replace("/t/p/w300/", "/t/p/w1280/");
    if (src) items.push({ src, label: key });
  }
  const day = Math.floor(Date.now() / 86400000);
  const start = items.length ? (day * 7) % items.length : 0;
  const rot = [...items.slice(start), ...items.slice(0, start)];
  // On prend des animes espacés dans la liste (pas 14 voisins alphabétiques).
  const step = Math.max(1, Math.floor(rot.length / n));
  return rot.filter((_, k) => k % step === 0).slice(0, n);
}

export function PosterReel({ items, hot, fallback, offset = 0 }: { items: ReelItem[]; hot: boolean; fallback: string; offset?: number }) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const [seen, setSeen] = useState(false);
  const [i, setI] = useState(0);
  const list = useMemo(() => (items.length ? items : [{ src: fallback, label: "" }]), [items, fallback]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setSeen(e.isIntersecting), { threshold: 0.3 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!seen || reduce || list.length < 2) return;
    // Décalage par carte : les affiches voisines ne changent pas toutes au même instant.
    const every = hot ? 1400 : 4200;
    let t: ReturnType<typeof setInterval> | undefined;
    const first = setTimeout(() => {
      setI((k) => (k + 1) % list.length);
      t = setInterval(() => setI((k) => (k + 1) % list.length), every);
    }, hot ? every : every + offset);
    return () => {
      clearTimeout(first);
      if (t) clearInterval(t);
    };
  }, [seen, hot, reduce, list.length, offset]);

  useEffect(() => {
    // Précharge l'image suivante : le fondu ne tombe jamais sur du vide.
    if (!seen || list.length < 2) return;
    const im = new Image();
    im.src = list[(i + 1) % list.length].src;
  }, [i, seen, list]);

  const cur = list[i % list.length];
  return (
    <span ref={ref} className="nf-reel" aria-hidden>
      <AnimatePresence initial={false}>
        <motion.img
          key={cur.src}
          className="nf-reel-img"
          data-kb={i % 4}
          src={cur.src}
          alt=""
          decoding="async"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { duration: hot ? 0.5 : 1.2, ease: "easeInOut" } }}
          exit={{ opacity: 0, transition: { duration: hot ? 0.5 : 1.2, ease: "easeInOut" } }}
          style={{ objectPosition: cur.pos }}
        />
      </AnimatePresence>
      {cur.label ? (
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={cur.label}
            className="nf-reel-name"
            initial={{ opacity: 0, y: 6, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.45, ease: [0.23, 1, 0.32, 1] } }}
            exit={{ opacity: 0, y: -6, filter: "blur(4px)", transition: { duration: 0.25 } }}
          >
            {cur.label}
          </motion.span>
        </AnimatePresence>
      ) : null}
    </span>
  );
}
