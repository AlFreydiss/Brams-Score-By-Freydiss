// ─────────────────────────────────────────────────────────────────────────────
// useDraughtsSettings — réglages de l'univers Dames, persistés localStorage, avec
// diffusion live entre onglets/composants (sans dépendance externe). Clé unique
// `draughts_settings_v1`. Pas d'écriture Supabase ici : pas de helper game_settings
// trivial réutilisable côté front (le drawer Nouveau Monde a sa propre voie), donc
// on reste sur localStorage — robuste, instantané, hors-ligne.
// ─────────────────────────────────────────────────────────────────────────────
import { useCallback, useEffect, useState } from 'react'
import { DAMES_BOARD_DEFAUT } from '../../../features/games/neutralTheme.js'

const KEY = 'draughts_settings_v1'
export const DEFAULTS = {
  boardTheme: DAMES_BOARD_DEFAUT,   // bois | marbre | ardoise
  pieceStyle: 'classique',          // (réservé) — pions neutres graphite/ivoire
  coords: true,                     // numérotation 1–50
  highlights: true,                 // coups légaux / rafle
  animations: true,
  animSpeed: 'normal',              // rapide | normal | lent
  sounds: true,
  volume: 0.7,
  aiLevel: 'capitaine',             // mousse | marin | capitaine | amiral
}
export const SPEED_MULT = { rapide: 0.55, normal: 1, lent: 1.6 }

function read() {
  try { const raw = localStorage.getItem(KEY); return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : { ...DEFAULTS } }
  catch { return { ...DEFAULTS } }
}

// bus de diffusion intra-onglet (les composants montés se resynchronisent).
const listeners = new Set()
function broadcast(s) { listeners.forEach(fn => { try { fn(s) } catch { /* */ } }) }

export function useDraughtsSettings() {
  const [settings, setSettings] = useState(read)

  useEffect(() => {
    const onLocal = (s) => setSettings(s)
    const onStorage = (e) => { if (e.key === KEY) setSettings(read()) }
    listeners.add(onLocal)
    window.addEventListener('storage', onStorage)
    return () => { listeners.delete(onLocal); window.removeEventListener('storage', onStorage) }
  }, [])

  const update = useCallback((patch) => {
    setSettings(prev => {
      const next = { ...prev, ...patch }
      try { localStorage.setItem(KEY, JSON.stringify(next)) } catch { /* */ }
      broadcast(next)
      return next
    })
  }, [])

  const reset = useCallback(() => {
    try { localStorage.setItem(KEY, JSON.stringify(DEFAULTS)) } catch { /* */ }
    broadcast({ ...DEFAULTS })
    setSettings({ ...DEFAULTS })
  }, [])

  return { settings, update, reset }
}
