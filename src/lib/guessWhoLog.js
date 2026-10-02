// Journal d'erreurs Guess Who : envoi en tâche de fond, jamais bloquant.
// Appel : logEvent(code, userId, 'mic_error', 'mic_busy') — sans await.
import { sbRpc } from './supabaseRest.js'
import { makeLogger } from './guessWhoLogCore.js'

export const logEvent = makeLogger(
  (fn, args) => sbRpc(fn, args, { timeout: 4000, tag: 'guesswho-log' }),
  typeof navigator !== 'undefined' ? navigator.userAgent : '',
)
