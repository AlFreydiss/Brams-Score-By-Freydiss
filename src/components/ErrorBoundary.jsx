import { Component } from 'react'
import { shouldReloadForChunkError, tryChunkReload } from '../lib/lazyWithReload.js'

// Empêche qu'une erreur runtime dans un composant fasse un écran blanc total
// ("full bug"). Affiche l'erreur + un bouton recharger au lieu de tout casser.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    // Chunk périmé (après déploiement) qui remonte jusqu'ici → reload auto au lieu
    // d'afficher l'écran d'erreur (sinon "faut actualiser à la main").
    if (shouldReloadForChunkError(error?.message || error) && tryChunkReload()) {
      return { error: null }
    }
    return { error }
  }

  componentDidCatch(error, info) {
    // Visible dans la console pour diagnostic
    console.error('[Brams ErrorBoundary]', error, info?.componentStack)
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 99999,
        background: '#0b0d12', color: '#f4f4f5',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
        fontFamily: 'system-ui, sans-serif',
      }}>
        <div style={{ maxWidth: 560, width: '100%', textAlign: 'center' }}>
          <div style={{ fontSize: 42, marginBottom: 14 }}>🏴‍☠️</div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 8px' }}>Oups, un grain dans la voile</h1>
          <p style={{ fontSize: 14, color: '#9ca3af', margin: '0 0 18px', lineHeight: 1.6 }}>
            Une erreur a empêché l'affichage. Recharge la page — si ça persiste, envoie ce message à Al Freydiss.
          </p>
          <pre style={{
            textAlign: 'left', fontSize: 12, color: '#f87171',
            background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.25)',
            borderRadius: 10, padding: '12px 14px', overflowX: 'auto', margin: '0 0 18px',
            whiteSpace: 'pre-wrap', wordBreak: 'break-word',
          }}>
            {String(error?.message || error)}
          </pre>
          <button
            onClick={() => { try { sessionStorage.clear() } catch {} window.location.reload() }}
            style={{
              borderRadius: 11, padding: '11px 26px', fontSize: 14, fontWeight: 800,
              color: '#fff', background: 'rgba(139,92,246,0.2)',
              border: '1px solid rgba(139,92,246,0.45)', cursor: 'pointer',
            }}
          >
            Recharger la page
          </button>
        </div>
      </div>
    )
  }
}
