import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTournament } from "../tournois/provider";
import { Board } from "./board";
import { DuelPlane } from "./duel";
import { HomePlane } from "./home";
import { SwipeSpace, type SpaceApi } from "./space";
import { cssVars } from "./tokens";
import { Wordline } from "./wordline";
import "./ost.css";

// Le tournoi d'OST : trois plans dans un même espace, sans barre de
// navigation. Accueil, Tournoi, Tableau se suivent de gauche à droite.
// L'URL suit le plan atteint (/tournoi/ost, /duel, /tableau) ; les anciennes
// adresses mènent au bon plan (classement, historique, favoris dans le
// Tableau ; règles et duel test dans l'Accueil et le Tournoi).

const LABELS = ["Accueil", "Tournoi", "Tableau"];
const PATHS = ["", "duel", "tableau"];
const BOARD_PARTS = ["tableau", "classement", "historique", "favoris"];

function planeOf(sub: string) {
  if (sub === "duel" || sub === "essai") return 1;
  if (BOARD_PARTS.includes(sub)) return 2;
  return 0;
}

export function OstSpace() {
  const location = useLocation();
  const navigate = useNavigate();
  const sub = location.pathname.replace(/^\/tournoi\/ost\/?/, "").split("/")[0];
  const index = planeOf(sub);
  const [settled, setSettled] = useState(index);
  const [practice, setPractice] = useState(sub === "essai");
  const root = useRef<HTMLDivElement>(null);
  const board = useRef<HTMLDivElement>(null);
  const api = useRef<SpaceApi>(null);
  const { saved } = useTournament();

  // Une vraie partie lancée met fin au duel d'essai.
  const startedAt = saved.run?.startedAt;
  const lastStart = useRef(startedAt);
  useEffect(() => {
    if (startedAt && startedAt !== lastStart.current) setPractice(false);
    lastStart.current = startedAt;
  }, [startedAt]);

  // L'espace occupe exactement l'écran sous l'en-tête du site : pas de
  // défilement de page, seulement celui de chaque plan.
  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    const set = () => el.style.setProperty("--ox-top", `${Math.max(0, el.getBoundingClientRect().top + window.scrollY)}px`);
    set();
    window.scrollTo(0, 0);
    window.addEventListener("resize", set);
    return () => window.removeEventListener("resize", set);
  }, []);

  // Ancienne adresse d'une partie du Tableau : on descend jusqu'à elle.
  useEffect(() => {
    if (!BOARD_PARTS.includes(sub) || sub === "tableau") return;
    const t = setTimeout(() => board.current?.querySelector(`#${sub}`)?.scrollIntoView({ behavior: "smooth", block: "start" }), 450);
    return () => clearTimeout(t);
    // À l'arrivée seulement.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Plein écran : l'espace seul, sans l'en-tête du site ni le navigateur.
  // Sans l'API (iPhone), l'espace passe en position fixe par-dessus la page.
  const [full, setFull] = useState(false);
  const [pseudo, setPseudo] = useState(false);
  const toggleFull = () => {
    const el = root.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else if (pseudo) setPseudo(false);
    else if (el.requestFullscreen) el.requestFullscreen().catch(() => setPseudo(true));
    else setPseudo(true);
  };
  useEffect(() => {
    const on = () => setFull(!!document.fullscreenElement && document.fullscreenElement === root.current);
    document.addEventListener("fullscreenchange", on);
    return () => document.removeEventListener("fullscreenchange", on);
  }, []);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape" && pseudo) setPseudo(false);
      if ((e.key !== "f" && e.key !== "F") || e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      toggleFull();
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  });

  const onSettle = (i: number) => {
    setSettled(i);
    if (planeOf(sub) === i) return;
    navigate(`/tournoi/ost${PATHS[i] ? `/${PATHS[i]}` : ""}`, { replace: true });
  };

  return (
    <div ref={root} className={`ox${pseudo ? " is-full" : ""}`} style={cssVars()}>
      <SwipeSpace count={3} index={index} onSettle={onSettle} apiRef={api} overlay={<Wordline labels={LABELS} current={settled} full={full || pseudo} onFull={toggleFull} />}>
        <HomePlane
          onPractice={() => {
            setPractice(true);
            api.current?.goTo(1);
          }}
        />
        <DuelPlane practice={practice} onEndPractice={() => setPractice(false)} />
        <Board ref={board} />
      </SwipeSpace>
    </div>
  );
}
