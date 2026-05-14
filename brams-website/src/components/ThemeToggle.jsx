import { useState } from 'react'
import { useTheme } from '../contexts/ThemeContext.jsx'

const OPTIONS = [
  { key: 'dark',     icon: '🌙', label: 'Sombre' },
  { key: 'light',    icon: '☀️', label: 'Clair' },
  { key: 'colorful', icon: '🎨', label: 'Coloré' },
]

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [open, setOpen] = useState(false)
  const current = OPTIONS.find(o => o.key === theme) || OPTIONS[0]

  return (
    <div style={{ position: 'fixed', bottom: 136, left: 16, zIndex: 800 }}>
      {open && (
        <div style={{
          position: 'absolute', bottom: 'calc(100% + 8px)', left: 0,
          background: 'rgba(14,14,16,0.95)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 12, padding: 6,
          backdropFilter: 'blur(16px)',
          display: 'flex', flexDirection: 'column', gap: 2,
          animation: 'scaleIn .15s ease-out',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          minWidth: 130,
        }}>
          {OPTIONS.map(o => (
            <button
              key={o.key}
              onClick={() => { setTheme(o.key); setOpen(false) }}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '9px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
                background: theme === o.key ? 'rgba(255,255,255,0.1)' : 'transparent',
                color: theme === o.key ? '#fff' : 'rgba(255,255,255,0.5)',
                fontFamily: 'var(--body)', fontSize: 13,
                fontWeight: theme === o.key ? 700 : 400,
                whiteSpace: 'nowrap', transition: 'all .15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#fff' }}
              onMouseLeave={e => { e.currentTarget.style.background = theme === o.key ? 'rgba(255,255,255,0.1)' : 'transparent'; e.currentTarget.style.color = theme === o.key ? '#fff' : 'rgba(255,255,255,0.5)' }}
            >
              <span style={{ fontSize: 15 }}>{o.icon}</span>
              <span>{o.label}</span>
              {theme === o.key && <span style={{ marginLeft: 'auto', color: 'var(--accent)', fontSize: 12 }}>✓</span>}
            </button>
          ))}
        </div>
      )}

      <button
        onClick={() => setOpen(s => !s)}
        title="Thème d'affichage"
        style={{
          width: 34, height: 34, borderRadius: 9,
          background: open ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.05)',
          border: `1px solid ${open ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.08)'}`,
          color: 'rgba(255,255,255,0.7)',
          cursor: 'pointer', fontSize: 15,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all .2s',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)' }}
        onMouseLeave={e => { if (!open) { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)' } }}
      >
        {current.icon}
      </button>
    </div>
  )
}
