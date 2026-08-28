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
let currentColor = null
const listeners = new Set()

function emit() {
  for (const fn of listeners) {
    try { fn(current, currentColor) } catch { /* un abonné cassé n'empêche pas les autres */ }
  }
}

// `color` est l'accent du participant qui joue : le décor s'en sert pour teinter
// l'égaliseur, de sorte que le bas de l'écran porte la couleur de la piste.
export function setNowPlaying(el, color = null) {
  if (current === el && currentColor === color) return
  current = el || null
  currentColor = el ? (color || null) : null
  emit()
}

// Ne coupe que si l'élément passé est bien celui qui joue : deux lecteurs qui
// se démontent dans le désordre ne doivent pas s'annuler l'un l'autre.
//
// Un `el` absent NE COUPE RIEN. Le garde l'acceptait et effaçait alors tout :
// un lecteur qui se démontait en passant la ref d'un élément jamais rendu (donc
// null) désinscrivait la piste que l'autre carte venait de lancer, et
// l'égaliseur s'éteignait pile au changement de morceau. Pour un arrêt global,
// appeler setNowPlaying(null).
export function clearNowPlaying(el) {
  if (!el || current !== el) return
  if (!current) return
  current = null
  currentColor = null
  emit()
}

export function getNowPlaying() {
  return current
}

export function getNowPlayingColor() {
  return currentColor
}

export function subscribeNowPlaying(fn) {
  listeners.add(fn)
  fn(current, currentColor)
  return () => listeners.delete(fn)
}
