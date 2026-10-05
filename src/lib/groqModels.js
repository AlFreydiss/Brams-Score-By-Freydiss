// Modèles Groq essayés dans l'ordre. Groq retire ou restreint des modèles sans
// prévenir (llama-3.3-70b-versatile a fini en « model_not_found » sur le
// compte en octobre 2026) : au lieu d'un seul modèle en dur, on descend la
// liste tant que la réponse dit « modèle introuvable ». GROQ_MODEL, s'il est
// défini, passe en tête.
const DEFAULTS = ['openai/gpt-oss-120b', 'llama-3.3-70b-versatile', 'qwen/qwen3.6-27b', 'llama-3.1-8b-instant']

export function groqModels(envModel) {
  const list = envModel ? [envModel, ...DEFAULTS] : DEFAULTS
  return [...new Set(list)]
}

// Paramètres propres au modèle. Les gpt-oss raisonnent avant de répondre et
// ces tokens comptent dans max_tokens : sans marge, la réponse sortirait vide.
export function groqParams(model, maxTokens) {
  if (/gpt-oss/.test(model)) return { max_tokens: maxTokens + 1024, reasoning_effort: 'low' }
  return { max_tokens: maxTokens }
}

// Vrai si l'erreur vient du modèle lui-même (absent, retiré, non autorisé),
// auquel cas le suivant de la liste a une chance de passer.
export function isModelError(err) {
  const msg = String(err?.message || err || '')
  return /model_not_found|model_decommissioned|does not exist|decommissioned|_404\b|\b404:/.test(msg)
}

// Essaie `call(model)` sur chaque modèle de la liste ; s'arrête au premier
// succès ou à la première erreur qui n'est pas liée au modèle (clé, quota…).
export async function tryGroqModels(envModel, call) {
  let lastErr = null
  for (const model of groqModels(envModel)) {
    try {
      return await call(model)
    } catch (err) {
      lastErr = err
      if (!isModelError(err)) throw err
    }
  }
  throw lastErr || new Error('groq_no_model')
}
