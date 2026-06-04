// Synopsis d'épisode généré par IA (via /api/chat = Gemini/Groq), mis en cache.
// Cache par animeId + numéro d'épisode pour éviter de régénérer à chaque ouverture.

const mem = {}

function cacheKey(animeId, ep) { return `syn:${animeId}:${ep}` }

export function getCachedSynopsis(animeId, ep) {
  const k = cacheKey(animeId, ep)
  if (mem[k]) return mem[k]
  try {
    const c = localStorage.getItem(k)
    if (c) { mem[k] = c; return c }
  } catch {}
  return null
}

export async function fetchEpisodeSynopsis(animeId, animeTitle, ep) {
  const k = cacheKey(animeId, ep)
  const cached = getCachedSynopsis(animeId, ep)
  if (cached) return cached
  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: `Résume en 2 phrases maximum, sans spoiler majeur, l'épisode ${ep} de l'animé "${animeTitle}". Réponds uniquement le résumé en français, sans introduction ni préfixe.`,
        history: [],
      }),
    })
    if (!res.ok) return null
    const data = await res.json()
    const text = String(data?.reply || '').trim()
    if (!text) return null
    try { localStorage.setItem(k, text) } catch {}
    mem[k] = text
    return text
  } catch {
    return null
  }
}
