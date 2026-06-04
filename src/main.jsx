import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import './responsive-safety.css'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import { AuthProvider } from './contexts/AuthContext.jsx'
import { installLiveSync } from './lib/liveSync.js'
import { tryChunkReload, shouldReloadForChunkError } from './lib/lazyWithReload.js'

// Synchro live de la progression (anime/scans/univers) sans rechargement manuel.
installLiveSync()

// Après un déploiement, les anciens chunks JS n'existent plus. Si l'onglet ouvert
// avant le déploiement navigue vers une page lazy → 404 du chunk → page bloquée
// (d'où "faut actualiser"). On recharge automatiquement (garde anti-boucle 10s,
// partagée avec lazyWithReload).
window.addEventListener('vite:preloadError', () => { tryChunkReload() })
window.addEventListener('error', (e) => { if (shouldReloadForChunkError(e?.message)) tryChunkReload() })
window.addEventListener('unhandledrejection', (e) => { if (shouldReloadForChunkError(e?.reason?.message || e?.reason)) tryChunkReload() })

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>
)
