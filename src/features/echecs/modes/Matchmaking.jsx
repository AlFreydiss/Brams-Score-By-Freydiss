// ── Matchmaking : file d'attente, appariement par ELO, annulation ────────────
// RPC echecs_apparier_ou_attendre : adversaire trouvé → uuid de partie ; sinon
// insertion en file. En attente : Realtime sur les INSERT de mes parties + poll
// de secours (la « fenêtre ELO qui s'élargit » = le temps qui passe : chaque
// re-tentative prend l'adversaire le plus proche disponible).
import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../../../lib/supabase.js'
import { rpcApparier, rpcQuitterFile } from '../lib/api.js'
import { CADENCES, CADENCE_DEFAUT, CLE_CADENCE, POLL_MATCHMAKING_MS, THEME } from '../constants.js'
import { rangPourElo } from '../lib/elo.js'
import { sons } from '../lib/sons.js'

export default function Matchmaking({ monUid, pseudo, avatar, profil, onPartieTrouvee, onQuitter }) {
  const [cadence, setCadence] = useState(() => { try { return localStorage.getItem(CLE_CADENCE) || CADENCE_DEFAUT } catch { return CADENCE_DEFAUT } })
  const [enRecherche, setEnRecherche] = useState(false)
  const [erreur, setErreur] = useState(null)
  const [secondes, setSecondes] = useState(0)
  const actifRef = useRef(false)
  const elo = profil?.elo ?? 1200
  const rang = rangPourElo(elo)

  const trouve = useCallback(id => {
    if (!actifRef.current) return
    actifRef.current = false
    setEnRecherche(false)
    sons.notif()
    onPartieTrouvee(id)
  }, [onPartieTrouvee])

  // Tente l'appariement ; retourne true si partie trouvée
  const tenter = useCallback(async () => {
    const res = await rpcApparier({ cadence, elo, pseudo, avatar })
    if (typeof res === 'string' && res.length > 20) { trouve(res); return true }
    if (res && res.error) setErreur(String(res.error))
    return false
  }, [cadence, elo, pseudo, avatar, trouve])

  const chercher = useCallback(async () => {
    setErreur(null)
    sons.debloquer()
    setEnRecherche(true)
    setSecondes(0)
    actifRef.current = true
    try { localStorage.setItem(CLE_CADENCE, cadence) } catch {}
    const ok = await tenter()
    if (ok) return
  }, [cadence, tenter])

  const annuler = useCallback(async () => {
    actifRef.current = false
    setEnRecherche(false)
    await rpcQuitterFile()
  }, [])

  // En recherche : Realtime (partie créée par l'adversaire) + poll + chrono
  useEffect(() => {
    if (!enRecherche || !monUid) return undefined
    const canaux = []
    if (supabase) {
      for (const col of ['blanc_id', 'noir_id']) {
        const ch = supabase.channel(`echecs:mm:${col}:${monUid}`)
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'echecs_parties', filter: `${col}=eq.${monUid}` },
            payload => { if (payload?.new?.id) trouve(payload.new.id) })
          .subscribe()
        canaux.push(ch)
      }
    }
    const poll = setInterval(() => { if (actifRef.current) tenter() }, POLL_MATCHMAKING_MS)
    const chrono = setInterval(() => setSecondes(s => s + 1), 1000)
    return () => {
      clearInterval(poll); clearInterval(chrono)
      for (const ch of canaux) { try { supabase.removeChannel(ch) } catch {} }
    }
  }, [enRecherche, monUid, tenter, trouve])

  // Quitte la file si on démonte le composant en pleine recherche
  useEffect(() => () => { if (actifRef.current) rpcQuitterFile() }, [])

  if (enRecherche) {
    return (
      <div style={{ maxWidth: 460, margin: '0 auto', textAlign: 'center' }}>
        <style>{`@keyframes echecsRadar { from { transform: rotate(0) } to { transform: rotate(360deg) } }`}</style>
        <div style={{
          width: 110, height: 110, margin: '30px auto 22px', borderRadius: '50%', position: 'relative',
          border: `2px solid ${THEME.cardBorderHover}`,
          background: 'radial-gradient(circle, rgba(255,215,0,0.06), transparent 70%)',
        }}>
          <div style={{
            position: 'absolute', inset: -2, borderRadius: '50%',
            border: '2px solid transparent', borderTopColor: THEME.gold,
            animation: 'echecsRadar 1.1s linear infinite',
          }} />
          <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 44 }}>🧭</span>
        </div>
        <h3 style={{ fontFamily: THEME.fontDisplay, fontWeight: 800, fontSize: 22, color: THEME.text, margin: 0 }}>
          Recherche d'un adversaire…
        </h3>
        <div style={{ color: THEME.muted, fontSize: 14, marginTop: 8 }}>
          Cadence <b style={{ color: THEME.gold }}>{cadence}</b> · ton ELO <b style={{ color: THEME.gold }}>{elo}</b> · {secondes}s
        </div>
        <div style={{ color: THEME.muted, fontSize: 12.5, marginTop: 4 }}>
          La fenêtre d'appariement s'élargit avec le temps d'attente.
        </div>
        <button onClick={annuler} style={{
          marginTop: 26, padding: '12px 28px', borderRadius: 12, cursor: 'pointer',
          fontFamily: THEME.fontBody, fontWeight: 700, fontSize: 14,
          background: 'rgba(224,82,74,0.12)', color: '#ffb4ae', border: '1px solid rgba(224,82,74,0.4)',
        }}>
          ✕ Annuler la recherche
        </button>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 560, margin: '0 auto' }}>
      <h2 style={{ fontFamily: THEME.fontDisplay, fontWeight: 800, fontSize: 24, color: THEME.text, margin: '0 0 6px' }}>
        🌊 Partie en ligne classée
      </h2>
      <div style={{ color: THEME.muted, fontSize: 13.5, marginBottom: 18 }}>
        Ton ELO : <b style={{ color: THEME.gold }}>{elo}</b> · {rang.emoji} {rang.label}
      </div>

      <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: THEME.muted, marginBottom: 10 }}>Cadence</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10 }}>
        {CADENCES.map(c => {
          const actif = c.id === cadence
          return (
            <button key={c.id} onClick={() => setCadence(c.id)} style={{
              padding: '14px 12px', borderRadius: 14, cursor: 'pointer', textAlign: 'center',
              background: actif ? 'rgba(255,215,0,0.10)' : THEME.card,
              border: `1px solid ${actif ? 'rgba(255,215,0,0.45)' : THEME.cardBorder}`,
              transition: 'border-color .15s, background .15s',
            }}>
              <div style={{ fontFamily: THEME.fontDisplay, fontWeight: 800, fontSize: 20, color: actif ? THEME.gold : THEME.text }}>
                {c.emoji} {c.id}
              </div>
              <div style={{ fontSize: 12, color: THEME.muted, fontWeight: 600, marginTop: 3 }}>{c.label}</div>
            </button>
          )
        })}
      </div>

      {erreur && (
        <div style={{ marginTop: 14, padding: '10px 14px', borderRadius: 10, background: 'rgba(224,82,74,0.10)', border: '1px solid rgba(224,82,74,0.35)', color: '#ffb4ae', fontSize: 13 }}>
          ⚠ {erreur}
        </div>
      )}

      <button onClick={chercher} style={{
        width: '100%', marginTop: 22, padding: '15px 20px', borderRadius: 14, cursor: 'pointer',
        fontFamily: THEME.fontDisplay, fontWeight: 800, fontSize: 17,
        background: `linear-gradient(135deg, ${THEME.accent}, #c23a32)`, color: '#fff', border: 'none',
        boxShadow: '0 16px 40px -14px rgba(224,82,74,.55)',
      }}>
        ⚔ Chercher un adversaire
      </button>
      <button onClick={onQuitter} style={{
        width: '100%', marginTop: 10, padding: '10px', borderRadius: 10, cursor: 'pointer',
        fontFamily: THEME.fontBody, fontWeight: 600, fontSize: 13, color: THEME.muted,
        background: 'transparent', border: `1px solid ${THEME.cardBorder}`,
      }}>
        ← Retour au menu
      </button>
    </div>
  )
}
