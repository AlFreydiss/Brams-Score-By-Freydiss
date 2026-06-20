import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { MotionConfig } from 'framer-motion'
import { useLowEnd, detectLowEnd } from './hooks/useMediaQuery.js'
import './index.css'
import './responsive-safety.css'
import './components/ui/ui.css'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import GlobalAnimations from './components/ui/GlobalAnimations.jsx'
import { AuthProvider } from './contexts/AuthContext.jsx'
import { installLiveSync } from './lib/liveSync.js'
import { tryChunkReload, shouldReloadForChunkError } from './lib/lazyWithReload.js'

// Synchro live de la progression (anime/scans/univers) sans rechargement manuel.
installLiveSync()

// Marque <html class="low-end"> au boot : le CSS désactive alors les effets les plus
// coûteux en GPU (backdrop-filter blur du glassmorphism, ombres animées) sur les
// téléphones d'entrée de gamme. Posé avant le render → aucun flash d'effet lourd.
try {
  if (detectLowEnd() || window.matchMedia?.('(max-width: 768px)')?.matches) {
    document.documentElement.classList.add('low-end')
  }
} catch {}

// Après un déploiement, les anciens chunks JS n'existent plus. Si l'onglet ouvert
// avant le déploiement navigue vers une page lazy → 404 du chunk → page bloquée
// (d'où "faut actualiser"). On recharge automatiquement (garde anti-boucle 10s,
// partagée avec lazyWithReload).
window.addEventListener('vite:preloadError', () => { tryChunkReload() })
window.addEventListener('error', (e) => { if (shouldReloadForChunkError(e?.message)) tryChunkReload() })
window.addEventListener('unhandledrejection', (e) => { if (shouldReloadForChunkError(e?.reason?.message || e?.reason)) tryChunkReload() })

// Les erreurs de chargement de RESSOURCES (un <link> CSS ou <script> d'asset qui
// 404 après un déploiement) ne bubble pas → invisibles pour le handler 'error'
// ci-dessus. Sans ça, une page lazy s'affichait SANS son CSS (boutons empilés en
// petits carrés) au lieu de recharger. On écoute donc en phase capture et on
// recharge si un asset hashé /assets/ échoue (garde anti-boucle partagée).
window.addEventListener('error', (e) => {
  const el = e?.target
  if (!el || el === window) return
  const url = el.tagName === 'LINK' ? el.href : (el.tagName === 'SCRIPT' ? el.src : '')
  if (url && /\/assets\/.*\.(css|js)(\?|$)/.test(url)) tryChunkReload()
}, true)

// Sur appareil peu performant : reduced-motion forcé ("always" coupe les anims
// de transform/layout framer-motion partout, garde l'opacité) → moins de reflow/
// GPU. Sinon on respecte la préférence OS de l'utilisateur ("user").
function MotionGate({ children }) {
  const lowEnd = useLowEnd()
  return (
    <MotionConfig reducedMotion={lowEnd ? 'always' : 'user'}>
      {children}
    </MotionConfig>
  )
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <GlobalAnimations />
      <BrowserRouter>
        <AuthProvider>
          <MotionGate>
            <App />
          </MotionGate>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>
)
