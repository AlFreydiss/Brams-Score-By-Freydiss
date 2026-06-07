// ── Appels PostgREST en fetch direct ────────────────────────────────────────
// Pourquoi : le client supabase-js attend la résolution de la session auth
// (getSession / navigator.locks) avant d'émettre une requête ; quand ce verrou
// se bloque, TOUTES les RPC (.rpc/.from) hangent → l'UI affiche "timeout" 15s
// alors que la même requête en REST direct répond en <0.5s. Le fetch direct
// contourne ce point de blocage (et reste authentifié en lisant le JWT depuis
// le storage supabase-js, sans appeler getSession()).
//
// Comme on bypasse le client, c'est NOUS qui devons rafraîchir le JWT quand il
// expire (sinon, "si on attend", le token périme au bout d'~1h et toutes les
// actions authentifiées — poster, like, upload — échouent jusqu'au reload).
const SB_URL = import.meta.env.VITE_SUPABASE_URL || ''
const SB_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || ''
const SB_REF = (SB_URL.match(/https?:\/\/([^.]+)\./) || [])[1] || ''
const STORAGE_KEY = SB_REF ? `sb-${SB_REF}-auth-token` : null
const SKEW_S = 60 // marge avant expiration pour rafraîchir en avance

// Lit la session supabase-js depuis le localStorage (formats v2 plat ou v1
// { currentSession }). Renvoie { wrapper, session } ou null.
function readSession() {
  if (!STORAGE_KEY) return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const wrapper = JSON.parse(raw)
    const session = wrapper?.currentSession || wrapper
    if (!session?.access_token) return null
    return { wrapper, session }
  } catch { return null }
}

// Réécrit la session (tokens rafraîchis) dans le localStorage en conservant la
// forme d'origine, pour que le client supabase-js reste cohérent.
function writeSession(wrapper, session, fresh) {
  const updated = {
    ...session,
    access_token: fresh.access_token,
    refresh_token: fresh.refresh_token || session.refresh_token,
    expires_in: fresh.expires_in ?? session.expires_in,
    expires_at: fresh.expires_at || Math.floor(Date.now() / 1000) + (fresh.expires_in || 3600),
    token_type: fresh.token_type || session.token_type,
    user: fresh.user || session.user,
  }
  const out = wrapper?.currentSession ? { ...wrapper, currentSession: updated } : updated
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(out)) } catch {}
  return updated.access_token
}

// Un seul refresh en vol à la fois (plusieurs RPC simultanées partagent la promesse).
let _refreshing = null
function refreshSession(session, wrapper) {
  if (!session?.refresh_token) return Promise.resolve(null)
  if (_refreshing) return _refreshing
  _refreshing = (async () => {
    try {
      const res = await fetch(`${SB_URL}/auth/v1/token?grant_type=refresh_token`, {
        method: 'POST',
        headers: { apikey: SB_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: session.refresh_token }),
      })
      if (!res.ok) return null
      const data = await res.json()
      if (!data?.access_token) return null
      return writeSession(wrapper, session, data)
    } catch { return null }
    finally { _refreshing = null }
  })()
  return _refreshing
}

// JWT valide de la session courante (rafraîchi si expiré). null si déconnecté
// ou si le refresh échoue → on retombe alors sur l'anon (les reads marchent).
export async function getAccessToken() {
  const r = readSession()
  if (!r) return null
  const exp = Number(r.session.expires_at) || 0
  if (exp && Date.now() / 1000 < exp - SKEW_S) return r.session.access_token
  return await refreshSession(r.session, r.wrapper)
}

// Variante synchrone (sans refresh) : renvoie le token s'il n'est pas expiré.
export function sbAccessToken() {
  const r = readSession()
  if (!r) return null
  const exp = Number(r.session.expires_at) || 0
  if (exp && Date.now() / 1000 > exp) return null
  return r.session.access_token
}

// Appelle une RPC PostgREST. Renvoie le jsonb de la fonction (souvent
// { ok, ... }) ou { ok: false, error } en cas d'échec/timeout.
export async function sbRpc(fn, args = {}, { timeout = 15000, tag = 'rpc' } = {}) {
  if (!SB_URL || !SB_KEY) return { ok: false, error: 'Supabase non configuré' }
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeout)
  try {
    const token = await getAccessToken()
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
