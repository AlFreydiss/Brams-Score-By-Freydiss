// ── useDraughtsCoach : appelle le mode `coach` (game 'dames') de /api/chat et
// expose l'explication. Clone du useCoach échecs : annule proprement une demande
// précédente si une nouvelle arrive (la dernière gagne).
import { useState, useRef, useCallback, useEffect } from 'react'
import { construireMessageCoachDames } from './draughtsCoachContext.js'

export function useDraughtsCoach() {
  const [texte, setTexte] = useState('')
  const [loading, setLoading] = useState(false)
  const [erreur, setErreur] = useState(null)
  const reqRef = useRef(0)

  useEffect(() => () => { reqRef.current++ }, [])  // invalide les requêtes en vol au démontage

  // ctx : { board, trait, dernierCoup, meilleurCoup, question, rules? }
  const demander = useCallback(async (ctx) => {
    const message = construireMessageCoachDames(ctx)
    const id = ++reqRef.current
    setLoading(true)
    setErreur(null)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'coach', game: 'dames', message }),
      })
      const data = await res.json().catch(() => ({}))
      if (id !== reqRef.current) return            // une demande plus récente a pris la main
      if (!res.ok) {
        setErreur(data?.error || "Le coach est indisponible, réessaie.")
        setLoading(false)
        return
      }
      setTexte(String(data?.reply || '').trim())
      setLoading(false)
    } catch {
      if (id !== reqRef.current) return
      setErreur("Connexion au coach impossible.")
      setLoading(false)
    }
  }, [])

  const reset = useCallback(() => { reqRef.current++; setTexte(''); setErreur(null); setLoading(false) }, [])

  return { texte, loading, erreur, demander, reset }
}
