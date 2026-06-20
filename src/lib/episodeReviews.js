// Avis / notes d'épisodes par membre.
// S'appuie sur sbRpc (fetch PostgREST direct anti-hang). Dégradation gracieuse :
// si la RPC n'existe pas encore côté DB, on renvoie un état vide plutôt que de
// faire crasher le panneau de l'épisode.
import { sbRpc } from './supabaseRest.js'

const EMPTY = { avg: 0, count: 0, mine: null, reviews: [] }

// Publie (ou met à jour) l'avis du membre courant sur un épisode.
// Renvoie le jsonb { ok, ... } de la fonction SQL (ou { ok:false, error }).
export async function reviewEpisode({ ns, epKey, rating, comment, username, avatar }) {
  return sbRpc('review_episode', {
    p_ns: ns,
    p_ep_key: epKey,
    p_rating: rating,
    p_comment: comment ?? '',
    p_username: username ?? '',
    p_avatar: avatar ?? '',
  }, { tag: 'reviews' })
}

// Lit la note moyenne + le compte + l'avis du membre + la liste des avis.
// Tolérant : toute erreur (RPC absente, timeout) retombe sur l'état vide.
export async function getEpisodeReviews(ns, epKey) {
  const r = await sbRpc('get_episode_reviews', { p_ns: ns, p_ep_key: epKey }, { tag: 'reviews' })
  if (!r || r.ok === false) return { ...EMPTY }
  return {
    avg: Number(r.avg) || 0,
    count: Number(r.count) || 0,
    mine: r.mine && typeof r.mine === 'object'
      ? { rating: Number(r.mine.rating) || 0, comment: r.mine.comment || '' }
      : null,
    reviews: Array.isArray(r.reviews) ? r.reviews : [],
  }
}
