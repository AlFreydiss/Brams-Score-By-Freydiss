// Fluidité adaptative : si la machine n'arrive pas à suivre (images trop lentes
// une fois la page posée), on pose <html class="perf-lite">. Le CSS coupe alors
// les flous d'arrière-plan (backdrop-filter), le poste le plus coûteux du site
// quand une vidéo ou un fond animé passe dessous.
// Le verdict est mémorisé 7 jours pour s'appliquer dès le chargement suivant.

const KEY = 'bc_perf_lite'
const TTL = 7 * 24 * 3600 * 1000

function remembered() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || 'null')
    return v && Date.now() - v.at < TTL ? v.lite : null
  } catch { return null }
}

function remember(lite) {
  try { localStorage.setItem(KEY, JSON.stringify({ lite, at: Date.now() })) } catch {}
}

function sample(frames = 90) {
  return new Promise(resolve => {
    const d = []
    let last = 0
    const tick = now => {
      if (document.hidden) return resolve(null)
      if (last) d.push(now - last)
      last = now
      if (d.length < frames) requestAnimationFrame(tick)
      else { d.sort((a, b) => a - b); resolve(d[Math.floor(d.length / 2)]) }
    }
    requestAnimationFrame(tick)
  })
}

export function installPerfProbe() {
  const root = document.documentElement
  const known = remembered()
  if (known) root.classList.add('perf-lite')
  if (known != null) return

  const run = async () => {
    // Deux mesures espacées : une seule peut tomber sur un pic de chargement.
    const a = await sample()
    await new Promise(r => setTimeout(r, 2500))
    const b = await sample()
    if (a == null || b == null) return
    const lite = a > 28 && b > 28   // < ~36 images/s de façon soutenue
    if (lite) root.classList.add('perf-lite')
    remember(lite)
  }
  const start = () => setTimeout(run, 3000)
  if (document.readyState === 'complete') start()
  else window.addEventListener('load', start, { once: true })
}
