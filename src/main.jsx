import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './contexts/AuthContext.jsx'

// Après un déploiement, les anciens chunks JS n'existent plus. Si l'onglet ouvert
// avant le déploiement navigue vers une page lazy → 404 du chunk → page bloquée
// (d'où "faut actualiser"). On recharge automatiquement une fois pour récupérer
// la nouvelle version. (Garde-fou anti-boucle via sessionStorage.)
function handleChunkError() {
  const KEY = '__brams_chunk_reloaded__'
  if (sessionStorage.getItem(KEY)) return
  sessionStorage.setItem(KEY, '1')
  window.location.reload()
}
window.addEventListener('vite:preloadError', handleChunkError)
window.addEventListener('error', (e) => {
  const msg = e?.message || ''
  if (/dynamically imported module|Importing a module script failed|Failed to fetch dynamically/i.test(msg)) handleChunkError()
})
// Reset le garde-fou quand une navigation réussit (chunk chargé OK).
window.addEventListener('load', () => { try { sessionStorage.removeItem('__brams_chunk_reloaded__') } catch {} })

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
)
