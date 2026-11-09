import { Heart, Pause, Play } from "lucide-react";
import { Link } from "react-router-dom";
import { actions } from "@/lib/tournois/store";
import { useTournament } from "./provider";
import { artOf } from "./art";
import { PageHead } from "./page-head";

// Favoris en affiches : l'art en grand, le titre posé dessus, écouter et
// retirer à portée de main.
export function FavoritesView() {
  const { meta, byId, saved, player, listen } = useTournament();
  const list = saved.favorites.map((id) => byId.get(id)).filter((p): p is NonNullable<typeof p> => !!p);
  const audio = meta.mode === "audio";

  return (
    <div className="t-page t-page--wide">
      <PageHead
        title="Favoris"
        sub={list.length ? `${list.length} ${list.length > 1 ? meta.unit : meta.unitOne} gardé${list.length > 1 ? "s" : ""} de côté, sur ce navigateur uniquement.` : "Ajoute un favori avec le cœur pendant un duel. Ils sont gardés sur ce navigateur uniquement."}
      />
      {list.length === 0 ? (
        <div className="pg-empty">
          <Heart size={22} aria-hidden className="pg-empty-heart" />
          <p>Aucun favori pour l’instant. Le cœur ne compte pas comme un vote : garde tout ce qui te plaît, même ce que tu élimines.</p>
          <Link to={`/tournoi/${meta.path}/duel`} className="t-go">
            Participer au tournoi
          </Link>
        </div>
      ) : (
        <ul className="pg-favs">
          {list.map((p, k) => {
            const playing = player.id === p.id && player.playing;
            const failed = player.failed.has(p.id);
            return (
              <li key={p.id} className={`pg-fav ${playing ? "is-playing" : ""}`} style={{ "--i": Math.min(k, 10) } as React.CSSProperties}>
                <img src={artOf(p, meta.slug)} alt="" loading="lazy" decoding="async" />
                <div className="pg-fav-txt">
                  <small>{p.group}</small>
                  <b>{p.title}</b>
                  {p.artist ? <span>{p.artist}</span> : null}
                </div>
                <div className="pg-fav-actions">
                  {audio ? (
                    <button type="button" className="pg-fav-play" onClick={() => listen(p)} aria-pressed={playing} disabled={failed} aria-label={failed ? `${p.title} indisponible` : `${playing ? "Pause" : "Écouter"} ${p.title}`}>
                      {playing ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
                    </button>
                  ) : null}
                  <button type="button" className="pg-fav-heart" onClick={() => actions.toggleFavorite(meta.slug, p.id)} aria-label={`Retirer ${p.title} des favoris`} title="Retirer des favoris">
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
