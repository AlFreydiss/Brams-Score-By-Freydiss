import { Component } from 'react'

// Boundary LOCAL au jeu Brams Phone : un throw au render dans un composant gartic
// affiche une carte récupérable au lieu de remonter jusqu'au boundary racine
// (qui peut déclencher le reload-loop chunk). Volontairement AUCUNE logique
// chunk-reload ici — on montre la carte, on ne recharge pas tout seul.
export default class GarticErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('[GarticErrorBoundary]', error, info?.componentStack)
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    return (
      <div style={{
        minHeight: '100vh',
        background: '#0d0e13', color: '#ece7d8',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
        fontFamily: 'system-ui, sans-serif',
      }}>
        <div style={{
          maxWidth: 480, width: '100%', textAlign: 'center',
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(191,164,106,0.25)',
          borderRadius: 16, padding: '34px 28px',
        }}>
          <div style={{ fontSize: 40, marginBottom: 14 }}>🎮</div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 8px', color: '#BFA46A' }}>
            Oups, le jeu a planté
          </h1>
          <p style={{ fontSize: 14, color: '#9b9789', margin: '0 0 22px', lineHeight: 1.6 }}>
            Une erreur a interrompu la partie. Recharge pour réessayer — si ça persiste,
            préviens Al Freydiss.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => window.location.reload()}
              style={{
                borderRadius: 11, padding: '11px 26px', fontSize: 14, fontWeight: 800,
                color: '#0d0e13', background: '#BFA46A',
                border: '1px solid #BFA46A', cursor: 'pointer',
              }}
            >
              Recharger
            </button>
            <a
              href="/"
              style={{
                borderRadius: 11, padding: '11px 26px', fontSize: 14, fontWeight: 800,
                color: '#ece7d8', background: 'transparent',
                border: '1px solid rgba(191,164,106,0.45)', cursor: 'pointer',
                textDecoration: 'none', display: 'inline-block',
              }}
            >
              Retour à l'accueil
            </a>
          </div>
        </div>
      </div>
    )
  }
}
