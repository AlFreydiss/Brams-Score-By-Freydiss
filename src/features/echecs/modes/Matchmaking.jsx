// ── Matchmaking : file d'attente, appariement par ELO, annulation ────────────
// RPC echecs_apparier_ou_attendre : adversaire trouvé → uuid de partie ; sinon
// insertion en file. En attente : Realtime sur les INSERT de mes parties + poll
// de secours (la « fenêtre ELO qui s'élargit » = le temps qui passe : chaque
// re-tentative prend l'adversaire le plus proche disponible).
import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../../../lib/supabase.js'
import { rpcApparier, rpcQuitterFile } from '../lib/api.js'
import { CADENCES, CADENCE_CATEGORIES, CADENCE_DEFAUT, CLE_CADENCE, POLL_MATCHMAKING_MS, THEME } from '../constants.js'
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
          background: 'radial-gradient(circle, rgba(200,164,92,0.08), transparent 70%)',
        }}>
          <div style={{
            position: 'absolute', inset: -2, borderRadius: '50%',
            border: '2px solid transparent', borderTopColor: THEME.gold,
            animation: 'echecsRadar 1.1s linear infinite',
          }} />
          <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: THEME.fontMono, fontWeight: 700, fontSize: 26, color: THEME.goldHi, fontVariantNumeric: 'tabular-nums' }}>{secondes}s</span>
        </div>
        <h3 style={{ fontFamily: THEME.fontDisplay, fontWeight: 800, fontSize: 22, color: THEME.text, margin: 0 }}>
          Recherche d'un adversaire…
        </h3>
        <div style={{ color: THEME.muted, fontSize: 14, marginTop: 8 }}>
          Cadence <b style={{ color: THEME.goldHi, fontFamily: THEME.fontMono }}>{cadence}</b> · ELO <b style={{ color: THEME.goldHi, fontFamily: THEME.fontMono }}>{elo}</b>
        </div>
        <div style={{ color: THEME.muted, fontSize: 12.5, marginTop: 4 }}>
          La fenêtre d'appariement s'élargit avec le temps d'attente.
        </div>
        <button onClick={annuler} style={{
          marginTop: 26, padding: '12px 28px', borderRadius: 12, cursor: 'pointer',
          fontFamily: THEME.fontBody, fontWeight: 700, fontSize: 14,
          background: 'rgba(212,104,90,0.12)', color: '#e9b0a8', border: '1px solid rgba(212,104,90,0.4)',
        }}>
          Annuler la recherche
        </button>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 560, margin: '0 auto' }}>
      <h2 style={{ fontFamily: THEME.fontDisplay, fontWeight: 800, fontSize: 24, color: THEME.text, margin: '0 0 6px', letterSpacing: '-0.02em' }}>
        Partie classée
      </h2>
      <div style={{ color: THEME.muted, fontSize: 13.5, marginBottom: 18 }}>
        Ton ELO : <b style={{ color: THEME.goldHi, fontFamily: THEME.fontMono }}>{elo}</b> · <span style={{ color: rang.couleur }}>{rang.label}</span>
      </div>

      <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: THEME.muted, marginBottom: 12 }}>Cadence</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {CADENCE_CATEGORIES.map(cat => (
          <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ width: 74, flexShrink: 0, fontSize: 12, fontWeight: 700, color: THEME.textDim }}>{cat}</span>
            <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
              {CADENCES.filter(c => c.cat === cat).map(c => {
                const actif = c.id === cadence
                return (
                  <button key={c.id} onClick={() => setCadence(c.id)} aria-pressed={actif} style={{
                    fontFamily: THEME.fontMono, fontWeight: 700, fontSize: 14, fontVariantNumeric: 'tabular-nums',
                    padding: '8px 14px', borderRadius: 999, cursor: 'pointer', minHeight: 34,
                    color: actif ? THEME.accentInk : THEME.text,
                    background: actif ? `linear-gradient(135deg, ${THEME.goldHi}, ${THEME.gold})` : THEME.surfaceHi,
                    border: `1px solid ${actif ? 'transparent' : THEME.cardBorder}`,
                    transition: 'background .15s, color .15s, border-color .15s',
                  }}>{c.id}</button>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {erreur && (
        <div style={{ marginTop: 14, padding: '10px 14px', borderRadius: 10, background: 'rgba(212,104,90,0.10)', border: '1px solid rgba(212,104,90,0.35)', color: '#e9b0a8', fontSize: 13 }}>
          {erreur}
        </div>
      )}

      <button onClick={chercher} style={{
        width: '100%', marginTop: 22, padding: '15px 20px', borderRadius: 14, cursor: 'pointer',
        fontFamily: THEME.fontDisplay, fontWeight: 800, fontSize: 16,
        background: `linear-gradient(135deg, ${THEME.goldHi}, ${THEME.gold})`, color: THEME.accentInk, border: 'none',
        boxShadow: '0 16px 40px -16px rgba(200,164,92,.5)',
      }}>
        Chercher un adversaire
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
