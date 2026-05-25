import { createContext, useContext, useState, useEffect } from 'react'

const THEMES = {
  dark: {
    '--bg':'#0e1013','--surface':'#15181d','--card':'#1b2026','--card2':'#21272e',
    '--border':'rgba(176,138,58,0.12)','--accent':'#7b3f45',
    '--text':'#e8e9ea','--muted':'#7c7f8a',
    '--overlay-bg':'rgba(10,12,15,0.74)',
    '--success':'#3f7f5f',
  },
  light: {
    '--bg':'#f7f2eb','--surface':'#fffaf4','--card':'#fffdf9','--card2':'#f2e9da',
    '--border':'rgba(129,92,64,0.14)','--accent':'#8b4a41',
    '--text':'#18203c','--muted':'#5a6280',
    '--overlay-bg':'rgba(247,242,235,0.94)',
    '--success':'#3f7f5f',
  },
  colorful: {
    '--bg':'#091014','--surface':'#101a21','--card':'#13212a','--card2':'#172831',
    '--border':'rgba(176,138,58,0.14)','--accent':'#8a5d64',
    '--text':'#e7ebee','--muted':'#8a96a0',
    '--overlay-bg':'rgba(9,16,20,0.86)',
    '--success':'#3f7f5f',
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
