// ── useRealtimeGame : canal temps réel d'une partie ──────────────────────────
// Broadcast (coups, propositions) + presence (adversaire en ligne) + postgres
// changes (filet de sécurité : statut, horloges, revanche). Le client supabase
// n'est utilisé QUE pour le realtime (les lectures/écritures passent par REST).
import { useEffect, useRef, useState, useCallback } from 'react'
import { supabase } from '../../../lib/supabase.js'
import { getPartie } from '../lib/api.js'

export function useRealtimeGame({ partieId, monUid, onCoupRecu, onMajPartie, onNulleProposee, onNulleRefusee, onRevancheProposee }) {
  const [adversaireEnLigne, setAdversaireEnLigne] = useState(false)
  const canalRef = useRef(null)

  // refs stables pour ne pas re-souscrire à chaque render
  const cbRef = useRef({})
  cbRef.current = { onCoupRecu, onMajPartie, onNulleProposee, onNulleRefusee, onRevancheProposee }

  useEffect(() => {
    if (!partieId || !monUid || !supabase) return undefined

    const canal = supabase.channel(`echecs:partie:${partieId}`, {
      config: { presence: { key: String(monUid) }, broadcast: { self: false } },
    })
    canalRef.current = canal

    canal
      .on('broadcast', { event: 'coup' },              ({ payload }) => cbRef.current.onCoupRecu?.(payload))
      .on('broadcast', { event: 'nulle_proposee' },    ({ payload }) => cbRef.current.onNulleProposee?.(payload))
      .on('broadcast', { event: 'nulle_refusee' },     ({ payload }) => cbRef.current.onNulleRefusee?.(payload))
      .on('broadcast', { event: 'revanche_proposee' }, ({ payload }) => cbRef.current.onRevancheProposee?.(payload))
      .on('presence', { event: 'sync' }, () => {
        const etat = canal.presenceState()
        setAdversaireEnLigne(Object.keys(etat).some(k => k !== String(monUid)))
      })
      .subscribe(async status => {
        if (status === 'SUBSCRIBED') {
          canal.track({ uid: String(monUid), at: Date.now() }).catch(() => {})
          // resynchronise l'état complet à la (re)connexion (refresh, veille, coupure)
          const { data } = await getPartie(partieId)
          if (data) cbRef.current.onMajPartie?.(data)
        }
      })

    // Filet de sécurité : updates DB de la partie (statut/horloges/revanche),
    // au cas où un broadcast se perd (latence, onglet en veille…)
    const canalDb = supabase.channel(`echecs:db:${partieId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'echecs_parties', filter: `id=eq.${partieId}` },
        payload => { if (payload?.new) cbRef.current.onMajPartie?.(payload.new) })
      .subscribe()

    return () => {
      try { supabase.removeChannel(canal) } catch {}
      try { supabase.removeChannel(canalDb) } catch {}
      canalRef.current = null
    }
  }, [partieId, monUid])

  const envoyer = useCallback((event, payload) => {
    canalRef.current?.send({ type: 'broadcast', event, payload }).catch?.(() => {})
  }, [])

  return { adversaireEnLigne, envoyer }
}
