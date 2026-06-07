// ── Appels PostgREST en fetch direct ────────────────────────────────────────
// Pourquoi : le client supabase-js attend la résolution de la session auth
// (getSession / navigator.locks) avant d'émettre une requête ; quand ce verrou
// se bloque, TOUTES les RPC (.rpc/.from) hangent → l'UI affiche "timeout" 15s
// alors que la même requête en REST direct répond en <0.5s. Le fetch direct
// contourne ce point de blocage (et reste authentifié en lisant le JWT depuis
// le storage supabase-js, sans appeler getSession()).
const SB_URL = import.meta.env.VITE_SUPABASE_URL || ''
const SB_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || ''
const SB_REF = (SB_URL.match(/https?:\/\/([^.]+)\./) || [])[1] || ''

// JWT de la session courante lu directement dans le storage supabase-js
// (clé sb-<ref>-auth-token). On n'envoie pas un token périmé (sinon 401).
export function sbAccessToken() {
  if (!SB_REF) return null
  try {
    const raw = localStorage.getItem(`sb-${SB_REF}-auth-token`)
    if (!raw) return null
    const p = JSON.parse(raw)
    const tok = p?.access_token || p?.currentSession?.access_token || null
    if (!tok) return null
    const exp = p?.expires_at ?? p?.currentSession?.expires_at
    if (exp && Date.now() / 1000 > Number(exp)) return null
    return tok
  } catch { return null }
}

// Appelle une RPC PostgREST. Renvoie le jsonb de la fonction (souvent
// { ok, ... }) ou { ok: false, error } en cas d'échec/timeout.
export async function sbRpc(fn, args = {}, { timeout = 15000, tag = 'rpc' } = {}) {
  if (!SB_URL || !SB_KEY) return { ok: false, error: 'Supabase non configuré' }
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeout)
  try {
    const token = sbAccessToken()
    const res = await fetch(`${SB_URL}/rest/v1/rpc/${fn}`, {
      method: 'POST',
      signal: ctrl.signal,
      headers: {
        apikey: SB_KEY,
        Authorization: `Bearer ${token || SB_KEY}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(args),
    })
    // Lire tout le body AVANT de couper le timer ; text() gère aussi les 204/void.
    const text = await res.text()
    if (!res.ok) {
      let msg = `http_${res.status}`
      try { const j = JSON.parse(text); msg = j?.message || j?.error || msg } catch {}
      console.error(`[${tag}] ${fn}`, msg)
      return { ok: false, error: msg }
    }
    return text ? JSON.parse(text) : { ok: true }
  } catch (e) {
    const msg = e?.name === 'AbortError' ? 'timeout' : (e?.message || 'rpc_failed')
    if (msg === 'timeout') console.warn(`[${tag}] ${fn} : réseau lent / timeout`)
    else console.error(`[${tag}] ${fn} (throw)`, msg)
    return { ok: false, error: msg }
  } finally {
    clearTimeout(timer)
  }
}

export { SB_URL, SB_KEY }
