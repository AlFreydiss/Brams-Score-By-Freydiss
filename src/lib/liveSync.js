// Synchro live de la progression entre toutes les pages — sans avoir à actualiser.
//
// Problème : l'event natif `storage` ne se déclenche QUE dans les autres onglets,
// jamais dans l'onglet qui écrit. Donc quand on regarde un épisode / lit un chapitre,
// le Hub Animé, Mon Univers, etc. ne voyaient le changement qu'au prochain poll (8s)
// → impression que "faut actualiser".
//
// Solution : on patche localStorage.setItem une seule fois pour émettre un event
// same-tab à chaque écriture. Les pages s'abonnent via onLiveProgress().

export const LS_EVENT = 'brams:ls-write'

let installed = false

// À appeler une fois au démarrage (main.jsx).
export function installLiveSync() {
  if (installed || typeof window === 'undefined') return
  installed = true
  try {
    const ls = window.localStorage
    const orig = ls.setItem.bind(ls)
    ls.setItem = (key, value) => {
      orig(key, value)
      try { window.dispatchEvent(new CustomEvent(LS_EVENT, { detail: { key } })) } catch {}
    }
    const origRemove = ls.removeItem.bind(ls)
    ls.removeItem = (key) => {
      origRemove(key)
      try { window.dispatchEvent(new CustomEvent(LS_EVENT, { detail: { key } })) } catch {}
    }
  } catch {}
}

// Clés liées à la progression (par défaut). Évite de réagir aux écritures sans rapport
// (thème, lecteur qui sauvegarde la position chaque seconde, etc.).
export const PROGRESS_KEYS = ['_vp', '_video_progress', '_progress', 'manga_progress', 'manga_last_read', 'bramsq_favs']

// S'abonne aux changements de progression (même onglet + autres onglets + retour sur
// l'onglet). `cb` reçoit la clé modifiée si dispo. Retourne une fonction cleanup.
// Options : { keys: sous-chaîne(s) à matcher (défaut PROGRESS_KEYS, null = tout),
//             debounce: ms pour coalescer les rafales (défaut 200) }.
export function onLiveProgress(cb, options = {}) {
  const { keys = PROGRESS_KEYS, debounce = 200 } = options
  const filters = keys === null ? null : (Array.isArray(keys) ? keys : [keys])
  const matches = (key) => !filters || !key || filters.some(f => key.includes(f))

  let timer = null
  const fire = (key) => {
    if (!debounce) { cb(key); return }
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => { timer = null; cb(key) }, debounce)
  }

  const onWrite = (e) => { if (matches(e?.detail?.key)) fire(e?.detail?.key) }
  const onStorage = (e) => { if (matches(e?.key)) fire(e?.key) }
  const onFocus = () => fire()
  const onVisible = () => { if (!document.hidden) fire() }

  window.addEventListener(LS_EVENT, onWrite)
  window.addEventListener('storage', onStorage)
  window.addEventListener('focus', onFocus)
  document.addEventListener('visibilitychange', onVisible)

  return () => {
    if (timer) clearTimeout(timer)
    window.removeEventListener(LS_EVENT, onWrite)
    window.removeEventListener('storage', onStorage)
    window.removeEventListener('focus', onFocus)
    document.removeEventListener('visibilitychange', onVisible)
  }
}
