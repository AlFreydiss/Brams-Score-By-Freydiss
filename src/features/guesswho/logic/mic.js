// Guess Who — choix du micro et niveau d'entrée (logique PURE, testée).

// Contraintes getUserMedia : le micro choisi par le joueur, sinon celui du système.
// Anti-larsen gardé (le son du tour peut sortir du haut-parleur), mais ni
// réduction de bruit (elle mange les cris) ni gain auto (il « pompe » sur les
// cris) : le volume est égalisé après coup, pareil pour tout le monde.
export function micConstraints(deviceId) {
  return {
    echoCancellation: true,
    noiseSuppression: false,
    autoGainControl: false,
    channelCount: { ideal: 1 },
    ...(deviceId ? { deviceId: { exact: deviceId } } : {}),
  }
}

// Niveau 0..1 à partir d'échantillons temporels 8 bits (AnalyserNode.getByteTimeDomainData).
export function levelOf(samples) {
  if (!samples?.length) return 0
  let sum = 0
  for (let i = 0; i < samples.length; i++) {
    const v = (samples[i] - 128) / 128
    sum += v * v
  }
  return Math.min(1, Math.sqrt(sum / samples.length))
}

export function micLabel(device, index) {
  return device?.label || `Micro ${index + 1}`
}

// Demande de micro bornée dans le temps (le navigateur peut ne jamais répondre).
// `later(fn)` programme l'expiration (setTimeout injecté pour les tests).
// Si le micro arrive APRÈS l'expiration (permission accordée tard sur iPhone),
// on le referme aussitôt : sinon il restait ouvert sans détenteur.
export function raceWithRelease(promise, ms, later = (fn) => setTimeout(fn, ms)) {
  let expired = false
  promise.then((s) => { if (expired) s?.getTracks?.().forEach((t) => t.stop()) }, () => {})
  return Promise.race([
    promise,
    new Promise((_, reject) => later(() => { expired = true; reject(Object.assign(new Error('timeout'), { name: 'TimeoutError' })) })),
  ])
}
