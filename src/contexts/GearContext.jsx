import { createContext, useContext, useState, useEffect } from 'react'

export const GEARS = {
  0: { name: 'Normal',   emoji: '⚪', label: 'Mode Normal' },
  2: { name: 'Gear 2',   emoji: '🔴', label: 'Gear Second — Vitesse ×2' },
  3: { name: 'Gear 3',   emoji: '🟠', label: 'Gear Third — Tout devient géant' },
  4: { name: 'Gear 4',   emoji: '🟣', label: 'Gear Fourth — Bounce Man' },
  5: { name: 'Gear 5',   emoji: '⭐', label: 'Gear Fifth — Nika' },
}
const ORDER = [0, 2, 3, 4, 5]

const GearContext = createContext({ gear: 0, setGear: () => {}, next: () => {} })

export function GearProvider({ children }) {
  const [gear, setGear] = useState(0)

  const next = () => {
    setGear(g => {
      const idx = ORDER.indexOf(g)
      return ORDER[(idx + 1) % ORDER.length]
    })
  }

  // Applique les effets CSS via body classes + variables
  useEffect(() => {
    const root = document.documentElement
    const body = document.body

    // Nettoie
    body.classList.remove('gear-2', 'gear-3', 'gear-4', 'gear-5')
    root.style.removeProperty('--speed-mult')
    root.style.removeProperty('--hover-scale')
    root.style.removeProperty('--ease-bounce')

    if (gear === 2) {
      body.classList.add('gear-2')
      root.style.setProperty('--speed-mult', '0.08s')
    } else if (gear === 3) {
      body.classList.add('gear-3')
      root.style.setProperty('--hover-scale', '1.08')
    } else if (gear === 4) {
      body.classList.add('gear-4')
      root.style.setProperty('--ease-bounce', 'cubic-bezier(0.34,1.56,0.64,1)')
    } else if (gear === 5) {
      body.classList.add('gear-5')
      root.style.setProperty('--bg', '#ffffff')
      root.style.setProperty('--text', '#1a0000')
      root.style.setProperty('--card', '#fff0f0')
      root.style.setProperty('--accent', '#ff0000')
      root.style.setProperty('--border', 'rgba(255,0,0,0.2)')
      body.style.fontFamily = "'Comic Sans MS', cursive"
    }

    // Restore quand on quitte gear 5
    if (gear !== 5) {
      root.style.setProperty('--bg', '#111214')
      root.style.setProperty('--text', '#e8e9ea')
      root.style.setProperty('--card', '#1e2024')
      root.style.setProperty('--accent', '#e0524a')
      root.style.setProperty('--border', 'rgba(255,255,255,0.06)')
      body.style.fontFamily = ''
    }
  }, [gear])

  return <GearContext.Provider value={{ gear, setGear, next }}>{children}</GearContext.Provider>
}

export const useGear = () => useContext(GearContext)
