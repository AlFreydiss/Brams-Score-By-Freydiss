import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext.jsx'
import { hasLocalLook, resetLook } from '../../lib/resetLook.js'

// Bandeau « Curseur de base » au-dessus des curseurs de la boutique :
// retire d'un coup le curseur et la traînée équipés, sur tout le site.
export default function LookReset() {
  const { isAuthenticated } = useAuth()
  const [active, setActive] = useState(hasLocalLook)
  const [state, setState] = useState('idle')   // idle | busy | done | error

  useEffect(() => {
    const read = () => setActive(hasLocalLook())
    window.addEventListener('brams-cursor-change', read)
    window.addEventListener('brams-trail-change', read)
    window.addEventListener('storage', read)
    return () => {
      window.removeEventListener('brams-cursor-change', read)
      window.removeEventListener('brams-trail-change', read)
      window.removeEventListener('storage', read)
    }
  }, [])

  const run = async () => {
    setState('busy')
    const { failed } = await resetLook({ signedIn: isAuthenticated })
    setState(failed ? 'error' : 'done')
    setTimeout(() => setState('idle'), 2600)
  }

  const label = state === 'busy' ? 'Réinitialisation…'
    : state === 'done' ? 'Curseur de base remis'
    : state === 'error' ? 'Réessaie : un article n’a pas pu être retiré'
    : 'Revenir au curseur de base'

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap',
      margin: '56px 0 -36px', padding: '14px 18px', borderRadius: 12,
      background: 'rgba(20,18,14,0.7)', border: '1px solid rgba(245,181,10,0.18)',
    }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#f4ecd8' }}>Curseur et traînée</div>
        <div style={{ fontSize: 13, color: 'rgba(205,189,151,0.7)', marginTop: 2 }}>
          {active ? 'Un curseur ou une traînée est équipé. Tu peux tout retirer en un clic.' : 'Tu utilises le curseur de base du site.'}
        </div>
      </div>
      <button type="button" onClick={run} disabled={state === 'busy' || (!active && state === 'idle')}
        style={{
          padding: '10px 16px', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: active ? 'pointer' : 'default',
          color: active ? '#0b0c0e' : 'rgba(205,189,151,0.55)',
          background: active ? '#f4ecd8' : 'transparent',
          border: `1px solid ${active ? '#f4ecd8' : 'rgba(205,189,151,0.25)'}`,
          opacity: state === 'busy' ? 0.6 : 1, transition: 'all .2s',
        }}>
        {label}
      </button>
    </div>
  )
}
