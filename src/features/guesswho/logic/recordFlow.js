// Guess Who — décisions de l'écran d'enregistrement (logique PURE, testée).

export const COUNTDOWN = [3, 2, 1]
export const COUNT_STEP_MS = 650
// À l'approche de la fin du chrono : on coupe l'enregistrement, puis on envoie
// d'office la dernière prise (le serveur refuse tout après la phase).
export const AUTO_STOP_S = 4
export const AUTO_SEND_S = 3.5

// Durée max d'une prise : le son du tour + 3 s de marge, bornée 4..15 s.
export function takeLimitMs(clipDuration) {
  const d = Number(clipDuration) > 0 ? Number(clipDuration) : 5
  return Math.round(Math.min(15, Math.max(4, d + 3)) * 1000)
}

// Ce qu'il faut faire à l'échéance : 'stop' (couper l'enregistrement),
// 'cancel' (décompte trop tardif), 'send' (envoyer la prise non envoyée), ou null.
export function deadlineAction({ remaining, rec, takeId, sentId, sending }) {
  if (remaining == null) return null
  if (rec === 'recording' && remaining <= AUTO_STOP_S) return 'stop'
  if ((rec === 'countdown' || rec === 'arming') && remaining <= AUTO_STOP_S) return 'cancel'
  if (rec === 'idle' && takeId && takeId !== sentId && !sending && remaining <= AUTO_SEND_S) return 'send'
  return null
}

// Attente entre deux tentatives d'envoi : 0,4 s puis 1,2 s…
export function backoffMs(attempt) {
  return attempt <= 0 ? 0 : Math.round(400 * 3 ** (attempt - 1))
}

// Erreurs d'enregistrement de la prise qui valent une nouvelle tentative
// (réseau), par opposition aux refus définitifs du serveur.
export function retryableError(error) {
  return !['phase', 'unauthorized', 'bad_url', 'too_big'].includes(error)
}

// Navigateur intégré d'une appli (Discord, Instagram…) : souvent sans micro.
export function inAppBrowser(ua) {
  return /FBAN|FBAV|Instagram|Discord|Line\/|Snapchat|TikTok|musical_ly|Twitter/i.test(String(ua || ''))
}
