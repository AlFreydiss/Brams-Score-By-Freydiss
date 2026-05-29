// ── Provider GIF abstrait ───────────────────────────────────────────────────
// Utilise Tenor si VITE_TENOR_KEY est défini (jamais de clé en dur), sinon un
// fallback curé (quelques GIF publics) pour que la feature reste fonctionnelle.
const TENOR_KEY = import.meta.env.VITE_TENOR_KEY || ''

export const GIF_CATEGORIES = ['Anime', 'Réaction', 'MDR', 'Colère', 'Pleure', 'Wtf', 'GG']

// Fallback : GIF publics stables (Giphy CDN). Affichage sans clé API.
const FALLBACK = {
  Anime:    ['https://media.giphy.com/media/Qp8imNJDpqcuI/giphy.gif', 'https://media.giphy.com/media/13CoXDiaCcCoyk/giphy.gif'],
  Réaction: ['https://media.giphy.com/media/3o7aCSPqXE5C6T8tBC/giphy.gif', 'https://media.giphy.com/media/l0HlBO7eyXzSZkJri/giphy.gif'],
  MDR:      ['https://media.giphy.com/media/10JhviFuU2gWD6/giphy.gif', 'https://media.giphy.com/media/T3Vx6sVAXzuG4/giphy.gif'],
  Colère:   ['https://media.giphy.com/media/11tTNkNy1SdXGg/giphy.gif', 'https://media.giphy.com/media/l1J9u3TZfpmeDLkD6/giphy.gif'],
  Pleure:   ['https://media.giphy.com/media/d2lcHJTG5Tscg/giphy.gif', 'https://media.giphy.com/media/L95W4wv8nnb9K/giphy.gif'],
  Wtf:      ['https://media.giphy.com/media/3o6Zt481isNVuQI1l6/giphy.gif', 'https://media.giphy.com/media/TqiwHbFBaZ4ti/giphy.gif'],
  GG:       ['https://media.giphy.com/media/26u4cqiYI30juCOGY/giphy.gif', 'https://media.giphy.com/media/3oEjI6SIIHBdRxXI40/giphy.gif'],
}
const FALLBACK_ALL = Object.values(FALLBACK).flat()

function fallbackSearch(query) {
  const q = (query || '').trim().toLowerCase()
  const cat = GIF_CATEGORIES.find(c => c.toLowerCase() === q)
  const urls = cat ? FALLBACK[cat] : (q ? FALLBACK_ALL : FALLBACK_ALL)
  return urls.map((u, i) => ({ id: `fb-${i}-${u}`, preview: u, url: u }))
}

export const gifConfigured = !!TENOR_KEY

export async function searchGifs(query) {
  if (!TENOR_KEY) return fallbackSearch(query)
  try {
    const q = encodeURIComponent((query || 'trending').trim() || 'trending')
    const url = `https://tenor.googleapis.com/v2/search?q=${q}&key=${TENOR_KEY}&client_key=brams_community&limit=24&media_filter=tinygif,gif&contentfilter=medium`
    const res = await fetch(url)
    if (!res.ok) return fallbackSearch(query)
    const data = await res.json()
    return (data.results || []).map(r => ({
      id: r.id,
      preview: r.media_formats?.tinygif?.url || r.media_formats?.gif?.url,
      url: r.media_formats?.gif?.url || r.media_formats?.tinygif?.url,
    })).filter(g => g.preview && g.url)
  } catch {
    return fallbackSearch(query)
  }
}
