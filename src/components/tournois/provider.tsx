import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { tournament, type TournamentMeta } from "@/lib/tournois/catalog";
import { flushDuel, reconcile, useSaved, type Saved } from "@/lib/tournois/store";
import type { Participant } from "@/lib/tournois/types";
import { usePlayer, type Player } from "./use-player";

type Ctx = {
  meta: TournamentMeta;
  participants: Participant[];
  byId: Map<string, Participant>;
  player: Player;
  saved: Saved;
  /** Écoute hors duel (favoris, classement…) : les vidéos passent par un lecteur caché. */
  listen: (p: Participant) => void;
};

const TournamentContext = createContext<Ctx | null>(null);

export function TournamentProvider({ slug, participants, children }: { slug: string; participants: Participant[]; children: React.ReactNode }) {
  const meta = tournament(slug) as TournamentMeta;
  const player = usePlayer({ playFrom: meta.playFrom });
  const saved = useSaved(slug);
  const deck = useRef<HTMLVideoElement>(null);
  const byId = useMemo(() => new Map(participants.map((p) => [p.id, p])), [participants]);
  const { register, toggle, stop } = player;

  const listen = useCallback(
    (p: Participant) => {
      const el = deck.current;
      if (p.sound?.k === "video" && el) {
        if (el.dataset.id !== p.id) {
          el.src = p.visual.k === "video" ? p.visual.src : "";
          el.dataset.id = p.id;
          register(p, el);
        }
      }
      toggle(p);
    },
    [register, toggle],
  );

  // Partie sauvegardée avant un changement du catalogue : remise à jour avant l'affichage.
  useLayoutEffect(() => reconcile(slug, byId), [slug, byId]);

  // Quitter les pages du tournoi coupe le son et envoie le dernier choix au site.
  useEffect(() => () => stop(), [stop]);
  useEffect(() => () => flushDuel(), []);

  const value = useMemo(() => ({ meta, participants, byId, player, saved, listen }), [meta, participants, byId, player, saved, listen]);
  return (
    <TournamentContext.Provider value={value}>
      {children}
      <video ref={deck} className="hidden" crossOrigin="anonymous" playsInline preload="none" aria-hidden />
    </TournamentContext.Provider>
  );
}

export function useTournament() {
  const ctx = useContext(TournamentContext);
  if (!ctx) throw new Error("useTournament doit être utilisé dans TournamentProvider");
  return ctx;
}
