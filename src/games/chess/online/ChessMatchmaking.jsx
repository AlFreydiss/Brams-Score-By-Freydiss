// ── ChessMatchmaking : appariement classé, reskin sobre de l'univers ─────────
// Logique portée fidèlement de features/echecs/modes/Matchmaking.jsx :
// rpcApparier → uuid de partie (adversaire trouvé) ou insertion en file ;
// en attente → Realtime sur les INSERT de mes parties (blanc_id / noir_id) +
// poll de secours (la « fenêtre ELO » = le temps qui passe). Annulation via
// rpcQuitterFile. Rendu : tokens neutralTheme + accent laiton, zéro RGB.
import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../../../lib/supabase.js'
import { rpcApparier, rpcQuitterFile } from '../../../features/echecs/lib/api.js'
import { CADENCES, CADENCE_CATEGORIES, CADENCE_DEFAUT, CLE_CADENCE, POLL_MATCHMAKING_MS } from '../../../features/echecs/constants.js'
import { rangPourElo } from '../../../features/echecs/lib/elo.js'
import { sons } from '../../../features/echecs/lib/sons.js'
import { ui, fonts } from '../../../features/games/neutralTheme.js'

const BRASS = '#b09467'

export default function ChessMatchmaking({ profil, pseudo, avatar, monUid, onPartieTrouvee, onQuitter }) {
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
      <div style={{ maxWidth: 460, margin: '0 auto', textAlign: 'center', padding: '8px 4px 40px' }}>
        <style>{`@keyframes chessRadar { from { transform: rotate(0) } to { transform: rotate(360deg) } } button:focus-visible{outline:2px solid ${BRASS};outline-offset:2px}`}</style>
        <div style={{
          width: 110, height: 110, margin: '30px auto 22px', borderRadius: '50%', position: 'relative',
          border: `1px solid ${ui.lineHi}`,
          background: 'radial-gradient(circle, rgba(176,148,103,0.08), transparent 70%)',
        }}>
          <div style={{
            position: 'absolute', inset: -1, borderRadius: '50%',
            border: '2px solid transparent', borderTopColor: BRASS,
            animation: 'chessRadar 1.1s linear infinite',
          }} />
          <span style={{
            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            font: `700 26px ${fonts.mono}`, color: ui.accentHi, fontVariantNumeric: 'tabular-nums',
          }}>{secondes}s</span>
        </div>
        <h3 style={{ margin: 0, font: `800 22px ${fonts.display}`, letterSpacing: '-0.02em', color: ui.text }}>
          Recherche d'un adversaire…
        </h3>
        <div style={{ color: ui.textDim, font: `500 14px ${fonts.body}`, marginTop: 8 }}>
          Cadence <b style={{ color: ui.accentHi, font: `700 14px ${fonts.mono}` }}>{cadence}</b>
          {' · '}ELO <b style={{ color: ui.accentHi, font: `700 14px ${fonts.mono}` }}>{elo}</b>
        </div>
        <div style={{ color: ui.textMute, font: `500 12.5px ${fonts.body}`, marginTop: 4 }}>
          La fenêtre d'appariement s'élargit avec le temps d'attente.
        </div>
        <button onClick={annuler} style={{
          marginTop: 26, padding: '12px 28px', borderRadius: ui.radius.md, cursor: 'pointer',
          font: `700 14px ${fonts.body}`,
          background: 'rgba(212,104,90,0.12)', color: '#e7b3aa', border: '1px solid rgba(212,104,90,0.4)',
          transition: 'filter .15s',
        }}
          onMouseEnter={e => { e.currentTarget.style.filter = 'brightness(1.12)' }}
          onMouseLeave={e => { e.currentTarget.style.filter = 'none' }}>
          Annuler la recherche
        </button>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '8px 4px 40px' }}>
      <style>{`button:focus-visible{outline:2px solid ${BRASS};outline-offset:2px}`}</style>
      <h2 style={{ margin: '4px 0 6px', font: `800 24px ${fonts.display}`, letterSpacing: '-0.02em', color: ui.text }}>
        Partie classée
      </h2>
      <div style={{ color: ui.textDim, font: `500 13.5px ${fonts.body}`, marginBottom: 22 }}>
        Ton ELO : <b style={{ color: ui.accentHi, font: `700 13.5px ${fonts.mono}` }}>{elo}</b>
        {' · '}<span style={{ color: rang.couleur, fontWeight: 700 }}>{rang.label}</span>
      </div>

      <div style={{ font: `700 11px ${fonts.body}`, letterSpacing: '0.09em', textTransform: 'uppercase', color: ui.textMute, marginBottom: 12 }}>Cadence</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {CADENCE_CATEGORIES.map(cat => (
          <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ width: 74, flexShrink: 0, font: `700 12px ${fonts.body}`, color: ui.textDim }}>{cat}</span>
            <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
              {CADENCES.filter(c => c.cat === cat).map(c => {
                const actif = c.id === cadence
                return (
                  <button key={c.id} onClick={() => setCadence(c.id)} aria-pressed={actif} style={{
                    font: `700 14px ${fonts.mono}`, fontVariantNumeric: 'tabular-nums',
                    padding: '8px 14px', borderRadius: ui.radius.pill, cursor: 'pointer', minHeight: 34,
                    color: actif ? '#e7d8b8' : ui.text,
                    background: actif ? 'rgba(176,148,103,0.14)' : ui.surface,
                    border: `1px solid ${actif ? 'rgba(176,148,103,0.5)' : ui.line}`,
                    transition: 'background .15s, color .15s, border-color .15s',
                  }}
                    onMouseEnter={e => { if (!actif) { e.currentTarget.style.background = ui.surfaceHi; e.currentTarget.style.borderColor = ui.lineHi } }}
                    onMouseLeave={e => { if (!actif) { e.currentTarget.style.background = ui.surface; e.currentTarget.style.borderColor = ui.line } }}>{c.id}</button>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {erreur && (
        <div style={{ marginTop: 14, padding: '10px 14px', borderRadius: ui.radius.sm, background: 'rgba(212,104,90,0.10)', border: '1px solid rgba(212,104,90,0.35)', color: '#e7b3aa', font: `500 13px ${fonts.body}` }}>
          {erreur}
        </div>
      )}

      <button onClick={chercher} style={{
        width: '100%', marginTop: 24, padding: '14px', borderRadius: ui.radius.md, cursor: 'pointer',
        font: `800 15px ${fonts.display}`, letterSpacing: '0.01em', color: '#15110a',
        background: BRASS, border: 'none', transition: 'filter .15s',
      }}
        onMouseEnter={e => { e.currentTarget.style.filter = 'brightness(1.08)' }}
        onMouseLeave={e => { e.currentTarget.style.filter = 'none' }}>
        Chercher un adversaire
      </button>
      <button onClick={onQuitter} style={{
        width: '100%', marginTop: 10, padding: '10px', borderRadius: ui.radius.sm, cursor: 'pointer',
        font: `600 13px ${fonts.body}`, color: ui.textMute,
        background: 'transparent', border: `1px solid ${ui.line}`, transition: 'color .15s, border-color .15s',
      }}
        onMouseEnter={e => { e.currentTarget.style.color = ui.textDim; e.currentTarget.style.borderColor = ui.lineHi }}
        onMouseLeave={e => { e.currentTarget.style.color = ui.textMute; e.currentTarget.style.borderColor = ui.line }}>
        ← Retour
      </button>
    </div>
  )
}
