// File « Écouter tout » : original puis chaque imitation, dans UN seul élément
// audio (débloqué par le tap → iOS accepte d'enchaîner sans nouveau geste),
// avec une petite respiration entre deux sons. Sans dépendance au navigateur :
// l'élément audio et la minuterie sont injectés (testable sous node).
export function createPlayQueue({ getUrls, makeAudio, onIdx, later = (fn, ms) => setTimeout(fn, ms), gapMs = 350 }) {
  let audio = null
  let idx = null
  const setIdx = (i) => { idx = i; onIdx(i) }
  const go = (i) => {
    const urls = getUrls()
    if (!audio || i >= urls.length) { setIdx(null); return }
    setIdx(i)
    audio.src = urls[i]
    audio.play().catch(() => { if (idx === i) go(i + 1) })
  }
  return {
    start() {
      if (!audio) {
        audio = makeAudio()
        audio.onEnded(() => {
          const i = idx
          if (i != null) later(() => { if (idx === i) go(i + 1) }, gapMs)
        })
      }
      go(0)
      return audio
    },
    stop() { audio?.pause(); setIdx(null) },
    // Démontage (fin de la phase de vote) : file vidée, sinon un son programmé
    // pendant la respiration repartait tout seul sur l'écran suivant.
    dispose() { audio?.pause(); idx = null },
    get audio() { return audio },
    get idx() { return idx },
  }
}
