// ── EmoteBar : barre d'emotes in-game (online uniquement) ────────────────────
// Réactions préréglées anti-toxiques (emotes.js). Diffusion via un canal Realtime
// LÉGER dédié `arene:emotes:<partieId>` (broadcast). On NE touche PAS au netcode
// autoritaire ni aux canaux de jeu (useRealtimeGame / subscribeMatch) : ce canal
// est purement cosmétique, aucune écriture DB, aucune incidence sur la partie.
//
// • Clic → broadcast { from, id } sur le canal de la partie.
// • Réception → bulle qui apparaît brièvement côté adversaire (fade), reduced-motion
//   = apparition simple sans animation.
// • Anti-spam : throttle local (EMOTE_THROTTLE_MS / joueur). On ignore aussi à la
//   réception un même expéditeur trop rapproché (défense en profondeur).
// Tokens neutralTheme · inline only.
import { useEffect, useRef, useState, useCallback } from 'react'
import { supabase } from '../../../lib/supabase.js'
import { ui, fonts } from '../../../features/games/neutralTheme.js'
import { EMOTES, EMOTE_BY_ID, EMOTE_THROTTLE_MS } from './emotes.js'

const prefersReduced = () => {
  try { return window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches } catch { return false }
}

export default function EmoteBar({ partieId, monUid, accent = ui.accent }) {
  const [recu, setRecu] = useState(null)          // { id, glyph, label, at } emote reçu à afficher
  const [coolKey, setCoolKey] = useState(0)       // re-render fin du cooldown (désactive les boutons)
  const canalRef = useRef(null)
  const dernierEnvoiRef = useRef(0)               // throttle d'envoi (mon horloge)
  const dernierRecuRef = useRef({})               // throttle de réception par expéditeur
  const fadeTimer = useRef(null)
  const reduced = prefersReduced()

  // ── Canal broadcast dédié aux emotes (cosmétique, jamais d'écriture jeu) ──
  useEffect(() => {
    if (!partieId || !supabase) return undefined
    const canal = supabase.channel(`arene:emotes:${partieId}`, { config: { broadcast: { self: false } } })
    canalRef.current = canal
    canal
      .on('broadcast', { event: 'emote' }, ({ payload }) => {
        if (!payload || payload.from === String(monUid)) return        // jamais ma propre bulle
        const e = EMOTE_BY_ID[payload.id]
        if (!e) return                                                  // set fermé : on ignore tout id inconnu
        const t = Date.now()
        const prev = dernierRecuRef.current[payload.from] || 0
        if (t - prev < EMOTE_THROTTLE_MS - 200) return                  // anti-flood à la réception
        dernierRecuRef.current[payload.from] = t
        setRecu({ ...e, at: t })
      })
      .subscribe()
    return () => {
      try { supabase.removeChannel(canal) } catch { /* */ }
      canalRef.current = null
    }
  }, [partieId, monUid])

  // Auto-disparition de la bulle reçue (~2.6 s).
  useEffect(() => {
    if (!recu) return undefined
    clearTimeout(fadeTimer.current)
    fadeTimer.current = setTimeout(() => setRecu(null), 2600)
    return () => clearTimeout(fadeTimer.current)
  }, [recu])

  useEffect(() => () => { clearTimeout(fadeTimer.current) }, [])

  const enCooldown = Date.now() - dernierEnvoiRef.current < EMOTE_THROTTLE_MS

  const envoyer = useCallback((emote) => {
    const t = Date.now()
    if (t - dernierEnvoiRef.current < EMOTE_THROTTLE_MS) return         // throttle d'envoi
    dernierEnvoiRef.current = t
    setCoolKey(k => k + 1)
    canalRef.current?.send({ type: 'broadcast', event: 'emote', payload: { from: String(monUid), id: emote.id } })?.catch?.(() => {})
    // Réactive les boutons à la fin du cooldown.
    setTimeout(() => setCoolKey(k => k + 1), EMOTE_THROTTLE_MS + 30)
  }, [monUid])

  if (!partieId || !supabase) return null

  return (
    <div style={{ position: 'relative', display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
      <style>{`
        @keyframes areneEmotePop { 0% { opacity: 0; transform: translate(-50%, 6px) scale(.8) } 18% { opacity: 1; transform: translate(-50%, 0) scale(1) } 80% { opacity: 1 } 100% { opacity: 0; transform: translate(-50%, -6px) scale(.96) } }
        .arene-emote-btn:focus-visible { outline: 2px solid ${accent}; outline-offset: 2px }
      `}</style>

      {EMOTES.map(e => (
        <button
          key={e.id}
          className="arene-emote-btn"
          type="button"
          onClick={() => envoyer(e)}
          disabled={enCooldown}
          title={e.label}
          aria-label={`Envoyer : ${e.label}`}
          style={{
            width: 38, height: 34, display: 'grid', placeItems: 'center',
            fontSize: 17, lineHeight: 1, cursor: enCooldown ? 'default' : 'pointer',
            background: ui.surface, border: `1px solid ${ui.line}`, borderRadius: ui.radius.sm,
            opacity: enCooldown ? 0.45 : 1, transition: 'background .15s, border-color .15s, opacity .2s',
          }}
          onMouseEnter={ev => { if (!enCooldown) { ev.currentTarget.style.background = ui.surfaceHi; ev.currentTarget.style.borderColor = ui.lineHi } }}
          onMouseLeave={ev => { ev.currentTarget.style.background = ui.surface; ev.currentTarget.style.borderColor = ui.line }}
        >
          <span aria-hidden>{e.glyph}</span>
        </button>
      ))}

      {/* Bulle de l'emote reçu (apparition brève) */}
      {recu && (
        <div
          key={recu.at}
          role="status"
          aria-label={`L'adversaire : ${recu.label}`}
          style={{
            position: 'absolute', bottom: 'calc(100% + 8px)', left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap',
            padding: '7px 14px', borderRadius: ui.radius.pill,
            background: ui.bgElev, border: `1px solid ${ui.lineHi}`, boxShadow: ui.shadow,
            pointerEvents: 'none', zIndex: 20,
            animation: reduced ? 'none' : 'areneEmotePop 2.6s ease forwards',
          }}
        >
          <span aria-hidden style={{ fontSize: 20, lineHeight: 1 }}>{recu.glyph}</span>
          <span style={{ font: `700 12.5px ${fonts.body}`, color: ui.text }}>{recu.label}</span>
        </div>
      )}
    </div>
  )
}
