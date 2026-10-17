import { Heart, Pause, Play } from "lucide-react";
import { Link } from "react-router-dom";
import { actions } from "@/lib/tournois/store";
import { useTournament } from "./provider";
import { Thumb } from "./visual";

export function FavoritesView() {
  const { meta, byId, saved, player, listen } = useTournament();
  const list = saved.favorites.map((id) => byId.get(id)).filter((p): p is NonNullable<typeof p> => !!p);
  const audio = meta.mode === "audio";

  return (
    <div className="t-page t-page--wide">
      <div className="t-page-head">
        <h1 className="t-page-title">Favoris</h1>
        <p className="t-panel-sub">Ajoute un favori avec le cœur pendant un duel. Ils sont gardés sur ce navigateur uniquement.</p>
      </div>
      {list.length === 0 ? (
        <div className="t-panel">
          <p className="t-panel-sub">Aucun favori pour l’instant.</p>
          <Link to={`/tournoi/${meta.path}/duel`} className="t-go">
            Participer au tournoi
          </Link>
        </div>
      ) : (
        <ul className="t-fav-grid">
          {list.map((p) => {
            const playing = player.id === p.id && player.playing;
            return (
              <li key={p.id} className="t-fav-card">
                <Thumb p={p} />
                <div className="t-fav-txt">
                  <b>{p.title}</b>
                  <small>{p.sub}</small>
                  {p.artist ? <small>{p.artist}</small> : null}
                </div>
                <div className="t-fav-actions">
                  {audio ? (
                    <button type="button" className="t-btn t-btn--play" onClick={() => listen(p)} aria-pressed={playing} disabled={player.failed.has(p.id)}>
                      {playing ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
                      <span>{player.failed.has(p.id) ? "Indisponible" : playing ? "Pause" : "Écouter"}</span>
                    </button>
                  ) : null}
                  <button type="button" className="t-btn t-btn--icon t-fav is-on" onClick={() => actions.toggleFavorite(meta.slug, p.id)} aria-label={`Retirer ${p.title} des favoris`} title="Retirer des favoris">
                    <Heart size={16} fill="currentColor" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
