// src/features/nouveau-monde/hooks/useGameSettings.js
// Hook partagé de réglages de jeu (échecs/dames/…) — socle GameShell.
// Chargement INSTANTANÉ depuis localStorage (+ fallback offline), puis hydratation depuis
// Supabase (game_settings) si connecté ; chaque set() → maj state + localStorage + upsert
// Supabase DEBOUNCÉ. Aucune logique dupliquée entre jeux : on déclare un schéma, ce hook persiste.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../../../lib/supabase'

const LS = (jeu) => `gs_${jeu}`
const DEBOUNCE_MS = 700

function readLS(jeu) {
  try { return JSON.parse(localStorage.getItem(LS(jeu)) || '{}') } catch { return {} }
}
function writeLS(jeu, obj) {
  try { localStorage.setItem(LS(jeu), JSON.stringify(obj)) } catch { /* quota / privé */ }
}

// defaults = valeurs par défaut dérivées du schéma (clé → value).
export function useGameSettings(jeu, defaults = {}) {
  const [settings, setSettings] = useState(() => ({ ...defaults, ...readLS(jeu) }))
  const [ready, setReady] = useState(false)
  const timer = useRef(null)
  const uidRef = useRef(null)

  // Hydratation Supabase (ne casse pas l'instantané localStorage : on fusionne).
  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        const uid = session?.user?.id || null
        uidRef.current = uid
        if (uid) {
          const { data } = await supabase
            .from('game_settings').select('settings').eq('user_id', uid).eq('jeu', jeu).maybeSingle()
          if (alive && data?.settings) {
            setSettings((prev) => {
              const merged = { ...defaults, ...data.settings, ...readLS(jeu) }
              writeLS(jeu, merged)
              return merged
            })
          }
        }
      } catch { /* offline / pas de session → localStorage suffit */ }
      finally { if (alive) setReady(true) }
    })()
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jeu])

  const persist = useCallback((next) => {
    writeLS(jeu, next)
    const uid = uidRef.current
    if (!uid) return
    clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      supabase.from('game_settings')
        .upsert({ user_id: uid, jeu, settings: next, updated_at: new Date().toISOString() },
                { onConflict: 'user_id,jeu' })
        .then(() => {}, () => {}) // best-effort : l'UI ne dépend pas du réseau
    }, DEBOUNCE_MS)
  }, [jeu])

  const set = useCallback((key, value) => {
    setSettings((prev) => {
      const next = { ...prev, [key]: value }
      persist(next)
      return next
    })
  }, [persist])

  const reset = useCallback(() => {
    setSettings({ ...defaults })
    persist({ ...defaults })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [persist])

  return useMemo(() => ({ settings, set, reset, ready }), [settings, set, reset, ready])
}

export default useGameSettings
