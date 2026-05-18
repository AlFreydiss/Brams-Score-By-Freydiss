import { createContext, useContext, useState, useEffect } from 'react'

const THEMES = {
  dark: {
    '--bg':'#111214','--surface':'#18191c','--card':'#1e2024','--card2':'#242629',
    '--border':'rgba(255,255,255,0.06)','--accent':'#e0524a',
    '--text':'#e8e9ea','--muted':'#7c7f8a',
    '--overlay-bg':'rgba(14,14,16,0.72)',
    '--success':'#22c55e',
  },
  light: {
    '--bg':'#fdf8f1','--surface':'#fff9f2','--card':'#fffcf9','--card2':'#f5eedd',
    '--border':'rgba(160,120,80,0.14)','--accent':'#c94535',
    '--text':'#18203c','--muted':'#5a6280',
    '--overlay-bg':'rgba(253,248,241,0.94)',
    '--success':'#16a34a',
  },
  colorful: {
    '--bg':'#020b12','--surface':'#051620','--card':'#071e2e','--card2':'#0b2538',
    '--border':'rgba(0,200,175,0.20)','--accent':'#00c8b0',
    '--text':'#dff8f5','--muted':'#5aabaa',
    '--overlay-bg':'rgba(2,11,18,0.86)',
    '--success':'#00e5b8',
  },
}

const ThemeContext = createContext(null)

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem('brams_theme') || 'dark')

  useEffect(() => {
    const vars = THEMES[theme] || THEMES.dark
    const root = document.documentElement
    document.body.classList.add('theme-changing')
    Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v))
    document.body.classList.remove('theme-dark', 'theme-light', 'theme-colorful')
    document.body.classList.add(`theme-${theme}`)
    localStorage.setItem('brams_theme', theme)
    const t = setTimeout(() => document.body.classList.remove('theme-changing'), 400)
    return () => clearTimeout(t)
  }, [theme])

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
