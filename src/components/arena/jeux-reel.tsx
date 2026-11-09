import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { jeuArt } from "../fight/jeux-art";

// Affiche vivante du tournoi des OST de jeux vidéo (hub) : les arts des jeux
// du tournoi défilent en fondu, chacun avec son mouvement de caméra ; le nom
// du jeu passe en petites capitales. Lent quand on regarde la page, rapide
// au survol (« le tournoi défile sous la main »). Arrêté hors de l'écran.

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
const REEL = PICK.flatMap((game) => {
  const a = jeuArt(game);
  return a ? [{ ...a, game }] : [];
});

export function JeuxReel({ hot }: { hot: boolean }) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const [seen, setSeen] = useState(false);
  const [i, setI] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setSeen(e.isIntersecting), { threshold: 0.3 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!seen || reduce || REEL.length < 2) return;
    const t = setInterval(() => setI((k) => (k + 1) % REEL.length), hot ? 1400 : 4200);
    return () => clearInterval(t);
  }, [seen, hot, reduce]);

  useEffect(() => {
    // Précharge l'art suivant : le fondu ne tombe jamais sur du vide.
    if (!seen) return;
    const im = new Image();
    im.src = REEL[(i + 1) % REEL.length].src;
  }, [i, seen]);

  const cur = REEL[i];
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
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={cur.game}
          className="nf-reel-name"
          initial={{ opacity: 0, y: 6, filter: "blur(4px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.45, ease: [0.23, 1, 0.32, 1] } }}
          exit={{ opacity: 0, y: -6, filter: "blur(4px)", transition: { duration: 0.25 } }}
        >
          {cur.game}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
