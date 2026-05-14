import { createContext, useContext, useState, useEffect } from 'react'

const THEMES = {
  dark:     { '--bg':'#111214','--surface':'#18191c','--card':'#1e2024','--card2':'#242629','--border':'rgba(255,255,255,0.06)','--accent':'#e0524a','--text':'#e8e9ea','--muted':'#7c7f8a' },
  light:    { '--bg':'#f0f0f4','--surface':'#ffffff','--card':'#ffffff','--card2':'#f5f5f8','--border':'rgba(0,0,0,0.09)','--accent':'#e0524a','--text':'#111214','--muted':'#6b6e7a' },
  colorful: { '--bg':'#0d0a1e','--surface':'#160f2e','--card':'#1e1540','--card2':'#251b50','--border':'rgba(155,89,182,0.22)','--accent':'#ff6b9d','--text':'#f0e8ff','--muted':'#a898d8' },
}

const ThemeContext = createContext(null)

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem('brams_theme') || 'dark')

  useEffect(() => {
    const vars = THEMES[theme] || THEMES.dark
    const root = document.documentElement
    Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v))
    document.body.classList.remove('theme-dark', 'theme-light', 'theme-colorful')
    document.body.classList.add(`theme-${theme}`)
    localStorage.setItem('brams_theme', theme)
  }, [theme])

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
