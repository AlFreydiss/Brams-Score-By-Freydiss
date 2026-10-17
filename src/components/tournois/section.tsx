import { Suspense, use, useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { tournament, type TournamentSlug } from "@/lib/tournois/catalog";
import { participants } from "@/lib/tournois/data";
import { loadFonts } from "@/lib/tournois/fonts";
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
  useEffect(() => loadFonts(slug), [slug]);
  return (
    <div data-t={slug} className="t-root">
      <Suspense fallback={<div className="t-loading" aria-busy="true" />}>
        <Loaded slug={slug} />
      </Suspense>
    </div>
  );
}

function Loaded({ slug }: { slug: TournamentSlug }) {
  const list = use(participants(slug));
  const meta = tournament(slug);
  if (!meta) return <Navigate to="/tournoi" replace />;
  return (
    <TournamentProvider slug={slug} participants={list}>
      <SubNav />
      <Routes>
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
    </TournamentProvider>
  );
}
