import { Suspense, use } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
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
import "./themes/index.css";

// Un tournoi en duels : /tournoi/<path> et ses pages (duel, tableau,
// classement, historique, favoris, duel test, règles).
export default function TournamentSection({ slug }: { slug: TournamentSlug }) {
  return (
    <div data-t={slug} className="t-root">
      <Suspense fallback={<div className="t-loading" aria-busy="true" />}>
        <Loaded slug={slug} />
      </Suspense>
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
  const reduce = useReducedMotion();
  if (!meta) return <Navigate to="/tournoi" replace />;
  return (
    <TournamentProvider slug={slug} participants={list}>
      <SubNav />
      {/* Passage d'une page à l'autre : fondu court, sans glissement du contenu. */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={location.pathname}
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0, transition: { duration: 0.38, ease: [0.16, 1, 0.3, 1] } }}
          exit={{ opacity: 0, transition: { duration: 0.16 } }}
        >
      <Routes location={location}>
        <Route index element={<TournamentHome />} />
        <Route path="duel" element={<DuelPage />} />
        <Route path="tableau" element={<BracketView />} />
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
