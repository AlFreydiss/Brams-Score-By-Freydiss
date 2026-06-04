import { lazy } from 'react'

// Recharge auto quand un chunk lazy périmé échoue (typique après un déploiement :
// l'onglet ouvert garde l'ancien index.html → l'ancien chunk JS n'existe plus →
// l'import dynamique rejette → page blanche → "faut actualiser").
//
// Garde anti-boucle : on ne recharge qu'une fois toutes les 10s (si après reload le
// chunk échoue encore — propagation CDN — on n'entre pas en boucle infinie).

const KEY = '__brams_chunk_reload_ts__'

export function shouldReloadForChunkError(err) {
  const msg = String(err?.message || err || '')
  return /dynamically imported module|Importing a module script failed|Failed to fetch dynamically|error loading dynamically imported module|ChunkLoadError|Loading chunk/i.test(msg)
}

export function tryChunkReload() {
  try {
    const last = Number(sessionStorage.getItem(KEY) || 0)
    if (Date.now() - last > 10000) {
      sessionStorage.setItem(KEY, String(Date.now()))
      window.location.reload()
      return true
    }
  } catch {}
  return false
}

// Remplace lazy() : sur échec d'import, tente un reload propre avant d'abandonner.
export function lazyWithReload(factory) {
  return lazy(() =>
    factory().catch((err) => {
      if (tryChunkReload()) return new Promise(() => {}) // halt le rendu pendant le reload
      throw err
    })
  )
}
