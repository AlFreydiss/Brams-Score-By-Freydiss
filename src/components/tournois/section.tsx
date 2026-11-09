import { Suspense, use } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { tournament, type TournamentSlug } from "@/lib/tournois/catalog";
import { participants } from "@/lib/tournois/data";
import { fontsReady } from "@/lib/tournois/fonts";
import { BracketView } from "./bracket-view";
import { DuelPage } from "./duel-page";
import { FavoritesView } from "./favorites-view";
import { HistoryView } from "./history-view";
import { TournamentHome } from "./home";
import { Practice } from "./practice";
import { TournamentProvider } from "./provider";
import { RankingView } from "./ranking-view";
import { RulesView } from "./rules-view";
import { SubNav } from "./subnav";
import { RoadToFinal } from "../fight/bracket/RoadToFinal";
import { isFight } from "../fight/identities";
import "./themes/index.css";
import "./pages.css";
import { accentOf } from "./art";

// Un tournoi en duels : /tournoi/<path> et ses pages (duel, tableau,
// classement, historique, favoris, duel test, règles). DA noire commune
// (themes/noir.css) ; OST, openings, endings et jeux ont la scène « Fight
// Night » (src/components/fight).
export default function TournamentSection({ slug }: { slug: TournamentSlug }) {
  return (
    <div data-t={slug} className="t-root nx-root" style={{ "--pg-acc": accentOf(slug) } as React.CSSProperties}>
      <Suspense fallback={<SectionLoading />}>
        <Loaded slug={slug} />
      </Suspense>
    </div>
  );
}


// Pendant le chargement du catalogue : un trait qui se remplit, jamais un écran vide.
function SectionLoading() {
  return (
    <div aria-busy="true" aria-label="Chargement du tournoi" style={{ minHeight: "calc(100dvh - 4rem)", display: "grid", placeItems: "center", background: "#08090d" }}>
      <div style={{ display: "grid", justifyItems: "center", gap: 14, fontFamily: "Inter, system-ui, sans-serif", fontSize: 11, fontWeight: 600, letterSpacing: "0.22em", textTransform: "uppercase", color: "#8b8a85" }}>
        <span style={{ display: "block", width: 160, height: 1, background: "rgba(244,242,236,0.16)", overflow: "hidden" }}>
          <motion.i initial={{ x: "-100%" }} animate={{ x: "100%" }} transition={{ duration: 1.1, repeat: Infinity, ease: [0.65, 0, 0.35, 1] }} style={{ display: "block", width: "100%", height: "100%", background: "#f4f2ec" }} />
        </span>
        Chargement du tournoi
      </div>
    </div>
  );
}

// Données et polices du tournoi, chargées ensemble : la page n'apparaît
// qu'une fois les titres prêts dans leur vraie police.
const loads = new Map<TournamentSlug, Promise<Awaited<ReturnType<typeof participants>>>>();
function load(slug: TournamentSlug) {
  let p = loads.get(slug);
  if (!p) {
    p = Promise.all([participants(slug), fontsReady(slug)]).then(([list]) => list);
    loads.set(slug, p);
  }
  return p;
}

function Loaded({ slug }: { slug: TournamentSlug }) {
  const list = use(load(slug));
  const meta = tournament(slug);
  const location = useLocation();
  if (!meta) return <Navigate to="/tournoi" replace />;
  return (
    <TournamentProvider slug={slug} participants={list}>
      <SubNav />
      {/* Passage d'une page à l'autre : fondu court. Pas de glissement : déplacer toute la page la repeignait à chaque image. */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { duration: 0.34, ease: [0.16, 1, 0.3, 1] } }}
          exit={{ opacity: 0, transition: { duration: 0.16 } }}
        >
      <Routes location={location}>
        <Route index element={<TournamentHome />} />
        <Route path="duel" element={<DuelPage />} />
        <Route path="tableau" element={isFight(slug) ? <RoadToFinal /> : <BracketView />} />
        <Route path="classement" element={<RankingView />} />
        <Route path="historique" element={<HistoryView />} />
        <Route path="favoris" element={<FavoritesView />} />
        <Route path="essai" element={<Practice />} />
        <Route path="regles" element={<RulesView />} />
        <Route path="*" element={<Navigate to={`/tournoi/${meta.path}`} replace />} />
      </Routes>
        </motion.div>
      </AnimatePresence>
    </TournamentProvider>
  );
}
