// Quel élément média joue en ce moment.
//
// Le décor de la page (TournamentBackdrop) est monté très loin du lecteur dans
// l'arbre : faire descendre une ref jusqu'à lui traverserait cinq composants
// qui n'ont rien à voir avec le son. Un registre minuscule fait le lien, et le
// décor s'y abonne.
//
// On ne garde qu'un seul élément : sur ces pages, une seule piste joue à la
// fois (lancer un duel arrête l'autre).

let current = null
const listeners = new Set()

function emit() {
  for (const fn of listeners) {
    try { fn(current) } catch { /* un abonné cassé n'empêche pas les autres */ }
  }
}

export function setNowPlaying(el) {
  if (current === el) return
  current = el || null
  emit()
}

// Ne coupe que si l'élément passé est bien celui qui joue : deux lecteurs qui
// se démontent dans le désordre ne doivent pas s'annuler l'un l'autre.
export function clearNowPlaying(el) {
  if (el && current !== el) return
  if (!current) return
  current = null
  emit()
}

export function getNowPlaying() {
  return current
}

export function subscribeNowPlaying(fn) {
  listeners.add(fn)
  fn(current)
  return () => listeners.delete(fn)
}
