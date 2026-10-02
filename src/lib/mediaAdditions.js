// ── Épisodes et chapitres ajoutés à la main (page /staff/contenus) ──────────
// Les données livrées avec le site (src/data/*-videos.json, src/data/manga/*.json)
// ne bougent qu'à un déploiement. Les ajouts du staff vivent dans la table
// Supabase media_additions et sont fusionnés ici, à l'ouverture d'une page :
// pas de build, pas de commit pour publier un épisode.

import { mergeVideos, mergeChapters, rowToVideo } from './mediaMerge.js'
export { mergeVideos, mergeChapters, rowToVideo }

const SB_URL = import.meta.env.VITE_SUPABASE_URL || ''
const SB_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

// Animé → fichier d'épisodes. Les pages font `const VIDEOS = VIDEOS_RAW` : elles
// partagent le tableau du module JSON, qu'on complète avant leur affichage.
export const ANIME_VIDEO_FILES = {
  tpn: 'tpn-videos', drstone: 'drstone-videos', jjk: 'jjk-videos', kingdom: 'kingdom-videos',
  aot: 'aot-videos', kny: 'kny-videos', nnt: 'nnt-videos', sl: 'sl-videos', dbs: 'dbs-videos',
  'violet-evergarden': 'violet-evergarden-videos', vivy: 'vivy-videos',
  'domestic-na-kanojo': 'domestic-na-kanojo-videos', 'koi-ameagari': 'koi-ameagari-videos',
  'love-prism': 'love-prism-videos', 'carole-tuesday': 'carole-tuesday-videos',
  'bunny-girl': 'bunny-girl-videos', 'rent-girlfriend': 'rent-girlfriend-videos',
  bc: 'bc-videos', mha: 'mha-videos', fireforce: 'fireforce-videos', bleach: 'bleach-videos',
  'kaiju-no-8': 'kaiju-videos', bluelock: 'bluelock-videos', 'fate-zero': 'fate-zero-videos',
  'your-name': 'your-name-videos', 'your-lie': 'your-lie-videos', 'fgo-babylonia': 'fgo-babylonia-videos',
  quintuplets: 'quintuplets-videos', kaguya: 'kaguya-videos', hxh: 'hxh-videos',
}

const VIDEO_MODULES = import.meta.glob('../data/*-videos.json')

let cache = null       // { at, rows }
let inflight = null
const TTL = 60 * 1000

// Toutes les fiches (quelques centaines au plus). Une requête par minute au
// maximum ; en cas d'échec réseau ou de table absente, rien n'est ajouté.
export function fetchAdditions({ fresh = false } = {}) {
  if (!SB_URL || !SB_KEY) return Promise.resolve([])
  if (!fresh && cache && Date.now() - cache.at < TTL) return Promise.resolve(cache.rows)
  if (inflight) return inflight
  inflight = fetch(`${SB_URL}/rest/v1/media_additions?select=*&order=series.asc,num.asc`, {
    headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` },
  })
    .then(r => (r.ok ? r.json() : []))
    .then(rows => { cache = { at: Date.now(), rows: Array.isArray(rows) ? rows : [] }; return cache.rows })
    .catch(() => (cache?.rows || []))
    .finally(() => { inflight = null })
  return inflight
}

export function invalidateAdditions() { cache = null }

// À appeler avant d'afficher la page d'un animé (App.jsx). Ne rejette jamais.
export async function prepareAnime(id, { timeoutMs = 1500 } = {}) {
  const file = ANIME_VIDEO_FILES[id]
  const load = file && VIDEO_MODULES[`../data/${file}.json`]
  if (!load) return
  const work = Promise.all([load(), fetchAdditions()]).then(([mod, rows]) => {
    const mine = rows.filter(r => r.kind === 'episode' && r.series === id)
    if (Array.isArray(mod.default)) mergeVideos(mod.default, mine)
  })
  // Réseau lent : on ouvre la page quand même, sans les ajouts.
  await Promise.race([work, new Promise(r => setTimeout(r, timeoutMs))]).catch(() => {})
}

// Plafonné à 1,5 s : un Supabase lent ne doit pas retarder les chapitres livrés.
export async function chapterAdditions(slug, { timeoutMs = 1500 } = {}) {
  const rows = await Promise.race([fetchAdditions(), new Promise(r => setTimeout(() => r([]), timeoutMs))])
  return rows.filter(r => r.kind === 'chapter' && r.series === slug)
}
